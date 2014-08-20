"use strict";

var store = {};

var self = function(){
	return {
		init: function(){
			this.context = arguments[0];
			var that = this;
			this.context.get("broker").on(["app.data"], function(){
				that.persist(arguments[0]);
			});
			return this;
		},
		execute: function(){
			var apps = this.context.get('apps');
			for(var i in apps){
				var app = apps[i];
				if(app.cache > 0 && this.context.get('method') == 'GET'){
					this.find(app);
				}else{
					var that = this;
					this.connectStorage(function(){
						that.context.get("broker").emit({type: "cache.missing", data: app});
					});
				}
			}
		},
		connectStorage: function(then){
			if(this.context.get('storage').get('local'))
				return then();
			var settings = this.context.get('site').settings.database;
			settings.server_options = this.context.get('settings').database.server_options;
			settings.db_options = this.context.get('settings').database.db_options;
			var that = this;
			this.context.get('storage').db(settings).open(function(error, db){
				if(error)
					throw "Could not connect to local storage.";
				that.context.get('storage').set('local', db);
				then();
			});
		},	
		find: function(){
			var app = arguments[0];
			var appname = app.app + "-" + app.handler;
			var broker = this.context.get("broker");
			var method = this.context.get("method");
			var key = this.context.get('uri').replace('/', '_');
			var site_id = this.context.get('site')._id;
			var maxAge = (new Date()).getTime() - (app.cache * 1000);
			var data = store[site_id] && store[site_id][appname] && store[site_id][appname][method] && store[site_id][appname][method][key];
			if(data && store[site_id][appname][method][key].creationTime < maxAge)
				data = store[site_id][appname][method][key] = [];
			if (data && data.length) {
				for(var i in data){
					broker.emit({type: "cache.data", data: {context: this.context, app: app, content: data[i].content}});
				}
				this.context.get("broker").emit({type: "app.end", data: {context: this.context, app: app}});
			}else{
				var that = this;
				this.connectStorage(function(){
					that.context.get("broker").emit({type: "cache.missing", data: app});
				});
			}
		},
		persist: function(){
			var method = this.context.get("method");
			if(method != 'GET')
				return;
			var site_id = this.context.get('site')._id;
			var key = this.context.get('uri').replace('/', '.');
			var data = arguments[0].data;
			var app = data.app;
			var appname = app.app + "-" + app.handler;
			var t = (new Date()).getTime();
			store[site_id] = store[site_id] ? store[site_id] : {};
			store[site_id][appname] = store[site_id][appname] ? store[site_id][appname] : {};
			store[site_id][appname][method] = store[site_id][appname][method] ? store[site_id][appname][method] : {};
			store[site_id][appname][method][key] = store[site_id][appname][method][key] ? store[site_id][appname][method][key] : [];
			store[site_id][appname][method][key].push({creationTime : t, content : data});
		}
	}
};

module.exports = {
	init: function(context){
		context.get("broker").on(['authenticator.end'], function(){
			(new self()).init(context).execute();
		});
	}
};
