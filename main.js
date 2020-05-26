const path = require("path");

const {WebServer} = require("./lib/WebServer");


!function main() {
    server = new WebServer(path.join(__dirname, "etc/server.json"));
    server.start();
}();