var SAPTabStripBehavior = {
	_micclass: ["SAPTabStrip"],

	_attrs: {
		"micclass": function () {
			return "SAPTabStrip";
		},

		"name": function () {
			return this._getLogicalName();
		},

		"logical name": function () {
			return this._getLogicalName();
		},

		"items count": function () {
			return this._getNumOfTabs();
		},

		"all items": function () {
			// Return the names of all tabs in one string of the format "tab1;tab2;...;tabN"
			return this._concatenateTabNames();
		},

		"selected tab": function () {
			return this._getSelectedTab();
		},

		"visible items": function () {
			return this._getNumOfVisibleTabs();
		},

		//No property will be passed on IE.remove this currently.
		// "rect": function (msg) {
		// 	return this._getTabRect(msg);
		// },

		"sap web component name": function () {
			return SAPUtils.getComponentName(this._elem, this);
		},

		"sap web component runtime ID": function () {
			return SAPUtils.getComponentRuntimeID(this._elem, this);
		}
	},

	_methods: {
		"SAP_TABSTRIP_GET_ARROW_ID": function (msg, resultCallback) {
			//we have to write this function
			this._getArrowRuntimeID(msg);
			resultCallback(msg);
		},

		"SAP_TABSTRIP_GET_TAB_ID": function (msg, resultCallback) {
			// Get the runtime ID of visible tab PN_VALUE of this tab-strip
			this._getTabRuntimeID(msg);
			resultCallback(msg);
		},

		"SAP_TABSTRIP_WHERE_IS_TAB": function (msg, resultCallback) {
			// Return the direction (PN_SAP_TAB_DIRECTION) where tab PN_VALUE is expected to be
			this._whereIsTab(msg);
			resultCallback(msg);
		},
	},

	_eventHandler: function (recorder, ev) {
		// Filter events except onmousedown, oncontextmenu and onclick
		var eventName = ev.type;
		var element = ev.target;
		if (eventName != "mousedown" && eventName != "contextmenu" && eventName != "click")
			return false;

		// IE getContainerElement will return null, but the condifiton is to compare null to nullptr which is always false.
		// if (eventName == "click" && (SapConfigurationUtil.getContainerElement(element, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TLTABITEM, 5) == null))
		// 	return false;

		// Some elements only raise a onmousedown event instead of onclick
		// replace the onmousedown event if needed
		var params = { event: 'on' + ev.type };
		if (eventName == "mousedown")
			params.event = "onclick";

		// Get the actual tab element
		var tab = { elem: this._getActualTabElement(element) };
		if (!tab.elem)
			return false; // only clicks on one of our tabs interests us

		// Set the name of the tab in the record information
		params["value"] = this._getUniqueTabName(tab);
		recorder.sendRecordEvent(this, ev, params);
		return true;
	},

	_helpers: {
		isLearnable: Util.alwaysTrue,

		_getLogicalName: function () {
			return this._getTabNameByIndex(0) || "SAPTabStrip";
		},

		_getTabNameByIndex: function (index) {
			if (index != null && index < 0) {
				return null;
			}
			// Get the IDs of all tabs
			var tabIDs = this._getTabIDs();
			if (tabIDs.length == 0)
				return null;

			// Make sure there are enough tabs	
			if (index >= tabIDs.length)
				return null;

			// Return the tab name
			return tabIDs[index].title;
		},

		_getTabIDs: function () {
			var tabs = [];
			// Get the java-script tab titles array
			var titlesArray = this._getScriptTitlesArray();
			if (!titlesArray)
				return tabs;

			for (let index = 0; index < titlesArray.length; index++) {
				var item = titlesArray[index];
				var tabID = {};

				// Check if this item represents a tab indicator
				if (!this._getScriptItemTabID(item, tabID))
					continue;

				// We assume that the item before the tab indicator is the tab name
				if (index == 0)
					continue;
				tabID.title = this._fixTabName(titlesArray[index - 1]);

				/*
				* We assume that the tabs are ordered in the script the same way they are 
				* ordered in the GUI.
				*/
				tabs.push(tabID);
			}

			return tabs;
		},

		_fixTabName: function (tabName) {
			// When the tab has an icon there's an unnecessary leading white space 
			if (!tabName) 
				return tabName;
			
			tabName = tabName.trim();
			//trim new lines, namely trim the characters after CR/LN characters
			var charIndex = this._getCarriageReturnIndex(tabName);
			if (charIndex > 0) {
				tabName = tabName.substring(0, charIndex);
			}
			return tabName;
		},

		_getCarriageReturnIndex: function (tabName) {
			var index = tabName.indexOf("\r\n");
			if (index < 0) {
				index = tabName.indexOf("\n");
			}
			return index;
		},

		//SAPTabStripUtils
		_getScriptItemTabID: function (item, tabID) {
			/*
			* Tab indicators are of the format '=tab_id' where tab_id is an indentification string 
			* for inner script usage. (e.g. '=TAB4', '=10\\\\TAB01', '=KUND')
			*/
			if (!item || Item[0] != '=')
				return false;

			tabID.innerID = item.substring(1);
			return true;
		},

		_getScriptTitlesArray: function () {
			var script = this._getTabScript(this._elem);
			if (!script || !script.text)
				return null;
			var scriptText = script.text;
			var arrayIndicator = "_TITLES = new Array";
			var arrayPos = scriptText.indexOf(arrayIndicator);
			if (arrayPos < 0)
				return null;

			return this._parseJavaList(scriptText, arrayPos);
		},

		_parseJavaList: function (javaScript, listStart) {
			var list = [];
			var posObj = { pos: listStart };
			var item = this._getNextJavaItem(javaScript, posObj);
			while (pos >= 0) {
				list.push(item);
				item = this._getNextJavaItem(javaScript, posObj);
			}

			return list;
		},

		_getNextJavaItem: function (javaScript, posObj) {
			// End of list unless proven otherwise

			// Find start of item (opening ') & make sure we haven't reached end of list (closing parenthesis)
			var start = javaScript.indexOf('\'', posObj.pos);
			if (start < 0 || javaScript.substr(posObj.pos, start - posObj.pos).indexOf(')') >= 0) {
				posObj.pos = -1;
				return null;
			}

			// Find end of item (closing ')
			var end = javaScript.indexOf('\'', start + 1);
			while (end != -1 && javaScript[end - 1] == '\\')	// ignore \'
				end = javaScript.indexOf('\'', end + 1);

			if (end <= start)
				return null;

			posObj.pos = end + 1;
			return javaScript.substr(start + 1, end - start - 1);
		},

		_getTabScript: function (elem) {
			// Look for tab-strip-script among direct children
			var nodeElements = SapConfigurationUtil.filterCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_SCRIPT);
			if (nodeElements.length == 0)
				return null;

			return SapConfigurationUtil.getItemContainingSpecifierText(nodeElements, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_SCRIPT_TEXT);
		},

		_getNumOfTabs: function () {
			/*
			* We get all the names of the tabs when we only need to count them.
			* This makes the code easier to maintain, though it's worse performance-wise.
			*/
			// Get the IDs of all tabs
			var tabIDs = this._getTabIDs();
			// Return the number of tabs
			return tabIDs.length;
		},

		_concatenateTabNames: function () {
			var sep = ";";
			// Get the IDs of all tabs
			var tabIDs = this._getTabIDs();
			if (tabIDs.length == 0)
				return null;

			// Concatenate the names into one string
			var val = "";
			for (let i = 0; i < tabIDs.length; i++) {
				var tabID = tabIDs[i];
				if (val)
					val += sep;
				val += tabID.title;
			}

			return val;
		},

		_getSelectedTab: function () {
			var selectedItem = this._getSelectedTabElement();
			if (!selectedItem) {
				return "";
			}
			return SAPUtils.fixLogicalName(selectedItem.innerText);
		},

		_getSelectedTabElement: function () {
			var selectedItems = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_TABSTRIPITEM_SELECTED);
			if (selectedItems.length == 0 && SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TLTABITEM)) {
				var parentElement = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TLTABS);
				if (parentElement)
					selectedItems = SapConfigurationUtil.filterCollection(parentElement, SAP_SPECIFIER_ENUM.SAP_CRMTABSTRIPITEM_SELECTED);
			}

			if (selectedItems.length == 0) {
				return null;
			}

			return selectedItems[0];
		},

		_getNumOfVisibleTabs: function () {
			/*
			* We get all the visible tab elements when we only need to count them.
			* This makes the code easier to maintain, though it's worse performance-wise.
			*/

			// Get all visible CSAPTab elements
			var tabElems = this._getVisibleTabElements();
			if (tabElems.length == 0)
				return -1;
			// Return the number of tabs
			return tabElems.length;
		},

		_getVisibleTabElements: function (firstTabIndexObj) {
			// No elements for the time being
			var tabElems = [];

			// Look through the table cells for tab elements
			var data = {};
			data.tabsRow = -1;
			data.tabElems = tabElems;
			if (!this._enumTableCells(this._elem, data))
				return tabElems;

			// No visible tabs?! Impossible.
			if (data.tabsRow < 0)
				return tabElems;

			// Not interested in the index of the first visible tab? --> all done
			if (!firstTabIndexObj)
				return data.tabElems;

			// Look for the first tab that its index we can infer
			for (let i = 0; i < data.tabElems.length; i++) {
				var tabIndex = this._getTabIndex(data.tabElems[i]);
				if (tabIndex == -1)
					continue;

				// If the i-th visible tab has index tabIndex then...
				firstTabIndexObj.firstTabIndex = tabIndex - i;
				return data.tabElems;
			}

			/*
			* We failed to find a clue for the index of the visible tabs.
			* 1. All of the visible tab names are obviously not unique.
			* 2. At least one of the following is true:
			*		a. We're recording not through mouse events. (where tab information is stepped over)
			*		b. There's only one visible tab, and it is selected. (selected tab has minimum information)
			* If (b) is the case we can only suggest using a replay solution.
			*/
			return tabElems;
		},

		_enumTableCells: function (elem, data) {
			if (!elem) {
				return false;
			}
			// Get rows of TABLE 
			var rows = elem.rows;
			if (!rows)
				return false;

			// Get number of rows in table
			// Got through rows
			for (let i = 0; i < rows.length; i++) {
				var row = rows[i];
				if (!row)
					return false;

				var cells = row.cells;
				if (!cells)
					return false;

				// Get number of cells in row
				for (let j = 0; j < cells.length; j++) {
					var cell = cells[j];
					if (!cell)
						return false;
					var continueObj = { continue: true };
					if (!this._getTabElementFromCell(cell, i, j, data, continueObj))
						return false;
					if (!continueObj.continue)
						return true;
				}
			}

			return true;
		},

		_getTabElementFromCell: function (cell, row, column, data, continueObj) {
			var cData = data;
			if (!cell || !data) {
				return null;
			}
			// If this is not the row where we found tabs, we can stop
			if (cData.tabElems.length > 0 && row > cData.tabsRow) {
				continueObj.continue = false;
				return true;
			}

			// Is this cell actually a tab element?
			var candidateTab = { elem: this._getActualTabElement(cell) };
			if (candidateTab.elem != null) {
				cData.tabsRow = row;
				cData.tabElems.push(candidateTab);		// add CSAPTab object to vector
			}

			return true;
		},

		_getTabIndex: function (tab) {
			// If Tab has an index use it
			var tabIndex = this._getIndex(tab);
			if (tabIndex != -1)
				return tabIndex;

			// If Tab has an inner ID use it to find index
			var innerID = this._getInnerID(tab.elem);
			if (!innerID) {
				tabIndex = this._getTabIndexByInnerID(innerID);
				if (tabIndex != -1)
					return tabIndex;
			}

			// Use tab title to find index
			var uniqueObj = {};
			tabIndex = this._getTabIndexByName(this._getName(tab.elem), uniqueObj);
			return (uniqueObj.unique ? tabIndex : -1);
		},

		_getTabIndexByInnerID: function (innerID) {
			// Get the IDs of all tabs
			var tabIDs = this._getTabIDs();
			if (tabIDs.length == 0)
				return -1;

			// Go through tabs and look for a match
			for (let i = 0; i < tabIDs.length; i++) {
				if (innerID == tabIDs[i].innerID)
					return i;
			}
			// No match
			return -1;
		},

		_getTabIndexByName: function (tabName, uniqueObj) {
			// Unique until proven otherwise
			if (uniqueObj != null)
				uniqueObj.unique = true;

			// Get the IDs of all tabs
			var tabIDs = this._getTabIDs();
			if (tabIDs.length == 0)
				return -1;

			// Go through tabs and look for a match
			var tabIndex = -1;
			for (let i = 0; i < tabIDs.length; i++) {
				// Match?
				if (tabName != tabIDs[i].title)
					continue;

				// Not interested in uniqueness? --> return the match
				if (!uniqueObj)
					return i;

				// Not first occurence? --> not unique
				if (tabIndex != -1) {
					uniqueObj.unique = false;
					return tabIndex;
				}
				// Remember match
				tabIndex = i;
			}

			// We reach here if there was no match, or a unique match (when pbUnique is non-NULL)
			return tabIndex;
		},

		//SAPTab method
		_getName: function (elem) {
			if (!elem)
				return null;
			// Get the inner text of the tab element 
			var tabName = elem.innerText;
			if (!tabName)
				return null;

			// Fix it and return as title
			return this._fixTabName(tabName);
		},

		//SAPTab method
		_getInnerID: function (elem) {
			if (!elem) {
				return null;
			}
			// Get this tab's Action Arguments
			var actionArgs = this._getActionArgs(elem);
			if (actionArgs.length < 3)
				return null;

			var tab = {};
			if (!this._getScriptItemTabID(actionArgs[2], tab))
				return null;
			return tab.innerID;
		},

		//SAPTab method
		_getActualTabElement: function (element) {
			var tabCandidate = element;
			// Look through the ancestors of the given element
			while (!SapConfigurationUtil.isElementOfSpecifier(tabCandidate, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TAB)) {
				var parent = tabCandidate.parentElement;
				if (!parent)
					return null;	// no more ancestors
				tabCandidate = parent;
			}

			// We found the tab element
			return tabCandidate;
		},

		_getIndex: function (tab) {
			if (!tab.elem)
				return -1;

			// Get this tab's Action Arguments
			var actionArgs = this._getActionArgs(tab.elem);
			if (actionArgs.length < 2)
				return -1;

			// The 2nd argument is the index (except for ITS4.6 where there is no index)
			var indexArg = actionArgs[1];
			if (!indexArg)
				return -1;
			if (indexArg[0] == '~')	// ITS4.6
				return -1;
			var intArg = parseInt(indexArg);
			if (!isNaN(intArg)) {
				return intArg - 1;	// 1..n --> 0..n-1
			}
			return -1;
		},

		_getActionArgs: function (elem) {
			var rc = [];
			if (!elem)
				return rc;

			// Get the HTML element which contains the RaiseSelectTabStrip method
			var actionElement = this._getClickableElement(elem);
			if (!actionElement)
				return rc;

			// Get its HTML source
			var actionHTML = actionElement.outerHTML;

			// Get the RaiseSelectTabStrip method position in the HTML source
			var actionPos = actionHTML.indexOf("webguiRaiseSelectTabStrip");
			if (actionPos < 0)
				return rc;

			return this._parseJavaList(actionHTML, actionPos);
		},

		_getClickableElement: function (elem) {
			if (!elem)
				return null;

			// Check if tab has a link child (ITS4.6d)
			var link = this._getElementSingleChildByTag(elem, "A");
			if (link != null) {
				// If link has an image descendant we must return the image, otherwise we'll have problems with textless tabs
				var image = this._getElementSingleChildByTag(link, "IMG");
				if (image != null)
					return image;
				else
					return link;
			}

			return elem;
		},

		//SAPTabStripUtils
		_getElementSingleChildByTag: function (element, tag) {
			// Get all children of the specified tag
			var children = this._getElementChildrenByTag(element, tag);
			if (!children)
				return null;

			// Need one child exactly
			if (children.length != 1)
				return null;
			return children[0];
		},

		//SAPTabStripUtils
		_getElementChildrenByTag: function (element, tag) {
			return element.getElementsByTagName(tag);
		},

		_getTabRect: function (msg) {
			var tabRect;
			// Try to get tab from data, to do check
			var tabIdentifier = msg._data["value"];
			var tab = this._getTabFromWebAttr(tabIdentifier);
			if (!tab)
				tabRect = SAPUtils.getRectangle(this._elem);	// get tab STRIP rect
			else
				tabRect = SAPUtils.getRectangle(tab.elem);			// get TAB rect

			if (!tabRect)
				return null;

			// Success! to do check
			msg._data["rect"] = tabRect;
			return tabRect;
		},

		_getTabFromWebAttr: function (tabIdentifier) {
			var tabIndex = this._getTabIndexFromWebAttr(tabIdentifier);
			if (tabIndex == -1)
				return false;

			return this.getTab(tabIndex);
		},

		_getTabIndexFromWebAttr: function (tabIdentifier) {
			// The CWebAttrVal tab identifier can be long (1..n) or string (#1..#n or tab title)

			if (!tabIdentifier)
				return -1;
			//Need to check! to do check
			var lVal = parseInt(tabIdentifier);
			if (!isNaN(lVal)) {
				--lVal;	// (1..n) --> (0..n-1)
				// Make sure tab index is in range
				if (lVal < 0 || lVal >= this._getNumOfTabs())
					return -1;

				return lVal;
			}

			return this._getTabIndexFromStringId(val);
		},

		_getNumOfTabs: function () {
			/*
			* We get all the names of the tabs when we only need to count them.
			* This makes the code easier to maintain, though it's worse performance-wise.
			*/

			// Get the IDs of all tabs
			var tabIDs = this._getTabIDs();
			if (tabIDs.length == 0)
				return -1;

			// Return the number of tabs
			return tabIDs.length;
		},

		_getTabIndexFromStringId: function (tabId) {
			// Tab string identifier can be a number (#1..#n) or the tab name itself
			if (tabId[0] == '#') {
				// Identifier of format "#n"
				var tabNum = parseInt(tabId.substr(1));
				if (!isNaN(tabNum)) {
					tabNum = tabNum - 1; // (1..n) --> (0..n-1)
					// Make sure tab index is in range
					if (tabNum < 0 || tabNum >= this._getNumOfTabs())
						return -1;
					return tabNum;
				}
				return -1;
			}
			else {
				// The string identifier is the tab name
				return this._getTabIndexByName(tabId);
			}
		},

		_getTab: function (tabIndex) {
			// Get all visible CSAPTab elements
			var firstTabIndexObj = {};
			var tabElems = this._getVisibleTabElements(firstTabIndexObj);
			if (tabElems.length == 0)
				return null;

			// Make sure the requested tab is visible
			var lastTab = firstTabIndexObj.firstTabIndex + tabElems.length - 1;
			if (tabIndex < firstTabIndexObj.firstTabIndex || tabIndex > lastTab)
				return null;

			// Return the tab
			return tabElems[tabIndex - firstTabIndexObj.firstTabIndex];
		},

		_getUniqueTabName: function (tab) {
			// If the tab name is unique in this tab-strip (and non-empty) then use it
			var tabName = this._getName(tab.elem);
			if (tabName) {
				var uniqueObj = {};
				this._getTabIndexByName(tabName, uniqueObj);
				if (uniqueObj.unique)
					return tabName;
			}

			// Try to obtain the exact index of the tab
			var tabIndex = this._getTabIndex(tab);
			if (tabIndex == -1) {
				// Couldn't find the index directly: use the other visible tabs for information about the index
				var visibleIndex, firstTabObj = {};
				visibleIndex = this._getTabVisibleIndex(tab, firstTabObj);
				if (visibleIndex != -1 || firstTab != -1) {
					return tabName;
				}
				tabIndex = firstTab + visibleIndex;
			}

			// We have the index of the tab --> the unique name will be of the form "#i" (i in 1..n)
			tabIndex += 1;
			tabName = "#" + tabIndex;
			return TabName;
		},

		_getTabVisibleIndex: function (tab, firstTabObj) {
			// Get all visible CSAPTab elements
			var tabElems = this._getVisibleTabElements(firstTabObj);
			if (tabElems.length == 0)
				return -1;

			// Look for the tab
			for (let i = 0; i < tabElems.length; i++) {
				if (tabElems[i] == tab)
					return i;
			}

			// Tab is not visible? impossible!
			return -1;
		},

		_getArrowRuntimeID: function (msg) {
			// Get the arrow direction
			var direction = msg._data["sap tab direction"];
			// Get the arrow element
			var arrowElement = this._getArrowElement(direction);
			if (arrowElement == null)
				return;

			// Create an WIObj wrap for the arrow
			var arrowAO = content.kitsManager.createAO(arrowElement, this._parentID);
			if (arrowAO == null)
				return;

			// Return the runtime ID
			msg._data.WEB_PN_ID = arrowAO.getID();
			return;
		},

		_getArrowElement: function (direction) {
			// Get the specifier for the desired arrow direction
			var specifier = this._getArrowSpecifier(direction);
			if (!specifier)
				return null;

			// Look through the table elements for the arrow
			return SapConfigurationUtil.getElementOfCollection(this._elem, specifier);
		},

		_getArrowSpecifier: function (direction) {
			switch (direction) {
				case -1:
					return SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_LEFT_ARROW;		// specifier for enabled left arrow
				case 1:
					return SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_RIGHT_ARROW;	// specifier for enabled right arrow
				default:
					return null;
			}
		},

		_getTabRuntimeID: function (msg) {
			// Get tab
			var tab = this._getTabFromWebInfo(msg);
			if (!tab)
				return;

			// Get the clickable element of the tab
			var tabElement = this._getClickableElement(tab.elem);
			if (tabElement == null)
				return;

			// Create an WIObj wrap for the tab
			var tabAO = content.kitsManager.createAO(tabElement, this._parentID);
			if (tabAO == null)
				return;

			// Return the runtime ID
			msg._data.WEB_PN_ID = tabAO.getID();
			return;
		},

		_getTabFromWebInfo: function (msg) {
			var tabIdentifier = msg._data["value"];
			if (!tabIdentifier)
				return null;

			return this._getTabFromWebAttr(tabIdentifier);
		},

		_whereIsTab: function (msg) {
			// Get tab index
			var tabIndex = this._getTabIndexFromWebInfo(msg);
			if (tabIndex == -1)
				return;

			// Check where is the direction of the tab
			var direction = this._whereIsTabEx(tabIndex);
			if (!direction)
				return;

			// Return the direction
			msg._data["sap tab direction"] = direction;
			return;
		},

		_getTabIndexFromWebInfo: function (msg) {
			var tabIdentifier = msg._data["value"];
			if (!tabIdentifier)
				return -1;

			return this._getTabIndexFromWebAttr(tabIdentifier);
		},

		_whereIsTabEx(tabIndex) {
			// Get all visible tab elements
			var firstTabIndexObj = {};
			var tabElems = this._getVisibleTabElements(firstTabIndexObj);
			if (tabElems.length == 0)
				return null;

			var lastTab = firstTabIndexObj.firstTabIndex + tabElems.length - 1;

			// Where is the wanted tab?
			if (tabIndex < firstTabIndexObj.firstTabIndex)
				direction = -1;	// to the left
			else if (tabIndex > lastTab)
				direction = 1;		// to the right
			else
				direction = 0;		// it is already visible

			return direction;
		},
	}
};


