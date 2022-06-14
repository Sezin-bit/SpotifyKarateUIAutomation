var SAPUtils = {
    fixPresentationSize: 4,
    extractDataFromLsDataStr: function (lsDataValue, startStringLocation, endStringLocation) {
        var i = lsDataValue.indexOf(startStringLocation);
        if (i <= -1)
            return "";
        i += startStringLocation.length;

        var fixLsDataValue = lsDataValue.substr(i, lsDataValue.length - i);
        var j = fixLsDataValue.indexOf(endStringLocation);
        if (j <= -1)
            return "";

        return fixLsDataValue.substr(0, j);
    },

    getLabelOrAttachedText: function (elemAO, bGetBefore = true, isLR = false) {
        if (SAPUtils.isSapTableChild(elemAO))   // get attached text for objects, which are  not inside SAPTable
            return null; //?? if return false, will get the value outside this object

        var label = SAPUtils.getLabel(elemAO._elem);
        if (label != null && label.length > 0)
            return label;

        if (isLR)
            return SAPUtils.getLRAttachedText(elemAO._elem, bGetBefore); // false - forward, true - back

        return SAPUtils.getAttachedText(elemAO._elem, bGetBefore); // false - forward, true - back
    },

    isSapTableChild: function (elemAO) {
        return SAPUtils.getParentSapTable(elemAO) != null;
    },

    getParentSapTable: function (elemAO) {
        // need check if there is parent of this object - SAPTABLE
        var parent = elemAO.getParent();
        while (parent) {

            if (Util.getMicClass(parent) == "SAPTable")
                return parent;

            parent = parent.getParent();
        }
        return null;
    },

    getLabel: function (elem) {

        if (!elem || !elem.id)
            return "";

        var Label_group;

        if (document != null)
            Label_group = document.getElementsByTagName("LABEL");

        if (Label_group == null)
            return "";

        for (var i = 0; i < Label_group.length; i++) {
            var label = Label_group[i];
            var target = label.htmlFor;
            if (!target || target.length == 0) {
                target = label.getAttribute("f");
            }
            if (elem.id == target) {
                if (label.innerText)// There may be more than one label per element so don't take an empty one.
                    return label.innerText.trim();
            }
            else {
                // sometimes the label can point not on the element itself , but on the element
                // container  - "TABLE"
                var editContainer = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_EDIT_CONTAINER);
                if (editContainer) {
                    if ((editContainer.id == target || editContainer.id == (target + ":")) && label.innerText) {
                        return label.innerText.trim();
                    }
                }
            }
        }

        // added for A1S - there is a case when the attached text is found in "SPAN" with
        // "id" that contains the sap edit "id".
        var parentLine = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_ROW);
        var elemLabels = SapConfigurationUtil.filterCollection(parentLine, SAP_SPECIFIER_ENUM.SAPSP_EDIT_LABEL);
        if (elemLabels != null) {
            for (member in elemLabels) {
                if (member.id != null && (member.id.indexOf(elem.id) != -1)) {
                    // we found the right label
                    if (member.innerText != null)
                        return member.innerText.trim();
                }
            }
        }

        return "";
    },

    getLRAttachedText: function (elem, bSide) {
        if (!elem)
            return null;
        var result = "";
        var domNode = elem;
        if (!bSide) {
            var nextDOMNode = domNode.nextSibling;
            element = nextDOMNode;
            while (nextDOMNode) {
                var lNodeType = nextDOMNode.nodeType;
                if (lNodeType == 1)		// element. (e.g. skip text nodes)
                {
                    element = nextDOMNode;
                    if (!element)
                        return null;

                    var innerText = element.innerText;
                    result += innerText;
                }

                domNode = nextDOMNode;
                nextDOMNode = domNode.nextSibling;
            }
            return result;
        }
        else {
            var firstLeftestTextNode = SAPUtils.getFirstTextNodeFromTheLeft(domNode);
            if (!firstLeftestTextNode)
                return null;

            return SAPUtils.getTextFromLeftTree(firstLeftestTextNode);
        }

        return null;
    },

    getFirstTextNodeFromTheLeft: function (domNode) {
        var leftestTextNode = null;
        if (!domNode)
            return null;

        var parent = domNode.parentNode;
        if (!parent)
            return null;

        while (!parent) {
            if (SAPUtils.isLeftestTextNode(domNode)) {
                leftestTextNode = domNode;
                return leftestTextNode;
            }

            // Go left
            var prevObj = domNode.previousSibling;
            domNode = prevObj;
            if (!domNode) {
                // Go to the last child
                var lastChild = domNode.lastChild;
                while (lastChild != null) {
                    parent = domNode;
                    domNode = lastChild;
                    lastChild = domNode.lastChild;
                }

            }
            else {
                // No more previousSiblings - Go up and left
                var prevParent = parent.previousSibling;
                while (prevParent == null) {
                    var tmpParent = parent.parentNode;
                    parent = tmpParent;
                    if (parent == null)
                        return leftestTextNode;
                    prevParent = parent.previousSibling;
                }

                parent = prevParent;
                domNode = parent;

                // Go to last child
                var lastChild = domNode.lastChild;

                while (lastChild != null) {
                    parent = domNode;
                    domNode = lastChild;
                    lastChild = domNode.lastChild;
                }
            }
        }

        return leftestTextNode;
    },

    isLeftestTextNode: function (domNode) {
        var nodeType = domNode.nodeType;
        if (nodeType == 3) {
            var textNode = domNode;
            if (textNode == null)
                return false;

            var text = textNode.data;
            if (!Util.isNullOrUndefined(text)) {
                text = text.trim();
                if (text != null || text.length > 0) {
                    return true;
                }
            }
        }
        return false;
    },

    getTextFromLeftTree: function (lastChild) {
        if (!lastChild)
            return null;

        var parent = lastChild.parentNode;
        if (!parent)
            return null;

        var child = parent.firstChild;
        var text = "";
        var childDomNode = lastChild.nextSibling;
        lastChild = childDomNode;
        while (child && (!lastChild || child != lastChild)) {
            var textFromElement = SAPUtils.getTextFromElement(child);
            text += textFromElement;

            var childNode = child.nextSibling;
            child = childNode;
        }
        text = text.trim();
        return text;
    },

    getTextFromElement: function (domNode) {
        var text = "";

        if (!domNode)
            return text;

        var lNodeType = domNode.nodeType;
        if (lNodeType == 1) {
            var element = domNode;
            if (!element)
                return text;
            text = element.innerText;
            return text;
        }

        if (lNodeType == 3) {
            var textNode = domNode;
            if (!textNode)
                return text;
            text = textNode.data;
            return text;
        }

        return text;
    },

    getComponentName: function (element, ao) {
        if (!SAPUtils.getComponentContainerElement(element, ao)) {
            return "";
        }

        // If it's a frame, we'd want to get the title from the frame's ao.
        //To do 
        if (!Util.isNullOrUndefined(ao.isContainerFrame) && ao.isContainerFrame)
            return SAPUtils.getComponentNameFromAO(null, ao);

        if (Util.isNullOrUndefined(ao.componentContainer)) {
            this._logger.trace("Component's flags are faulty");
            return "";
        }

        //0 Get the logical name of the component container's ao.
		//1 The name is fixed, and written in the XML.
		//2 Step down, find the specifier under the component and get the name from it.
        switch (ao.componentContainer.flags) {
            case 0:
                var name = SAPUtils.getComponentNameFromAO(ao.componentContainerElement, ao);
                if (name.length > 32) {
                    name = name.substr(0, 32);
                }
                return name;
            case 1:
                return ao.componentContainer.defaultLogicalName;
            case 2:
                var name = SAPUtils.getComponentNameFromSpecifier(ao.componentContainerElement, ao.componentContainer.stepDownSpecifier);
                if (name.length > 32) {
                    name = name.substr(0, 32);
                }
                return name;
        }
    },

