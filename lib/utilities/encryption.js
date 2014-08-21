"use strict";
var crypto = require('crypto');
var algorithm = 'aes256';
module.exports = function(){
	return {
		init: function(key){
			this.key = key;
			return this;
		},
		encrypt : function(text){
			var cipher = crypto.createCipher(algorithm, this.key);
			return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
		},
		decrypt : function(hash){
			var decipher = crypto.createDecipher(algorithm, this.key);
			return decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8');
		},
		random: function(n){
			var str = "";
			var pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			for( var i = 0; i < n; i++ ){
				str += pool.charAt(Math.floor(Math.random() * pool.length));
			}
			return str;
		},
		password: function(size){
			var str = "";
			while(size--){
				str += this.consonant() + this.vowel();
			}
			return str;
		},
		consonant: function(){
			var pool = "BCDFGHJKLMNPQRSTVWXZbcdfghjkmnpqrstvwxz";
			return pool.charAt(Math.floor(Math.random() * pool.length));
		},
		vowel: function(){
			var pool = "AEUYaeuy34";
			return pool.charAt(Math.floor(Math.random() * pool.length));
		}
	}
};
