"use strict";

let distUR = require("..");
let Client = distUR.Client;
let Auth = distUR.Auth;
let AuthUI = distUR.consoleUI.AuthUI;
let async = distUR.helpers.async;
let NativeModuleFinder = distUR.NativeModuleFinder;
let StorageProvider = distUR.StorageProvider;
let DistURMethods = distUR.DistURMethods;
let util = require("util");
let helpers = distUR.helpers;

let options = {
    directory: "/home/gabor/git/cmake-js-tut-01-module",
    recursive: false
};
let client = new Client(options);
let auth = new Auth(client, options);
let authUI = new AuthUI(auth, options);
let finder = new NativeModuleFinder(options);
let storage = new StorageProvider(client, options);
let methods = new DistURMethods(client, options);

let app = async(function*() {
    try {
        yield authUI.authenticate();

        let modules = yield finder.find();
        let storedModules = [];

        for (let module of modules) {
            let storeModuleInfo = yield storage.updateNativeModuleFiles(module);
            if (storeModuleInfo) {
                console.log(`Changed: ${module.package.name + "@" + module.package.version}`);
                console.log(util.inspect(storeModuleInfo));
                storedModules.push(storeModuleInfo);
            }
            else {
                console.log(`Unchanged: ${module.package.name + "@" + module.package.version}`);
            }
        }

        if (storedModules.length) {
            yield methods.nativeModuleFilesUpdated(storage.providerName, storedModules);
        }

        client.close();
    }
    catch(e) {
        helpers.showError(e);
    }
});

app();