// ==UserScript==
// @name         Download Integration
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       BloodyRain2k
// @connect      self
// @connect      localhost
// @connect      192.168.178.26
// @noframes
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// ==/UserScript==

// #region types //
/** @typedef QueryElement
 * @property {(selector:string) => (HTMLElement & QueryElement)}   qs
 * @property {(selector:string) => (HTMLElement & QueryElement)[]} qsa
 * @property {(selector:string) => (HTMLElement & QueryElement)[]} xp
 * 
 * @typedef {HTMLElement & QueryElement} HTMLElementExt
 */
/** GM_Response
 * @template [T=object]
 * @typedef GM_Response
 * @prop {number}  readyState
 * @prop {{[header:string]:string}} headers
 * @prop {object}  response Returns response as parameter `responseType` if defined, otherwise `string`
 * @prop {string}  responseHeaders
 * @prop {string}  responseText
 * @prop {string}  finalUrl
 * @prop {number}  status
 * @prop {string}  statusText
 * @prop {?T}      json
 * @prop {0} UNSENT
 * @prop {1} OPENED
 * @prop {2} HEADERS_RECEIVED
 * @prop {3} LOADING
 * @prop {4} DONE
 * @prop {"arraybuffer"} RESPONSE_TYPE_ARRAYBUFFER
 * @prop {"blob"}        RESPONSE_TYPE_BLOB
 * @prop {"document"}    RESPONSE_TYPE_DOCUMENT
 * @prop {"json"}        RESPONSE_TYPE_JSON
 * @prop {"stream"}      RESPONSE_TYPE_STREAM
 * @prop {"text"}        RESPONSE_TYPE_TEXT
 */
/** @typedef GM_ResponseParams
 * @prop {?Headers|{}} headers
 * @prop {?string|Blob|File|{}|[]|FormData|URLSearchParams} data Some data to send via a POST request
 * @prop {?{}} json
 * @prop {?{}|string} query
 * @prop {?string} method
 * @prop {?'follow'|'error'|'manual'} redirect Controls what to happen when a redirect is detected (build 6180+, enforces fetch mode)
 * @prop {?{}} cookie A cookie to be patched into the sent cookie set
 * @prop {?{}} cookiePartition v5.2+ object?, containing the partition key to be used for sent and received partitioned cookies
 *
 * topLevelSite `string?`, representing the top frame site for partitioned cookies
 * @prop {?boolean} binary Send the data string in binary mode
 * @prop {?boolean} nocache Don't cache the resource
 * @prop {?boolean} revalidate Revalidate maybe cached content
 * @prop {?number}  timeout A timeout in ms
 * @prop {?object}  context A property which will be added to the response object
 * @prop {?'arraybuffer'|'blob'|'json'|'stream'} responseType One of arraybuffer, blob, json or stream
 * @prop {?string}  overrideMimeType A MIME type for the request
 * @prop {?boolean} anonymous Don't send cookies with the request (enforces fetch mode)
 * @prop {?boolean} fetch Use a fetch instead of a XMLHttpRequest request (at Chrome this causes details.timeout and xhr.onprogress to not work and makes xhr.onreadystatechange receive only readyState DONE (==4) events)
 * @prop {?string}  user A user name for authentication
 * @prop {?string}  password
 */
/** @typedef DownloadButtonData
 * @prop {string}    url
 * @prop {string}    file
 * @prop {string?}   key
 * @prop {object?}   meta
 * @prop {boolean?}  is_dir
 * @prop {boolean?}  ignore_checksum
 * @prop {string[]?} exclude
 * @prop {Date?}     last_modified
 */
/** @typedef DownloadInfo
 * @prop {string}  url
 * @prop {string}  file
 * @prop {string?} key
 * @prop {object?} meta
 * @prop {number}  status
 * @prop {string}  status_at
 * @prop {string}  added_at
 * @prop {Date?}   last_modified
 * @prop {string}  checksum
 */
/** @typedef DLinfo
 * @prop {string} added_at
 * @prop {string} checksum
 * @prop {string} file
 * @prop {string} key
 * @prop {(object|object[])?} meta
 * @prop {string} last_modified
 * @prop {number} size
 * @prop {number} status
 * @prop {string} status_text
 * @prop {string} url
 */
/** @typedef UploadData
 * @prop {string}    contentUrl
 * @prop {string[]}  sources
 * @prop {?string}   source Legacy option, will be split and put into `sources` if provided instead of `sources`.
 * @prop {?'safe'|'sketchy'|'unsafe'} safety
 * @prop {?boolean}  autoRelations
 * @prop {?boolean}  mergeSources
 * @prop {?boolean}  loopVideo
 * @prop {?string}   title
 * @prop {?string}   altText
 * @prop {?object|string} description Legacy option.
 * @prop {?object|string} comment Optional field which will be attached as a comment to the uploaded post.
 * @prop {?string[]} exclude
 * @prop {?string}   checkUrl URL to run check against, in case of token URLs.
 * @prop {?string}   checkMD5 Will be checked before `checkUrl`, if provided.
 * @prop {?string|string[]} checkSimilar Will be checked after `checkUrl` if provided.
 *       `true` for `contentUrl`, `string` URL to image or `string[thumbnailURL, imageURL]`.
 */
/** @typedef UploadButtonOptions
 * @prop {?boolean} skipAutoCheck
 * @prop {?string}  buttonText
 */
/** @typedef PostResult
 * @prop {number} id
 * @prop {?string} safety
 * @prop {?string} checksumMD5
 * @prop {?number} version
 * @prop {?string[]} sources
 * @prop {?string} comments
 */
/** @typedef PostResults
 * @prop {string} query
 * @prop {number} offset
 * @prop {number} limit
 * @prop {number} total
 * @prop {PostResult[]} results
 */
/** @typedef SourcesResult
 * @prop {{[id:string]:string[]}}     by_id
 * @prop {{[source:string]:number[]}} by_source
 */
/** @typedef MD5sResult
 * @prop {{[id:string]:string}}    by_id
 * @prop {{[md5:string]:number[]}} by_md5
 */
/** @typedef {PostResults & (SourcesResult | MD5sResult)} PostsCheck */
/** @typedef {GM_Response<PostsCheck>} CheckUpResponse */
/** @typedef UploadButtonProps
 * @prop {UploadData} ulData
 * @prop {Partial<UploadButtonOptions>} options
 * @prop {(resp?:CheckUpResponse, checkSimilar?:boolean) => void} checkUL
 * Will skip requesting state if supplied with response of an already made request.
 * 
 * @typedef {HTMLButtonElement & UploadButtonProps} UploadButton */
