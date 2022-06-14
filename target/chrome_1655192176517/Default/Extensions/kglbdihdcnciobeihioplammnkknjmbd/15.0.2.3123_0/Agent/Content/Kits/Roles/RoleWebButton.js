var RoleWebButton = {
    isRoleBased: true,
    _util: {
        isButton: function (elem) {
            var role = RoleWebUtil.getRole(elem);
            return role === 'button';
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebButton._util.isButton(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [ButtonBehavior, this._behavior]);
        }
        return null;
    },
    _behavior: {
        name: 'RoleWebButton',
        _attrs: {
            "logical name": function () {
                return RoleWebUtil.getLogicalName(this._elem);
            }
        },
        _methods: {
            CALL_EVENT: function (msg, resultCallback) {
                this._logger.trace("RoleWebButton: on commnad CALL_EVENT");
                var event = msg._data.event;
                event = event.toLowerCase().replace(/^on/, "");
                // in case this is a composited element
                // we'll direct event into the center element
                if (this._elem.children.length > 0) {
                    var elemRec = this._elem.getBoundingClientRect();
                    this._elem = document.elementFromPoint(elemRec.left + elemRec.width / 2, elemRec.top + elemRec.height / 2);
                }
                this._fireEvent(this._elem, event, msg._data);
                resultCallback(msg);
            }
        }
    }
};

RoleWebKit.registerFactory(RoleWebButton);