// ==UserScript==
// @name         YT Music improvements
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       BloodyRain2k
// @match        https://music.youtube.com/watch?v=*
// @grant        none
// ==/UserScript==

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

const keyHistory = "TrackHistory", historyLimitHours = 3;
const historyDiffLimit = historyLimitHours * (3600 * 1000);
const maxPastQueue = 5;

const xpSelTrack = ".//ytmusic-player-queue-item[@selected]";
const xpPlayingTrack = ".//ytmusic-player-queue-item[@play-button-state='playing' or @play-button-state='paused']";
const xpMenu = "//*[@id='contentWrapper']/ytmusic-menu-popup-renderer/*[@id='items']";

let wlh, checkId = window.setInterval(check, 500);
let queue;

// functions //

observers.push(newObserver(mutation));
function mutation(mutations, observer) {
}

function getTracks() { return queue.xp(".//ytmusic-player-queue-item"); }
function getSelectedTrack() { return queue.xp(xpSelTrack)[0]; }
function getPlayingTrack() { return queue.xp(xpPlayingTrack)[0]; }
function openFirstTrackMenu() { queue.xp(".//ytmusic-player-queue-item[1]//button")[0].click(); }
function removeTrack(queuedTrack) {
    qs("button", queuedTrack).click();

    return waitForElem(xpMenu).then(menu => {
        return waitForElem(".//yt-formatted-string[text()='Remove from queue']", menu);
    }).then(remove => {
        remove.click();
    });
}

function trimQueue(history) {
    waitForElem(xpPlayingTrack, queue).then(playing => {
        const tracks = getTracks();
        const index = tracks.indexOf(playing);
        console.log("trim:", index, "/", tracks.length);
        if (index > maxPastQueue) {
            return removeTrack(tracks[0]).then(() => {
                wait(() => trimQueue());
            });
        }
        for (let i = index + 1; i < tracks.length; i++) {
            const track = tracks[i];
            console.log(i, track);
            const title = qs(".song-title", track).innerText;
            const uploader = qs(".byline", track).innerText;
            const blacklisted = titleBlacklist.some(black => black.search(black) > -1);
            if (blacklisted || history.find(entry => entry.title == title && entry.uploader == uploader)) {
                return removeTrack(track).then(() => {
                    wait(() => trimQueue());
                });
            }
        }
    });
}

function urlChanged() {
    wlh = window.location.href;

    waitForElem("//*[{class='ytmusic-tab-renderer'}]//*[@id='contents' and .//ytmusic-player-queue-item]").then(contents => {
        queue = contents;
        const tracks = getTracks();
        // console.log(tracks);
        return waitForElem(xpSelTrack, queue);
    }).then(track => {
        const selected = getSelectedTrack();
        const index = getTracks().indexOf(selected);
        const title = selected.qs(".song-title").innerText;
        const uploader = selected.qs(".byline").innerText;
        console.log(selected, index, title);

        if (index == -1) {
            throw "Couldn't find current track";
        }
        if (!title) {
            throw "Couldn't find track title";
        }
        if (!uploader) {
            throw "Couldn't find track uploader";
        }

        let history = getLocalObject(keyHistory);
        const now = new Date();
        console.log("loaded history:", { ...history });
        try {
            history = history.filter(entry => {
                // console.log(entry);
                const nameDiff = entry.title != title;
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
            title: title,
            uploader: uploader,
            date: now.toJSON(),
            id: wlh.match(/v=([\w_]+)/i)[1],
        });
        console.log("saved history:", { ...history });
        setLocalObject(keyHistory, history);

        // const button = selected.xp(".//button")[0];
        // button.click();
        // waitForElem(xpMenu).then(dropmenu => {
        //     menu = dropmenu;
        //     console.log("menu:", menu);
        //     button.click();
        // });

        trimQueue(history);
    });
}

function check() {
    if (window.location.href != wlh) { urlChanged(); }
}
