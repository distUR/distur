"use strict";
let DDPClient = require("ddp");
let helpers = require("./helpers");
let async = helpers.async;
let BLuebird = require("bluebird");

class Client {
    constructor() {
        this.ddp = BLuebird.promisifyAll(new DDPClient({
            host: "localhost",
            port: 3000,
            ssl: false,
            useSockJs: true,
            url: 'wss://example.com/websocket'
        }));
    }

    function _connect() {
        let self = this;
        return async(function* () {
            if (!self.connected) {
                yield self.ddp.connectAsync();
            }
        })();
    }

    function call(name, args) {
        let self = this;
        return async(function* () {
            yield self._connect();
            yield self.ddp.call(name, args);
        });
    }
}


module.exports = Client;