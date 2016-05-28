export default {
  browser: {},

  parseHeaders: function (headerString) {
    const rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg;
    let match = rheaders.exec(headerString);
    const headers = {};
    while (match) {
      headers[match[1]] = match[2];
      match = rheaders.exec(headerString);
    }
    return headers;
  },

  now: function () {
    return new Date().getTime();
  },

  isArray: function (array) {
    return Object.prototype.toString.call(array) === '[object Array]';
  },

  inArray: function (elem, array) {
    if (!Array.prototype.indexOf) {
      let len = array.length;
      for (let i = 0; i < len; ++i) {
        if (array[i] === elem) {
          return i;
        }
      }
      return -1;
    }
    return array.indexOf(elem);
  },

  isBinary: function (data) {
    // True if data is an instance of Blob, ArrayBuffer or ArrayBufferView
    return /^\[object\s(?:Blob|ArrayBuffer|.+Array)\]$/.test(Object.prototype.toString.call(data));
  },

  isFunction: function (fn) {
    return Object.prototype.toString.call(fn) === '[object Function]';
  },

  getAbsoluteURL: function (url) {
    if (typeof (document.createElement) === 'undefined') {
      // assuming the url to be already absolute when DOM is not supported
      return url;
    }
    let div = document.createElement('div');

    // Uses an innerHTML property to obtain an absolute URL
    div.innerHTML = '<a href="' + url + '"/>';

    // encodeURI and decodeURI are needed to normalize URL between IE and non-IE,
    // since IE doesn't encode the href property value and return it - http://jsfiddle.net/Yq9M8/1/
    return encodeURI(decodeURI(div.firstChild.href));
  },

  prepareURL: function (url) {
    // Attaches a time stamp to prevent caching
    let ts = this.now();
    let ret = url.replace(/([?&])_=[^&]*/, `$1_=${ts}`);

    return ret + (ret === url ? (/\?/.test(url) ? '&' : '?') + '_=' + ts : '');
  },

  trim: function (str) {
    if (!String.prototype.trim) {
      return str.toString().replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, '').replace(/\s+/g, ' ');
    } else {
      return str.toString().trim();
    }
  },

  param: function (params) {
    const s = [];

    function add (key, value) {
      value = this.isFunction(value) ? value() : (value == null ? '' : value);
      s.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }

    function buildParams (prefix, obj) {
      if (this.isArray(obj)) {
        this.each(obj, function (i, v) {
          if (/\[\]$/.test(prefix)) {
            add(prefix, v);
          } else {
            buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v);
          }
        });
      } else if (Object.prototype.toString.call(obj) === '[object Object]') {
        for (let name in obj) {
          if (obj.hasOwnProperty(name)) {
            buildParams(prefix + '[' + name + ']', obj[name]);
          }
        }
      } else {
        add(prefix, obj);
      }
    }

    for (let prefix in params) {
      if (params.hasOwnProperty(prefix)) {
        buildParams(prefix, params[prefix]);
      }
    }

    return s.join('&').replace(/%20/g, '+');
  },

  storage: function () {
    try {
      return !!(window.localStorage && window.StorageEvent);
    } catch (e) {
      // Firefox throws an exception here, see
      // https://bugzilla.mozilla.org/show_bug.cgi?id=748620
      return false;
    }
  },

  iterate: function (fn, interval) {
    let timeoutId;

    // Though the interval is 0 for real-time application, there is a delay between setTimeout calls
    // For detail, see https://developer.mozilla.org/en/window.setTimeout#Minimum_delay_and_timeout_nesting
    interval = interval || 0;

    (function loop () {
      timeoutId = setTimeout(function () {
        if (fn() === false) {
          return;
        }

        loop();
      }, interval);
    })();

    return function () {
      clearTimeout(timeoutId);
    };
  },

  each: function (obj, callback, args) {
    if (!obj) return;
    let value;
    let i = 0;
    let length = obj.length;
    let isArray = this.isArray(obj);

    if (args) {
      if (isArray) {
        for (; i < length; i++) {
          value = callback.apply(obj[i], args);

          if (value === false) {
            break;
          }
        }
      } else {
        for (i in obj) {
          if (obj.hasOwnProperty(i)) {
            value = callback.apply(obj[i], args);
          }

          if (value === false) {
            break;
          }
        }
      }

      // A special, fast, case for the most common use of each
    } else {
      if (isArray) {
        for (; i < length; i++) {
          value = callback.call(obj[i], i, obj[i]);

          if (value === false) {
            break;
          }
        }
      } else {
        for (i in obj) {
          value = callback.call(obj[i], i, obj[i]);

          if (value === false) {
            break;
          }
        }
      }
    }

    return obj;
  },

  extend: function (target) {
    let i, options, name;

    for (i = 1; i < arguments.length; i++) {
      if ((options = arguments[i]) != null) {
        for (name in options) {
          if (options.hasOwnProperty(name)) {
            target[name] = options[name];
          }
        }
      }
    }

    return target;
  },
  on: function (elem, type, fn) {
    if (elem.addEventListener) {
      elem.addEventListener(type, fn, false);
    } else if (elem.attachEvent) {
      elem.attachEvent(`on${type}`, fn);
    }
  },
  off: function (elem, type, fn) {
    if (elem.removeEventListener) {
      elem.removeEventListener(type, fn, false);
    } else if (elem.detachEvent) {
      elem.detachEvent(`on${type}`, fn);
    }
  },

  log: function (level, args) {
    if (window.console) {
      let logger = window.console[level];
      if (typeof logger === 'function') {
        logger.apply(window.console, args);
      }
    }
  },

  warn: function () {
    this.log('warn', arguments);
  },

  info: function () {
    this.log('info', arguments);
  },

  debug: function () {
    this.log('debug', arguments);
  },

  error: function () {
    this.log('error', arguments);
  },
  xhr: function () {
    try {
      return new window.XMLHttpRequest();
    } catch (e1) {
      try {
        return new window.ActiveXObject('Microsoft.XMLHTTP');
      } catch (e2) {
      }
    }
  },
  parseJSON: function (data) {
    /* eslint no-new-func: 0 */
    return !data ? null : window.JSON && window.JSON.parse ? window.JSON.parse(data) : new Function(`return ${data}`)();
  },
  // http://github.com/flowersinthesand/stringifyJSON
  stringifyJSON: function (value) {
    /* eslint no-control-regex: 0 */
    const escapable = /[\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    const meta = {
      '\b': '\\b',
      '\t': '\\t',
      '\n': '\\n',
      '\f': '\\f',
      '\r': '\\r',
      '"': '\\"',
      '\\': '\\\\'
    };

    function quote (string) {
      return '"' + string.replace(escapable, function (a) {
        let c = meta[a];
        return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"';
    }

    function f (n) {
      return n < 10 ? '0' + n : n;
    }

    return window.JSON && window.JSON.stringify ? window.JSON.stringify(value) : (function str (key, holder) {
      let i;
      let v;
      let len;
      let partial;
      let value = holder[key];
      let type = typeof value;

      if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
        value = value.toJSON(key);
        type = typeof value;
      }

      switch (type) {
        case 'string':
          return quote(value);
        case 'number':
          return isFinite(value) ? String(value) : 'null';
        case 'boolean':
          return String(value);
        case 'object':
          if (!value) {
            return 'null';
          }

          switch (Object.prototype.toString.call(value)) {
            case '[object Date]':
              return isFinite(value.valueOf()) ? '"' + value.getUTCFullYear() + '-' + f(value.getUTCMonth() + 1) + '-' +
              f(value.getUTCDate()) + 'T' + f(value.getUTCHours()) + ':' + f(value.getUTCMinutes()) + ':' + f(value.getUTCSeconds()) +
              'Z' + '"' : 'null';
            case '[object Array]':
              len = value.length;
              partial = [];
              for (i = 0; i < len; i++) {
                partial.push(str(i, value) || 'null');
              }

              return '[' + partial.join(',') + ']';
            default:
              partial = [];
              for (i in value) {
                if (value.hasOwnProperty(i)) {
                  v = str(i, value);
                  if (v) {
                    partial.push(quote(i) + ':' + v);
                  }
                }
              }

              return '{' + partial.join(',') + '}';
          }
      }
    })('', {
      '': value
    });
  },

  checkCORSSupport: function () {
    if (this.browser.msie && !window.XDomainRequest && +this.browser.version.split('.')[0] < 11) {
      return true;
    } else if (this.browser.opera && +this.browser.version.split('.') < 12.0) {
      return true;
    } else if (this.trim(navigator.userAgent).slice(0, 16) === 'KreaTVWebKit/531') {
      // KreaTV 4.1 -> 4.4
      return true;
    } else if (this.trim(navigator.userAgent).slice(-7).toLowerCase() === 'kreatel') {
      // KreaTV 3.8
      return true;
    }

    // Force older Android versions to use CORS as some version like 2.2.3 fail otherwise
    let ua = navigator.userAgent.toLowerCase();
    let androidVersionMatches = ua.match(/.+android ([0-9]{1,2})/i);
    let majorVersion = parseInt((androidVersionMatches && androidVersionMatches[1]) || -1, 10);
    return !!(!isNaN(majorVersion) && majorVersion > -1 && majorVersion < 3);
  }
};
