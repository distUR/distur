"use strict";
let Bluebird = require("bluebird");

let helpers = {
    async: Bluebird.coroutine
};

module.exports = helpers;