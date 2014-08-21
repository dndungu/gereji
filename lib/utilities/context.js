"use strict";
var fs = require('fs');
module.exports = function(){

	var self = {};

	return {
		init: function(settings){
			self.store = {};
			return this;
		},
		set : function(name, value) {
			self.store[name] = value;
			return this;
		},
		get : function(name) {
			return self.store[name] ? self.store[name] : null;
		},
		statusCode: function(){
			var statusCode =  arguments[0];
			if(statusCode)
				self.statusCode = statusCode;
			return self.statusCode;
		},
		header: function(){
			var key = arguments[0].toLowerCase();
			var value = arguments[1];
			if(value)
				self.headers[key] = value;
			else
				return self.headers[key];
			return this;
		},
		headers: function(){
			return self.headers;
		},
		publish: function(error, data){
			if(error)
				data.data = error;
			this.get("gereji-publisher").push(data.app, data.handler, data.data);
			this.set("queue", (this.get("queue") - 1));
            if(this.get("route").sync)
                if(this.get("queue") > 0)
                    return this;
            var publisher = this.get("publisher");
            publisher.write(this);
			return this;
		},
		log: function(severity, message){
			var logfile = self.store.settings.path + self.store.settings.debug.file;
			var uri = self.store.uri;
			var method = self.store.method;
			if(severity > self.store.settings.debug.level)
				return;
			var line = (new Date()) + ' (' + severity + ') : [' + uri + '] ' + ' {' + method + '} ' + (JSON.stringify(message)) + '\n';
			fs.appendFile(logfile, line, function(){});
			return this;
		},
		require: function(){
			return require(self.store["settings"].path + arguments[0]);
		}
	}
};
