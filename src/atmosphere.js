/*
 * Copyright 2015 Async-IO.org
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Atmosphere.js
 * https://github.com/Atmosphere/atmosphere-javascript
 *
 * API reference
 * https://github.com/Atmosphere/atmosphere/wiki/jQuery.atmosphere.js-API
 *
 * Highly inspired by
 * - Portal by Donghwan Kim http://flowersinthesand.github.io/portal/
 */
import util from './util';

let offline = false;
let requests = [];
let callbacks = [];
let uuid = 0;
const Atmosphere = {
  version: '2.3.3-javascript',
  onError: function (response) {
  },
  onClose: function (response) {
  },
  onOpen: function (response) {
  },
  onReopen: function (response) {
  },
  onMessage: function (response) {
  },
  onReconnect: function (request, response) {
  },
  onMessagePublished: function (response) {
  },
  onTransportFailure: function (errorMessage, _request) {
  },
  onLocalMessage: function (response) {
  },
  onFailureToReconnect: function (request, response) {
  },
  onClientTimeout: function (request) {
  },
  onOpenAfterResume: function (request) {
  },

  /**
   * Creates an object based on an atmosphere subscription that exposes functions defined by the Websocket interface.
   *
   * @class WebsocketApiAdapter
   * @param {Object} request the request object to build the underlying subscription
   * @constructor
   */
  WebsocketApiAdapter: function (request) {
    let _socket, _adapter;

    /**
     * Overrides the onMessage callback in given request.
     *
     * @method onMessage
     * @param {Object} e the event object
     */
    request.onMessage = function (e) {
      _adapter.onmessage({data: e.responseBody});
    };

    /**
     * Overrides the onMessagePublished callback in given request.
     *
     * @method onMessagePublished
     * @param {Object} e the event object
     */
    request.onMessagePublished = function (e) {
      _adapter.onmessage({data: e.responseBody});
    };

    /**
     * Overrides the onOpen callback in given request to proxy the event to the adapter.
     *
     * @method onOpen
     * @param {Object} e the event object
     */
    request.onOpen = function (e) {
      _adapter.onopen(e);
    };

    _adapter = {
      close: function () {
        _socket.close();
      },

      send: function (data) {
        _socket.push(data);
      },

      onmessage: function (e) {
      },

      onopen: function (e) {
      },

      onclose: function (e) {
      },

      onerror: function (e) {

      }
    };
    /* eslint new-cap: 0 */
    _socket = new Atmosphere.subscribe(request);

    return _adapter;
  },

  AtmosphereRequest: function (options) {
    /**
     * {Object} Request parameters.
     *
     * @private
     */
    let _request = {
      timeout: 300000,
      method: 'GET',
      headers: {},
      contentType: '',
      callback: null,
      url: '',
      data: '',
      suspend: true,
      maxRequest: -1,
      reconnect: true,
      maxStreamingLength: 10000000,
      lastIndex: 0,
      logLevel: 'info',
      requestCount: 0,
      fallbackMethod: 'GET',
      fallbackTransport: 'streaming',
      transport: 'long-polling',
      webSocketImpl: null,
      webSocketBinaryType: null,
      dispatchUrl: null,
      webSocketPathDelimiter: '@@',
      enableXDR: false,
      rewriteURL: false,
      attachHeadersAsQueryString: true,
      executeCallbackBeforeReconnect: false,
      readyState: 0,
      withCredentials: false,
      trackMessageLength: false,
      messageDelimiter: '|',
      connectTimeout: -1,
      reconnectInterval: 0,
      dropHeaders: true,
      uuid: 0,
      async: true,
      shared: false,
      readResponsesHeaders: false,
      maxReconnectOnClose: 5,
      enableProtocol: true,
      disableDisconnect: false,
      pollingInterval: 0,
      heartbeat: {
        client: null,
        server: null
      },
      ackInterval: 0,
      closeAsync: false,
      reconnectOnServerError: true,
      handleOnlineOffline: true,
      onError: function (response) {
      },
      onClose: function (response) {
      },
      onOpen: function (response) {
      },
      onMessage: function (response) {
      },
      onReopen: function (request, response) {
      },
      onReconnect: function (request, response) {
      },
      onMessagePublished: function (response) {
      },
      onTransportFailure: function (reason, request) {
      },
      onLocalMessage: function (request) {
      },
      onFailureToReconnect: function (request, response) {
      },
      onClientTimeout: function (request) {
      },
      onOpenAfterResume: function (request) {
      }
    };

    /**
     * {Object} Request's last response.
     *
     * @private
     */
    let _response = {
      status: 200,
      reasonPhrase: 'OK',
      responseBody: '',
      messages: [],
      headers: [],
      state: 'messageReceived',
      transport: 'polling',
      error: null,
      request: null,
      partialMessage: '',
      errorHandled: false,
      closedByClientTimeout: false,
      ffTryingReconnect: false
    };

    /**
     * {websocket} Opened web socket.
     *
     * @private
     */
    let _websocket = null;

    /**
     * {SSE} Opened SSE.
     *
     * @private
     */
    let _sse = null;

    /**
     * {XMLHttpRequest, ActiveXObject} Opened ajax request (in case of http-streaming or long-polling)
     *
     * @private
     */
    let _activeRequest = null;

    /**
     * {Object} Object use for streaming with IE.
     *
     * @private
     */
    let _ieStream = null;

    /**
     * {Object} Object use for jsonp transport.
     *
     * @private
     */
    let _jqxhr = null;

    /**
     * {boolean} If request has been subscribed or not.
     *
     * @private
     */
    let _subscribed = true;

    /**
     * {number} Number of test reconnection.
     *
     * @private
     */
    let _requestCount = 0;

    /**
     * The Heartbeat interval send by the server.
     * @type {int}
     * @private
     */
    let _heartbeatInterval = 0;

    /**
     * The Heartbeat bytes send by the server.
     * @type {string}
     * @private
     */
    let _heartbeatPadding = 'X';

    /**
     * {boolean} If request is currently aborted.
     *
     * @private
     */
    let _abortingConnection = false;

    /**
     * A local "channel' of communication.
     *
     * @private
     */
    let _localSocketF = null;

    /**
     * The storage used.
     *
     * @private
     */
    let _storageService;

    /**
     * Local communication
     *
     * @private
     */
    let _localStorageService = null;

    /**
     * A Unique ID
     *
     * @private
     */
    let guid = util.now();

    /** Trace time */
    let _traceTimer;

    /** Key for connection sharing */
    let _sharingKey;

    // Automatic call to subscribe
    _subscribe(options);

    /**
     * Initialize atmosphere request object.
     *
     * @private
     */
    function _init () {
      _subscribed = true;
      _abortingConnection = false;
      _requestCount = 0;

      _websocket = null;
      _sse = null;
      _activeRequest = null;
      _ieStream = null;
    }

    /**
     * Re-initialize atmosphere object.
     *
     * @private
     */
    function _reinit () {
      _clearState();
      _init();
    }

    /**
     * Returns true if the given level is equal or above the configured log level.
     *
     * @private
     */
    function _canLog (level) {
      if (level === 'debug') {
        return _request.logLevel === 'debug';
      } else if (level === 'info') {
        return _request.logLevel === 'info' || _request.logLevel === 'debug';
      } else if (level === 'warn') {
        return _request.logLevel === 'warn' || _request.logLevel === 'info' || _request.logLevel === 'debug';
      } else if (level === 'error') {
        return _request.logLevel === 'error' || _request.logLevel === 'warn' || _request.logLevel === 'info' || _request.logLevel === 'debug';
      } else {
        return false;
      }
    }

    function _debug (msg) {
      if (_canLog('debug')) {
        util.debug(new Date() + ' Atmosphere: ' + msg);
      }
    }

    /**
     *
     * @private
     */
    function _verifyStreamingLength (ajaxRequest, rq) {
      // Wait to be sure we have the full message before closing.
      if (_response.partialMessage === '' && (rq.transport === 'streaming') && (ajaxRequest.responseText.length > rq.maxStreamingLength)) {
        return true;
      }
      return false;
    }

    /**
     * Disconnect
     *
     * @private
     */
    function _disconnect () {
      if (_request.enableProtocol && !_request.disableDisconnect && !_request.firstMessage) {
        let query = 'X-Atmosphere-Transport=close&X-Atmosphere-tracking-id=' + _request.uuid;

        util.each(_request.headers, function (name, value) {
          let h = util.isFunction(value) ? value.call(this, _request, _request, _response) : value;
          if (h != null) {
            query += '&' + encodeURIComponent(name) + '=' + encodeURIComponent(h);
          }
        });

        let url = _request.url.replace(/([?&])_=[^&]*/, query);
        url = url + (url === _request.url ? (/\?/.test(_request.url) ? '&' : '?') + query : '');

        let rq = {
          connected: false
        };
        let closeR = new Atmosphere.AtmosphereRequest(rq);
        closeR.connectTimeout = _request.connectTimeout;
        closeR.attachHeadersAsQueryString = false;
        closeR.dropHeaders = true;
        closeR.url = url;
        closeR.contentType = 'text/plain';
        closeR.transport = 'polling';
        closeR.method = 'GET';
        closeR.data = '';
        closeR.heartbeat = null;
        if (_request.enableXDR) {
          closeR.enableXDR = _request.enableXDR
        }
        closeR.async = _request.closeAsync;
        _pushOnClose('', closeR);
      }
    }

    /**
     * Close request.
     *
     * @private
     */
    function _close () {
      _debug('Closing (AtmosphereRequest._close() called)');

      _abortingConnection = true;
      if (_request.reconnectId) {
        clearTimeout(_request.reconnectId);
        delete _request.reconnectId;
      }

      if (_request.heartbeatTimer) {
        clearTimeout(_request.heartbeatTimer);
      }

      _request.reconnect = false;
      _response.request = _request;
      _response.state = 'unsubscribe';
      _response.responseBody = '';
      _response.status = 408;
      _response.partialMessage = '';
      _invokeCallback();
      _disconnect();
      _clearState();
    }

    function _clearState () {
      _response.partialMessage = '';
      if (_request.id) {
        clearTimeout(_request.id);
      }

      if (_request.heartbeatTimer) {
        clearTimeout(_request.heartbeatTimer);
      }

      // https://github.com/Atmosphere/atmosphere/issues/1860#issuecomment-74707226
      if (_request.reconnectId) {
        clearTimeout(_request.reconnectId);
        delete _request.reconnectId;
      }

      if (_ieStream != null) {
        _ieStream.close();
        _ieStream = null;
      }
      if (_jqxhr != null) {
        _jqxhr.abort();
        _jqxhr = null;
      }
      if (_activeRequest != null) {
        _activeRequest.abort();
        _activeRequest = null;
      }
      if (_websocket != null) {
        if (_websocket.canSendMessage) {
          _debug('invoking .close() on WebSocket object');
          _websocket.close();
        }
        _websocket = null;
      }
      if (_sse != null) {
        _sse.close();
        _sse = null;
      }
      _clearStorage();
    }

    function _clearStorage () {
      // Stop sharing a connection
      if (_storageService != null) {
        // Clears trace timer
        clearInterval(_traceTimer);
        // Removes the trace
        document.cookie = _sharingKey + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        // The heir is the parent unless unloading
        _storageService.signal('close', {
          reason: '',
          heir: !_abortingConnection ? guid : (_storageService.get('children') || [])[0]
        });
        _storageService.close();
      }
      if (_localStorageService != null) {
        _localStorageService.close();
      }
    }

    /**
     * Subscribe request using request transport. <br>
     * If request is currently opened, this one will be closed.
     *
     * @param {Object} options Request parameters.
     * @private
     */
    function _subscribe (options) {
      _reinit();

      _request = util.extend(_request, options);
      // Allow at least 1 request
      _request.mrequest = _request.reconnect;
      if (!_request.reconnect) {
        _request.reconnect = true;
      }
    }

    /**
     * Check if web socket is supported (check for custom implementation provided by request object or browser implementation).
     *
     * @returns {boolean} True if web socket is supported, false otherwise.
     * @private
     */
    function _supportWebsocket () {
      return _request.webSocketImpl != null || window.WebSocket || window.MozWebSocket;
    }

    /**
     * Check if server side events (SSE) is supported (check for custom implementation provided by request object or browser implementation).
     *
     * @returns {boolean} True if web socket is supported, false otherwise.
     * @private
     */
    function _supportSSE () {
      // Origin parts
      let url = util.getAbsoluteURL(_request.url.toLowerCase());
      let parts = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/.exec(url);
      let crossOrigin = !!(parts && (
        // protocol
        parts[1] !== window.location.protocol ||
        // hostname
        parts[2] !== window.location.hostname ||
        // port
        (parts[3] || (parts[1] === 'http:' ? 80 : 443)) !== (window.location.port || (window.location.protocol === 'http:' ? 80 : 443))
      ));
      return window.EventSource && (!crossOrigin || !util.browser.safari || util.browser.vmajor >= 7);
    }

    /**
     * Open request using request transport. <br>
     * If request transport is 'websocket' but websocket can't be opened, request will automatically reconnect using fallback transport.
     *
     * @private
     */
    function _execute () {
      // Shared across multiple tabs/windows.
      if (_request.shared) {
        _localStorageService = _local(_request);
        if (_localStorageService != null) {
          if (_canLog('debug')) {
            util.debug('Storage service available. All communication will be local');
          }

          if (_localStorageService.open(_request)) {
            // Local connection.
            return;
          }
        }

        if (_canLog('debug')) {
          util.debug('No Storage service available.');
        }
        // Wasn't local or an error occurred
        _localStorageService = null;
      }

      // Protocol
      _request.firstMessage = uuid === 0;
      _request.isOpen = false;
      _request.ctime = util.now();

      // We carry any UUID set by the user or from a previous connection.
      if (_request.uuid === 0) {
        _request.uuid = uuid;
      }
      _response.closedByClientTimeout = false;

      if (_request.transport !== 'websocket' && _request.transport !== 'sse') {
        _executeRequest(_request);
      } else if (_request.transport === 'websocket') {
        if (!_supportWebsocket()) {
          _reconnectWithFallbackTransport('Websocket is not supported, using request.fallbackTransport (' + _request.fallbackTransport +
            ')');
        } else {
          _executeWebSocket(false);
        }
      } else if (_request.transport === 'sse') {
        if (!_supportSSE()) {
          _reconnectWithFallbackTransport('Server Side Events(SSE) is not supported, using request.fallbackTransport (' +
            _request.fallbackTransport + ')');
        } else {
          _executeSSE(false);
        }
      }
    }

    function _local (request) {
      let connectors;
      let trace;
      let connector;
      let orphan;
      let name = 'atmosphere-' + request.url;
      connectors = {
        storage: function () {
          function onstorage (event) {
            if (event.key === name && event.newValue) {
              listener(event.newValue);
            }
          }

          if (!util.storage) {
            return;
          }

          let storage = window.localStorage;
          let get = function (key) {
            return util.parseJSON(storage.getItem(name + '-' + key));
          };
          let set = function (key, value) {
            storage.setItem(name + '-' + key, util.stringifyJSON(value));
          };

          return {
            init: function () {
              set('children', get('children').concat([guid]));
              util.on(window, 'storage', onstorage);
              return get('opened');
            },
            signal: function (type, data) {
              storage.setItem(name, util.stringifyJSON({
                target: 'p',
                type: type,
                data: data
              }));
            },
            close: function () {
              let children = get('children');

              util.off(window, 'storage', onstorage);
              if (children) {
                if (removeFromArray(children, request.id)) {
                  set('children', children);
                }
              }
            }
          };
        },
        windowref: function () {
          let win = window.open('', name.replace(/\W/g, ''));

          if (!win || win.closed || !win.callbacks) {
            return;
          }

          return {
            init: function () {
              win.callbacks.push(listener);
              win.children.push(guid);
              return win.opened;
            },
            signal: function (type, data) {
              if (!win.closed && win.fire) {
                win.fire(util.stringifyJSON({
                  target: 'p',
                  type: type,
                  data: data
                }));
              }
            },
            close: function () {
              // Removes traces only if the parent is alive
              if (!orphan) {
                removeFromArray(win.callbacks, listener);
                removeFromArray(win.children, guid);
              }
            }

          };
        }
      };

      function removeFromArray (array, val) {
        let i;
        let length = array.length;

        for (i = 0; i < length; i++) {
          if (array[i] === val) {
            array.splice(i, 1);
          }
        }

        return length !== array.length;
      }

      // Receives open, close and message command from the parent
      function listener (string) {
        let command = util.parseJSON(string)
        let data = command.data;

        if (command.target === 'c') {
          switch (command.type) {
            case 'open':
              _open('opening', 'local', _request);
              break;
            case 'close':
              if (!orphan) {
                orphan = true;
                if (data.reason === 'aborted') {
                  _close();
                } else {
                  // Gives the heir some time to reconnect
                  if (data.heir === guid) {
                    _execute();
                  } else {
                    setTimeout(function () {
                      _execute();
                    }, 100);
                  }
                }
              }
              break;
            case 'message':
              _prepareCallback(data, 'messageReceived', 200, request.transport);
              break;
            case 'localMessage':
              _localMessage(data);
              break;
          }
        }
      }

      function findTrace () {
        let matcher = new RegExp('(?:^|; )(' + encodeURIComponent(name) + ')=([^;]*)').exec(document.cookie);
        if (matcher) {
          return util.parseJSON(decodeURIComponent(matcher[2]));
        }
      }

      // Finds and validates the parent socket's trace from the cookie
      trace = findTrace();
      if (!trace || util.now() - trace.ts > 1000) {
        return;
      }

      // Chooses a connector
      connector = connectors.storage() || connectors.windowref();
      if (!connector) {
        return;
      }

      return {
        open: function () {
          let parentOpened;

          // Checks the shared one is alive
          _traceTimer = setInterval(function () {
            let oldTrace = trace;
            trace = findTrace();
            if (!trace || oldTrace.ts === trace.ts) {
              // Simulates a close signal
              listener(util.stringifyJSON({
                target: 'c',
                type: 'close',
                data: {
                  reason: 'error',
                  heir: oldTrace.heir
                }
              }));
            }
          }, 1000);

          parentOpened = connector.init();
          if (parentOpened) {
            // Firing the open event without delay robs the user of the opportunity to bind connecting event handlers
            setTimeout(function () {
              _open('opening', 'local', request);
            }, 50);
          }
          return parentOpened;
        },
        send: function (event) {
          connector.signal('send', event);
        },
        localSend: function (event) {
          connector.signal('localSend', util.stringifyJSON({
            id: guid,
            event: event
          }));
        },
        close: function () {
          // Do not signal the parent if this method is executed by the unload event handler
          if (!_abortingConnection) {
            clearInterval(_traceTimer);
            connector.signal('close');
            connector.close();
          }
        }
      };
    }

    function share () {
      let storageService;
      let name = 'atmosphere-' + _request.url;
      let servers = {
        // Powered by the storage event and the localStorage
        // http://www.w3.org/TR/webstorage/#event-storage
        storage: function () {
          function onstorage (event) {
            // When a deletion, newValue initialized to null
            if (event.key === name && event.newValue) {
              listener(event.newValue);
            }
          }

          if (!util.storage) {
            return;
          }

          let storage = window.localStorage;

          return {
            init: function () {
              // Handles the storage event
              util.on(window, 'storage', onstorage);
            },
            signal: function (type, data) {
              storage.setItem(name, util.stringifyJSON({
                target: 'c',
                type: type,
                data: data
              }));
            },
            get: function (key) {
              return util.parseJSON(storage.getItem(name + '-' + key));
            },
            set: function (key, value) {
              storage.setItem(name + '-' + key, util.stringifyJSON(value));
            },
            close: function () {
              util.off(window, 'storage', onstorage);
              storage.removeItem(name);
              storage.removeItem(name + '-opened');
              storage.removeItem(name + '-children');
            }

          };
        },
        // Powered by the window.open method
        // https://developer.mozilla.org/en/DOM/window.open
        windowref: function () {
          // Internet Explorer raises an invalid argument error
          // when calling the window.open method with the name containing non-word characters
          let neim = name.replace(/\W/g, '');
          let container = document.getElementById(neim);
          let win;

          if (!container) {
            container = document.createElement('div');
            container.id = neim;
            container.style.display = 'none';
            container.innerHTML = '<iframe name="' + neim + '" />';
            document.body.appendChild(container);
          }

          win = container.firstChild.contentWindow;

          return {
            init: function () {
              // Callbacks from different windows
              win.callbacks = [listener];
              // In IE 8 and less, only string argument can be safely passed to the function in other window
              win.fire = function (string) {
                let i;

                for (i = 0; i < win.callbacks.length; i++) {
                  win.callbacks[i](string);
                }
              };
            },
            signal: function (type, data) {
              if (!win.closed && win.fire) {
                win.fire(util.stringifyJSON({
                  target: 'c',
                  type: type,
                  data: data
                }));
              }
            },
            get: function (key) {
              return !win.closed ? win[key] : null;
            },
            set: function (key, value) {
              if (!win.closed) {
                win[key] = value;
              }
            },
            close: function () {
            }
          };
        }
      };

      // Receives send and close command from the children
      function listener (string) {
        let command = util.parseJSON(string);
        let data = command.data;

        if (command.target === 'p') {
          switch (command.type) {
            case 'send':
              _push(data);
              break;
            case 'localSend':
              _localMessage(data);
              break;
            case 'close':
              _close();
              break;
          }
        }
      }

      _localSocketF = function propagateMessageEvent (context) {
        storageService.signal('message', context);
      };

      function leaveTrace () {
        document.cookie = _sharingKey + '=' +
          // Opera's JSON implementation ignores a number whose a last digit of 0 strangely
          // but has no problem with a number whose a last digit of 9 + 1
          encodeURIComponent(util.stringifyJSON({
            ts: util.now() + 1,
            heir: (storageService.get('children') || [])[0]
          })) + '; path=/';
      }

      // Chooses a storageService
      storageService = servers.storage() || servers.windowref();
      storageService.init();

      if (_canLog('debug')) {
        util.debug('Installed StorageService ' + storageService);
      }

      // List of children sockets
      storageService.set('children', []);

      if (storageService.get('opened') != null && !storageService.get('opened')) {
        // Flag indicating the parent socket is opened
        storageService.set('opened', false);
      }
      // Leaves traces
      _sharingKey = encodeURIComponent(name);
      leaveTrace();
      _traceTimer = setInterval(leaveTrace, 1000);

      _storageService = storageService;
    }

    /**
     * @private
     */
    function _open (state, transport, request) {
      if (_request.shared && transport !== 'local') {
        share();
      }

      if (_storageService != null) {
        _storageService.set('opened', true);
      }

      request.close = function () {
        _close();
      };

      if (_requestCount > 0 && state === 're-connecting') {
        request.isReopen = true;
        _tryingToReconnect(_response);
      } else if (_response.error == null) {
        _response.request = request;
        let prevState = _response.state;
        _response.state = state;
        let prevTransport = _response.transport;
        _response.transport = transport;

        let _body = _response.responseBody;
        _invokeCallback();
        _response.responseBody = _body;

        _response.state = prevState;
        _response.transport = prevTransport;
      }
    }

    /**
     * Execute request using jsonp transport.
     *
     * @param request {Object} request Request parameters, if undefined _request object will be used.
     * @private
     */
    function _jsonp (request) {
      // When CORS is enabled, make sure we force the proper transport.
      request.transport = 'jsonp';

      let rq = _request;
      let script;
      if ((request != null) && (typeof (request) !== 'undefined')) {
        rq = request;
      }

      _jqxhr = {
        open: function () {
          let callback = 'atmosphere' + (++guid);

          function _reconnectOnFailure () {
            rq.lastIndex = 0;

            if (rq.openId) {
              clearTimeout(rq.openId);
            }

            if (rq.heartbeatTimer) {
              clearTimeout(rq.heartbeatTimer);
            }

            if (rq.reconnect && _requestCount++ < rq.maxReconnectOnClose) {
              _open('re-connecting', rq.transport, rq);
              _reconnect(_jqxhr, rq, request.reconnectInterval);
              rq.openId = setTimeout(function () {
                _triggerOpen(rq);
              }, rq.reconnectInterval + 1000);
            } else {
              _onError(0, 'maxReconnectOnClose reached');
            }
          }

          function poll () {
            let url = rq.url;
            if (rq.dispatchUrl != null) {
              url += rq.dispatchUrl;
            }

            let data = rq.data;
            if (rq.attachHeadersAsQueryString) {
              url = _attachHeaders(rq);
              if (data !== '') {
                url += '&X-Atmosphere-Post-Body=' + encodeURIComponent(data);
              }
              data = '';
            }

            let head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;

            script = document.createElement('script');
            script.src = url + '&jsonpTransport=' + callback;
            // script.async = rq.async;
            script.clean = function () {
              script.clean = script.onerror = script.onload = script.onreadystatechange = null;
              if (script.parentNode) {
                script.parentNode.removeChild(script);
              }

              if (++request.scriptCount === 2) {
                request.scriptCount = 1;
                _reconnectOnFailure();
              }
            };
            script.onload = script.onreadystatechange = function () {
              _debug('jsonp.onload');
              if (!script.readyState || /loaded|complete/.test(script.readyState)) {
                script.clean();
              }
            };

            script.onerror = function () {
              _debug('jsonp.onerror');
              request.scriptCount = 1;
              script.clean();
            };

            head.insertBefore(script, head.firstChild);
          }

          // Attaches callback
          window[callback] = function (msg) {
            _debug('jsonp.window');
            request.scriptCount = 0;
            if (rq.reconnect && rq.maxRequest === -1 || rq.requestCount++ < rq.maxRequest) {
              // _readHeaders(_jqxhr, rq);
              if (!rq.executeCallbackBeforeReconnect) {
                _reconnect(_jqxhr, rq, rq.pollingInterval);
              }

              if (msg != null && typeof msg !== 'string') {
                try {
                  msg = msg.message;
                } catch (err) {
                  // The message was partial
                }
              }
              let skipCallbackInvocation = _trackMessageSize(msg, rq, _response);
              if (!skipCallbackInvocation) {
                _prepareCallback(_response.responseBody, 'messageReceived', 200, rq.transport);
              }

              if (rq.executeCallbackBeforeReconnect) {
                _reconnect(_jqxhr, rq, rq.pollingInterval);
              }
              _timeout(rq);
            } else {
              util.log(_request.logLevel, ['JSONP reconnect maximum try reached ' + _request.requestCount]);
              _onError(0, 'maxRequest reached');
            }
          };
          setTimeout(function () {
            poll();
          }, 50);
        },
        abort: function () {
          if (script && script.clean) {
            script.clean();
          }
        }
      };
      _jqxhr.open();
    }

    /**
     * Build websocket object.
     *
     * @param location {string} Web socket url.
     * @returns {websocket} Web socket object.
     * @private
     */
    function _getWebSocket (location) {
      if (_request.webSocketImpl != null) {
        return _request.webSocketImpl;
      } else {
        if (window.WebSocket) {
          return new WebSocket(location);
        } else {
          /* eslint no-undef: 0 */
          return new MozWebSocket(location);
        }
      }
    }

    /**
     * Build web socket url from request url.
     *
     * @return {string} Web socket url (start with "ws" or "wss" for secure web socket).
     * @private
     */
    function _buildWebSocketUrl () {
      return _attachHeaders(_request, util.getAbsoluteURL(_request.webSocketUrl || _request.url)).replace(/^http/, 'ws');
    }

    /**
     * Build SSE url from request url.
     *
     * @return a url with Atmosphere's headers
     * @private
     */
    function _buildSSEUrl () {
      let url = _attachHeaders(_request);
      return url;
    }

    /**
     * Open SSE. <br>
     * Automatically use fallback transport if SSE can't be opened.
     *
     * @private
     */
    function _executeSSE (sseOpened) {
      _response.transport = 'sse';

      let location = _buildSSEUrl();

      if (_canLog('debug')) {
        util.debug('Invoking executeSSE');
        util.debug('Using URL: ' + location);
      }

      if (sseOpened && !_request.reconnect) {
        if (_sse != null) {
          _clearState();
        }
        return;
      }

      try {
        _sse = new EventSource(location, {
          withCredentials: _request.withCredentials
        });
      } catch (e) {
        _onError(0, e);
        _reconnectWithFallbackTransport('SSE failed. Downgrading to fallback transport and resending');
        return;
      }

      if (_request.connectTimeout > 0) {
        _request.id = setTimeout(function () {
          if (!sseOpened) {
            _clearState();
          }
        }, _request.connectTimeout);
      }

      _sse.onopen = function (event) {
        _debug('sse.onopen');
        _timeout(_request);
        if (_canLog('debug')) {
          util.debug('SSE successfully opened');
        }

        if (!_request.enableProtocol) {
          if (!sseOpened) {
            _open('opening', 'sse', _request);
          } else {
            _open('re-opening', 'sse', _request);
          }
        } else if (_request.isReopen) {
          _request.isReopen = false;
          _open('re-opening', _request.transport, _request);
        }

        sseOpened = true;

        if (_request.method === 'POST') {
          _response.state = 'messageReceived';
          _sse.send(_request.data);
        }
      };

      _sse.onmessage = function (message) {
        _debug('sse.onmessage');
        _timeout(_request);

        if (!_request.enableXDR && window.location.host && message.origin && message.origin !== window.location.protocol + '//' + window.location.host) {
          util.log(_request.logLevel, ['Origin was not ' + window.location.protocol + '//' + window.location.host]);
          return;
        }

        _response.state = 'messageReceived';
        _response.status = 200;

        message = message.data;
        let skipCallbackInvocation = _trackMessageSize(message, _request, _response);

        // https://github.com/remy/polyfills/blob/master/EventSource.js
        // Since we polling.
        /* if (_sse.URL) {
         _sse.interval = 100;
         _sse.URL = _buildSSEUrl();
         } */

        if (!skipCallbackInvocation) {
          _invokeCallback();
          _response.responseBody = '';
          _response.messages = [];
        }
      };

      _sse.onerror = function (message) {
        _debug('sse.onerror');
        clearTimeout(_request.id);

        if (_request.heartbeatTimer) {
          clearTimeout(_request.heartbeatTimer);
        }

        if (_response.closedByClientTimeout) {
          return;
        }

        _invokeClose(sseOpened);
        _clearState();

        if (_abortingConnection) {
          util.log(_request.logLevel, ['SSE closed normally']);
        } else if (!sseOpened) {
          _reconnectWithFallbackTransport('SSE failed. Downgrading to fallback transport and resending');
        } else if (_request.reconnect && (_response.transport === 'sse')) {
          if (_requestCount++ < _request.maxReconnectOnClose) {
            _open('re-connecting', _request.transport, _request);
            if (_request.reconnectInterval > 0) {
              _request.reconnectId = setTimeout(function () {
                _executeSSE(true);
              }, _request.reconnectInterval);
            } else {
              _executeSSE(true);
            }
            _response.responseBody = '';
            _response.messages = [];
          } else {
            util.log(_request.logLevel, ['SSE reconnect maximum try reached ' + _requestCount]);
            _onError(0, 'maxReconnectOnClose reached');
          }
        }
      };
    }

    /**
     * Open web socket. <br>
     * Automatically use fallback transport if web socket can't be opened.
     *
     * @private
     */
    function _executeWebSocket (webSocketOpened) {
      _response.transport = 'websocket';

      let location = _buildWebSocketUrl(_request.url);
      if (_canLog('debug')) {
        util.debug('Invoking executeWebSocket, using URL: ' + location);
      }

      if (webSocketOpened && !_request.reconnect) {
        if (_websocket != null) {
          _clearState();
        }
        return;
      }

      _websocket = _getWebSocket(location);
      if (_request.webSocketBinaryType != null) {
        _websocket.binaryType = _request.webSocketBinaryType;
      }

      if (_request.connectTimeout > 0) {
        _request.id = setTimeout(function () {
          if (!webSocketOpened) {
            let _message = {
              code: 1002,
              reason: '',
              wasClean: false
            };
            _websocket.onclose(_message);
            // Close it anyway
            try {
              _clearState();
            } catch (e) {
              // ignore
            }
            return;
          }
        }, _request.connectTimeout);
      }

      _websocket.onopen = function (message) {
        _debug('websocket.onopen');
        _timeout(_request);
        offline = false;

        if (_canLog('debug')) {
          util.debug('Websocket successfully opened');
        }

        let reopening = webSocketOpened;

        if (_websocket != null) {
          _websocket.canSendMessage = true;
        }

        if (!_request.enableProtocol) {
          webSocketOpened = true;
          if (reopening) {
            _open('re-opening', 'websocket', _request);
          } else {
            _open('opening', 'websocket', _request);
          }
        }

        if (_websocket != null) {
          if (_request.method === 'POST') {
            _response.state = 'messageReceived';
            _websocket.send(_request.data);
          }
        }
      };

      _websocket.onmessage = function (message) {
        _debug('websocket.onmessage');
        _timeout(_request);

        // We only consider it opened if we get the handshake data
        // https://github.com/Atmosphere/atmosphere-javascript/issues/74
        if (_request.enableProtocol) {
          webSocketOpened = true;
        }

        _response.state = 'messageReceived';
        _response.status = 200;

        message = message.data;
        let isString = typeof (message) === 'string';
        if (isString) {
          let skipCallbackInvocation = _trackMessageSize(message, _request, _response);
          if (!skipCallbackInvocation) {
            _invokeCallback();
            _response.responseBody = '';
            _response.messages = [];
          }
        } else {
          message = _handleProtocol(_request, message);
          if (message === '') {
            return;
          }

          _response.responseBody = message;
          _invokeCallback();
          _response.responseBody = null;
        }
      };

      _websocket.onerror = function (message) {
        _debug('websocket.onerror');
        clearTimeout(_request.id);

        if (_request.heartbeatTimer) {
          clearTimeout(_request.heartbeatTimer);
        }
      };

      _websocket.onclose = function (message) {
        _debug('websocket.onclose');
        clearTimeout(_request.id);
        if (_response.state === 'closed') {
          return;
        }

        let reason = message.reason;
        if (reason === '') {
          switch (message.code) {
            case 1000:
              reason = 'Normal closure; the connection successfully completed whatever purpose for which it was created.';
              break;
            case 1001:
              reason = 'The endpoint is going away, either because of a server failure or because the ' +
                'browser is navigating away from the page that opened the connection.';
              break;
            case 1002:
              reason = 'The endpoint is terminating the connection due to a protocol error.';
              break;
            case 1003:
              reason = 'The connection is being terminated because the endpoint received data of a type it ' +
                'cannot accept (for example, a text-only endpoint received binary data).';
              break;
            case 1004:
              reason = 'The endpoint is terminating the connection because a data frame was received that is too large.';
              break;
            case 1005:
              reason = 'Unknown: no status code was provided even though one was expected.';
              break;
            case 1006:
              reason = 'Connection was closed abnormally (that is, with no close frame being sent).';
              break;
          }
        }

        if (_canLog('warn')) {
          util.warn('Websocket closed, reason: ' + reason + ' - wasClean: ' + message.wasClean);
        }

        if (_response.closedByClientTimeout || (_request.handleOnlineOffline && offline)) {
          // IFF online/offline events are handled and we happen to be offline, we stop all reconnect attempts and
          // resume them in the "online" event (if we get here in that case, something else went wrong as the
          // offline handler should stop any reconnect attempt).
          //
          // On the other hand, if we DO NOT handle online/offline events, we continue as before with reconnecting
          // even if we are offline. Failing to do so would stop all reconnect attemps forever.
          if (_request.reconnectId) {
            clearTimeout(_request.reconnectId);
            delete _request.reconnectId;
          }
          return;
        }

        _invokeClose(webSocketOpened);

        _response.state = 'closed';

        if (_abortingConnection) {
          util.log(_request.logLevel, ['Websocket closed normally']);
        } else if (!webSocketOpened) {
          _reconnectWithFallbackTransport('Websocket failed on first connection attempt. Downgrading to ' + _request.fallbackTransport + ' and resending');
        } else if (_request.reconnect && _response.transport === 'websocket') {
          _clearState();
          if (_requestCount++ < _request.maxReconnectOnClose) {
            _open('re-connecting', _request.transport, _request);
            if (_request.reconnectInterval > 0) {
              _request.reconnectId = setTimeout(function () {
                _response.responseBody = '';
                _response.messages = [];
                _executeWebSocket(true);
              }, _request.reconnectInterval);
            } else {
              _response.responseBody = '';
              _response.messages = [];
              _executeWebSocket(true);
            }
          } else {
            util.log(_request.logLevel, ['Websocket reconnect maximum try reached ' + _requestCount]);
            if (_canLog('warn')) {
              util.warn('Websocket error, reason: ' + message.reason);
            }
            _onError(0, 'maxReconnectOnClose reached');
          }
        }
      };

      let ua = navigator.userAgent.toLowerCase();
      let isAndroid = ua.indexOf('android') > -1;
      if (isAndroid && _websocket.url === undefined) {
        // Android 4.1 does not really support websockets and fails silently
        _websocket.onclose({
          reason: 'Android 4.1 does not support websockets.',
          wasClean: false
        });
      }
    }

    function _handleProtocol (request, message) {
      let nMessage = message;
      if (request.transport === 'polling') return nMessage;

      if (request.enableProtocol && request.firstMessage && util.trim(message).length !== 0) {
        let pos = request.trackMessageLength ? 1 : 0;
        let messages = message.split(request.messageDelimiter);

        if (messages.length <= pos + 1) {
          // Something went wrong, normally with IE or when a message is written before the
          // handshake has been received.
          return nMessage;
        }

        request.firstMessage = false;
        request.uuid = util.trim(messages[pos]);

        if (messages.length <= pos + 2) {
          util.log('error', ['Protocol data not sent by the server. ' +
          'If you enable protocol on client side, be sure to install JavascriptProtocol interceptor on server side.' +
          'Also note that atmosphere-runtime 2.2+ should be used.']);
        }

        _heartbeatInterval = parseInt(util.trim(messages[pos + 1]), 10);
        _heartbeatPadding = messages[pos + 2];

        if (request.transport !== 'long-polling') {
          _triggerOpen(request);
        }
        uuid = request.uuid;
        nMessage = '';

        // We have trailing messages
        pos = request.trackMessageLength ? 4 : 3;
        if (messages.length > pos + 1) {
          for (let i = pos; i < messages.length; i++) {
            nMessage += messages[i];
            if (i + 1 !== messages.length) {
              nMessage += request.messageDelimiter;
            }
          }
        }

        if (request.ackInterval !== 0) {
          setTimeout(function () {
            _push('...ACK...');
          }, request.ackInterval);
        }
      } else if (request.enableProtocol && request.firstMessage && util.browser.msie && +util.browser.version.split('.')[0] < 10) {
        // In case we are getting some junk from IE
        util.log(_request.logLevel, ['Receiving unexpected data from IE']);
      } else {
        _triggerOpen(request);
      }
      return nMessage;
    }

    function _timeout (_request) {
      clearTimeout(_request.id);
      if (_request.timeout > 0 && _request.transport !== 'polling') {
        _request.id = setTimeout(function () {
          _onClientTimeout(_request);
          _disconnect();
          _clearState();
        }, _request.timeout);
      }
    }

    function _onClientTimeout (_request) {
      _response.closedByClientTimeout = true;
      _response.state = 'closedByClient';
      _response.responseBody = '';
      _response.status = 408;
      _response.messages = [];
      _invokeCallback();
    }

    function _onError (code, reason) {
      _clearState();
      clearTimeout(_request.id);
      _response.state = 'error';
      _response.reasonPhrase = reason;
      _response.responseBody = '';
      _response.status = code;
      _response.messages = [];
      _invokeCallback();
    }

    /**
     * Track received message and make sure callbacks/functions are only invoked when the complete message has been received.
     *
     * @param message
     * @param request
     * @param response
     */
    function _trackMessageSize (message, request, response) {
      message = _handleProtocol(request, message);
      if (message.length === 0) {
        return true;
      }

      response.responseBody = message;

      if (request.trackMessageLength) {
        // prepend partialMessage if any
        message = response.partialMessage + message;

        let messages = [];
        let messageStart = message.indexOf(request.messageDelimiter);
        if (messageStart !== -1) {
          while (messageStart !== -1) {
            let str = message.substring(0, messageStart);
            let messageLength = +str;
            if (isNaN(messageLength)) {
              throw new Error('message length "' + str + '" is not a number');
            }
            messageStart += request.messageDelimiter.length;
            if (messageStart + messageLength > message.length) {
              // message not complete, so there is no trailing messageDelimiter
              messageStart = -1;
            } else {
              // message complete, so add it
              messages.push(message.substring(messageStart, messageStart + messageLength));
              // remove consumed characters
              message = message.substring(messageStart + messageLength, message.length);
              messageStart = message.indexOf(request.messageDelimiter);
            }
          }

          /* keep any remaining data */
          response.partialMessage = message;

          if (messages.length !== 0) {
            response.responseBody = messages.join(request.messageDelimiter);
            response.messages = messages;
            return false;
          } else {
            response.responseBody = '';
            response.messages = [];
            return true;
          }
        }
      }
      response.responseBody = message;
      response.messages = [message];
      return false;
    }

    /**
     * Reconnect request with fallback transport. <br>
     * Used in case websocket can't be opened.
     *
     * @private
     */
    function _reconnectWithFallbackTransport (errorMessage) {
      util.log(_request.logLevel, [errorMessage]);

      if (typeof (_request.onTransportFailure) !== 'undefined') {
        _request.onTransportFailure(errorMessage, _request);
      } else if (typeof (util.onTransportFailure) !== 'undefined') {
        util.onTransportFailure(errorMessage, _request);
      }

      _request.transport = _request.fallbackTransport;
      let reconnectInterval = _request.connectTimeout === -1 ? 0 : _request.connectTimeout;
      if (_request.reconnect && _request.transport !== 'none' || _request.transport == null) {
        _request.method = _request.fallbackMethod;
        _response.transport = _request.fallbackTransport;
        _request.fallbackTransport = 'none';
        if (reconnectInterval > 0) {
          _request.reconnectId = setTimeout(function () {
            _execute();
          }, reconnectInterval);
        } else {
          _execute();
        }
      } else {
        _onError(500, 'Unable to reconnect with fallback transport');
      }
    }

    /**
     * Get url from request and attach headers to it.
     *
     * @param request {Object} request Request parameters, if undefined _request object will be used.
     *
     * @returns {Object} Request object, if undefined, _request object will be used.
     * @private
     */
    function _attachHeaders (request, url) {
      let rq = _request;
      if ((request != null) && (typeof (request) !== 'undefined')) {
        rq = request;
      }

      if (url == null) {
        url = rq.url;
      }

      // If not enabled
      if (!rq.attachHeadersAsQueryString) {
        return url;
      }

      // If already added
      if (url.indexOf('X-Atmosphere-Framework') !== -1) {
        return url;
      }

      url += (url.indexOf('?') !== -1) ? '&' : '?';
      url += 'X-Atmosphere-tracking-id=' + rq.uuid;
      url += '&X-Atmosphere-Framework=' + Atmosphere.version;
      url += '&X-Atmosphere-Transport=' + rq.transport;

      if (rq.trackMessageLength) {
        url += '&X-Atmosphere-TrackMessageSize=' + 'true';
      }

      if (rq.heartbeat !== null && rq.heartbeat.server !== null) {
        url += '&X-Heartbeat-Server=' + rq.heartbeat.server;
      }

      if (rq.contentType !== '') {
        // Eurk!
        url += '&Content-Type=' + (rq.transport === 'websocket' ? rq.contentType : encodeURIComponent(rq.contentType));
      }

      if (rq.enableProtocol) {
        url += '&X-atmo-protocol=true';
      }

      util.each(rq.headers, function (name, value) {
        let h = util.isFunction(value) ? value.call(this, rq, request, _response) : value;
        if (h != null) {
          url += '&' + encodeURIComponent(name) + '=' + encodeURIComponent(h);
        }
      });

      return url;
    }

    function _triggerOpen (rq) {
      if (!rq.isOpen) {
        rq.isOpen = true;
        _open('opening', rq.transport, rq);
      } else if (rq.isReopen) {
        rq.isReopen = false;
        _open('re-opening', rq.transport, rq);
      } else if (_response.state === 'messageReceived' && (rq.transport === 'jsonp' || rq.transport === 'long-polling')) {
        _openAfterResume(_response);
      } else {
        return;
      }

      _startHeartbeat(rq);
    }

    function _startHeartbeat (rq) {
      if (rq.heartbeatTimer != null) {
        clearTimeout(rq.heartbeatTimer);
      }

      if (!isNaN(_heartbeatInterval) && _heartbeatInterval > 0) {
        let _pushHeartbeat = function () {
          if (_canLog('debug')) {
            util.debug('Sending heartbeat');
          }
          _push(_heartbeatPadding);
          rq.heartbeatTimer = setTimeout(_pushHeartbeat, _heartbeatInterval);
        };
        rq.heartbeatTimer = setTimeout(_pushHeartbeat, _heartbeatInterval);
      }
    }

    /**
     * Execute ajax request. <br>
     *
     * @param request {Object} request Request parameters, if undefined _request object will be used.
     * @private
     */
    function _executeRequest (request) {
      let rq = _request;
      if ((request != null) || (typeof (request) !== 'undefined')) {
        rq = request;
      }

      rq.lastIndex = 0;
      rq.readyState = 0;

      // CORS fake using JSONP
      if ((rq.transport === 'jsonp') || ((rq.enableXDR) && (util.checkCORSSupport()))) {
        _jsonp(rq);
        return;
      }

      if (util.browser.msie && +util.browser.version.split('.')[0] < 10) {
        if ((rq.transport === 'streaming')) {
          if (rq.enableXDR && window.XDomainRequest) {
            _ieXDR(rq);
          } else {
            _ieStreaming(rq);
          }
          return;
        }

        if ((rq.enableXDR) && (window.XDomainRequest)) {
          _ieXDR(rq);
          return;
        }
      }

      let reconnectFExec = function (force) {
        rq.lastIndex = 0;
        _requestCount++; // Increase also when forcing reconnect as _open checks _requestCount
        if (force || (rq.reconnect && _requestCount <= rq.maxReconnectOnClose)) {
          let delay = force ? 0 : request.reconnectInterval; // Reconnect immediately if the server resumed the connection (timeout)
          _response.ffTryingReconnect = true;
          _open('re-connecting', request.transport, request);
          _reconnect(ajaxRequest, rq, delay);
        } else {
          _onError(0, 'maxReconnectOnClose reached');
        }
      };

      let reconnectF = function (force) {
        if (Atmosphere._beforeUnloadState) {
          // ATMOSPHERE-JAVASCRIPT-143: Delay reconnect to avoid reconnect attempts before an actual unload (we don't know if an unload will happen, yet)
          util.debug(new Date() + ' Atmosphere: reconnectF: execution delayed due to _beforeUnloadState flag');
          setTimeout(function () {
            reconnectFExec(force);
          }, 5000);
        } else {
          reconnectFExec(force);
        }
      };

      let disconnected = function () {
        // Prevent onerror callback to be called
        _response.errorHandled = true;
        _clearState();
        reconnectF(false);
      };

      if (rq.force || (rq.reconnect && (rq.maxRequest === -1 || rq.requestCount++ < rq.maxRequest))) {
        rq.force = false;

        let ajaxRequest = util.xhr();
        ajaxRequest.hasData = false;

        _doRequest(ajaxRequest, rq, true);

        if (rq.suspend) {
          _activeRequest = ajaxRequest;
        }

        if (rq.transport !== 'polling') {
          _response.transport = rq.transport;

          ajaxRequest.onabort = function () {
            _debug('ajaxrequest.onabort')
            _invokeClose(true);
          };

          ajaxRequest.onerror = function () {
            _debug('ajaxrequest.onerror')
            _response.error = true;
            _response.ffTryingReconnect = true;
            try {
              _response.status = XMLHttpRequest.status;
            } catch (e) {
              _response.status = 500;
            }

            if (!_response.status) {
              _response.status = 500;
            }
            if (!_response.errorHandled) {
              _clearState();
              reconnectF(false);
            }
          };
        }

        ajaxRequest.onreadystatechange = function () {
          _debug('ajaxRequest.onreadystatechange, new state: ' + ajaxRequest.readyState);
          if (_abortingConnection) {
            _debug('onreadystatechange has been ignored due to _abortingConnection flag');
            return;
          }

          _response.error = null;
          let skipCallbackInvocation = false;
          let update = false;

          if (rq.transport === 'streaming' && rq.readyState > 2 && ajaxRequest.readyState === 4) {
            _clearState();
            reconnectF(false);
            return;
          }

          rq.readyState = ajaxRequest.readyState;

          if (rq.transport === 'streaming' && ajaxRequest.readyState >= 3) {
            update = true;
          } else if (rq.transport === 'long-polling' && ajaxRequest.readyState === 4) {
            update = true;
          }
          _timeout(_request);

          if (rq.transport !== 'polling') {
            // MSIE 9 and lower status can be higher than 1000, Chrome can be 0
            let status = 200;
            if (ajaxRequest.readyState === 4) {
              status = ajaxRequest.status > 1000 ? 0 : ajaxRequest.status;
            }

            if (!rq.reconnectOnServerError && (status >= 300 && status < 600)) {
              _onError(status, ajaxRequest.statusText);
              return;
            }

            if (status >= 300 || status === 0) {
              disconnected();
              return;
            }

            // Firefox incorrectly send statechange 0->2 when a reconnect attempt fails. The above checks ensure that onopen is not called for these
            if ((!rq.enableProtocol || !request.firstMessage) && ajaxRequest.readyState === 2) {
              // Firefox incorrectly send statechange 0->2 when a reconnect attempt fails. The above checks ensure that onopen is not called for these
              // In that case, ajaxRequest.onerror will be called just after onreadystatechange is called, so we delay the trigger until we are
              // guarantee the connection is well established.
              if (util.browser.mozilla && _response.ffTryingReconnect) {
                _response.ffTryingReconnect = false;
                setTimeout(function () {
                  if (!_response.ffTryingReconnect) {
                    _triggerOpen(rq);
                  }
                }, 500);
              } else {
                _triggerOpen(rq);
              }
            }
          } else if (ajaxRequest.readyState === 4) {
            update = true;
          }

          if (update) {
            let responseText = ajaxRequest.responseText;
            _response.errorHandled = false;

            // IE behave the same way when resuming long-polling or when the server goes down.
            if (rq.transport === 'long-polling' && util.trim(responseText).length === 0) {
              // For browser that aren't support onabort
              if (!ajaxRequest.hasData) {
                reconnectF(true);
              } else {
                ajaxRequest.hasData = false;
              }
              return;
            }
            ajaxRequest.hasData = true;

            _readHeaders(ajaxRequest, _request);

            if (rq.transport === 'streaming') {
              if (!util.browser.opera) {
                let message = responseText.substring(rq.lastIndex, responseText.length);
                skipCallbackInvocation = _trackMessageSize(message, rq, _response);

                rq.lastIndex = responseText.length;
                if (skipCallbackInvocation) {
                  return;
                }
              } else {
                util.iterate(function () {
                  if (_response.status !== 500 && ajaxRequest.responseText.length > rq.lastIndex) {
                    try {
                      _response.status = ajaxRequest.status;
                      _response.headers = util.parseHeaders(ajaxRequest.getAllResponseHeaders());

                      _readHeaders(ajaxRequest, _request);
                    } catch (e) {
                      _response.status = 404;
                    }
                    _timeout(_request);

                    _response.state = 'messageReceived';
                    let message = ajaxRequest.responseText.substring(rq.lastIndex);
                    rq.lastIndex = ajaxRequest.responseText.length;

                    skipCallbackInvocation = _trackMessageSize(message, rq, _response);
                    if (!skipCallbackInvocation) {
                      _invokeCallback();
                    }

                    if (_verifyStreamingLength(ajaxRequest, rq)) {
                      _reconnectOnMaxStreamingLength(ajaxRequest, rq);
                      return;
                    }
                  } else if (_response.status > 400) {
                    // Prevent replaying the last message.
                    rq.lastIndex = ajaxRequest.responseText.length;
                    return false;
                  }
                }, 0);
              }
            } else {
              skipCallbackInvocation = _trackMessageSize(responseText, rq, _response);
            }
            let closeStream = _verifyStreamingLength(ajaxRequest, rq);

            try {
              _response.status = ajaxRequest.status;
              _response.headers = util.parseHeaders(ajaxRequest.getAllResponseHeaders());

              _readHeaders(ajaxRequest, rq);
            } catch (e) {
              _response.status = 404;
            }

            if (rq.suspend) {
              _response.state = _response.status === 0 ? 'closed' : 'messageReceived';
            } else {
              _response.state = 'messagePublished';
            }

            let isAllowedToReconnect = !closeStream && request.transport !== 'streaming' && request.transport !== 'polling';
            if (isAllowedToReconnect && !rq.executeCallbackBeforeReconnect) {
              _reconnect(ajaxRequest, rq, rq.pollingInterval);
            }

            if (_response.responseBody.length !== 0 && !skipCallbackInvocation) {
              _invokeCallback();
            }

            if (isAllowedToReconnect && rq.executeCallbackBeforeReconnect) {
              _reconnect(ajaxRequest, rq, rq.pollingInterval);
            }

            if (closeStream) {
              _reconnectOnMaxStreamingLength(ajaxRequest, rq);
            }
          }
        };

        try {
          ajaxRequest.send(rq.data);
          _subscribed = true;
        } catch (e) {
          util.log(rq.logLevel, ['Unable to connect to ' + rq.url]);
          _onError(0, e);
        }
      } else {
        if (rq.logLevel === 'debug') {
          util.log(rq.logLevel, ['Max re-connection reached.']);
        }
        _onError(0, 'maxRequest reached');
      }
    }

    function _reconnectOnMaxStreamingLength (ajaxRequest, rq) {
      _response.messages = [];
      rq.isReopen = true;
      _close();
      _abortingConnection = false;
      _reconnect(ajaxRequest, rq, 500);
    }

    /**
     * Do ajax request.
     *
     * @param ajaxRequest Ajax request.
     * @param request Request parameters.
     * @param create If ajax request has to be open.
     */
    function _doRequest (ajaxRequest, request, create) {
      // Prevent Android to cache request
      let url = request.url;
      if (request.dispatchUrl != null && request.method === 'POST') {
        url += request.dispatchUrl;
      }
      url = _attachHeaders(request, url);
      url = util.prepareURL(url);

      if (create) {
        ajaxRequest.open(request.method, url, request.async);
        if (request.connectTimeout > 0) {
          request.id = setTimeout(function () {
            if (request.requestCount === 0) {
              _clearState();
              _prepareCallback('Connect timeout', 'closed', 200, request.transport);
            }
          }, request.connectTimeout);
        }
      }

      if (_request.withCredentials && _request.transport !== 'websocket') {
        if ('withCredentials' in ajaxRequest) {
          ajaxRequest.withCredentials = true;
        }
      }

      if (!_request.dropHeaders) {
        ajaxRequest.setRequestHeader('X-Atmosphere-Framework', Atmosphere.version);
        ajaxRequest.setRequestHeader('X-Atmosphere-Transport', request.transport);

        if (request.heartbeat !== null && request.heartbeat.server !== null) {
          ajaxRequest.setRequestHeader('X-Heartbeat-Server', ajaxRequest.heartbeat.server);
        }

        if (request.trackMessageLength) {
          ajaxRequest.setRequestHeader('X-Atmosphere-TrackMessageSize', 'true');
        }
        ajaxRequest.setRequestHeader('X-Atmosphere-tracking-id', request.uuid);

        util.each(request.headers, function (name, value) {
          let h = util.isFunction(value) ? value.call(this, ajaxRequest, request, create, _response) : value;
          if (h != null) {
            ajaxRequest.setRequestHeader(name, h);
          }
        });
      }

      if (request.contentType !== '') {
        ajaxRequest.setRequestHeader('Content-Type', request.contentType);
      }
    }

    function _reconnect (ajaxRequest, request, delay) {
      if (_response.closedByClientTimeout) {
        return;
      }

      if (request.reconnect || (request.suspend && _subscribed)) {
        let status = 0;
        if (ajaxRequest && ajaxRequest.readyState > 1) {
          status = ajaxRequest.status > 1000 ? 0 : ajaxRequest.status;
        }
        _response.status = status === 0 ? 204 : status;
        _response.reason = status === 0 ? 'Server resumed the connection or down.' : 'OK';

        clearTimeout(request.id);
        if (request.reconnectId) {
          clearTimeout(request.reconnectId);
          delete request.reconnectId;
        }

        if (delay > 0) {
          // For whatever reason, never cancel a reconnect timeout as it is mandatory to reconnect.
          _request.reconnectId = setTimeout(function () {
            _executeRequest(request);
          }, delay);
        } else {
          _executeRequest(request);
        }
      }
    }

    function _tryingToReconnect (response) {
      response.state = 're-connecting';
      _invokeFunction(response);
    }

    function _openAfterResume (response) {
      response.state = 'openAfterResume';
      _invokeFunction(response);
      response.state = 'messageReceived';
    }

    function _ieXDR (request) {
      if (request.transport !== 'polling') {
        _ieStream = _configureXDR(request);
        _ieStream.open();
      } else {
        _configureXDR(request).open();
      }
    }

    function _configureXDR (request) {
      let rq = _request;
      if ((request != null) && (typeof (request) !== 'undefined')) {
        rq = request;
      }

      let transport = rq.transport;
      let lastIndex = 0;
      let xdr = new window.XDomainRequest();
      let reconnect = function () {
        if (rq.transport === 'long-polling' && (rq.reconnect && (rq.maxRequest === -1 || rq.requestCount++ < rq.maxRequest))) {
          xdr.status = 200;
          _ieXDR(rq);
        }
      };

      let rewriteURL = rq.rewriteURL || function (url) {
          // Maintaining session by rewriting URL
          // http://stackoverflow.com/questions/6453779/maintaining-session-by-rewriting-url
        let match = /(?:^|;\s*)(JSESSIONID|PHPSESSID)=([^;]*)/.exec(document.cookie);

        switch (match && match[1]) {
          case 'JSESSIONID':
            return url.replace(/;jsessionid=[^\?]*|(\?)|$/, ';jsessionid=' + match[2] + '$1');
          case 'PHPSESSID':
            return url.replace(/\?PHPSESSID=[^&]*&?|\?|$/, '?PHPSESSID=' + match[2] + '&').replace(/&$/, '');
        }
        return url;
      };

      // Handles open and message event
      xdr.onprogress = function () {
        handle(xdr);
      };
      // Handles error event
      xdr.onerror = function () {
        // If the server doesn't send anything back to XDR will fail with polling
        if (rq.transport !== 'polling') {
          _clearState();
          if (_requestCount++ < rq.maxReconnectOnClose) {
            if (rq.reconnectInterval > 0) {
              rq.reconnectId = setTimeout(function () {
                _open('re-connecting', request.transport, request);
                _ieXDR(rq);
              }, rq.reconnectInterval);
            } else {
              _open('re-connecting', request.transport, request);
              _ieXDR(rq);
            }
          } else {
            _onError(0, 'maxReconnectOnClose reached');
          }
        }
      };

      // Handles close event
      xdr.onload = function () {
      };

      let handle = function (xdr) {
        clearTimeout(rq.id);
        let message = xdr.responseText;

        message = message.substring(lastIndex);
        lastIndex += message.length;

        if (transport !== 'polling') {
          _timeout(rq);

          let skipCallbackInvocation = _trackMessageSize(message, rq, _response);

          if (transport === 'long-polling' && util.trim(message).length === 0) {
            return;
          }

          if (rq.executeCallbackBeforeReconnect) {
            reconnect();
          }

          if (!skipCallbackInvocation) {
            _prepareCallback(_response.responseBody, 'messageReceived', 200, transport);
          }

          if (!rq.executeCallbackBeforeReconnect) {
            reconnect();
          }
        }
      };

      return {
        open: function () {
          let url = rq.url;
          if (rq.dispatchUrl != null) {
            url += rq.dispatchUrl;
          }
          url = _attachHeaders(rq, url);
          xdr.open(rq.method, rewriteURL(url));
          if (rq.method === 'GET') {
            xdr.send();
          } else {
            xdr.send(rq.data);
          }

          if (rq.connectTimeout > 0) {
            rq.id = setTimeout(function () {
              if (rq.requestCount === 0) {
                _clearState();
                _prepareCallback('Connect timeout', 'closed', 200, rq.transport);
              }
            }, rq.connectTimeout);
          }
        },
        close: function () {
          xdr.abort();
        }
      };
    }

    function _ieStreaming (request) {
      _ieStream = _configureIE(request);
      _ieStream.open();
    }

    function _configureIE (request) {
      let rq = _request;
      if ((request != null) && (typeof (request) !== 'undefined')) {
        rq = request;
      }

      let stop;
      let doc = new window.ActiveXObject('htmlfile');

      doc.open();
      doc.close();

      let url = rq.url;
      if (rq.dispatchUrl != null) {
        url += rq.dispatchUrl;
      }

      if (rq.transport !== 'polling') {
        _response.transport = rq.transport;
      }

      return {
        open: function () {
          let iframe = doc.createElement('iframe');

          url = _attachHeaders(rq);
          if (rq.data !== '') {
            url += '&X-Atmosphere-Post-Body=' + encodeURIComponent(rq.data);
          }

          // Finally attach a timestamp to prevent Android and IE caching.
          url = util.prepareURL(url);

          iframe.src = url;
          doc.body.appendChild(iframe);

          // For the server to respond in a consistent format regardless of user agent, we polls response text
          let cdoc = iframe.contentDocument || iframe.contentWindow.document;

          stop = util.iterate(function () {
            try {
              if (!cdoc.firstChild) {
                return;
              }

              let res = cdoc.body ? cdoc.body.lastChild : cdoc;
              let readResponse = function () {
                // Clones the element not to disturb the original one
                let clone = res.cloneNode(true);

                // If the last character is a carriage return or a line feed, IE ignores it in the innerText property
                // therefore, we add another non-newline character to preserve it
                clone.appendChild(cdoc.createTextNode('.'));

                let text = clone.innerText;

                text = text.substring(0, text.length - 1);
                return text;
              };

              // To support text/html content type
              if (!cdoc.body || !cdoc.body.firstChild || cdoc.body.firstChild.nodeName.toLowerCase() !== 'pre') {
                // Injects a plaintext element which renders text without interpreting the HTML and cannot be stopped
                // it is deprecated in HTML5, but still works
                let head = cdoc.head || cdoc.getElementsByTagName('head')[0] || cdoc.documentElement || cdoc;
                let script = cdoc.createElement('script');

                script.text = "document.write('<plaintext>')";

                head.insertBefore(script, head.firstChild);
                head.removeChild(script);

                // The plaintext element will be the response container
                res = cdoc.body.lastChild;
              }

              if (rq.closed) {
                rq.isReopen = true;
              }

              // Handles message and close event
              stop = util.iterate(function () {
                let text = readResponse();
                if (text.length > rq.lastIndex) {
                  _timeout(_request);

                  _response.status = 200;
                  _response.error = null;

                  // Empties response every time that it is handled
                  res.innerText = '';
                  let skipCallbackInvocation = _trackMessageSize(text, rq, _response);
                  if (skipCallbackInvocation) {
                    return '';
                  }

                  _prepareCallback(_response.responseBody, 'messageReceived', 200, rq.transport);
                }

                rq.lastIndex = 0;

                if (cdoc.readyState === 'complete') {
                  _invokeClose(true);
                  _open('re-connecting', rq.transport, rq);
                  if (rq.reconnectInterval > 0) {
                    rq.reconnectId = setTimeout(function () {
                      _ieStreaming(rq);
                    }, rq.reconnectInterval);
                  } else {
                    _ieStreaming(rq);
                  }
                  return false;
                }
              }, null);

              return false;
            } catch (err) {
              _response.error = true;
              _open('re-connecting', rq.transport, rq);
              if (_requestCount++ < rq.maxReconnectOnClose) {
                if (rq.reconnectInterval > 0) {
                  rq.reconnectId = setTimeout(function () {
                    _ieStreaming(rq);
                  }, rq.reconnectInterval);
                } else {
                  _ieStreaming(rq);
                }
              } else {
                _onError(0, 'maxReconnectOnClose reached');
              }
              doc.execCommand('Stop');
              doc.close();
              return false;
            }
          });
        },

        close: function () {
          if (stop) {
            stop();
          }

          doc.execCommand('Stop');
          _invokeClose(true);
        }
      };
    }

    /**
     * Send message. <br>
     * Will be automatically dispatch to other connected.
     *
     * @param {Object, string} message Message to send.
     * @private
     */
    function _push (message) {
      if (_localStorageService != null) {
        _pushLocal(message);
      } else if (_activeRequest != null || _sse != null) {
        _pushAjaxMessage(message);
      } else if (_ieStream != null) {
        _pushIE(message);
      } else if (_jqxhr != null) {
        _pushJsonp(message);
      } else if (_websocket != null) {
        _pushWebSocket(message);
      } else {
        _onError(0, 'No suspended connection available');
        util.error('No suspended connection available. Make sure atmosphere.subscribe has been called and request.onOpen invoked before trying to push data');
      }
    }

    function _pushOnClose (message, rq) {
      if (!rq) {
        rq = _getPushRequest(message);
      }
      rq.transport = 'polling';
      rq.method = 'GET';
      rq.withCredentials = false;
      rq.reconnect = false;
      rq.force = true;
      rq.suspend = false;
      rq.timeout = 1000;
      _executeRequest(rq);
    }

    function _pushLocal (message) {
      _localStorageService.send(message);
    }

    function _intraPush (message) {
      // IE 9 will crash if not.
      if (message.length === 0) {
        return;
      }

      try {
        if (_localStorageService) {
          _localStorageService.localSend(message);
        } else if (_storageService) {
          _storageService.signal('localMessage', util.stringifyJSON({
            id: guid,
            event: message
          }));
        }
      } catch (err) {
        util.error(err);
      }
    }

    /**
     * Send a message using currently opened ajax request (using http-streaming or long-polling). <br>
     *
     * @param {string, Object} Message to send. This is an object, string message is saved in data member.
     * @private
     */
    function _pushAjaxMessage (message) {
      let rq = _getPushRequest(message);
      _executeRequest(rq);
    }

    /**
     * Send a message using currently opened ie streaming (using http-streaming or long-polling). <br>
     *
     * @param {string, Object} Message to send. This is an object, string message is saved in data member.
     * @private
     */
    function _pushIE (message) {
      if (_request.enableXDR && util.checkCORSSupport()) {
        let rq = _getPushRequest(message);
        // Do not reconnect since we are pushing.
        rq.reconnect = false;
        _jsonp(rq);
      } else {
        _pushAjaxMessage(message);
      }
    }

    /**
     * Send a message using jsonp transport. <br>
     *
     * @param {string, Object} Message to send. This is an object, string message is saved in data member.
     * @private
     */
    function _pushJsonp (message) {
      _pushAjaxMessage(message);
    }

    function _getStringMessage (message) {
      let msg = message;
      if (typeof (msg) === 'object') {
        msg = message.data;
      }
      return msg;
    }

    /**
     * Build request use to push message using method 'POST' <br>. Transport is defined as 'polling' and 'suspend' is set to false.
     *
     * @return {Object} Request object use to push message.
     * @private
     */
    function _getPushRequest (message) {
      let msg = _getStringMessage(message);

      let rq = {
        connected: false,
        timeout: 60000,
        method: 'POST',
        url: _request.url,
        contentType: _request.contentType,
        headers: _request.headers,
        reconnect: true,
        callback: null,
        data: msg,
        suspend: false,
        maxRequest: -1,
        logLevel: 'info',
        requestCount: 0,
        withCredentials: _request.withCredentials,
        async: _request.async,
        transport: 'polling',
        isOpen: true,
        attachHeadersAsQueryString: true,
        enableXDR: _request.enableXDR,
        uuid: _request.uuid,
        dispatchUrl: _request.dispatchUrl,
        enableProtocol: false,
        messageDelimiter: '|',
        trackMessageLength: _request.trackMessageLength,
        maxReconnectOnClose: _request.maxReconnectOnClose,
        heartbeatTimer: _request.heartbeatTimer,
        heartbeat: _request.heartbeat
      };

      if (typeof (message) === 'object') {
        rq = util.extend(rq, message);
      }

      return rq;
    }

    /**
     * Send a message using currently opened websocket. <br>
     *
     */
    function _pushWebSocket (message) {
      let msg = util.isBinary(message) ? message : _getStringMessage(message);
      let data;
      try {
        if (_request.dispatchUrl != null) {
          data = _request.webSocketPathDelimiter + _request.dispatchUrl + _request.webSocketPathDelimiter + msg;
        } else {
          data = msg;
        }

        if (!_websocket.canSendMessage) {
          util.error('WebSocket not connected.');
          return;
        }

        _websocket.send(data);
      } catch (e) {
        _websocket.onclose = function (message) {
        };
        _clearState();

        _reconnectWithFallbackTransport('Websocket failed. Downgrading to ' + _request.fallbackTransport + ' and resending ' + message);
        _pushAjaxMessage(message);
      }
    }

    function _localMessage (message) {
      let m = util.parseJSON(message);
      if (m.id !== guid) {
        if (typeof (_request.onLocalMessage) !== 'undefined') {
          _request.onLocalMessage(m.event);
        } else if (typeof (util.onLocalMessage) !== 'undefined') {
          util.onLocalMessage(m.event);
        }
      }
    }

    function _prepareCallback (messageBody, state, errorCode, transport) {
      _response.responseBody = messageBody;
      _response.transport = transport;
      _response.status = errorCode;
      _response.state = state;

      _invokeCallback();
    }

    function _readHeaders (xdr, request) {
      if (!request.readResponsesHeaders) {
        if (!request.enableProtocol) {
          request.uuid = guid;
        }
      } else {
        try {
          let tempUUID = xdr.getResponseHeader('X-Atmosphere-tracking-id');
          if (tempUUID && tempUUID != null) {
            request.uuid = tempUUID.split(' ').pop();
          }
        } catch (e) {
          // ignore
        }
      }
    }

    function _invokeFunction (response) {
      _f(response, _request);
      // Global
      _f(response, util);
    }

    function _f (response, f) {
      switch (response.state) {
        case 'messageReceived':
          _debug('Firing onMessage');
          _requestCount = 0;
          if (typeof (f.onMessage) !== 'undefined') {
            f.onMessage(response);
          }

          if (typeof (f.onmessage) !== 'undefined') {
            f.onmessage(response);
          }
          break;
        case 'error':
          let dbgReasonPhrase = (typeof (response.reasonPhrase) !== 'undefined') ? response.reasonPhrase : 'n/a';
          _debug('Firing onError, reasonPhrase: ' + dbgReasonPhrase);
          if (typeof (f.onError) !== 'undefined') {
            f.onError(response);
          }

          if (typeof (f.onerror) !== 'undefined') {
            f.onerror(response);
          }
          break;
        case 'opening':
          delete _request.closed;
          _debug('Firing onOpen');
          if (typeof (f.onOpen) !== 'undefined') {
            f.onOpen(response);
          }

          if (typeof (f.onopen) !== 'undefined') {
            f.onopen(response);
          }
          break;
        case 'messagePublished':
          _debug('Firing messagePublished');
          if (typeof (f.onMessagePublished) !== 'undefined') {
            f.onMessagePublished(response);
          }
          break;
        case 're-connecting':
          _debug('Firing onReconnect');
          if (typeof (f.onReconnect) !== 'undefined') {
            f.onReconnect(_request, response);
          }
          break;
        case 'closedByClient':
          _debug('Firing closedByClient');
          if (typeof (f.onClientTimeout) !== 'undefined') {
            f.onClientTimeout(_request);
          }
          break;
        case 're-opening':
          delete _request.closed;
          _debug('Firing onReopen');
          if (typeof (f.onReopen) !== 'undefined') {
            f.onReopen(_request, response);
          }
          break;
        case 'fail-to-reconnect':
          _debug('Firing onFailureToReconnect');
          if (typeof (f.onFailureToReconnect) !== 'undefined') {
            f.onFailureToReconnect(_request, response);
          }
          break;
        case 'unsubscribe':
        case 'closed':
          let closed = typeof (_request.closed) !== 'undefined' ? _request.closed : false;

          if (!closed) {
            _debug('Firing onClose (' + response.state + ' case)');
            if (typeof (f.onClose) !== 'undefined') {
              f.onClose(response);
            }

            if (typeof (f.onclose) !== 'undefined') {
              f.onclose(response);
            }
          } else {
            _debug('Request already closed, not firing onClose (' + response.state + ' case)');
          }
          _request.closed = true;
          break;
        case 'openAfterResume':
          if (typeof (f.onOpenAfterResume) !== 'undefined') {
            f.onOpenAfterResume(_request);
          }
          break;
      }
    }

    function _invokeClose (wasOpen) {
      if (_response.state !== 'closed') {
        _response.state = 'closed';
        _response.responseBody = '';
        _response.messages = [];
        _response.status = !wasOpen ? 501 : 200;
        _invokeCallback();
      }
    }

    /**
     * Invoke request callbacks.
     *
     * @private
     */
    function _invokeCallback () {
      let call = function (index, func) {
        func(_response);
      };

      if (_localStorageService == null && _localSocketF != null) {
        _localSocketF(_response.responseBody);
      }

      _request.reconnect = _request.mrequest;

      let isString = typeof (_response.responseBody) === 'string';
      let messages = (isString && _request.trackMessageLength) ? (_response.messages.length > 0 ? _response.messages : ['']) : new Array(
        _response.responseBody);
      for (let i = 0; i < messages.length; i++) {
        if (messages.length > 1 && messages[i].length === 0) {
          continue;
        }
        _response.responseBody = (isString) ? util.trim(messages[i]) : messages[i];

        if (_localStorageService == null && _localSocketF != null) {
          _localSocketF(_response.responseBody);
        }

        if ((_response.responseBody.length === 0 ||
          (isString && _heartbeatPadding === _response.responseBody)) && _response.state === 'messageReceived') {
          continue;
        }

        _invokeFunction(_response);

        // Invoke global callbacks
        if (callbacks.length > 0) {
          if (_canLog('debug')) {
            util.debug('Invoking ' + callbacks.length + ' global callbacks: ' + _response.state);
          }
          try {
            util.each(callbacks, call);
          } catch (e) {
            util.log(_request.logLevel, ['Callback exception' + e]);
          }
        }

        // Invoke request callback
        if (typeof (_request.callback) === 'function') {
          if (_canLog('debug')) {
            util.debug('Invoking request callbacks');
          }
          try {
            _request.callback(_response);
          } catch (e) {
            util.log(_request.logLevel, ['Callback exception' + e]);
          }
        }
      }
    }

    this.subscribe = function (options) {
      _subscribe(options);
      _execute();
    };

    this.execute = function () {
      _execute();
    };

    this.close = function () {
      _close();
    };

    this.disconnect = function () {
      _disconnect();
    };

    this.getUrl = function () {
      return _request.url;
    };

    this.push = function (message, dispatchUrl) {
      if (dispatchUrl != null) {
        let originalDispatchUrl = _request.dispatchUrl;
        _request.dispatchUrl = dispatchUrl;
        _push(message);
        _request.dispatchUrl = originalDispatchUrl;
      } else {
        _push(message);
      }
    };

    this.getUUID = function () {
      return _request.uuid;
    };

    this.pushLocal = function (message) {
      _intraPush(message);
    };

    this.enableProtocol = function (message) {
      return _request.enableProtocol;
    };

    this.init = function () {
      _init();
    };

    this.request = _request;
    this.response = _response;
  }
};

