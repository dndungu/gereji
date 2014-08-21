"use strict"

var fs = require("fs");

var self = function(){
	return {
		init: function(context){
			this.context = context;
			var that = this;
			this.context.get("broker").on(['routing.error'], function(){
				var publisher = context.get("publisher");
				publisher.statusCode(404);
				publisher.push("gereji", "router", "Not found.");
				publisher.write(context);
			});
			return this;
		},
		execute: function(){
			this.findSite();
		},
		findSite: function(){
			var that = this;
			this.context.get("storage").get("global").collection("site").find({"alias" : (this.context.get('host'))}).toArray(function(error, items){
				return error ? that.onSiteQueryError(error) : (items.length ? that.onSiteQueryComplete(items) : that.onSiteQueryEmpty());
			});
		},
		onSiteQueryEmpty: function(){
			this.context.log(4, 'Could not find a site the domain name : ' + this.context.get("host"));
			this.context.get("broker").emit({type : "routing.error", data : this.context});
		},
		onSiteQueryComplete: function(){
			this.context.set('site', arguments[0][0]);
			this.getRoutes();
		},
		onSiteQueryError: function(){
			this.context.log(1, arguments[0]);
			this.context.get("broker").emit({type : "routing.error", data : this.context});
		},
		error: function(){
			this.context.log(1, arguments[0]);
			this.context.get("broker").emit({type : "routing.error", data : this.context});
		},
		getRoutes : function(){
			var site = this.context.get('site');
			var context = this.context;
			try{
				var routes = require(context.get("settings").path + 'sites/' + site.home + '/' + site.routes);
				context.set('routes', routes);
				context.set('parameters', {});
				var route = this.findRoute();
				if(!route)
					return this.error('Could not match route: ' + this.context.get('uri'));
				this.connectLocalStorage(function(){
					return context.set('route', route).get("broker").emit({type : 'routing.end', data : context});
				})
			}catch(error){
				this.context.log(1, error.stack);
				return this.context.get("broker").emit({type : "routing.error", data : this.context});
			}
		},
		findRoute: function(){
			var routes = this.context.get('routes');
			var uri = this.context.get('uri');
			for(var i in routes){
				var route = routes[i];
				for(var j in route.matches){
					var match = route.matches[j];
					if(uri == match)
						return route;
					var variables = this.variables(match);
					if(!variables)
						continue;
					var root = match.substring(0, match.indexOf(variables[0]));
					if(uri.substring(0, root.length) != root)
						continue;
					var parameters = this.parameters(uri.slice(root.length - 1), match.slice(root.length - 1));
					if(parameters)
						this.context.set('parameters', parameters);
					if(parameters)
						return route;
				}
			}
			return false;
		},
		parameters: function(uri, match){
			var variables = this.variables(match);
			var parts = this.parts(match);
			var keys = this.keys(variables);
			var values = [];
			var i = 0;
			while(true){
				if(!uri.length)
					break;
				uri = uri.split(parts[i]);
				uri.shift();
				var value = uri[0];
				uri = uri.join(parts[i]);
				i += 2;
				if(i >= parts.length)
					value = uri;
				value && value.length && values.push(value);
				if(i >= parts.length)
					break;
			}
			if(keys.length != values.length)
				return;
			var parameters = {};
			for(var i in keys){
			    parameters[keys[i]] = values[i];
			}
			return parameters;
		},
		variables: function(match){
			return match.match(/<([^>]+)>/g);
		},
		parts: function(match){
			var parts = match.split(/<([^>]+)>/g);
			var result = [];
			for(var i in parts){
				if(parts[i].length)
					result.push(parts[i]);
			}
			return result;
		},
		keys: function(variables){
			var keys = [];
			for(var i in variables){
				var key = variables[i].replace(/[<>]/g, '');
			    keys.push(key);
			}
			return keys;
		},
        connectLocalStorage: function(then){
			var context = this.context;
            var settings = context.get('site').settings.database;
			if(!settings)
				return;
            settings.server_options = context.get('settings').database.server_options;
            settings.db_options = context.get('settings').database.db_options;
			var storage = context.get('storage');
            this.context.get('storage').db(settings).open(function(error, db){
				if(error)
					context.log(3, error);
				storage.set("local", db);
				then();
            });
        }
	};
}

module.exports = {
	init: function(){
		var context = arguments[0];
		context.get("broker").on(['server.end'], function(){
			(new self()).init(context).execute();
		});
	}
};
