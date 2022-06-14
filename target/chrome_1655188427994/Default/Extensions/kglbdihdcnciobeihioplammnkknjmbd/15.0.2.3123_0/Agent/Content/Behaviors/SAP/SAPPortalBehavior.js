function getDetailedNavigationBar() {
    //Find the Detailed Navigation Bar
    if (this._DetailedNavigationBarElement == null) {
        var spDetailedNavigationBarElement = SAPPortalBehavior._helpers.findElement(SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVIGATIONTREE_MAINCONTAINER);
        if (spDetailedNavigationBarElement != null)
            this._DetailedNavigationBarElement = SAPKitFactory.createAOByClass("SAP_OBJECT_DETAILEDNAVIGATIONBAR", spDetailedNavigationBarElement, this._parentID);
    }
    return this._DetailedNavigationBarElement;
}

function getTopNavigationBar() {
    //Find the Top Navigation Bar
    if (this._TopNavigationBarElement == null) {
        var spFirstLevelContainer = SAPPortalBehavior._helpers.findElement(SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTABCONTAINER);
        var spTopNavigationBarElement = SAPPortalBehavior._helpers.getTopNavigationTabContainer(spFirstLevelContainer);
        if (spTopNavigationBarElement != null)
            this._TopNavigationBarElement = SAPKit.createAO(spTopNavigationBarElement, this._parentID);
    }
    return this._TopNavigationBarElement;
}
function getAttrFromNavigationBar(ao, attr) {
    if (ao == null)
        return null;
    return ao.GetAttrSync(attr);
}

var SAPPortalBehavior = {//Inherit webpage
    _DetailedNavigationBarElement: null,
    _TopNavigationBarElement: null,
    _micclass: ["SAPPortal"],
    _attrs: {
        "url without form data:": function () { return ""; },
        "user-input in post data": function () { return ""; },
        "non user-input in post data": function () { return ""; },
        "user input in get data": function () { return ""; },
        "non user-input in get data": function () { return ""; },
        "all data in get method": function () { return ""; },
        "document size": function () { return null; },
        "ssvtype": function () { return null; },
        "frame recursive index": function () { return null; },

        "logical name": function () {
            return SAPPortalBehavior._attrs.title.call(this);
        },

        title: function () {
            return typeof (window.document.title) === "string" ? window.document.title : "";
        },

        name: function () {
            return window.name;
        },

        "hwnd": function () {
            return 0;
        },

        "html tag": function () {
            return "HTML";//for recorder _checkEach
        },

        "innerhtml": function () {
            return window.document.getElementsByTagName('html')[0].innerHTML;
        },

        "micclass": function () {
            return this._isPage ? ["SAPPortal"] : ["Frame"];
        },

        "class": function () {
            return "";
        },

        "sap maxbutton id": function () {
            return getAttrFromNavigationBar(getDetailedNavigationBar.call(this), "sap maxbutton id");
        },

        "sap minbutton id": function () {
            return getAttrFromNavigationBar(getDetailedNavigationBar.call(this), "sap minbutton id");
        },

        "sap loading state": function () {
            return getAttrFromNavigationBar(getDetailedNavigationBar.call(this), "sap loading state");
        },

        "visible": function () {
            return getAttrFromNavigationBar(getDetailedNavigationBar.call(this), "visible");
        },

        "crm object": function () {
            return getAttrFromNavigationBar(getDetailedNavigationBar.call(this), "crm object");
        },

        "wda object": function () {
            return getAttrFromNavigationBar(getDetailedNavigationBar.call(this), "wda object");
        },

        "subtabs count": function () {
            return getAttrFromNavigationBar(getTopNavigationBar.call(this), "subtabs count");
        },

        "selected subtab": function () {
            return getAttrFromNavigationBar(getTopNavigationBar.call(this), "selected subtab");
        },

        "tabs count": function () {
            return getAttrFromNavigationBar(getTopNavigationBar.call(this), "tabs count");
        },

        "selected tab": function () {
            return getAttrFromNavigationBar(getTopNavigationBar.call(this), "selected tab");
        },

        "all tabs": function () {
            return getAttrFromNavigationBar(getTopNavigationBar.call(this), "all tabs");
        },

        "all subtabs": function () {
            return getAttrFromNavigationBar(getTopNavigationBar.call(this), "all subtabs");
        },

    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        findElement: function (flags) {
            var elem = SapConfigurationUtil.filterCollection(document.documentElement, flags)
            if (elem.length > 0)
                return elem[0];
            return null;
        },
        getTopNavigationTabContainer(pElement) {
            var spTopNavigationContainer = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTABCONTAINER);
            if (spTopNavigationContainer == null)
                spTopNavigationContainer = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_SECONDLEVELTABCONTAINER);
            if (spTopNavigationContainer != null) {
                while (spTopNavigationContainer.parentElement != null) {
                    var domId = spTopNavigationContainer.id;
                    if (domId == "firstLevelScrollable_td" || domId == "TlnSecondLevelTable")
                        //We directly return the navigationbar element in chrome
                        return spTopNavigationContainer;
                    spTopNavigationContainer = spTopNavigationContainer.parentElement;
                }
            }
            return spTopNavigationContainer;
        },
    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            var spDetailedNavigationBarElement = SAPPortalBehavior._helpers.findElement(SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_MAIN);
            if (spDetailedNavigationBarElement == null)
                resultCallback(msg);

            var detailedNavigationBar = SAPKit.createAO(spDetailedNavigationBarElement, msg._to);
            return SAPNavigationBarForPortalBehavior._methods["GET_PATH_STATUS"].call(detailedNavigationBar, msg, resultCallback);
        },

        "SAP_TABSTRIP_GET_TAB_ID": function (msg, resultCallback) {
            var spFirstLevelContainer = SAPPortalBehavior._helpers.findElement(SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTABCONTAINER);
            var spTopNavigationBarElement = SAPPortalBehavior._helpers.getTopNavigationTabContainer(spFirstLevelContainer);
            if (spTopNavigationBarElement == null)
                resultCallback(msg);

            var topNavigationBar = SAPKit.createAO(spTopNavigationBarElement, this.getID());
            return SAPTopNavigationBarBehavior._methods["SAP_TABSTRIP_GET_TAB_ID"].call(topNavigationBar, msg, resultCallback);
        },

        "SAP_PORTAL_GET_SEARCH_BUTTON_ID": function (msg, resultCallback) {
            var spSearchBar = SAPPortalBehavior._helpers.findElement(SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_MAIN)
            if (spSearchBar == null)
                resultCallback(msg);

            var searchBar = SAPKit.createAO(spSearchBar, msg._to)
            return SAPPortalSearchBehavior._methods["SAP_PORTAL_GET_SEARCH_BUTTON_ID"].call(searchBar, msg, resultCallback);
        },

    },

    //deliver to different derived class
    _eventHandler: function (recorder, ev) {
        // check if the 'Search' button was pressed
        var spSearchBar = SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_MAIN);

        if (spSearchBar != null) {
            var searchBar = SAPKitFactory.createAO(spSearchBar, this._parentID, [SAPPortalSearchBehavior]);
            return searchBar._behaviors[1]._eventHandler.call(this, recorder, ev);
        }

        var spTopNavigationBarElement = SAPPortalBehavior._helpers.getTopNavigationTabContainer(ev.target);
        if (spTopNavigationBarElement != null) {
            var topNavigationBar = SAPKitFactory.createAO(spTopNavigationBarElement, this._parentID, [SAPTopNavigationBarBehavior]);
            return topNavigationBar._behaviors[1]._eventHandler.call(this, recorder, ev);
        }

        var spDetailedNavigationContainer = SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_MAIN);
        if (spDetailedNavigationContainer != null) {
            var detailedNavigation = SAPKitFactory.createAO(spDetailedNavigationContainer, this._parentID, [SAPNavigationBarForPortalBehavior]);
            return detailedNavigation._behaviors[1]._eventHandler.call(this, recorder, ev);
        }

        return true;
    },

};