getComponentContainerElement: function (element, ao, returnFrame = false, findAgain = false) {
        // If we know we're in frame and we don't need the frame, return NULL.
        // To do 
        //??
        if (!findAgain && !returnFrame && ao.isContainerFrame != null && ao.isContainerFrame == true)
            return true;

        // If the container is cached already - return the cached value.
        if (!findAgain && ao.isContainerValid != null && ao.isContainerValid == true)
            return true;

        var iter;
        for (var key in sapCRMConfig) {
            var containerSpecifier = key["Name"];
            var maxDepth = key["MaxDepth"];
            var componentContainerElement = SapConfigurationUtil.getContainerElement(element, 
                containerSpecifier !=null ? containerSpecifier : "",
                maxDepth != null ? maxDepth : -1);
            if (componentContainerElement) {
                ao.componentContainerElement = componentContainerElement;
                ao.componentContainer = key;
                ao.isContainerValid = true;
                return true;
            }
        }

        // If we're here - the closest component is the frame.
        ao.isContainerFrame = true;
        ao.isContainerValid = true;

        // If we don't need reference to the frame - just head back.
        if (!returnFrame) {
            return true;
        }

        ao.componentContainerElement = element.parentElement;
        if (!ao.componentContainerElement) {
            this._logger.error('Could not retrieve the elements frame.');
            ao.isContainerValid = false;
            return false;
        }

        return true;
    },

    getComponentNameFromAO: function (componentContainer, ao) {
        //Need to verify !!
        parentFrame = ao.getParent();
        var componentAO;
        if (!!componentContainer)
            componentAO = SAPKitFactory.createAO(componentContainer, parentFrame, [SAPFrameBehavior]);
        else
            componentAO = parentFrame;

        if (componentAO != null) {
            var attrName = !!componentContainer ? "logical name" : "title";
            var attrVal = componentAO.GetAttrSync(attrName);
            // If we're after the frame - get the title. else - get the logical name.
            if (Util.isNullOrUndefined(attrVal)) {
                this._logger.error('Could not find the containers logical name.');
                return "";
            }

            return attrVal;
        }

        return "";
    },

    getComponentNameFromSpecifier: function (componentContainer, specifier) {
        var nameElement = SapConfigurationUtil.getElementOfCollection(componentContainer, specifier);
        if (!nameElement) {
            this._logger.error('Could not find pNameElement.');
            return "";
        }

        var innerText = nameElement.innerText;
        if (Util.isNullOrUndefined(innerText)) {
            this._logger.error('Could not retrieve the inner text');
            return "";
        }

        return innerText;
    },

    getComponentRuntimeID: function (element, ao) {
        if (SAPUtils.getComponentContainerElement(element, ao)) {
            //pAO -> GetParentFrame(& spParentFrame);
            var parentFrame = ao.getParent();
            var componentAO;
            if (!Util.isNullOrUndefined(ao.isContainerFrame) && !ao.isContainerFrame)
                componentAO = SAPKitFactory.createAO(ao.componentContainer, parentFrame, [SAPFrameBehavior]);
            else
                componentAO = parentFrame;

            return componentAO.getID();
        }
        return null;
    },

    //this is a STATIC method. it receives the frame DOM element and returns the document pointed by the
    //this frame. return NULL if fails
    getDocumentPointedByFrame(listFrame) {
        if (listFrame != null) {
            //get the doc of the IFRAME.
            return listFrame.ownerDocument;
        }
        return null;
    },

    getAttachedText: function (elem, bGetBefore) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_EDIT_TEXTAREA)) {
            elem = elem.parentElement;
        }

        if (!elem) {
            this._logger.error('getAttachedText() elem is null or undefined');
            return;
        }

        var text = "";
        var range = new Range();
        var previousElem;
        var nextElem;

        var allNodes = elem.ownerDocument.querySelectorAll('*');
        var index = 0;
        for (; index < allNodes.length; index++) {
            if (SAPUtils.isSameElement(allNodes[index],elem)) {
                break;
            }
        }

        if (index >= allNodes.length)
            return null;

        var element = allNodes[index];

        while (!text && index >= 0 && index < allNodes.length) {
            if (bGetBefore) {
                previousElem = allNodes[index];
                if (!previousElem) {
                    break;
                }
                range.setStartBefore(previousElem);
                range.setEndAfter(element);
                index = index - 1;
            }
            else {
                nextElem = allNodes[index];
                if (!nextElem) {
                    break;
                }
                range.setStartBefore(element);
                range.setEndAfter(nextElem);
                index = index + 1;
            }
            text = range.toString().trim();
            var elementPreOrNext = previousElem != null ? previousElem : nextElem;
            if (text && elementPreOrNext.parentElement.tagName == "LI") {
                text = SAPUtils.updateTextForLiElement(elementPreOrNext, text);
            }
        }
        return text;
    },

    isSameElement: function (elem1, elem2) {
        if (elem1 == elem2) {
            return true;
        }

        //the real element in dom could have some difference with elem,
        //So check the property instead compare the whole object.
        if (elem1.tagName == elem2.tagName &&
            elem1.id == elem2.id &&
            elem1.className.trim() == elem2.className.trim()) {
            return true;
        }
        return false;
    },

    updateTextForLiElement: function(liElement, text) {
        var ulElem = liElement.parentElement;
        while (ulElem) {
            if (ulElem.tagName == "UL") {
                break;
            }
            ulElem = ulElem.parentElement;
        }

        if (ulElem) {
            return ulElem.innerText;
        }

        return text;
    },

    getGroupBoxName: function () {
        var elem = this._elem;
        if (elem == null)
            return "";

        var logical_name = SAPUtils.portal6GroupBoxName(elem);
        if (!!logical_name)
            return logical_name;

        logical_name = SAPUtils.ICWCGroupBoxName(elem);
        if (!!logical_name)
            return logical_name;

        logical_name = SAPUtils.portalLightSpeedGroupBoxName(elem);
        if (!!logical_name)
            return logical_name;

        logical_name = SAPUtils.CRMGroupBoxName(elem);
        if (!!logical_name)
            return logical_name;

        logical_name = SAPUtils.getNameBySourceIndex(elem);
        if (!!logical_name)
            return logical_name;

        return "";
    },

    portal6GroupBoxName: function (elem) {
        var name = elem.getAttribute("name");
        if (!name)
            return null;
        var Element_group = document.getElementsByName(name);
        if (Element_group != null && Element_group.length > 0) {
            var tmp = SAPUtils.getLabel(Element_group[0]);
            if (tmp.length > 0) {
                return tmp;
            }
        }
        
        return null;
    },

    ICWCGroupBoxName: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_RADIOGROUP))
            return SAPUtils.getICWCTableColumnName(elem);

        return null;
    },

    getICWCTableColumnName: function (elem)//not completed
    {
        var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE);
        if (container == null)
            return null;

        //search under the parent element for a title element
        var NodeElements = SapConfigurationUtil.filterCollection(container, SAP_SPECIFIER_ENUM.SAP_ICWC_TABLE_TITLE);
        //in order to find the title we use the x parameter in the element button, so we
        //can find in the title row, which is not in the same table the corresponding title

        return null;
    },

    portalLightSpeedGroupBoxName: function (elem) {
        if (elem.id == null || document == null)
            return null;

        //we remove from the element id characters from the end and leave characters
        // before the two last points from the end    
        var id_tmp = elem.id.slice(0, elem.id.lastIndexOf("."));
        id_tmp = id_tmp.slice(0, id_tmp.lastIndexOf("."));

        var labelsVector = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_LABEL);
        labelsVector.forEach(member => {
            if (member.id != null && (member.id.indexOf(id_tmp) != -1)) {
                //we found the RadioGroup label - so we take it's name
                if ((member.innerText != null) && (member.innerText.length > 0)) {
                    return member.innerText.trim();
                }
            }
        })

        // added for new design of new portal - the groupBox name is found in the 
        // header of the containing TABLE
        var radioGroupContainer = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_CONTAINER);
        if (radioGroupContainer != null) {
            var radioGroupHeader = SapConfigurationUtil.getElementOfCollection(radioGroupHeader, SAP_SPECIFIER_ENUM.SAPSP_RADIOGROUP_HEADER);
            if (radioGroupHeader != null) {
                if ((radioGroupHeader.innerText != null) && (radioGroupHeader.innerText.length > 0)) {
                    return radioGroupHeader.innerText.trim();
                }
            }
        }

        return null;
    },

    CRMGroupBoxName: function (elem) {
        var tr = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_ROW);
        if (tr != null) {
            var labelElements = SapConfigurationUtil.filterCollection(tr, SAP_SPECIFIER_ENUM.SAP_CRM_LABEL_TESTMODE);
            if (labelElements != null && labelElements.length > 0) {
                if ((labelElements[0].innerText != null) && (labelElements[0].innerText.length > 0)) {
                    return labelElements[0].innerText.trim();
                }
            }
        }
        return null;
    },

    getNameBySourceIndex:function(elem) {
        var sourceIndex = SAPUtils.getSourceIndex(elem);
        if (sourceIndex < 0)
            return "";

        var collection = document.getElementsByTagName("*");
        var prevElement = null;
        for (let i = sourceIndex; i > 0; i--) {
            prevElement = collection[i];
            if (prevElement == null ||
                !SapConfigurationUtil.isElementOfSpecifier(prevElement, SAP_SPECIFIER_ENUM.SAPSP_SAP_GROUPBOXHEADER))
                continue;

            // we found the element we were looking for
            return prevElement.innerText;
        }

        return "";
    },

    //https://docs.microsoft.com/en-us/previous-versions/hh870401(v%3Dvs.85)
    // return the ordinal position
    getSourceIndex:function(elem) {
        var collection = document.getElementsByTagName("*");
        for (let i = 0; i < collection.length; i++) {
            if (collection[i] == elem)
                return i;
        }
        return -1;
    },
    
    findElementRecursive: function (elem, flags) {
        //	TIME_THIS_SCOPE(FindElementRecursive);

        var FramesDocumentVector = SapConfigurationUtil.GetFramesFromDocument(elem);

        if (FramesDocumentVector != null) {
            for (var i = 0; i < FramesDocumentVector.length; i++) {
                var spElement = SapConfigurationUtil.findElement(FramesDocumentVector[i], flags)
                if (!!spElement)
                    return spElement;
            }
        }

        return null;
    },
    
    findElementsRecursive: function (elem, flags) {
        var FrameDocuments = SapConfigurationUtil.GetFramesFromDocument(elem);
        var elements = [];
        if (FrameDocuments != null) {
            for (var i = 0; i < FrameDocuments.length; i++) {
                var spElementCollection = FrameDocuments[i].getElementsByTagName('*');
                if (!!spElementCollection)
                    elements.concat(SapConfigurationUtil.filterCollection(spElementCollection, flags));
            }
        }

        return elements;
    },

    isHidden: function (elem) {
        if (elem == null)
            return false;
        var value;
        try {
            var propName = "clientWidth";
            value = elem.getAttribute(propName);
            if (!Util.isNullOrUndefined(value)) {
                var intValue = parseInt(value);
                if (intValue == 0)
                    return true;
            }

            propName = "clientHeight";
            value = elem.getAttribute(propName);
            if (!Util.isNullOrUndefined(value)) {
                var intValue = parseInt(value);
                if (intValue == 0)
                    return true;
            }
        }
        catch (error) {
            this._logger.trace("isHidden throw an error: " + error);
            return true;
        }
        return false;
    },

    compareTextWithDropdownmenuitem: function (Text, vecItemElements, obj) {
        obj.spMenuElem = null;
        for (var i = 0; i < vecItemElements.length; i++) {
            if (this._IsCorrectItemPath(Text, vecItemElements[i])) {
                obj.spLastItem = vecItemElements[i];
                //get the sub-menu that this menu item points to.
                obj.spMenuElem = this._GetSubMenu(vecItemElements[i]);
                break;
            }
        }
    },

    findItemAndSubmenuByText: function (obj, strPath) {
        //get the menu item element that fits to the given path.
        var vecItemElements = this._GetMenuItems(obj.spMenuElem);
        SAPUtils.compareTextWithDropdownmenuitem.call(this, strPath, vecItemElements, obj);
        if (obj.spMenuElem == null && obj.spLastItem == null) {
            vecItemElements = this._GetMenuItems(document);//in case we are not able to find SubMenu
            SAPUtils.compareTextWithDropdownmenuitem.call(this, strPath, vecItemElements, obj);
        }
    },

    isWDADropDownMenuInOpenState: function (pElement) {
        if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU)) {
            //check if the menu is open.
            //if it is open, the <SPAN> parent element will have pixelTop style parameter > 0.
            var sapMenuElem = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_SECOND, 2)
            if (sapMenuElem == null)
                return false;
            var spanElem = sapMenuElem.parentElement;
            if (spanElem != null) {
                if (SapConfigurationUtil.isElementOfSpecifier(spanElem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_DROPDOWNMENU_ROOT))
                    return true;
            }
            var menuTop = spanElem.offsetTop;
            if (menuTop != null) {
                //In BEx technology, this menuTop might be 0
                return menuTop >= 0 || (menuTop > -7000 && menuTop < -4000);
            }
        }

        if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_ACTIVEITEM))
            return true;
        return false;
    },

    isWDADropDownMenuVisible: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_DROPDOWNMENU)) {
            //check if the menu is visible.
            //if it is visible, the <SPAN> parent element will have pixelTop style parameter > 0.
            var sapMenuElem = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_DROPDOWNMENU_SECOND, 1)
            if (!sapMenuElem)
                return false;

            var menuTop = -1;
            menuTop = sapMenuElem.parentElement.offsetTop;
            if (menuTop == 0) {
                // 0 means the style does not have pixelTop attribute.
                return SAPUtils.isHidden(elem);
            }

            return menuTop > 0;
        }
        return false;
    },

    findSearchButton: function (elemAO, isTableChild) {
        var items = document.getElementsByTagName("*");
        var buttons = SapConfigurationUtil.filterCollection(items, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER);
        if (buttons == null || buttons.length == 0)
            return null;
        if (buttons.length > 1) {
            var editId = elemAO._elem.id;
            if (editId) {
                for (var i = 0; i < buttons.length; i++) {
                    if (buttons[i].id && buttons[i].id.toLowerCase() == editId.toLowerCase() + "-btn") {
                        return content.kitsManager.createAO(buttons[i], elemAO._parentID);
                    }
                }
            }
        }
        var elem = SapConfigurationUtil.getElementOfCollection(items, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER_NWBC) ||
            SapConfigurationUtil.getElementOfCollection(items, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER);
        if (elem != null)
            return content.kitsManager.createAO(elem, elemAO._parentID);

        if (isTableChild) {
            elem = SapConfigurationUtil.getElementOfCollection(items, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_CONTAINER_TABLE);
            if (elem != null) {
                elem = SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_MATCHCODE_MAIN);
                if (elem != null)
                    return content.kitsManager.createAO(elem, elemAO._parentID);
            }
        }
    },

    getContainingRowNumber: function(elem) {
        var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_ICWC_ROW_NUMBER);
	    return SAPUtils.getRowNumber(container);;
    },

    getRowNumber: function(elem) {
        if (!elem)
            return null;

        var rr = elem.getAttribute("rr");
        var rrNum = parseInt(rr);
        return isNaN(rrNum) ? null : rrNum;
    },

    processOnEachPartOfTable: function (section, elementFunc) {
        var children = section.children;
        if (!children)
            return;

        SAPUtils.loopOnTableRowsCollection(children, elementFunc);
    },

    loopOnTableRowsCollection: function (rowsElementCollection, tableRowFunc) {
        if (!rowsElementCollection)
            return;

        SAPUtils.loopOnHtmlElementCollection(rowsElementCollection, function (element) {
            var rowElement = element;
            if (!rowElement || rowElement.tagName.toLowerCase() != "tr") {
                return;
            }
            tableRowFunc(rowElement);
        });
    },

    loopOnHtmlElementCollection(elementCollection, elementFunc) {
        if (!elementCollection)
            return;

        var numOfRows = elementCollection.length;
        if (numOfRows == 0)
            return;

        for (let i = 0; i < numOfRows; i++) {
            var element = elementCollection[i];
            if (!element) 
                continue;
			elementFunc(element);
		}
    },
    
    getAncestorAOForTag: function(ao, parentTagName) {
	    var element = ao._elem;
        while (element != NULL) {
            var parentElement = element.parentElement;
            if (parentElement) {
                var tagName = parentElement.tagName;
                if (tagName.toUpperCase() == parentTagName) {
                    return content.kitsManager.createAO(parentElement, ao._parentID);
                }
            }
            element = parentElement;
        }
        return null;
    },

    getTableIndex: function(ao) {
        if (!ao) 
            return null;
		return ao.GetAttrSync("table_index");
    },

    cleanTabs: function(str) {
        if (!str)
            return false;
        str.replace('\t', ' ');
        str.replace('\r', '');
        str.replace('\n', '');
        return str;
    },

    //For SAP_ICWC_CALENDAR2, its parent should matches SAP_ICWC_CALENDAR_PARENT otherwise it will not be regarded as SAPCalendar.
    isCalendarByParent: function (elem) {
        if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR2)) {
            return (SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR2_PARENT, 4) != null
                || SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_ICWC_CALENDAR2_PARENT2, 5) != null)
        }
        return false;
    },

    getRectangle: function(element) {
        if (element == null) 
            return null;
        
        if (element.getBoundingClientRect) {
            return element.getBoundingClientRect();
        }

        return null;
    },

    isTopNavigationBarInPage: function () {
        if (document.documentElement == null)
            return false;

        var PortalInPage = SapConfigurationUtil.filterCollection(document.documentElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTABCONTAINER);

        if (SAPUtils.findElementRecursive(document.documentElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTABCONTAINER) != null
            || (PortalInPage.length > 0))
            return true;

        return false;
    },

    fixLogicalName: function (name) {
        if (!name)
            return "";
        if (name.indexOf("&nbsp") != -1)
            return "";
        return Util.cleanTextProperty(name).trim();
    },
	
    //chrome hasn't loaded all the dom structure	
    isSAPPortalInPage: function () {
        if (document == null)
            return false;

        var title = document.getElementsByTagName('title');
        if (title.length <= 0)
            return false;
        else {
            for (var i = 0; i < title.length; i++) {
                if (title[i].innerText == null)
                    continue;
                if (title[i].innerText.toLowerCase().indexOf('sap') >= 0 && title[i].innerText.toLowerCase().indexOf('portal') >= 0)
                    return true;
            }
        }
        return false;
    },

    updatePageWithSAPPortal: function () {
        if (document.readyState == "complete")
            if (SAPUtils.isTopNavigationBarInPage())
                SAPPortalConnectorContent.Merge.call(this);
            else
                SAPPortalConnectorContent.RollBack.call(this);
        else
            setTimeout(function () { SAPUtils.updatePageWithSAPPortal.call(this); }, 1000);//loading state
    },

    convertToZeroBase: function (index) {
        if (index == null)
            return -1;

        return index - 1;
    },

    convertToOneBase: function (index) {
        if (index == null)
            return -1;

        return index + 1;
    },

    updateRtidWithSAPPortal: function () {
        //updat RTID of SAPPortal while recording
        this.getID = function () {
            var obj_id = Util.shallowObjectClone(this._parentID);
            obj_id.object = null;
            obj_id.frame = -1;
            return obj_id;
        };
    },

    forwardQueryToPresentationElement: function (ao, attribute) {
        // Some objects are displayed using different elements and the real element isn't visible (off the screen)
        // For these objects we need to give information about the location of the visible object not the real one.
        // E.g. WebDynpro check-box.
        var id = ao._elem.id;
        if (!!id) {
            var visibleElem = document.getElementById(id + '-img');
            if (visibleElem) {
                var visibleAo = WebKit.createAO(visibleElem, ao._parentID);
                if (visibleAo) {
                    return visibleAo.GetAttrSync(attribute);
                }
            }
        }
        return null;
    },

    forwardDimensionQuery: function(ao, attribute) {
        // We can't tell by the original Query if we need to fix it so check if Y is positive
        var rect = ao.GetAttrSync("rect");
        if (rect.top > 0) {
            return CommonBehavior._attrs[attribute].call(ao);
        }

        var value = SAPUtils.forwardQueryToPresentationElement(ao, attribute);

        // Since the presentation element is smaller than the real element enlarge the value
        if (typeof value === 'number') {
            return value + (SAPUtils.fixPresentationSize * 2);;
        }
        
        return null;
    },

    replaceNbspToSpace: function (value) {
        if (!value)
            return "";
        return value.replace(/\xa0/g, ' '); // replace "&nbsp;" with ' '
    },
};

var SAPDummyBehavior =  {
    _eventHandler: function (recorder, ev) {
        //SAPDummyBehavior records nothing for any event and let other add-in do not handle this event as well.
        return true;
    },
};