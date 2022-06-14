var CRMUtil = {
    isCRMElement: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN))
            return true;
        return this.getCRMContainerElement(elem) != null;
    },
    getCRMContainerElement: function (elem) {
        // TODO: 
        // 	if(m_WIConfigurationObject.UsingCache())	
        var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_APPLICATION_FRAME);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_TESTMODE_CONTAINER);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_TESTMODE);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_SECOND, 3);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_TESTMODE);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_CONTAINER);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_SECOND, 2);
        if (container != null)
            return container;

        var crmSpecifiers = [SAP_SPECIFIER_ENUM.SAP_CRM_APPLICATION_FRAME, SAP_SPECIFIER_ENUM.SAP_CRM_TESTMODE_CONTAINER,
            SAP_SPECIFIER_ENUM.SAP_CRM_MENU_TESTMODE, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_TESTMODE,
            SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_CONTAINER, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR
        ];
        container = SapConfigurationUtil.getContainerElementOfSpecifiers(elem, crmSpecifiers);
        if (container != null)
            return container.element;
        return null;
    },

    getCRMTestmodeElement: function (elem) {
        // TODO: 
        // 	if(m_WIConfigurationObject.UsingCache())	
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN))
            return elem;

        var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_TESTMODE);
        if (container != null)
            return elem;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_SECOND, 3);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_CONTAINER);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_TESTMODE_CONTAINER);
        if (container != null)
            return container;

        container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_SECOND, 2);
        if (container != null)
            return container;

        var crmTestModeSpecifiers = [SAP_SPECIFIER_ENUM.CRM_MENU_TESTMODE, SAP_SPECIFIER_ENUM.CRM_CALENDAR_CONTAINER,
            SAP_SPECIFIER_ENUM.CRM_NAVIGATIONBAR, SAP_SPECIFIER_ENUM.CRM_TESTMODE_CONTAINER
        ];
        container = SapConfigurationUtil.getContainerElementOfSpecifiers(elem, crmTestModeSpecifiers);
        if (container != null) {
            if (container.specifier == SAP_SPECIFIER_ENUM.CRM_MENU_TESTMODE)
                return elem;
            else
                return container.element;
        } else
            return null;
    },

    getCRMElementClass: function (elem) {
        var testModeElement = CRMUtil.getCRMTestmodeElement(elem);
        if (testModeElement == null)
            return null;

        if (elem.tagName.toUpperCase() == "INPUT") {
            if (this.isElementSearchFormEdit(elem))
                return "SAP_OBJECT_CRM_SEARCH_FORM_EDIT";
            else if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_EDIT_TESTMODE))
                return "SAP_OBJECT_EDIT";
        }

        if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_SEARCHABLE_EDIT_TESTMODE) &&
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN))
            return "SAP_OBJECT_CRM_SEARCHEDIT";

        if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_SEARCHABLE_EDIT_TESTMODE) &&
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_BUTTON_MAIN))
            return "SAP_OBJECT_CRM_SEARCHBUTTON";

        if (elem.tagName.toUpperCase() == "TD" &&
            SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR) != null)
            return "SAP_OBJECT_CRM_NAVIGATIONBAR";

        if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_TESTMODE) &&
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN))
            return "SAP_OBJECT_CRM_LIST";

        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN))
            return "SAP_OBJECT_CRM_LIST_ITEM";

        if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_TESTMODE) &&
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_BUTTON_MAIN))
            return "SAP_OBJECT_CRM_LIST_BUTTON";

        if (elem.tagName.toUpperCase() == "A" &&
            SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_TESTMODE))
            return "SAP_OBJECT_CRM_CHECKBOX";

        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM) ||
            (elem.tagName.toUpperCase() == "A" &&
                SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_LINK_TESTMODE) &&
                SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_TESTMODE, 5) != null))
            return "SAP_OBJECT_CRM_DROPDOWNMENUITEM";

        if (elem.tagName.toUpperCase() == "SPAN" &&
            SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_ITEM_DYM, 5) != null)
            return "SAP_OBJECT_CRM_DROPDOWNMENUITEM";

        if (elem.tagName.toUpperCase() == "UL" && this.isElementSAPCRMDropDownMenuTestmode(testModeElement))
            return "SAP_OBJECT_CRM_DROPDOWNMENU";

        if (this.isElementSAPCRMRadioGroupTestmode(elem, testModeElement))
            return "SAP_OBJECT_RADIOGROUP";

        if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_CONTAINER))
            return "SAP_OBJECT_CRM_CALENDAR";

        if ((elem.tagName.toUpperCase() == "IMG" || elem.tagName.toUpperCase() == "INPUT") &&
            SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_TESTMODE))
            return "SAP_OBJECT_CRM_CALENDAR";

        if (elem.tagName.toUpperCase() == "TEXTAREA" &&
            SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_TEXTAREA_TESTMODE))
            return "SAP_OBJECT_CRM_TEXTAREA";

        if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE) &&
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_MAIN))
            return "SAP_OBJECT_CRM_TABLE";

        if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE) &&
            (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_CELL) ||
                SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_HEADER_CELL)))
            return "SAP_OBJECT_CRM_TABLE_CELL";

        if ((elem.tagName.toUpperCase() == "LI" || elem.tagName.toUpperCase() == "A") &&
            SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE) &&
            SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_FOOTER))
            return "SAP_OBJECT_CRM_BUTTON";

        if (this.isElementSAPCRMButtonTestmode(elem, testModeElement))
            return "SAP_OBJECT_CRM_BUTTON";

        return null;
    },

    isElementSearchFormEdit: function (elem) {
        return SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_SEARCH_FORM);
    },

    isElementSAPCRMDropDownMenuTestmode: function (testModeElement) {
        if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_TESTMODE) &&
            SapConfigurationUtil.getElementOfCollection(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN) == null) {
            var menuParent = testModeElement;
            if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU3) ||
                SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4) ||
                SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAPSP_CRM_HISTORY_MENU))
                return true;
            else if (SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU2)) {
                menuParent = SapConfigurationUtil.getContainerElement(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_OPTIONS_CONTAINER_PARENT, 1);
            }

            if (menuParent != null) {
                var style = menuParent.style;
                if (style != null)
                    return !!style.display && style.display.toUpperCase() != "NONE";
            }
        }
        return false;
    },

    isElementSAPCRMRadioGroupTestmode: function (elem, testModeElement) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_TESTMODE))
            return false;

        var type = elem.getAttribute("type");
        if (type != null && type.toUpperCase() == "RADIO") {
            return SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_TESTMODE) &&
                SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_MAIN)
        } else
            return false;
    },

    isElementSAPCRMButtonTestmode: function (elem, testModeElement) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_MAIN) &&
            SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_TESTMODE))
            return true;
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_A) &&
            SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_SECOND))
            return true;
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_DISABLED) &&
            !SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_FAKE_DISABLED) &&
            SapConfigurationUtil.isElementOfSpecifier(testModeElement, SAP_SPECIFIER_ENUM.SAP_CRM_BUTTON_SECOND))
            return true;
        return false;
    }
};
var SAPKitUtil = {
    getLsDataStringParameter: function (lsdata, paramIndex) {
        if (!!lsdata) {
            var search = paramIndex + ":'";
            var startIndex = lsdata.indexOf(search);
            if (startIndex >= 0) {
                startIndex += search.length;
                var endIndex = lsdata.indexOf("'", startIndex);
                if (endIndex >= 0) {
                    return lsdata.substring(startIndex, endIndex);
                }
            }
        }
        return "";
    }
};

