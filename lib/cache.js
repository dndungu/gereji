"use strict";

var store = {};

var self = function(){
	return {
		init: function(context){
			this.context = context;
			var that = this;
			this.context.get("broker").on(["module.data"], function(event){
				that.persist(event);
			});
            context.get("broker").on(["module.data", "cache.data"], function(event){
                that.data(event);
            });
            context.get("broker").on(["module.error"], function(event){
                that.error(event);
            });
			return this;
		},
		execute: function(){
			var modules = this.context.get('modules');
			for(var i in modules){
				var module = modules[i];
				if(module.cache > 0 && this.context.get('method') == 'get')
					this.find(module);
				else
					this.context.get("broker").emit({type: "cache.missing", data: module});
			}
		},
		find: function(){
			var module = arguments[0];
			var modulename = module.module + "_" + module.handler;
			var broker = this.context.get("broker");
			var method = this.context.get("method");
			var key = this.key();
			var site = this.context.get('site')._id;
			var maxAge = (new Date()).getTime() - (module.cache * 1000);
			var data;
			if(store[site])
				if(store[site][modulename])
					if(store[site][modulename][method])
						if(store[site][modulename][method][key])
							data = store[site][modulename][method][key]
			if(data)
				this.context.get("broker").emit({type : "cache.data", data : {module: module, data: data.content}});
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
			var modulename = event.data.module.module + "_" + event.data.module.handler;
			var key = this.key();
			var t = (new Date()).getTime();
			store[site_id] = store[site_id] ? store[site_id] : {};
			store[site_id][modulename] = store[site_id][modulename] ? store[site_id][modulename] : {};
			store[site_id][modulename][method] = store[site_id][modulename][method] ? store[site_id][modulename][method] : {};
			store[site_id][modulename][method][key] = {creationTime : t, content : event.data.data};
			var age = (event.data.module.cache + 10) * 1000;
			setTimeout(function(){
				delete store[site_id][modulename][method][key];
			}, age);
		},
        data: function(event){
            var publisher = this.context.get("publisher");
            publisher.push(event.data.module.module, event.data.module.handler, event.data.data);
            this.context.publish();
        },
        error: function(event){
            var publisher = this.context.get("publisher");
            this.context.log(3, event.data.error);
            publisher.statusCode(500);
            this.context.publish();
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
