AO.prototype.invokeAction = function (msg, resultCallback) {
    var method = msg.action.method;
    this._logger.trace("InvokeMethod: invoking method ", method, " for msg ", msg);
    this._lazyInit("_methods", method);

    if (!this._methods[method]) {
        this._logger.warn("InvokeMethod: unknown method " + method);
        PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.METHOD_NOT_IMPL);
        resultCallback(msg);
        // ErrorReporter.ThrowGeneralError();
        return;
    }
    
    var methodParams = null;
    for(var index = 0; index < this._behaviors.length; index++) {
        var methodFormater = this._behaviors[index];
        if(Util.isNullOrUndefined(methodFormater["_FormatBehavior"])){
            continue;
        }
        if(Util.isNullOrUndefined(methodFormater["_FormatBehavior"][method])){
            continue;
        }
        methodParams = PlayerMethodAdaptorUtil.buildArgsArray(msg.action, methodFormater["_FormatBehavior"]);
        break;
    }
    if(Util.isNullOrUndefined(methodParams)) {
        //TODO
        // handle this error
    }
    methodParams.push(msg);
    methodParams.push(resultCallback);

    this._addTestObjectDescription(msg["testObject"], function(){
        this._methods[method].apply(this, methodParams);
    }.bind(this));
};

AO.prototype._addTestObjectDescription = function(testObject, resultCallback){
    var micClass = testObject["Description properties"]["mandatory"]["micclass"];
    var ao = this;
    if(micClass === "Browser"){
        ao = new BrowserContentHelper(content.frame);
    }
    else if(micClass === "Page"){
        ao = content.frame;
    }
    var props = content.frame.getObjIdentificationProps(micClass);
    var desc = Description.createRecordDescription(ao, props);
    this._mergeResponseDescription(testObject, desc);

    if(PlayerTestObjectUtil.hasPositionInfo(testObject))
    {
        if(Util.isNullOrUndefined(testObject["child"]))
            resultCallback();
        else
            this._addTestObjectDescription(testObject["child"], resultCallback);
    }
    else{
        var positionQueryMsg = new Msg("QUERY_ATTR", this.getID(), {abs_x: null, abs_y: null, height: null, width: null});
        ao.QUERY_ATTR(positionQueryMsg, function(positionResponseMsg){
            if(Util.isNullOrUndefined(testObject["Description properties"]["additionalInfo"]))
                testObject["Description properties"]["additionalInfo"] = {};
            Util.extend(testObject["Description properties"]["additionalInfo"], positionResponseMsg._data);
            if(Util.isNullOrUndefined(testObject["child"]))
                resultCallback();
            else
                this._addTestObjectDescription(testObject["child"], resultCallback);
        }.bind(this));
    }
};

AO.prototype._mergeResponseDescription = function(targetObject, responseDesc) {
    if(Util.isNullOrUndefined(responseDesc["description"]["smart identification properties"])){
        return;
    }
    if(Util.isNullOrUndefined(targetObject["Description properties"]["smart identification"]))
        targetObject["Description properties"]["smart identification"] = {};
    Util.extend(targetObject["Description properties"]["smart identification"], responseDesc["description"]["smart identification properties"]);

    if(Util.isNullOrUndefined(responseDesc["description"]["additionalInfo"])){
        return;
    }
    if(Util.isNullOrUndefined(targetObject["Description properties"]["additionalInfo"]))
        targetObject["Description properties"]["additionalInfo"] = {};
    Util.extend(targetObject["Description properties"]["additionalInfo"], responseDesc["description"]["additionalInfo"]);
};