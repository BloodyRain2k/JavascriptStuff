// ==UserScript==
// @name         YT Music improvements
// @version      0.4.0.3
// @namespace    http://tampermonkey.net/
// @description
// @author       BloodyRain2k
// @match        https://music.youtube.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @require      https://EnermaxDebian:2443/flask/static/download_integration_shared.js
// @connect      enermaxdebian
// @noframes
// ==/UserScript==

/* Functions:
remove from queue:       Ctrl + Click Track
add to history:           Alt + Click Track
add to blacklist:  Ctrl + Alt + Click Track | Click "Dislike" (MMB when logged in)
add to favorites:                             Click "Like"    (MMB when logged in)
*/

// #region types //
/** @typedef TrackData
 * @prop {string} id
 * @prop {string} title
 * @prop {string} duration
 * @prop {string} uploader
 * @prop {string} channel
 */
/** @typedef HistoryResponse
 * @prop {string}  track_id
 * @prop {string}  datetime
 * @prop {?number} skipped_at
 */
/** @typedef TrackInfoResponse
 * @prop {string[]} faved
 * @prop {string[]} blacklisted
 */
/** @typedef TrackData
 * @prop {string}  id
 * @prop {string}  title
 * @prop {string}  duration
 * @prop {string}  channel_id
 * @prop {boolean} faved
 * @prop {boolean} liked
 * @prop {boolean} disliked
 * @prop {boolean} blacklisted
 */
// #endregion types //

GM_addStyle(`[id].fav-added > button { color: #8f2; }
[id].blacklisted > button { color: #f40; }
#help-tooltip { position:absolute; top:0px; left:0px; z-index:10; border-radius:5px;
                padding:5px; background-color:antiquewhite; font-size:115%; }
#help-tooltip:not(.show) { display:none; }`);

// variables //

let serverAlive = false;
const apiServer = `https://enermaxdebian:2443/fastapi/youtube/`;
const cache = {
    /**@type {{[track_id:string]:Date}}*/
    history: {},
    blacklist: {},
    favorites: {},
};
const titleBlacklist = [
    /\[live\]$/i,
];

const keyBlacklist = "TrackBlacklist", keyFavorites = "TrackFavorites";
const keyHistory = "TrackHistory", historyLimitHours = 48;
const historyDiffLimit = historyLimitHours * (3600 * 1000);
const maxPastQueue = 3, blacklistDelay = 750;

const xpSelTrack        = ".//ytmusic-player-queue-item[@selected]";
const xpPlayingTrack    = ".//ytmusic-player-queue-item[@play-button-state!='default']";
const xpPlayingOrFirst  = ".//ytmusic-player-queue-item[@play-button-state!='default']|.//ytmusic-player-queue-item[1]";
const xpMenu            = "//*[@id='contentWrapper']/ytmusic-menu-popup-renderer/*[@id='items']";
const xpTrackQueue      = "ancestor::*[{class='ytmusic-player-queue'}]";

let wlh, checkId = window.setInterval(check, 500);
let /**@type {QueryElement}*/queue, /**@type {QueryElement}*/playingTitle, beeped = false, trimPromise;
let /**@type {TrackData}*/curTrack, /**@type {number}*/curTime, playButton, playStarted = false, waitingForTrack;

const beep = new Audio(
    "data:audio/wav;base64,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"
    + "eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+Ub"
    + "Xu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQ"
    + "NpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF"
    + "5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+ID"
    + "Gid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO"
    + "0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnry"
    + "q6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhI"
    + "aCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWa"
    + "LC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb////////////////////////////////////////////////////////////////////////"
    + "///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////"
    + "///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////"
    + "///////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAA"
    + "AAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc29"
    + "1bmRib3kuZGUAAAAAAAAAACU="
);
// beep.loop = true;
beep.volume = 0.001;

// functions //

const helpTooltip = create('pre');
helpTooltip.id = 'help-tooltip';
helpTooltip.innerText = (''
    + 'remove from queue:       Ctrl + Click Track\n'
    + 'add to history:           Alt + Click Track\n'
    + 'add to blacklist:  Ctrl + Alt + Click Track | Click "Dislike" (MMB when logged in)\n'
    + 'add to favorites:                             Click "Like"    (MMB when logged in)\n'
);
function showHelpTip(evt) {
    helpTooltip.classList.add('show');
}
function hideHelpTip() { helpTooltip.classList.remove('show'); }
function addHelpTip() {
    document.body.appendChild(helpTooltip);
    waitForElems('ytmusic-menu-renderer.ytmusic-player-bar #button-shape:not([title]) > button')
    .then(elems => elems.forEach(elem => {
        elem.onmouseenter = showHelpTip;
        elem.onmouseleave = hideHelpTip;
    }));
}

