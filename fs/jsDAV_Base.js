Ext.define('Emergence.fs.jsDAV_Base', {
    REGBASE: 0

    ,hasFeature: function(test){
        return this.REGBASE & test;
    }
});