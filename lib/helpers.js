"use strict";
let Bluebird = require("bluebird");
let util = require("util");

let helpers = {
    async: Bluebird.coroutine,
    showError: function(e, debug) {
        if (debug) {
            if (e instanceof Error) {
                debug(e.stack);
            }
            else {
                debug(`Error:\n${util.inspect(e)}`);
            }
        }
        let str = "";
        if (e.reason) {
            str += e.reason;
        }
        if (e.detail) {
            str += "\n" + e.detail;
        }
        if (str) {
            console.error(str);
        }
        else if (e instanceof Error) {
            console.error(`Error: ${e.message}`);
        }
        else {
            console.error(`Unknown error.`);
        }
    }
};

module.exports = helpers;