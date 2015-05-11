"use strict";
let helpers = require("./helpers");
let async = helpers.async;
let Bluebird = require("bluebird");
let npmconf = Bluebird.promisifyAll(require("npmconf"));
let assert = require("better-assert");
let Client = require("./client");
let _ = require("lodash");
let debug = require("debug")("distURClient:auth");

function Auth(client) {
    assert(client instanceof Client);
    this.client = client;
}

Auth.prototype.getTokenFromConfig = async(function*() {
    let conf = yield npmconf.loadAsync();
    let token = conf.get("distURAuthToken");
    if (_.isString(token)) {
        debug("distURAuthToken: " + token);
        return token;
    }
    return null;
});

Auth.prototype.saveTokenInConfig = async(function*(token) {
    let conf = yield npmconf.loadAsync();
    conf.set("distURAuthToken", token, "user");
    yield Bluebird.promisify(conf.save, conf)("user");
});

Auth.prototype.authenticate = async(function*() {
    debug("Getting auth token from config.");
    const token = yield this.getTokenFromConfig();
    if (!token) {
        debug("Token not found, unauthenticated.");
        return false;
    }
    try {
        debug("Token found, logging in.");
        yield this.client.call("distUrLogin", [ token ]);
        debug("Logged in, authenticated.");
        return true;
    }
    catch (e) {
        debug("Login failed:\n", (e.stack || JSON.stringify(e)));
        debug("Unauthenticated.");
        return false;
    }
});

Auth.prototype.login = async(function*(username, password) {
    debug(username + " logging in.");
    const token = yield this.client.call("loginWithGithubAccount", [ username, password ]);
    yield this.saveTokenInConfig(token);
});

module.exports = Auth;