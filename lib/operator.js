"use strict";
var self = function(){
	return {
		execute: function(context, app){
			try {
				var method = context.get('method');
				var handler = require(app.app)[app.handler];
				handler[method](context, function(error, data){
					if(error)
						context.log(3, error);
					context.publish(error, {app : app.app, handler : app.handler, data: data});
				});
			}catch(error){
				context.log(3, error);
				context.publish(error, null);
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
