"use strict";
let helpers = require("./helpers");
let async = helpers.async;
let _ = require("lodash");
let debug = require("debug")("distURClient:dropbox");
let Client = require("./client");
let assert = require("better-assert");
let Bluebird = require("bluebird");
let Dropbox = require("dropbox");
let urljoin = require("urljoin");
let fs = Bluebird.promisifyAll(require("fs-extra"));
let util = require("util");

function DropboxProvider(client, token, options) {
    assert(client instanceof Client);
    this.name = "dropbox";
    this.client = client;
    this.options = options || {};
    this._dbClient = Bluebird.promisifyAll(new Dropbox.Client({token: token}));
}

DropboxProvider.prototype.getAvailableSpace = async(function*() {
    debug(`Getting account info.`);
    let accountInfo = yield this._dbClient.getAccountInfoAsync();
    debug(`Result: ${util.inspect(accountInfo)}`);
    let space = accountInfo.quota - accountInfo.usedQuota;
    debug(`Available space: ${space} bytes.`);
    return space;
});

DropboxProvider.prototype.updateNativeModuleFiles = async(function*(filesToStore, progressCallback) {
    let todo = [];
    let uploads = 0, processed = 0;
    debug(`Updating ${filesToStore.files.length} files in Dropbox.`);
    yield progressCallback(0, filesToStore.files.length);
    for (let fileInfo of filesToStore.files) {
        let dbFilePath = urljoin(filesToStore.rootPath, fileInfo.relFilePath);
        debug(`Checking Dropbox path: '${dbFilePath}'`);
        let upload = false;
        try {
            debug("Getting stat.");
            let stat = (yield this._dbClient.statAsync(dbFilePath))[0];
            if (stat) {
                if (stat.isFolder) {
                    debug("This is a folder, removing.");
                    yield this._dbClient.removeAsync(dbFilePath);
                    upload = true;
                }
                else {
                    let fstat = yield fs.statAsync(fileInfo.fullFilePath);
                    if (fstat.size !== stat.size) {
                        debug(`This is a file but size is mismatch (size in filesystem: ${fstat.size}, size in Dropbox: ${stat.size}), removing.`);
                        yield this._dbClient.removeAsync(dbFilePath);
                        upload = true;
                    }
                }
            }
            else {
                debug("Got NULL as stat. File doesn't exists in Dropbox.");
                upload = true;
            }
        }
        catch (e) {
            if (e.status !== Dropbox.ApiError.NOT_FOUND) {
                throw e;
            }
            debug("Got NOT_FOUND. File doesn't exists in Dropbox.");
            upload = true;
        }
        if (upload) {
            debug(`Uploading: ${fileInfo.fullFilePath}`);
            let buff = yield fs.readFileAsync(fileInfo.fullFilePath);
            yield this._dbClient.writeFileAsync(dbFilePath, buff);
            uploads++;
        }
        yield progressCallback(++processed, filesToStore.files.length);
    }
    debug("Completed.");

    return uploads > 0;
});

module.exports = DropboxProvider;