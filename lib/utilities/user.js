"use strict";
module.exports = function(){
	var self = {
		store: {}
	};
	return {
		init: function(){
			for(var i in arguments[0]){
				self.store[i] = arguments[0][i];
			}
		},
		set: function(key, value){
			self.store[key] = value
		},
		get: function(key){
			return self.store[key] ? self.store[key] : null;
		},
		hasPermission: function(){
			var permission = arguments[0];
			return (self.store.permissions.indexOf(arguments[0]) != -1);
		},
		authoredItems: function(items){
			var user_id = this.get("_id");
			user_id = user_id == "guest" ? null : user_id;
			for(var i in items){
				if(items[i].author != user_id)
					items.splice(i);
			}
			return items;
		}
	}
};
