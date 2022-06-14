Frame.prototype.onMessageForPlayer = function (msg, resultCallback) {
    var action = msg.action.method;
    var func = this.playerHandler[action];
    if (Util.isNullOrUndefined(func)) {
        PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.METHOD_NOT_IMPL);
        resultCallback(msg);
        return;
    }
    var methodParams = PlayerMethodAdaptorUtil.buildArgsArray(msg.action, PlayerMethodFormat["Page"]);
    methodParams.push(msg);
    methodParams.push(resultCallback);
    func.apply(this, methodParams);

};

Frame.prototype.playerHandler = {
    "RunScript": function (script, response, resultCallback) {
        var rtid = this.getID();
        this._runOnDoc(script, function (resultData) {
            response["result"] = {};
            if (resultData.ex) {
                response["result"]["JScript Exception"] = resultData.ex.toString();
            }
            //check if the return value is object we need the .Object mechanisim
            if (resultData.result && (Util.isObject(resultData.result) || Array.isArray(resultData.result))) {
                var proxy = new DotObjJSProxy(resultData.result, rtid);
                response["result"]["value"] = SpecialObject.CreateDotObj(proxy.getID());
                response["result"]["activex_interface"] = true;
            }
            else {
                response["result"]["value"] = resultData.result;
            }
            PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
            resultCallback(response);
        })
    },
    "GetROProperties": function(propsObj, response, resultCallback) {
        var propsQueryMsg = new Msg("QUERY_ATTR", this.getID(), propsObj);
        this.QUERY_ATTR(propsQueryMsg, function (propsResponseMsg) {
            PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
            response.result = propsResponseMsg._data;
            var testObject = PlayerUtil.getTargetTestObject(response["testObject"]);
            if(Util.isNullOrUndefined(testObject["Description properties"]["additionalInfo"]))
                testObject["Description properties"]["additionalInfo"] = {};
            Util.extend(testObject["Description properties"]["additionalInfo"], propsResponseMsg._data);
            resultCallback(response);
        }.bind(this));
    },
    "GetAllROProperties": function(properties, response, resultCallback) {
        var propsObj = {};
        properties.forEach(function (propName) {
            propsObj[propName] = null;
        }, this);
        Frame.prototype.playerHandler["GetROProperties"].call(this, propsObj, response, resultCallback);
    },
    "GetROProperty": function (property, response, resultCallback) {
        this._logger.info('call CommonBehavior.GetROProperty function');
        var propsObj = {};
        propsObj[property] = null;
        Frame.prototype.playerHandler["GetROProperties"].call(this, propsObj, response, resultCallback);
    }
};
Frame.prototype.playerHandler["RunScriptFromFile"] = Frame.prototype.playerHandler["RunScript"];
