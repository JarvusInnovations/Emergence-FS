var jsDAV = require('jsDAV')
	,jsDAV_Util = require("jsDAV/lib/DAV/util")
	,jsDAV_Exc = require("jsDAV/lib/DAV/exceptions")
	,Path = require('path')
	,Fs = require('fs')
	,Dive = require('dive')
	,Wrench = require('wrench');



Ext.define('Emergence.fs.SiteTree', {
	extend: 'Emergence.fs.jsDAV_Base'
	,requires: ['Emergence.fs.SiteCollection', 'Emergence.fs.SiteFile']

	,REGBASE: jsDAV.__TREE__
	
	,config: {
		currentRoot: 'data/current'
		,objectsRoot: 'data/objects'
	}


	,statics: {
		buildObjectPath: function(objectsRoot, filePath, hash) {
			var dir = objectsRoot+'/'+hash.substr(0, 2);
			
			// create container dir if necessary
			if(!Path.existsSync(dir))
				Fs.mkdirSync(dir, 0775);
				
			return dir+'/'+hash.substr(2);
		}
/*
		,buildRelativePath: function(from, to) {
			
			from = from.split('/');
			to = to.split('/');
			
			// eliminate common prefix
			while(from[0] == to[0])
			{
				from.shift();
				to.shift();
			}
			
			var relative = '';
			
			// add dot-dots
			for(var i = 1; i < from.length; i++)
				relative += '../';
				
			// add target
			relative += to.join('/');
			
			return relative;
		}
*/
	}



	,constructor: function(config) {
		this.initConfig(config);
		
		this.basePath = jsDAV_Util.rtrim(Fs.realpathSync(this.getCurrentRoot()), '/');
		this.objectsPath = jsDAV_Util.rtrim(Fs.realpathSync(this.getObjectsRoot()), '/');
		
		console.log('constructing Emergence.fs.SiteTree with "'+this.getCurrentRoot()+'"');
		
		return this;
	}

	/**
	 * Returns a new node for the given path
	 *
	 * @param string path
	 * @return void
	 */
	,getNodeForPath: function(path, cbfstree) {
		console.log('getNodeForPath, path='+path);
	
		var realPath = this.getRealPath(path)
			,thisTree = this;
			
		Fs.stat(realPath, function(err, stat) {
			if (!jsDAV_Util.empty(err))
				return cbfstree(new jsDAV_Exc.jsDAV_Exception_FileNotFound("File at location " + realPath + " not found"));
			cbfstree(null, stat.isDirectory()
				? Ext.create('Emergence.fs.SiteCollection', thisTree, realPath)
				: Ext.create('Emergence.fs.SiteFile', thisTree, realPath))
		});
	}

	/**
	 * Returns the real filesystem path for a webdav url.
	 *
	 * @param string publicPath
	 * @return string
	 */
	,getRealPath: function(publicPath) {
		console.log('getRealPath, publicPath='+publicPath+', currentRoot='+this.getCurrentRoot());
		return this.basePath + "/" + jsDAV_Util.trim(publicPath, "/");
	}

	/**
	 * Copies a file or directory.
	 *
	 * This method must work recursively and delete the destination
	 * if it exists
	 *
	 * @param string source
	 * @param string destination
	 * @return void
	 */
	,copy: function(source, destination, cbfscopy) {
		source		= this.getRealPath(source);
		destination = this.getRealPath(destination);
		this.realCopy(source, destination, cbfscopy);
	}

	/**
	 * Used by self::copy
	 *
	 * @param string source
	 * @param string destination
	 * @return void
	 */
	,realCopy: function(source, destination, cbfsrcopy) {
		Fs.stat(source, function(err, stat) {
			if (!jsDAV_Util.empty(err))
				return cbfsrcopy(err);
			if (stat.isFile())
				Async.copyfile(source, destination, true, cbfsrcopy);
			else
				Async.copytree(source, destination, cbfsrcopy);
		});
	}

	/**
	 * Moves a file or directory recursively.
	 *
	 * If the destination exists, delete it first.
	 *
	 * @param string source
	 * @param string destination
	 * @return void
	 */
	,move: function(source, destination, cbfsmove) {
	
		var tree = this;

		source		= tree.getRealPath(source);
		destination = tree.getRealPath(destination);
		
		
		// detect simple rename -- no depth change
		if(Path.dirname(source) == Path.dirname(destination))
		{
			Fs.rename(source, destination, cbfsmove);
		}


		// handle complex rename, relative symlinks have to be redone when depth changes
		Fs.stat(source, function(err, stat) {
			if (!jsDAV_Util.empty(err))
				return cbfstree(new jsDAV_Exc.jsDAV_Exception_FileNotFound("File at location " + realPath + " not found"));
				
			if(stat.isDirectory())
			{
				
				// create destination directory
				if(!Path.existsSync(destination))
					Wrench.mkdirSyncRecursive(destination);
				
				// dive through files and create new symlinks
				Wrench.readdirRecursive(source, function(err, files) {

					// if files is empty, we're done
					if(!files)
					{
						Wrench.rmdirSyncRecursive(source);
						cbfsmove();
						return;
					}
					
					files.forEach(function(file) {
						file = Path.resolve(source, file);

						// skip non-files
						if(!Fs.statSync(file).isFile())
							return;
					
						var destFile = destination + file.substr(source.length)
							,destDir = Path.dirname(destFile)
							,fullObjectPath = Fs.realpathSync(file)
							,relativeObjectPath = Path.relative(destDir, fullObjectPath);
							
						// check that destDir exists
						if(!Path.existsSync(destDir))
							Wrench.mkdirSyncRecursive(destDir);
							
						// write link to destination with new relative path
						Fs.symlinkSync(relativeObjectPath, destFile);
						
/*
						console.log(
							'relinkFile'
							,'source='+file
							,'destination='+destFile
							,'relativeObjectPath='+relativeObjectPath
							,'fullObjectPath='+fullObjectPath
						);
*/
					});
				});

			}
			else
			{
				var fullObjectPath = Fs.realpathSync(source)
					,relativeObjectPath = Path.relative(destination, fullObjectPath); //Emergence.fs.SiteTree.buildRelativePath
				
/*
				console.log(
					'relinkFile'
					,'source='+source
					,'destination='+destination
					,'relativeObjectPath='+relativeObjectPath
				);
*/
				
				// create destination symlink
				if(Path.existsSync(destination))
					Fs.unlinkSync(destination);
				
				Fs.symlinkSync(relativeObjectPath, destination);
				
				// delete source symlink
				Fs.unlink(source, cbfsmove);
			}
		});
				
	}
	

});
