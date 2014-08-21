"use strict";
var self = function(){
	return {
		execute: function(context, module){
			try {
				var method = context.get('method');
				var handler = require(module.module)[module.handler];
				handler[method](context, function(error, data){
					if(error)
						context.log(3, error);
					context.publish(error, {module : module.module, handler : module.handler, data: data});
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
