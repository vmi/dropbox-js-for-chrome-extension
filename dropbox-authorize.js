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

function isAuthorized() {
  // debugger;
  var i;
  var forms = document.getElementsByTagName("form");
  for (i in forms) {
    // Check inquiry page.
    var form = forms[i];
    if (form.action && form.action.match(/\/authorize$/)) {
      console.log("Skip inquiry page.");
      return;
    }
  }
  var auth = document.getElementById("auth");
  if (!auth) {
    console.log("#auth part not found.");
    return;
  }
  auth = auth.innerText;
  var successMessage = "Success!";
  var scripts = document.getElementsByTagName("script");
  for (i in scripts) {
    var script = scripts[i].innerText;
    if (!script)
      continue;
    var matched = script.match(/"Success!":[^}]*"t":\s*"([^"]*)"/);
    if (!matched)
      continue;
    successMessage = unescape(matched[1].replace(/\\u/g, "%u"));
    console.log("i18n message found: " + successMessage);
    break;
  }
  if (auth.indexOf(successMessage) >= 0) {
    console.log("Success! found.");
    chrome.extension.sendRequest({ isSuccess: true });
  }
}

isAuthorized();

// https://github.com/mooz/js2-mode
//
// Local Variables:
// mode: js2
// js2-basic-offset: 2
// indent-tabs-mode: nil
// End:
