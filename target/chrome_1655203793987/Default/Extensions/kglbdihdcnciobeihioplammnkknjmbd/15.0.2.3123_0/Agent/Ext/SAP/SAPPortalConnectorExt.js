
var SAPPortalConnectorExt = {
    ORI_getgetClassForPage: Page.prototype.getClassForPage,
    ORI_invokeMethods: Page.prototype.invokeMethods,
    ORI_calculateFrameDescription: Page.prototype._calculateFrameDescription,

    Merge: function () {
        Page.prototype.getClassForPage = SAPPortalConnectorExt.getClassForPage;
        Page.prototype.invokeMethods = SAPPortalConnectorExt.invokeMethods;
        Page.prototype._calculateFrameDescription = SAPPortalConnectorExt._calculateFrameDescription;
    },
    RollBack: function () {
        Page.prototype.getClassForPage = SAPPortalConnectorExt.ORI_getgetClassForPage;
        Page.prototype.invokeMethods = SAPPortalConnectorExt.ORI_invokeMethods;
        Page.prototype._calculateFrameDescription = SAPPortalConnectorExt.ORI_calculateFrameDescription;
    },
    getClassForPage: function (msg, resultCallback) {
        this._logger.trace("getClassFromContent: Started");
        var stateRequest = new Msg("QUERY_ATTR", this.getID(), { micclass: null });
        this._DispatchToOurContent(stateRequest, function (resStateMsg) {
            resultCallback(resStateMsg._data.micclass);
        });
    },
    invokeMethods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this._logger.trace("GET_PATH_STATUS: started");
            this._DispatchToOurContent(msg, resultCallback);
        },

        "SAP_TABSTRIP_GET_TAB_ID": function (msg, resultCallback) {
            this._logger.trace("SAP_TABSTRIP_GET_TAB_ID: started");
            this._DispatchToOurContent(msg, resultCallback);
        },

        "SAP_PORTAL_GET_SEARCH_BUTTON_ID": function (msg, resultCallback) {
            this._logger.trace("SAP_TABSTRIP_GET_TAB_ID: started");
            this._DispatchToOurContent(msg, resultCallback);
        },
    },
    _calculateFrameDescription: function (msg, callback) {
        this._logger.trace("_calculateFrameDescription: Called");

        // Get Frame Description
        var recordedDescriptionArr = msg._data["recorded description"][0];
        var frameIndex = Util.arrayFindIndex(recordedDescriptionArr, function (descSpecialObj) {
            return Util.isFrame(descSpecialObj.description.properties.micclass);
        }, this);

        if (frameIndex === -1 || recordedDescriptionArr[0].description.properties.micclass == "SAPPortal") {
            this._logger.trace("_calculateFrameDescription: No Frame in description");
            callback(msg);
            return;
        }

        var frameDescriptionSpecialObj = recordedDescriptionArr[frameIndex];

        var frameRtid = msg._data.WEB_PN_ID[0][frameIndex];
        Util.assert(RtIdUtils.IsRTIDFrame(frameRtid), "_calculateFrameDescription: runtime id in index " + frameIndex + " doesn't contain a frame rtid. rtid= " + JSON.stringify(frameRtid), this._logger);

        this._fixFrameDescription(frameRtid, frameDescriptionSpecialObj.description, this._objIdentificationProps, function (updatedDescription) {
            frameDescriptionSpecialObj.description = updatedDescription;
            callback(msg);
        }.bind(this));
    },
}







