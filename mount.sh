#!/bin/bash

subst X: "$(cygpath -aw .)" | iconv -f cp932 -t utf-8
