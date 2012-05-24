var jsDAV = require('jsDAV')
	,jsDAV_Exc = require("jsDAV/lib/DAV/exceptions")
	,jsDAV_Util = require("jsDAV/lib/DAV/util")
	,Fs = require('fs')
	,Path = require('path')
	,Crypto = require('crypto');


Ext.define('Emergence.fs.SiteFile', {
	extend: 'Emergence.fs.SiteNode'
	
	,REGBASE: jsDAV.__INODE__ | jsDAV.__IFILE__	
	
	
	/**
	 * Updates the data
	 *
	 * @param {mixed} data
	 * @return void
	 */
	,put: function(data, type, cbfsput) {
		console.log("writing to "+this.path);
		//console.log(data.toString('utf8'));
		
		var sha1Hasher = Crypto.createHash('sha1');
		sha1Hasher.update(data);
		var hash = sha1Hasher.digest('hex');
		console.log('content hash: '+hash);
		
		var objectPath = Emergence.fs.SiteTree.buildObjectPath(this.ownerTree.objectsPath, this.path, hash);
		console.log('objectPath: '+objectPath);
		
		var relativeObjectPath = Path.relative(Path.dirname(this.path), objectPath);
		console.log('relativeObjectPath: '+relativeObjectPath);
		
		// set symlink
		if(Path.existsSync(this.path))
		{
			Fs.unlinkSync(this.path);
		}

		Fs.symlinkSync(relativeObjectPath, this.path);

		// write to object file
		if(!Path.existsSync(objectPath))
		{
			Fs.writeFile(objectPath, data, type || "utf8", function(err) {
				if(err) console.log('failed to write object: '+err.message);
				cbfsput(err);
			});
		}
		else
		{
			console.log('object already exists');
				cbfsput();
		}
	}

	/**
	 * Returns the data
	 *
	 * @return Buffer
	 */
	,get: function(cbfsfileget) {
		if (this.$buffer)
			return cbfsfileget(null, this.$buffer);
		var _self  = this,
			onRead = function(err, buff) {
				if (err)
					return cbfsfileget(err);
				// For older versions of node convert the string to a buffer.
				if (typeof buff === "string") {
					var b = new Buffer(buff.length);
					b.write(buff, "binary");
					buff = b;
				}
				// Zero length buffers act funny, use a string
				if (buff.length === 0)
					buff = "";
				//_self.$buffer = buff;
				cbfsfileget(null, buff);
			};
		
		// Node before 0.1.95 doesn't do buffers for fs.readFile
		if (process.version < "0.1.95" && process.version > "0.1.100") {
			// sys.debug("Warning: Old node version has slower static file loading");
			Fs.readFile(this.path, "binary", onRead);
		}
		else {
			Fs.readFile(this.path, onRead);
		}
	}

	/**
	 * Delete the current file
	 *
	 * @return void
	 */
	,delete: function(cbfsfiledel) {
		Fs.unlink(this.path, cbfsfiledel);
	}

	/**
	 * Returns the size of the node, in bytes
	 *
	 * @return int
	 */
	,getSize: function(cbfsgetsize) {
		if (this.$stat)
			return cbfsgetsize(null, this.$stat.size);
		var _self = this;
		return Fs.stat(this.path, function(err, stat) {
			if (err || !stat) {
				return cbfsgetsize(new jsDAV_Exc.jsDAV_Exception_FileNotFound("File at location " 
					+ this.path + " not found"));
			}
			//_self.$stat = stat;
			cbfsgetsize(null, stat.size);
		});
	}

	/**
	 * Returns the ETag for a file
	 * An ETag is a unique identifier representing the current version of the file.
	 * If the file changes, the ETag MUST change.
	 * Return null if the ETag can not effectively be determined
	 *
	 * @return mixed
	 */
	,getETag: function(cbfsgetetag) {
		cbfsgetetag(null, null);
	}

	/**
	 * Returns the mime-type for a file
	 * If null is returned, we'll assume application/octet-stream
	 *
	 * @return mixed
	 */
	,getContentType: function(cbfsmime) {
		return cbfsmime(null, jsDAV_Util.mime.type(this.path));
	}
	
});