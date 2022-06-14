ListBehavior._helpers["_playerInvokeAction"] = function(action, value, response, resultCallback, checkDisabled) {
    if (checkDisabled && this.GetAttrSync("disabled") === 1) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OBJECT_DISABLED);
        resultCallback(response);
        return;
    }

    var msgMakeVisible = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": undefined });
    this.SRVC_MAKE_OBJ_VISIBLE(msgMakeVisible, function () {
        this._fireEvent(this._elem, "focus");

        if (typeof value === 'string' && value.indexOf('#') === 0) { // When select with index, item is like #1, #2, etc...
            value = value.substr(1);
            if (!Number.isNaN(Number(value))) {
                value = Number(value);
            }
        }

        var rtn = this._getOptionItemToSelect(value, false);
        if (rtn.index === undefined) {
            PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.ITEM_NOT_FOUND);
            resultCallback(response);
            return;
        }
        action(rtn);

        this._fireEvent(this._elem, 'change');
        this._fireEvent(this._elem, 'blur');

        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
        resultCallback(response);
    }.bind(this));
}

ListBehavior._methods["Select"] = function (value, response, resultCallback) {
    this._logger.info('call PlayerListBehavior.Select function');

    this._playerInvokeAction(function(rtn) {
        this._elem.selectedIndex = rtn.index;
    }.bind(this), value, response, resultCallback, true);
}

ListBehavior._methods["Deselect"] = function (value, response, resultCallback) {
    this._logger.info('call PlayerListBehavior.Deselect function');

    this._playerInvokeAction(function(rtn) {
        rtn.option.selected = false;
    }.bind(this), value, response, resultCallback, true);
}

ListBehavior._methods["ExtendSelect"] = function (value, response, resultCallback) {
    this._logger.info('call PlayerListBehavior.ExtendSelect function');

    this._playerInvokeAction(function(rtn) {
        rtn.option.selected = true;
    }.bind(this), value, response, resultCallback, true);
}

ListBehavior._methods["GetItem"] = function (index, response, resultCallback) {
    this._logger.info('call PlayerListBehavior.GetItem function');

    index -= 1;
    if (index < 0 || index >= this._elem.options.length) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.ITEM_NOT_FOUND);
        resultCallback(response);
        return;
    }
    response.result = { value: this._elem.options[index].text };

    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
}

ListBehavior._FormatBehavior = PlayerMethodFormat["WebList"];
