// #region < functions > //

function xp(find, root) { let result = []; let elems = document.evaluate(find.replace(/\{([\w-_]+)=([^}]+)\}/, `contains(concat(' ',normalize-space(@$1),' '),' $2 ')`), root || document, null, XPathResult.ANY_TYPE, null);
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(elem); } return result; }
function qsa(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
function qs(selector, root) { return qsa(selector, root)[0]; }
function waitForElem(selector, root) { return new Promise(resolve => { let elem = qs(selector, root); if (elem) { return resolve(elem); }
    const observer = new MutationObserver(() => { let obsElem = qs(selector, root); if (obsElem) { resolve(obsElem); observer.disconnect(); } });
    observer.observe(root || document.body, { childList: true, subtree: true }); }); }

function setDefaults(target, defaults, level = 0) {
    console.debug(">", level, target, defaults);
    if (typeof(defaults) != typeof{}) { console.debug(`${level}: returning value:`, defaults); return defaults; }
    if ("forEach" in defaults) { console.debug(`${level}: iterating:`, defaults);
                                defaults.forEach(elm => { if (target.indexOf(elm) == -1) { target.push(elm); } }); return target; }
    for (var key in defaults) {
        if (target[key] == undefined) { console.debug(`${level}: creating '${key}' with value:`, defaults[key]); target[key] = defaults[key]; }
        else if (typeof(defaults[key]) == typeof{}) {
            console.debug(`${level}: defaulting '${key}' with value:`, defaults[key]); target[key] = setDefaults(target[key], defaults[key], level + 1);
        }
        else if (typeof(defaults[key]) == typeof(target[key])) {} // nothing to do there
        else if (typeof(defaults[key]) != typeof(target[key])) {
            console.error(`warning, default type doesn't match actual type for key '${key}: '${typeof(defaults[key])}' vs '${typeof(target[key])}'`, defaults[key], target[key]);
        }
        else { console.error("error", key); debugger; }
    }
    return target;
}

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
