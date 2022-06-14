EditBehavior._methods["Set"] = function (value, performCommit, response, resultCallback) {
    Util.assert(typeof (value) === "string");

    var isDisabled = this.GetAttrSync("disabled");
    var isReadonly = this.GetAttrSync("readonly");
    if (isDisabled || isReadonly) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OBJECT_DISABLED);
        resultCallback(response);
        return;
    }

    var maxLength = this.GetAttrSync("max length") || -1;
    if (-1 != maxLength && value.length > maxLength) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.INVALID_ARGUMENT);
        resultCallback(response);
        return;
    }

    if (typeof value === "string") {
        //set the string without the last character
        this._elem.value = value.substring(0, value.length - 1);

        //charAt will return "" when out of range like string "";
        var lastKey = value.charAt(value.length - 1);

        //fire keyboard event for the last character;
        this._fireEvent(this._elem, "keydown", { key: lastKey });
        this._fireEvent(this._elem, "keypress", { key: lastKey });
        this._elem.value = value;
        this._fireEvent(this._elem, "input", { key: lastKey });
        this._fireEvent(this._elem, "keyup", { key: lastKey });
    } else {
        this._elem.value = value;
        this._fireEvent(this._elem, "input", {});
    }

    if (performCommit) {
        this._fireEvent(this._elem, "change");
        this._fireEvent(this._elem, "blur");
    }
    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
}

EditBehavior._methods["SetSecure"] = function(secureText, response, resultCallback) {
    EditBehavior._methods["Set"].call(this, secureText, true, response, resultCallback);
}

EditBehavior._FormatBehavior = PlayerMethodFormat["WebEdit"];

