/*
 * Browser compatibility.
 */

/*
 * Returns an object that CSS-related tags can be attached to before the DOM
 * is built. May be undefined or null if there is no such object.
 */
function _css_parent() {
    return document.head || null;
}

/*
 * Trigger called when _css_parent() is available. May defer until with_dom().
 */
function with_css_parent(callback) {
    if(_css_parent()) {
        callback();
    } else {
        with_dom(function() {
            callback();
        });
    }
}

/*
 * Appends a <style> tag for the given CSS.
 */
function add_css(css) {
    if(css) {
        var tag = style_tag(css);
        _css_parent().insertBefore(tag, _css_parent().firstChild);
    }
}

/*
 * Adds a CSS resource to the page.
 */
function link_css(filename) {
    make_css_link(filename, function(tag) {
        var parent = _css_parent();
        parent.insertBefore(tag, parent.firstChild);
    });
}

/*
 * Sends a set_pref message to the backend. Don't do this too often, as
 * some browsers incur a significant overhead for each call.
 */
var set_pref = function(key, value) {
    log_debug("Writing preference:", key, "=", value);
    _send_message("set_pref", {"pref": key, "value": value});
};

var _request_initdata = function(want) {
    _send_message("get_initdata", {"want": want});
};

var _initdata_want = null;
var _initdata_hook = null;
var setup_browser = function(want, callback) {
    _checkpoint("startup");
    _initdata_want = want;
    _initdata_hook = callback;
    _request_initdata(want);
};

function _complete_setup(initdata) {
    _checkpoint("ready");
    var store = new Store();

    if(_initdata_want.prefs) {
        if(initdata.prefs !== undefined) {
            store.setup_prefs(initdata.prefs);
        } else {
            log_error("Backend sent wrong initdata: no prefs");
            return;
        }
    }
    if(_initdata_want.customcss) {
        if(initdata.emotes !== undefined && initdata.css !== undefined) {
            store.setup_customcss(initdata.emotes, initdata.css);
        } else {
            log_error("Backend sent wrong initdata: no custom css");
            return;
        }
    }

    _initdata_hook(store);
    _initdata_want = null;
    _initdata_hook = null;
}

// Missing attributes/methods:
var _send_message = null;
var make_css_link = null;
var linkify_options = null;

switch(platform) {
case "firefox-ext":
    _send_message = function(method, data) {
        if(data === undefined) {
            data = {};
        }
        data.method = method;
        log_debug("_send_message:", data);
        self.postMessage(data);
    };

    var _data_url = function(filename) {
        // FIXME: Hardcoding this sucks. It's likely to continue working for
        // a good long while, but we should prefer make a request to the
        // backend for the prefix (not wanting to do that is the reason for
        // hardcoding it). Ideally self.data.url() would be accessible to
        // content scripts, but it's not...
        return "resource://jid1-thrhdjxskvsicw-at-jetpack/data" + filename;
    };

    make_css_link = function(filename, callback) {
        var tag = stylesheet_link(_data_url(filename));
        callback(tag);
    };

    linkify_options = function(element) {
        // Firefox doesn't permit linking to resource:// links or something
        // equivalent.
        element.addEventListener("click", catch_errors(function(event) {
            _send_message("open_options");
        }), false);
    };

    self.on("message", catch_errors(function(message) {
        switch(message.method) {
        case "initdata":
            _complete_setup(message);
            break;

        default:
            log_error("Unknown request from Firefox background script: '" + message.method + "'");
            break;
        }
    }));
    break;

case "chrome-ext":
    _send_message = function(method, data) {
        if(data === undefined) {
            data = {};
        }
        data.method = method;
        log_debug("_send_message:", data);
        chrome.runtime.sendMessage(data, _message_handler);
    };

    var _message_handler = catch_errors(function(message) {
        if(!message || !message.method) {
            log_error("Unknown request from Chrome background script: '" + message + "'");
            return;
        }

        switch(message.method) {
        case "initdata":
            _complete_setup(message);
            break;

        default:
            log_error("Unknown request from Chrome background script: '" + message.method + "'");
            break;
        }
    });

    make_css_link = function(filename, callback) {
        var tag = stylesheet_link(chrome.runtime.getURL(filename));
        callback(tag);
    };

    linkify_options = function(element) {
        element.href = chrome.runtime.getURL("/options.html");
        element.target = "_blank";
    };
    break;

case "safari-ext":
    _send_message = function(method, data) {
        if(data === undefined) {
            data = {};
        }
        data.method = method;
        log_debug("_send_message:", data);
        safari.self.tab.dispatchMessage(data.method, data);
    };

    // Safari does message handling kind of weirdly since it has a message argument built in.
    safari.self.addEventListener("message", catch_errors(function(message) {
        switch(message.message.method) {
            case "initdata":
                _complete_setup(message.message);
                break;

            default:
                log_error("Unknown request from Safari background script: '" + message.message.method + "'");
                break;
        }
    }), false);

    make_css_link = function(filename, callback) {
        var tag = stylesheet_link(safari.extension.baseURI + filename.substr(1));
        callback(tag);
    };

    linkify_options = function(element) {
        element.href = safari.extension.baseURI + 'options.html';
        element.target = "_blank";
    };
    break;
case "discord-ext":
    _send_message = function(method, data) {
        if(data === undefined) {
            data = {};
        }
        data.method = method;
        log_debug("_send_message:", data);
        var event = new CustomEvent("bpm_message");
        event.data = data;
        window.dispatchEvent(event);
    };

    var _send_discord_message = function(method, data) {
        if(data === undefined) {
            data = {};
        }
        data.method = method;
        log_debug("_send_discord_message:", data);
        var event = new CustomEvent("bpm_backend_message");
        event.data = data;
        window.dispatchEvent(event);
    };

    //This message is handled by code generated by the integration
    //It's necessary to do this so we can actually locally host the
    //CSS files we use rather than relying on an external repo
    make_css_link = function(filename, callback) {
        var event = new CustomEvent("bpm_backend_message");
        event.data = { method: "insert_css", file: filename };
        
        function invokeCallback(e) {
           if(event.data.method != "css_tag_response") return;
           window.removeEventListener("bpm_backend_message", invokeCallback);
           callback(e.data.tag);
        }

        window.addEventListener("bpm_backend_message", invokeCallback, false);
        window.dispatchEvent(event);
    };

    window.addEventListener("bpm_message", catch_errors(function(event) {
        var message = event.data;
        switch(message.method) {
        case "initdata":
            _complete_setup(message);
            break;
        
        //TODO: Ugly as sin.  Fix.
        case "get_initdata":
        case "get_prefs":
        case "get_custom_css":
        case "set_pref":
        case "force_update":
        case "initdata":
        case "prefs":
        case "custom_css":
        case "insert_emote":    
            break;

        default:
            log_error("Unknown request from background code: '" + message.method + "'");
            break;
        }
    }));
    break;

}

