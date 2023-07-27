// ==UserScript==
// @name         YT Music improvements
// @version      0.3.5
// @namespace    http://tampermonkey.net/
// @description
// @author       BloodyRain2k
// @match        https://music.youtube.com/watch?v=*
// @match        https://music.youtube.com/playlist?v=*
// @grant        none
// ==/UserScript==

/* Functions:
remove from queue:       Ctrl + Click Track
add to history:           Alt + Click Track
add to blacklist:  Ctrl + Alt + Click Track | Click "Dislike"
*/

function addSelectors(elem) { if (!elem) return; elem.xp = (sel) => xp(sel, elem); elem.qsa = (sel) => qsa(sel, elem); elem.qs = (sel) => qs(sel, elem); return elem; };
function xp(selector, root) { let result = [], elems, sel = selector.replace(/\{([\w-_]+)=['"]?([^}]+?)['"]?\}/g, "contains(concat(' ',normalize-space(@$1),' '),' $2 ')"); try { elems = document.evaluate(sel,
    root || document.body || document, null, XPathResult.ANY_TYPE, null); } catch (ex) { console.error("xp exception:", { ex, selector, sel }); return; }; // class match: `{class=<className>}`
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(addSelectors(elem)); } return result; }
function qsa(selector, root) { return Array.from((root || document.body || document).querySelectorAll(selector)).map(elm => addSelectors(elm)); }
function qs(selector, root) { return addSelectors(selector.search(/^\/|^\.\//) == -1 ? (root || document.body || document).querySelector(selector) : xp(selector, root)[0]); }
function waitForElem(selector, root, timeout = 15000) { if (typeof(root) == "number") { timeout = root; root = null; }; root ??= document.body || document; let observer, timeoutId = -1;
    const promise = new Promise((resolve, reject) => { let elem = qs(selector, root); if (elem) { return resolve(elem); }; observer = new MutationObserver(() => {
    let obsElem = qs(selector, root); if (obsElem) { window.clearTimeout(timeoutId); observer.disconnect(); resolve(obsElem); }; });
    observer.observe(root, { childList: true, subtree: true }); timeoutId = window.setTimeout(() => { observer.disconnect(); reject({ selector, root, timeout }); }, timeout); });
    if (observer) { promise.observer = observer; }; if (timeout > 0) { promise.timeoutId = timeoutId; }; promise.maxDelay = timeout; return promise; }

const observers = [];
function newObserver(func) { if (!func) { return console.error("no observer function"); }; const observer = new MutationObserver(func); observer.function = func; observer.trigger = function(){ func([], this); }; observer.watching = [];
    observer.cleanup = function(){ this.disconnect(); this.watching = this.watching.filter(wtch => wtch.target.xp("ancestor::body")[0]); this.watching.forEach(wtch => this.observe(wtch.target, wtch.options)); }; return observer; }
function watch(target, options, func) { if (typeof(target) == "string") { target = qs(target); }; if (!target) { return; }; if (func && typeof(func) != "function") { return console.error("no watch function:", func); };
    const obs = (func ? newObserver(func) : observers[0]); obs.observe(target, options); if (obs.watching.find(watching => watching.target == target && watching. options)) { console.log("not adding twice:", { target, options }); }
    else { obs.watching.push({ target, options }); console.log("watch added:", target, options, obs); } if (options.trigger) { obs.trigger(); }; }

function getLocalObject(key) { var str = localStorage[key]; return str ? function() { try { return JSON.parse(str); } catch (e) { return undefined; } }() : undefined; }
function setLocalObject(key, value) { localStorage[key] = JSON.stringify(value); }
function setDefaults(target, defaults, level = 0) { if (typeof(defaults) != typeof {} || typeof(target) == typeof(undefined)) { return target || defaults; }
    if (typeof(target) != typeof(defaults) || ("forEach" in target) != ("forEach" in defaults)) { return target; } if ("forEach" in defaults) {
    defaults.forEach(arr => { if (target.indexOf(arr) == -1) target.push(arr); }); return target; } for (var key in defaults) {
    target[key] = setDefaults(target[key], defaults[key], level + 1); } return { ...defaults, ...target }; }
function modLocalObject(key, defVal, func) { let obj = getLocalObject(key); if (obj == null) { obj = defVal; } else { obj = setDefaults(obj, defVal); }; if (!func) { console.warn(`modLocalObject: no function for '${key}'`);
    return obj; } let result = func(obj); if (result === true) { setLocalObject(key, obj); } else { console[result === false ? "warn" : "error"](`modLocalObject: '${key}' not saved`); } return obj; }

function wait(func, delay = 500) { return window.setTimeout(func, delay); }
function toHash(s) { let h = 0; s = "" + s; if (s.length == 0) return h; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; } return h; }

function getHttp(obj, async = true) { var http = new XMLHttpRequest(); http.open(obj.method || "GET", obj.url, async); for (let hName in (obj.headers || {})) { http.setRequestHeader(hName, obj.headers[hName]); }
    if (async) { http.timeout = obj.timeout || 15000; } if (obj.onload) { http.onload = () => obj.onload(http); } if (obj.onerror) { http.onerror = () => obj.onerror(http); }
    if (obj.tag) { http.tag = obj.tag; } /*console.log(obj);*/ http.send(obj.data); return http; }

function openNewTab(url){ if (!url.startsWith("http")) { url = "https://" + url; }; let a = document.createElement("a"); a.href = url; let evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, this, 0, 0, 0, 0, 0, true, false, false, false, 0, null); document.body.appendChild(a); a.dispatchEvent(evt); document.body.removeChild(a); }

// variables //

const titleBlacklist = [
    /\[live\]$/i,
];

const keyBlacklist = "TrackBlacklist", keyFavorites = "TrackFavorites";
const keyHistory = "TrackHistory", historyLimitHours = 24;
const historyDiffLimit = historyLimitHours * (3600 * 1000);
const maxPastQueue = 3, blacklistDelay = 750;

const xpSelTrack = ".//ytmusic-player-queue-item[@selected]";
const xpPlayingTrack = ".//ytmusic-player-queue-item[@play-button-state='playing' or @play-button-state='paused']";
const xpMenu = "//*[@id='contentWrapper']/ytmusic-menu-popup-renderer/*[@id='items']";

let wlh, checkId = window.setInterval(check, 500);
let queue, trimPromise;

// functions //

observers.push(newObserver(mutation));
function mutation(mutations, observer) {
}

function getTracks() { return queue.xp(".//ytmusic-player-queue-item|//*[@id='automix-contents']/ytmusic-player-queue-item"); }
function getAllTracks() { return xp("//ytmusic-player-queue-item"); }
function getSelectedTrack() { return queue.xp(xpSelTrack)[0]; }
function getPlayingTrack() { return queue.xp(xpPlayingTrack)[0]; }
function getTrackData(queuedTrack) {
    const title = queuedTrack.qs(".song-title").innerText;
    const uploader = queuedTrack.qs(".byline").innerText;
    return { title, uploader, id: queuedTrack.__data.data.videoId };
}
function openFirstTrackMenu() { queue.xp(".//ytmusic-player-queue-item[1]//button")[0].click(); }

function removeTrack(queuedTrack) {
    qs("button", queuedTrack).click();

    return waitForElem(xpMenu).then(menu => {
        console.log("menu:", menu);
        return waitForElem(".//yt-formatted-string[text()='Remove from queue']", menu);
    }).then(remove => {
        console.log("remove:", remove);
        remove.click();
        wait(() => {
            console.log("trim awaited");
            trimQueue();
        }, 5);
    });
}

function addTrackToHistory(data) {
    let history = getLocalObject(keyHistory) || [];
    const now = new Date();
    // console.log("loaded history:", { ...history });
    try {
        history = history.filter(entry => {
            // console.log(entry);
            const nameDiff = entry.title != data.title;
            // console.log({ nameDiff });
            const timeDiff = (now.getTime() - new Date(entry.date).getTime());
            // console.log({ timeDiff, historyDiffLimit, result: timeDiff < historyDiffLimit});
            const entryOk = nameDiff && timeDiff < historyDiffLimit;
            // console.log({ entry, entryOk });
            return entryOk;
        });
    }
    catch (err) {
        console.error(err);
    }
    history.push({
        ...data,
        date: now.toJSON(),
    });
    console.log("saved history:", { ...history });
    setLocalObject(keyHistory, history);
}

function trimQueue() {
    if (trimPromise) { return; }

    trimPromise = waitForElem(xpPlayingTrack, queue).then(playing => {
        const history = getLocalObject(keyHistory) || [];
        const tracks = getTracks();
        const index = tracks.indexOf(playing);
        console.log("trim:", index + 1, "/", tracks.length);
        if (index > maxPastQueue) {
            trimPromise = null;
            return removeTrack(tracks[0]).then(() => {
                // wait(() => trimQueue(), 20);
            });
        }
        const blacklist = getLocalObject(keyBlacklist) || [];
        console.log("blacklist:", blacklist);
        const handlers = [];
        for (let i = index + 1; i < tracks.length; i++) {
            const track = tracks[i];
            const data = getTrackData(track);
            if (!track.onclick) {
                track.onclick = handleClick;
                handlers.push({ idx: i, title: data.title, track });
            }
            if (track.openPopupBehavior && !track.openPopupBehavior.openPopup) {
                track.openPopupBehavior.openPopup = (evt) => {
                    console.log(evt);
                };
            }
            // console.log(i, track, data);
            const blacklisted = titleBlacklist.some(black => data.title.search(black) > -1)
                || blacklist.some(black => black.title == data.title);
            if (blacklisted || history.find(entry => entry.title == data.title && entry.uploader == data.uploader)) {
                if (blacklisted) {
                    console.log(`removing track '${data.title}' because it's blacklisted`);
                }
                else {
                    console.log(`removing track '${data.title}' by '${data.uploader}' from queue because it's in the history`);
                }
                trimPromise = null;
                return removeTrack(track).then(() => {
                    // wait(() => trimQueue(), 20);
                });
            }
        }
        // console.log("handlers:", handlers);
        trimPromise = null;
    });
}

function handleClick(evt) {
    const alt = evt.altKey, ctrl = evt.ctrlKey;
    const track = xp("ancestor-or-self::ytmusic-player-queue-item", evt.target)[0];
    console.log("click:", track);
    if (!alt && !ctrl || !track) { return; }

    const data = getTrackData(track);
    if (!data || !data.title || !data.uploader) {
        throw { message: "Couldn't fetch track data", data };
    }
    const now = new Date();

    if (ctrl && alt) {
        console.log(
            `added '${data.title}' to blacklist:`,
            modLocalObject(keyBlacklist, [], blacklist => {
                blacklist.push({ ...data, date: now.toJSON() });
                return true;
            })
        );
        track.style.backgroundColor = "#422";

        wait(() => {
            track.style.backgroundColor = null;
            removeTrack(track);
        }, blacklistDelay);

        return false;
    }

    // either Ctrl + Click or Alt + Click were done
    removeTrack(track).then(() => {
        if (!alt) { return; }

        data.skipped = true;
        addTrackToHistory(data);
    });
}

function urlChanged() {
    wlh = window.location.href;

    // waitForElem("").then(notif => {
    // });

    waitForElem("//*[{class='ytmusic-tab-renderer'}]//*[@id='contents' and .//ytmusic-player-queue-item]").then(contents => {
        queue = contents;
        // const tracks = getTracks();
        // console.log(tracks);
        return waitForElem(xpSelTrack, queue);
    }).then(track => {
        const loggedIn = qs("a.sign-in-link") == null;
        const tracks = getTracks();
        const selected = getSelectedTrack();
        const index = tracks.indexOf(selected);
        const trackData = getTrackData(selected);
        console.log("logged in:", loggedIn, selected, index, trackData.title);

        if (index == -1) {
            throw "Couldn't find current track";
        }
        if (!trackData.title) {
            throw "Couldn't find track title";
        }
        if (!trackData.uploader) {
            throw "Couldn't find track uploader";
        }
        addTrackToHistory(trackData);

        const likeBtn = qs(".middle-controls-buttons #button-shape-like");


        const dislikeBtn = qs(".middle-controls-buttons #button-shape-dislike");
        if (!dislikeBtn.onclick) {
            dislikeBtn.onclick = (evt) => {
                const dis_track = getSelectedTrack();
                const data = getTrackData(dis_track);
                console.log("dislike:", loggedIn, dis_track, data);

                handleClick({
                    altKey: true,
                    ctrlKey: true,
                    target: dis_track,
                });

                if (!loggedIn) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    evt.stopImmediatePropagation();
                    waitForElem("ytmusic-modal-with-title-and-button-renderer").then(popup => {
                        popup.style.display = "none";
                    });
                    return false;
                }
            };
        }

        // const button = selected.xp(".//button")[0];
        // button.click();
        // waitForElem(xpMenu).then(dropmenu => {
        //     menu = dropmenu;
        //     console.log("menu:", menu);
        //     button.click();
        // });

        waitForElem("#automix-contents ytmusic-player-queue-item", 2000)
            .catch(() => null)
            .then(automix => {

            // console.log("automix:", automix);
            trimQueue();
        });
    });
}

function check() {
    if (window.location.href != wlh) { urlChanged(); }
}
