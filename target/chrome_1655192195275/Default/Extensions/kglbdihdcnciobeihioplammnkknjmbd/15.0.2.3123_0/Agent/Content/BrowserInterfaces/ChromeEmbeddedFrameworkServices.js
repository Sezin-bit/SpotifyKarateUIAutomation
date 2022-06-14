// Should be included *after* EmbeddedBrowserContentServices
function CEFElementInspector(frameId) {
    this._init(frameId);
}

Util.inherit(CEFElementInspector, ElementInspector, {
    _movePoint: null,

    _mouseMove: function (ev) {
        this._logger.trace("CEFElementInspector._mouseMove called");
        this._movePoint = { x: ev.clientX, y: ev.clientY };
        this._logger.trace("CEFElementInspector._mouseMove called _movepoint="+JSON.stringify(this._movePoint));
        this._internalMouseMove(ev);
    },

    stopSpy: function (msg, resultCallback) {
        this._logger.trace("CEFElementInspector stopSpy. _movePoint = "+JSON.stringify(this._movePoint));
        var point = this._movePoint;
        this._internalStopSpy();

        if (!point)
            return resultCallback(msg);
        delete this._movePoint;
        this._getObjectFromClientPoint(point, function (resMsg) {
            msg._data = resMsg._data;
            resultCallback(msg);
        });
    }   
});

BrowserServices.getElementInspector = function (frameId) {
    return new CEFElementInspector(frameId);
}

BrowserServices.isSupportMonitorMouseMove = true;
BrowserServices.coordinatesAreRelativeToPage = false;

//override ContentUtils.evalInDocument using eval instead of inline script in cep.
(function () {
    if (window.cep) {
        ContentUtils.evalInDocument = function (exp, doc) {
            doc = doc || document;
            var scriptText = typeof (exp) === 'function' ? Util.functionStringify(exp) : exp;
            doc.defaultView.eval(scriptText);
        };
    }
})();
