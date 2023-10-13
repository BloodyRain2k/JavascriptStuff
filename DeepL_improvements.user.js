// ==UserScript==
// @name         DeepL improvements
// @namespace    http://tampermonkey.net/
// @version      0.2.1
// @description  try to take over the world!
// @author       BloodyRain2k
// @match        https://www.deepl.com/translator
// @grant        none
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

// variables //

let wlh, textDropped;
let checkId = window.setInterval(check, 500);
let sourceContainer, resultContainer, resultDummy;

// functions //

let observer = new MutationObserver(mutation);
function watch(target, options) { if (!target) { return console.warn("watch: no target"); }; observer.observe(target, options); console.log("watch added:", target, options); }
function mutation(mutations, observer) {
    // console.log(mutations);
    for (const mut of mutations) {
        if (mut.target == resultDummy && mut.addedNodes.length > 0 && textDropped) {
            waitForElem('button[data-testid="translator-target-toolbar-copy"]', resultContainer).then(copy => {
                textDropped = false;
                copy.click();
            });
        }
    }
}

waitForElem("section[aria-labelledby='text-translator-section-heading']").then(container => {
    sourceContainer = container.qs("section[aria-labelledby='translation-source-heading']");
    resultContainer = container.qs("section[aria-labelledby='translation-target-heading']");

    resultDummy = resultContainer.qs("d-textarea > div");
    watch(resultDummy, { subtree: true, characterData: true, childList: true });

    let sourceText = sourceContainer.qs("d-textarea");
    sourceText.ondragenter = (evt) => {
        console.log("entered:", evt);
        sourceContainer.qs("button#translator-source-clear-button")?.click();
    };
    sourceText.ondrop = (evt) => {
        console.log("dropped:", evt, evt.target.innerHTML, evt.target.firstChild);
        evt.target.firstChild.innerText = evt.dataTransfer.getData("text");
        evt.preventDefault();
        evt.stopPropagation();
        textDropped = true;
    };
});

function newUrl() {
    wlh = window.location.href;

    // console.debug(wlh, sourceContainer, resultContainer);
}

function check() {
    if (wlh != window.location.href) { newUrl(); }
}
