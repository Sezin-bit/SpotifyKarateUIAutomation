CheckBoxBehavior._methods["Set"] = function (value, response, resultCallback) {
    this._logger.info('call PlayerCheckBoxBehavior.Set function');
    if(this.GetAttrSync("disabled") === 1) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OBJECT_DISABLED);
        resultCallback(response);
        return;
    }
    if (typeof value === "string") {
        value = value.toUpperCase();
    }
    if (this.GetAttrSync("part_value") !== value) {
        this._fireEvent(this._elem, "click", {});
    }
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
}

CheckBoxBehavior._FormatBehavior = PlayerMethodFormat["WebCheckBox"];
