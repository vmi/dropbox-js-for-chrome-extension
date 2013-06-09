window.onload = function() {
  var $ = function(id) { return document.getElementById(id); };
  if (location.search.length == 0) {
    // before ahtorizing
    $("before").style.display = "block";
    chrome.runtime.sendMessage(null, { type: "GET_URL" }, function(url) {
      location.href = url + "&oauth_callback=" + encodeURIComponent(location.href);
    });
  } else {
    // callbacked
    var message = {};
    location.search.substring(1).split(/&/).forEach(function(e) {
      var kv = e.split(/=/, 2);
      message[kv[0]] = kv[1];
    });
    if (message.oauth_token) {
      $("after").style.display = "block";
      message.type = "AUTHORIZED";
      chrome.runtime.sendMessage(null, message);
    } else {
      $("close").addEventHandler(function() { window.close(); });
      $("error").style.display = "block";
    }
  }
};
