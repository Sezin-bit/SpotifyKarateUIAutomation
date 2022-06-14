var RoleWebCheckbox = {
    isRoleBased: true,
    _util: {
        isCheckbox: function (elem) {
            var role = RoleWebUtil.getRole(elem);
            return role === 'checkbox';
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebCheckbox._util.isCheckbox(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [CheckBoxBehavior, this._behavior]);
        }
        return null;
    },
    _behavior: {
        name: 'RoleWebCheckbox',
        _attrs: {
            "logical name": function () {
                return RoleWebUtil.getLogicalName(this._elem);
            },
            "checked": function () {
                return this._elem.getAttribute('aria-checked') === 'true' ? 1 : 0;
            },
            "value": function () {
                return this._elem.value;
            },
            "part_value": function () {
                return this._elem.getAttribute('aria-checked') === 'true' ?  "ON" : "OFF";
            }
        },
        _eventHandler: function (recorder, ev) {
            if (ContentUtils.isTouchEnabled())
                return true;

            this._logger.trace('RoleWebCheckbox.eventHandler: Received recordable event: ', ev.type);

            if (ev.type === 'click') {
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    part_value: this._elem.getAttribute('aria-checked') === 'false' ? 'ON' : 'OFF'
                });
                return true;
            }
        }
    }
};

RoleWebKit.registerFactory(RoleWebCheckbox);