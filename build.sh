#!/bin/bash

rm -rf src/* docs/*
node index.js
cp redirects/* docs/
# git commit
# git push