var SAPPortal73DetailedNavBarNodeLinkBehavior = {
    _micclass: ["SAPPortal73DetailedNavBarNodeLink", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPPortal73DetailedNavBarNodeLink";
        },
    },
};


var SAPPortal73DetailedNavBarNodeFolderIconBehavior = {
    _micclass: ["SAPPortal73DetailedNavBarNodeFolderIcon", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPPortal73DetailedNavBarNodeFolderIcon";
        },
    },
};

var SAPPortalCatalogBehavior = { // inherit from CSAPNavigationBarForPortal
    _micclass: ["SAPTreeView", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPTreeView";
        },

        "logical name": function () {
            return "Portal Catalog";
        },

    },
};

var SAPPortalSearchBehavior = { // inherit from CSAPNavigationBarForPortal
    _micclass: ["SAPPortalSearch", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPPortalSearch";
        },

    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        isObjSpyable: function () {
            return false;
        },
        search: function (msg) {
            if (!msg)
                return;
            msg.status = "ERROR";

            var spEdit = this.findEdit();
            if (spEdit == null)
                return;

            var bstrSearchStr = msg._data["sap attached text"];;
            if (bstrSearchStr == null) {
                return;
            }
            spEdit.Value = 2;

            // Set focus and then perform click
            var spButton = findSearchButton();
            var pGenItemObj = new AO(obj.pItem, this.getID());
            if (pGenItemObj) {
                var spWRTID = pGenItemObj.getID();
                msg._attr_names.push("id");
                msg._data["id"] = spWRTID;
                msg.status = "OK";
            }
            return;
        },
        findEdit: function () {
            var spDisp = this._elem.getElementsByTagName('*');
            var vectorInputs = SapConfigurationUtil.filterCollection(spDisp, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_INPUT);
            if (vectorInputs.length != 1) // there should be only one input element in that container
                return null;

            return vectorInputs[0];
        },
        findSearchButton: function () {
            //Find the Detailed Navigation Bar
            var spDisp = this._elem.getElementsByTagName('*');
            var vectorInputs = SapConfigurationUtil.filterCollection(spDisp, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_BUTTON);
            if (vectorInputs.length != 1) // there should be only one input element in that container
                return null;

            return vectorInputs[0];
        },
    },

    _methods: {
        "SAP_PORTAL_GET_SEARCH_BUTTON_ID": function (msg, resultCallback) {
            this.search(msg);
            resultCallback(msg);
        },
    },

    _eventHandler: function (recorder, ev) {
        if (ev.type == "dblclick")
            return false;

        SAPUtils.updateRtidWithSAPPortal.call(this);
        // Do not record events on the edit field
        if (SapConfigurationUtil.IsElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAPSP_PORTAL_SEARCHBAR_INPUT)) {
            // Extract the event string - we are interested in submit messages
            if (ev.type != "submit")
                return false;
        }

        // Find text in search input field
        var spEdit = SAPPortalSearchBehavior._helpers.findEdit();
        if (spEdit == null)
            return false;

        var SearchStr = spEdit.getAttribute("value");
        var params = { event: 'on' + ev.type };
        params["sap attached text"] = SearchStr;
        recorder.sendRecordEvent(this, ev, params);
        return true;
    },

};