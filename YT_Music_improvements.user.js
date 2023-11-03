// ==UserScript==
// @name         YT Music improvements
// @version      0.3.7.10
// @namespace    http://tampermonkey.net/
// @description
// @author       BloodyRain2k
// @match        https://music.youtube.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/* Functions:
remove from queue:       Ctrl + Click Track
add to history:           Alt + Click Track
add to blacklist:  Ctrl + Alt + Click Track | Click "Dislike" (MMB when logged in)
add to favorites:                             Click "Like"    (MMB when logged in)
*/

/** @returns {HTMLElement2} */
function addSelectors(elem) { if (!elem) return; elem.xp = (sel) => xp(sel, elem); elem.qsa = (sel) => qsa(sel, elem); elem.qs = (sel) => qs(sel, elem); return elem; };
/** @-returns {HTMLElement[]} */
function xp(selector, root) { let result = [], elems, sel = selector.replace(/\{@?([\w-_]+)=['"]?([^}]+?)['"]?\}/g, "contains(concat(' ',normalize-space(@$1),' '),' $2 ')"); try { elems = document.evaluate(sel,
    root || document.body || document, null, XPathResult.ANY_TYPE, null); } catch (ex) { console.error("xp exception:", { ex, selector, sel }); return; }; // class match: `{class=<className>}`
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(addSelectors(elem)); } return result; }
/** @-returns {HTMLElement[]} */
function qsa(selector, root) { return Array.from((root || document.body || document).querySelectorAll(selector)).map(elm => addSelectors(elm)); }
/** @-returns {HTMLElement} */
function qs(selector, root) { return addSelectors(selector.search(/^\/|^\.\//) == -1 ? (root || document.body || document).querySelector(selector) : xp(selector, root)[0]); }
/** @returns {Promise<HTMLElement2>} */
function waitForElem(selector, root, timeout = 15000) { if (typeof(root) == "number") { timeout = root; root = null; }; root ??= document.body || document; let observer, timeoutId = -1;
    const promise = new Promise((resolve, reject) => { let elem = qs(selector, root); if (elem) { return resolve(elem); }; observer = new MutationObserver(() => {
    let obsElem = qs(selector, root); if (obsElem) { window.clearTimeout(timeoutId); observer.disconnect(); resolve(obsElem); }; });
    observer.observe(root, { childList: true, subtree: true }); timeoutId = window.setTimeout(() => { observer.disconnect(); reject({ selector, root, timeout }); }, timeout); });
    if (observer) { promise.observer = observer; }; if (timeout > 0) { promise.timeoutId = timeoutId; }; promise.maxDelay = timeout; return promise; }

const observers = [];
function newObserver(func) { if (!func) { return console.error("no observer function"); }; const observer = new MutationObserver(func); observer.function = func; observer.trigger = function(){ func([], this); }; observer.watching = [];
    observer.cleanup = function(){ this.disconnect(); this.watching = this.watching.filter(wtch => wtch.target.xp("ancestor::body")[0]); this.watching.forEach(wtch => this.observe(wtch.target, wtch.options)); }; return observer; }
function watch(target, /**@type {MutationObserverInit}*/options, func) { if (typeof(target) == "string") { target = qs(target); }; if (!target) { return; }; if (func && typeof(func) != "function") { return console.error("no watch function:", func); };
    const obs = /**@type {MutationObserver}*/(func ? newObserver(func) : observers[0]); obs.observe(target, options); if (obs.watching.find(watching => watching.target == target && watching. options)) { console.log("not adding twice:", { target, options }); }
    else { obs.watching.push({ target, options }); console.log("watch added:", target, options, obs); } if (options.trigger) { obs.trigger(); }; }

function loadObj(key) { const str = GM_getValue(key); /* console.debug(`getVal '${key}':`, str); */ return str; };
function saveObj(key, value) { GM_setValue(key, value); }
function setDefaults(target, defaults, level = 0) { if (typeof(defaults) != typeof {} || typeof(target) == typeof(undefined)) { return target || defaults; }
    if (typeof(target) != typeof(defaults) || ("forEach" in target) != ("forEach" in defaults)) { return target; } if ("forEach" in defaults) {
    defaults.forEach(arr => { if (target.indexOf(arr) == -1) target.push(arr); }); return target; } for (var key in defaults) {
    target[key] = setDefaults(target[key], defaults[key], level + 1); } return { ...defaults, ...target }; }
function modObj(key, defVal, func) { let obj = loadObj(key); if (obj == null) { obj = defVal; } else { obj = setDefaults(obj, defVal); }; if (!func) { console.warn(`modObj: no function for '${key}'`);
    return obj; } let result = func(obj); if (result === true) { saveObj(key, obj); } else { console[result === false ? "warn" : "error"](`modObj: '${key}' not saved`); } return obj; }

function wait(func, delay = 500) { return window.setTimeout(func, delay); }
function toHash(s) { let h = 0; s = "" + s; if (s.length == 0) return h; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; } return h; }

function getHttp(obj, async = true) { var http = new XMLHttpRequest(); http.open(obj.method || "GET", obj.url, async); for (let hName in (obj.headers || {})) { http.setRequestHeader(hName, obj.headers[hName]); }
    if (async) { http.timeout = obj.timeout || 15000; } if (obj.onload) { http.onload = () => obj.onload(http); } if (obj.onerror) { http.onerror = () => obj.onerror(http); }
    if (obj.tag) { http.tag = obj.tag; } /*console.log(obj);*/ http.send(obj.data); return http; }

function openNewTab(url){ if (!url.startsWith("http")) { url = "https://" + url; }; let a = document.createElement("a"); a.href = url; let evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, this, 0, 0, 0, 0, 0, true, false, false, false, 0, null); document.body.appendChild(a); a.dispatchEvent(evt); document.body.removeChild(a); }

// #region types //
/**
 * @typedef TrackData
 * @type {object}
 * @property {string} title
 * @property {string} uploader
 * @property {string} id
 */

/**
 * @typedef HTMLElement2
 * @type {object && HTMLElement}
 * @property {(selector:string) => HTMLElement2} qs
 * @property {(selector:string) => HTMLElement2[]} qsa
 * @property {(selector:string) => HTMLElement2[]} xp
 */
// #endregion types //

// variables //

if (GM_addStyle) {
    GM_addStyle(`[id].fav-added > button { color: #8f2; }`);
}
else {
    console.error("GM_addStyle not available");
}

const titleBlacklist = [
    /\[live\]$/i,
];

const keyBlacklist = "TrackBlacklist", keyFavorites = "TrackFavorites";
const keyHistory = "TrackHistory", historyLimitHours = 48;
const historyDiffLimit = historyLimitHours * (3600 * 1000);
const maxPastQueue = 3, blacklistDelay = 750;

const xpSelTrack = ".//ytmusic-player-queue-item[@selected]";
const xpPlayingTrack = ".//ytmusic-player-queue-item[@play-button-state!='default']";
const xpMenu = "//*[@id='contentWrapper']/ytmusic-menu-popup-renderer/*[@id='items']";
const xpTrackQueue = "ancestor::*[{class='ytmusic-player-queue'}]";

let wlh, checkId = window.setInterval(check, 500);
let /**@type {HTMLElement2}*/queue, /**@type {HTMLElement2}*/playingTitle, trimPromise;

const beep = new Audio(
    "data:audio/wav;base64,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"
    + "Qg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Z"
    + "x2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY"
    + "7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xo"
    + "O6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSU"
    + "UKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIs"
    + "LivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////"
    + "////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////"
    + "////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAA"
    + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU="
);
// beep.loop = true;
beep.volume = 0.01;

// functions //

observers.push(newObserver(onMutation));
function onMutation(/**@type {MutationRecord[]}*/mutations, observer) {
    if (mutations.some(mut => mut.target == playingTitle)) {
        console.debug("beep");
        beep.play();
        return;
    }
    
    console.log(mutations);
}

function getTracks() {
    const tracks = queue.xp(".//ytmusic-player-queue-item"); // |//*[@id='automix-contents']/ytmusic-player-queue-item");
    const remove = [];
    tracks.forEach(track => {
        if (track.qs(".song-title[is-empty]")) {
            remove.push(track);
        }
    });
    remove.forEach(track => {
        tracks.remove(track);
        track.parentNode.removeChild(track);
    });
    return tracks;
}
function getAllTracks() { return xp("//ytmusic-player-queue-item"); }
function getSelectedTrack() { return queue.xp(xpSelTrack)[0]; }
function getPlayingTrack() { return queue.xp(xpPlayingTrack)[0]; }
/** @returns {TrackData} */
function getTrackData(queuedTrack) {
    const title = queuedTrack.__data?.data?.title?.runs[0]?.text || queuedTrack.qs(".song-title").innerText;
    const uploader = queuedTrack.__data?.data?.shortBylineText?.runs[0]?.text || queuedTrack.qs(".byline").innerText;
    const id = queuedTrack.__data.data.videoId || queuedTrack.qs(".thumbnail img[src]").src.match(/\/vi\/(\w+)\//i)[1];
    return { title, uploader, id };
}
function openFirstTrackMenu() { queue.xp(".//ytmusic-player-queue-item[1]//button")[0].click(); }

async function removeTrack(queuedTrack) {
    const trkData = getTrackData(queuedTrack);
    console.debug("removing:", trkData);
    
    qs("button", queuedTrack).click();
    const menu = await waitForElem(xpMenu);
    
    // console.log("menu:", menu);
    const remove = await waitForElem("//ytmusic-menu-service-item-renderer[.//yt-formatted-string[text()='Remove from queue']]", menu);
    console.warn("remove:", queuedTrack.qs("[title]").title, queuedTrack, remove.__data, remove);
    if (remove.__data.data.serviceEndpoint.removeFromQueueEndpoint.videoId == trkData.id) {
        queuedTrack.style.backgroundColor = null;
        remove.click();
    }
    else {
        console.error("queuedTrack changed:", trkData, queuedTrack.__data, queuedTrack);
        const menu = remove.xp("ancestor::tp-yt-iron-dropdown[{class='ytmusic-popup-container'}]");
        menu.setAttribute("aria-hidden", true);
        menu.removeAttribute("focus");
    }
    
    wait(() => {
        // console.log("trim awaited");
        trimQueue();
    }, 5);
}

function addTrackToHistory(/**@type {TrackData}*/ trkData) {
    let history = loadObj(keyHistory) || [];
    const now = new Date();
    // console.log("loaded history:", { ...history });
    try {
        history = history.filter(entry => {
            // console.log(entry);
            const nameDiff = entry.title != trkData.title;
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
        ...trkData,
        date: now.toJSON(),
    });
    saveObj(keyHistory, history);
    console.log("saved history:", { ...history });
}

function isTrackFavorite(/**@type {TrackData}*/ trkData, likeBtn = null) {
    const favorites = loadObj(keyFavorites) || [];
    // console.debug("favorites:", [...favorites]);
    
    if (favorites.some(fav => fav.title == trkData.title && fav.uploader == trkData.uploader)) {
        // if (likeBtn) {
        //     likeBtn.firstChild.style.color = "#8f2";
        // }
        likeBtn?.classList.add("fav-added");
        return true;
    }
    
    // if (likeBtn) {
    //     likeBtn.firstChild.style.color = null;
    // }
    likeBtn?.classList.remove("fav-added");
    return false;
}

function addTrackToFavorites(/**@type {TrackData}*/ trkData) {
    if (isTrackFavorite(trkData)) {
        console.log("already in favorites:", trkData);
        return;
    }
    const favorites = loadObj(keyFavorites) || [];
    const now = new Date();
    favorites.push({
        ...trkData,
        date: now.toJSON(),
    });
    saveObj(keyFavorites, favorites);
    console.log("saved favorites:", [...favorites]);
}

function trimQueue() {
    if (trimPromise) { return; }

    trimPromise = waitForElem(xpPlayingTrack, queue)
    .then(playing => {
        const history = loadObj(keyHistory) || [];
        const tracks = getTracks();
        const index = tracks.indexOf(playing);
        console.log("trim:", index + 1, "/", tracks.length);
        if (index > maxPastQueue) {
            trimPromise = null;
            return removeTrack(tracks[0])
                // .then(() => { wait(() => trimQueue(), 20); });
        }
        const automix = queue.qs("#automix-contents")?.children?.length > 0;
        const blacklist = loadObj(keyBlacklist) || [];
        // console.debug("blacklist:", blacklist);
        const handlers = [];
        for (let i = index + 1; i < tracks.length; i++) {
            const track = tracks[i];
            const data = getTrackData(track);
            const trackQueue = track.xp(xpTrackQueue)[0];
            if (!track.onclick) {
                track.onclick = handleClick;
                handlers.push({ idx: i, title: data.title, track });
            }
            if (track.openPopupBehavior && !track.openPopupBehavior.openPopup) {
                track.openPopupBehavior.openPopup = (evt) => {
                    console.log(evt);
                };
            }
            if (automix && trackQueue.id != "automix-contents") {
                console.debug("skipping filtering for:", { track, trackQueue, automix, });
                continue;
            }
            // console.log(i, track, data);
            const blacklisted = titleBlacklist.some(black => data.title.search(black) > -1)
                || blacklist.some(black => black.title == data.title);
            if (blacklisted || history.find(entry => entry.title == data.title && entry.uploader == data.uploader)) {
                if (blacklisted) {
                    console.log(`removing track '${data.title}' because it's blacklisted`, { data, trackQueue });
                }
                else {
                    console.log(`removing track '${data.title}' because it's in the history`, { data, trackQueue });
                }
                trimPromise = null;
                return removeTrack(track)
                    // .then(() => { wait(() => trimQueue(), 20); });
            }
        }
        // console.log("handlers:", handlers);
        trimPromise = null;
    })
    .catch(err => {
        console.error({ message: "trimQueue() ERROR:", err });
        trimPromise = null;
    });
}

function handleClick(evt) {
    const alt = evt.altKey, ctrl = evt.ctrlKey;
    const track = xp("ancestor-or-self::ytmusic-player-queue-item", evt.target)[0];
    console.log("handleClick:", { alt, ctrl, track, evt });
    if (!alt && !ctrl || !track) { return; }

    const data = getTrackData(track);
    if (!data || !data.title || !data.uploader) {
        throw { message: "Couldn't fetch track data", data };
    }
    const now = new Date();

    if (ctrl && alt) {
        console.log(
            `added '${data.title}' by '${data.uploader}' to blacklist:`,
            modObj(keyBlacklist, [], blacklist => {
                blacklist.push({ ...data, date: now.toJSON() });
                return true;
            })
        );
        track.style.backgroundColor = "#422";

        // don't remove the track from the playlist when logged in
        if (evt.loggedIn == false) {
            wait(() => {
                track.style.backgroundColor = null;
                removeTrack(track);
            }, blacklistDelay);
            
            return false;
        }
    }

    // either Ctrl + Click or Alt + Click were done
    removeTrack(track).then(() => {
        if (!alt) { return; }

        data.skipped = true;
        addTrackToHistory(data);
    });
}

function newSteering() {
    waitForElem("#chips > ytmusic-chip-cloud-chip-renderer[is-selected]:not([should-show-loading-chip])")
    .then(() => trimQueue());
};

function xpToastByMessage(/**@type {string|[string]}*/ messages) {
    if (typeof(messages) == "string") {
        messages = [messages];
    }
    return `//tp-yt-paper-toast[.//yt-formatted-string[${messages.map(msg => `contains(text(),'${msg}')`).join(" or ")}]]`;
}
const xpToastWatchingLiked = xpToastByMessage(["Still watching?", "Saved to liked music"]);
const xpToastLiked = xpToastByMessage("Saved to liked music");
console.log([xpToastWatchingLiked, xpToastLiked]);

function urlChanged() {
    wlh = window.location.href;
    
    waitForElem(".content-info-wrapper > yt-formatted-string.title").then(playing => {
        watch(playing, { attributeFilter: ["title"] });
        playingTitle = playing;
    });
    
    waitForElem("#steering-chips > #chips:not([waiting])", 5000)
    .catch(err => { console.log("no unaltered `#chips` found", err); })
    .then(() => {
        qsa("#steering-chips > #chips:not([waiting])").forEach(chip => {
            if (chip.onclick) { return; }
            chip.onclick = newSteering;
            chip.setAttribute("waiting", "");
            console.debug("added 'onclick' to:", chip);
        });
    });
    
    // waitForElem("//tp-yt-paper-toast[.//yt-formatted-string[contains(text(),'Still watching?') or contains(text(),'Saved to liked music')]]")
    waitForElem(xpToastWatchingLiked, 3000)
    .catch(err => { console.log("no 'toasts' found", err); })
    .then(() => {
        xp(xpToastWatchingLiked + "//*[@id='close-button']").forEach(button => button.click());
    });

    waitForElem("//*[{class='ytmusic-tab-renderer'}]//*[@id='contents' and .//ytmusic-player-queue-item]/..")
    .then(contents => {
        queue = contents;
        // const tracks = getTracks();
        // console.log(tracks);
        return waitForElem(xpSelTrack, queue);
    })
    .then(selected => {
        const loggedIn = qs("a.sign-in-link") == null;
        const tracks = getTracks();
        // const selected = getSelectedTrack();
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
        if (!likeBtn.onmousedown) {
            likeBtn.onmousedown = (evt) => {
                if (loggedIn && evt.button != 1 || !loggedIn && evt.button != 0 && evt.button != 1) {
                    if (loggedIn) {
                        console.debug("discarding 'Liked' notification");
                        waitForElem(xpToastLiked).then(() => {
                            xp(xpToastLiked + "//*[@id='close-button']").forEach(button => button.click());
                        });
                    }
                    return;
                }
                const like_track = getSelectedTrack();
                const trkData = getTrackData(like_track);
                console.log("logged in:", { loggedIn, button: evt.button, like_track, trkData, likeBtn });

                if (likeBtn.getAttribute("aria-pressed")?.toLowerCase() == "true" && evt.button == 0) {
                    return;
                }
                
                addTrackToFavorites(trkData);
                isTrackFavorite(trkData, likeBtn);
                
                if (!loggedIn) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    evt.stopImmediatePropagation();
                    waitForElem("ytmusic-modal-with-title-and-button-renderer").then(popup => {
                        popup.style.display = "none";
                    });
                    return false;
                }
                else {
                    console.debug("discarding 'Liked' notification");
                    waitForElem(xpToastLiked).then(() => {
                        xp(xpToastLiked + "//*[@id='close-button']").forEach(button => button.click());
                    });
                }
            };
        }
        console.log("fav:", isTrackFavorite(trackData, likeBtn), loadObj(keyFavorites));

        const dislikeBtn = qs(".middle-controls-buttons #button-shape-dislike");
        if (!dislikeBtn.onmousedown) {
            dislikeBtn.onmousedown = (evt) => {
                // if (loggedIn && evt.button != 1 || !loggedIn && evt.button != 0 && evt.button != 1) {
                //     return;
                // }
                const dis_track = getSelectedTrack();
                const trkData = getTrackData(dis_track);
                console.log("dislike:", { loggedIn, dis_track, trkData });

                handleClick({
                    altKey: true,
                    ctrlKey: true,
                    target: dis_track,
                    loggedIn,
                });

                if (!loggedIn) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    evt.stopImmediatePropagation();
                    waitForElem("ytmusic-modal-with-title-and-button-renderer")
                    .then(popup => {
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
