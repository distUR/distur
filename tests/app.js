"use strict";

let distUR = require("..");
let Client = distUR.Client;
let Auth = distUR.Auth;
let AuthUI = distUR.consoleUI.AuthUI;
let async = distUR.helpers.async;

let client = new Client();
let auth = new Auth(client);
let authUI = new AuthUI(auth);

let app = async(function*() {
    yield authUI.authenticate();

    client.close();
});

app();