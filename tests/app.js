"use strict";

let distUR = require("..");
let Client = distUR.Client;
let Auth = distUR.Auth;
let AuthUI = distUR.consoleUI.AuthUI;
let async = distUR.helpers.async;
let NativeModuleFinder = distUR.NativeModuleFinder;
let StorageProvider = distUR.StorageProvider;
let util = require("util");

let options = {
    directory: "c:\\GIT\\SanomaMedia\\node_modules\\lwip",
    recursive: false
};
let client = new Client(options);
let auth = new Auth(client, options);
let authUI = new AuthUI(auth, options);
let finder = new NativeModuleFinder(options);
let storage = new StorageProvider(client, options);

let app = async(function*() {
    yield authUI.authenticate();

    let modules = yield finder.find();

    for (let module of modules) {
        let storeModuleInfo = yield storage.updateNativeModuleFiles(module);
        if (storeModuleInfo) {
            console.log(`Changed: ${module.package.name + "@" + module.package.version}`);
            console.log(util.inspect(storeModuleInfo));
        }
        else {
            console.log(`Unchanged: ${module.package.name + "@" + module.package.version}`);
        }
    }

    client.close();
});

app();