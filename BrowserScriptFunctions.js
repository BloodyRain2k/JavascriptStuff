function xp(find, root) { let result = []; let elems = document.evaluate(find.replace(/\{([\w-_]+)=([^}]+)\}/, `contains(concat(' ',normalize-space(@$1),' '),' $2 ')`), root || document, null, XPathResult.ANY_TYPE, null);
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(elem); } return result; }
function qsa(selector, root) { if (selector.startsWith("/")) { return xp(selector, root); } return (root || document).querySelectorAll(selector); }
function qs(selector, root) { return qsa(selector, root)[0]; }
function wait(func, time = 100) { window.setTimeout(func, time); }

function setLocalObject(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getLocalObject(key) { let str = localStorage.getItem(key); return str ? function() { try { return JSON.parse(str); } catch (e) { return undefined; } }() : undefined; }

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

function toHash(str) {
    let hash = 0; str = str.toString();
    if (str.length == 0) return hash;

    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    } return hash;
}
