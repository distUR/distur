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
let util = require("util");

function NativeModuleFinder (options) {
    assert(_.isObject(options));

    this.options = options;
    this.directory = _.isString(this.options.directory) ? path.resolve(this.options.directory) : process.cwd();
    this._systemInfo = new SystemInfo(this.options);
}

NativeModuleFinder.prototype.find = async(function*() {
    let pjson = false;
    let stat = null;

    debug(`Finding modules started.\nOS: ${util.inspect(this._systemInfo.os)}\nRuntime: ${util.inspect(this._systemInfo.runtime)}`);

    debug(`Determining if '${this.directory}' is an application folder.`);
    try {
        stat = yield fs.statAsync(path.join(this.directory, "package.json"));
        pjson = stat.isFile();
    }
    catch (e) {
    }

    if (!pjson) {
        throw new Error(`'${this.directory}' is not an application directory.`);
    }

    debug(`Modules folder '${this.directory}'.`);

    return yield this._findIn(this.directory);
});

NativeModuleFinder.prototype._findIn = async(function*(modulesDir) {
    let entries = new Map();
    let self = this;
    let recursive = !!self.options.recursive;

    var findIn = async(function* (currModDir) {
        debug(`Finding native modules in '${currModDir}'${recursive ? " recursively" : ""}.`);
        let pkgInfo = self._loadPackageInfo(currModDir);
        if (pkgInfo) {
            let pkgKey = pkgInfo.name + "@" + pkgInfo.version;
            debug(`Checking module: ${pkgKey}`);
            if (!entries.has(pkgKey)) {
                let currentEntry = null;
                currentEntry = {
                    rootPath: currModDir,
                    package: pkgInfo,
                    files: [],
                    os: self._systemInfo.os,
                    runtime: self._systemInfo.runtime
                };
                entries.set(pkgKey, currentEntry);
                debug(`Registered.`);

                var findFiles = async(function*(currentPath) {
                    debug(`Finding files in '${currentPath}'.`);
                    let names = yield fs.readdirAsync(currentPath);
                    let tasks = [];
                    let processName = async(function*(name) {
                        let fullPath = path.join(currentPath, name);
                        let stat = yield fs.statAsync(fullPath);
                        if (stat.isFile()) {
                            if (self._isAReleaseAddonFile(fullPath)) {
                                currentEntry.files.push(fullPath);
                                debug(`Binary found for ${pkgKey} at '${fullPath}'.`);
                            }
                        }
                        else if (stat.isDirectory()) {
                            if (name === "node_modules") {
                                if (recursive) {
                                    let modNames = yield fs.readdirAsync(fullPath);
                                    let modTasks = [];
                                    for (let modName of modNames) {
                                        modTasks.push(findIn(path.join(fullPath, modName)));
                                    }
                                    yield Bluebird.all(modTasks);
                                }
                            }
                            else {
                                yield findFiles(fullPath);
                            }
                        }
                    });
                    for (let name of names) {
                        tasks.push(processName(name));
                    }
                    yield Bluebird.all(tasks);
                });

                yield findFiles(currModDir);
            }
            else {
                debug("Already registered.");
            }
        }
    });

    yield findIn(modulesDir);

    let array = [];
    let files = 0;
    for (let v of entries.values()) {
        if (v.files.length) {
            array.push(v);
            files += v.files.length;
        }
    }

    debug(`${files} files found in ${array.length} modules.`);

    return array;
});

NativeModuleFinder.prototype._isAReleaseAddonFile = function (filePath) {
    if (path.extname(filePath) === ".node") {
        let ppath = path.dirname(filePath);
        let pname = path.basename(ppath).toLowerCase();
        let pppath = path.normalize(path.join(ppath, ".."));
        let ppname = path.basename(pppath).toLowerCase();
        if (pname !== "debug" && ppname !== "debug") {
            return true;
        }
    }
    return false;
};

NativeModuleFinder.prototype._loadPackageInfo = function (modulesDir) {
    let packagePath = path.resolve(path.join(modulesDir, "package.json"));
    try {
        let json = require(packagePath);
        return {
            name: json.name,
            version: json.version
        };
    }
    catch (e) {
        return null;
    }
};

module.exports = NativeModuleFinder;