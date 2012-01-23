#!/bin/bash

###
### JavaScript syntax checker using Google Closure Compiler
###

cljar=../google-closure-compiler/compiler.jar

if java -version 2> /dev/null; then
  :
else
  echo "Error: JavaVM is not found."
  echo "Abort."
  exit 1
fi

if [ ! -f "$cljar" ]; then
  echo "Error: Missing Google Closure Compiler."
  echo "Abort."
  exit 1
fi

case $(uname -o) in
Cygwin)
  null=nul
  ;;
*)
  null=/dev/null
  ;;
esac

cl() {
  java -jar "$cljar" "$@"
}

set -x
cl --compilation_level SIMPLE_OPTIMIZATIONS \
   --js sha1.js \
   --js oauth.js \
   --js oauth-request.js \
   --js dropbox.js \
   --js jquery.js \
   --js example.js \
   --js_output_file $null
