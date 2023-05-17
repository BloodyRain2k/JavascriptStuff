// ==UserScript==
// @name         Fuck YT Continue
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       BloodyRain2k
// @match        https://www.youtube.com/*
// @noframes
// @grant        none
// ==/UserScript==

function addSelectors(elem) { if (!elem) return; elem.xp = (sel) => xp(sel, elem); elem.qsa = (sel) => qsa(sel, elem); elem.qs = (sel) => qs(sel, elem); return elem; };
function xp(find, root) { let result = [], elems = document.evaluate(find.replace(/\{([\w-_]+)=([^}]+)\}/, `contains(concat(' ',normalize-space(@$1),' '),' $2 ')`), root || document.body || document, null, XPathResult.ANY_TYPE, null);
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(addSelectors(elem)); } return result; }
function qsa(selector, root) { return Array.from((root || document.body || document).querySelectorAll(selector)).map(elm => addSelectors(elm)); }
function qs(selector, root) { return addSelectors((root || document.body || document).querySelector(selector)); }
function waitForElem(selector, root, timeout = 10000) { if (typeof(root) == "number") { timeout = root; root = null; }; root ??= document.body || document; let observer, timeoutId = -1;
    const promise = new Promise((resolve, reject) => { let elem = qs(selector, root); if (elem) { return resolve(elem); }; observer = new MutationObserver(() => {
    let obsElem = qs(selector, root); if (obsElem) { window.clearTimeout(timeoutId); observer.disconnect(); resolve(obsElem); }; });
    observer.observe(root, { childList: true, subtree: true }); timeoutId = window.setTimeout(() => { observer.disconnect(); reject({ selector, root, timeout }); }, timeout); });
    if (observer) { promise.observer = observer; }; if (timeout > 0) { promise.timeoutId = timeoutId; }; promise.maxDelay = timeout; return promise; }
function wait(func, time = 500) { window.setTimeout(func, time); }

function setLocalObject(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getLocalObject(key) { let str = localStorage.getItem(key); return str ? function() { try { return JSON.parse(str); } catch (e) { return undefined; } }() : undefined; }

function toHash(s) { let h = 0; s = "" + s; if (s.length == 0) return h; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; } return h; }

function getHttp(obj, async = true) { var http = new XMLHttpRequest(); http.open(obj.method || "GET", obj.url, async); for (let hName in (obj.headers || {})) { http.setRequestHeader(hName, obj.headers[hName]); }
    if (async) { http.timeout = obj.timeout || 5000; } if (obj.onload) { http.onload = () => obj.onload(http); } if (obj.onerror) { http.onerror = () => obj.onerror(http); }
    if (obj.tag) { http.tag = obj.tag; } /*console.log(obj);*/ http.send(obj.data); return http; }

// variables //

let wlh = window.location.href, checkId = window.setInterval(check, 500), focused = false, keepPlayingId;

// functions //

window.onblur = (evt) => {
    focused = qs("button[aria-keyshortcuts='k'][data-title-no-tooltip='Play']") != null;
    keepPlayingId = window.setInterval(keepPlaying, 500);
    console.log("blur", focused, keepPlayingId);
};
window.onfocus = (evt) => {
    focused = true;
    window.clearInterval(keepPlayingId);
    console.log("focused", focused);
};

function keepPlaying() {
    if (focused) { return; }
    qs("button[aria-keyshortcuts='k'][data-title-no-tooltip='Play']")?.click();
}

function check() {
    const scroller = qs("[dialog='true'] > * > #scroller");
    if (scroller) {
        console.log("scroller:", scroller, scroller?.checkVisibility());
        if (scroller.textContent.search(/continue watching/i) > -1) { // && scroller.checkVisibility()) {
            qs("button[aria-label='Yes']", scroller.parentNode).click();
            const dialog = xp("ancestor::tp-yt-paper-dialog", scroller)[0];
            dialog?.parentNode?.removeChild(dialog);
        }
    }
}
