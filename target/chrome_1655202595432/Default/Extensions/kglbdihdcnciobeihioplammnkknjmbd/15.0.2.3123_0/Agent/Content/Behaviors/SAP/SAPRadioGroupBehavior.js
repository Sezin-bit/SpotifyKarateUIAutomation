
var SAPRadioGroupBehavior = {
    _micclass: ["SAPRadioGroup", "WebElement", "StdObject"],
    _attrs: {
        "logical name": SAPUtils.getGroupBoxName,

        "sap groupbox name": SAPUtils.getGroupBoxName,

        "checked": function () {
            var elem = this._elem;
            var Ischecked = 0;
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2_CHECK) ||
                !Util.isNullOrUndefined(SapConfigurationUtil.getElementOfCollection(elem.parentElement, SAP_SPECIFIER_ENUM.SAPSP_RADIOBUTTON_ON_EP7)))
                Ischecked = 1;
            return Ischecked;
        },

        "name": function () {
            var elem = this._elem;
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2))
                elem = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN)
            var name = "";
            if (elem != null) {
                name = elem.innerText;
                if (name == null || name.length <= 0)
                    name = elem.getAttribute("name");
            }

            return name;
        },

        "all items": function () {
            return this._radios.map(function (elem) {
                return this._radioButtonInitialValue(elem) || "on";
            }, this).join(";");
        },

        "selected item index": function () {
            // slected item index is 1' based
            return this._activeRadioIndex + 1;
        },

        "items count": function () {
            return this._radios.length;
        },

        value: function () {
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2)) {
                var selectedButton = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN);
                if (selectedButton == null)//S4HANA there is no input element inside radiogroup
                {
                    var valueInS4HANA = this._elem.innerText;
                    if (!!valueInS4HANA)
                        return valueInS4HANA;
                }
            }
            return this._calculateRadioButtonValue(this._elem);
        },

        "sapbutton clickable id": function () {
            return this.getID();
        },

        "sapbutton menu button id": function () {
            return this.getID();
        },

        "disabled": function () {
            return this._elem.disabled ? 1 : 0;
        },

        "type": function () {
            return this._elem.type || '';
        },

        //WIRadioGroupAttribute.
        "data": function () {
            return this.GetAttrSync("value");
        },

        y: function () {
            var rect = this.GetAttrSync("rect");
            var value = rect.top;
            if (value < 0) {
                value = SAPUtils.forwardQueryToPresentationElement(this, "y");
                //Return origin value.
                if (value == null) {
                    value = rect.top;
                }
            }
            return value;
        },

        width: function () {
			return SAPUtils.forwardDimensionQuery(this, "width");
        },

        height: function () {
			return SAPUtils.forwardDimensionQuery(this, "height");
        },

        screen_rect: function (msg, resultCallback) {
            // We can't tell by the original Query if we need to fix it so check if Y is positive
            var rect = this.GetAttrSync("rect");
            if (rect.top > 0) {
                return CommonBehavior._attrs["screen_rect"].call(this,msg, resultCallback);
            }

            var id = this._elem.id;
            if (!!id) {
                var visibleElem = document.getElementById(id + '-img');
                if (visibleElem) {
                    var visibleAo = WebKit.createAO(visibleElem, this._parentID);
                    if (visibleAo) {
                        return visibleAo.GetAttr("screen_rect",msg, resultCallback);
                    }
                }
            } 

            msg._to.object = this.getID().object;
            resultCallback(rect);
			return;
		}
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        _radios: [],
        refreshRadioGroup: function () {
            var allRadiosInGroup = [];

            //S4HANA CRM RADIO 
            var Parent_Crm_Elem = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_TESTMODE, 2);
            if (Parent_Crm_Elem != null && !SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_MAIN)) {
                var Crm_Radio = SapConfigurationUtil.getElementOfCollection(Parent_Crm_Elem, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_MAIN);
                if (Crm_Radio != null)
                    this._elem = Crm_Radio;
            }

            radioGroupName = this._elem.name;
            if (!radioGroupName)
                radioGroupName = this._elem.getAttribute('name');
            if (!radioGroupName)
                return;

            var allRadios = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2);//kernel 753p4
            if (allRadios.length <= 0) {
                allRadios = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN);//kernel 753p2
                allRadios = allRadios.filter(function (member) {
                    if (member.getAttribute('type') == 'checkbox' &&
                        SapConfigurationUtil.isElementOfSpecifier(member.parentElement, SAP_SPECIFIER_ENUM.SAPSP_CONTAINER_RADIOBUTTON_EP7))
                        return true;
                    else
                        return false;
                });
            }

            if (allRadios.length <= 0) {
                allRadios = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_MAIN);//crm
                allRadios = allRadios.filter(function (member) {
                    if (member.getAttribute('type') == 'radio')
                        return true;
                    else
                        return false;
                });
            }


            if (allRadios.length > 0) {
                allRadiosInGroup = allRadios.filter(function (member) {
                    // We can't filter using the querySelectorAll since that the name can contain chars that aren't allowed to be used in querySelectorAll
                    return member.getAttribute('name') == radioGroupName;
                });
            }
            else {
                allRadiosInGroup = [this._elem];
            }

            this._radios = allRadiosInGroup;
            if (SapConfigurationUtil.isElementOfSpecifier(this._radios[0], SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_MAIN)) {
                this._activeRadioIndex = Util.arrayFindIndex(this._radios, function (member) {
                    return member.checked == true;
                }.bind(this));
            }
            else {
                this._activeRadioIndex = Util.arrayFindIndex(this._radios, function (member) {
                    return SapConfigurationUtil.isElementOfSpecifier(member, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2_CHECK) ||
                        !Util.isNullOrUndefined(SapConfigurationUtil.getElementOfCollection(member.parentElement, SAP_SPECIFIER_ENUM.SAPSP_RADIOBUTTON_ON_EP7));
                }.bind(this));
            }


            // There is no radio selected in the group. So using #0
            if (this._activeRadioIndex === -1)
                this._activeRadioIndex = 0;

            this._elem = this._radios[this._activeRadioIndex];
        },

        _radioButtonInitialValue: function (elem) { // Get value of radio button without regards to other buttons (may be overridden)
            return RoleWebUtil.getText(elem) || RoleWebUtil.getText(elem.parentElement);
        },

        _setActiveElemByValue: function (val) {
            var elem;
            var activeRadioIndex = -1;
            var matches = val.match(/^#(\d+)$/);
            if (matches) {
                var index = parseInt(matches[1], 10);
                if (index >= 0 && index < this._radios.length) {
                    elem = this._radios[index];
                    activeRadioIndex = index;
                }
            } else {
                var valUpperCase = val.toUpperCase();
                this._radios.some(function (radio, index) {
                    var radioValUpperCase = this._radioButtonInitialValue(radio).toUpperCase();
                    if (radioValUpperCase === valUpperCase) {
                        elem = radio;
                        activeRadioIndex = index;
                        return true;
                    }
                    return false;
                }.bind(this));
            }

            if (activeRadioIndex == -1) {
                ErrorReporter.ThrowItemNotFound();
            }

            if (this.GetAttrSync("disabled")) {
                ErrorReporter.ThrowObjectDisabled();
            }

            this._elem = elem;
            this._activeRadioIndex = activeRadioIndex;
        },

        // Compute the value of the radio-button in the context of the entire radio-group
        _calculateRadioButtonValue: function (radioElem) {
            this._logger.trace('SAPRadioGroupBehavior._calculateRadioButtonValue: started');
            var val = this._radioButtonInitialValue(radioElem);

            var radioElemIndex = -1;
            var not_unique = this._radios.filter(function (elem, i) {
                if (elem === radioElem)
                    radioElemIndex = i;

                return this._radioButtonInitialValue(elem) === val;
            }, this).length > 1;

            if (radioElemIndex === -1) {
                this._logger.error('SAPRadioGroupBehavior._calculateRadioButtonValue: could not find radio element in radio array');
                return val;
            }

            if (val === "" || val === "on" || not_unique) {
                return "#" + radioElemIndex;
            }

            return val;
        },
    },

    _methods: {
        "CALL_EVENT": function (msg, resultCallback) {
            this._logger.trace("SAPRadioGroupBehavior: on command CALL_EVENT");
            this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, function (resMsg) {
                var event = resMsg._data.event;
                event = event.replace(/^on/, "");
                this._fireEvent(this._elem, event, resMsg._data);
                resultCallback(resMsg);
            }.bind(this));
        },

        "SET_ACTIVE_RADIO_BY_VALUE": function (msg, resultCallback) {
            this._logger.trace("SAPRadioGroupBehavior: on command SET_ACTIVE_RADIO_BY_VALUE");
            var val = msg._data.value;
            if (!val) {
                resultCallback(msg);
                return;
            }

            this._setActiveElemByValue(val);

            resultCallback(msg);
        },

        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("SAPRadioGroupBehavior: on command SET_DATA");
            msg._data.value = msg._data.data;
            this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, resultCallback);
        },

        "SET_VALUE_EX": function (msg, resultCallback) {
            this._logger.trace("SAPRadioGroupBehavior: on command SET_VALUE");
            this._setActiveElemByValue(msg._data.value);

            var visibleMsg = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), { "disable browser popup": msg._data["disable browser popup"] });
            this.SRVC_MAKE_OBJ_VISIBLE(visibleMsg, function () {
                this._fireEvent(this._elem, "click", {});
                resultCallback(msg);
            }.bind(this));
        }

    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPRadioGroupBehavior._eventHandler: Received recordable event: ' + ev.type);
        switch (ev.type) {
            case 'click':
                this.refreshRadioGroup();
                if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_MAIN))//CRM RadioGroup, activeRadio changed after event click
                    this._radioElemForRecord = this._radios[this._activeRadioIndex];

                //S4HANA RADIOGROUP will receive 2 click event
                if (SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_TESTMODE, 2) != null && ev.target != this._radioElemForRecord)
                    return true;

                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    value: this._calculateRadioButtonValue(this._radioElemForRecord),
                });
                return true;
        }
    }
};




