var RoleWebRadioGroup = {
    isRoleBased: true,
    _util: {
        isRadioGroup: function (elem) {
            var role = RoleWebUtil.getRole(elem);
            return role === 'radio';
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebRadioGroup._util.isRadioGroup(elem)) {
            var ao = RoleWebUtil.createAO(elem, parentId, [RadioGroupBehavior, this._behavior]);
            ao.refreshRadioGroup(ao._elem);
            return ao;
        }
        return null;
    },
    _behavior: {
        name: 'RoleWebRadioGroup',
        _attrs: {
            "logical name": function () {
                return RoleWebUtil.getLogicalName(this._elem);
            },
            "checked": function () {
                return this._elem.getAttribute('aria-checked') === 'true' ? 1 : 0;
            }
        },
        _eventHandler: function (recorder, ev) {
            this._logger.trace('RoleWebRadioGroup.eventHandler: Received recordable event: ', ev.type);
            if (ContentUtils.isTouchEnabled())
                return true;

            switch (ev.type) {
                case 'click':
                    var radioElem = Util.findAncestor(ev.target, function (e) {
                        return e.matches && e.matches('[role=radio]');
                    });
                    if (radioElem) {
                        recorder.sendRecordEvent(this, ev, {
                            event: 'onclick',
                            value: this._calculateRadioButtonValue(radioElem)
                        });
                    }
                    return true;
            }
        },
        _helpers: {
            _getSiblingRadios: function (elem) {
                var radios = [];
                var currentNode = elem.parentNode.firstElementChild;
                for (; currentNode; currentNode = currentNode.nextElementSibling) {
                    var role = RoleWebUtil.getRole(currentNode);
                    if (currentNode.nodeType === 1 && role === 'radio') {
                        radios.push(currentNode);
                    }
                }
                return radios;
            },
            refreshRadioGroup: function (triggeringElem) {
                this._logger.trace('RoleWebRadioGroup.refreshRadioGroup: started');
                if (triggeringElem)
                    this._triggeringElem = triggeringElem;

                var radioGroup = Util.findAncestor(this._elem, function (item) {
                    return item.matches && item.matches('[role=radiogroup]');
                });

                if (!!radioGroup) {
                    this._radios = Util.makeArray(radioGroup.querySelectorAll("[role=radio]"));
                } else {
                    this._radios = this._getSiblingRadios(triggeringElem);
                }

                this._activeRadioIndex = Util.arrayFindIndex(this._radios, function (radio) {
                    return radio.getAttribute('aria-checked') === 'true';
                }.bind(this));

                // There is no radio selected in the group. So using #0
                if (this._activeRadioIndex === -1)
                    this._activeRadioIndex = 0;

                this._elem = this._radios[this._activeRadioIndex];
            },
            _radioButtonInitialValue: function (elem) {
                return RoleWebUtil.getText(elem) || RoleWebUtil.getText(elem.parentElement);
            }
        }
    }
};

RoleWebKit.registerFactory(RoleWebRadioGroup);