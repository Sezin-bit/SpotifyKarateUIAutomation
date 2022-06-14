
var SAPPortalConnectorContent = {
    ORI_invokeMethods: Frame.prototype.invokeMethods,
    ORI_Function_isPage: Frame.prototype.Function_isPage,
    ORI_isContainerMicclass: Util.isContainerMicclass,

    Merge: function () {
        for (let key in SAPPortalBehavior._attrs) {
            content.frame._attrs[key] = SAPPortalBehavior._attrs[key];
        }
        Frame.prototype.invokeMethods = SAPPortalConnectorContent.invokeMethods;
        Frame.prototype.Function_isPage = SAPPortalConnectorContent.Function_isPage;
        Util.isContainerMicclass = SAPPortalConnectorContent.isContainerMicclass;
        var pageMsg = new Msg("QUERY_ATTR", RtIdUtils.GetAgentRtid(), { 'SAPPortal Change': 1 });
        content.dispatcher.sendMessage(pageMsg, null, "chrome", function () {
        });
    },
    RollBack: function () {
        Frame.prototype.invokeMethods = SAPPortalConnectorContent.ORI_invokeMethods;
        Frame.prototype.Function_isPage = SAPPortalConnectorContent.ORI_Function_isPage;
        Util.isContainerMicclass = SAPPortalConnectorContent.ORI_isContainerMicclass;
        var pageMsg = new Msg("QUERY_ATTR", RtIdUtils.GetAgentRtid(), { 'SAPPortal Change': 0 });
        content.dispatcher.sendMessage(pageMsg, null, "chrome", function () {
        });
    },

    invokeMethods: {
        GET_ID_FROM_SOURCE_INDEX: function (msg, resultCallback) {
            this._logger.warn("GET_ID_FROM_SOURCE_INDEX is not implemented");
            resultCallback(msg);
        },
        DOC_EXECUTE_SCRIPT: function (msg, resultCallback) {
            this._logger.trace("DOC_EXECUTE_SCRIPT: Started");

            var logger = this._logger;
            var rtid = this.getID();

            this._runOnDoc(msg._data.text, function (resultData) {
                logger.debug("DOC_EXECUTE_SCRIPT: Got result for script " + resultData.script);
                if (resultData.ex) {
                    logger.debug("DOC_EXECUTE_SCRIPT: Got Excepion in script:" + resultData.ex);
                    msg._data['JScript Exception'] = resultData.ex.toString();
                }

                //check if the return value is object we need the .Object mechanisim
                if (resultData.result && (Util.isObject(resultData.result) || Array.isArray(resultData.result))) {
                    logger.debug("DOC_EXECUTE_SCRIPT: The result of this script is an object, wrapping it with DotObject proxy object");
                    var proxy = new DotObjJSProxy(resultData.result, rtid);
                    msg._data.value = SpecialObject.CreateDotObj(proxy.getID());
                    msg._data.activex_interface = true;
                }
                else {
                    msg._data.value = resultData.result;
                }

                resultCallback(msg);
            });
        },
        SAVE_FRAME_SOURCE_NOT_RECURSIVE: function (msg, resultCallback) {
            this._logger.trace("SAVE_FRAME_SOURCE_NOT_RECURSIVE: started");
            var path = msg._data.WEB_N_SSV_PATH;
            var base = msg._data.WEB_N_SSV_FRAME_BASE_NAME;
            var fullPath = path + "\\" + base + ".html";
            var frameSource = this._getFrameSource().html;

            msg._data.result = SpecialObject.CreateFrameSource(fullPath, frameSource);
            resultCallback(msg);
        },
        "GET_PATH_STATUS": function (msg, resultCallback) {
            return SAPPortalBehavior._methods["GET_PATH_STATUS"](msg, resultCallback);
        },

        "SAP_TABSTRIP_GET_TAB_ID": function (msg, resultCallback) {
            return SAPPortalBehavior._methods["SAP_TABSTRIP_GET_TAB_ID"].call(this, msg, resultCallback);
        },

        "SAP_PORTAL_GET_SEARCH_BUTTON_ID": function (msg, resultCallback) {
            return SAPPortalBehavior._methods["SAP_PORTAL_GET_SEARCH_BUTTON_ID"](msg, resultCallback);
        },
    },
    Function_isPage: function (recordedMicclassArr) {
        return (recordedMicclassArr[0] != "SAPPortal") && this._isPage;
    },
    isContainerMicclass: function (micclass) {
        return micclass === "Browser" || micclass === "Page" || Util.isFrame(micclass) || micclass === "SAPPortal";
    },
}







