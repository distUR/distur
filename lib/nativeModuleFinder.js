"use strict";
let helpers = require("./helpers");
let async = helpers.async;
let _ = require("lodash");
let debug = require("debug")("distURClient:finder");
let assert = require("better-assert");
let Bluebird = require("bluebird");
let fs = Bluebird.promisifyAll(require("fs-extra"));
let path = require("path");
let SystemInfo = require("./systemInfo");

function NativeModuleFinder (options) {
    assert(_.isObject(options));
    assert(_.isString(this.rootPath.options));

    this.options = options;
    this.rootPath = this.options.rootPath;
    this._systemInfo = new SystemInfo(this.options);
}

NativeModuleFinder.prototype.find = async(function*() {
    let pjson = false;
    let nodeMods = false;
    let stat = null;

    debug(`Determining if '${this.rootPath}' is an application or a module folder.`);
    try {
        stat = yield fs.statAsync(path.join(this.rootPath, "package.json"));
        pjson = stat.isFile();
    }
    catch (e) {
    }

    if (pjson) {
        try {
            stat = yield fs.statAsync(path.join(this.rootPath, "node_modules"));
            nodeMods = stat.isDirectory();
        }
        catch (e) {
        }
    }

    let modulesDir = this.rootPath;
    if (pjson && nodeMods) {
        modulesDir = path.join(this.rootPath, "node_modules");
    }

    debug(`Modules folder '${modulesDir}'.`);

    return yield this._findIn(modulesDir);
});

NativeModuleFinder.prototype._findIn = async(function*(modulesDir) {
    let entries = new Map();
    let self = this;

    var findIn = async(function* (modulesDir) {
        let pkgInfo = self._loadPackageInfo(modulesDir);
        if (!entries.has(pkgInfo)) {
            let currentEntry = {
                package: pkgInfo,
                files: [],
                os: self._systemInfo.os,
                runtime: self._systemInfo.runtime
            };
            entries.set(pkgInfo, currentEntry);

            var findFiles = async(function*(currentPath) {
                let names = yield fs.readdirAsync(currentPath);
                for (let name of names) {
                    let fullPath = path.join(currentPath, name);
                    let stat = yield fs.statAsync(fullPath);
                    if (stat.isFile()) {
                        if (self._isAReleaseAddonFile(fullPath)) {
                            currentEntry.files.push(_.trim(fullPath.substr(modulesDir.length), "/"));
                        }
                    }
                    else if (stat.isDirectory()) {
                        if (name === "node_modules") {
                            if (self.options.recursive) {
                                yield findIn(fullPath);
                            }
                        }
                        else {
                            yield findFiles(fullPath);
                        }
                    }
                }
            });
            yield findFiles(modulesDir);
        }
    });

    yield findIn(modulesDir);

    return _.toArray(entries.values());
});

NativeModuleFinder.prototype._isAReleaseAddonFile = function(filePath) {
    if (path.extname(filePath) === ".node") {
        let ppath = path.dirname(filePath);
        let pname = path.basename(ppath).toLowerCase();
        let pppath = path.normalize(ppath, "..");
        let ppname = path.basename(pppath).toLowerCase();
        if (pname !== "debug" && ppname !== "debug") {
            return true;
        }
    }
    return false;
};

NativeModuleFinder.prototype._loadPackageInfo = function (modulesDir) {
    let packagePath = path.resolve(path.join(modulesDir, ".."));
    try {
        let json = require(packagePath);
        return {
            name: json.name,
            version: json.version
        };
    }
    catch (e) {
        debug("Load package info failed.\n" + e.stack);
        throw new Error(`Cannot load package info from '${packagePath}'.`);
    }
};

module.exports = NativeModuleFinder;