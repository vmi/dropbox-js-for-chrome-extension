/*
 * Copyright (c) 2011, IWAMURO Motonori
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

  var _defaultError = function(result) {
    var message = _objectToString(result);
    console.log(message);
    alert(message);
  };

  //  responseType = RT_JSON, RT_TEXT or RT_ARRAYBUFFER
  var _xhrRequest = function(method, url, data, responseType, success, error) {
    var xhr = new XMLHttpRequest();
    var qs = null;
    if (data) {
      var qslist = [];
      for (var key in data)
        qslist.push(encodeURIComponent(key) + "=" + encodeURIComponent(data[key]));
      if (qslist.length > 0)
        qs = qslist.join("&").replace(/%20/g, "+");
    }
    if (method == "GET" && qs) {
      url += "?" + qs;
      qs = null;
    }
    xhr.open(method, url, true);
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
          success(result, this);
        } else { // Error
          try {
            result = JSON.parse(result);
          } catch (e) {
            // ignore
          }
          error(result, this);
        }
      }
    };
    if (qs) {
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.send(qs);
    } else {
      xhr.send();
    }
  };

  var _randHex7 = function() {
    // The accuracy of Math.random() in Chrome is 30bits?
    return ("000000" + Math.floor(Math.random() * (1 << 28)).toString(16)).slice(-7);
  };

  var _generateBoundary = function() {
    // 34 + (7 + 2) * 5 = 70
    return "----------------------------------" +
      _randHex7() + "--" +
      _randHex7() + "--" +
      _randHex7() + "--" +
      _randHex7() + "--";
  };

  var _xhrRequestMultipart = function(url, data, filename, content, success, error) {
    var xhr = new XMLHttpRequest();

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Accept", "application/json, */*");

    xhr.onreadystatechange = function() {
      // readyState: 0=UNSENT,1=OPENED,2=HEADERS_RECEIVED,3=LOADING,4=DONE
      if (this.readyState == 4) {
        var result = this.responseText;
        try {
          result = JSON.parse(result);
        } catch (e) {
          // no operation
        }
        if (this.status == 200) // OK
          success(result, this);
        else // Error
          error(result, this);
      }
    };

    var boundary;
    do {
      boundary = _generateBoundary();
    } while (content.indexOf(boundary) >= 0);
    xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

    var body = "";
    for (var key in data) {
      var value = data[key];
      body += "--" + boundary + _CRLF +
        'Content-Disposition: form-data; name="' + key + '"' + _CRLF +
        _CRLF +
        value + _CRLF;
    }
    body += "--" + boundary + _CRLF +
      'Content-Disposition: form-data; name=file; filename="' + filename + '"' + _CRLF +
      "Content-type: application/octet-stream" + _CRLF +
      _CRLF +
      content + _CRLF +
      "--" + boundary + "--";

    xhr.send(body);
  };

  //
  // Constructor
  //
  var _class = function(appId, consumerKnS, defaultError) {
    this.appId = appId;
    var pair = atob(consumerKnS).split(/\n/);
    this.consumerKey = pair[0];
    this.consumerSecret = pair[1];
    _loadAccessToken(this);
    this.defaultError = defaultError || _defaultError;
  };

  //
  // Export Constants
  //
  _class.RT_JSON = RT_JSON;
  _class.RT_TEXT = RT_TEXT;
  _class.RT_ARRAYBUFFER = RT_ARRAYBUFFER;

  //
  // Method Definitions
  //
  _class.prototype = {
    // Send OAuth'ed request
    request: function(method, url, data, responseType, success, error) {
      var message = _oauthMessage(this, method, url, data);
      _xhrRequest(method, url, OAuth.getParameterMap(message.parameters),
                  responseType, success, error || this.defaultError);
    }

    // Send OAuth'ed multipart request (POST only)
    ,requestMultipart: function(url, filename, content, success, error) {
      var message = _oauthMessage(this, "POST", url);
      _xhrRequestMultipart(url, message.parameters, filename, content,
                           success, error || this.defaultError);
    }

    // Authorize
    ,authorize: function(oauth, success, error) {
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

    // Unauthorize
    ,unauthorize: function() {
      _resetTokens(this);
    }
  };

  return _class;
})();

// https://github.com/mooz/js2-mode
//
// Local Variables:
// mode: js2
// js2-basic-offset: 2
// indent-tabs-mode: nil
// End:
