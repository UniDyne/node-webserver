const http = require('http');

module.exports = Object.create(http.IncomingMessage.prototype);

module.exports.setResponse = function(res) { this.res = res; }
