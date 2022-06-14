RoleWebList._behavior._methods["MakeItemVisible"] = function (value, xpath, timeout, response, resultCallback) {
    this._logger.info('call PlayerRoleWebList.MakeItemVisible function');

    if (timeout < 0) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.INVALID_ARGUMENT);
        resultCallback(response);
        return;
    }
    timeout *= 1000; // Convert to milliseconds

    // Get element by xpath
    var elements = [];
    if (xpath) {
        elements = Description.getElementsByXpath(xpath, this._elem);;
    }
    if (elements.length === 0) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.ITEM_NOT_FOUND);
        resultCallback(response);
        return;
    }
    if (elements.length > 1) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.ITEM_NOT_UNIQUE);
        resultCallback(response);
        return;
    }

    var elementByXPath = elements[0];
    var position = this._getClickPosition(null, elementByXPath);
    var expire = new Date().getTime() + timeout; // timeout is milliseconds
    var self = this;
    function scroll(value, position, expire) {
        if (self._isItemVisible(value)) {
            PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
            resultCallback(response);
        } else if (new Date().getTime() > expire) {
            PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.ITEM_NOT_FOUND);
            resultCallback(response);
        } else {
            self._fireEvent(elementByXPath, 'click', { pos: position });
            Util.setTimeout(scroll, 100, value, position, expire);
        }
    };
    scroll(value, position, expire);
}

RoleWebList._behavior._methods["Select"] = function (value, response, resultCallback) {
    this._logger.info('call PlayerRoleWebList.Select function');

    var self = this;
    var data = {};
    function onComplete() {
        var target = RoleWebList._util.getItemToSelect(self._elem, value);
        if (target) {
            if (ContentUtils.isTouchEnabled()) {
                // re-allocate position
                data.pos = ContentUtils.pointRelativeToElem(target, { x: Constants.noCoordinate, y: Constants.noCoordinate });
                // re-allocate target because sometimes the target and the element retrieve from entire point are not the same
                // the current target is overlayed by another layer that take responsible for touching
                // so TOUCH event should be sent to that layer
                target = document.elementFromPoint(data.pos.x, data.pos.y);
            }
            self._fireEvent(target, 'click', data);
            PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
        } else {
            PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.ITEM_NOT_FOUND);
        }
        resultCallback(response);
    };
    this._makeItemVisible(value, onComplete);
}

RoleWebList._behavior._methods["GetItem"] = function (index, response, resultCallback) {
    this._logger.info('call PlayerRoleWebList.GetItem function');

    index -= 1;
    var items = RoleWebList._util.getListItems(this._elem);
    if (index < 0 || index >= items.length) {
        PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.ITEM_NOT_FOUND);
        resultCallback(response);
        return;
    }
    response.result = { value: RoleWebUtil.getText(items[index]) };

    PlayerStateHandler.setErrorCode(response, PLAYER_STATE_TYPES.OK);
    resultCallback(response);
}

RoleWebList._FormatBehavior = PlayerMethodFormat["WebList"];
