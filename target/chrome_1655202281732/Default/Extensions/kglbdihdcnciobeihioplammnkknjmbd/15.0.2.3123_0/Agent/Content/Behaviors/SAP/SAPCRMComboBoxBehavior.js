/* General CRM list structure :

<SPAN class = testmode id = ... T_dropdownListBox ... >  -> List testmode span
  <DIV class = th-ddlb-container>
	<DIV class = th-ip-sp th-ip-sp-icon>
	  ....
				<TR>
					<TD class = th-ip-td1>
					....
							<INPUT class = th-if ...> -> The list input element we are working with
					<TD class = th-ip-td2>
					    <A = th-ip ...>  -> The list button part
	<DIV class = th-hb-ct>
		<UL class = th-hb-ul>        -> List items container
			<LI id =... T_selectionBoxItem ...>  ->List item
			<LI id =... T_selectionBoxItem ...>  ->List item
			....

 Note: the given structure is the most common structure of the list, but there are also cases,
 when the list items are not located under the testmode span ,so sometimes we need 
 to search for items in the whole document. */

var SAPCRMComboBoxBehavior = {
	_micclass: ["SAPList", "WebList", "StdObject"],

	_attrs: {
		"webdynpro list": function () {
			if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN))
				return true;
			return false;
		},

		"webdynpro list button": function () {
			var button = this._getListButtonAO(SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_BUTTON_MAIN);
			if (!Util.isNullOrUndefined(button))
				return button.getID();
		},

		"CRM list in table": function () {
			// check if we have CRM list in table
			if (SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_TESTMODE) &&
				SAPUtils.isSapTableChild(this._elem))
				return true;
			else
				return false;
		}
		//To do 
		//return CSAPComboBox::GetAttrEx(AttrName, pAttrData, ppAttrVal); 
	},

	_eventHandler: function (recorder, ev) {
		// this._logger.trace('SAPCRMComboBox._eventHandler: Received recordable event: ' + ev.type);
		// if (ContentUtils.isTouchEnabled())
		// 	return SAPCRMComboBoxBehavior._eventHandlerTouchEnabled.call(this, recorder, ev);

		switch (ev.type) {
			case 'focus':
			case 'blur':
			case 'click':
				var params = { event: 'on' + ev.type };
				if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN)) {
					params["webdynpro list item"] = false;
					var listId = this._elem.id;
					if (listId != null) {
						params["webdynpro list matched item id"] = listId;
					}
				}

				var value = this.GetAttrSync("value");
				if (!Util.isNullOrUndefined(value))
					params["value"] = value;
				
				recorder.sendRecordEvent(this, ev, params);
				return true;
		}
		//return CWIComboBox:: FillRecordInformation(pElement, ppWebInfo);
	},

	_helpers: {
		isLearnable: Util.alwaysTrue,

		//Overwrite function in SAPComboBoxBehavior.js
    //Returns container which contains the list items.
	_getOptionsContainer: function () {
		var element = this._elem;
		var listId = element.id;
		var optionsContainerParent;
		if (listId != null) {
			optionsContainerParent = document.getElementById(listId + "__items");
			optionsContainer = SapConfigurationUtil.getElementOfCollection(optionsContainerParent, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_OPTION_CONTAINER);
			if (optionsContainer != null) {
				return optionsContainer;
			}
		}
		return null;
	},

	_getItemFromFrame: function (elem, msg) {
		var vectorOfListItems;
		var optionsContainer, listItem;
		optionsContainer = this._getOptionsContainer();
		if (optionsContainer != null) {
			vectorOfListItems = SapConfigurationUtil.filterCollection(optionsContainer, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_ITEM_MAIN);
			if (vectorOfListItems.length)
				listItem = this._getSelectedItemFromCollection(vectorOfListItems, msg);
		}

		if (listItem != null) {
			//create an AO for returning its ID
			var itemAO = SAPKitFactory.createAO(listItem, this.getID(), [SAPListItemBehavior]);
			if (itemAO != null) {
				msg._data["sap id"] = itemAO.getID();
				msg._data.result = 0;
				return;
			}
		}

		msg._data.result = 0x80070057;
		return;
	},

	//this function returns the button's AO which is the button part of the WebDynpro List
	_getListButtonAO: function (specifier) {
		//get the container of the list
		var container = SAPCRMListButtonBehavior._helpers._findListContainer(this._elem);
		if (container != null) {
			//found the container.now find the button
			var button = SapConfigurationUtil.getElementOfCollection(container, specifier);
			if (button != null)
				return SAPKitFactory.createAO(button, this.getID(), [SAPListButtonBehavior, SAPCRMListButtonBehavior]);
		}
		return null;
	},
	}

};