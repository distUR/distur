"use strict";
let helpers = require("./helpers");
let async = helpers.async;
let BLuebird = require("bluebird");
let npmconf = BLuebird.promisifyAll(require("npmconf"));

class Auth {
    constructor(client) {
        this.client = client;
    }

    function authenticate() {
        let self = this;
        return async(function*() {

        });
    }
}

module.exports = Auth;