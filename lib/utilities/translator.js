"use strict";
var fs = require('fs');
module.exports = function(){
	return {
		init: function(context){
			var filename = context.require("sites/" + context.get("site").home + "/" + context.get("site").settings.locale);
			this.locale = filename ? require(filename) : {};
			return this;
		},
		translate: function(key){
			return this.locale[key] ? this.locale[key] : key.replace(/_/, " ");
		}
	};
};