/** @deprecated Use `fetchInfo()` instead. */
function sendData(type, data) {
    console.error('Legacy use of "sendData()".', { type, data });
    return;
    
    return new Promise((resolve, reject) => {
        const url = server + `?music=${type}`;
        console.debug('sending data to server:', url, data || "<no_data>");
        GM_xmlhttpRequest({
            url,
            method: data ? "POST" : "GET",
            headers: {
                'content-type': data ? 'application/json' : undefined,
            },
            data: JSON.stringify(data),
            onload: (resp) => {
                let json = null;
                try {
                    json = JSON.parse(resp.responseText);
                    console.info('server response:', resp, json);
                }
                catch {
                    console.warn('server response not JSON:', resp, resp.responseText);
                }
                resolve(json || resp.responseText);
            },
            onerror: (resp) => { reject(resp); }
        });
        // console.debug('data should be sent now');
    });
}
// sendData('history&age_hours=1').then((resp) => {
//     if (resp.rows) {
//         serverAlive = true;
//         console.info('server is alive \\(^.^)/');
//     }
//     else {
//         console.warn('server doesn\'t seem to be alive');
//     }
// });

function fetchHistory() {
    return GM_fetch(apiServer + `history/${historyLimitHours}h`)
    .then((/**@type {GM_Response<HistoryResponse[]>}*/resp) => {
        if ([200, 201, 202].indexOf(resp.status) == -1) {
            console.error('Failed to fetch history:', resp);
            return resp;
        }
        for (const entry of resp.json) {
            cache.history[entry.track_id] = new Date(entry.datetime);
        }
        return cache.history;
    });
    
    return sendData(`history&age_hours=${historyLimitHours}`).then((resp) => {
        if (resp.rows) {
            for (const res of resp.rows || []) {
                const res_date = new Date(res.datetime);
                if (!cache.history[res.track_id] || cache.history[res.track_id] < res_date) {
                    cache.history[res.track_id] = res_date;
                }
                else {
                    // console.debug(`known history entry:`, res);
                }
            }
        }
        return cache.history;
    });
}
function sendHistory(track_id, /**@type {?number}*/skipped_at = null) {
    return GM_fetch(apiServer + `history/${track_id}`,
        { method: 'PUT', query: { skipped_at: skipped_at || undefined } }, `sendHistory("${track_id}", ${skipped_at})`)
    .then((/**@type {GM_Response<HistoryResponse>}*/resp) => {
        if ([200, 201, 202].indexOf(resp.status) == -1) {
            console.error('Failed to fetch history:', resp);
            return /**@type {GM_Response}*/(resp);
        }
        return cache.history[resp.json.track_id] = new Date(resp.json.datetime);
    })
}

function fetchInfo() {
    return GM_fetch(apiServer + `tracks/info`)
    .then((/**@type {GM_Response<TrackInfoResponse>}*/resp) => {
        if (resp.status == 200) {
            const now = new Date();
            for (const fav of resp.json?.faved) {
                if (fav in cache.favorites) {
                    continue;
                }
                cache.favorites[fav] = now;
            }
            for (const black of resp.json?.blacklisted) {
                if (black in cache.blacklist) {
                    continue;
                }
                cache.blacklist[black] = now;
            }
            return resp.json;
        }
        
        throw { error: `Could not fetch /tracks/info: ${resp.status}`, resp };
    })
}

/** @deprecated Use `fetchInfo()` instead. */
function fetchBlacklist() {
    return sendData(`blacklist`).then(async (resp) => {
        if (resp.rows) {
            for (const res of resp.rows || []) {
                cache.blacklist[res.id] = new Date(res.blacklisted);
                // const res_date = new Date(res.datetime);
                // if (!cache.blacklist[res.track_id] || cache.blacklist[res.track_id] < res_date) {
                //     cache.blacklist[res.track_id] = res_date;
                // }
                // else {
                //     // console.debug(`known blacklist entry:`, res);
                // }
            }
            if (!queue && wlh.indexOf("/watch?") == -1) {
                const legacy = loadObj(keyBlacklist);
                if (legacy?.length > 0) {
                    console.debug(`migrating legacy blacklist data:`, legacy);
                    const failed = [];
                    for (const black of legacy) {
                        if (isTrackBlacklisted(black)) {
                            continue;
                        }
                        const success = await addTrackToBlacklist(black);
                        if (!success) {
                            failed.push(black);
                        }
                    }
                    console.debug("failed blacklisted:", failed);
                    saveObj(keyBlacklist, failed);
                }
            }
        }
        return cache.blacklist;
    });
}

