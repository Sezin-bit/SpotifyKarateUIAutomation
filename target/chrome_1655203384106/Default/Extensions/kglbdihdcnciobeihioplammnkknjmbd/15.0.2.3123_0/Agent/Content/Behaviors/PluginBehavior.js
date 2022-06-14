var PluginBehavior = {
    _attrs: {
        qtp_slv_cookie: function () {
            var ret = this._elem.getAttribute('qtp_slv_cookie') ;
            this._logger.trace('Asked for qtp_slv_cookie returning: ' + ret);
            return ret || '';
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue
    }
};