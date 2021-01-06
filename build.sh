#!/bin/bash

rm -rf src/* docs/*
node index.js
cp redirects/* docs/
cp -r landing/* docs/
# git commit
# git push
