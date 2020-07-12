const fs = require("fs"),
    path = require("path"),
    
    Utils = require("./Utils");

function sendDirectory(request, response, filename) {
    var listing = {
        files: [],
        dirs: []
    };

    var files = fs.readdirSync(filename);
    for(var i = 0; i < files.length; i++) {
        var st = fs.statSync(path.join(filename, files[i]));

        if(st.isDirectory()) {
            listing.dirs.push(files[i]);
        } else {
            if((/\.(apng|bmp|gif|ico|jpg|jpeg|png|svg|tif|tiff|webp)$/i).test(files[i]))
                listing.files.push(files[i]);
        }
    }
    listing.files.sort();
    listing.dirs.sort();

    response.writeHead(200, {"Content-Type":"text/html"});

    response.write('<!DOCTYPE html>\n<html><head>');
    
    response.write(`<script type="text/javascript">
    document.addEventListener('keyup',(e)=>{
        if(e.keyCode==82) { BROWSE.order = 2; j=Math.floor(Math.random()*BROWSE.files.length); }
        if(e.keyCode==37) { BROWSE.order = 1; j--; }
        if(e.keyCode==39) { BROWSE.order = 0; j++; }
        if(e.keyCode==32) {
            if(BROWSE.auto) { window.clearInterval(BROWSE.auto); BROWSE.auto = null; }
            else BROWSE.auto = window.setInterval(autoFlip, 5000);
        }
        flip();
    });
    function autoFlip() {
        switch(BROWSE.order) {
            case 1:
                j--;
                break;
            case 2:
                j=Math.floor(Math.random()*BROWSE.files.length);
                break;
            default:
                j++;
                break;
        }
        flip();
    }
    function flip(){
        j=(j<0?BROWSE.files.length-1:j>=BROWSE.files.length?0:j);
        document.getElementById('xx').style['background-image']='url('+BROWSE.files[j]+')';
    }
    window.j=0;window.BROWSE=${JSON.stringify(listing)};</script>`);
    response.write('</head><body>');
    response.write('<ul><script type="text/javascript">for(var i=0;i<BROWSE.dirs.length;i++)document.write("<li><a href=\\""+BROWSE.dirs[i]+"/\\">"+BROWSE.dirs[i]+"</a></li>");</script></ul>');
    
    if(listing.files.length > 0) {
        response.write(`<div id="xx" style="position:absolute;top:0;left:0;height:100vh;width:100vw;background:#000 url('${listing.files[0]}') no-repeat center center fixed;background-size:contain;" onclick="j++,flip()"></div>`);
    }

    response.write('</body></html>');
    response.end();
}



function browseHandler(request, response, filename) {
    fs.exists(filename, (exists) => {
        if(!exists) return this.sendResponseCode(response, 404);

        var stat = fs.statSync(filename);
        if(stat.isDirectory()) {
            return sendDirectory(request, response, filename);
        }

        return response.sendFile(filename);

        var etag = Utils.calcETag(filename, stat);
        response.setHeader("ETag", etag);
        response.setHeader("Cache-Control", `max-age=${this.Config.cacheAge}`);

        if(request.headers["If-None-Match"] === etag)
            return this.sendResponseCode(response, 304);

        fs.readFile(filename, "binary", (err, file) => {
            if(err) return this.sendResponseCode(response, 500, err);

            response.writeHead(200, {"Content-Type": Utils.getMimeType(filename, this.Config.mimetypes), "Content-Length": stat.size, "Service-Worker-Allowed": "/"});
            response.write(file, "binary");
            response.end();
        });
    });
}


/* Required "WebExtension" export for server plugin */
module.exports.WebExtension = class {
    constructor(webserver, config) {
        console.log("Loaded");
        const oldStaticHandler = webserver.staticHandler;
        webserver.staticHandler = browseHandler.bind(webserver);
    }
};