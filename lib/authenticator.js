"use strict";
var self = function(){
	return {
		init: function(context){
			this.context = context;
			this.context.get("broker").on(['authenticator.error'], function(){
				var publisher = context.get("publisher");
				publisher.push("gereji", "authenticator", "Not authorised.");
				if(context.get("route").type == "html")
					context.redirect("/sign-in");
				else
					publisher.statusCode(401) && publisher.write(context);
			});
			return this;
		},
		execute: function(){
			var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
			var _id = this.getUserID();
			if(uuid.test(_id))
				return this.findUserByID(_id);
			var token = this.getTokenID();
			if(token)
				return this.findUserByToken(token);
			return this.createGuest();
		},
		getUserID: function(){
			var name = this.context.get("settings").cookie.name;
			var cookie = this.context.get("cookies").find(name);
			var encryption = this.context.get("encryption");
			return cookie ? encryption.decrypt(cookie) : null;		
		},
		getTokenID: function(){
			var header = this.context.get('request').headers['authorization'] || "";
			var token = header.split(/\s+/).pop() || '';
			var auth = new Buffer(token, 'base64').toString();
			return auth.split(/:/)[0];
		},
		findUserByID: function(_id){
			var that = this;
			this.context.get("storage").get("global").collection("user").find({"_id" : _id}).toArray(function(error, items){
				if(error)
					return that.error(error);
				else
					return items.length ? that.setUser(items[0]) : that.setGuest(_id);
			});
			return this;
		},
		findUserByToken: function(token){
			var that = this;
			this.context.get("storage").get("global").collection("user").find({"token" : token}).toArray(function(error, items){
				if(error)
					that.error(error);
				else
					return items.length ? that.setUser(items[0]) : that.error('The provided token is not valid');
			});
			return this;
		},
		error: function(){
			this.context.log(2, arguments[0]);
			this.context.get("broker").emit({type : "authenticator.error", data :  this.context});
		},
		setUser: function(user){
			for(var i in user){
				this.context.get('user').set(i, user[i]);
			}
			this.findPermissions(this.context);
			return this;
		},
		createGuest: function(){
			var _id = this.context.get("storage").uuid();
			var value = this.context.get("encryption").encrypt(_id);
			var name = this.context.get("settings").cookie.name;
			var age = this.context.get("settings").cookie.age;
			var expires = (new Date((new Date()).valueOf() + (age*1000))).toUTCString();
			var secure = this.context.get("settings").server.secure;
			var cookie = {
				name: name,
				value: value,
				path: "/",
				expires: expires,
				secure: secure,
				httpOnly: true
			};
			this.context.get("cookies").push(cookie);
			this.setGuest(_id);
			return this;
		},
		setGuest: function(_id){
			this.context.get('user').set("_id", _id);
			this.context.get('user').set("guest", true);
			this.context.get('user').set("permissions", ["public.permission"]);
			this.secure(this.context);
			return this;
		},
		findPermissions: function(){
			var roles = this.context.get('user').get("roles");
			if(!roles)
				return this.setPermissions([{permissions: ["public.permission", "user.permission"]}]); 
			var that = this;
			var site_id = this.context.get('site')._id;
			this.context.get("storage").get("global").collection("role").find({$and :[{"_id" : {$in : roles}}, {"site_id": site_id}]}).toArray(function(error, items){
				return error ? that.error(error) : that.setPermissions(items);
			});
		},
		setPermissions: function(roles){
			var permissions = [];
			for(var i in roles){
				for(var j in roles[i].permissions){
					permissions.push(roles[i].permissions[j]);
				}
			}
			this.context.get('user').set('permissions', permissions);
			this.secure();
		},
		secure: function(){
			var modules = this.modules();
			if(!modules.length)
				return this.error('There are no authorised modules on the route.');
			this.context.set('modules', modules);
			this.context.set("queue", modules.length);
			this.context.get("broker").emit({type : "authenticator.end", data : this.context});
		},
		modules: function(){
			var route = this.context.get('route');
			var assigned = this.context.get("user").get("permissions");
			var modules = [];
			if(!this.test(assigned, route.permissions))
				return modules;
			for(var i in route.modules){
				var module = route.modules[i];
				var required = module.permissions;
				if(this.test(assigned, required)){
					modules.push(module);
				}
			}
			return modules;
		},
		test : function(assigned, required){
			for(var i in required){
				if(assigned.indexOf(required[i]) != -1){
					return true;
				}
			}
			return false;
		}
	};
};

module.exports = {
	init: function(context){
		context.get("broker").on(['routing.end'], function(){
			(new self()).init(context).execute();
		});
	}
};
