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

var Dropbox = (function() {

  //
  // Constants
  //

  // Can't use following characters in filename:
  //   Control-Code, [:] [,] [;] [*] [?] ["] [<] [>] [|]
  var _INVALID_PATH_NAME_PATTERN = /[\x00-\x1f\x7f:,;*?\"<>|]/;

  //
  // Private functions
  //
  var _canonPath = function(path) {
    if (path.match(_INVALID_PATH_NAME_PATTERN))
      throw "Error: Invalid character in path name.";
    return path.replace(/[\\\/]+/g, "/").replace(/^\//, "");
  };

  //
  // Constructor
  //
  var _class = function(consumerKnS, defaultError) {
    this.oauth = new OAuthRequest("Dropbox", consumerKnS, defaultError);
  };

  //
  // Method Definitions
  //
  _class.prototype = {

    // Authorize
    authorize: function(success, error) {
      this.oauth.authorize({
        requestTokenUrl: "https://www.dropbox.com/0/oauth/request_token",
        accessTokenUrl: "https://www.dropbox.com/0/oauth/access_token",
        authorizePage: {
          url: function(requestToken) {
            return "https://www.dropbox.com/0/oauth/authorize?oauth_token=" + requestToken;
          },
          width: 900, height: 600
        }
      }, success, error);
    }

    // Unauthorize
    ,unauthorize: function() {
      this.oauth.unauthorize();
    }

    // Get account information
    ,getAccountInfo: function(success, error) {
      var url = "https://api.dropbox.com/0/account/info";
      this.oauth.request("GET", url, null, OAuthRequest.RT_JSON, success, error);
    }

    // Get metadata
    ,getMetadata: function(path, success, error) {
      path = _canonPath(path);
      var url = "https://api.dropbox.com/0/metadata/dropbox/" + encodeURI(path);
      this.oauth.request("GET", url,
                         { list: false, status_in_response: true },
                         OAuthRequest.RT_JSON, success, error);
    }

    // Get metadata with item list
    ,getFolderContents: function(path, success, error) {
      path = _canonPath(path);
      var url = "https://api.dropbox.com/0/metadata/dropbox/" + encodeURI(path);
      this.oauth.request("GET", url,
                         { file_limit: 1000, list: true, status_in_response: true },
                         OAuthRequest.RT_JSON, success, error);
    }

    // Get file content
    ,getFile: function(path, success, error) {
      path = _canonPath(path);
      var url = "https://api-content.dropbox.com/0/files/dropbox/" + encodeURI(path);
      this.oauth.request("GET", url, null, OAuthRequest.RT_TEXT, success, error);
    }

    // Upload file content (UTF-8 text only)
    ,uploadFile: function(path, content, success, error) {
      var matched = _canonPath(path).match(/^(.*?)([^\/]+)$/);
      var dir = matched[1];
      var filename = matched[2];
      var url = "https://api-content.dropbox.com/0/files/dropbox/" + encodeURI(dir) +
            "?file=" + encodeURI(filename);
      this.oauth.requestMultipart(url, filename, content, success, error);
    }

    // Get thumbnail image (result type is Blob)
    ,getThumbnail: function(path, size, format, success, error) {
      path = _canonPath(path);
      var url = "https://api-content.dropbox.com/0/thumbnails/dropbox/" + encodeURI(path);
      this.oauth.request("GET", url,
                         { size: size, format: format },
                         OAuthRequest.RT_ARRAYBUFFER, success, error);
    }

    // Create folder
    ,createFolder: function(path, success, error) {
      path = _canonPath(path);
      this.oauth.request("POST", "https://api.dropbox.com/0/fileops/create_folder",
                         { root: "dropbox", path: path },
                         OAuthRequest.RT_JSON, success, error);
    }

    // Copy item
    ,copyItem: function(fromPath, toPath, success, error) {
      fromPath = _canonPath(fromPath);
      toPath = _canonPath(toPath);
      this.oauth.request("POST", "https://api.dropbox.com/0/fileops/copy",
                         { root: "dropbox", from_path: fromPath, to_path: toPath },
                         OAuthRequest.RT_JSON, success, error);
    }

    // Move item
    ,moveItem: function(fromPath, toPath, success, error) {
      fromPath = _canonPath(fromPath);
      toPath = _canonPath(toPath);
      this.oauth.request("POST", "https://api.dropbox.com/0/fileops/move",
                         { root: "dropbox", from_path: fromPath, to_path: toPath },
                         OAuthRequest.RT_JSON, success, error);
    }

    // Delete item
    ,deleteItem: function(path, success, error) {
      path = _canonPath(path);
      this.oauth.request("POST", "https://api.dropbox.com/0/fileops/delete",
                         { root: "dropbox", path: path },
                         OAuthRequest.RT_JSON, success, error);
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
