var jsDAV = require('jsDAV')
	,jsDAV_Util = require("jsDAV/lib/DAV/util")
	,Path = require('path')
	,Fs = require('fs');

Ext.define('Emergence.fs.SiteNode', {
	extend: 'Emergence.fs.jsDAV_Base'

	,REGBASE: jsDAV.__INODE__

	,constructor: function(ownerTree, path) {
		console.log('constructing '+this.$className+' at '+path);
		this.ownerTree = ownerTree;
		this.path = path;
	}

    /**
     * Returns the name of the node
     *
     * @return {string}
     */
    ,getName: function() {
    	console.log('getName, path='+this.path+', splitPath='+jsDAV_Util.splitPath(this.path).join('|'));
        return jsDAV_Util.splitPath(this.path)[1];
    }

    /**
     * Renames the node
     *
     * @param {string} name The new name
     * @return void
     */
    ,setName: function(name, cbfssetname) {
        var parentPath = jsDAV_Util.splitPath(this.path)[0],
            newName    = jsDAV_Util.splitPath(name)[1];

        var newPath = parentPath + "/" + newName;
        var _self = this;
        Fs.rename(this.path, newPath, function(err) {
            if (err)
                return cbfssetname(err);
            _self.path = newPath;
            cbfssetname();
        });
    }

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    ,getLastModified: function(cbfsgetlm) {
        if (this.$stat)
            return cbfsgetlm(null, this.$stat.mtime);
        var _self = this;
        Fs.stat(this.path, function(err, stat) {
            if (err || typeof stat == "undefined")
                return cbfsgetlm(err);
            //_self.$stat = stat;
            cbfsgetlm(null, stat.mtime);
        });
    }

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    ,exists: function(cbfsexist) {
        Path.exists(this.path, cbfsexist);
    }

});