"use strict";
var self = function(){
	return {
		init: function(context){
			this.context = context;
			return this;
		},
		execute: function(module){
			var context =  this.context;
			try {
				var method = context.get('method');
				var handler = require(module.module)[module.handler];
				handler[method](context, function(error, content){
					var data = {
						module : module,
						data: content,
						error: error
					};
					if(error)
						var type = "module.error";
					else
						var type = "module.data";
					context.get("broker").emit({type : type, data : data});
				});
			}catch(error){
				context.get("broker").emit({type : "module.error", data : {module: module, error : error.toString()}});
				context.log(3, error.stack);
			}
		}
	};
};
module.exports = {
	init : function(context){
		context.get("broker").on(["cache.missing"], function(event){
			(new self()).init(context).execute(event.data);
		});
	}
};