var SAPCRMTabStripBehavior = {
	_helpers: {
		isLearnable: Util.alwaysTrue,

		_getTabNameByIndex: function (index) {
			if (index < 0)
				return "";

			var elVector = this._getTabsRTIDVector();
			if (index > elVector.length)
				return "";

			return this._getTabName(elVector[index]);
		},

		_getNumOfTabs: function () {
			var elVector = this._getTabsRTIDVector();
			if (elVector.length > 0)
				return elVector.length;
			else
				return -1;
		},

		_concatenateTabNames: function () {
			var sep = ";";
			var val = "";
			// Get the IDs of all tabs
			var elVector = this._getTabsRTIDVector();
			if (elVector.length > 0) {
				// Concatenate the names into one string
				for (let i = 0; i < elVector.length; i++) {
					var tabName = this._getTabName(elVector[i]);
					if (tabName) {
						if (i > 0)
							val += sep;
						val += tabName;
					}
				}
			}
			return val;
		},

		_getTabsRTIDVector: function () {
			if (!SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TLTABITEM))
				return SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TAB);

			var parentElement = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TLTABS);
			if (parentElement)
				return SapConfigurationUtil.filterCollection(parentElement, SAP_SPECIFIER_ENUM.SAPSP_TABSTRIP_TAB);

			return [];
		},

		_getTabName: function (tabStrip) {
			/**
				Get the visible text of the TabStrip as the title
				Make sure we don't include any hidden text
		
				Here is an example of WDA V7.4
				
				<DIV id=WDDE class=lsTbsEndMore2Sel style="VISIBILITY: visible" lsdata="{0:'WDDE',2:true,12:'WDDF'}" ct="TSITM">
					<SPAN class=lsTbsFirst2Sel></SPAN>
					<SPAN tabIndex=0 id=WDDE-focus class="urNoUserSelect lsTbsLabel2Sel" ti="0">Table
						<DIV role=presentation aria-hidden=true class=lsTbsTitleAlign>Table-</DIV>
					</SPAN>
				</DIV>
				Note: V7.4 WDA TabStrip tab name SPAN contains a div, the div also has an innertext, in this case "Table-"
				Warning: Use innerText method on TabStrip object to retrive the tab name will cause 
						 html to return the tab name + the div text.
			*/

			// In WDA 7.5, the TabStripItem contains title attribute, directly use it.
			var tabStripItemTitle = SapConfigurationUtil.getElementOfCollection(tabStrip, SAP_SPECIFIER_ENUM.SAP_WDA_TABSTRIPITEM_TITLE);
			if (tabStripItemTitle )
			{
				//To align with IE, use textcontent instead of innerText.
				var name = tabStripItemTitle.textContent || tabStripItemTitle.innerText;
				return SAPUtils.replaceNbspToSpace(name);
			}

			if (tabStrip.title)
				return tabStrip.title;


			// get all visible child elements of the TabStrip
			var elems = this._getVisibleObjVector(tabStrip);
			if (elems.length == 0)
				return "";

			for (let i = 0; i < elems.length; i++) {
				// only process the child has a non-empty innerText
				var innerText = elems[i].innerText;
				if (!innerText)
					continue;

				// if the child has the class name ItmWidthHelper ,escaped.
				//http://mydvmsap07.swinfra.net:8000/sap/bc/gui/sap/its/webgui/?sap-client=001&sap-language=EN (mandy / W3lcome1)
				var className = elems[i].className;
				if (!className)
					continue;

				if (className.indexOf("ItmWidthHelper") != -1)
					continue;

				// extract the string from the current DOM firstChild data

				var tabNameNode = elems[i].firstChild;
				if (!tabNameNode)
					continue;

				var tabName = tabNameNode.nodeValue;
				if (!tabName)
					continue;
				// use whole innerText in case of an access key ( e.g. span.urAccessKey  with a single text letter in it)
				if (tabName.length == 1) {
					tabName.trim();
					if (!tabName)
						continue;

					return innerText.trim();
				}
				else
					return tabName;
			}

			return "";
		},

		_getVisibleObjVector: function (tabStrip) {
			// filter out the element has attribute of aria_hidden=true
			return SapConfigurationUtil.filterCollection(tabStrip, SAP_SPECIFIER_ENUM.SAPSP_ARIA_HIDDEN_EXCLUDED);
		},

		_getSelectedTab: function () {
			// See the comments in the GetTabName() method. It is for the special case of WDA 7.4.
			// Use innerText method on TabStrip object to retrieve the tab name will cause 
			// html to return the tab name + the div text.
			var selectedItem = this._getSelectedTabElement();
			if (!selectedItem) {
				return "";
			}
			return this._getTabName(selectedItem);;
		},

		_getTabRuntimeID: function (msg) {
			var tabId = msg._data["value"];
			if (!tabId)
				return;

			// Create an IE4Obj wrap for the tab
			var elVector = this._getTabsRTIDVector();
			var vecSize = elVector.length;
			// Tab string identifier can be a number (#1..#n) or the tab name itself
			if (tabId[0] == '#') {
				// Identifier of format "#n"
				var tabNum = parseInt(tabId.substr(1));
				if (!isNaN(tabNum)) {
					tabNum -= 1;
					// Make sure tab index is in range
					if (tabNum < 0 || tabNum >= vecSize)
						return;

					var tabAO = content.kitsManager.createAO(elVector[tabNum], this._parentID);
					if (!tabAO)
						return;

					msg._data.WEB_PN_ID = tabAO.getID();
					return;
				}
			}
			else {
				for (let i = 0; i < vecSize; i++) {
					var text = elVector[i].innerText;
					text = this._fixTabName(text);
					if (text == tabId) {
						var tabAO = content.kitsManager.createAO(elVector[i], this._parentID);
						if (!tabAO)
							return;

						msg._data.WEB_PN_ID = tabAO.getID();
						return;
					}
				}
				return;
			}
		},

		_whereIsTab: function (msg) {
			// We don't care if the tab is visible.
			msg._data["sap tab direction"] = 0;
			return;
		},
	}
};