/** @deprecated Use `fetchInfo()` instead. */
function fetchFavorites() {
    return sendData(`favorite`).then(async (resp) => {
        if (resp.rows) {
            for (const res of resp.rows || []) {
                cache.favorites[res.id] = new Date(res.faved);
                // const res_date = new Date(res.datetime);
                // if (!cache.blacklist[res.track_id] || cache.blacklist[res.track_id] < res_date) {
                //     cache.blacklist[res.track_id] = res_date;
                // }
                // else {
                //     // console.debug(`known blacklist entry:`, res);
                // }
            }
            if (!queue && wlh.indexOf("/watch?") == -1) {
                const legacy = loadObj(keyFavorites);
                if (legacy?.length > 0) {
                    console.debug(`migrating legacy favorites data:`, legacy);
                    const failed = [];
                    for (const fav of legacy) {
                        if (isTrackFavorite(fav)) {
                            continue;
                        }
                        const success = await addTrackToFavorites(fav);
                        if (!success) {
                            failed.push(fav);
                        }
                    }
                    console.debug("failed favorites:", failed);
                    saveObj(keyFavorites, failed);
                }
            }
        }
        return cache.favorites;
    });
}


function timeToSeconds(timeStr) {
    let seconds = 0;
    if (timeStr.indexOf('/') > -1) {
        timeStr = timeStr.split('/')[0];
    }
    timeStr.split(':').reverse().forEach((t,i) => seconds += (60 ** i) * parseInt(t));
    return seconds;
}

observers.push(newObserver(onMutation));
function onMutation(/**@type {MutationRecord[]}*/mutations, observer) {
    if (!beeped && mutations.some(mut => mut.target == playingTitle)) {
        console.debug("beep", { curTrack, curTime });
        if (curTime > 0 && curTime <= timeToSeconds(curTrack.duration) * 0.99) {
            sendHistory(curTrack.id, curTime);
            // sendData('history', {
            //     ...curTrack,
            //     skipped_at: curTime,
            // });
        }
        beep.play();
        // beeped = true;
        return;
    }
    
    if (mutations.some(mut => mut.target == playButton)) {
        onPlayPause();
        return;
    };
    
    console.debug('mutations:', mutations);
}

