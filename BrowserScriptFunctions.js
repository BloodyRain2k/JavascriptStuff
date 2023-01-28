// #region < functions > //

function xp(find, root) { let result = []; let elems = document.evaluate(find.replace(/\{([\w-_]+)=([^}]+)\}/, `contains(concat(' ',normalize-space(@$1),' '),' $2 ')`), root || document, null, XPathResult.ANY_TYPE, null);
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(elem); } return result; }
function qsa(selector, root) { return Array.from((root || document.body || document).querySelectorAll(selector)); }
function qs(selector, root) { return (root || document.body || document).querySelector(selector); }
function waitForElem(selector, root, timeout = 30000) { root ??= document.body || document; let observer, timeoutId = -1; const promise = new Promise((resolve, reject) => {
    let elem = qs(selector, root); if (elem) { return resolve(elem); } observer = new MutationObserver(() => { let obsElem = qs(selector, root); if (obsElem) { window.clearTimeout(timeoutId);
    observer.disconnect(); resolve(obsElem); }; }); observer.observe(root, { childList: true, subtree: true }); timeoutId = window.setTimeout(() => { observer.disconnect();
    console.error(`waitForElem: couldn't find '${selector}' after ${timeout} ms in `, root); reject({ selector, root, timeout }); }, timeout); }); if (observer) promise.observer = observer;
    if (timeout > 0) promise.timeoutId = timeoutId; promise.maxDelay = timeout; return promise; }

function setDefaults(target, defaults, level = 0) { if (typeof(defaults) != typeof {} || typeof(target) == typeof(undefined)) { return target || defaults; }
    if (typeof(target) != typeof(defaults) || ("forEach" in target) != ("forEach" in defaults)) { return target; } if ("forEach" in defaults) {
    defaults.forEach(arr => { if (target.indexOf(arr) == -1) target.push(arr); }); return target; } for (var key in defaults) {
    target[key] = setDefaults(target[key], defaults[key], level + 1); } return { ...defaults, ...target }; }
function getLocalObject(key) { var str = localStorage[key]; return str ? function() { try { return JSON.parse(str); } catch (e) { return undefined; } }() : undefined; }
function setLocalObject(key, value) { localStorage[key] = JSON.stringify(value); }
function modLocalObject(key, defVal, func) {
    let obj = getLocalObject(key); if (obj == null) { obj = defVal; } else { obj = setDefaults(obj, defVal); };
    if (!func) { console.warn(`modLocalObject: no function for '${key}'`); return obj; } let result = func(obj);
    if (result === true) { setLocalObject(key, obj); } else { console[result === false ? "warn" : "error"](`modLocalObject: '${key}' not saved`); } return obj; }

function wait(func, delay = 500) { return window.setTimeout(func, delay); }

function toHash(str) { let hash = 0; str = str.toString(); if (str.length == 0) return hash;
                      for (let i = 0; i < str.length; i++) { let char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = hash & hash; } return hash; }

function getHttp(obj, async = true) {
    var http = new XMLHttpRequest();
    http.open(obj.method || "GET", obj.url, async);
    for (let hName in (obj.headers || {})) { http.setRequestHeader(hName, obj.headers[hName]); }
    if (async) { http.timeout = obj.timeout || 5000; }
    if (obj.onload) { http.onload = () => obj.onload(http); }
    if (obj.onerror) { http.onerror = () => obj.onerror(http); }
    if (obj.tag) { http.tag = obj.tag; }
    //console.log(obj);
    http.send(obj.data);
    return http;
}

// #endregion //
