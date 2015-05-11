"use strict";
let DDPClient = require("ddp");
let helpers = require("./helpers");
let async = helpers.async;
let BLuebird = require("bluebird");
let debug = require("debug")("distURClient:ddp");
let _ = require("lodash");

function Client () {
    this.ddp = BLuebird.promisifyAll(new DDPClient({
        // All properties optional, defaults shown
        host: "localhost",
        port: 3000,
        ssl: false,
        autoReconnect: true,
        autoReconnectTimer: 500,
        maintainCollections: true,
        ddpVersion: "1",
        useSockJs: true
    }));

    let self = this;
    self.ddp.on("socket-close", function(code, message) {
        debug("DDP Close: %s %s", code, message);
        self.connected = false;
    });

    self.ddp.on("socket-error", function(e) {
        debug("DDP Error:\n%s", (e.stack || JSON.stringify(e)));
        self.connected = false;
    });
}

Client.prototype._connect = async(function* () {
    if (!this.connected) {
        debug("Connecting to DDP server.");
        yield this.ddp.connectAsync();
        debug("Connected.");
        this.connected = true;
    }
});

Client.prototype.call = async(function* (name, args) {
    yield this._connect();
    debug("Calling " + name + " DDP method.");
    let self = this;
    return yield new BLuebird(function (resolve, reject) {
        self.ddp.call(name, args,
            function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            },
            function () {
                _.noop();
            });
    });
});

Client.prototype.close = function() {
    if (this.connected) {
        this.ddp.close();
    }
};

module.exports = Client;