Atmosphere.subscribe = function (url, callback, request) {
  if (typeof (callback) === 'function') {
    Atmosphere.addCallback(callback);
  }

  if (typeof (url) !== 'string') {
    request = url;
  } else {
    request.url = url;
  }

  // https://github.com/Atmosphere/atmosphere-javascript/issues/58
  uuid = ((typeof (request) !== 'undefined') && typeof (request.uuid) !== 'undefined') ? request.uuid : 0;

  let rq = new Atmosphere.AtmosphereRequest(request);
  rq.execute();

  requests[requests.length] = rq;
  return rq;
};

Atmosphere.unsubscribe = function () {
  if (requests.length > 0) {
    let requestsClone = [].concat(requests);
    for (let i = 0; i < requestsClone.length; i++) {
      let rq = requestsClone[i];
      rq.close();
      clearTimeout(rq.response.request.id);

      if (rq.heartbeatTimer) {
        clearTimeout(rq.heartbeatTimer);
      }
    }
  }
  requests = [];
  callbacks = [];
};

Atmosphere.unsubscribeUrl = function (url) {
  let idx = -1;
  if (requests.length > 0) {
    for (let i = 0; i < requests.length; i++) {
      let rq = requests[i];

      // Suppose you can subscribe once to an url
      if (rq.getUrl() === url) {
        rq.close();
        clearTimeout(rq.response.request.id);

        if (rq.heartbeatTimer) {
          clearTimeout(rq.heartbeatTimer);
        }

        idx = i;
        break;
      }
    }
  }
  if (idx >= 0) {
    requests.splice(idx, 1);
  }
};

