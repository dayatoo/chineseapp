#!/bin/sh
# Downloads the raw data used by scripts/build-db.mjs into data/raw/ (not committed).
set -e
mkdir -p data/raw
curl -sSfL -o data/raw/dictionary.txt \
  https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt
curl -sSfL -o data/raw/hsk-complete.min.json \
  https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json
echo "Downloaded raw data to data/raw/"
