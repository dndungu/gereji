"use strict";
var self = function(){
	return {
		init: function(){
			this.context = arguments[0];
			this.app = arguments[1];
			return this;
		},
		execute: function(){
			var data = {};
			data.app = this.app;
			data.context = this.context;
			var sandbox = {
				context: data.context,
				data: function(content){
					data.content = content;
					this.context.get("broker").emit({type: "app.data", data: data});
					return this;
				},
				end: function(){
					this.context.get("broker").emit({type: "app.end", data: data});
					return this;
				},
				redirect: function(url){
					this.context.header("Location", url);
					this.context.statusCode(302);
					this.data("Found");
					this.end();
				}
			};
			var method = this.context.get('method').toLowerCase();
			var filename = 'apps/' + data.app.app + '/' + data.app.handler + '.js';
			var controller = this.context.require(filename);
			if(controller[method])
				return controller[method](sandbox);
			this.context.log(3, filename + " has no handler for method "+ method);
			this.context.statusCode(404);
			sandbox.data("Not found");
			sandbox.end();
		}
	};
};
module.exports = {
	init : function(){
		var context = arguments[0];
		context.get("broker").on(["cache.missing"], function(){
			(new self()).init(context, arguments[0].data).execute();
		});
	}
};
