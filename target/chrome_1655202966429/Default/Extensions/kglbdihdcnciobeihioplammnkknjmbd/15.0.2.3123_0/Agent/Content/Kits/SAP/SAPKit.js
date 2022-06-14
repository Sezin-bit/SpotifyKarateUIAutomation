var SAPKit = SAPKitFactory.CreateKit("SAPKit", function () {
    return content.settings["sap support"] == 1;
})

var DOMUtil = {
    getNamedChild: function (elem, childName) {
        var children = elem.children;
        if (children == null || children.length == 0)
            return null;

        for (var i = 0; i < children.length; i++) {
            var tagname = children[i].tagName;
            if (tagname != null && tagname.toLowerCase() == childName.toLowerCase()) {
                return children[i];
            }
        }
        return null;
    },
    getNamedChildren: function (elem, childName) {
        var children = elem.children;
        if (children == null || children.length == 0)
            return null;

        var filteredChildren = [];
        for (var i = 0; i < children.length; i++) {
            var tagname = children[i].tagName;
            if (tagname != null && tagname.toLowerCase() == childName.toLowerCase()) {
                filteredChildren.push(children[i]);
            }
        }
        return filteredChildren;
    },
    isElementRealLink: function (elem) {
        return elem.attributes["href"] != null;
    }
};

var SAPCalendar = {
    isCalendar(elem) {
        return SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR) ||
            SAPUtils.isCalendarByParent(elem) ||
            this.getImagePart(elem) ||
            this.getWDAImagePart(elem);
    },
    getImagePart(elem) {
        var td = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD, 3);
        if (td != null) {
            td = td.nextSibling;
            var nextElem = SapConfigurationUtil.getElementOfCollection(td, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR);
            if (nextElem == null) {
                nextElem = SapConfigurationUtil.getElementOfCollection(td, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR2);
                if (nextElem != null && !SAPUtils.isCalendarByParent(nextElem))
                    return null;
            }
        }
        return nextElem;
    },
    getWDAImagePart(elem) {
        var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DATE_IMAGE_INPUT_CONTAINER, 5);
        if (container != null) {
            return SapConfigurationUtil.getElementOfCollection(container, SAP_SPECIFIER_ENUM.SAP_WDA_DATE_IMAGE);
        }
        return null;
    },
    getInputPart(elem) {
        var td = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD, 7);
        if (td == null)
            return null;

        td = td.previousSibling;
        var editCal = SapConfigurationUtil.getElementOfCollection(td, SAP_SPECIFIER_ENUM.SAPSP_ICWC_EDITBOX);

        if (editCal == null)
            return null;

        var dateContainer = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DATE_IMAGE_INPUT_CONTAINER, 5);
        return SapConfigurationUtil.getElementOfCollection(dateContainer, SAP_SPECIFIER_ENUM.SAPSP_ICWC_EDITBOX);
    }
};

var SAPTabStrip = {
    getTabScript: function (elem) {
        var children = elem.children;
        if (children == null)
            return null;
        var filteredChildren = SapConfigurationUtil.filterCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_SCRIPT);
        return SapConfigurationUtil.getItemContainingSpecifierText(filteredChildren, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_SCRIPT_TEXT);
    }
};

var SAPDynproTree = {
    isDynproTree: function (elem) {
        var id = elem.id;
        if (id == null)
            return false;

        var identifier = this.getTreeIdentifierElement(elem);
        if (identifier == null)
            return false;

        if (identifier.id == id + "-r" ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_CONTAINER))
            return true;

        return false;
    },
    getTreeIdentifierElement: function (elem) {
        return SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_IDENTIFIER);
    }
};

var SAPICWCNavigationBar = {
    isICWCNavigationBar: function (elem) {
        //Two conditions must be satisfied:

        //1. It should not contain any other "TABLE" elements in its hierarchy (i.e:
        //   It should be an innermost table).
        var items = elem.querySelectorAll("table");
        if (items == null || items.length == 0)
            return false;

        //2. It should contain in its hierarchy at least one ICWC nav bar item,
        return SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_NAVIGATIONBAR_ITEM) != null;
    }
};

var SAPNavigationBar = {
    getMainElement: function (elem) {
        return SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_MAIN);
    }
};

var spanSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODELINK_PORTAL73))
            return "SAP_OBJECT_PORTAL73_DETAILEDNAVBAR_NODELINK";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODEFOLDERICON_PORTAL73))
            return "SAP_OBJECT_PORTAL73_DETAILEDNAVBAR_NODEFOLDERICON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_LOGONCHECKBOXCONTAINER))
            return "SAP_OBJECT_CHECKBOX";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_ICWC1) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CHKBX1))
            return "SAP_OBJECT_ICWC_CHECKBOX";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_SPANCHECKBOX)) {
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_NWA))
                return "SAP_OBJECT_WDATRICHECKBOX";
            return "SAP_OBJECT_CHECKBOX";
        }
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_LABELEDIT_MAIN))
            return "SAP_OBJECT_LABELEDIT";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_BUTTON_MAIN) &&
            SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_CONTAINER, 4) != null)
            return "SAP_OBJECT_LIST_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER))
            return "SAP_OBJECT_SEARCHBUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MAIN))
            return "SAP_OBJECT_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_MAIN))
            return "SAP_OBJECT_TREEVIEW";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_MAIN))
            return "SAP_OBJECT_LISTBOX";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_EDITBOX))
            return "SAP_OBJECT_ICWC_EDITBOX";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR))
            return "SAP_ICWC_CALENDAR";
        else if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM, 4) != null)
            return "SAP_OBJECT_WDA_DROPDOWNMENUITEM";
        else if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABSTRIPITEM, 8) != null)
            return "SAP_OBJECT_WDA_TABSTRIPITEM";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_POPUP_TRIGGER_MENUBUTTON) &&
            SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAP_WDA_LINK2ACTIONBUTTON) == null)
            return "SAP_OBJECT_WDA_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_IMAGEBUTTON_MAIN))
            return "SAP_OBJECT_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TAB))
            return "SAP_OBJECT_CRM_TAB_STRIP";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_ROADMAP_STEP))
            return "SAP_OBJECT_WDA_ROADMAP_LINK";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_MENUBAR_ITEM))
            return "SAP_OBJECT_WDA_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE1))
            return "SAP_OBJECT_TREEVIEWITEM";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP2))
            return "SAP_OBJECT_RADIOGROUP";
        else if (!DOMUtil.isElementRealLink(elem) &&
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_EP_NAVIGATION_TRIGGER_MENUBUTTON))
            return "SAP_OBJECT_WDA_BUTTON";
        else
            return null;
    }
};


var inputSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER))
            return "SAP_OBJECT_SEARCHBUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_BUTTON_MAIN))
            return "SAP_OBJECT_LIST_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_MAIN))
            return "SAP_OBJECT_LIST";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TRISTATE_CHECKBOX_MAIN))
            return "SAP_OBJECT_WDA_TRISTATE_CHECKBOX";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_EDITBOX)) {
            if (SAPCalendar.isCalendar(elem))
                return "SAP_ICWC_CALENDAR";
            else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_OK_CODE))
                return "SAP_OBJECT_OKCODE";
            else
                return "SAP_OBJECT_ICWC_EDITBOX";
        } else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_EDITBOX))
            return "SAP_OBJECT_WDA_EDITBOX";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_SEARCH_FORM))
            return "SAP_OBJECT_CRM_SEARCH_FORM_EDIT";

        var type = elem.type;
        if (type == null)
            return null;
        var parent = elem.parentNode;

        if (this.isElementCheckBoxInput(elem, type, parent))
            return "SAP_OBJECT_CHECKBOX";
        else if (this.isElementRadioButtonInput(elem, type, parent))
            return "SAP_OBJECT_RADIOGROUP";
        else if (type == "text" || type == "password") {
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_EDIT_MAIN) ||
                SapConfigurationUtil.isElementOfSpecifier(parent, SAP_SPECIFIER_ENUM.SAPSP_EP6INPUT_WRAPPER))
                return "SAP_OBJECT_EDIT";
            else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_OK_CODE))
                return "SAP_OBJECT_OKCODE";
            else if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_BUTTON, 2) != null)
                return "SAP_OBJECT_WDA_BUTTON";
        } else if (type == "submit") {
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MAIN))
                return "SAP_OBJECT_BUTTON";
        }
    },
    isElementCheckBoxInput: function (elem, type, parent) {
        if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_LOGONCHECKBOXCONTAINER, 6) != null)
            return false;

        if (type == "text" && SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_MAIN))
            return true;

        var value = SapConfigurationUtil.getElementOfCollection(parent, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_EP7) == null &&
            SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_CONTAINER, 6) == null &&
            !SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_RADIOBUTTON);

        if (value && SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_MAIN))
            return true;

        if (type == "checkbox") {
            return value && SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_CHECKBOX_MAIN) ||
                SapConfigurationUtil.isElementOfSpecifier(parent, SAP_SPECIFIER_ENUM.SAPSP_EP6INPUT_WRAPPER);
        }
    },
    isElementRadioButtonInput: function (elem, type, parent) {
        if (type == "radio") {
            return SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_MAIN) ||
                SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP) ||
                SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN) ||
                SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_A1S_RADIOGROUP);
        } else if (type == "checkbox") {
            return SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_RADIOGROUP_MAIN) &&
                (SapConfigurationUtil.getElementOfCollection(parent, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_EP7) != null ||
                    SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_RADIOBUTTON));
        }
        return false;
    }
};

var textareaSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_EDIT_MAIN)) {
            if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_APP_CONTAINER) != null) {
                return "SAP_OBJECT_ICWC_EDIT";
            } else {
                return "SAP_OBJECT_EDIT";
            }
        }
    }
};

var selectSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_LIST_MAIN) ||
            SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_EP6INPUT_WRAPPER, 1) != null) {
            return "SAP_OBJECT_LIST";
        } else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_LISTBOX_MAIN)) {
            // For multiple listbo, not to be recognized as SAPList but weblist.
            // <SELECT id=htmlb_1915_0_16 class=urSlbWhl style="WIDTH: 24ex" multiple size=4 name=htmlb_1915_0_16 ct="LB">
            // <OPTION value=category_1>category_1
            // <OPTION value=category_n>category_n</OPTION></SELECT>
            if (elem.attributes["multiple"] == null)
                return "SAP_OBJECT_LISTBOX";
        }
    }
};

var imgSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_IMAGECHECKBOX_MAIN) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_CHECKBOX_IMG_A1S))
            return "SAP_OBJECT_IMAGECHECKBOX";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_MAIN))
            return "SAP_OBJECT_SEARCHBUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MAIN))
            return "SAP_OBJECT_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TOGGLE_OK_CODE))
            return "SAP_OBJECT_OKCODE";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_ICWC_CHANNELSELECTOR))
            return "SAP_OBJECT_CHANNELSELECTOR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR_HELP_DATE))
            return "SAP_ICWC_CALENDAR";
    }
};

var aSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TOGGLE_OK_CODE))
            return "SAP_OBJECT_OKCODE";
        else if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_BUTTON, 2) != null)
            return "SAP_OBJECT_WDA_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MAIN))
            return "SAP_OBJECT_BUTTON";
        else if (this.isElementSAPWDALink2ActionButton(elem))
            return "SAP_OBJECT_WDA_BUTTON";
        else if (!DOMUtil.isElementRealLink(elem) &&
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_EP_NAVIGATION_TRIGGER_MENUBUTTON))
            return "SAP_OBJECT_WDA_BUTTON";
    },
    isElementSAPWDALink2ActionButton: function (elem) {
        if (DOMUtil.isElementRealLink(elem))
            return false;
        return SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_LINK2ACTIONBUTTON) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_LINK);
    }
};

var tableSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_MAIN))
            return "SAP_OBJECT_TREEVIEW";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR))
            return "SAP_OBJECT_WDA_NAVIGATIONBAR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_MENU_MAIN))
            return "SAP_OBJECT_MENU";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TABLE) ||
            (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABSTRIP) &&
                SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABSTRIPCHILD) != null))
            return "SAP_OBJECT_CRM_TAB_STRIP";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TABLE_INNERTABLE) ||
            this.isInnerSapTable(elem))
            return "SAP_OBJECT_TABLE";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE) &&
            SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER) != null)
            return "SAP_OBJECT_ICWC_TABLE";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_GRID_MAIN))
            return "SAP_OBJECT_GRID";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_GRID_HEADERTABLE))
            return "SAP_OBJECT_GRID_HEADER";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_STATUSBAR_MAIN))
            return "SAP_OBJECT_STATUSBAR";
        else if (SAPTabStrip.getTabScript(elem) != null)
            return "SAP_OBJECT_TABSTRIP";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTABCONTAINER) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_SECONDLEVELTABCONTAINER))
            return "SAP_OBJECT_TOPNAVIGATIONBAR";
        else if (SAPDynproTree.isDynproTree(elem))
            return "SAP_OBJECT_DYNPRO_TREE";
        else if (SAPICWCNavigationBar.isICWCNavigationBar(elem))
            return "SAP_OBJECT_ICWC_NAVIGATIONBAR";
        else if (this.isElementSAPWDATreeViewMain(elem))
            return "SAP_OBJECT_WDA_TREEVIEW";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU))
            return "SAP_OBJECT_WDA_DROPDOWNMENU";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE))
            return "SAP_OBJECT_WDA_TABLE";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_NWBC_USERAREA_TABLE) &&
            SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_TOPLEFT_IMG) != null)
            return "SAP_OBJECT_WDA_TABLE";
    },
    isInnerSapTable: function (elem) {
        elem = elem.parentNode;
        while (elem != null) {
            if (elem.tagName.toLowerCase() == "table") {
                return SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TABLE_MAIN);
            }
            elem = elem.parent;
        }
        return false;
    },
    isElementSAPWDATreeViewMain: function (tableElement) {
        if (SapConfigurationUtil.isElementOfSpecifier(tableElement, SAP_SPECIFIER_ENUM.SAP_WDA_TREEVIEW_MAIN))
            return true;
        if (SapConfigurationUtil.isElementOfSpecifier(tableElement, SAP_SPECIFIER_ENUM.SAP_TREEVIEW_TABLE)) {
            var tbody = DOMUtil.getNamedChild(tableElement, "tbody");
            if (tbody == null)
                return false;

            // TODO: possible to improve the way of matching
            var tRows = DOMUtil.getNamedChildren(tbody, "tr");
            if (tRows == null || tRows.length == 0)
                return false;

            for (var i = 0; i < tRows.length; i++) {
                var tCells = DOMUtil.getNamedChildren(tRows[i], "td");
                if (!tCells)
                    continue;
                for (var j = 0; j < tCells.length; j++) {
                    if (SapConfigurationUtil.isElementOfSpecifier(tCells[j], SAP_SPECIFIER_ENUM.SAP_WDA_TREEVIEW_CONTAINERNODE))
                        return true;
                }
            }
        }
        return false;
    },

};

var bodySpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_CONTAINER))
            return "SAP_OBJECT_DROPDOWNMENU_POPDOWN";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_MAIN))
            return "SAP_OBJECT_NAVIGATIONBAR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BODY_EDIT_TEXTAREA))
            return "SAP_OBJECT_CONTENTEDITABLE";
    }
};

var iframeSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_MAIN))
            return "SAP_OBJECT_DROPDOWNMENU";
        return frameSpecifier.getElementClass(elem);
    }
};

var frameSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_SAPFRAME_NAME) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_NWBC_DIALOG_FRAME) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_FRAME_WEBGUI))
            return "SAP_OBJECT_FRAME";
    }
};

var tdSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_STATUSBAR_MAIN))
            return "SAP_OBJECT_STATUSBAR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENUITEM))
            return "SAP_OBJECT_DROPDOWNMENUITEM";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM) ||
            SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_LISTBOX_ITEM, 1) != null)
            return "SAP_OBJECT_LIST_ITEM";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_ITEM))
            return "SAP_OBJECT_LISTBOX_ITEM";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTABCONTAINER) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_SECONDLEVELTABCONTAINER))
            return "SAP_OBJECT_TOPNAVIGATIONBAR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_MAIN))
            return "SAP_OBJECT_PORTAL_SEARCH";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENUITEM_ICWC_CHANNELSELECTOR))
            return "SAP_OBJECT_CHANNELSELECTOR_MENUITEM";
        else if (this.isElementSAPICWCCalendar(elem))
            return "SAP_ICWC_CALENDAR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_TABLE_CELL))
            return "SAP_OBJECT_ICWC_TABLECELL";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_CELL))
            return "SAP_OBJECT_WDA_TABLECELL";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_ROADMAP_CELL))
            return "SAP_OBJECT_WDA_ROADMAP_LINK";
        else if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM, 4) != null)
            return "SAP_OBJECT_WDA_DROPDOWNMENUITEM";
        return "SAP_OBJECT_TABLECELL";
    },
    isElementSAPICWCCalendar: function (elem) {
        return SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_POPUP_DATE_SELECTION) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_POPUP_DATE_ARR) ||
            (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_POPUP_DATE_SELECTION, 1) != null &&
                SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_CALENDAR_POPUP, 4) != null);
    }
};

var thSpecifier = {
    getElementClass: function (elem) {
        return "SAP_OBJECT_TABLECELL";
    }
};

var trSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENUITEM, 4) != null)
            return "SAP_OBJECT_WDA_DROPDOWNMENUITEM";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENUITEM))
            return "SAP_OBJECT_DROPDOWNMENUITEM";
    }
};

var divSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM_DIV))
            return "SAP_OBJECT_LIST_ITEM";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER))
            return "SAP_OBJECT_SEARCHBUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_CELL) &&
            SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_NWBC_DIVDRAW_TABLE_CELL_DIV, 1) != null)
            return "SAP_OBJECT_WDA_TABLECELL";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODELINK_PORTAL73))
            return "SAP_OBJECT_PORTAL73_DETAILEDNAVBAR_NODELINK";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTAB_PORTAL73) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_SECONDLEVELTAB_PORTAL73))
            return "SAP_OBJECT_PORTAL73_TOPNAVIGATIONBAR_TAB";
        else if (this.isElementSAPSPDropDownMenuSecond(elem))
            return "SAP_OBJECT_DROPDOWNMENU";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MAIN))
            return "SAP_OBJECT_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER_GRID))
            return "SAP_OBJECT_GRIDSEARCHBUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENUITEM))
            return "SAP_OBJECT_DROPDOWNMENUITEM";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_CONTENTCATALOGTREE_MAIN))
            return "SAP_OBJECT_PORTALCATALOG";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_MAIN))
            return "SAP_OBJECT_DETAILEDNAVIGATIONBAR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_MAIN))
            return "SAP_OBJECT_PORTAL_SEARCH";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_LABELEDIT_MAIN))
            return "SAP_OBJECT_LABELEDIT";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ICWC_CHANNELSELECTOR))
            return "SAP_OBJECT_CHANNELSELECTOR_MENU";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_MAIN))
            return "SAP_OBJECT_LISTBOX";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_MAIN_S4HANA))
            return "SAP_OBJECT_LISTBOX_S4HANA";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_CRM_CALENDAR_BI_MONTH))
            return "SAP_OBJECT_CALENDAR_BI_MONTH";
        else if (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_VIEW_SWITCH_ITEM, 1) != null ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_NAVIGATION_LIST_ITEM))
            return "SAP_OBJECT_WDA_NAVIGATIONBAR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_ROADMAP_TITLE))
            return "SAP_OBJECT_WDA_ROADMAP_LINK";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TABLE_MENUBUTTON))
            return "SAP_OBJECT_WDA_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WORKCENTER_HEADER))
            return "SAP_OBJECT_WORKCENTER";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_LIST_BUTTON))
            return "SAP_OBJECT_LIST_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DATE_IN_POPUP))
            return "SAP_OBJECT_IGNORED";
    },
    isElementSAPSPDropDownMenuSecond: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_MAIN))
            return true;

        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_SECOND)) {
            var parentElem = elem.parentNode;
            var style = parentElem.style;
            if (style != null) {
                return style.pixelTop > 0 &&
                    SapConfigurationUtil.isElementOfSpecifier(parentElem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_PARENT) &&
                    SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_MAIN) == null;

            }
        }
        return false;
    }
};

var buttonSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR))
            return "SAP_ICWC_CALENDAR";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_BUTTON_MAIN))
            return "SAP_OBJECT_LIST_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MAIN))
            return "SAP_OBJECT_BUTTON";
        else if (!DOMUtil.isElementRealLink(elem) &&
            (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_LINK2ACTIONBUTTON) ||
                SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_LINK)))
            return "SAP_OBJECT_WDA_BUTTON";
    }
};

var liSpecifier = {
    getElementClass: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_BUTTON_MAIN))
            return "SAP_OBJECT_BUTTON";
        else if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WORKCENTER_HB_FOLDER_ITEM) ||
            SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WORKCENTER_HB_FOLDER_FOLDER))
            return "SAP_OBJECT_WORKCENTERHBFOLDERITEM";
    }
};


SAPKit.registerTagSpecifier("span", spanSpecifier);
SAPKit.registerTagSpecifier("input", inputSpecifier);
SAPKit.registerTagSpecifier("textarea", textareaSpecifier);
SAPKit.registerTagSpecifier("select", selectSpecifier);
SAPKit.registerTagSpecifier("img", imgSpecifier);
SAPKit.registerTagSpecifier("a", aSpecifier);
SAPKit.registerTagSpecifier("table", tableSpecifier);
SAPKit.registerTagSpecifier("body", bodySpecifier);
SAPKit.registerTagSpecifier("iframe", iframeSpecifier);
SAPKit.registerTagSpecifier("frame", frameSpecifier);
SAPKit.registerTagSpecifier("td", tdSpecifier);
SAPKit.registerTagSpecifier("th", thSpecifier);
SAPKit.registerTagSpecifier("tr", trSpecifier);
SAPKit.registerTagSpecifier("div", divSpecifier);
SAPKit.registerTagSpecifier("button", buttonSpecifier);
SAPKit.registerTagSpecifier("li", liSpecifier);

// Register the kit
KitsManager.prototype.LoadKit(SAPKit);