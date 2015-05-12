"use strict";

let assert = require("better-assert");
let Auth = require("../auth");
let helpers = require("../helpers");
let async = helpers.async;
let debug = require("debug")("distURClient:ui");
let Bluebird = require("bluebird");
let prompt = Bluebird.promisifyAll(require("prompt"));

function AuthUI (auth, options) {
    assert(auth instanceof Auth);
    this._auth = auth;
    this.options = options || {};
}

AuthUI.prototype.authenticate = async(function*() {
    debug("Trying to authenticate with token.");
    if (!(yield this._auth.authenticate())) {
        console.log("Enter your Github username an password to log in\n(note: this DOESN'T GET STORED anywhere - see the Privacy Policy):");
        const maxLoginAttempts = this.options.maxLoginAttempts || 5;
        for (let i = 0; i < maxLoginAttempts; i++) {
            debug("Trying to authenticate be username and password, attempt: " + (i + 1));
            if (yield this._authenticateStep()) {
                console.log("Authenticated.");
                return;
            }
        }
        throw new Error("Unable to login. Aborting.");
    }
    console.log("Authenticated via stored token.");
});

AuthUI.prototype._authenticateStep = async(function*() {
    prompt.message = "";
    prompt.delimiter = "";

    let result = yield prompt.getAsync(
        [
            {
                name: "username",
                description: "Username: ",
                required: true
            },
            {
                name: "password",
                description: "Passowrd: ",
                hidden: true,
                required: true
            }
        ]);

    try {
        yield this._auth.login(result.username, result.password);
        return true;
    }
    catch (e) {
        helpers.showError(e, debug);
    }
    return false;
});

module.exports = AuthUI;