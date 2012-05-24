require("node-extjs-express");

var jsDAV = require('jsDAV')
	//,jsDAV_Tree_Filesystem = require("jsDAV/lib/DAV/tree/filesystem").jsDAV_Tree_Filesystem;
	//,e_SiteTree = require('./fs/e_SiteTree').e_SiteTree;


new Ext.express.Application({
	name: "Emergence"
	,appFolder: __dirname
	,requires: ['Emergence.fs.SiteTree']
	
	,port: 1337
	,hostname: '0.0.0.0'
	
	,configureExpress: function(express, server) {
		server.use(express.logger(':method :url :status'));
		server.use(express.methodOverride());
		server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
		server.use(server.router);
		server.use(express.static(__dirname + '/images'));
		
/*
		console.log('creating foo');
		this.foo = Ext.create('Emergence.fs.SiteTree', {bar: 'baz'});
		console.log(this.foo);
*/

		//this.configureSockets(express, server);
		this.configureDAV(express, server);
	}
	
	
	,configureDAV: function(express, server) {
		jsDAV.debugMode = true;

		jsDAV.mount('data/current', "/", server);
	}



  	,launch: function() {
  		console.log('Socket server running at ws://*:' + this.port);

	}
  
});