"use strict";
var fs = require("fs");
var zlib = require("zlib");
var http = require("http");
var self = {
	header: function(context){
		var response = context.get('response');
		if(!context.statusCode())
			context.statusCode(200);
		if(!context.header("Content-Type"))
			context.header("Content-Type", self.contentType(context));
		if(!context.header("Content-Encoding"))
			context.header("Content-Encoding", self.acceptEncoding(context));
		var cookies = context.get("cookies").toSetCookieString();
		if(cookies)
			context.header("Set-Cookie", cookies);
		if(!response.headersSent)
			response.writeHead(context.statusCode(), context.headers());
		return this;
	},
	content: function(){
		var content = arguments[0].content;
		var context = arguments[0].context;
		var then = arguments[0].then;
		var response = context.get('response');
		var data = [];
		switch(context.get('route').type){
			case "xml":
				data.push(self.toXML(content));
				break;
			case "html":
				self.transform(context, content);
				return this;
				break;
			case "text":
				data.push(content);
				break;
			case "json":
				data.push(JSON.stringify(content, null, 4));
				break;
		}
		data.push("\n");
		self.write(context, data.join(""), then);
		return this;
	},
	write: function(context, data, then){
		function print(error, buffer){
			if(error)
				return console.log(error.toString());
			context.get("response").write(buffer);
			then && then();
		}
		switch(context.header("Content-Encoding")){
			case "gzip":
				zlib.gzip(data, print);
				break;
			case "deflate":
				zlib.deflate(data, print);
				break;
			default:
				print(null, data);
				return;
		}
	},
	contentType: function(){
		var context = arguments[0];
		var route = context.get('route');
		var type = route ? context.get('route').type : null;
		return type == "xml" ? "text/xml" : type == "html" ? "text/html" : type == "json" ? "application/json" : "text/plain";
	},
	acceptEncoding: function(context){
        var accept = String(context.get("request").headers["accept-encoding"]);
        var encoding = "identity";
        if(accept.indexOf("deflate") != -1)
            encoding = "deflate";
        if(accept.indexOf("gzip") != -1)
            encoding = "gzip";
		return encoding;		
	},
	toXML : function(){
		var content = arguments[0];
		var xml = self.xml({data : content});
		xml.unshift('<?xml version="1.0"?>');
		return xml.join('\n');
	},
	xml : function(){
		var content = arguments[0];
		var xml = [];
		for(var i in content){
			var name = isNaN(i) ? i : 'node-' + String(i);
			var value = ['number', 'boolean', 'string'].indexOf(typeof content[i]) == -1 ? self.xml(content[i], xml) : String(content[i]);
			xml.push('<'+name+'>'+value+'</'+name+'>');
		}
		return xml;
	},
	transform : function(context, content){
		var response = context.get("response");
		var jar = context.get("settings").path + "lib/saxon/saxon9he.jar";
		var saxon = require('saxon-stream2');
		var xml = new (require('stream'));
		xml.pipe = function(reader){
			reader.write(self.toXML(content));
			reader.write(null);
			return reader;
		};
		var xsl = this.xsl(context);
		var xml = fs.createReadStream(context.get("settings").path + "gorilla-14.xml", {encoding: "utf8"});
		var xslt = saxon(jar, xsl, { timeout : 5000 });
		switch(context.header("Content-Encoding")){
			case "gzip":
				var gzip = zlib.createGzip();
				xml.pipe(xslt).pipe(gzip).pipe(response);
				break;
			case "deflate":
				var deflate = zlib.createDeflate();
				xml.pipe(xslt).pipe(deflate).pipe(response);
				break;
			default:
				xml.pipe(xslt).pipe(response);
				break;
		}
		return this;
	},
	xsl: function(context){
		var template = [];
		template.push(context.get("settings").path.replace(/\/$/, ""));
		template.push('templates');
		template.push(context.get('site').settings.theme);
		template.push(context.get('route').stylesheet);
		var xsl = template.join("/");
		if(fs.existsSync(xsl))
			return xsl;
		template[3] = "settings.json";
		var settings = require(template.join("/"));
		template[2] = settings.inherits;
		template[3] = context.get('route').stylesheet;
		return template.join("/");
	}
};

module.exports = {
	init : function(){
		var context = arguments[0];
		context.get("broker").on(['authenticator.error'], function(){
			context.header("Location", "/signin").statusCode(302);
			self.header(context);
			context.get("response").end();
		});
		context.get("broker").on(['routing.error'], function(){
			context.statusCode(404);
			self.header(context);
			context.get("response").end();
        });
		context.get("broker").on(["app.data", "cache.data"], function(){
			var sync = context.get("route").sync;
			var data = arguments[0].data;
			if(sync)
				return context.buffer(data);
			self.header(context);
            var then = function(){
                context.get("response").end();
            };
			self.content({context: context, content: data.content, then: then});
		});
		context.get("broker").on("app.end", function(){
			context.set("queue", (context.get("queue") - 1));
			if(context.get("queue") > 0)
				return;
			if(!context.get("route").sync)
				return;
			self.header(context);
			var buffer = context.buffer();
			var then = function(){
				context.get("response").end();
			};
			self.content({context: context,	content: buffer, then: then});
		});
	}
};
