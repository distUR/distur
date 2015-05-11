"use strict";
let isIOJS = require("is-iojs");
let os = require("os");

let environment = {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    runtime: isIOJS ? "iojs" : "node",
    runtimeVersion: process.versions.node
};

module.exports = environment;