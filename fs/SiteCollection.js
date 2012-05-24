var jsDAV = require('jsDAV')
    ,jsDAV_Exc = require("jsDAV/lib/DAV/exceptions")
    ,jsDAV_Util = require("jsDAV/lib/DAV/util")
    ,jsDAV_FS_File = require("jsDAV/lib/DAV/fs/file").jsDAV_FS_File
	,Async = require('jsDAV/support/async.js/lib/async/index')
	,Fs = require('fs');


Ext.define('Emergence.fs.SiteCollection', {
	extend: 'Emergence.fs.SiteNode'
	,requires: ['Emergence.fs.SiteFile']

	,REGBASE: jsDAV.__INODE__ | jsDAV.__ICOLLECTION__
	
	,blankFileHash: 'da39a3ee5e6b4b0d3255bfef95601890afd80709'

    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param string name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    ,createFile: function(name, data, enc, cbfscreatefile) {
    
        var newPath = jsDAV_Util.rtrim(this.path, '/') + '/' + name
    		,newFile = Ext.create('Emergence.fs.SiteFile', this.ownerTree, newPath);
    
    	newFile.put(data, enc, cbfscreatefile);
    	
/*
    	// create blank file if it doesn't exist
    
        console.log('createFile: '+this.path+' -- '+name);
        if (data.length === 0) { //new node version will support writing empty files?
            data = "";
            enc  = "utf8";
        }
        Fs.writeFile(newPath, data, enc || "utf8", cbfscreatefile)
*/

    }

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    ,createDirectory: function(name, cbfscreatedir) {
        var newPath = this.path + "/" + name;
        Fs.mkdir(newPath, 0755, cbfscreatedir);
    }

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    ,getChild: function(name, cbfsgetchild) {
    	console.log('getChild, path='+this.path+', name='+name);
    	
        var path = this.path + "/" + name
        	,thisCollection = this;

        Fs.stat(path, function(err, stat) {
            if (err || typeof stat == "undefined") {
                return cbfsgetchild(new jsDAV_Exc.jsDAV_Exception_FileNotFound("File with name "
                    + path + " could not be located"));
            }
            cbfsgetchild(null, stat.isDirectory()
                ? Ext.create('Emergence.fs.SiteCollection', thisCollection.ownerTree, path)
                : Ext.create('Emergence.fs.SiteFile', thisCollection.ownerTree, path)) //new jsDAV_FS_File(path)
        });
    }

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    ,getChildren: function(cbfsgetchildren) {
        var nodes = []
        	,thisCollection = this;
        	
        Async.readdir(this.path)
             .stat()
             .each(function(file, cbnextdirch) {
                 nodes.push(file.stat.isDirectory()
                     ? new Ext.create('Emergence.fs.SiteCollection', thisCollection.ownerTree, file.path)
                     : new Ext.create('Emergence.fs.SiteFile', thisCollection.ownerTree, file.path)
                 );
                 cbnextdirch();
             })
             .end(function() {
                 cbfsgetchildren(null, nodes);
             });
    }

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    ,delete: function(cbfsdel) {
        Async.rmtree(this.path, cbfsdel);
    }

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    ,getQuotaInfo: function(cbfsquota) {
        if (!("statvfs" in Fs))
            return cbfsquota(null, [0, 0]);
        if (this.$statvfs) {
            return cbfsquota(null, [
                (this.$statvfs.blocks - this.$statvfs.bfree),// * this.$statvfs.bsize,
                this.$statvfs.bavail// * this.$statvfs.bsize
            ]);
        }
        var _self = this;
        Fs.statvfs(this.path, function(err, statvfs) {
            if (err || !statvfs)
                cbfsquota(err, [0, 0]);
            //_self.$statvfs = statvfs;
            cbfsquota(null, [
                (statvfs.blocks - statvfs.bfree),// * statvfs.bsize,
                statvfs.bavail// * statvfs.bsize
            ]);
        });
    }
    
});