function isPlaying() { return playButton?.title == 'Pause'; }
function onPlayPause(evt) {
    console.info('isPlaying:', { isPlaying: isPlaying(), playStarted });
    if (!playStarted && isPlaying()) {
        const trackData = getTrackData(getPlayingTrack());
        if (!trackData) {
            console.debug(`track data not ready yet`);
            if (waitingForTrack) {
                window.clearTimeout(waitingForTrack);
            }
            waitingForTrack = waitForElems(xpPlayingTrack).then(() => {
                console.debug(`sending awaited track data`);
                addTrackToHistory(getTrackData(getPlayingTrack()));
            });
            return;
        }
        addTrackToHistory(trackData);
    }
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
function getSelectedTrack() { return queue?.xp?.(xpSelTrack)?.[0]; }
function getPlayingTrack() { return queue?.xp?.(xpPlayingTrack)?.at(-1); }
/** @returns {TrackData} */
function getTrackData(queuedTrack) {
    if (!queuedTrack) {
        return;
    }
    const data = (queuedTrack.__data || queuedTrack.inst.__data)?.data;
    /* queuedTrack.__CE_shadowRoot.templateInfo.nodeList[0].__dataHost */
    return {
        id: data?.videoId || queuedTrack.qs(".thumbnail-overlay").__dataHost.__data.data.videoId,
            //queuedTrack.qs(".thumbnail img[src]").src.match(/\/vi\/(\w+)\//i)?.[1],
        title:    data?.title?.runs[0]?.text || queuedTrack.qs(".song-title").innerText,
        uploader: data?.shortBylineText?.runs[0]?.text || queuedTrack.qs(".byline").innerText,
        duration: data?.lengthText?.runs[0]?.text || queuedTrack.qs(".duration").title,
        channel:  data?.longBylineText?.runs[0]?.navigationEndpoint?.browseEndpoint?.browseId,
    };
}

function openFirstTrackMenu() { queue.xp(".//ytmusic-player-queue-item[1]//button")[0].click(); }

async function removeTrack(queuedTrack) {
    const trkData = getTrackData(queuedTrack);
    console.debug("removing:", trkData);
    
    try {
        qs("button", queuedTrack).click();
        // const menu = (await waitForElems(xpMenu))[0];
        
        // console.log("menu:", menu);
        let remove = (await waitForElems(
            '//ytmusic-menu-popup-renderer' //[not(contains(@style,"outline: none;"))]'
            + '//ytmusic-menu-service-item-renderer[.//*[text()="Remove from queue"]]'
        ))[0];
        if (!remove) {
            debugger;
        }
        const remData = (remove.__data || remove.inst.__data).data;
        console.warn("remove:", { title: queuedTrack.qs("[title]").title, queuedTrack, data: remove.__data, remove });
        if (remData.serviceEndpoint.removeFromQueueEndpoint.videoId == trkData.id) {
            queuedTrack.style.backgroundColor = null;
            remove.click();
        }
        else {
            console.error("queuedTrack changed:", trkData, queuedTrack.__data || queuedTrack.inst.__data, remData, remData.serviceEndpoint, queuedTrack, remove);
            const menu = remove.xp("ancestor::tp-yt-iron-dropdown[{class='ytmusic-popup-container'}]")[0];
            menu?.setAttribute("aria-hidden", true);
            menu?.removeAttribute("focus");
        }
        
        wait(() => {
            // console.log("trim awaited");
            trimQueue();
        }, 5);
        
        return `"${trkData.title}" removed from queue`;
    }
    catch (err) {
        console.warn("removeTrack:", err);
        return;
    }
}

function addTrackToHistory(/**@type {TrackData}*/ trkData) {
    const now = new Date();
    const data = {
        ...trkData,
        date: now.toJSON(),
    };
    // sendData('history', data)
    sendHistory(data.id).then((resp) => {
        if (resp.toJSON) {
            return;
        }
        console.warn(`Could not add track to server history, falling back to storage.`);
        
        let history = loadObj(keyHistory) || [];
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
        history.push(data);
        saveObj(keyHistory, history);
        console.log("saved history:", { ...history });
    });
}

function isTrackRecent(/**@type {TrackData}*/ trkData) {
    const trkTime = cache.history[trkData.id];
    if (!trkTime) {
        return false;
    }
    return new Date().getTime() - historyDiffLimit <= trkTime.getTime();
}

function isTrackFavorite(/**@type {TrackData}*/ trkData, likeBtn = null) {
    // const favorites = loadObj(keyFavorites) || [];
    // console.debug("favorites:", [...favorites]);
    
    // if (favorites.some(fav => fav.title == trkData.title && fav.uploader == trkData.uploader)) {
    if (cache.favorites[trkData.id]) {
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

async function addTrackToFavorites(/**@type {TrackData}*/ trkData, likeBtn = null) {
    // if (isTrackFavorite(trkData)) {
    //     console.log("already in favorites:", trkData);
    //     return;
    // }
    // const favorites = loadObj(keyFavorites) || [];
    // const now = new Date();
    // favorites.push({
    //     ...trkData,
    //     date: now.toJSON(),
    // });
    // saveObj(keyFavorites, favorites);
    // console.log("saved favorites:", [...favorites]);
    // const resp = await (sendData(`favorite`, { id: trkData.id, when: trkData.date }));
    // if (resp.favorites) {
    //     console.debug(`added "${trkData.id}" to favorites:`, resp, trkData);
    //     for (const fav of resp.favorites) {
    //         cache.favorites[fav.id] = new Date(fav.faved);
    //     };
    //     if (likeBtn) {
    //         isTrackFavorite(trkData, likeBtn);
    //     }
    //     return true;
    // }
    /**@type {GM_Response<TrackData>}*/
    const resp = await GM_fetch(apiServer + `tracks/${trkData.id}/fav`, { method: 'PUT' }, `faving "${trkData.id}"`);
    if (resp.status == 202) {
        console.debug(`added "${resp.json.id}" to favorites:`, resp, trkData);
        cache.favorites[resp.json.id] = new Date();
        if (likeBtn) {
            isTrackFavorite(trkData, likeBtn);
        }
    }
    if ([200, 202].indexOf(resp.status) > -1) {
        return true;
    }
    console.debug(`failed to add "${trkData.id}" to favorites:`, resp, trkData);
    return false;
}

function isTrackBlacklisted(/**@type {TrackData}*/ trkData, dislikeBtn = null) {
    if (cache.blacklist[trkData.id] || titleBlacklist.some(tb => trkData.title.search(tb) > -1)) {
        dislikeBtn?.classList.add("blacklisted");
        return true;
    }
    
    dislikeBtn?.classList.remove("blacklisted");
    return false;
}

async function addTrackToBlacklist(/**@type {TrackData}*/ trkData) {
    // const resp = await (sendData(`blacklist`, { id: trkData.id, when: trkData.date }));
    // if (!resp.error) {
    //     console.debug(`added "${trkData.id}" to blacklist:`, resp, trkData);
    //     return true;
    // }
    /**@type {GM_Response<TrackData>}*/
    const resp = await GM_fetch(apiServer + `tracks/${trkData.id}/blacklist`, { method: 'PUT' }, `blacklisting "${trkData.id}"`);
    if (resp.status == 202) {
        console.debug(`added "${resp.json.id}" to blacklist:`, resp, trkData);
        cache.blacklist[resp.json.id] = new Date();
    }
    if ([200, 202].indexOf(resp.status) > -1) {
        return true;
    }
    console.debug(`failed to add "${trkData.id}" to blacklist:`, resp, trkData);
    return false;
}

async function addTrackToLiked(/**@type {TrackData}*/ trkData) {
    /**@type {GM_Response<TrackData>}*/
    const resp = await GM_fetch(apiServer + `tracks/${trkData.id}/like`, { method: 'PUT' }, `liking "${trkData.id}"`);
    if ([200, 202].indexOf(resp.status) > -1) {
        return true;
    }
    console.debug(`failed to add "${trkData.id}" to liked:`, resp, trkData);
    return false;
}

async function addTrackToDisliked(/**@type {TrackData}*/ trkData) {
    /**@type {GM_Response<TrackData>}*/
    const resp = await GM_fetch(apiServer + `tracks/${trkData.id}/dislike`, { method: 'PUT' }, `disliking "${trkData.id}"`);
    if ([200, 202].indexOf(resp.status) > -1) {
        return true;
    }
    console.debug(`failed to add "${trkData.id}" to disliked:`, resp, trkData);
    return false;
}

function isTrackLiked() {
    return qs(".middle-controls-buttons #button-shape-like > [aria-pressed]")
        .getAttribute("aria-pressed")?.toLowerCase() == "true";
}

function isTrackDisliked() {
    return qs(".middle-controls-buttons #button-shape-dislike > [aria-pressed]")
        .getAttribute("aria-pressed")?.toLowerCase() == "true";
}

function trimQueue() {
    if (trimPromise) {
        console.warn("previous TrimPromise still active");
        return;
    }

    trimPromise = waitForElems(xpPlayingTrack, queue)
    .then(() => {
        // const history = loadObj(keyHistory) || [];
        playing = getPlayingTrack();
        const tracks = getTracks();
        const index = tracks.indexOf(playing);
        console.log("trim:", index + 1, "/", tracks.length);
        if (index > maxPastQueue) {
            // trimPromise = null;
            return removeTrack(tracks[0])
                // .then(() => { wait(() => trimQueue(), 20); });
        }
        const automix = queue.qs("#automix-contents")?.children?.length > 0;
        // const blacklist = loadObj(keyBlacklist) || [];
        // console.debug("blacklist:", blacklist);
        const handlers = [];
        for (let i = index + 1; i < tracks.length; i++) {
            const track = tracks[i];
            const data = getTrackData(track);
            const trackQueue = track.xp(xpTrackQueue)[0];
            if (!track.onmousedown) {
                track.onmousedown = handleClick;
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
            // const blacklisted = titleBlacklist.some(black => data.title.search(black) > -1)
            //     || blacklist.some(black => black.title == data.title);
            const blacklisted = isTrackBlacklisted(data);
            const isRecent = isTrackRecent(data);
            if (blacklisted || isRecent) {
                if (blacklisted) {
                    console.log(`Removing track '${data.title}' because it's blacklisted.`); //, { data, trackQueue });
                }
                else {
                    console.log(`Removing track '${data.title}' because it's in the history.`); //, { data, trackQueue });
                }
                // trimPromise = null;
                const removed = removeTrack(track);
                if (removed) { return removed; }
            }
        }
        // console.log("handlers:", handlers);
        // trimPromise = null;
    })
    .then((result) => {
        // the trimPromise returned, so we can clear it's ref
        console.debug("trimPromise returned:", result?.[0]);
    })
    .catch(err => {
        console.error({ message: "trimQueue() ERROR:", err });
    })
    .finally(() => {
        trimPromise = null;
    })
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
    
    if (ctrl && alt) {
        // const now = new Date();
        // console.log(
        //     `added '${data.title}' by '${data.uploader}' to blacklist:`,
        //     modObj(keyBlacklist, [], blacklist => {
        //         blacklist.push({ ...data, date: now.toJSON() });
        //         return true;
        //     })
        // );
        track.style.backgroundColor = "#422";
        addTrackToBlacklist(data).then(success => {
            // don't remove the track from the playlist when logged in | ???
            if (success) { // evt.loggedIn == false) {
                wait(() => {
                    track.style.backgroundColor = null;
                    removeTrack(track);
                }, blacklistDelay);
            }
        });
        return false;
    }
    
    // either Ctrl + Click or Alt + Click were done
    removeTrack(track).then((removed) => {
        if (!removed || !alt) { return; }
        data.skipped = true;
        addTrackToHistory(data);
    });
    
    return false;
}

function newSteering() {
    waitForElems("#chips > ytmusic-chip-cloud-chip-renderer[is-selected]:not([should-show-loading-chip])")
    .then(() => asyncWait(2000))
    .then(() => trimQueue());
};

function xpToastByMessage(/**@type {string|string[]}*/ messages) {
    if (typeof(messages) == "string") {
        messages = [messages];
    }
    return `//tp-yt-paper-toast[not(@aria-hidden='true') and .//*[${messages.map(msg => `contains(text(),'${msg}')`).join(" or ")}]]`;
}
const xpToastWatchingLiked = xpToastByMessage(["Still watching?", "Saved to liked music"]);
const xpToastLiked = xpToastByMessage("Saved to liked music");
console.log([xpToastWatchingLiked, xpToastLiked]);

function urlChanged() {
    wlh = window.location.href;
    playStarted = beeped = false;
    
    addHelpTip();
    
    fetchHistory().then(hist => {
        if (!debug) { return; }
        console.debug('fetched history:', hist);
    });
    fetchInfo().then(info => {
        if (!debug) { return; }
        console.debug('fetched info:', info);
    });
    // fetchBlacklist().then(blk => {
    //     if (!debug) { return; }
    //     console.debug('fetched blacklist:', blk);
    // });
    // fetchFavorites().then(favs => {
    //     if (!debug) { return; }
    //     console.debug('fetched favorites:', favs);
    // });
    
    waitForElems(".content-info-wrapper > yt-formatted-string.title").then(playing => {
        playing = playing[0];
        watch(playing, { attributeFilter: ["title"] });
        playingTitle = playing;
    });
    
    waitForElems('#play-pause-button').then(button => {
        button = button[0];
        watch(button, { attributeFilter: ['title'] });
        playButton = button;
        // if (!playButton.onclick) {
        //     playButton.onclick = onPlayPause;
        // }
    });
    
    // waitForElems('ytmusic-player-bar .time-info').then(time => {
    //     watch(time[0], { characterData: 1, characterDataOldValue: 1, childList: 1 });
    //     if (false) {
    //         curTrack = getPlayingTrack();
    //         curTime = qs('ytmusic-player-bar .time-info')?.textContent;
    //     }
    // });
    
    waitForElems("#steering-chips > #chips:not([waiting])", 5000)
    .then((chips) => {
        // qsa("#steering-chips > #chips:not([waiting])")
        chips.forEach(chip => {
            if (chip.onclick) { return; }
            chip.onclick = newSteering;
            chip.setAttribute("waiting", "");
            console.debug("added 'onclick' to:", chip);
        });
    })
    .catch(err => { console.log("no unaltered `#chips` found", err); })
    
    // waitForElems("//tp-yt-paper-toast[.//*[contains(text(),'Still watching?') or contains(text(),'Saved to liked music')]]")
    waitForElems(xpToastWatchingLiked + "//*[@id='close-button']", 3000)
    .then((buttons) => {
        // xp(xpToastWatchingLiked + "//*[@id='close-button']")
        buttons.forEach(button => button.click());
    })
    .catch(err => { console.log("no 'toasts' found", err); })

    waitForElems("//*[{class='ytmusic-tab-renderer'}]//*[@id='contents' and .//ytmusic-player-queue-item]/..")
    .catch(err => { return; })
    .then(contents => {
        contents = contents?.[0];
        if (!contents) {
            return;
        }
        queue = contents;
        // const tracks = getTracks();
        // console.log(tracks);
        return waitForElems(xpSelTrack, queue);
    })
    // .catch(err => { return; })
    .then(selected => {
        selected = selected?.[0];
        if (!selected) {
            return;
        }
        const loggedIn = qs("a.sign-in-link") == null;
        const tracks = getTracks();
        tracks.forEach(trk => trk.style.backgroundColor = null);
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
        console.debug('url changed, calling "onPlayPause()"');
        onPlayPause();
        
        const likeBtn = qs(".middle-controls-buttons #button-shape-like");
        if (!likeBtn.onmousedown) {
            likeBtn.onmousedown = (evt) => {
                const like_track = getSelectedTrack();
                const trkData = getTrackData(like_track);
                if (loggedIn && evt.button != 1 || !loggedIn && evt.button != 0 && evt.button != 1) {
                    if (loggedIn) {
                        console.debug("discarding 'Liked' notification");
                        waitForElems(xpToastLiked + "//*[@id='close-button']")
                        .then((buttons) => {
                            buttons.forEach(button => button.click());
                        });
                    }
                    addTrackToLiked(trkData);
                    return;
                }
                console.log("logged in:", { loggedIn, button: evt.button, like_track, trkData, likeBtn });
                
                if (likeBtn.getAttribute("aria-pressed")?.toLowerCase() == "true" && evt.button == 0) {
                    return;
                }
                
                addTrackToFavorites(trkData, likeBtn);
                // isTrackFavorite(trkData, likeBtn);
                
                if (!loggedIn) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    evt.stopImmediatePropagation();
                    waitForElems("ytmusic-modal-with-title-and-button-renderer")
                    .then(popup => {
                        popup[0].style.display = "none";
                    });
                    return false;
                }
                else {
                    console.debug("discarding 'Liked' notification");
                    waitForElems(xpToastLiked)
                    .then((buttons) => {
                        buttons.forEach(button => button.click());
                    });
                }
            };
        }
        console.log("fav:", isTrackFavorite(trackData, likeBtn), loadObj(keyFavorites));
        asyncWait(2000).then(() => {
            // TODO: sync update with UI finishing loading
            console.log("fav:", isTrackFavorite(trackData, likeBtn), loadObj(keyFavorites));
            if (isTrackLiked()) {
                addTrackToLiked(trackData);
            }
        });

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
                    waitForElems("ytmusic-modal-with-title-and-button-renderer")
                    .then(popup => {
                        popup[0].style.display = "none";
                    });
                    return false;
                }
            };
        }
        // disabled because it can trigger for the next track after disliking the previous
        // if (isTrackDisliked()) {
        //     addTrackToDisliked(trackData);
        // }

        // const button = selected.xp(".//button")[0];
        // button.click();
        // waitForElems(xpMenu).then(dropmenu => {
        //     menu = dropmenu[0];
        //     console.log("menu:", menu);
        //     button.click();
        // });

        waitForElems("#automix-contents ytmusic-player-queue-item", 2000)
        .catch(() => null)
        .then(automix => {
            console.log("automix:", automix?.[0]);
            trimQueue();
        });
    });
    
    waitForElems("yt-button-renderer.ytmusic-you-there-renderer button.yt-spec-button-shape-next", 3000)
    // .catch(err => { return; })
    .then(button => button[0]?.click());
}

function check() {
    if (window.location.href != wlh) { urlChanged(); }
    
    curTrack = getTrackData(getPlayingTrack());
    curTime = qs('ytmusic-player-bar .time-info')?.textContent;
    if (curTime) {
        curTime = timeToSeconds(curTime.split('/')[0]);
    }
    
    qs(' tp-yt-paper-dialog:not([aria-hidden="true"]) '
     + ' yt-button-renderer.ytmusic-you-there-renderer '
     + ' button.yt-spec-button-shape-next ')?.click();
}
