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
				if(app.cache > 0 && this.context.get('method') == 'GET')
					this.find(app);
				else
					this.context.get("broker").emit({type: "cache.missing", data: app});
			}
		},
		find: function(){
			var app = arguments[0];
			var appname = app.app + "-" + app.handler;
			var broker = this.context.get("broker");
			var method = this.context.get("method");
			var key = this.key();
			var site_id = this.context.get('site')._id;
			var maxAge = (new Date()).getTime() - (app.cache * 1000);
			var data = store[site_id] && store[site_id][appname] && store[site_id][appname][method] && store[site_id][appname][method][key];
			if (data)
				this.context.publish(null, {app: app.app, handler: app.handler, data: data});
			else
				this.context.get("broker").emit({type: "cache.missing", data: app});
		},
		key: function(){
			var key = this.context.get('uri').replace('/', '_');
			var query = this.context.get("query");
			query = query ? query : {};
			for(var i in query){
				key += i + '.' + query[i]
			}
			return key;
		},
		persist: function(event){
			var method = this.context.get("method");
			var site_id = this.context.get('site')._id;
			var app = event.data.app;
			var appname = app.app + "-" + app.handler;
			var key = this.key();
			var t = (new Date()).getTime();
			store[site_id] = store[site_id] ? store[site_id] : {};
			store[site_id][appname] = store[site_id][appname] ? store[site_id][appname] : {};
			store[site_id][appname][method] = store[site_id][appname][method] ? store[site_id][appname][method] : {};
			store[site_id][appname][method][key] = {creationTime : t, content : event.data.data};
			setTimeout(function(){
				delete store[site_id][appname][method][key];
			}, app.cache);
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
