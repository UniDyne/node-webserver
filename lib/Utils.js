const fs = require('fs'),
	path = require('path'),
	crypto = require('crypto');

const hexDigits = "0123456789abcdef";


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


module.exports = {


	MIME_DEFAULTS: MIME_DEFAULTS,


// RFC4122

    createUUID: function () {
		var s = [];
		for (var i = 0; i < 36; i++) {
			s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        
        // bits 12-15 of the time_hi_and_version field to 0010
        s[14] = "4";
        
        // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
        
        // insert dashes
		s[8] = s[13] = s[18] = s[23] = "-";

		const uuid = s.join("");
		return uuid;
    },
    

// Base 64 Encoding

    atob: function(str) {
		return Buffer.from(str, 'base64').toString('utf8');
	},
	
	btoa: function(str) {
		return Buffer.from(str).toString('base64');
    },
    
    getFileBase64: function (filePath) {
		const data = fs.readFileSync(filePath);
		return data.toString('base64');
    },


// Hash Functions
    
    md5: function (str) {
		var hash = crypto.createHash('MD5');
		hash.update(str);
		return hash.digest('hex');
	},
	
	sha256: function (str) {
		var hash = crypto.createHash('SHA256');
		hash.update(str);
		return hash.digest('hex');
    },
    

// Misc

    sleep: function (ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	},


	loadConfigFile: function(filename) {
		return JSON.parse(fs.readFileSync(filename));
	},



	
	// get our IPv4 address
	// simplistic approach
	getAddress: function() {
		var os = require("os");
		var ifaces = os.networkInterfaces();
		var addr = null;

		Object.keys(ifaces).forEach(function(iface) {
			if(iface.family !== "IPv4" || iface.internal == true)
				return;
			addr = iface.address;
		});

		return addr;
	},




	getMimeType: function(filename, mimetypes) {
		mimetypes = mimetypes || MIME_DEFAULTS;
		var ext = path.extname(filename).replace(/^\./,'');
		return mimetypes.hasOwnProperty(ext) ? mimetypes[ext] : "application/octet-stream";
	},

	calcETag: function(filename, stat) {
		return '"'+this.md5(`${filename}:::${JSON.stringify([
			stat.dev, stat.ino,
			stat.size,
			stat.mtime
		])}`)+'"';
	}

};