const { join } = require("path");
const {
  mkdirSync, writeFileSync, copyFileSync, createWriteStream
} = require("fs");
const { copySync } = require("fs-extra");
const { readdir } = require("fs").promises;
const compressor = require("yuicompressor");
const https = require("https");
const axios = require("axios");
// const rimraf = require("rimraf");
const unzipper = require("unzipper");

const rootPageId = "44696055";
const exportSchemeId = "-020B004813A10F3831A9D8C9A7869275";

const baseurl = process.env.PERS_WIKI_HOME;
const username = process.env.PERS_WIKI_USER;
const password = process.env.PERS_WIKI_PASSWORD;
const charset = "utf8";
const target = "docs";

axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });
axios.defaults.auth = { username, password };
axios.defaults.headers = { 'x-atlassian-token': 'no-check' };

async function startExport() {
  return axios.get(`${baseurl}/rest/scroll-html/1.0/export`, { params: { exportSchemeId, rootPageId }});
}

async function checkStatus(exportId) {
  return axios.get(`${baseurl}/rest/scroll-html/1.0/async-tasks/${exportId}`);
}

async function downloadFile(exportId, filename) {
  console.debug(`Downloading ${baseurl}/rest/scroll-html/1.0/export/${exportId}/${encodeURIComponent(filename)}`);
  return new Promise(async (resolve) => {
    const resp = await axios.get(`${baseurl}/rest/scroll-html/1.0/export/${exportId}/${encodeURIComponent(filename)}`, {
      responseType: 'stream'
    });
    const extract = unzipper.Extract({ path: 'src/' });
    await resp.data.pipe(extract);
    extract.on('finish', () => resolve());
  });
}

const sleep = async (ms) => new Promise(resolve => setTimeout(() => resolve(), ms));

async function exportPages() {
  const resp = await startExport();
  const exportId = resp.data.id;

  let status;
  do {
    await sleep(1000);
    status = await checkStatus(exportId);
    console.debug(`Progress: ${status.data.progress}`);
  } while (!status.data.filename);

  // rimraf.sync('src/*');
  await downloadFile(exportId, status.data.filename);
  await sleep(1000);
}

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
  // Export the space
  await exportPages();

  // Process all files
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

  // Copy redirects
  copySync('redirects', 'src');
}

main();
