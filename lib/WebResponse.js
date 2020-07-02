const http = require('http');

const HTTP_MESSAGES = require('./HttpMessages');
const MIME_TYPES = require('./MimeTypes');

module.exports = Object.create(http.ServerResponse.prototype);


module.exports.setStatusCode = function(code) { this.statusCode = code; }
module.exports.setMimeType = function(mime) { this.mimeType = mime; }
module.exports.setRequest = function(req) { this.req = req; }

//
module.exports.sendResponseCode = function(code, data) {
    if(!HTTP_MESSAGES.hasOwnProperty(code))
        code = 501;
    
    var header = {"Content-Type": "text/plain"};
    var message = HTTP_MESSAGES[code];

    // location header for redirects
    if(code != 304 && code >= 300 && code < 400)
        this.setHeader('Location', data);
    
    // auth header for 401
    if(code == 401)
        this.setHeader('WWW-Authenticate', getAuthHeader(data));

    this.writeHead(code, header);
    this.write(`${code} ${message}\n`);
    if(data && code == 500) this.write(JSON.stringify(data));
    this.end();
};


module.exports.sendFile = function(filename) {
    fs.stat(filename, (err, stat) => {
        if(err) return this.sendResponseCode(404);

        // directory => default page
        if(stat.isDirectory()) return this.sendFile(path.join(filename, 'index.html'));

        //#! move ETags...?
        // Need to hook something here... expand ETags to non-files...
        //var etag = Utils.calcETag(filename, stat);
        //this.setHeader("ETag", etag);
        //this.setHeader("Cache-Control", `max-age=${this.Config.cacheAge}`);

        this.emit('headers'); /* */

        this.writeHead(200, {"Content-Type": Utils.getMimeType(filename), "Content-Length": stat.size});
        try { fs.createReadStream(filename).pipe(this); }
        catch(e) { console.log(e); }
    });
};


module.exports.sendJSON = function(data) {
    this.writeHead(200, {"Content-Type": MIME_TYPES.json});
    this.emit('headers'); /* */
    this.write(JSON.stringify(data));
    this.end();
};
