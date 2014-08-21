"use strict";

var store = {};

var self = function(){
	return {
		init: function(){
			this.context = arguments[0];
			var that = this;
			this.context.get("broker").on(["module.data"], function(){
				that.persist(arguments[0]);
			});
			return this;
		},
		execute: function(){
			var modules = this.context.get('modules');
			for(var i in modules){
				var module = modules[i];
				if(module.cache > 0 && this.context.get('method') == 'GET')
					this.find(module);
				else
					this.context.get("broker").emit({type: "cache.missing", data: module});
			}
		},
		find: function(){
			var module = arguments[0];
			var modulename = module.module + "-" + module.handler;
			var broker = this.context.get("broker");
			var method = this.context.get("method");
			var key = this.key();
			var site_id = this.context.get('site')._id;
			var maxAge = (new Date()).getTime() - (module.cache * 1000);
			var data = store[site_id] && store[site_id][modulename] && store[site_id][modulename][method] && store[site_id][modulename][method][key];
			if (data)
				this.context.publish(null, {module: module.module, handler: module.handler, data: data});
			else
				this.context.get("broker").emit({type: "cache.missing", data: module});
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
			var module = event.data.module;
			var modulename = module.module + "-" + module.handler;
			var key = this.key();
			var t = (new Date()).getTime();
			store[site_id] = store[site_id] ? store[site_id] : {};
			store[site_id][modulename] = store[site_id][modulename] ? store[site_id][modulename] : {};
			store[site_id][modulename][method] = store[site_id][modulename][method] ? store[site_id][modulename][method] : {};
			store[site_id][modulename][method][key] = {creationTime : t, content : event.data.data};
			setTimeout(function(){
				delete store[site_id][modulename][method][key];
			}, module.cache);
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
