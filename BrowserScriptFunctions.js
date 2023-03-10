// #region < functions > //

function addSelectors(elem) { if (!elem) return; elem.xp = (sel) => xp(sel, elem); elem.qsa = (sel) => qsa(sel, elem); elem.qs = (sel) => qs(sel, elem); return elem; };
function xp(find, root) { let result = [], elems = document.evaluate(find.replace(/\{([\w-_]+)=([^}]+)\}/, `contains(concat(' ',normalize-space(@$1),' '),' $2 ')`), root || document.body || document, null, XPathResult.ANY_TYPE, null);
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(addSelectors(elem)); } return result; }
function qsa(selector, root) { return Array.from((root || document.body || document).querySelectorAll(selector)).map(elm => addSelectors(elm)); }
function qs(selector, root) { return addSelectors((root || document.body || document).querySelector(selector)); }
function waitForElem(selector, root, timeout = 15000) { if (typeof(root) == "number") { timeout = root; root = null; }; root ??= document.body || document; let observer, timeoutId = -1;
    const promise = new Promise((resolve, reject) => { let elem = qs(selector, root); if (elem) { return resolve(elem); }; observer = new MutationObserver(() => {
    let obsElem = qs(selector, root); if (obsElem) { window.clearTimeout(timeoutId); observer.disconnect(); resolve(obsElem); }; });
    observer.observe(root, { childList: true, subtree: true }); timeoutId = window.setTimeout(() => { observer.disconnect(); reject({ selector, root, timeout }); }, timeout); });
    if (observer) { promise.observer = observer; }; if (timeout > 0) { promise.timeoutId = timeoutId; }; promise.maxDelay = timeout; return promise; }

const observers = [];
function newObserver(func) { if (!func) { return console.error("no observer function"); }; const observer = new MutationObserver(func); observer.function = func; observer.trigger = function(){ func([], this); }; observer.watching = [];
    observer.cleanup = function(){ this.disconnect(); this.watching = this.watching.filter(wtch => wtch.target.xp("ancestor::body")[0]); this.watching.forEach(wtch => this.observe(wtch.target, wtch.options)); }; return observer; }
function watch(target, options, func) { if (typeof(target) == "string") { target = qs(target); }; if (!target) { return; }; if (func && typeof(func) != "function") { return console.error("no watch function:", func); };
    const obs = (func ? newObserver(func) : observer); obs.observe(target, options); if (obs.watching.find(watching => watching.target == target && watching. options)) { console.log("not adding twice:", { target, options }); }
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

// #endregion //

let observer = newObserver(mutation);
function mutation(mutations, observer) {
    console.log(mutations, observer); // remove this as soon as possible, it can cause memory leaking
}
