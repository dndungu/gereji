"use strict";
module.exports = function(){
	var self = {
		events: []
	};
	return {
		init: function(){
			self.events = [];
			return this;
		},
		on : function() {
			var types = typeof arguments[0] == "string" ? [ arguments[0] ] : arguments[0];
			for ( var i in types) {
				var type = types[i];
				self.events[type] = typeof self.events[type] == 'undefined' ? [] : self.events[type];
				self.events[type].push(arguments[1]);
			}
			return this;
		},
		emit : function(event) {
			event = typeof event == "string" ? {type : event, data : {}} : event;
			event.data = typeof event.data == "undefined" ? {} : event.data;
			try{
				this.log(5, event);
				var listeners = self.events[event.type];
				for(var i in listeners){
					if(typeof listeners[i] == 'function')
						listeners[i](event);
				}
			}catch(error){
				this.log(3, error.stack);
			}
			return this;
		}
	}
};
