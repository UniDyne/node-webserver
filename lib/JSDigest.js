const Util = require("./Utils");

/*================================================================
    Based on RFC2617 - Javascript Digest Auth
    This allows a JS app to bypass the browser built-in auth.
    Uses SHA256 rather than MD5
================================================================*/

function getAuthHeader(realm) {
	var nonce = Util.createUUID().replace(/-/g, '');
	var opaque = Util.createUUID().replace(/-/g, '');
	
	// the above really needs to use a time-based token for validation
	
	return `JSDigest realm="${realm}",qop="auth",nonce="${nonce}",opaque="${opaque}"`;
}

function parseAuthHeader(adata) {
	//console.log(adata);
	return adata.replace(/^JSDigest /,'')
		.split(',')
		.map(v => {
			v = v.split('='); // split key-value-pair
			v[0]=v[0].replace(/^\s+|\s+$/g,''); // trim spaces from key
			v[1]=v[1].replace(/^"|"$/g,''); // trim quotes from value
			return v;
		})
		.reduce((a,v) => { a[v[0]] = v[1]; return a; } ,{}); // populate object
}

function authenticate(request, server) {
	var adata = parseAuthHeader(request.headers['authorization']);
	console.log(adata);

	// if legacy or invalid qop value, reject
	if(!adata['qop'] && !adata['qop'].match(/^auth|auth-int$/)) return false;
	
	// improper
	if(!adata['cnonce'] || !adata['nc']) return false;
	
	
	// add validation of time-based token. See getAuthHeader()
	console.log(request.method);
	
	
	// lookup user... This file SHOULD contain precalc H1 only
	var ha1 = server.getAccountHash(adata['realm'], adata['username']);
	if(!ha1) return false;
	
	var ha2 = Util.sha256(`${request.method}:${url.parse(request.url).pathname}`);
	//var ha2 = Util.sha256('POST:/ninja/login');
	var r = Util.sha256(`${ha1}:${adata['nonce']}:${adata['nc']}:${adata['cnonce']}:${adata['qop']}:${ha2}`);
	
	console.log(r);
	console.log(adata['response']);
	
	if(r === adata['response']) return adata['username'];
	
	console.log('FAIL');
	return null;
}


module.exports.WebExtension = class {
	constructor(webserver, config) {

	}
};
