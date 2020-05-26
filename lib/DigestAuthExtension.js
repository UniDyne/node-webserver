const EventEmitter = require("events");

function authListener(request, response) {
    
    
    this.getconfig('realm')
}


/* Required "WebExtension" export for server plugin */
module.exports.WebExtension = class {
    constructor(webserver, config) {
        
        webserver.addListener('requestStart', authListener.bind(this));
        webserver.authProxy = this;

        // keep config from getting modified arbitrarily
        this.getConfig = (key) => config[key];
    }
};
