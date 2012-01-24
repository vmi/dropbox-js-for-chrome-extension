#!/bin/bash

### mount current directory to specified drive for Cygwin
###
### Usage: mount.sh [DRIVE_LETTER|-d]

if [ $# = 0 ]; then
  echo "Usage: $0 [DRIVE_LETTER|-d]

  DRIVE_LETTER = mount current directory to the drive.
  -d = unmount mounted drive.

* Current mounted drive(s):"
  subst
  exit
fi

mp=.mounted

case "$1" in
[A-Za-z])
  drive=$1:
  ;;
[A-Za-z]:)
  ;;
-d)
  if [ ! -f $mp ]; then
    echo "Not mount."
    exit
  fi
  drive=$(cat $mp)
  if [ $(subst | grep -c ^$drive) -gt 0 ]; then
    subst $drive /d
    echo "Unmounted: $drive"
    subst
  else
    echo "Not mount."
    rm -f $mp
  fi
  exit
  ;;
*)
  echo "Usage: $0 [DRIVE_LETTER|-d]"
  echo ""
  echo "Error: Unknown drive [$1]"
  exit 1
  ;;
esac

if [ -f $mp -a $(subst | wc -l) -gt 0 ]; then
  echo "Error: already mounted."
  subst
  exit 1
fi

drive=$(echo $drive | tr a-z A-Z)

subst $drive "$(cygpath -aw .)"
echo $drive > $mp
echo "Mounted:"
subst

