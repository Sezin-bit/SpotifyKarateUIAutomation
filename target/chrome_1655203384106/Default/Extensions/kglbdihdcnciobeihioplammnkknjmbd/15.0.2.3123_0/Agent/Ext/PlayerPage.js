Page.prototype.onMessageForPlayer = function(msg, resultCallback) {
    var method = msg["action"]["method"];
    var func = this.playerHandler[method];
    if(Util.isNullOrUndefined(func)) {
        func = this.playerHandler["NotImplmented"];
    }
    func.call(this, msg, resultCallback);
}

Page.prototype.playerHandler = {
    "RunScript": function(msg, resultCallback){
        ext.player.sendMessageToContent(msg, null, resultCallback);
    },
    "RunScriptFromFile": function(msg, resultCallback) {
        ext.player.sendMessageToContent(msg, null, resultCallback);
    },
    "Exist": function(msg, resultCallback) {
        PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.OK);
        resultCallback(msg);
    },
    "GetROProperties": function(msg, resultCallback) {
        var propsObj = {};
        var properties = msg["action"]["method"] === "GetROProperty" ? msg.action.unnamedArguments : msg.action.unnamedArguments[0];
        properties.forEach(function (propName) {
            propsObj[propName] = null;
        }, this);
        var propsQueryMsg = new Msg("QUERY_ATTR", this.getID(), propsObj);
        this.QUERY_ATTR(propsQueryMsg, function (propsResponseMsg) {
            PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.OK);
            msg.result = propsResponseMsg._data;
            for (var key in msg.result) {
                if(msg.result[key] === undefined)
                    msg.result[key] = null;
            }
            var testObject = PlayerUtil.getTargetTestObject(msg["testObject"]);
            if(Util.isNullOrUndefined(testObject["Description properties"]["additionalInfo"]))
                testObject["Description properties"]["additionalInfo"] = {};
            Util.extend(testObject["Description properties"]["additionalInfo"], propsResponseMsg._data);
            resultCallback(msg);
        }.bind(this));
    },
    "GetAllROProperties": function(msg, resultCallback) {
        this.playerHandler["GetROProperties"].call(this, msg, resultCallback);
    },
    "GetROProperty": function (msg, resultCallback) {
        this.playerHandler["GetROProperties"].call(this, msg, resultCallback);
    },
    "CaptureBitmap": function (msg, resultCallback) {
        PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.OK);
        resultCallback(msg);
    },
    "NotImplmented": function(msg, resultCallback) {
        PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.METHOD_NOT_IMPL);
        resultCallback(msg);
    }
}