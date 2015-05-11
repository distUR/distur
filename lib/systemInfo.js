"use strict";
let environment = require("./environment");

function SystemInfo(options) {
    this.options = options || {};
    this.os = {
        arch: this.options.arch || environment.arch,
        platform: this.options.osPlatform || environment.platform,
        release: this.options.osRelease || environment.release
    };
    this.runtime = {
        name: this.options.runtime || environment.runtime,
        version: this.options.runtimeVersion || environment.runtimeVersion
    };
}

module.exports = SystemInfo;