Atmosphere.addCallback = function (func) {
  if (util.inArray(func, callbacks) === -1) {
    callbacks.push(func);
  }
};

Atmosphere.removeCallback = function (func) {
  let index = util.inArray(func, callbacks);
  if (index !== -1) {
    callbacks.splice(index, 1);
  }
};

// Browser sniffing
(function () {
  const ua = navigator.userAgent.toLowerCase();
  const match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
      /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
      /(msie) ([\w.]+)/.exec(ua) ||
      /(trident)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
      ua.indexOf('android') < 0 && /version\/(.+) (safari)/.exec(ua) ||
      ua.indexOf('compatible') < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
      [];

  // Swaps variables
  if (match[2] === 'safari') {
    match[2] = match[1];
    match[1] = 'safari';
  }
  util.browser[match[1] || ''] = true;
  util.browser.version = match[2] || '0';
  util.browser.vmajor = util.browser.version.split('.')[0];

  // Trident is the layout engine of the Internet Explorer
  // IE 11 has no "MSIE: 11.0" token
  if (util.browser.trident) {
    util.browser.msie = true;
  }

  // The storage event of Internet Explorer and Firefox 3 works strangely
  if (util.browser.msie || (util.browser.mozilla && +util.browser.version.split('.')[0] === 1)) {
    util.storage = false;
  }
})();

