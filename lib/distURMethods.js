"use strict";
let helpers = require("./helpers");
let async = helpers.async;
let Bluebird = require("bluebird");
let assert = require("better-assert");
let Client = require("./client");
let _ = require("lodash");
let debug = require("debug")("distURClient:auth");

function DistURMethods(client, options) {
    assert(client instanceof Client);
    this.client = client;
    this.options = options || {};
}

DistURMethods.prototype.nativeModuleFilesUpdated = async(function*(providerName, nativeModuleInfos) {
    yield this.client.call("nativeModuleFilesUpdated", [providerName, nativeModuleInfos]);
});

module.exports = DistURMethods;