module.exports = function(){
	var _private = {
		store: {
			cookies: [],
			setCookies: []
		},
	};
	return {
		push : function(cookie){
			_private.store.setCookies.push(cookie);
			return this;
		},
		find : function(){
			var name = arguments[0];
			if(!name)
				return _private.store.cookies;
			for(var i in _private.store.cookies){
				var cookie = _private.store.cookies[i];
				if(name == cookie.name)
					return cookie.value;
			}
			return null;
		},
		parseCookie: function(source){
			source = typeof source == 'string' ? source : "";
			var items = source.split(';');
			for(var i in items){
				var cookie = items[i].split('=');
				_private.store.cookies.push({name: String(cookie[0]).trim(), value: String(cookie[1]).trim()});
			}
		},
		parseSetCookie: function(items){
			for(var i in items){
				var item = items[i];
				var properties = item.split(';');
				var identity = (properties.shift()).split('=');
				var cookie = {name: identity[0], value: identity[1], path: "/", expires: undefined, secure: false};
				for(var j in properties){
					var property = properties[j].split('=');
					var key = String(property[0]).trim().toLowerCase();
					var value = property[1] ?  String(property[1]).trim() : null;
					cookie[key] = value;
				}
				_private.store.setCookies.push(cookie);
			}
		},
		toCookieString: function(){
			var str = "";
			for(var i in _private.store.cookies){
				var cookie = _private.store.cookies[i];
				str += cookie.name + '=' + cookie.value + ';';
			}
			return str;
		},
		toSetCookieString: function(){
			var arr = [];
			for(var i in _private.store.setCookies){
				var cookie = _private.store.setCookies[i];
				arr.push(cookie.name + "=" + cookie.value + "; expires=" + cookie.expires + "; path=" + cookie.path + (cookie.httpOnly ? "; HttpOnly" : ""));
			}
			return arr.join("; ");
		}
	}
};
