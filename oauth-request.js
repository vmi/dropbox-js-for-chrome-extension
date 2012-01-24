/*
 * Copyright (c) 2011-2012, IWAMURO Motonori
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 *   1. Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 * 
 *   2. Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

var OAuthRequest = (function() {

  //
  // Constants
  //
  var _CRLF = "\r\n";

  var RT_JSON = "json";
  var RT_TEXT = "text";
  var RT_ARRAYBUFFER = "arraybuffer";

  //
  // Private functions
  //
  var _saveRequestToken = function(self, token, secret) {
    self.requestToken = token;
    self.requestTokenSecret = secret;
  };

  var _saveAccessToken = function(self, token, secret) {
    self.accessToken = token;
    self.accessTokenSecret = secret;
    var key = self.appId + ":" + self.consumerKey;
    localStorage[key] = btoa(token + "\n" + secret);
  };

  var _loadAccessToken = function(self) {
    var key = self.appId + ":" + self.consumerKey;
    var pair = localStorage[key];
    if (pair) {
      pair = atob(pair).split(/\n/);
      self.accessToken = pair[0];
      self.accessTokenSecret = pair[1];
    }
  };

  var _resetTokens = function(self) {
    delete self.requestToken;
    delete self.requestTokenSecret;
    delete self.accessToken;
    delete self.accessTokenSecret;
    delete localStorage[self.appId + ":" + self.consumerKey];
  };

  var _oauthMessage = function(self, method, url, data) {
    var message = {
      method: method,
      action: url,
      parameters: {
        oauth_consumer_key: self.consumerKey,
        oauth_signature_method: "HMAC-SHA1"
      }
    };
    var accessor = {
      consumerSecret: self.consumerSecret
    };

    if (self.accessToken) {
      message.parameters.oauth_token = self.accessToken;
      accessor.tokenSecret = self.accessTokenSecret;
    } else if (self.requestToken) {
      message.parameters.oauth_token = self.requestToken;
      accessor.tokenSecret = self.requestTokenSecret;
    }

    if (data) {
      for (var key in data)
        message.parameters[key] = data[key];
    }

    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, accessor);

    return message;
  };

  var _indent = function(level) {
    var indent = "";
    for (var i = 0; i < level; ++i)
      indent += "  ";
    return indent;
  };

  var _objectToString = function(object, level) {
    if (!level)
      level = 0;
    var buffer = "";
    for (var key in object) {
      var value = object[key];
      if (typeof value === "string") {
        buffer += _indent(level) + key + "=[" + value + "]\n";
      } else {
        buffer += _indent(level) + key + "=[\n" +
          _objectToString(value, level + 1) +
          _indent(level) + "]\n";
      }
    }
    return buffer;
  };

  var _defaultError = function(result, status, xhr) {
    var message = _objectToString(result);
    console.log(message);
    alert(message);
  };

  //  responseType = RT_JSON, RT_TEXT or RT_ARRAYBUFFER
  var _xhrRequest = function(method, url, params, body, responseType,
                             success, error) {
    var xhr = new XMLHttpRequest();
    var ctype = null;
    if (params) {
      var pList = [];
      for (var key in params)
        pList.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
      params = (pList.length > 0) ? pList.join("&").replace(/%20/g, "+") : null;
    }
    switch (method) {
    case "GET": case "HEAD":
      if (params)
        url += "?" + params;
      break;

    case "POST":
      ctype = "application/x-www-form-urlencoded";
      body = params;
      break;

    case "PUT":
      if (params)
        url += "?" + params;
      if (typeof body === "string")
        ctype = "text/plain; charset=UTF-8";
      break;

    default:
      break;
    }
    xhr.open(method, url, true);
    if (ctype)
      xhr.setRequestHeader("Content-Type", ctype); // can't call before open
    switch (responseType) {
    case RT_JSON:
      xhr.setRequestHeader("Accept", "application/json, */*");
      xhr.responseType = RT_TEXT;
      break;

    case RT_TEXT:
      xhr.setRequestHeader("Accept", "text/*, */*");
      xhr.responseType = RT_TEXT;
      break;

    case RT_ARRAYBUFFER:
      xhr.setRequestHeader("Accept", "*/*");
      xhr.responseType = RT_ARRAYBUFFER;
      break;

    default:
      throw "Error: Unsupported response type: " + responseType;
    }
    xhr.onreadystatechange = function() {
      // readyState: 0=UNSENT,1=OPENED,2=HEADERS_RECEIVED,3=LOADING,4=DONE
      if (this.readyState == 4) {
        var result = this.response;
        if (this.status == 200) { // OK
          switch (responseType) {
          case RT_JSON:
            result = JSON.parse(result);
            break;

          case RT_ARRAYBUFFER:
            var bb = new WebKitBlobBuilder();
            bb.append(result);
            var ct = this.getResponseHeader("Content-Type");
            result = bb.getBlob(ct);
            break;

          default:
            break;
          }
          success(result, this.status, this);
        } else { // Error
          try {
            result = JSON.parse(result);
          } catch (e) {
            // ignore
          }
          error(result, this.status, this);
        }
      }
    };
    xhr.send(body);
  };

  //
  // Class Definition
  //
  var _class = function OAuthRequest() {};

  //
  // Export Constants
  //
  _class.RT_JSON = RT_JSON;
  _class.RT_TEXT = RT_TEXT;
  _class.RT_ARRAYBUFFER = RT_ARRAYBUFFER;

  //
  // Method Definitions
  //
  var _methods = {
    // Initialize
    initialize: function initialize(appId, consumerKey, consumerSecret) {
      this.appId = appId;
      if (consumerSecret) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
      } else {
        var pair = atob(consumerKey).split(/\n/);
        this.consumerKey = pair[0];
        this.consumerSecret = pair[1];
      }
      _loadAccessToken(this);
      this.defaultError = _defaultError;
      return this;
    }

    ,setDefaultError: function setDefaultError(defaultError) {
      this.defaultError = defaultError;
    }

    // Send OAuth'ed request
    ,request: function request(method, url, data, responseType, success, error) {
      var body = null;
      if (data instanceof Array) {
        body = data[1];
        data = data[0];
      }
      var message = _oauthMessage(this, method, url, data);
      _xhrRequest(method, url, OAuth.getParameterMap(message.parameters),
                  body, responseType, success, error || this.defaultError);
    }

    // Authorize
    ,authorize: function authorize(oauth, success, error) {
      if (this.accessToken) {
        success();
        return;
      }

      var self = this;
      var getToken = function(url, saveToken, next) {
        self.request("GET", url, null, RT_TEXT, function(data) {
          // Success
          var pairs = data.split(/&/);
          var result = {};
          for (var i in pairs) {
            var pair = pairs[i].split(/=/, 2);
            result[pair[0]] = pair[1];
          }
          saveToken(self, result.oauth_token, result.oauth_token_secret);
          if (next)
            next();
        }, error);
      };

      getToken(
        oauth.requestTokenUrl, _saveRequestToken,
        function() {
          var authWindowId;
          var isSuccess = false;
          var onRequest = function(request, sender, callback) {
            if (sender.tab.windowId != authWindowId)
              return;
            if (onRequest) {
              chrome.extension.onRequest.removeListener(onRequest);
              onRequest = null;
            }
            if (request.isSuccess) {
              isSuccess = true;
              setTimeout(function() { chrome.windows.remove(authWindowId); }, 1000);
              getToken(oauth.accessTokenUrl, _saveAccessToken, success);
            }
          };
          chrome.extension.onRequest.addListener(onRequest);
          chrome.windows.onRemoved.addListener(function(windowId) {
            if (windowId == authWindowId && onRequest) {
              chrome.extension.onRequest.removeListener(onRequest);
              onRequest = null;
              if (!isSuccess)
                error({ error: "Authorization refused." }, {});
            }
          });
          var page = oauth.authorizePage;
          chrome.windows.create({
            url: page.url(self.requestToken),
            width: page.width, height: page.height,
            focused: true, type: "popup"
          }, function(window) {
            authWindowId = window.id;
          });
        }
      );
    }

    // Deauthorize
    ,deauthorize: function deauthorize() {
      _resetTokens(this);
    }
  };

  for (var name in _methods)
    _class.prototype[name] = _methods[name];

  return _class;
})();

// https://github.com/mooz/js2-mode
//
// Local Variables:
// mode: js2
// js2-basic-offset: 2
// indent-tabs-mode: nil
// End:
