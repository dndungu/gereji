"use strict";

var mongodb = require('mongodb');

var self = {
	store : {}
};

module.exports = {
	set : function(){
		self.store[arguments[0]] = arguments[1];
	},
	get : function(){
		var key = arguments[0];
		return self.store[key] ? self.store[key] : null;
	},	
	db : function(settings){
		var server = new mongodb.Server(settings.host, settings.port, settings.server_options);
		return new mongodb.Db(settings.name, server, settings.db_options);
	},
	uuid: function(){
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
	},
	timestamp: function(){
		return (new Date()).getTime();
	}
};