var SAPKitFactory = {
    CreateKit: function (name, relevantFunc) {
        var tagSpecifiers = {};

        return {
            _logger: new LoggerUtil("Content." + name),
            name: name,
            priority: 1,
            classCache: new WeakMap(),
            recordedAoCache: new WeakMap(),

            registerTagSpecifier: function (tag, tagSpecifier) {
                if (tagSpecifiers[tag] == null)
                    tagSpecifiers[tag] = tagSpecifier;
                else
                    window.console.error("Specifier '" + tag + "' already exists.")
            },

            isDisabled: function () {
                if (!this.name)
                    return false;
                var disabledKits = ContentUtils.getDisabledWebKits();
                return disabledKits.some(function (kitName) {
                    var kitName = kitName + "kit";
                    return this.name.toLowerCase() === kitName.toLowerCase();
                }.bind(this));
            },

            getLabelTargetElement: function (elem) {
                var label = this.getAncestorByTagName(elem, "LABEL");
                if (label == null)
                    return null;

                var target = label.attributes["for"];
                if (target != null) {
                    target = target.value;
                } else if (SapConfigurationUtil.isElementOfSpecifier(label, SAP_SPECIFIER_ENUM.SAPWDLABEL_OF_OBJECTS)) {
                    var f = label.attributes["f"];
                    if (f != null) {
                        target = f.value;
                    } else {
                        var id = label.id;
                        if (id != null && id.substr(-4, 4) == "-lbl") {
                            target = id.substr(0, id.length - 4);
                        }
                    }
                }
                if (!target)
                    return null;

                var pointee = document.getElementById(target);
                if (pointee == null)
                    return null;

                var specifiers = [SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_MAIN, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN,
                    SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_MAIN, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_MAIN
                ];
                for (var i = 0; i < specifiers.length; i++) {
                    if (SapConfigurationUtil.isElementOfSpecifier(pointee, specifiers[i])) {
                        var clientWidth = pointee.attributes["clientWidth"];
                        if (clientWidth != null) {
                            if (parseInt(clientWidth.value) == 0) {
                                var ret = SapConfigurationUtil.getContainerElement(pointee, SAP_SPECIFIER_ENUM.SAP_LOGONCHECKBOXCONTAINER, 2);
                                return ret != null ? ret : pointee;
                            }
                        }
                        return pointee;
                    }
                }

                return null;
            },

            getAncestorByTagName: function (elem, tagName) {
                // node document has no tag name.
                while (elem != null) {
                    if (elem.tagName != null && elem.tagName.toUpperCase() == tagName.toUpperCase())
                        return elem;
                    elem = elem.parentNode;
                }
                return elem;
            },

            retrieveRadioButtonElement: function (elem) {
                if (elem.attributes["name"] == null)
                    return elem;

                var type = elem.attributes["type"];
                if (type == null || type.value.toUpperCase() != "RADIO")
                    return elem;

                var items = document.querySelectorAll("INPUT");
                if (items && items.length > 0) {
                    for (var i = 0; i < items.length; i++) {
                        var name = items[i].attributes["name"];
                        if (name && name.value == elem.attributes["name"].value)
                            return items[i];
                    }
                }

                return elem;
            },

            retrieveSapElement: function (elem) {
                // If this is a label for some other element follow the link.
                var labelElement = this.getLabelTargetElement(elem);
                if (labelElement != null && SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_LOGONCHECKBOXCONTAINER) == null) //for SAP_LOGONCHECKBOX contains an img
                    elem = labelElement;

                //input checkbox will be considered as a webcheckbox(role = checkbox), should be replaced by it's parentnode
                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN) && SapConfigurationUtil.isElementOfSpecifier(elem.parentElement, SAP_SPECIFIER_ENUM.SAP_ICWC_CHKBX1))
                    return elem.parentElement;

                // Added support for a new type of calendar since CRM7.
                // If we get the "day" element (TD), we want to work with the "bi-monthly" element (DIV)
                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_DAY_MAIN)) {
                    var parentElement = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_BI_MONTH, 12);
                    if (parentElement != null)
                        return parentElement;
                }

                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR)||
                    SAPUtils.isCalendarByParent(elem)) {
                    var ret = SAPCalendar.getInputPart(elem);
                    if (ret != null)
                        return ret;
                }

                if (elem.tagName.toUpperCase() == "INPUT") {
                    if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_MAIN) ||
                        SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_MAIN) ||
                        SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN) ||
                        SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_SEARCH_FORM))
                        return elem;

                    return this.retrieveRadioButtonElement(elem);
                }

                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_MAIN)) {
                    var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER_GRID, 3);
                    if (container != null)
                        return container;
                }

                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_INNER)) {
                    var parentElement = elem.parentNode;
                    if (parentElement && SapConfigurationUtil.isElementOfSpecifier(parentElement, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MAIN))
                        return parentElement;
                }

                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_IMG_A1S)) {
                    var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_CONTAINER_RADIOBUTTON_EP7, 2);
                    if (container != null) {
                        var checkBoxElement = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_MAIN);
                        if (checkBoxElement != null)
                            return checkBoxElement;
                    }
                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_CHKBX2_PARENT, 2);
                    if (container != null) {
                        var checkBoxElement = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAP_ICWC_CHKBX2);
                        if (checkBoxElement != null)
                            return checkBoxElement;
                    }
                }

                if (elem.tagName.toUpperCase() == "IMG") {
                    var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_CHECKBOX_TESTMODE, 3);
                    if (container != null) {
                        if (CRMUtil.isCRMElement(elem)) {
                            var checkBoxElement = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_A);
                            if (checkBoxElement != null)
                                return checkBoxElement;
                        }
                    }

                    var src = elem.attributes["src"];
                    if (src != null && src.value != null) {
                        if (src.value.indexOf("helpF4") >= 0) {
                            container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_BUTTON_MAIN, 3);
                            if (container != null)
                                return container;
                        }
                    }

                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE, 3);
                    if (container != null)
                        return container;

                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WORKCENTER_HEADER, 2);
                    if (container != null)
                        return container;
                }
                var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR, 11);
                if (container != null)
                    return container;

                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_EP7)) {
                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_CONTAINER_RADIOBUTTON_EP7, 3); //chrome has three floors
                    if (container != null) {
                        var radioButtonElement = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN);
                        if (radioButtonElement != null) {
                            return this.retrieveRadioButtonElement(radioButtonElement);
                        }
                    }
                }

                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2) || SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2_LABEL)) {
                    var radio_name = elem.getAttribute("name");
                    if (!radio_name && SapConfigurationUtil.isElementOfSpecifier(elem.parentElement, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2))
                        return elem.parentElement; //psrad inside another psrad

                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2_PARENT, 6);
                    if (container != null) {
                        var radioButtonElement = SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2);
                        if (radioButtonElement != null) {
                            return radioButtonElement;
                        }
                    }
                }

                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_NAVIGATION_LIST_ITEM_SUB_ITEM) ||
                    SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_VIEW_SWITCH_ITEM)) {
                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR, 20);
                    if (container != null)
                        return container;
                }

                if (elem.tagName.toUpperCase() == "H2" || elem.tagName.toUpperCase() == "P") {
                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WORKCENTER_HEADER, 3);
                    if (container != null)
                        return container;
                } else if (elem.tagName.toUpperCase() == "SPAN") {
                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WORKCENTER_HB_FOLDER_FOLDER, 3);
                    if (container != null)
                        return container;

                    // there is case when radio button inside S4HANA CRM
                    // we want to operate on the radio button ("INPUT") itself ,so we replace the radio 
                    // with it's uncle radio button
                    var testmodeElem = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_TESTMODE, 3);
                    if (testmodeElem != null && (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_S4HANA_CRM_RADIOGROUP_BTN) || SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_S4HANA_CRM_RADIOGROUP_LABEL))) {
                        var pInputRadioElement = SapConfigurationUtil.getElementOfCollection(testmodeElem, SAP_SPECIFIER_ENUM.SAP_CRM_RADIOBUTTON_MAIN);
                        if (pInputRadioElement != null)
                            return pInputRadioElement;
                    }
                } else if (elem.tagName.toUpperCase() == "A") {
                    container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WORKCENTER_HB_FOLDER_ITEM, 3);
                    if (container != null)
                        return container;
                } else if (elem.tagName.toUpperCase() == "BODY") {
                    var window = document.defaultView;
                    if (window != null) {
                        var frame = window.frameElement;
                        if (frame != null) {
                            // TODO:
                            // if (FAILED (RetreiveParentFrame (pParentObj)))
                            // return pElement;
                            return SAPNavigationBar.getMainElement(frame.ownerDocument);
                        }
                    }
                }

                return elem;
            },

            createPageAO: function (parentID) {
                if (document.documentElement == null)
                    return null;

                var ao = WebKit.createAO(document.documentElement, parentID);
                ao.mergeBehavior(FrameBehavior);
                ao.mergeBehavior(PageBehavior);
                if (SAPUtils.isTopNavigationBarInPage()) {
                    ao.mergeBehavior(SAPPortalBehavior);
                }
                return ao;
            },

            /*
              micclass is added only for RoleWebKit
            */
            createAO: function (element, parentId, noDefault, micclass, shouldCreateTableCell) {
                if (this.isDisabled())
                    return null;

                var adaptedElement = element;
                var ret = null;
                var elementClass = this.classCache.get(element);
                if (elementClass == null) {
                    adaptedElement = this.retrieveSapElement(element);
                    if (adaptedElement == null || adaptedElement.tagName == null)
                        return null;
                    elementClass = CRMUtil.getCRMElementClass(adaptedElement);
                    var tagSpecifier = tagSpecifiers[adaptedElement.tagName.toLowerCase()];
                    if (tagSpecifier && elementClass == null) {
                        elementClass = tagSpecifier.getElementClass(adaptedElement);
                    }
                    if (elementClass != null) {
                        this.classCache.set(adaptedElement, elementClass);
                    }
                    if (elementClass == null)
                        return null;
                }

                return SAPKitFactory.createAOByClass(elementClass, adaptedElement, parentId, shouldCreateTableCell);;
            },

            _retrieveTopMostParentFrame: function (pObj) {
                if (pObj == null)
                    return null;

                tempFrameAO = pObj.getParent();
                var topMostParentAO;
                while (tempFrameAO) {
                    var tempFrameAOClass = Util.getMicClass(tempFrameAO)
                    if (tempFrameAOClass == "Frame" || tempFrameAOClass == "Page")
                        topMostParentAO = tempFrameAO;
                    tempFrameAO = tempFrameAO.getParent();
                }
                return topMostParentAO;
            },

            _getOverrideParentObject: function (element, parentID, useOnlyWebKit) {
                var elementAO = content.kitsManager.createAO(element, parentID);
                if (Util.isNullOrUndefined(elementAO))
                    return null;

                var parentAO = elementAO.getParent();
                if (Util.isNullOrUndefined(parentAO))
                    return null;
                // Check if the element is not in a CRM table.
                var notCRMTable = !SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_CRM_TABLE_TESTMODE, 10);

                var elementAOMicClass = Util.getMicClass(elementAO);
                //For SapEdit inside of a header
                if (elementAOMicClass == "SAPEdit") {
                    if (SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAP_WDA_TOPHEADER, 8))
                        return elementAO;
                }

                // To be egnored for recording, just return itself so that its owner AO has the chance to abort.
                if (SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAP_WDA_DATE_IN_POPUP)) {
                    return SAPKitFactory.createAO(element, parentID, [SAPDummyBehavior]);
                }

                //For WebElement inside of a SAPCheckBox
                if (parentAOMicclass == "SAPCheckBox") {
                    var grandpaAO = parentAO.getParent();
                    if (grandpaAO != null && Util.getMicClass(grandpaAO) != "SAPTable")
                        return parentAO;
                }

                // now we check if one of his parents is an override object (SAPTable or SAPTreeView)
                while (parentAO != null) {
                    var parentElement = parentAO._elem;
                    var parentAOMicclass = Util.getMicClass(parentAO);
                    // To be egnored for recording, just return itself so that its owner AO has the chance to abort.

                    // Handling WDA Road Map element - If the parent is a RoadMap Cell, it means that pElementAO if the Cell Title or Step number
                    // But, we would like always to work on the Cell itself
                    if (SapConfigurationUtil.isElementOfSpecifier(parentElement, SAP_SPECIFIER_ENUM.SAP_WDA_ROADMAP_CELL))
                        return parentAO;

                    if (SapConfigurationUtil.isElementOfSpecifier(parentElement, SAP_SPECIFIER_ENUM.SAP_WDA_FREECONTEXTUALAREA))
                        return elementAO;
                    //----- END FIX -----

                    if (parentAOMicclass == "SAPTreeView")
                        return parentAO;

                    if (parentAOMicclass == "SAPTable") {
                        if (elementAOMicClass != "SAPList" &&
                            elementAOMicClass != "SAPListButton" &&
                            elementAOMicClass != "SAPListboxItem" &&
                            elementAOMicClass != "SAPButton" &&
                            elementAOMicClass != "Image" &&
                            elementAOMicClass != "Link") {
                            // Inner SAPList and SAPButton and Image and Link will be recorded independently.
                            return parentAO;
                        }
                    }

                    if (SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_CELL)) {
                        var grandpa = parentAO.getParent();
                        if (grandpa != null && Util.getMicClass(grandpa) == "SAPTable")
                            return grandpa;
                    }

                    if (notCRMTable && parentAOMicclass == "SAPList")
                        return parentAO;

                    if (parentAOMicclass == "SAPButton" || parentAOMicclass == "SAPDropDownMenu")
                        return parentAO;

                    if (parentAOMicclass == "SAPDropDownMenuItem") {
                        var grandpaAO = parentAO.getParent();
                        if (grandpaAO != null) {
                            if (SapConfigurationUtil.isElementOfSpecifier(grandpaAO._elem, SAP_SPECIFIER_ENUM.SAPSP_CRM_HISTORY_MENU))
                                return grandpaAO;
                        }
                    }

                    if (parentAOMicclass == "SAPListboxItem") {
                        return parentAO;
                    }

                    if (parentAOMicclass == "SAPNavigationBar") {
                        return parentAO;
                    }
                    else if (parentAOMicclass == "SAPTabStrip") {
                        if ((elementAOMicClass == "SAPButton") ||
                            (elementAOMicClass == "SAPCheckBox") ||
                            (elementAOMicClass == "SAPEdit") ||
                            (elementAOMicClass == "SAPList") ||
                            (elementAOMicClass == "SAPCalendar") ||
                            (elementAOMicClass == "SAPRadioGroup") ||
                            (elementAOMicClass == "SAPNavigationBar") ||
                            (elementAOMicClass == "Link")) {
                            return elementAO;
                        }
                        else {
                            return parentAO;
                        }
                    }
                    else if ((parentAOMicclass == "SAPDetailedNavigationBar") ||
                        (parentAOMicclass == "SAPTopNavigationBar") ||
                        (parentAOMicclass == "SAPPortalSearch") ||
                        (parentAOMicclass == "SAPPortal73TopNavigationBarTab")
                    ) {
                        // Check if this is an SAPPortal page.
                        var IsPortalExist = SAPUtils.isTopNavigationBarInPage();
                        if (IsPortalExist) {
                            return SAPKit.createPageAO(parentID);
                        }

                        return null;// Workaround for BUG #40412
                    }

                    if((parentAOMicclass == "SAPNavigationBar") || SapConfigurationUtil.isElementOfSpecifier(element, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_OPEN_BTN))
                        return elementAO;

                    parentAO = parentAO.getParent();
                }

                //OFER - perhaps frame should be checked here too, since i don't assign the kit's id!
                if (elementAOMicClass && elementAOMicClass.startsWith("SAP")) {
                    return elementAO;
                }

                return null;
            },

            createRecordAOArray: function (element, parentID, eventName) {
                //Do not handle mouseenter mouseover and mouseout event on SAP part.
                if (eventName != null && eventName == "mouseout") {
                    return [];
                }
                var ao = this.recordedAoCache.get(element);
                if (ao == null) {
                    ao = this._getOverrideParentObject(element, parentID);
                }
                if (ao != null) {
                    this.recordedAoCache.set(element, ao);
                }
                return ao != null ? [ao] : [];
            },

            relevant: function () {
                var shouldLoad = relevantFunc();

                this._logger.trace(this.name + ' relevant: should load ' + shouldLoad);
                return shouldLoad;
            },
            webCore: Util.alwaysTrue
        };
    },

    createAO: function (elem, parentId, behaviors) {
        var ao = new AO(elem, parentId);
        ao.mergeBehavior(CommonBehavior);
        behaviors.forEach(function (b) {
            ao.mergeBehavior(b);
        });
        return ao;
    },

    createRadioGroupAO: function (elem, parentId, behaviors) {
        var ao = new AO(elem, parentId);
        ao.mergeBehavior(CommonBehavior);
        behaviors.forEach(function (b) {
            ao.mergeBehavior(b);
        });
        ao._radioElemForRecord = elem;
        ao.refreshRadioGroup(elem);
        return ao;
    },

    createAOByClass: function (objectClass, elem, parentId, shouldCreateTableCell) {
        switch (objectClass) {
            case "SAP_OBJECT_EDIT":
            case "SAP_OBJECT_CRM_SEARCHEDIT":
                return this.createAO(elem, parentId, [SAPEditBehavior]);
            case "SAP_OBJECT_ICWC_EDITBOX":
                return this.createAO(elem, parentId, [SAPEditBehavior, SAPICWCEditBehavior]);
            case "SAP_OBJECT_ICWC_EDIT":
                return this.createAO(elem, parentId, [SAPEditBehavior, SAPICWCTextAreaBehavior]);
            case "SAP_OBJECT_CRM_TEXTAREA":
                return this.createAO(elem, parentId, [SAPEditBehavior, SAPICWCTextAreaBehavior, SAPCRMTextAreaBehavior]);
            case "SAP_OBJECT_CRM_SEARCH_FORM_EDIT":
                return this.createAO(elem, parentId, [SAPEditBehavior, SAPCRMSearchFormEditBehavior]);
            case "SAP_OBJECT_SEARCHBUTTON":
            case "SAP_OBJECT_CRM_SEARCHBUTTON":
                return this.createAO(elem, parentId, [SAPButtonBehavior, SAPSearchButtonBehavior]);
            case "SAP_OBJECT_BUTTON":
                return this.createAO(elem, parentId, [SAPButtonBehavior]);
            case "SAP_OBJECT_WDA_BUTTON":
                return this.createAO(elem, parentId, [SAPButtonBehavior, SAPWDAButtonBehavior]);
            case "SAP_OBJECT_TABLE":
                return this.createAO(elem, parentId, [TableBehavior, SAPTableBehavior]);
            case "SAP_OBJECT_ICWC_TABLE":
                return this.createAO(elem, parentId, [TableBehavior, SAPTableBehavior, SAPICWCTableBehavior]);
            case "SAP_OBJECT_CRM_TABLE":
                return this.createAO(elem, parentId, [TableBehavior, SAPTableBehavior, SAPICWCTableBehavior, SAPCRMTableBehavior]);
            case "SAP_OBJECT_WDA_TABLE":
                return this.createAO(elem, parentId, [TableBehavior, SAPTableBehavior, SAPICWCTableBehavior, SAPWDATableBehavior]);
            case "SAP_OBJECT_CRM_BUTTON":
                return this.createAO(elem, parentId, [SAPButtonBehavior, SAPCRMButtonBehavior]);
            case "SAP_OBJECT_RADIOGROUP":
                return this.createRadioGroupAO(elem, parentId, [SAPRadioGroupBehavior]);
            case "SAP_OBJECT_LIST_BUTTON":
                // Keep it jsut to prevent from recording WebElement.click
                return this.createAO(elem, parentId, [SAPListButtonBehavior]);
            case "SAP_OBJECT_LIST":
                return this.createAO(elem, parentId, [ListBehavior, SAPComboBoxBehavior]);
            case "SAP_OBJECT_LISTBOX":
                return this.createAO(elem, parentId, [ListBehavior, SAPListBoxBehavior]);
            case "SAP_OBJECT_LISTBOX_S4HANA":
                return this.createAO(elem, parentId, [ListBehavior, SAPListBoxBehavior, SAPListBoxS4HanaBehavior])
            case "SAP_OBJECT_CRM_LIST":
                return this.createAO(elem, parentId, [ListBehavior, SAPComboBoxBehavior, SAPCRMComboBoxBehavior]);
            case "SAP_OBJECT_CRM_LIST_BUTTON":
                return this.createAO(elem, parentId, [SAPListButtonBehavior, SAPCRMListButtonBehavior]);
            case "SAP_OBJECT_CRM_LIST_ITEM":
            case "SAP_OBJECT_LISTBOX_ITEM":
            case "SAP_OBJECT_LIST_ITEM":
                // Keep it jsut to prevent from recording WebElement.click
                return this.createAO(elem, parentId, [SAPListItemBehavior]);
            case "SAP_OBJECT_TABLECELL":
                return shouldCreateTableCell ? this.createAO(elem, parentId, [SAPTableCellBehavior]) : null;
            case "SAP_OBJECT_ICWC_TABLECELL":
                return shouldCreateTableCell ? this.createAO(elem, parentId, [SAPTableCellBehavior, SAPICWCTableCellBehavior]) : null;
            case "SAP_OBJECT_CRM_TABLE_CELL":
                return shouldCreateTableCell ? this.createAO(elem, parentId, [SAPTableCellBehavior, SAPICWCTableCellBehavior, SAPCRMTableCellBehavior]) : null;
            case "SAP_OBJECT_WDA_TABLECELL":
                return shouldCreateTableCell ? this.createAO(elem, parentId, [SAPTableCellBehavior, SAPICWCTableCellBehavior, SAPWDATableCellBehavior]) : null;
            case "SAP_OBJECT_WDATRICHECKBOX":
                return this.createAO(elem, parentId, [CheckBoxBehavior, SAPCheckBoxBehavior, SAPWDATriStateCheckBoxBehavior]);
            case "SAP_OBJECT_CHECKBOX":
                return this.createAO(elem, parentId, [CheckBoxBehavior, SAPCheckBoxBehavior]);
            case "SAP_OBJECT_ICWC_CHECKBOX":
                return this.createAO(elem, parentId, [CheckBoxBehavior, SAPCheckBoxBehavior, SAPICWCCheckBoxBehavior]);
            case "SAP_OBJECT_IMAGECHECKBOX": {
                var containerEP7 = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_CONTAINER_RADIOBUTTON_EP7, 3);
                if (!!containerEP7) {
                    //click event on img but should record as WDATriStateCheckBox/WDACheckBox
                    var TRICheckBox = SapConfigurationUtil.getElementOfCollection(containerEP7, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_MAIN);
                    if (!!TRICheckBox)
                        return this.createAO(TRICheckBox, parentId, [CheckBoxBehavior, SAPCheckBoxBehavior, SAPWDATriStateCheckBoxBehavior]);
                    var WDCheckBox = SapConfigurationUtil.getElementOfCollection(containerEP7, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN)
                    if (!!WDCheckBox)
                        return this.createAO(WDCheckBox, parentId, [CheckBoxBehavior, SAPCheckBoxBehavior])
                }

                var saplogonCheckbox = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_LOGONCHECKBOXCONTAINER, 3);
                if (!!saplogonCheckbox) {
                    return this.createAO(saplogonCheckbox, parentId, [CheckBoxBehavior, SAPCheckBoxBehavior]);
                }

                return this.createAO(elem, parentId, [ImageBehavior, SAPImageCheckBoxBehavior]);
            }
            case "SAP_OBJECT_WDA_TRISTATE_CHECKBOX":
                return this.createAO(elem, parentId, [CheckBoxBehavior, SAPCheckBoxBehavior, SAPWDATriStateCheckBoxBehavior]);
            case "SAP_OBJECT_CRM_CHECKBOX":
                return this.createAO(elem, parentId, [CheckBoxBehavior, SAPCheckBoxBehavior, SAPCRMCheckBoxBehavior]);
            case "SAP_OBJECT_FRAME":
                return this.createAO(elem, parentId, [FrameBehavior, SAPFrameBehavior]);
            case "SAP_OBJECT_CRM_DROPDOWNMENU":
                if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4)) {
                    var topMenu = elem;
                    while (true) {
                        var subfolder = SapConfigurationUtil.getContainerElement(topMenu, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4_SUBFOLDER, 4);
                        if (!subfolder)
                            break;
                        var parentMenu = SapConfigurationUtil.getContainerElement(subfolder, SAP_SPECIFIER_ENUM.SAP_CRM_MENU4, 4);
                        if (!parentMenu)
                            break;
                        topMenu = parentMenu;
                    }
                    return this.createAO(topMenu, parentId, [SAPDropDownMenuBehavior, SAPCRMDropDownMenuBehavior]);
                }
                return this.createAO(elem, parentId, [SAPDropDownMenuBehavior, SAPCRMDropDownMenuBehavior]);
            case "SAP_OBJECT_WDA_DROPDOWNMENU":
                return this.createAO(elem, parentId, [SAPDropDownMenuBehavior, SAPWDADropDownMenuBehavior]);
            case "SAP_OBJECT_DROPDOWNMENU":
                return this.createAO(elem, parentId, [SAPDropDownMenuBehavior]);
            case "SAP_OBJECT_WDA_DROPDOWNMENUITEM":
                return this.createAO(elem, parentId, [SAPDropDownMenuItemBehavior, SAPWDADropDownMenuItemBehavior]);
            case "SAP_OBJECT_CRM_DROPDOWNMENUITEM":
                return this.createAO(elem, parentId, [SAPDropDownMenuItemBehavior, SAPCRMDropDownMenuItemBehavior]);
            case "SAP_OBJECT_TABSTRIP":
			    return this.createAO(elem, parentId, [SAPTabStripBehavior]);
            case "SAP_OBJECT_NAVIGATIONBAR":
                return this.createAO(elem, parentId, [SAPNavigationBarBaseBehavior, SAPNavigationBarBehavior]);
            case "SAP_OBJECT_WDA_NAVIGATIONBAR":
                return this.createAO(elem, parentId, [SAPNavigationBarBaseBehavior, SAPNavigationBarBehavior, SAPWDANavigationBarBehavior]);
            case "SAP_OBJECT_CRM_NAVIGATIONBAR":
                return this.createAO(elem, parentId, [SAPNavigationBarBaseBehavior, SAPNavigationBarBehavior, SAPCRMNavigationBarBehavior]);
            case "SAP_OBJECT_DETAILEDNAVIGATIONBAR":
                return this.createAO(elem, parentId, [SAPNavigationBarBaseBehavior, SAPNavigationBarForPortalBehavior]);
            case "SAP_OBJECT_PORTALCATALOG":
                return this.createAO(elem, parentId, [SAPNavigationBarBaseBehavior, SAPNavigationBarForPortalBehavior, SAPPortalCatalogBehavior]);
            case "SAP_OBJECT_PORTAL_SEARCH":
                return this.createAO(elem, parentId, [SAPPortalSearchBehavior]);
            case "SAP_OBJECT_TOPNAVIGATIONBAR":
                {
                    // Go up 2 levels from the 1st tab-level
                    // the grandparent html element used to be sent to the CSAPTopNavigationBar
                    // as the real html element which we worked on, that caused a problem to 
                    // the new learn mechanism, which traverse the DOM hierarchy, and thus caused 
                    // an infinite loop. The solution implemented is sending the pGrantParent to 
                    // the constructor, and returning spElement as the real element
                    var pParent = elem.parentElement;
                    var pGrantParent = elem.parentElement.parentElement;
                    //NetWeaver Portal7.3 has 3 more levels
                    if (elem.getAttribute('id') == "firstLevelScrollable_td" || elem.getAttribute('id') == "TlnSecondLevelTable") {
                        if (pGrantParent != null)
                            pGrantParent = pGrantParent.parentElement.parentElement.parentElement;
                        //NetWeaver Portal 7.3 first level tab has 3 more dom levels
                        if (elem.getAttribute('id') == "firstLevelScrollable_td") {
                            if (pGrantParent != null)
                                pGrantParent = pGrantParent.parentElement.parentElement.parentElement;
                        }
                    }
                    TopNavigationBarAO = this.createAO(elem, parentId, [SAPTopNavigationBarBehavior]);
                    //TopNavigationBarAO.m_grandparent = pGrantParent
                    for (var i = 0; i < TopNavigationBarAO._behaviors.length; i++) {
                        if (Util.isNullOrUndefined(TopNavigationBarAO._behaviors[i].m_pGrandParentElement))
                            TopNavigationBarAO._behaviors[i].m_pGrandParentElement = pGrantParent;
                    }

                    return TopNavigationBarAO;
                }
            case "SAP_ICWC_CALENDAR":
                return this.createAO(elem, parentId, [SAPEditBehavior, SAPCalendarBehavior]);
            case "SAP_OBJECT_CRM_CALENDAR":
                return this.createAO(elem, parentId, [SAPEditBehavior, SAPCalendarBehavior, SAPCRMCalendarBehavior]);
            case "SAP_OBJECT_CALENDAR_BI_MONTH":
                return this.createAO(elem, parentId, [SAPCalendarBiMonthBehavior]);
            case "SAP_OBJECT_CRM_TAB_STRIP":
                return this.createAO(elem, parentId, [SAPTabStripBehavior, SAPCRMTabStripBehavior]);
            case "SAP_OBJECT_TREEVIEW":
                return this.createAO(elem, parentId, [SAPTreeViewBehavior]);
            case "SAP_OBJECT_WDA_TREEVIEW":
                return this.createAO(elem, parentId, [SAPTreeViewBehavior, SAPWDATreeViewBehavior]);
        }
        return null;
    },

    updateFrameContents: function () {
        if (content.settings["sap support"] == 1 && content.frame) {
            if (content.frame._isPage == false) {
                if (iframeSpecifier.getElementClass(window.frameElement) === "SAP_OBJECT_FRAME" ||
                    SAPFrameBehavior._isICWCFrame()) {
                    for (let key in SAPFrameBehavior._attrs) {
                        content.frame._attrs[key] = SAPFrameBehavior._attrs[key];
                    }
                }
            }
            else {
                if (SAPUtils.isSAPPortalInPage())
                    SAPUtils.updatePageWithSAPPortal.call(this);
                else
                    SAPPortalConnectorContent.RollBack.call(this);

                //this mothod is used to find page AO although its micclass is "SAPFrame" according to the request from package.
                //WIQueryHelper.cpp Line 864: QueryFromAgent (QUERY_DIRECT_CHILD_DESC_TO_ID, ppWebInfo, spWebId);
                //If method is here, means it has already find its window, directly create Page AO.
                content.frame.QUERY_DIRECT_CHILD_DESC_TO_ID = function (msg, resultCallback) {
                    this._logger.trace("QUERY_DIRECT_CHILD_DESC_TO_ID: Started");
                    if (content.frame._isPage) {
                        var ao = content.kitsManager.createPageAO(this.getID());
                        resultCallback(Description.buildReturnMsg(msg._msgType, msg._to, [ao], this._logger));
                    }
                };
            }
        }

        if (content.settings["sap support"] == 1 && content.dispatcher) {
            content.dispatcher._getTargetAOAccordingToRTID = function (targetRTID) {
                this._logger.trace("_getTargetAOAccordingToRTID: Started for target RTID:", targetRTID);
        
                if (!this._isRTIDInOurContent(targetRTID)) {
                    this._logger.error("_getTargetAOAccordingToRTID: This RTID is not for us no AO will be returned");
                    return null;
                }
        
                if (targetRTID.object === null) {
                    this._logger.trace("_getTargetAOAccordingToRTID: The target is Frame AO");
                    return content.frame;
                }
                else {
                    this._logger.trace("_getTargetAOAccordingToRTID: The target is regular AO");
                    var associatedElement = content.rtidManager.GetElementFromID(targetRTID.object);
                    if (associatedElement == null) {
                        this._logger.warn("_getTargetAOAccordingToRTID: Ge associated element from rtid failed");
                        return null;
                    }
        
                    if (associatedElement instanceof DotObjJSProxy) // for DotObj we store the proxy
                        return associatedElement;
                    else if (associatedElement instanceof Range)
                        return content.kitsManager.createVirtualTextAO(associatedElement, content.frame.getID());
        
                    var ao = SAPKit.createAO(associatedElement, content.frame.getID(),null,null,true);
                    return ao || content.kitsManager.createAO(associatedElement, content.frame.getID());
                }
            };
        }
    },
};