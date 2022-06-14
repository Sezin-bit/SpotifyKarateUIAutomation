RadioGroupBehavior._methods["Select"] = function(value, response, resultCallback) {
    this._setActiveElemByValue(value);
    var visibleMsg = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": undefined});
    this.SRVC_MAKE_OBJ_VISIBLE(visibleMsg, function () {
        this._fireEvent(this._elem, "click", {});
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
        resultCallback(response);
    }.bind(this));
}  
RadioGroupBehavior._FormatBehavior = PlayerMethodFormat["WebRadioGroup"];