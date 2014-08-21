"use strict";
var self = function(){
	return {
		execute: function(context, module){
			try {
				var method = context.get('method');
				var handler = require(module.module)[module.handler];
				handler[method](context, function(error, content){
					var data = {
						module : module,
						data: content
					};
					if(error)
						context.log(3, error);
					else
						context.get("broker").emit({type : "module.data", data : data})
					context.publish(error, data);
				});
			}catch(error){
				context.log(2, error);
				context.publish(error, {});
			}
		}
	};
};
module.exports = {
	init : function(context){
		context.get("broker").on(["cache.missing"], function(event){
			(new self()).execute(context, event.data);
		});
	}
};
