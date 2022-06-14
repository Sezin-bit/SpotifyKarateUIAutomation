var SAPListButtonBehavior = {
	_micclass: ["SAPListButton", "WebButton", "StdObject"],

	_methods: {
		"SAP_WD_FRAME_VISIBLE": function (msg, resultCallback) {
			//we have to write this function
			this._isListFrameVisible(msg);
			resultCallback(msg);
		}

		//To do
		//CWIObj::InvokeMethod(MethodName, ppWebInfo);
	},

	_eventHandler: function (recorder, ev) {
		//To do 
		// this._logger.trace('SAPListButton._eventHandler: Received recordable event: ' + ev.type);
		// if (ContentUtils.isTouchEnabled())
		// 	return this._eventHandlerTouchEnabled.call(this._elem, recorder, ev);

		switch (ev.type) {
			case 'click':
				var params = { event: 'on' + ev.type };
				params["webdynpro list item"] = false;
				//GetParentObj
				var listInputAO = this._getParentList(this._elem);
				if (Util.isNullOrUndefined(listInputAO)) {
					this._logger.trace('SAPListItemBehavior.getParentListAO: failed!');
					return false;
				}

				var id = listInputAO.getID();
				var value = listInputAO.GetAttrSync("value");

				recorder.sendRecordEvent(listInputAO, ev, {
					event: 'on' + ev.type,
					value: value,
					"sap event from item": true,
				});

				return true;
		}
	},

	_helpers: {
		isLearnable: Util.alwaysTrue,

		// To find the parent list
		_getParentList: function (elem) {
			//get the List 
			var list = this._getOwnerList(elem);
			if (list != null) {
			    var newAO = SAPKitFactory.createAO(list, this._parentID, [SAPComboBoxBehavior]);
				return newAO;
			}
			return null;
		},

		//Overwrite getParent method.
		getParent: function () {
			return this._getParentList(this._elem);
		},

		_isListFrameVisible: function (msg) {
			var ready = false;
			var listFrame = this._findListFrame();

			// added for new portal - there is no list frame at all in new portal -
			// therefore we set the state ready to be true ,so that we 
			// will not check the frame state next time.
			if (listFrame == null) {
				ready = true;
			}
			else {
				//now we have the frame and we check if the iframe is visible
				var style = listFrame.style;
				if (!Util.isNullOrUndefined(style)) {
					if (parseInt(style.top,10) > 0 && parseInt(style.height,10) > 0 && parseInt(style.width,10) > 0)
						ready = true;
				}
			}

			msg._data["visible"] = ready;
		},

		_findListFrame: function () {
			//filter the IFRAME of the List's options from the children of the doc:
			return SapConfigurationUtil.getElementOfCollection(document, SAP_SPECIFIER_ENUM.SAPWDLIST_FRAME);
		},

		_getOwnerList: function (elem) {
			//get the List 
			var listContainer = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_CONTAINER, 4);
			if (Util.isNullOrUndefined(listContainer)) {
				return null;
			}
			var list = SapConfigurationUtil.getElementOfCollection(listContainer, SAP_SPECIFIER_ENUM.SAPWD_LIST_ELEMENT);
			return list;
		},

		isObjSpyable:function(){
            return false;
        },
	}
};
