// ==UserScript==
// @name         WordPress improvements
// @namespace    http://tampermonkey.net/
// @version      0.3.0.2
// @description  try to take over the world!
// @author       BK
// @match        */wp-login.php*
// @match        */wp-admin/*
// @noframes
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/BloodyRain2k/JavascriptStuff/main/WordPress_improvements.userscript
// @downloadURL  https://raw.githubusercontent.com/BloodyRain2k/JavascriptStuff/main/WordPress_improvements.userscript
// ==/UserScript==

// #region < helpers > //

function addSelectors(elem) { if (!elem) return; elem.xp = (sel) => xp(sel, elem); elem.qsa = (sel) => qsa(sel, elem); elem.qs = (sel) => qs(sel, elem); return elem; };
function xp(selector, root) { let result = [], elems, sel = selector.replace(/\{([\w-_]+)=['"]?([^}]+?)['"]?\}/g, "contains(concat(' ',normalize-space(@$1),' '),' $2 ')"); try { elems = document.evaluate(sel,
    root || document.body || document, null, XPathResult.ANY_TYPE, null); } catch (ex) { console.error("xp exception:", { ex, selector, sel }); return; }; // class match: `{class=<className>}`
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(addSelectors(elem)); } return result; }
function qsa(selector, root) { return Array.from((root || document.body || document).querySelectorAll(selector)).map(elm => addSelectors(elm)); }
function qs(selector, root) { return selector.search(/^\/|\.\//) == -1 ? addSelectors((root || document.body || document).querySelector(selector)) : xp(selector, root)[0]; }
function waitForElem(selector, root, timeout = 15000) { if (typeof(root) == "number") { timeout = root; root = null; }; root ??= document.body || document; let observer, timeoutId = -1;
    const promise = new Promise((resolve, reject) => { let elem = qs(selector, root); if (elem) { return resolve(elem, selector, root); }; observer = new MutationObserver(() => {
    let obsElem = qs(selector, root); if (obsElem) { window.clearTimeout(timeoutId); observer.disconnect(); resolve(obsElem, selector, root); }; });
    observer.observe(root, { childList: true, subtree: true }); timeoutId = window.setTimeout(() => { observer.disconnect(); reject({ selector, root, timeout }); }, timeout); });
    if (observer) { promise.observer = observer; }; if (timeout > 0) { promise.timeoutId = timeoutId; }; promise.maxDelay = timeout; return promise; }

const observers = [];
function newObserver(func) { if (!func) { return console.error("no observer function"); }; const observer = new MutationObserver(func); observer.function = func; observer.trigger = function(){ func([], this); }; observer.watching = [];
    observer.cleanup = function(){ this.disconnect(); this.watching = this.watching.filter(wtch => wtch.target.xp("ancestor::body")[0]); this.watching.forEach(wtch => this.observe(wtch.target, wtch.options)); }; return observer; }
function watch(target, options, func) { if (typeof(target) == "string") { target = qs(target); }; if (!target) { return console.error("watch target doesn't exist:", target); };
    if (func && typeof(func) != "function") { return console.error("no valid watch function:", func); }; const obs = (func ? newObserver(func) : observer); obs.observe(target, options);
    if (obs.watching.find(watching => watching.target == target && watching. options)) { console.log("not adding twice:", { target, options }); }
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

/// < variables > ///

const observer = newObserver(mutation);
const naggers = [
    "#acf-field-group-pro-features", ".updraft-ad-container", ".wp-mail-smtp-review-notice",
    "//*[@id='updraft-dashnotice' and .//*[starts-with(text(), 'Thank you for installing')]]",
    "//*[{class=yoast-notification} and .//*{class=yoast-button-upsell}]",
];
let wlh, checkId = window.setInterval(check, 500);
let wpEdit = "/wp-admin/post.php?action=edit&post=";
let packagesToCheck;

/// < functions > ///

function mutation(mutations, observer) {
    console.log(mutations, observer); // remove this as soon as possible, it can cause memory leaking
}

function newUrl() {
    wlh = window.location.href;

    if (wlh.search(/wp-login/i) > -1) {
        waitForElem("#rememberme").then(rem => {
            if (!rem.checked) {
                console.log(rem);
                rem.click();
            }
        });
    }

    if (wlh.search(/page=wpml-package-management/i) > -1) {
        // if (packagesToCheck != null) { return; }
        // packagesToCheck = [];

        let title = qs("div#wpbody-content > h2");
        if (title && title.onclick == null) {
            title.onclick = () => {
                if (!packagesToCheck) { packagesToCheck = []; }
                if (packagesToCheck.length > 0) { return; }

                let langs = {};
                let rows = xp("//tr[contains(@class,'js_package_elementor') and td/label[contains(text(),'Page Builder Page')]]");
                for (let row of rows) {
                    let lang = xp("./td[contains(text(), 'language')]", row)[0];
                    lang = lang.textContent.trim().match(/\w+$/);
                    lang = (lang ? lang[0] : "Missing");
                    if (!langs[lang]) { langs[lang] = 0; }
                    langs[lang] += 1;
                    packagesToCheck.push(row);
                }
                if (packagesToCheck.length > 0) {
                    console.log(langs);
                    for (var i = 0; i < 5; i++) {
                        wait(checkNextPackage);
                    }
                }
            }
        }
    }

    naggers.forEach(nag_sel => waitForElem(nag_sel).then(nag_elem => nag_elem.style.display = "none"));
}

function hideLockedElements() {
    let elements = xp("//div[contains(@class, 'elementor-element-wrapper')][.//i[contains(@class,'eicon-lock')]]");
    if (elements.length == 0) { return false; }

    let containers = [];
    for (var e of elements) {
        let c = (xp("ancestor-or-self::div[contains(@class,'elementor-panel-category')][@id]", e) || [])[0];
        if (containers.indexOf(c) < 0) {
            containers.push(c);
            // console.log(c);
        }
        // console.log("removing", e);
        e.parentNode.removeChild(e);
    }
    for (var c of containers) {
        let wrappers = qsa(".elementor-element-wrapper", c);
        if (wrappers.length == 0) {
            c.parentNode.removeChild(c);
        }
    }

    return elements.length;
}

function setupPostHighlights() {
    let transLinks = qsa("a.js-wpml-translate-link:not(has-hover)[href*='&post=']");
    for (let link of transLinks) {
        link.onmouseenter = wpmlHover;
        link.onmouseleave = wpmlLeave;
        link.classList.add("has-hover");
    }
    return transLinks.length;
}

function wpmlHover(evt) {
    let link = evt.target;

    let id = link.href.match(/&post=(\d+)/i);
    if (!id || !id[1]) { return; }
    id = id[1];

    let row = qs(`//tr[.//a[contains(@class, 'row-title') and contains(@href, 'post=${id}')]]`);
    if (!row) { return; }
    row.classList.add("wpml-highlight");
}

function wpmlLeave(evt) {
    let highlighted = qsa(".wpml-highlight");
    highlighted.forEach(e => e.classList.remove("wpml-highlight"));
}

function checkNextPackage() {
    let row = packagesToCheck.shift();
    if (!row) { return; }

    let id = row.textContent.match(/Page (\d+)/i);
    if (id[1]) {
        getHttp({
            method: "HEAD",
            url: wpEdit + id[1],
            onload: handlePageCheck,
            onerror: handlePageCheck,
            tag: row,
        });
    }
}

function handlePageCheck(response) {
    // console.log("response", response);
    response.tag.classList.add(response.status == 200 ? "wpml-package-ok" : "wpml-package-bad");
    checkNextPackage();
}

function selectCommentsEnabled() {
    const rows = xp("//div[@class='comment_status' and text()!='closed']/ancestor::tr");
    console.log(rows);
    rows.forEach(row => {
        const chk = qs("th input[type='checkbox']", row);
        if (chk && !chk.checked) {
            chk.click();
        }
    });
}

/// < main code > ///

GM_registerMenuCommand("Select pages / posts with enabled comments", selectCommentsEnabled);

GM_addStyle(
`.wpml-highlight { background-color: #c552 !important; }
.wpml-package-ok { background-color: #8f82; }
.wpml-package-bad { background-color: #f882; }`);

function check() {
    if (wlh != window.location.href) { newUrl(); }

    if (wlh.search(/action=elementor/i) > -1) {
        hideLockedElements();
        return;
    }

    if (wlh.search(/edit\.php\?post_type=/i) > -1) {
        let setupCount = setupPostHighlights()
        if (setupCount > 0) {
            console.log(setupCount);
        }
        return;
    }
}
