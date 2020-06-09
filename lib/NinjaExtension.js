/*================================================================
	NINJA Requests
    NINJA = Ninja Is Not Janky Ajax
    NINJA = Ninja Is Node JSON API
    
    This module adds "channels" to the web server that are
    essentially web-addressable function calls.

    Uses events to establish notion of message passing. This
    allows queuing and asynchronicity.
================================================================*/
const EventEmitter = require("events");

function registerChannel(channel) { this.channels[channel.id] = channel; }

function ninjaHandler(request, response, uri) {
    if(request.method != "POST")
        return this.sendResponseCode(response, 500);
    
    try {
        // parse the post body as json
        var body = "";
        request.on('data', (chunk) => body += chunk);
        request.on('end', () => {
            
            var edata = JSON.parse(body), event = this.getNinja().getConfig('regex').exec(uri.pathname)[1].split('/');
            
            //#! Move to the JSDigest auth handler
            //if(event[0] == 'login') return self.jsonHandler(request, response, true);
            
            if(event.length > 2)
                return this.sendResponseCode(response, 500, "Invalid request.");
            
            //#! debug
            //console.log(event);
            //console.log(edata);
            
            //#! removing - potentially exposes web server events in an odd fashion
            /*if(event.length == 1) {
                if(self.listenerCount(event) == 0)
                    return self.sendResponseCode(response, 500, "Invalid message type.");
                
                self.emit(event, edata, rdata => self.jsonHandler(request, response, rdata));
            }*/
            
            // no such channel
            if(!this.channels[event[0]])
                    return this.sendResponseCode(response, 500, "Invalid request. (47)");
            
            // if channel only, use doc handler, if allowed
            if(event.length == 1) {
                if(this.getNinja().getConfig('docs'))
                    return docHandler(response, this.channels[event[0]]);
                else return this.sendResponseCode(response, 500, "Invalid request. (52)");
            }

            // no such event
            if(!this.channels[event[0]][event[1]])
                return this.sendResponseCode(response, 500, "Invalid request. (59)");
            
            return this.channels[event[0]].emit(event[1], edata, rdata => this.jsonHandler(request, response, rdata));
        });
    } catch(e) { return this.sendResponseCode(response, 500, e); }
}

function docHandler(response, channel) {
    response.writeHead(200, {"Content-Type": "text"});

    // iterate available methods and doc attributes
    //#!

    response.end();
}

/* Required "WebExtension" export for server plugin */
module.exports.WebExtension = class {
    constructor(webserver, config) {

        if(!config.regex)
            config.regex = new RegExp("^/ninja/(.*)$");

        if(typeof config.regex === 'string')
            config.regex = new RegExp(config.regex);
        

        webserver.registerRoute(config.regex, ninjaHandler.bind(webserver));
        webserver.channels = {};
        webserver.registerChannel = registerChannel.bind(webserver);
        webserver.getNinja = () => this;

        // keep config from getting modified arbitrarily
        this.getConfig = (key) => config[key];
    }
};

/* Channel */
module.exports.Channel = class extends EventEmitter {
    constructor(id, events) {
        this.id = id;
        var k = Object.keys(events);
        for(var i = 0, L = k.length; i < L; i++) {
            if(typeof events[k[i]] == "function")
                this.on(k[i], events[k[i]].bind(this));
            else
                this.on(k[i], this[events[k[i]]]);
        }
    }
};