util.on(window, 'unload', function (event) {
  util.debug(new Date() + ' Atmosphere: ' + 'unload event');
  Atmosphere.unsubscribe();
});

util.on(window, 'beforeunload', function (event) {
  util.debug(new Date() + ' Atmosphere: ' + 'beforeunload event');

  // ATMOSPHERE-JAVASCRIPT-143: Delay reconnect to avoid reconnect attempts before an actual unload (we don't know if an unload will happen, yet)
  Atmosphere._beforeUnloadState = true;
  setTimeout(function () {
    util.debug(new Date() + ' Atmosphere: ' + 'beforeunload event timeout reached. Reset _beforeUnloadState flag');
    Atmosphere._beforeUnloadState = false;
  }, 5000);
});

// Pressing ESC key in Firefox kills the connection
// for your information, this is fixed in Firefox 20
// https://bugzilla.mozilla.org/show_bug.cgi?id=614304
util.on(window, 'keypress', function (event) {
  if (event.charCode === 27 || event.keyCode === 27) {
    if (event.preventDefault) {
      event.preventDefault();
    }
  }
});

util.on(window, 'offline', function () {
  util.debug(new Date() + ' Atmosphere: offline event');
  offline = true;
  if (requests.length > 0) {
    let requestsClone = [].concat(requests);
    for (let i = 0; i < requestsClone.length; i++) {
      let rq = requestsClone[i];
      if (rq.request.handleOnlineOffline) {
        rq.close();
        clearTimeout(rq.response.request.id);

        if (rq.heartbeatTimer) {
          clearTimeout(rq.heartbeatTimer);
        }
      }
    }
  }
});

util.on(window, 'online', function () {
  util.debug(new Date() + ' Atmosphere: online event');
  if (requests.length > 0) {
    for (let i = 0; i < requests.length; i++) {
      if (requests[i].request.handleOnlineOffline) {
        requests[i].init();
        requests[i].execute();
      }
    }
  }
  offline = false;
});

export const AtmosphereRequest = Atmosphere.AtmosphereRequest;
export default Atmosphere;
