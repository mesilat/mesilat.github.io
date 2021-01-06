#!/bin/bash

rm -rf src/* docs/*
node index.js
cp redirects/* docs/
cp -r ../../www-mesilat-com/dist/* docs/
# git commit
# git push
