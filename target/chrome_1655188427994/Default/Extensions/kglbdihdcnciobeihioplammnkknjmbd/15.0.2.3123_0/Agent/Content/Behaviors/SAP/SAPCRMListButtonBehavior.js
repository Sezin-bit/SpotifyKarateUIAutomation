var SAPCRMListButtonBehavior = {
    _micclass: ["SAPCRMListButton", "WebButton", "StdObject"],

    _methods: {
        "SAP_WD_FRAME_VISIBLE": function (msg, resultCallback) {
            msg._data["Object Visible"] = true;
            resultCallback(msg);
            return true;
        },
        //TO DO
        //return CWIObj::InvokeMethod(MethodName, ppWebInfo);
    },

    _helpers: {
        isLearnable: Util.alwaysTrue,
        _findListContainer: function (elem) {
            return SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_TESTMODE);
        },

        _getParentList: function (elem) {
            //get the List 
            var listElement = this._getOwnerList(elem);
            if (listElement != null) {
                var newAO = SAPKitFactory.createAO(listElement, this._parentID, [SAPComboBoxBehavior, SAPCRMComboBoxBehavior]);
                return newAO;
            }
            return null;
        },

        _getOwnerList: function (elem) {
			//get the List 
			var listContainer = this._findListContainer(elem);
			if (Util.isNullOrUndefined(listContainer)) {
				return null;
			}
			var list = SapConfigurationUtil.getElementOfCollection(listContainer, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN);
			return list;
        },
    }
};
