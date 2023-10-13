// ==UserScript==
// @name         WPML Assist
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  try to take over the world!
// @author       You
// @match        https://e.ate.wpml.org/dashboard?id=*
// @match        https://e.ate.wpml.org//dashboard?id=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wpml.org
// @grant        none
// @noframes
// ==/UserScript==

function addSelectors(elem) { if (!elem) return; elem.xp = (sel) => xp(sel, elem); elem.qsa = (sel) => qsa(sel, elem); elem.qs = (sel) => qs(sel, elem); return elem; };
function xp(find, root) { let result = [], elems = document.evaluate(find.replace(/\{([\w-_]+)=([^}]+)\}/, `contains(concat(' ',normalize-space(@$1),' '),' $2 ')`), root || document.body || document, null, XPathResult.ANY_TYPE, null);
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(addSelectors(elem)); } return result; }
function qsa(selector, root) { return Array.from((root || document.body || document).querySelectorAll(selector)).map(elm => addSelectors(elm)); }
function qs(selector, root) { return addSelectors((root || document.body || document).querySelector(selector)); }
function waitForElem(selector, root, timeout = 30000) { if (typeof(root) == "number") { timeout = root; root = null; }; root ??= document.body || document; let observer, timeoutId = -1;
    const promise = new Promise((resolve, reject) => { let elem = qs(selector, root); if (elem) { return resolve(elem); }; observer = new MutationObserver(() => {
    let obsElem = qs(selector, root); if (obsElem) { window.clearTimeout(timeoutId); observer.disconnect(); resolve(obsElem); }; });
    observer.observe(root, { childList: true, subtree: true }); timeoutId = window.setTimeout(() => { observer.disconnect(); reject({ selector, root, timeout }); }, timeout); });
    if (observer) { promise.observer = observer; }; if (timeout > 0) { promise.timeoutId = timeoutId; }; promise.maxDelay = timeout; return promise; }

function wait(func, delay = 500) { return window.setTimeout(func, delay); }
function toHash(s) { let h = 0; s = `${s}`; if (s.length == 0) return h; for (let i = 0; i < s.length; i++) { let char = s.charCodeAt(i); h = ((h << 5) - h) + char; h = h & h; } return h; }

function getHttp(obj, async = true) { var http = new XMLHttpRequest(); http.open(obj.method || "GET", obj.url, async); for (let hName in (obj.headers || {})) { http.setRequestHeader(hName, obj.headers[hName]); }
    if (async) { http.timeout = obj.timeout || 5000; } if (obj.onload) { http.onload = () => obj.onload(http); } if (obj.onerror) { http.onerror = () => obj.onerror(http); }
    if (obj.tag) { http.tag = obj.tag; } /*console.log(obj);*/ http.send(obj.data); return http; }

///////////////
// variables //
///////////////

const pasteBtnRaw = '<li class="inline-block m-r-1 pull-right"><span name="paste" class="btn m-b-2 btn-default">Paste</span></li>';
let wlh, checkId = window.setInterval(check, 1000);
let lastClipHash;

///////////////
// functions //
///////////////

let observer = new MutationObserver(mutation);
function watch(target, options) { if (!target) { return console.warn("watch: no target"); }; observer.observe(target, options); console.log("watch added:", target, options); }
function mutation(mutations, observer) {
    // return console.log(mutations);

    for (const mut of mutations) {
    }
}


function newUrl() {
    wlh = window.location.href;

    waitForElem("ul.nav").then(nav => {
        if (!nav.qs("span[name='paste']")) {
            if (!window.navigator.clipboard?.readText) {
                return;
            }

            let container = nav.xp("ancestor::div[{class=otgs-editor-container}]")[0];
            let div = document.createElement("div");
            div.innerHTML = pasteBtnRaw;
            nav.appendChild(div);
            waitForElem("iframe", container).then(iframe => {
                // watch(iframe.contentDocument, { subtree: 1, characterData: 1, childList: 1 });
                let editor = iframe.contentDocument?.querySelector("#tinymce");
                if (!editor) { console.error("couldn't find editor"); return false; }

                qs("span", div).onclick = (evt) => {
                    // console.log(editor);
                    window.navigator.clipboard.readText().then(clip => {
                        let dt = new DataTransfer();
                        dt.setData("text/plain", clip);

                        if (editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt }))) {
                            div.style.display = "none";
                            lastClipHash = toHash(clip);
                        }
                    });
                };
            });
            // document.body.onmouseenter = (evt) => {
            window.onblur = (evt) => {
                // if (div.checkVisibility()) { return; }
                // window.navigator.clipboard.readText().then(clip => {
                //     if (toHash(clip) != lastClipHash) {
                div.style.display = "";
                //     }
                // });
            };
        }
    });
}

function check() {
    if (wlh != window.location.href) { newUrl(); }
}
