"use strict";
let helpers = require("./helpers");
let async = helpers.async;
let _ = require("lodash");
let debug = require("debug")("distURClient:storage");
let Client = require("./client");
let assert = require("better-assert");
let Bluebird = require("bluebird");
let path = require("path");
let util = require("util");

function StorageProvider (client, options) {
    assert(client instanceof Client);
    this.client = client;
    this.options = options || {};
    this.connected = false;
    this._provider = null;
}

Object.defineProperties(StorageProvider.prototype, {
    providerName: {
        get: function () {
            return this._provider ? this._provider.name : null;
        }
    }
});

StorageProvider.prototype.connect = async(function*() {
    if (this.connected) {
        return;
    }
    if (this.options.storageProvider) {
        yield this._connectTo(this.options.storageProvider);
    }
    else {
        yield this._connectToAnything();
    }
});

StorageProvider.prototype._connectToAnything = async(function*() {
    debug("Connectiong to an available storage provider.");
    let providerNames = yield this.client.call("getConnectedStorageProviderNames", []);
    debug(`Available providers: ${providerNames.join(",")}`);
    let providers = [];
    for (let providerName of providerNames) {
        let token;
        try {
            debug(`Getting access token for provider: '${providerName}'`);
            token = yield this.client.call("getStorageAccessToken", [providerName]);
            debug(`Token's got.`);
        }
        catch (e) {
            if (e.error === "not-found") {
                // Not connected.
                debug("No token, not connected.");
                continue;
            }
            throw e;
        }
        let ProviderClass = require("./" + providerName + "Provider");
        providers.push(new ProviderClass(this.client, token, this.options));
        debug("Provider created.");
    }
    if (providers.length) {
        debug("Finding provider with maximum available storage space.");
        let maxAvail = 0;
        let maxProvider = null;
        if (providers.length > 1) {
            for (let provider of providers) {
                let avail = yield provider.getAvailableSpace();
                debug(`${provider.name} has ${avail} bytes free.`);
                if (avail > maxAvail) {
                    maxAvail = avail;
                    maxProvider = provider;
                }
            }
        }
        else {
            maxProvider = providers[0];
        }
        debug(`${maxProvider.name} has been choosen.`);
        this._connected(maxProvider);
    }
    else {
        throw new Error("User has no useable storage provider connection.");
    }
});

StorageProvider.prototype._connectTo = async(function*(providerName) {
    debug(`Connection to ${providerName}.`);
    let token = yield this.client.call("getStorageAccessToken", [providerName]);
    let ProviderClass = require("./" + providerName + "Provider");
    this._connected(new ProviderClass(this.client, token, this.options));
    debug("Connected.");
});

StorageProvider.prototype._connected = function (provider) {
    this._provider = provider;
    this.connected = true;
};

StorageProvider.prototype.updateNativeModuleFiles = async(function*(nativeModuleInfo, progressCallback) {
    let filesToStore = {
        rootPath: path.join(
            nativeModuleInfo.package.name + "@" + nativeModuleInfo.package.version,
            nativeModuleInfo.runtime.name + "-v" + nativeModuleInfo.runtime.version,
            nativeModuleInfo.os.platform + "-" + nativeModuleInfo.os.release + "-" + nativeModuleInfo.os.arch),
        files: nativeModuleInfo.files.map(function (fullFilePath) {
            return {
                fullFilePath: fullFilePath,
                relFilePath: fullFilePath.substr(nativeModuleInfo.rootPath.length).replace(new RegExp("\\" + path.sep, "g"), "/")
            };
        })
    };
    debug(`Updating ${filesToStore.files.length} files.`);
    yield this.connect();
    let updated = yield this._provider.updateNativeModuleFiles(filesToStore, async(function*(value, max) {
        debug(`Update progress: ${value}/${max}`);
        yield Bluebird.resolve(progressCallback ? progressCallback(value, max) : undefined);
    }));
    if (updated) {
        return {
            rootPath: filesToStore.rootPath,
            files: filesToStore.files.map(function(f) { return f.relFilePath; }),
            package: nativeModuleInfo.package,
            runtime: nativeModuleInfo.runtime,
            os: nativeModuleInfo.os
        };
    }
    return null;
});

module.exports = StorageProvider;