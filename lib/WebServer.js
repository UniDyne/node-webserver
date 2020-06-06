const http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs");

const EventEmitter = require("events");
const Utils = require("./Utils");

/*
const MIME_DEFAULTS = {
    css: "text/css",
    gif: "image/gif",
    htm: "text/html",
    html: "text/html",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "text/javascript",
    json: "application/json",
    pdf: "application/pdf",
    png: "image/png",
    svg: "image/svg+xml",
    txt: "text/plain",
    xml: "text/xml"
};
*/


const HTTP_MESSAGES = {
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    412: "Precondition Failed",
    500: "Internal Server Error",
    501: "Not Implemented",
    503: "Service Unavailable"
};

const CONFIG_DEFAULTS = {
    port: 10000 + Math.floor(Math.random()*10000),
    rootpath: ".",
    mimetypes: Object.assign({},Utils.MIME_DEFAULTS),
    cacheAge: 900,
    extensions: []
};


/***
    Utility Methods
***/
/*
function getMimeType(filename, mimetypes) {
    mimetypes = mimetypes || MIME_DEFAULTS;
    var ext = path.extname(filename).replace(/^\./,'');
    return mimetypes.hasOwnProperty(ext) ? mimetypes[ext] : "application/octet-stream";
}

function calcETag(filename, stat) {
    return '"'+Utils.md5(`${filename}:::${JSON.stringify(stat)}`)+'"';
}
*/

/***
    HTTP Helper Methods
***/

function sendResponseCode(response, code, data) {
    if(!HTTP_MESSAGES.hasOwnProperty(code))
        code = 501;

    var header = {"Content-Type": "text/plain"};
    var message = HTTP_MESSAGES[code];

    // location header for redirects
    if(code != 304 && code >= 300 && code < 400)
        request.setHeader('Location', data);
    
    // auth header for 401
    if(code == 401)
        request.setHeader('WWW-Authenticate', getAuthHeader(data));


    this.emit('header', response);
    response.writeHead(code, header);
    response.write(`${code} ${message}\n`);
    if(data && code == 500) response.write(JSON.stringify(data));
    response.end();
}

function requestHandler(request, response) {
    var uri = decodeURI(url.parse(request.url).pathname);
    this.emit('requestStart', request, response, uri);
    
    response.on('finish', () => this.emit('requestEnd', request, response));

    // only implementing GET and POST
    if(request.method != "GET" && request.method != "POST")
        return sendResponseCode(response, 405);
    
    // check for route handler
    for(var i = 0; i < this.routes.length; i++) {
        if(this.routes[i].rx.test(uri))
            return this.routes[i].handler(request, response, uri, this);
    }

    // normalize to prevent directory traversal
    uri = path.normalize(uri);

    // check for virtual path
    var vp = uri.split(path.sep)[1];
    if(this.virtualPaths[vp])
        filename = path.join( this.virtualPaths[vp], uri.replace(path.sep+vp,'') );
    else filename = path.join( this.webroot, uri );

    return this.staticHandler(request, response, filename);
}

function staticHandler(request, response, filename) {
    fs.exists(filename, (exists) => {
        if(!exists) return this.sendResponseCode(response, 404);

        var stat = fs.statSync(filename);

        // we don't do directory listings
        // serve index.html, if present
        if(stat.isDirectory())
            return this.staticHandler(request, response, path.join(filename, 'index.html'));
        
        var etag = Utils.calcETag(filename, stat);
        response.setHeader("ETag", etag);
        response.setHeader("Cache-Control", `max-age=${this.Config.cacheAge}`);

        if(request.headers["If-None-Match"] === etag)
            return this.sendResponseCode(response, 304);
        
        this.emit('headers', response);
        
        fs.readFile(filename, "binary", (err, file) => {
            if(err) return this.sendResponseCode(response, 500, err);

            response.writeHead(200, {"Content-Type": Utils.getMimeType(filename, this.Config.mimetypes), "Content-Length": stat.size, "Service-Worker-Allowed": "/"});
            response.write(file, "binary");
            response.end();
        });
    });
}

function jsonHandler(request, response, data) {
    response.writeHead(200, {"Content-Type": Utils.MIME_DEFAULTS.json});
    this.emit('headers', response);
    response.write(JSON.stringify(data));
    response.end();
}


function loadConfiguration(conf) {
    if(typeof conf === 'string') {
        dir = path.dirname(conf);
        conf = Utils.loadConfigFile(conf);
    }

    if(conf.hasOwnProperty('rootpath'))
        conf.rootpath = path.join(dir, conf.rootpath);
    else conf.rootpath = dir;
    
    if(conf.hasOwnProperty('virtual_paths')) {
        for(var i = 0; i < conf['virtual_paths'].length; i++) {
            if(!conf['virtual_paths'][i].absolute) conf['virtual_paths'][i].actual = path.join(process.cwd(), conf['virtual_paths'][i].actual);
            this.registerPath(conf['virtual_paths'][i].virtual, conf['virtual_paths'][i].actual);
        }
    }

    if(conf.hasOwnProperty('mimetypes') && typeof conf.mimetypes === 'string') try {
        conf.mimetypes = Utils.loadConfigFile(path.join(dir, conf.mimetypes));
    } catch(e) { console.error(e); }

    // merge configuration
    Object.assign(this.Config, conf);
}

function loadExtensions(extlist) {
    for(var i = 0; i < extlist.length; i++) try {
        if(typeof extlist[i] == "string")
            getExtInstance(this, extlist[i], {});
        else /* It's an extension / config pair */
            getExtInstance(this, extlist[i].extension, extlist[i].config);
    } catch(e) {
        console.log(`Error loading extension ${i}.`);
        console.error(e);
    }
}

function getExtInstance(self, extPath, config) {
    const {WebExtension} = require(extPath);
    return new WebExtension(self, config);
}


module.exports.WebServer = class extends EventEmitter {

    constructor(conf) {
        super();

        var dir = __dirname;
        
        this.routes = [];
        this.virtualPaths = {};

        this.Config = CONFIG_DEFAULTS;

        loadConfiguration.apply(this, [conf]);

        this.setRoot(this.Config.rootpath);
        //this.addr = this.Config.address || Utils.getAddress();
        this.setPort(this.Config.port);


        this.requestHandler = requestHandler.bind(this);
        this.staticHandler = staticHandler.bind(this);
        this.jsonHandler = jsonHandler.bind(this); // unbound
        this.sendResponseCode = sendResponseCode.bind(this); // unbound

        
        if(this.Config.extensions && this.Config.extensions.length > 0)
            loadExtensions.apply(this, [this.Config.extensions]);
    }

    setPort(port) {
        if(!port) port = 10000 + Math.floor(Math.random()*10000);
        this.port = port;

        if(this.server) {
            this.stop();
            this.start();
        }

        return this.port;
    }

    setRoot(rootpath) { this.webroot = rootpath; }

    registerPath(virtpath, actualpath) { this.virtualPaths[virtpath] = actualpath; }

    unregisterPath(virtpath) { delete this.virtualPaths[virtpath]; }

    registerRoute(rx, handler) {
        if(typeof rx === 'string') rx = new RegExp(rx);
        this.routes.push({rx:rx, handler:handler});
    }



    start() {
        this.server = http.createServer(this.requestHandler);
        this.server.listen(this.port);

        console.log(`Server listening on port ${this.port}.`);
    }

    stop() {
        if(!this.server) return;
        this.server.close();
        this.server = null;

        console.log(`Server stopped on port ${this.port}.`);
    }
};