/** @typedef MutationObserverExtProps
 * @prop {{target: HTMLElement, options: MutationObserverInit}[]} watching
 * @prop {MutationCallback} function
 * @prop {() => void} cleanup
 * @prop {(
 *    mutations: MutationRecord[],
 *    observer: MutationObserverExt,
 * ) => void} trigger
 * 
 * @typedef {MutationObserver & MutationObserverExtProps} MutationObserverExt
 */
// #endregion types //

// #region base functions //
/** @returns {HTMLElementExt} */
function addSelectors(elem) { if (!elem) return; elem.xp = (sel) => xp(sel, elem); elem.qsa = (sel) => qsa(sel, elem); elem.qs = (sel) => qs(sel, elem); return elem; };
function xp(selector, root) { let result = [], elems, sel = selector.replace(/\{([\w-_]+)=['"]?([^}]+?)['"]?\}/g, "contains(concat(' ',normalize-space(@$1),' '),' $2 ')"); try { elems = document.evaluate(sel,
    root || document.body || document, null, XPathResult.ANY_TYPE, null); } catch (ex) { console.error("xp exception:", { ex, selector, sel }); return; }; // class match: `{class=<className>}`
    while (!elems.invalidIteratorState) { let elem = elems.iterateNext(); if (elem == null) { break; } result.push(addSelectors(elem)); } return result; }
function qsa(selector, root) { return Array.from((root || document.body || document).querySelectorAll(selector)).map(elm => addSelectors(elm)); }
function qs(selector, root) { return addSelectors(selector.search(/^[\./]\//) == -1 ? (root || document.body || document).querySelector(selector) : xp(selector, root)[0]); }
/** @returns {HTMLElementExt} */
function create(tagName) { return document.createElement(tagName); }
/** @returns {Promise<(HTMLElementExt)[]>} */
function waitForElems(selector, root, timeout = 15000) { if (typeof(root) == "number") { timeout = root; root = null; }; root ??= document.body || document; let observer, timeoutId = -1;
    const selFunc = selector.search(/^(?:\/|\.\/|ancestor|descendant)/) == -1 ? qsa : xp;
    const promise = new Promise((resolve, reject) => { let elem = selFunc(selector, root); if (elem && elem.length > 0) { return resolve(elem); }; observer = new MutationObserver(() => {
    let obsElem = selFunc(selector, root); if (obsElem && obsElem.filter(e => e.isConnected).length > 0) {
        window.clearTimeout(timeoutId); observer.disconnect(); resolve(obsElem); }; });
    observer.observe(root, { childList: true, subtree: true }); timeoutId = window.setTimeout(() => {
        observer.disconnect(); reject({ selector, root, timeout }); }, timeout); });
    promise.observer = observer; if (timeout > 0) { promise.timeoutId = timeoutId; };
    promise.selector = selector; promise.root = root; promise.maxDelay = timeout;
    return promise; }


/** @type {MutationObserverExt[]} */
const observers = [];
/** @returns {MutationObserverExt} */
function newObserver(func) { if (!func) { return console.error("no observer function"); };
    const exists = observers.find(obs => obs.function == func); if (exists) { return exists; }
    /** @type {MutationObserverExt} */
    const observer = new MutationObserver(func); observer.function = func; if (func) { observers.push(observer) }
    observer.trigger = function(muts = []){ if (!Array.isArray(muts)) { muts = [muts]; }; func(muts, this); };
    observer.watching = []; observer.cleanup = function(){ this.disconnect();
        this.watching = this.watching.filter(wtch => wtch.target.isConnected /* && wtch.target.xp("ancestor::body")[0] */);
        this.watching.forEach(wtch => this.observe(wtch.target, wtch.options)); }; return observer; }
// subtree: observe child elements too // childList: changes to .children // attributes: duh // attributeFilter: [attrs] // attributeOldValue: duh // characterData: text // characterDataOldValue: duh //
/** @param {MutationObserverInit & {no_debug:?bool}} options */
function watch(target, /**@type {MutationObserverInit & {no_debug:bool}}*/options, func) {
    if (typeof(target) == "string") { target = qs(target); }; if (!target) { return console.error("no target"); };
    if (func && typeof(func) != "function") { return console.error("no watch function:", func); };
    const obs = (func ? newObserver(func) : observers[0]);
    /* obs.observe(target, options); */
    if (obs.watching.find(watching => watching.target == target && watching.options)) {
        if (!options.no_debug) { console.log("not adding twice:", { target, options }); }
    } else {
        obs.watching.push({ target, options });
        if (!options.no_debug) { console.log("watch added:", target, options, obs); }
    } obs.cleanup(); if (options.trigger) { obs.trigger(); } return obs; }

function loadObj(key, defVal) { return GM_getValue(key, defVal); }
function saveObj(key, value) { GM_setValue(key, value); }
function setDefaults(target, defaults, level = 0) { if (typeof(defaults) != typeof {} || typeof(target) == typeof(undefined)) { return target || defaults; }
    if (typeof(target) != typeof(defaults) || ("forEach" in target) != ("forEach" in defaults)) { return target; } if ("forEach" in defaults) {
    defaults.forEach(arr => { if (target.indexOf(arr) == -1) target.push(arr); }); return target; } for (var key in defaults) {
    target[key] = setDefaults(target[key], defaults[key], level + 1); } return { ...defaults, ...target }; }
function modLocalObject(key, defVal, func) { let obj = loadObj(key); if (obj == null) { obj = defVal; } else { obj = setDefaults(obj, defVal); }; if (!func) { console.warn(`modLocalObject: no function for '${key}'`);
    return obj; } let result = func(obj); if (result === true) { saveObj(key, obj); } else { console[result === false ? "warn" : "error"](`modLocalObject: '${key}' not saved`); } return obj; }

function wait(func, delay = 500) { return window.setTimeout(func, delay); }
function asyncWait(delay = 500) {
    return new Promise(resolve => {
        window.setTimeout(() => resolve(), delay);
    });
}
function toHash(s) { let h = 0; s = "" + (typeof s == "object" ? JSON.stringify(s) : s); if (s.length == 0) return h;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
    return parseInt(h.toString(2).replace('-', '1'), 2).toString(16); }
function b64ToMD5(b64) {
    if ([undefined, null].indexOf(b64) > -1) {
        throw {
            error: `No value provided.`,
        };
    }
    return Array.from(atob(b64)).map(c => c.codePointAt(0).toString(16).padStart(2,'0')).join('');
}

function getHttp(obj, async = true) { var http = new XMLHttpRequest(); http.open(obj.method || "GET", obj.url, async); for (let hName in (obj.headers || {})) { http.setRequestHeader(hName, obj.headers[hName]); }
    if (async) { http.timeout = obj.timeout || 15000; } if (obj.onload) { http.onload = () => obj.onload(http); } if (obj.onerror) { http.onerror = () => obj.onerror(http); }
    if (obj.tag) { http.tag = obj.tag; } /*console.log(obj);*/ http.send(typeof(obj.body) == "object" ? JSON.stringify(obj.body) : obj.body); return http; }

function openNewTab(url){ if (!url.startsWith("http")) { url = "https://" + url; }; let a = document.createElement("a"); a.href = url; let evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, this, 0, 0, 0, 0, 0, true, false, false, false, 0, null); document.body.appendChild(a); a.dispatchEvent(evt); document.body.removeChild(a); }

/** @param {number} seconds */
function secondsToDelta(seconds, maxUnits = 2) {
    const days = Math.floor(seconds / 86400);
    seconds -= days * 86400;
    const hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    const mins = Math.floor(seconds / 60);
    seconds = Math.floor(seconds - (mins * 60));
    let text = '', added = 0;
    if (days > 0) {
        text += `${days}d `;
        added += 1;
    }
    if (hours > 0 && added < maxUnits) {
        text += `${hours}h `;
        added += 1;
    }
    if (mins > 0 && added < maxUnits) {
        text += `${mins}m `;
        added += 1;
    }
    if (seconds > 0 && added < maxUnits) {
        text += `${seconds}s `;
        added += 1;
    }
    return text.trim();
}

/** @param {Partial<GM_ResponseParams>} params
 * @param {0|1|2|string} debugLevel 1 = console.debug / 2 = debugger / `string` = debug print text;
 * @returns {Promise<GM_Response>} */
async function GM_fetch(url, params = {}, debugLevel = 0) {
    if (!params) {
        params = {};
    }
    // return GM_xmlhttpRequest(url, params);
    if (params.query && typeof params.query == "object") {
        let query = (url.indexOf('?') > -1 ? '&' : '?') + Object.keys(params.query)
            .filter(k => params.query[k] !== undefined)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params.query[k])}`)
            .join('&');
        if (query && query != '?') {
            url += query;
        }
    }
    if (params.json) {
        if (params.data) {
            console.warn("GM_fetch: `params.data` and `params.json` provided, overwriting `data`");
        }
        params.data = JSON.stringify(params.json);
        if (!params.headers) { params.headers = {}; }
        const h_keys = Object.keys(params.headers);
        const h_ct = h_keys.find(h => h.toLowerCase() == 'content-type') || 'Content-Type';
        params.headers[h_ct] = "application/json";
    }
    if ((params.json || params.data) && !params.method) {
        params.method = "POST";
    }
    return new Promise((resolve, reject) => {
        if (debug) {
            if (debugLevel >= 1) {
                console.debug("GM_fetch:", { url, ...params });
            }
            else if (typeof debugLevel == 'string') {
                console.debug(`GM_fetch: ${debugLevel}`, { url, ...params });
            }
        }
        if (debugLevel >= 2) {
            debugger;
        }
        GM_xmlhttpRequest({
            ...params,
            url,
            /**@type {(resp:GM_Response) => void}*/
            onload: (resp) => {
                const headers = resp.responseHeaders.split(/\s*\r?\n\s*/).map(h => h.split(':', 2));
                resp.headers = {};
                for (const h of headers) {
                    const h0 = h[0].trim().toLowerCase();
                    if (!h[1]) {
                        continue;
                    }
                    if (h0 in resp.headers) {
                        console.warn('GM_fetch: discarding duplicate header:', h);
                    }
                    else {
                        resp.headers[h0] = h[1].trim();
                    }
                }
                // if (resp.responseHeaders.search(/^content-type:\s*application\//im) > -1) {
                if (resp.responseText && resp.headers['content-type'].startsWith('application/')) {
                    try {
                        resp.json = JSON.parse(resp.responseText);
                    }
                    catch (err) {
                        console.error(err);
                    }
                }
                if (debugLevel) {
                    console.debug('GM_fetch.onload:' + (typeof debugLevel == 'string' ? ` ${debugLevel}` : ''),
                                    { url, params, resp });
                }
                resolve(resp);
            },
            onerror: (resp) => reject({ url, params, resp }),
        });
    });
}

function getReactKeys(elem) {
    return {
        fiber: Object.keys(elem).filter(k => k.startsWith('__reactFiber'))?.[0],
        props: Object.keys(elem).filter(k => k.startsWith('__reactProps'))?.[0],
    };
}

/** @param {string[]} arr */
function distinct(arr) {
    return Array.from(new Set(arr));
}

function pipeUrl(url) {
    return testApi + `pipe?url=${encodeURIComponent(url)}`
}
// #endregion base functions //

const clsButtonDL = 'dl-button';
const clsButtonUL = 'ul-button';
const clsError = 'dl-error';

GM_addStyle('' //'.hidden { display:none; } .int { padding-top:6px; padding-bottom:6px; } .old { background-color:#06a4; } '
          + ` button.${clsButtonDL}, button.${clsButtonUL} { cursor:pointer; font-family:Arial; margin-right:5px; margin-block:auto; display:inline-flex; border-radius:5px; border-width:1px; margin-inline:3px; background-color:#ddd; color:#222; } `
          + ` button.${clsButtonDL}.${clsError}, button.${clsButtonUL}.${clsError} { background-color:#fa4; } `
          + ` button.${clsButtonDL}.sent,        button.${clsButtonUL}.sent        { background-color:#af4; } `
          + ` button.${clsButtonDL}.busy,        button.${clsButtonUL}.busy        { text-decoration:line-through; } `
          + ` button.${clsButtonDL}.similar,     button.${clsButtonUL}.similar     { background-color:#fe5; } `
          + ` a[href].${clsError} { color:#fa4; } `
          + ' a.sent { border:1px solid lime; } '
        //   + ' .hide-sent li[id^="verticalGridItem-"].sent { display: none; } ' // Twitter
        //   + ' .imagecontainer > a { display:inline-block; } ' // CatBox
        //   + ` [class^="imageWrapper__"] .${clsButtonDL} { position:absolute; right:0px; bottom:3px; padding-block:2px; } ` // Discord
        //   + ` [class^="oneByOneGrid"] [class^="imageWrapper__"] .${clsButtonDL} { margin-block:30%; } ` // Discord
);

// variables //

const names = {};
const server      = "https://EnermaxDebian:2443/downloads/";
const testApi     = "https://EnermaxDebian:2443/flask/";
const fastApi     = "https://EnermaxDebian:2443/fastapi/";
let   booruApi    = "https://EnermaxDebian:2443/booru/api/";
const transferApi = "https://EnermaxDebian:2443/transfer/";
const minirain    = 'https://MiniRain:2948';

// let wlh, wlp, checkID = window.setInterval(check, 500);
let debug = true, apiToken;
let apiHeaders = GM_fetch(testApi + `/static/booru.txt`).then(resp => {
    apiToken = resp.responseText.split('/n')[0];
    const headers = {
        'Accept': 'application/json',
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
    };
    console.debug('apiHeaders:', headers);
    return headers;
}).catch(ex => {
    console.error(ex);
});
let defaultLimit = 5;

// #region DLM functions //

class AsyncTaskQueue {
    /** @typedef TaskQueueEntry
     * @prop {?string} key
     * @prop {Promise} taskPromise
     * @prop {(()=>any) | (()=>Promise)} taskFn Generator function for task to run.
     * @prop {(()=>Promise)} wrapped Wrapped generator function queued to be run.
     */
    /** @typedef TaskQueueOptions
     * @prop {?boolean} priority
     * @prop {?string}  key
     */
    
    constructor(limit = 5) {
        /** @type {TaskQueueEntry[]} */
        this.queue = [];
        this.running = 0;
        this.limit = limit;
        this.keys = new Set();
        /**@type {Map<string,TaskQueueEntry>}*/
        this.taskMap = new Map();
    }

    setLimit(limit) {
        this.limit = Math.max(1, limit);
        this.next(); // In case we lowered concurrency after a batch finished
    }

    /** @param {()=>(Promise|any)} taskFn Requires to be a function.
     * @param {Partial<TaskQueueOptions>} options
     */
    add(taskFn, options = {}) {
        if (typeof taskFn != 'function') {
            throw { error: 'Supplied task is not a function', taskFn, options };
        }
        
        if (typeof options == 'boolean') {
            console.error('Legacy use of `add(taskFn, boolean)`')
            options = {
                priority: true,
            }
        }
        
        const key = options.key || null;
        if (key && this.keys.has(key)) {
            console.warn(`Duplicate task queued:`, key);
            return /**@type {TaskQueueEntry}*/(this.taskMap.get(key));
        }
        
        let resolved, rejected;
        const taskPromise = new Promise((resolve, reject) => {
            resolved = resolve;
            rejected = reject;
        });
        
        /** @type {TaskQueueEntry} */
        const entry = {
            key,
            taskFn,
            taskPromise,
            wrapped: () => {
                return Promise.resolve()
                    .then(() => taskFn())
                    .then(result => resolved(result))
                    .catch(error => {
                        console.error(error);
                        rejected(error);
                    })
                    .finally(() => {
                        this.running--;
                        if (key) {
                            this.keys.delete(key);
                            this.taskMap.delete(key);
                        }
                        this.next();
                    });
            },
        }
        
        if (key) {
            this.keys.add(key);
            this.taskMap.set(key, entry);
        }
        
        if (options.priority) {
            this.queue.unshift(entry);
            if (key) {
                console.debug(`Queued as priority:`, key);
            }
        } else {
            this.queue.push(entry);
        }
        
        this.next();
        return entry;
    }
    
    /**
     * Move a pending task (by key) to the front of the queue
     * @param {string} key
     * @returns {boolean} true if successful
     */
    priorize(key) {
        const entry = this.taskMap.get(key);
        if (!entry) {
            return false;
        }
        
        const index = this.queue.indexOf(entry);
        if (index === -1) {
            return false;
        }
        
        this.queue.splice(index, 1);
        this.queue.unshift(entry);
        return true;
    }
    
    next() {
        while (this.running < this.limit && this.queue.length > 0) {
            const entry = this.queue.shift();
            if (!entry) {
                return;
            }
            this.running++;
            entry.wrapped();
        }
    }
}
const taskQueue = new AsyncTaskQueue(document.visibilityState == 'visible' ? defaultLimit : 1);

// const mnuTwitter = GM_registerMenuCommand("Fix Twitter", async (evt) => {
//     const respUrls = await GM_fetch(server + '?twitter');
//     for (const url of respUrls.json) {
//         const resp = await fetch(url);
//         const div = document.createElement('div');
//         div.innerHTML = await resp.text();
//         console.debug(resp, div);
//         break;
//     }
// });

async function sendDownloads(downloads) {
    console.warn("[LEGACY] sending downloads:", downloads);
    for (const dl of downloads) {
        const resp = await GM_fetch(server, {
            method: "POST",
            // headers: { "Content-Type": "application/json" },
            // body: JSON.stringify({ ...dl, action: "add" }),
            json: { ...dl, action: "add", result: undefined },
            // fetch: true,
        });
        if (debug) { console.debug({ dl, resp }); }
        dl.result = resp;
    }
    return downloads;
}

/** @param {{query:string, limit?:number, offset?:number, fields?:string}} data */
async function fetchPosts(data) {
    if (!data.query) {
        throw { message: 'fetchPosts: `query` required' };
    }
    if (data.fields == undefined) {
        data.fields = 'id,safety,checksum,version,sources,comments';
    }
    const resp = await GM_fetch(booruApi + '/posts', {
        // method: 'GET',
        headers: await apiHeaders,
        query: {
            query: data.query,
            limit: data.limit,
            offset: data.offset,
            fields: data.fields,
        }
    });
    return /**@type {Promise<PostResults>}*/(resp.json);
}

/** @param {number} id
 * @param {string?} fields
 */
async function fetchPost(id, fields = null) {
    if (!id) {
        throw { message: 'fetchPosts: `id` required' };
    }
    if (!fields) {
        fields = 'id,safety,checksum,version,source,comments';
    }
    const resp = await GM_fetch(booruApi + `/post/${id}`, {
        // method: 'GET',
        headers: await apiHeaders,
        query: {
            fields,
        }
    });
    return /**@type {Promise<PostResult>}*/(resp.json);
}

/** @param {number} postID
 * @param {string|object} comment */
async function postComment(postID, comment) {
    if (typeof comment == 'object') {
        comment = JSON.stringify(comment, null, 2);
    }
    const resp = await GM_fetch(booruApi + '/comments', {
        headers: await apiHeaders,
        json: {
            postId: postID,
            text: comment,
        }
    });
    if (!resp.json) {
        throw { message: `postComment(${postID}) ERROR!`, comment, resp };
    }
    return resp.json;
}

/** @param {Partial<UploadData>} data */
async function uploadURL(data) {
    // const headers = {
    //     'Accept': 'application/json',
    //     'Authorization': `Token ${apiToken}`,
    //     'Content-Type': 'application/json',
    // };
    if (data.comment && typeof data.comment == 'object') {
        data.comment = JSON.stringify(data.comment, null, 2);
    }
    // let comment = data.comment;
    // delete data.comment;
    if (data.description && typeof data.description == 'object') {
        data.description = JSON.stringify(data.description, null, 2);
    }
    data = {
        // 'safety': 'unsafe',
        'autoRelations': true,
        'mergeSources': true,
        'loopVideo': true,
        ...data,
    };
    
    if (!data.source) {
        data.source = [];
    }
    else if (typeof data.source == 'string') {
        data.source = data.source.split('\n');
    }
    
    if (data.contentUrl && data.source.length == 0) { //.indexOf(data.contentUrl) == -1) {
        data.source.push(data.contentUrl);
    }
    
    if (Array.isArray(data.source) && data.source.length > 0) {
        data.source = data.source.join('\n');
    }
    
    let result = GM_fetch(booruApi + '/posts', { headers: await apiHeaders, json: data });
    if (data.comment) {
        result = result.then(async (resp) => {
            if (resp.json?.name == 'PostAlreadyUploadedError') {
                try {
                    const post = await fetchPost(resp.json.otherPostId);
                    console.debug('uploadURL.post:', post);
                    if (!post.comments || post.comments.length == 0) {
                        const comment = await postComment(post.id, data.comment);
                        console.debug('uploadURL.comment alreadyUploaded:', comment);
                    }
                }
                catch (ex) {
                    console.error(ex);
                }
            }
            else {
                console.debug('uploadURL:', resp);
                const comment = await postComment(resp.json.id, data.comment);
                console.debug('uploadURL.comment:', comment);
                resp.json.comments.push(comment);
            }
            return resp;
        });
    }
    return result;
}

function hasButton(elem) {
    return qs(`button.${clsButtonDL}, button.${clsButtonUL}`, elem);
}


/** @param {(DownloadButtonData|DownloadButtonData[])} data
 * @param {(btn:HTMLButtonElement, data:DownloadButtonData[]) => null|undefined} checkFunc */
function createDL(data, checkFunc) {
    if (!Array.isArray(data)) {
        data = [data];
    }
    console.debug("createDL:", data);
    const button = document.createElement("button");
    button.classList.add(clsButtonDL);
    button.textContent = "DL";
    button.title = "";
    for (const d of data) {
        if (d.url.search(/drive\.google\.com/i) > -1) {
            d.url = d.url.replace(/\/view\?.+$|\?usp=sharing/i, '');
        }
        button.title += (button.title ? '\n\n' : '') + `FILE: ${d.file}\nURL: ${d.url}`;
        if (d.key) {
            button.title += `\nKEY: ${d.key}`;
        }
        if (d.meta) {
            button.title += `\nMETA: ${JSON.stringify(d.meta, null, 2)}`;
        }
    }
    button.onclick = (evt) => {
        evt.stopPropagation();
        evt.preventDefault();
        // button.classList.add('busy');
        button.classList.remove(clsError, 'busy', 'similar');
        const resps = [];
        for (const d of data) { // TODO: confirm batch downloads work
            const idx = data.indexOf(d);
            GM_fetch(server, { method: "POST", json: { ...d, action: "add" }}).then(resp => {
                resps[idx] = resp;
                // let done = true;
                for (let i = 0; i < data.length; i++) {
                    if (resps[i] == null) {
                        // done = false;
                        // break;
                        return;
                    }
                }
                // if (!done) {
                //     return;
                // }
                if (resps.every(r => [200, 202].indexOf(r.status) > -1)) {
                    // button.classList.add('sent');
                    button.classList.add('busy');
                    return;
                }
                throw { message: `download failure`, resps };
            }).catch(err => {
                if (resps[idx] == null) {
                    resps[idx] = err;
                }
                console.error(err, resps);
                button.classList.add(clsError);
                button.classList.remove('busy');
            });
        }
        return false;
    };
    
    if (checkFunc) {
        for (const dat of data) {
            if (!dat.exclude) {
                continue;
            }
            let parts = dat.url.split(/[?&]/).filter(part =>
                dat.exclude.indexOf(part) == -1
                && !dat.exclude.some(ex => part.startsWith(ex + '='))
            );
            let trimmed = parts.shift();
            if (parts.length > 0) {
                trimmed += '?' + parts.join('&');
            }
            dat.urlTrimmed = trimmed;
        }
        button.checkFunc = checkFunc(button, data);
    }
    else {
        button.checkFunc = checkDL({ url: data.map(d => d.url), exclude: data[0].exclude }).then(exists => {
            try {
                if (exists?.status != 200) {
                    console.warn('createDL.checkDL:', button, exists);
                    return;
                }
                const json = JSON.parse(exists.responseText);
                for (const res of json) { // FIXME:
                    if (data.some(d => d.url.startsWith(res.url) || d.url == res.check_url)) {
                        if (res.status == 200 && !button.classList.contains('busy')) {
                            button.classList.add('busy', 'sent');
                        }
                        if (res.status == 202) {
                            button.classList.remove('sent');
                            button.classList.add('busy');
                        }
                        if (res.status == 404 && res.status_at) {
                            button.classList.remove('busy', 'sent');
                            button.classList.add(clsError);
                            console.error('createDL.checkDL:', button, exists);
                            return;
                        }
                    }
                }
                // if (debug) {
                    console.debug('createDL.checkDL:', button, exists);
                // }
            }
            catch (err) {
                console.error('error parsing JSON:', { err, data, exists, text: exists?.responseText });
            }
        });
    }
    return button;
}

/** @param {{url:string|string[],key:string|string[],action:"like"|"check"?}} data */
async function checkDL(data) {
    if (!data.url && (!data.key || data.key.length == 0)) {
        console.warn('checkDL: no parameters', data);
        return;
    }
    if (Array.isArray(data.key)) {
        data.key = Array.from(new Set(data.key));
    }
    if (!data.action) {
        data.action = 'check';
    }
    console.debug('checkDL:', data);
    return /**@type {Promise<GM_Response<DLinfo[]>>}*/(
        GM_fetch(server, { method: "POST", json: data })
    );
}


/** @typedef ReverseSearchResult
 * @prop {number?} exactPost
 * @prop {{distance:number,post:number}[]} similarPosts
 */
/** @param {{ params?:object, get?:boolean, skipQueue?:boolean, cache?:"skip"|"skip_empty" }} options
 * @returns {Promise<GM_Response<ReverseSearchResult>>} */
async function reverseCheck(urls, options = {}) {
    if (typeof options == 'boolean') {
        console.warn('options not updated to new format!');
        options = { get: options };
    }
    const key = (typeof urls == 'string' ? urls : urls[0]);
    const data = {
        urls: urls,
        // md5s: options.md5s,
        api: 'suzu',
        cache: options.cache,
    };
    
    return GM_fetch(transferApi + `reverse`, {
        query: {
            // url: (typeof urls == 'string' ? urls : urls[0]),
            ...(options?.params || {}),
        },
        json: { ...data },
    })
    .then((resp) => {
        if (resp.status != 200 || !resp.json) {
            console.warn('reverse:', urls, resp);
        }
        return resp;
    });
}

    /** @param {string[]|number} sources List of urls, md5s or a post id.
 * @param {?number} offset
 * @param {'sources'|'posts'|'md5s'} endpoint
 * @returns {Promise<CheckUpResponse>} */
async function checkUL(sources, offset = 0, endpoint = 'sources') {
    if (typeof sources == 'number') {
        endpoint = 'posts';
    }
    if (!offset) {
        offset = 0;
    }
    // const headers = {
    //     'Accept': 'application/json',
    //     'Authorization': `Token ${apiToken}`,
    //     'Content-Type': 'application/json',
    // };
    const resp = await GM_fetch(booruApi + '/' + endpoint, {
        // method: "GET",
        // @ts-ignore
        headers: await apiHeaders,
        json: endpoint == 'posts' ? null : {
            sources: endpoint == 'sources' ? sources : null,
            md5s:    endpoint == 'md5s'    ? sources : null,
            offset,
        },
        query: endpoint != 'posts' ? null : {
            query: `id:${sources}`,
            fields: 'id,checksumMD5,version,sources',
            offset,
        },
    }, debug ? 1 : 0)
    .then((/**@type {GM_Response<PostsCheck>}*/ resp) => {
        if (resp.json?.results && 'by_id' in resp.json.results) {
            resp.json.by_id = resp.json.results.by_id;
            resp.json.by_md5 = resp.json.results.by_md5;
            resp.json.by_source = resp.json.results.by_source;
            console.debug('post processing /sources result');
            if (resp.json.results.by_source) {
                // @ts-ignore
                resp.json.results = Object.keys(resp.json.results.by_id)
                    .map(id => ({
                        id: id,
                        sources: resp.json?.results.by_id[id],
                    }))
            }
            else if (resp.json.results.by_md5) {
                // @ts-ignore
                resp.json.results = Object.keys(resp.json.results.by_id)
                    .map(id => ({
                        id: id,
                        checksumMD5: resp.json?.results.by_id[id],
                    }))
            }
        }
        return /**@type {GM_Response<PostsCheck>}*/(resp);
    })
    if (resp.json?.results) {
        // resp.json.results.forEach(res => {
        //     if (res.source && typeof(res.source) == 'string') {
        //         res.source = res.source.split('\n').filter(src => src);
        //     }
        // });
        if (resp.json.total > resp.json.results.length && offset == 0) {
            let count = 0;
            while (resp.json.results.length < resp.json.total) {
                if (count > 10) { break; }
                const resp_cont = await checkUL(sources, resp.json.results.length, endpoint);
                if (!resp_cont.json?.results) {
                    console.error('checkUL: could not fetch remaining results for:', { sources, resp, resp_cont });
                    break;
                }
                for (const res of resp_cont.json.results) {
                    if (resp.json.results.indexOf(res) > -1) {
                        continue;
                    }
                    resp.json.results.push(res);
                }
                count += 1;
            }
        }
    }
    return resp;
}


/** Override this fuction to alter behavior of automatic button checks after creation.
 * @param {UploadButton} button
 * @param {?CheckUpResponse} resp */
function checkButtonUL(button, resp = null) {
    if (button?.nodeName != 'BUTTON') {
        throw { error: 'context is not a Button', button, resp };
    }
    
    const data = button.ulData;
    if (!data) { //} || data.length == 0) {
        throw { error: 'no button data found', button, resp };
    }
    if (data['length']) {
        throw { error: 'legacy use of UploadData[]', button };
    }
    
    button.classList.remove(clsError, 'similar', 'sent');
    button.classList.add('busy');
    
    if (!resp) {
        return async() => {
            const checkUrl = data.checkUrl || data.contentUrl;
            resp = await GM_fetch(testApi + `cache`, {json: {
                md5: data.checkMD5,
                url: checkUrl,
                similar: data.checkSimilar,
            }})
            if (defaultLimit < 0) {
                const freeReqs = parseInt(resp.headers['free-requests'] || '-1');
                if (freeReqs > 0) {
                    const oldLimit = taskQueue.limit;
                    taskQueue.setLimit(Math.floor(freeReqs * 1.5));
                    if (taskQueue.limit != oldLimit) {
                        console.debug(`auto limit: ${taskQueue.limit}`);
                    }
                }
            }
            button.classList.remove('busy');
            if (resp.status == 200 && resp.json) {
                if ((data.checkMD5 && resp.json.matched_md5 == data.checkMD5)
                ||  (resp.json.matched_url == checkUrl)) {
                    button.classList.add('sent');
                }
                // else if (data.checkSimilar && Object.keys(resp.json).some(k => data.checkSimilar?.indexOf(k) > -1)) {
                else if (data.checkSimilar && resp.json.most_similar) {
                    button.classList.add('similar');
                    const simRes = resp.json.most_similar;
                    // const simRes = resp.json[data.contentUrl];
                    if (simRes?.text) {
                        button.title += '\n\n' + simRes.text.join('\n');
                    }
                    if (simRes?.query) {
                        const a = document.createElement('a');
                        button.after(a);
                        a.href = booruApi + '../' + simRes.query;
                        a.append(button);
                    }
                    // button.title = resp.json[data.contentUrl].text.join('\n') + '\n\n' + button.title;
                }
            }
            else if (resp.status != 404) {
                console.error('error with cache response:', button, resp);
                button.classList.add(clsError);
            }
            // checkUL(data.map(d => d.checkUrl || d.contentUrl)).then(exists => {
            //     checkButtonUL(button, exists);
            // });
            const sent = button.classList.contains('sent');
            return sent;
        }
    }
    
    try {
        if (resp.status != 200) {
            console.warn('checkButtonUp:', button, resp);
            throw {
                error: `checkButtonUL failed, resp.status = ${resp.status}`,
                resp
            };
        }
        // const json = JSON.parse(resp.responseText);
        for (const id in resp.json?.by_id) {
            // debugger;
            const sources = resp.json?.by_id[id];
            if (data.some(d => (typeof sources == 'string' ? d.checkMD5 == sources : sources.some(src => {
                const url = (d.checkUrl || d.contentUrl);
                return src.startsWith(url) || src.endsWith(url) || url.startsWith(src) || url.endsWith(src);
            })))) {
                button.classList.add('busy', 'sent');
                break;
            }
        }
        if (debug) {
            console.debug('checkButtonUp:', button, resp);
        }
    }
    catch (err) {
        console.error('error parsing JSON:', { err, data, resp, text: resp.responseText });
    }
    finally {
        const sent = button.classList.contains('sent');
        if (!sent) {
            button.classList.remove('busy');
        }
        return sent;
    }
}


/** Override this function to alter behavior of button clicked. */
function onClickUL(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    this.classList.remove(clsError, 'similar');
    this.classList.add('busy');
    /** @type {UploadData} */
    const d = this.ulData;
        uploadURL(d).then(async(resp) => {
            if (resp.status != 200 && resp.json?.name == 'PostAlreadyUploadedError') {
                const updated = await updateSources(resp.json.otherPostId, d.sources);
                if (updated) {
                    resp.status = 200;
                    this.classList.add('sent');
                    return;
                }
            }
            
            if (resp.status == 200) {
                this.classList.add('sent');
                GM_fetch(testApi + `cache`, {
                    method: 'DELETE',
                    json: {
                        md5: d.checkMD5,
                        url: d.contentUrl,
                        similar: d.checkSimilar,
                    },
                }, `dropping cache for "${d.contentUrl}"`);
                // this.classList.add('busy');
                return;
            }
            
            throw { message: `upload failure`, resp /* resps */ };
        }).catch(err => {
            console.error(err); //, resps);
            this.classList.add(clsError);
            this.classList.remove('busy');
        });
    return false;
}


/** @param {UploadData & { checkSimilar:?true|string|string[] }} data
 * @param {Partial<UploadButtonOptions>} options
 * @returns {UploadButton} */
function createUL(data, options = {}) {
    // if (!Array.isArray(data)) {
    //     data = [data];
    // }
    if (debug) {
        console.debug("createUL:", data);
    }
    /** @type {UploadButton} */
    // @ts-ignore
    const button = document.createElement("button");
    button.ulData = data;
    button.options = options;
    button.classList.add(clsButtonUL);
    button.textContent = options?.buttonText || "UL";
    button.title = "";
    
    if (data.contentUrl.search(/drive\.google\.com/i) > -1) {
        data.contentUrl = data.contentUrl.replace(/\/view\?.+$|\?usp=sharing/i, '');
    }
    
    if (data.title) {
        button.title += (button.title ? '\n' : '') + `TITLE: ${data.title}`;
    }
    
    button.title += (button.title ? '\n' : '') + `CONTENT: ${data.contentUrl}`;
    if (data.source && !data.sources) {
        console.error('legacy use of deprecated `data.source`!');
        if (typeof data.source == 'string') {
            data.sources = data.source.split('\n').map(s => s.trim());
        }
        else {
            data.sources = data.source;
        }
    }
    data.sources = Array.from(new Set(data.sources));
    for (const src of data.sources) {
        button.title += `\nSOURCE: ${src}`;
    }
    if (data.description) {
        button.title += `\nDESC: ${JSON.stringify(data.description, null, 2)}`;
    }
    
    if (data.checkSimilar === true) {
        data.checkSimilar = [data.contentUrl];
    }
    else if (typeof data.checkSimilar == 'string') {
        data.checkSimilar = [data.checkSimilar];
    }
    
    button.onclick = onClickUL;
    button.checkUL = (resp) => checkButtonUL(button, resp);
    
    if (typeof options == 'function') {
        console.warn('createUL: `checkFunc` is deprecated!');
    }
    else if (typeof options == 'boolean') {
        console.warn('createUL: `skipAutoCheck` is deprecated!');
    }
    else {
        if (options?.skipAutoCheck !== false) {
            // button.checkUL();
            taskQueue.add(checkButtonUL(button), {
                key: toHash([
                    data.contentUrl, data.checkUrl, data.checkSimilar, data.checkMD5
                ]),
            });
        }
    }
    
    return button;
}


/** @typedef BatchCheckUL
 * @prop {}
 */
/** @param {UploadButton[]} buttons */
async function batchCheckUL(buttons, splitSize) {
    /**@type {{[url:string]: UploadButton[]}}*/
    const md5s = {};
    /**@type {{[url:string]: UploadButton}}*/
    const sources = {};
    for (const btn of buttons) {
        btn.classList.add('busy');
        // for (const data of btn.ulData) {
            if (btn.ulData.checkMD5) {
                if (!(btn.ulData.checkMD5 in md5s)) {
                    md5s[btn.ulData.checkMD5] = [];
                }
                const md5Btns = md5s[btn.ulData.checkMD5];
                if (md5Btns.indexOf(btn) > -1) {
                    console.warn('batchCheckUL: button already in md5s:', btn, btn.ulData.checkMD5, md5s);
                }
                else {
                    md5Btns.push(btn);
                }
            }
            
            const url = btn.ulData.checkUrl || btn.ulData.contentUrl;
            // if (sources.indexOf(url) > -1) {
            if (url in sources) {
                console.warn('batchCheckUL: url already in sources:', url);
            }
            else {
                // sources.push(url);
                sources[url] = btn;
            }
        // }
    }
    
    const checked = [];
    const md5List = Object.keys(md5s);
    if (md5List.length > 0) {
        if (debug) {
            console.debug('md5s:', md5s);
        }
        if (splitSize > 0) {
            const splits = Math.ceil(md5List.length / Math.round(md5List.length / splitSize));
            for (let i = 0; i <= md5List.length / splits; i++) {
                const batch = md5List.slice(i * splits, (i + 1) * splits);
                // debugger;
                const resp = await checkUL(batch, null, 'md5s');
                if (resp.json?.results.length == 0 || !resp.json?.by_md5) {
                    continue;
                }
                for (const btns of batch.filter(u => u in resp.json?.by_md5).map(u => md5s[u])) {
                    for (const btn of btns) {
                        if (checked.indexOf(btn) > -1) {
                            continue;
                        }
                        checked.push(btn);
                        btn.checkUL(resp);
                    }
                }
                // debugger;
            }
        }
        else {
            debugger;
            const resp = await checkUL(md5List, null, 'md5s');
            for (const btn of buttons) {
                // btn.classList.remove('busy');
                btn.checkUL(resp);
            }
        }
    }
    
    const urls = Object.keys(sources).filter(u => checked.indexOf(sources[u]) == -1);
    if (splitSize > 0) {
        const splits = Math.ceil(urls.length / Math.round(urls.length / splitSize));
        // const checked = [];
        for (let i = 0; i <= urls.length / splits; i++) {
            const batch = urls.slice(i * splits, (i + 1) * splits);
            const resp = await checkUL(batch);
            for (const btn of batch.map(u => sources[u])) {
                if (checked.indexOf(btn) > -1) {
                    continue;
                }
                checked.push(btn);
                btn.checkUL(resp);
            }
            // debugger;
        }
    }
    else {
        checkUL(urls).then(resp => {
            for (const btn of buttons) {
                // btn.classList.remove('busy');
                btn.checkUL(resp);
            }
        });
    }
}


/** @param {string|string[]} newSources */
async function updateSources(postID, newSources) {
    if (!postID) {
        return false;
    }
    if (typeof newSources == 'string') {
        newSources = newSources.split('\n');
    }
    const resp = await checkUL(postID);
    const post = resp.json?.results.find(r => r.id == postID);
    if (!post) {
        throw { error: `could not fetch post ${postID}:`, post };
    }
    const sources = post.sources || [];
    let added = 0;
    for (const src of newSources) {
        if (sources.indexOf(src) > -1) {
            continue;
        }
        sources.push(src);
        added += 1;
    }
    if (added == 0) {
        console.warn(`no new sources for post ${postID}:`, { newSources, sources });
        return true;
    }
    // const headers = {
    //     'Accept': 'application/json',
    //     'Authorization': `Token ${apiToken}`,
    //     'Content-Type': 'application/json',
    // };
    // debugger;
    const update = await GM_fetch(booruApi + `/post/${postID}`, {
        method: "PUT",
        headers: await apiHeaders,
        query: {
            source: sources.join('\n'),
            version: post.version,
        },
    }, 1)
    if (update.status == 200) {
        return true;
    }
    else {
        throw { message: 'updateSources error', update };
    }
}

async function checkName(/**@type {string}*/ name) {
    if (!name) {
        return;
    }
    name = sanitize(name.replace(/^r\//i, ''), true);
    const orig = name;
    name = name.toLowerCase();
    let n = names[name];
    if (!n) {
        const resp = await GM_fetch(server + `?name=${orig}`);
        // try {
            const json = JSON.parse(resp.responseText);
            n = json?.names?.[name] || orig; // TODO: find a better way to cache
            if (n) {
                names[name] = n;
            }
            else {
                n = orig;
            }
        // }
        // catch (err) {
        //     console.error(err);
        // }
    }
    return n;
}

function setName(name, value) {
    if (!name || !value) {
        return;
    }
    name = sanitize(name.replace(/^r\//i, ''), true).toLowerCase();
    names[name] = value;
    console.debug(`stored "${value}" as "${name}"`);
}

function sanitize(str, replaceDot = false, replaceChars = "", maxLen = 64) {
    str = str.replace(/[:;"*<>!?|\\/]|[^\x00-\x7F]/g, ' ');
    if (replaceDot) {
        str = str.replace('.', '-');
    }
    if (replaceChars) {
        for (const c of replaceChars) {
            str = str.replace(c, ' ');
        }
    }
    str = str.replace(/\s+/g, ' ');
    if (str.length > maxLen) {
        str = str.slice(0, maxLen);
        debugger;
    }
    return str.trim();
}

function sanitizeLink(url) {
    url = url.replace(/([?&])usp=share_link/ig, '$1')
        .replace(/&amp;/ig, '&')
        .replace(/[?&]dl=0/ig, '')
        .replace(/[?&]$/, '');
    if (url.search(/dropbox\.com\/scl\//ig) > -1) {
        url += (url.indexOf('?') > -1 ? '&' : '?') + 'dl=1';
    }
    return url;
}

function trimTitle(title, length = 50) {
    return sanitize(title, true).slice(0, length);
}

function validLink(url) {
    // if (url.search(/(?:mega(?:\.co)?\.nz\/file|drive\.google\.com|dropbox\.com|cdn\.discordapp\.com\/attachments)\//i) > -1) {
    if (url.search(/mega(?:\.co)?\.nz\/(?:file|folder|#)|(?:drive\.google|dropbox|mediafire)\.com\//i) > -1) {
        return 1;
    }
    if (url.search(/waterring\.tw/i) > -1) {
        return 2;
    }
    return 0;
}

async function resolve(url) {
    const resp = await GM_fetch(server, { method: "POST", json: { action: "resolve", url }});
    if (!resp.json) {
        throw { error: `error resolving URL "${url}":`, resp };
    }
    return /**@type {{url:string, resolved:string, status:number}}*/(resp.json);
}




// #endregion DLM functions //
