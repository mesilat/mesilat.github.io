const { join } = require("path");
const { mkdirSync, writeFileSync, copyFileSync } = require("fs");
const { readdir } = require('fs').promises;
const compressor = require("yuicompressor");

const charset = "utf8";
const target = "docs";

async function listFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map(dirent => {
    const res = join(dir, dirent.name);
    return dirent.isDirectory() ? listFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function compress(file, type) {
  return new Promise((resolve, reject) => {
    const dest = [__dirname, target].concat(file.split("/").slice(1));
    const dir = [__dirname, target].concat(file.split("/").slice(1, -1));
    mkdirSync(join.apply(join, dir), { recursive: true });

    compressor.compress(file, {
        //Compressor Options:
        charset,
        type,
        nomunge: true,
        'line-break': 80
    }, function(err, data, extra) {
      //if (extra)
      //  console.debug(extra);

      if (err) {
        reject(err);
      } else if (data) {
        writeFileSync(join.apply(join, dest), data, charset);
        resolve();
      } else {
        reject(new Error("Empty data after compression"));
      }
    });
  });
}

function copy(file) {
  const dest = [__dirname, target].concat(file.split("/").slice(1));
  const dir = [__dirname, target].concat(file.split("/").slice(1, -1));
  mkdirSync(join.apply(join, dir), { recursive: true });
  copyFileSync(file, join.apply(join, dest));
}

function logSuccess(text) {
  console.log(text);
}
const FgRed = "\x1b[31m";
const Reset = "\x1b[0m";
function logError(text) {
  console.log(`${FgRed}${text}${Reset}`);
}

async function main() {
  const files = await listFiles("src");
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.endsWith(".js")) {
      try {
        await compress(file, "js");
        logSuccess(file);
      } catch(err) {
        copy(file);
        logError(file);
      }
    } else if (file.endsWith(".css")) {
      try {
        await compress(file, "css");
        logSuccess(file);
      } catch(err) {
        copy(file);
        logError(file);
      }
    } else {
      copy(file);
      logSuccess(file);
    }
  }
}

main();
