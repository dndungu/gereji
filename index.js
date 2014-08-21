"use strict";

var gereji = require("./lib/gereji.js");
var fs = require("fs");
var url = require("url");
var storage = require('gereji-storage');
var settings;
var self = {
	respond: function(request, response){
		var context = self.context();
		context.get("cookies").parseCookie(request.headers['cookie']);
        context.set("request", request);
        context.set("response", response);
		var host = request.headers.host ? request.headers.host.split(':')[0] : settings.server.host;
        context.set("host", host);
        context.set("method", request.method.toLowerCase());
		var url_parts = url.parse(request.url.trim(), true, true);
        context.set("uri", url_parts.pathname);
		context.set("query", url_parts.query);
        context.set("storage", storage);
		gereji.router.init(context);
		gereji.authenticator.init(context);
		gereji.cache.init(context);
		gereji.operator.init(context);
		context.get('broker').emit({type : 'server.end', data : context});
	},
	cert: function(){
		return {
			key: fs.readFileSync(settings.server.key, 'utf8'),
			cert: fs.readFileSync(settings.server.cert, 'utf8')
		};
	},
	context: function(){
		var context = new (require(__dirname, '/lib/utilities/gereji-context'));
		var encryption = new (require(__dirname, '/lib/utilities/gereji-encryption'));
		var broker = new (require(__dirname, '/lib/utilities/gereji-broker'));
		var publisher = new (require(__dirname, '/lib/utilities/gereji-publisher'));
		context.set("cookies", (new (require(__dirname, '/lib/utilities/gereji-cookies'))));
		context.set("user", (new (require(__dirname, '/lib/utilities/gereji-user'))));
		context.init(settings);
		context.set("settings", settings);
		context.set("encryption", encryption.init(context.get("settings").key));
		broker.log = context.log;
		context.set("broker", broker.init());
		context.set('publisher', publisher.init());
		return context;
	}
};

module.exports = {
	listen: function(){
		settings = arguments[0];
		storage.db(settings.database).open(function(error, db){
			if(error)
				return console.log(error.toString());
			storage.set("global", db);
			if(settings.server.secure)
				require('https').createServer(self.cert(settings), self.respond).listen(settings.server.port, settings.server.host);
			else
				require('http').createServer(self.respond).listen(settings.server.port, settings.server.host);
		});
	}
};
