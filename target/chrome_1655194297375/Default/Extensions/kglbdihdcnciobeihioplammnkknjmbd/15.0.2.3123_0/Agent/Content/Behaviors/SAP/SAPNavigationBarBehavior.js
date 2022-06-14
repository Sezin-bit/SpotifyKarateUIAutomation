var SAPNavigationBarForPortalBehavior = {
    m_MaximizeButtonDesc: "DetailedNavBar_Restorer",//SAP_SPECIFIER_ENUM is undefined, why?
    m_MinimizeButtonDesc: "DetailedNavBar_Minimizer",
    m_MinimalDIVDesc: "DetailedNavBar_MinDiv",
    _micclass: ["SAPDetailedNavigationBar"],
    _attrs: {
        "micclass": function () {
            return "SAPDetailedNavigationBar";
        },

        "sap maxbutton id": function () {
            var pBody = this.getBodyElement(this._elem);
            if (pBody != null) {
                var pMaximizeObj = SapConfigurationUtil.getElementOfCollection(pBody, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_RESTORER);
                if (pMaximizeObj != null) {
                    var pGenItemObj = new AO(pMaximizeObj, this.getID());
                    if (pGenItemObj)
                        return pGenItemObj.getID();
                }
            }
        },

        "sap minbutton id": function () {
            var pBody = this.getBodyElement(this._elem);
            if (pBody != null) {
                var pMinimizeObj = SapConfigurationUtil.getElementOfCollection(pBody, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_MINIMIZER);
                if (pMinimizeObj != null) {
                    var pGenItemObj = new AO(pMinimizeObj, this.getID());
                    if (pGenItemObj)
                        return pGenItemObj.getID();
                }
            }
        },

        "selectednode": function () {
            var NodeElements;
            NodeElements = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODE);
            var selectedElem = SapConfigurationUtil.getItemContainingSpecifierText(NodeElements, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_HIGHLIGHTED);
            if (!!selectedElem)
                return selectedElem.outerHTML.trim();

            return null;
        },
    },
    _helpers: {
        isObjSpyable: function () {
            return false;
        },
        getRelatedNodeElement: function (pElement) {
            //Don't record expand/collapse and hide/show operations
            if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_RESTORER) ||
                SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_MINIMIZER)) {
                return null;
            }

            var pTmpElement = pElement;
            while (pTmpElement != null) {
                if (pTmpElement.parentElement != null) {
                    var tagName = pTmpElement.parentElement.tagName;
                    if (tagName == "DIV" && !SapConfigurationUtil.isElementOfSpecifier(pTmpElement.pParentElement, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODEINNERDIV)) {
                        return pTmpElement.parentElement;
                    }
                }
                pTmpElement = pTmpElement.parentElement;
            }
            return null;
        },
        getRecordedPath: function (pElement) {
            var Path = "";
            if (pElement == null || pElement.parentElement == null)
                return false;

            if (SapConfigurationUtil.isElementOfSpecifier(pElement.parentElement, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVIGATIONTREE_MAIN)) {
                //Insert node text to path
                Path += pElement.innerText.trimLeft(); //trim leading space for portal7.3
                return Path;
            }

            var spPrevDOMSibling = pElement.parentElement.previousSibling;
            Path = SAPNavigationBarForPortalBehavior._helpers.getRecordedPath.call(this, spPrevDOMSibling);

            //Insert node text to path
            var bsNodeText = SAPNavigationBarForPortalBehavior._helpers.getPathItemText.call(this, pElement);
            if (bsNodeText.length > 0)
                Path = Path + ";" + bsNodeText;

            return Path;
        },
        getPathItemText: function (elem) {
            return elem.innerText.trimLeft();
        },
        getPathStatus: function (msg) {
            var lPathIdx = 0;
            if (!msg || !msg._data["sap path"])
                return;
            msg.status = "ERROR";
            var pPath = msg._data["sap path"];
            if (typeof (pPath) == "string")
                pPath = pPath.split();
            else
                pPath = pPath[0];

            var obj = this.getLastNodeInPath(pPath, lPathIdx, this._elem);
            var pNode = obj.pNode;
            var index = obj.lPathIdx;

            // start inserting the gathered information
            if (pNode == null) {
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                return;
            }

            msg._data["sap path index"] = index;

            if (index == pPath.length)//last item
                msg._data["state"] = this.nodeState(pNode);
            else
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;//may be NOTFOUND?

            var pNodeLink = this.getNodeLink(pNode);
            // we have to change parent object for strip's item to avoid get wrong id
            // because SetIdByParentObj is called in the object constructor
            if (pNodeLink != null)
                pGenItemObj = content.kitsManager.createAO(pNodeLink, this._parentID);

            if (pGenItemObj != null) {
                if (msg._data.hasOwnProperty("inner cell select id"))
                    msg._data["inner cell select id"] = pGenItemObj.getID();

                if (msg._data.hasOwnProperty("sap expand id")) {
                    var result = this.getSubTreeExpandIcon(pNode);
                    if (result != null) {
                        var pGenIconObj = content.kitsManager.createAO(result, this._parentID);
                        msg._data["sap expand id"] = pGenIconObj.getID();
                    }
                }
            }
            msg.status = "OK";
            return;
        },
        nodeState: function (pNode) {
            var pFolderIcon = this.getNodeFolderIcon(pNode);
            if (pFolderIcon == null)
                return SAP_NODESTATE_ENUM.SAP_LEAF; // fallback - assume it is a leaf

            if (SapConfigurationUtil.isElementOfSpecifier(pFolderIcon, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODEOPENFOLDER))
                return SAP_NODESTATE_ENUM.SAP_NODE_OPENED;

            if (SapConfigurationUtil.isElementOfSpecifier(pFolderIcon, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODECLOSEDFOLDER))
                return SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;

            return SAP_NODESTATE_ENUM.SAP_LEAF; //not exits open/close icon 
        },
        getNodeFolderIcon: function (pNode) {
            if (pNode == null) return null;
            //Get the first child - should be of type <NOBR>
            if (pNode.firstElementChild == null)
                return null;
            return pNode.firstElementChild.firstElementChild;
        },
        getSubTreeExpandIcon: function (pNode) {
            if (pNode == null) return null;

            var pAllChildren = pNode.getElementsByTagName('*');

            if (pAllChildren == null) return 0;

            return SapConfigurationUtil.getElementOfCollection(pAllChildren, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODEFOLDERICON);
        },
        getNodeLink: function (pNode) {
            if (pNode == null) return null;

            var pAllChildren = pNode.getElementsByTagName('*');
            if (pAllChildren == null) return null;

            return SapConfigurationUtil.getElementOfCollection(pAllChildren, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODELINK);
        },
        getLastNodeInPath: function (Path, lPathIdx, pNode) {
            var obj = { lPathIdx: lPathIdx, pNode: pNode };
            var size = Path.length;
            var pCurrentNode = null;
            var pSubTreeContainer = obj.pNode;

            while (obj.lPathIdx < size) {
                var bsText = Path[obj.lPathIdx];

                //search the item
                if (this.isSubTreeLoading(pSubTreeContainer))
                    return obj;

                pCurrentNode = this.getSubTreeNode(pSubTreeContainer, bsText);

                // if the next level is not found then we return the last one
                if (pCurrentNode == null)
                    return obj;

                obj.lPathIdx++;

                // update the last known replay element
                obj.pNode = pCurrentNode;
                // return if the node is closed
                if (this.nodeState(pCurrentNode) == 2)
                    return obj;

                pSubTreeContainer = this.getNodeSubTreeContainer(pCurrentNode);
            }

            return obj;
        },
        getSubTreeNode: function (pNodesContainer, bsText) {
            var elVector = this.getNodes(pNodesContainer);
            var index = -1;
            if ((bsText.length > 1) && (bsText.indexOf("#") == 0)) {
                index = bsText.substr(1);
            }

            if (!/^\d+$/.test(index)) // name replay
            {
                for (var i = 0; i < elVector.length; i++) {
                    var bstrText = this.getPathItemText(elVector[i]);
                    if (bstrText.length == 0) {
                        continue;
                    }
                    if (bsText == bstrText)
                        return elVector[i];
                }
            }
            else // index replay 
            {
                if (index > elVector.length) return null;
                return elVector[index - 1];
            }

            return null;
        },
        isSubTreeLoading: function (pNodesContainer) {
            var elVector = this.getNodes(pNodesContainer);
            if (elVector.length == 0)
                return true;

            return SapConfigurationUtil.isElementOfSpecifier(elVector[0], SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODELOADING)
        },
        getNodes: function (pNodesContainer) {
            if (pNodesContainer == null) return null;

            return SapConfigurationUtil.filterCollection(pNodesContainer, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODE);
        },
        getNodeSubTreeContainer: function (pCurrentNode) {
            if (pCurrentNode == null) return null;

            var pSubTreeContainer = pCurrentNode.nextSibling;
            if (pSubTreeContainer == null) return null;

            if (!SapConfigurationUtil.isElementOfSpecifier(pSubTreeContainer, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODESUBTREE))
                return null;
            return pSubTreeContainer;
        },
        isVisible: function () {
            var pBody = this.getBodyElement(this._elem);
            if (!pBody) return 0;

            var pMinimizeDiv = SapConfigurationUtil.getElementOfCollection(pBody, SAPNavigationBarBehavior.m_MinimalDIVDesc);
            if (pMinimizeDiv != null) {
                //get the display attribute
                var style = pMinimizeDiv.getAttribute("style");
                if (style != null) {
                    if (style == "none")
                        return 0;
                    else
                        return 1;
                }
                else	//did not find the style at all - default is true (?).
                    return 1;
                return 1;
            }
            return 0;
        },
    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this.getPathStatus(msg);
            resultCallback(msg);
        },
    },

    _eventHandler: function (recorder, ev) {
        if (ev.type == "dblclick")
            return false;

        SAPUtils.updateRtidWithSAPPortal.call(this);
        var params = { event: 'on' + ev.type };
        if (!SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAPSP_DETAILEDNAVBAR_NODELINK)) {
            if (ev.type != "contextmenu")
                return false;

        }

        var spNodeElement = SAPNavigationBarForPortalBehavior._helpers.getRelatedNodeElement.call(this, ev.target);
        if (Util.isNullOrUndefined(spNodeElement))
            return false;
        params["sap path"] = SAPNavigationBarForPortalBehavior._helpers.getRecordedPath.call(this, spNodeElement);

        recorder.sendRecordEvent(this, ev, params);
        return true;
    }
}

var SAPPortal73DetailedNavBarNodeLinkBehavior = {
    _micclass: ["SAPPortal73DetailedNavBarNodeLink", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPPortal73DetailedNavBarNodeLink";
        },
    }
}

var SAPPortal73TopNavigationBarTabBehavior = {
    _micclass: ["SAPPortal73TopNavigationBarTab", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPPortal73TopNavigationBarTab";
        },
    }
}

var SAPPortal73DetailedNavBarNodeFolderIconBehavior = {
    _micclass: ["SAPPortal73DetailedNavBarNodeFolderIcon", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPPortal73DetailedNavBarNodeFolderIcon";
        },
    }
}

var SAPNavigationBarBaseBehavior = {
    _micclass: ["SAPNavigationBar", "WebElement", "StdObject"],
    _attrs: {
        "visible": function () {
            return this.isVisible();
        },
        "sap loading state": function () {
            return 0;
        },
        "items count": function () {
            return 0;
        },
        "all items": function () {
            return "";
        },
        "highlight source index": function () {
            var pBody = this.getBodyElement(this._elem);
            if (pBody != NULL) {
                //how to deal with sourceid
            }
        },
        "sap web component name": function () {
            return SAPUtils.getComponentName(this._elem, this);
        },
        "sap web component runtime ID": function () {
            return SAPUtils.getComponentRuntimeID(this._elem, this);
        },
    },
    _helpers: {
        isVisible: function () {
            var pBody = this.getBodyElement(this._elem);
            if (!pBody) return 0;

            var pMinimizeDiv = SapConfigurationUtil.getElementOfCollection(pBody, SAPNavigationBarBehavior.m_MinimalDIVDesc);
            if (pMinimizeDiv != null && pMinimizeDiv.outerHTML.indexOf("DISPLAY: none") >= 0)
                return 1;
            return 0;
        },
        getBodyElement: function (elem) {
            return elem.ownerDocument.getElementsByTagName('body')[0];
        },
    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this.getPathStatus(msg);
            resultCallback(msg);
        },

    },

    _eventHandler: function (recorder, ev) {
        if (ev.type == "dblclick")
            return false;

        var params = { event: 'on' + ev.type };
        var minimizebutton = "";
        var maximizebutton = "";

        for (var i = 0; i < this._behaviors.length; i++) {
            if (!Util.isNullOrUndefined(this._behaviors[i]["m_MinimizeButtonDesc"]))
                minimizebutton = this._behaviors[i]["m_MinimizeButtonDesc"];
            if (!Util.isNullOrUndefined(this._behaviors[i]["m_MaximizeButtonDesc"]))
                maximizebutton = this._behaviors[i]["m_MaximizeButtonDesc"];
        }

        if (SapConfigurationUtil.isElementOfSpecifier(ev.target, minimizebutton)) {
            params["sap minbutton id"] = "";// Inform that the minimize button was pressed
        }
        else if (SapConfigurationUtil.isElementOfSpecifier(ev.target, maximizebutton)) {
            params["sap maxbutton id"] = "";// Inform that the minimize button was pressed
        }
        else {
            var spNodeElement = this.getRelatedNodeElement(ev.target);
            if (Util.isNullOrUndefined(spNodeElement))
                return false;
            params["sap path"] = this.getRecordedPath(spNodeElement);
        }

        recorder.sendRecordEvent(this, ev, params);
        return true;
    }

};

var SAPNavigationBarBehavior = {//inherited from SAPNavigationBarBaseBehavior
    m_MaximizeButtonDesc: "NavBar_Restorer",
    m_MinimizeButtonDesc: "NavBar_Minimizer",
    m_MinimalDIVDesc: "NavBar_MinDiv",
    _micclass: ["SAPNavigationBar", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPNavigationBar";
        },
        "logical name": function () {
            return "SAPNavigationBar";
        },
        "sap maxbutton id": function () {
            var pBody = this.getBodyElement(this._elem);
            if (pBody != null) {
                var pMaximizeObj = SapConfigurationUtil.getElementOfCollection(pBody, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_RESTORER);
                if (pMaximizeObj != null) {
                    var pGenItemObj = new AO(pMaximizeObj, this.getID());
                    if (pGenItemObj)
                        return pGenItemObj.getID();
                }
            }
        },

        "sap minbutton id": function () {
            var pBody = this.getBodyElement(this._elem);
            if (pBody != null) {
                var pMinimizeObj = SapConfigurationUtil.getElementOfCollection(pBody, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_MINIMIZER);
                if (pMinimizeObj != null) {
                    var pGenItemObj = new AO(pMinimizeObj, this.getID());
                    if (pGenItemObj)
                        return pGenItemObj.getID();
                }
            }
        },

        "items count": function () {
            // Return the number of tabs in the tab strip
            return this.getStrips();
        },

        "all items": function () {
            return this.stripNames();
        },

        "sap loading state": function () {
            var pStrip = getActiveStripElement();
            var pDoc = this.getStripDocument(pStrip);
            var pBody;
            if (pDoc != null && pDoc.getElementsByTagName('body') != null)
                pBody = pDoc.getElementsByTagName('body')[0];

            if (pBody != null) {
                var pLoadingImage = SapConfigurationUtil.getElementOfCollection(pBody, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_LOADING);
                if (pLoadingImage != null)
                    return 1;// loading;
            }
            return 0;// ready;
        },

    },
    _helpers: {
        getRelatedNodeElement: function (pElement) {
            var pBody = this.getBodyElement(pElement);

            if (pBody != null && SapConfigurationUtil.isElementOfSpecifier(pBody, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_MAINCONTAINER))
                return null;

            var spNodeElement;
            if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_NODEICON)) {
                spNodeElement = this.getAttachedNode(pElement);
            }
            else if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_NODE)) {
                spNodeElement = pElement;
            }

            return spNodeElement;
        },
        getSubTreeExpandIcon: function (pNode) {
            if (pNode.parentElement == null)
                return { status: false, pPlus: true, pIcon: null };

            var pExpandIconContainer = SapConfigurationUtil.getElementOfCollection(pNode.parentElement, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_ICONPLACE);
            if (pExpandIconContainer == null)
                return { status: false, pPlus: true, pIcon: null };

            var pIcon = SapConfigurationUtil.getElementOfCollection(pExpandIconContainer, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_MINUSICON);
            if (pIcon != null) {
                return { status: true, pPlus: false, pIcon: pIcon };
            }
            pIcon = SapConfigurationUtil.getElementOfCollection(pExpandIconContainer, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_PLUSICON);
            if (pIcon != null) {
                return { status: true, pPlus: true, pIcon: pIcon };
            }

            return { status: false, pPlus: true, pIcon: pIcon };
        },
        isVisible: function () {
            var pBody = this.getBodyElement(this._elem);
            if (!pBody) return 0;

            var pMinimizeDiv = SapConfigurationUtil.getElementOfCollection(pBody, SAPNavigationBarBehavior.m_MinimalDIVDesc);
            if (pMinimizeDiv != null && pMinimizeDiv.outerHTML.indexOf("DISPLAY: none") >= 0)
                return 1;
            return 0;
        },
        getBodyElement: function (elem) {
            return elem.ownerDocument.getElementsByTagName('body')[0];
        },
        getStrips: function () {
            var elVector = SapConfigurationUtil.filterCollection(this.getBodyElement(this._elem), SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_STRIP);
            return elVector.length;
        },
        stripNames: function () {
            var elVector = SapConfigurationUtil.filterCollection(this.getBodyElement(this._elem), SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_STRIP);
            var namesStr = "";
            for (var i = 0; i < elVector.length; i++) {
                var pStripTxt = SapConfigurationUtil.getElementOfCollection(this.getTableElement(elVector[i]), SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_STRIPTEXT);
                if (pStripTxt != null) {
                    pStripTxt.innerText
                    if (namesStr.length > 0)
                        namesStr += ";";
                    namesStr += pStripTxt.innerText;
                }
            }
            return namesStr;
        },
        getTableElement: function (pElement) {
            var pTmpElement = pElement;
            while (pTmpElement != null) {
                if (pTmpElement.parentElement != null) {
                    if (pTmpElement.parentElement.tagName == "TABLE")
                        return pTmpElement.parentElement;
                }
                pTmpElement = pTmpElement.parentElement;
            }
            return null;
        },
        getActiveStripElement: function () {
            var parentFrame = ao.getParent();
            if (parentFrame == null)
                return null;

            var pDoc = parentFrame._elem.ownerDocument;
            if (pDoc == null)
                return null;

            var pCollection = pDoc.getElementsByTagName('*');
            return SapConfigurationUtil.getElementOfCollection(pCollection, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_ACTIVESTRIP);
        },
        getStripDocument: function () {
            return this._elem.ownerDocument;
        },
        getRecordedPath: function (pElement) {// function to get path 
            var Path = "";
            var pStrip = this.getActiveStripElement();

            if (pStrip == null)
                return Path;

            var pStripTxt = SapConfigurationUtil.getElementOfCollection(this.getTableElement(pStrip), SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_STRIPTEXT);

            if (pStripTxt != null) {
                Path += pStripTxt.innerText;// Strip the first part of the path  
                Path += this.getSubTreePath(pElement);      // now add all nodes from the strip's subtree
                Path += pElement.innerText;// add text of clicked node itself to the end of the path
            }

            return Path;
        },
        getSubTreePath: function (pElement) {
            var Path = "";
            if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_NODE)) {
                var pTable = this.getTableElement(pElement);
                var pParentTable = this.getTableElement(pTable);
                var elVector = SapConfigurationUtil.filterCollection(pParentTable, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_NODE);
                for (var i = 0; i < elVector.length; i++) {
                    Value = elVector[i].getAttribute("XMLID") + "Items";// XMLID of Node is XXX (some name) and related table id  XXXItems
                    if (pTable.id == Value) {
                        Path += this.getSubTreePath(elVector[i]);      // recursive call to get all parent nodes from bottom to top  
                        Path += elVector[i].innerText;  // we add the text AFTER recursive call to get right order of nodes from top to bottom
                    }
                }
            }
            return Path;
        },
        getMainElement: function (pDoc) {
            if (pDoc == null)
                return null;
            var pCol = pDoc.getElementsByTagName('*');
            return SapConfigurationUtil.getElementOfCollection(pCol, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_MAIN);
        },
        getAttachedNode: function (pElement) {
            var pTmpElement = pElement;
            while (pTmpElement != null) {
                if (pTmpElement.parentElement != null) {
                    if (pTmpElement.parentElement.tagName == "TR") {
                        return SapConfigurationUtil.getElementOfCollection(pTmpElement.parentElement, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_NODE);
                    }
                }
                pTmpElement = pTmpElement.parentElement;
            }
            return null;
        },
        getPathStatus: function (msg) {
            var lPathIdx = 0;
            if (!msg || !msg._data["sap path"])
                return;
            msg.status = "ERROR";

            var index = -1;
            if (bsText.length > 1 && bsText.indexOf("#") == 0)
                index = parseInt(bsText.substr(1), 10);

            var pStrip;
            if (index == -1)
                pStrip = this.getStripByText(bsText);
            else
                pStrip = this.getStripByIndex(index - 1); // user index 1-based

            if (pStrip == null)
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
            else {
                lPathIdx = 1;
                var size = msg._data["sap path"].length;
                var pActiveStrip = this.getActiveStripElement();
                if (pActiveStrip == null)		// no active item
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_ALL_CLOSED;
                else if (pActiveStrip != pStrip)	// the active is different from the desire item
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;
                else if (size == 1)		// this is the entire path
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_OPENED;
                else	// the needed strip is opened and the path is more then one long
                {		//  continue the checks inside subtree 
                    this.getSubTreePathStatus(msg, pStrip, 1); // always start from 2 item in path
                    return;
                }
            }
            return;
            //this part of code will be completed until the related AUT appear 
        },
        getStripByText: function (Text) {
            var StripCount = this.getStrips();
            for (var i = 0; i < StripCount; i++) {
                var pStripTxt = SapConfigurationUtil.getElementOfCollection(this.getTableElement(elStripVector[i]), SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_STRIPTEXT);

                if (pStripTxt == null)
                    continue;
                if (!pStripTxt.innerText)
                    continue;
                if (Text == pStripTxt.innerText)
                    return elStripVector[i];
            }
            return null;
        },
        getStripByIndex: function (index) {
            var StripCount = this.getStrips();
            if (index >= 0 && StripCount > index)
                return SapConfigurationUtil.getElementOfCollection(this.getTableElement(elStripVector[index]), SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_STRIPTEXT);

            return null;
        },
        getSubTreePathStatus: function (msg, pStrip, lPathIdx) {
            msg.status = "ERROR";
            var pPath = msg._data["sap path"];
            if (pPath == null)
                return;
            if (typeof (pPath) == "string")
                pPath = pPath.split();
            else
                pPath = pPath[0];

            var pFrameDocument = this.getStripDocument();

            var obj = this.getLastNodeInPath(pFrameDocument, pPath, lPathIdx);
            var pNode = obj.pNode;
            var index = obj.lPathIdx;

            // start inserting the gathered information
            msg._data["sap path index"] = index;
            if (pNode == null) {
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                return;
            }

            if (index == pPath.length)//last item
                msg._data["state"] = this.nodeState(pNode);
            else
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;//may be NOTFOUND?

            // we have to change parent object for strip's item to avoid get wrong id
            // because SetIdByParentObj is called in the object constructor
            var pPageObj = this.getParent();
            if (pPageObj != null && (Util.getMicClass(pPageObj) != "Page")) {
                pPageObj = pPageObj.getParent();
            }

            var pGenItemObj;
            if (pPageObj != null)
                pGenItemObj = content.kitsManager.createAO(elem, pPageObj);

            if (pGenItemObj != null) {
                if (msg._data.hasOwnProperty("inner cell select id"))
                    msg._data["inner cell select id"] = pGenItemObj.getID();

                if (msg._data.hasOwnProperty("sap expand id")) {
                    var result = this.getSubTreeExpandIcon(pNode);
                    if (result != null && result.status) {
                        var pGenIconObj = content.kitsManager.createAO(result.pIcon, pPageObj);
                        msg._data["sap expand id"] = pGenIconObj.getID();
                    }
                }
            }
            msg.status = "OK";
            return;

        },
        nodeState: function (pNode) {
            var result = this.getSubTreeExpandIcon(pNode);
            if (result.status) {
                if (result.pPlus)
                    return SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;
                else
                    return SAP_NODESTATE_ENUM.SAP_NODE_OPENED;
            }
            else
                return SAP_NODESTATE_ENUM.SAP_LEAF; // not exits open/close icon  
        },
        getLastNodeInPath: function (pFrameDocument, pPath, lPathIdx) {
            var lSize = pPath.length;

            var pCurrentNode;
            var pNodeContainer = FindFirstLevelNodeContainer(pFrameDocument);
            var pNode;
            for (; lPathIdx < lSize;) {
                var bsText = pPath[lPathIdx];
                var index = -1;

                if (bsText.length > 1 && (bsText.indexOf("#") == 0)) {
                    index = parseInt(selectionText.substr(1), 10);
                }

                // now  we search the item in the popdown
                if (index == -1)
                    pCurrentNode = this.getSubTreeNodeByText(pNodeContainer, bsText);
                else
                    pCurrentNode = this.getSubTreeNodeByIndex(pNodeContainer, index - 1); // user index 1-based

                // if the next level is not found then we return the last one
                if (pCurrentNode == null)
                    return pNode;

                // update the last known replay element
                pNode = pCurrentNode;
                pNodeContainer = this.findNodeContainer(pCurrentNode, pNodeContainer);

                lPathIdx++;
            } // for
            return { pNode: pNode, lPathIdx: lPathIdx };
        },
        findNodeContainer: function (pNode, pNodesContainer) {
            var vtValue = pNode.getAttribute("XMLID");
            var elNodesContainer = SapConfigurationUtil.filterCollection(pNodesContainer, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_NODECONTAINER);
            for (var i = 0; i < elNodesContainer.length; i++) {
                var id = elNodesContainer[i].getAttribute("id");
                if (id.indexOf(vtValue) == 0)
                    return elNodesContainer[i];
            }
            return null;
        },
        findFirstLevelNodeContainer: function (pFrameDocument) {
            if (pFrameDocument.body == null)
                return null;

            var pNodesContainer = SapConfigurationUtil.getElementOfCollection(pFrameDocument.body, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_NODECONTAINER);

            while (pNodesContainer != null) {
                var pTable = this.getTableElement(pNodesContainer);
                if (pTable == null)
                    return pNodesContainer;

                var pRow = SapConfigurationUtil.getElementOfCollection(pTable, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_ROW);
                if (pRow != null) {
                    var pExpandIconContainer = SapConfigurationUtil.getElementOfCollection(pRow, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_ICONPLACE);
                    if (pExpandIconContainer != null)
                        pNodesContainer = pTable;
                    else
                        return pNodesContainer;
                }
                else
                    return pNodesContainer;
            }
            return null;
        },
        getNodes: function (pNodesContainer) {
            if (pNodesContainer == null)
                return null;

            return SapConfigurationUtil.filterCollection(pNodesContainer, SAP_SPECIFIER_ENUM.SAPSP_NAVBAR_NODE);
        },
        getSubTreeNodeByText: function (pNodesContainer, bsText) {
            var elVector = this.getNodes(pNodesContainer);
            for (var i = 0; i < elVector.length; i++) {
                if (bsText == elVector[i].innerText)
                    return elVector[i];
            }
            return null;
        },
        getSubTreeNodeByIndex: function (pNodesContainer, lIndex) {
            var elVector = this.getNodes(pNodesContainer);
            if (lIndex >= 0 && elVector.length > lIndex)
                return elVector[lIndex];
            return null;
        },

    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this.getPathStatus(msg);
            resultCallback(msg);
        },

    },

};

var SAPCRMNavigationBarBehavior = {//inherited from SAPNavigationBar
    _micclass: ["SAPNavigationBar", "WebElement", "StdObject"],
    _attrs: {
        "visible": function () {
            return this.isVisible();
        },
        "sap loading state": function () {
            return 0;
        },
        "crm object": function () {
            return true;
        },
        "sap maxbutton id": function () {
            if (!this.isVisible()) {
                var btn = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_OPEN_BTN);
                if (!!btn)
                    btn.click();
            }
        },
        "sap minbutton id": function () {
            if (this.isVisible()) {
                var btn = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_CLOSE_BTN);
                if (!!btn)
                    btn.click();
            }
        },
    },
    _helpers: {
        isVisible: function () {
            return SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_HIDDEN) ? 0 : 1;
        },
        getBodyElement: function (elem) {
            return elem.ownerDocument.getElementsByTagName('body')[0];
        },
        getPathStatus: function (msg) {
            var lPathIdx = 0;
            if (!msg || !msg._data["sap path"])
                return;
            msg.status = "ERROR";

            var pPath = msg._data["sap path"];
            if (typeof (pPath) == "string")
                pPath = pPath.split();
            else
                pPath = pPath[0];

            if ((pPath.length == 1) ||
                ((pPath.length == 2) && msg._data.hasOwnProperty("sap expand id")))
                lPathIdx = 0;
            else if (pPath.length == 2)
                lPathIdx = 1;

            var index = -1;
            if (pPath.length > 1 && pPath.indexOf("#") == 0)
                index = parseInt(pPath.substr(1), 10);

            var pStrip;
            if (index == -1)
                pStrip = this.getStripByText(pPath[lPathIdx], lPathIdx);
            else
                pStrip = this.getStripByIndex(index - 1, lPathIdx); // user index 1-based

            msg._data["state"] = (pStrip != null) ? SAP_NODESTATE_ENUM.SAP_NODE_OPENED : SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;


            if (pStrip != null) {
                // If succeeded we click on the item (in a 1-level path, or in a 2-level path
                // and after the expand icon was clicked
                if (msg._data.hasOwnProperty("inner cell select id"))
                    pStrip.click();

                // If succeeded we are in the expand stage (in a 2-level path)
                // click on the arrow
                if (msg._data.hasOwnProperty("sap expand id")) {
                    var pParent = SapConfigurationUtil.getContainerElement(pStrip, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_ITEM_CONTAINING_MENU);
                    if (pParent) {
                        var pArrow = SapConfigurationUtil.getElementOfCollection(pParent, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_ICON);
                        if (pArrow)
                            pArrow.click();
                    }
                }
            }

            msg.status = "OK";
            return;
        },
        getStripByText: function (Text, size) {
            var elStripVector = [];
            if (size == 0)
                elStripVector = this.getStripsInFirstLevel();// first item in path
            else if (size == 1)// second item in path //look in the opened UL only
                elStripVector = this.getStripsInSecondLevel();

            for (var i = 0; i < elStripVector.length; i++) {
                var pStripTxt = elStripVector[i];
                if (!pStripTxt)
                    continue;
                if (!pStripTxt.innerText)
                    continue;
                if (pStripTxt.innerText.length == 0)
                    continue;

                if (Text.trim() == pStripTxt.innerText.trim())
                    return elStripVector[i];
            }
            return null;
        },
        getStripByIndex: function (index, size) {
            var elStripVector = [];
            if (size == 0)
                elStripVector = this.getStripsInFirstLevel();// first item in path
            else if (size == 1)// second item in path //look in the opened UL only
                elStripVector = this.getStripsInSecondLevel();

            if (index >= 0 && elStripVector.length > index)
                return elStripVector[index];

            return null;
        },
        getStripsInFirstLevel: function () {
            var pNavBar = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR);
            var pNavBarMainMenu = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_MAIN_MENU);

            //only return LI which are direct children
            var elVector = [];
            var elMainMenuItemsVector = [];
            if (pNavBarMainMenu)
                elMainMenuItemsVector = SapConfigurationUtil.filterCollection(pNavBarMainMenu, SAP_SPECIFIER_ENUM.SAP_CRM_PLAIN_LI);
            if (elMainMenuItemsVector) {
                for (var i = 0; i < elMainMenuItemsVector.length; i++)
                    // <...>
                    //	<LI> <- pLI
                    //		<SPAN> <- pSpan
                    //			<A> <- pA
                    if (elMainMenuItemsVector[i].firstElementChild)
                        if (elMainMenuItemsVector[i].firstElementChild.firstElementChild)
                            elVector.push(elMainMenuItemsVector[i].firstElementChild.firstElementChild);
            }

            var elShortcutItemsVector = SapConfigurationUtil.filterCollection(pNavBar, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_SHORTCUT_ITEMS);
            if (elShortcutItemsVector) {
                for (var i = 0; i < elShortcutItemsVector.length; i++)
                    elVector.push(elShortcutItemsVector[i]);
            }
            return elVector;
        },
        getStripsInSecondLevel: function () {
            var pNavBar = SapConfigurationUtil.getContainerElement(this._elem, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR);
            var pNavBarOpenMenu = SapConfigurationUtil.getElementOfCollection(pNavBar, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_OPENED)
            var elVector = SapConfigurationUtil.filterCollection(pNavBarOpenMenu, SAP_SPECIFIER_ENUM.SAPSP_MENU_MENUBARITEM);
            if (elVector == null)
                return [];
            return elVector;
        },
        getRecordedPath: function (pElement) {
            var pElementContainer = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_ITEM_CONTAINING_MENU);
            var pathtext = "";
            if (pElementContainer &&
                // The following means that we are under a level 2 menu
                (SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAP_CRM_MENU_OPENED)) != null) {
                if (pElementContainer.firstElementChild)
                    pathtext += pElementContainer.firstElementChild.innerText + ";";           // Strip the first part of the path   
            }
            pathtext += pElement.innerText;
            return pathtext;   	// add text of clicked node itself to the end of the path
        },

    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this.getPathStatus(msg);
            resultCallback(msg);
        },

    },

    _eventHandler: function (recorder, ev) {
        if (ev.type == "dblclick" || SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_ICON))
            return false;

        var params = { event: 'on' + ev.type };
        if (SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_CLOSE_BTN))
            params["sap minbutton id"] = "";
        else if (SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAP_CRM_NAVIGATIONBAR_OPEN_BTN))
            params["sap maxbutton id"] = "";
        else
            params["sap path"] = this.getRecordedPath(ev.target);

        recorder.sendRecordEvent(this, ev, params);
        return true;
    }

};

var SAPWDANavigationBarBehavior = {//inherited from SAPNavigationBar
    _micclass: ["SAPNavigationBar", "WebElement", "StdObject"],
    _attrs: {
        "visible": function () {
            return this.isVisible();
        },
        "logical name": function () {
            return this.getLogicalName();
        },

        "wda object": function () {
            return true;
        },

    },
    _helpers: {
        isVisible: function () {
            return 1;
        },
        getLogicalName: function () {
            var pHeaderElement = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_HEADER);

            if (!pHeaderElement)
                return "";

            return pHeaderElement.innerText;
        },
        getRecordedPath: function (pElement) {
            return pElement.innerText; // add text of clicked node itself to the end of the path
        },
        getPathStatus: function (msg) {
            var lPathIdx = 0;
            if (!msg || !msg._data["sap path"])
                return;
            msg.status = "ERROR";

            var pPath = msg._data["sap path"];
            if (typeof (pPath) == "string")
                pPath = pPath.split();
            else
                pPath = pPath[0];
            lPathIdx = pPath.length;

            var index = -1;
            if (pPath.length > 1 && pPath.indexOf("#") == 0)
                index = parseInt(pPath.substr(1), 10);

            var pStrip;
            if (index == -1)
                pStrip = this.getStripByText(pPath[0], lPathIdx - 1);
            else
                pStrip = this.getStripByIndex(index - 1, lPathIdx); // user index 1-based

            msg._data["state"] = (pStrip != null) ? SAP_NODESTATE_ENUM.SAP_NODE_OPENED : SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;

            if (pStrip != null) {
                // If succeeded we click on the item 
                pStrip.click();
            }

            msg.status = "OK";
            return;
        },

        getStripByIndex: function (index, size) {
            var elStripVector = [];
            if (size == 0) // first item in path 
                elStripVector = GetStripsInFirstLevel();

            if (index >= 0 && elStripVector.length > index)
                return elStripVector[index];

            return null;
        },

        getStripByText: function (Text, size) {
            var elStripVector = [];
            elStripVector = this.getStripsInFirstLevel();

            for (var i = 0; i < elStripVector.length; i++) {
                var pStripTxt = elStripVector[i];
                if (!pStripTxt)
                    continue;
                if (!pStripTxt.innerText)
                    continue;
                if (pStripTxt.innerText == 0)
                    continue;

                if (Text.trim() == pStripTxt.innerText.trim())
                    return elStripVector[i];
            }
            return null;
        },
        getStripsInFirstLevel: function () {
            var elVector = [];
            var pNavBarMainMenu = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_VIEW_SWITCH);

            var elMainMenuItemsVector;
            var pCol;
            if (pNavBarMainMenu)
                pCol = pNavBarMainMenu.getElementsByTagName('*');

            elMainMenuItemsVector = SapConfigurationUtil.filterCollection(pCol, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_VIEW_SWITCH_ITEM);

            if (elMainMenuItemsVector) {
                for (var i = 0; i < elMainMenuItemsVector.length; i++)
                    elVector.push(elMainMenuItemsVector[i]);
            }

            if (this._elem) {
                // This code was chnaged to support a case where navigation bar contains more then one SAP_WDA_NAVIGATIONBAR_NAVIGATION_LIST
                // The problem with the original code was that the second SAP_WDA_NAVIGATIONBAR_NAVIGATION_LIST items were not recorded
                // So this code iterates on all the Navigation Bar SAP_WDA_NAVIGATIONBAR_NAVIGATION_LIST elements and map all of them
                var elNavigationListsVector = [];

                var elNavigationListsVector = SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_NAVIGATION_LIST);
                for (var j = 0; j < elNavigationListsVector.length; j++) {
                    var pNavBarNavigationList = elNavigationListsVector[j];
                    var elNavigationListItemsVector = SapConfigurationUtil.filterCollection(pNavBarNavigationList, SAP_SPECIFIER_ENUM.SAP_WDA_NAVIGATIONBAR_NAVIGATION_LIST_ITEM);

                    for (var h = 0; h < elNavigationListItemsVector.length; h++)
                        elVector.push(elNavigationListItemsVector[h]);
                }
            }
            return elVector;
        },

    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this.getPathStatus(msg);
            resultCallback(msg);
        },

    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPDropDownMenu.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        if (ev.type == "mouseup" || ev.type == "dblclick")
            return false;

        if (ev.type == "mousedown")
            ev.type = "click";

        var params = { event: 'on' + ev.type };
        params["sap path"] = this.getRecordedPath(ev.target);
        recorder.sendRecordEvent(this, ev, params);
        return true;
    }
};



var SAPICWCNavigationBarBehavior = {//inherited from SAPMenu  not completed, need SAPMenu/SAPMenubase
    _micclass: ["SAPNavigationBar", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPNavigationBar";
        },
        "visible": function () {
            return 1;
        },
        "logical name": function () {
            return "SAPNavigationBar";
        },
        "sap loading state": function () {
            return 0;
        },

    },
    _helpers: {
        IsICWCNavigationBar: function (spElement) {
            //Two conditions must be satisfied:
            //1. It should not contain any other "TABLE" elements in its hierarchy (i.e:
            //   It should be an innermost table).
            var pTableElements = spElement.getElementsByTagName('table');
            if (pTableElements != NULL) {
                if (pTableElements.length > 0)
                    return false;
            }

            //2. It should contain in its hierarchy at least one ICWC nav bar item,
            return SapConfigurationUtil.getElementOfCollection(spElement, SAP_SPECIFIER_ENUM.SAPSP_ICWC_NAVIGATIONBAR_ITEM) != null;
        },
        _GetSelectionStatus: function (msg) {
            /*SAP_NODE_OPENED = 1,
            SAP_NODE_CLOSED = 2,
            SAP_NODE_DISABLED = 3,
            SAP_NODE_NOTFOUND = 4,
            SAP_LEAF = 5,
            SAP_ALL_CLOSED = 6,
            SAP_NODE_HIDDEN = 7 */
            /*HRESULT hr = CSAPMenu:: GetPathStatus(pWebInfo);
            if (hr != S_OK)
                return false;

            //get the state filled by CSAPMenu
            CComQIPtr < IWebAttrVal > pState;
            pWebInfo -> GetAttrValueByName(WEB_PN_STATE, & pState);
            long lState = SAP_NODE_NOTFOUND;
            pState -> GetLongValue(0, & lState);
            if (lState != SAP_NODE_NOTFOUND) {
                CComQIPtr < IWebAttrVal > pId;
                pWebInfo -> GetAttrValueByName(WEB_PN_ID, & pId);
                MIC_ASSERT_RETURN(pId, false);

                //These are required by SAPNavigationBar TO.
                pWebInfo -> ReplaceAttrValueByName(PN_INNER_CELL_SELECT_ID, pId);
                pWebInfo -> ReplaceAttrValueByName(PN_SAP_EXPAND_ID, pId);
            }

            return true;*/
        },

    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this.getPathStatus(msg);
            resultCallback(msg);
        },

    },

    _eventHandler: function (recorder, ev) {
        /*if (IsMouseDownUpDblClick(*ppWebInfo))
                return S_FALSE;
            //assign the selection text (a text represents the selection done by the user)
            //to the webinfo's PN_SAP_PATH attribute.
            //CMicBSTR selectionText = GetSelectionText(spElement);
            CMicBSTR selectionText = GetMenuItemText(pElement);
            _ASSERTE(!selectionText.IsEmpty());
            if (selectionText.IsEmpty())
                return S_FALSE;
        	
            CComPtr<IWebAttrVal> AttrVal = WICommonUtils::CreateWebAttrVal(selectionText);
            (*ppWebInfo)->InsertAttrWebAttr(PN_SAP_PATH, AttrVal);
         
            return S_OK; */
        if (ev.type == "dblclick")
            return false;

        if (ev.type == "mousedown")
            ev.type = "click";

        var params = { event: 'on' + ev.type };
        params["sap path"] = this.getRecordedPath(ev.target);
        recorder.sendRecordEvent(this, ev, params);
        return true;
    }
};

var SAPTopNavigationBarBehavior = {//standalone
    m_pGrandParentElement: null,
    _micclass: ["SAPTopNavigationBar", "WebElement", "StdObject"],
    _attrs: {
        "micclass": function () {
            return "SAPTopNavigationBar";
        },
        "logical name": function () {
            return "SAPTopNavigationBar";
        },
        "name": function () {
            return "SAPTopNavigationBar";
        },
        "subtabs count": function () {
            var elVector = this.GetSubTabs();
            return elVector.length;
        },
        "selected subtab": function () {
            var elVector = this.GetSubTabs();
            for (var i = 0; i < elVector.length; i++) {
                if (SapConfigurationUtil.isElementOfSpecifier(elVector[i], SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_ACTIVETAB)) {
                    var bsInnerText = elVector[i].innerText;
                    //trim the return chars from Portal7.3 tab decorators
                    if (this.IsPortal73Tab(elVector[i]))
                        bsInnerText = bsInnerText.trim();
                    return bsInnerText;
                }
            }
        },
        "tabs count": function () {
            var elVector = this.GetTabs();
            return elVector.length;
        },
        "selected tab": function () {
            return this.GetSelectedTabText();
        },
        "all tabs": function () {
            var bsAllTabsText = "";
            var elVector = this.GetTabs();
            for (var i = 0; i < elVector.length; i++) {
                if (elVector[i] == null)
                    continue;

                var Text = elVector[i].innerText;
                //trim the return chars from Portal7.3 tab decorators
                if (this.IsPortal73Tab(elVector[i]))
                    Text = Text.trim();
                if (bsAllTabsText.length > 0)
                    bsAllTabsText += ";";

                bsAllTabsText += Text;
            }
            return bsAllTabsText;
        },
        "all subtabs": function () {
            var bsAllTabsText = "";
            var elVector = this.GetSubTabs();
            for (var i = 0; i < elVector.length; i++) {
                if (elVector[i] == null)
                    continue;
                var Text = elVector[i].innerText;
                //trim the return chars from Portal7.3 tab decorators
                if (this.IsPortal73Tab(elVector[i]))
                    Text = Text.trim();
                if (bsAllTabsText.length > 0)
                    bsAllTabsText += ";";

                bsAllTabsText += Text;
            }
            return bsAllTabsText;
        },
    },
    _helpers: {
        isObjSpyable: function () {
            return false;
        },
        GetSubTabs: function () {
            var spCollection = document;
            var pElem;
            var spVisibleTabsContainer = SapConfigurationUtil.getElementOfCollection(pElem, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_SECONDLEVELVISIBLETABSCONTAINER);
            if (spVisibleTabsContainer)
                spCollection = spVisibleTabsContainer;

            if (spCollection == null)
                return [];

            return SapConfigurationUtil.filterCollection(spCollection, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_SECONDLEVELTAB);
        },
        IsPortal73Tab: function (pElement) {
            if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTAB_PORTAL73))
                return true;
            if (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_SECONDLEVELTAB_PORTAL73))
                return true;
            return false;
        },
        GetTabs: function () {
            return SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTAB);
        },
        GetSelectedTabText: function () {
            var elVector = this.GetTabs();
            for (var i = 0; i < elVector.length; i++) {
                if (SapConfigurationUtil.isElementOfSpecifier(elVector[i], SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_ACTIVETAB)) {
                    var bsInnerText = elVector[i].innerText;
                    if (this.IsPortal73Tab(elVector[i]))
                        bsInnerText = bsInnerText.trim();
                    return bsInnerText;
                }
            }
            return null;
        },
        GetTabID: function (msg) {
            msg.status = "ERROR";
            var pFirstLevelTab = msg._data.hasOwnProperty("sap EP6 First level tab");
            var bsTabName = msg._data["TopNavigation path"];

            var elVector = [];
            if (pFirstLevelTab)
                elVector = this.GetTabs();
            else
                elVector = this.GetSubTabs();

            if (elVector.length == 0)
                return;

            var i = 0;
            for (i = 0; i < elVector.length; i++) {
                var bstrText = elVector[i].innerText;
                //trim the return chars from Portal7.3 tab decorators
                if (this.IsPortal73Tab(elVector[i]))
                    bstrText = bstrText.trim();

                if (bstrText.length == 0) {
                    continue;
                }
                if (bsTabName == bstrText)
                    break;
            }

            if (i == elVector.length)
                return;

            if (SapConfigurationUtil.isElementOfSpecifier(elVector[i], SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_ACTIVETAB))
                msg.status = "ERROR"// Tab already selected
            else
                msg.status = "OK";

            // Get Tab link
            var TabLink = elVector[i];
            if (SapConfigurationUtil.isElementOfSpecifier(elVector[i], SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTAB)
                && !SapConfigurationUtil.isElementOfSpecifier(elVector[i], SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTAB_PORTAL73)) {
                if (elVector.children) {
                    TabLink = elVector[i].children[0];
                }
            }

            var pGenItemObj = new AO(TabLink, this.getID());
            msg._data.WEB_PN_ID = pGenItemObj.getID();
            msg.status = "OK";
            return;
        },
        Portal73GetTabText(pElement) {
            //Get the text element
            if (pElement != null) {
                var itemElements = SapConfigurationUtil.filterCollection(pElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_TABTEXT);
                if (itemElements.length == 0)
                    itemElements = SapConfigurationUtil.filterCollection(pElement.parentElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_TABTEXT);
                return itemElements[0] != null ? itemElements[0].innerText : "";
            }
            return "";
        },
        Portal73FillRecordInformation(ev, recorder, isFirstLevelTab) {
            var bsPath = "";
            var params = { event: 'on' + ev.type };
            SAPUtils.updateRtidWithSAPPortal.call(this);

            if (isFirstLevelTab) {
                var bsTabText = SAPTopNavigationBarBehavior._helpers.Portal73GetTabText.call(this, ev.target);
                params["TopNavigation path"] = bsTabText;
                recorder.sendRecordEvent(this, ev, params);
                return true;
            }

            // The record was on a 2nd level tab, we record as "<1st level tab>;<2nd level tab>"
            // Get the text in 1st level tab
            var elVector = SAPTopNavigationBarBehavior._helpers.GetTabs.call(this);
            for (var idx = 0; idx < elVector.length; idx++) {
                if (SapConfigurationUtil.isElementOfSpecifier(elVector[idx], SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_ACTIVETAB)) {
                    bsPath = SAPTopNavigationBarBehavior._helpers.Portal73GetTabText.call(this, elVector[idx]);
                    break;
                }
            }

            // Get the text in 2nd level tab
            bsPath += ";";
            bsPath += SAPTopNavigationBarBehavior._helpers.Portal73GetTabText.call(this, ev.target);
            params["TopNavigation path"] = bsPath;
            recorder.sendRecordEvent(this, ev, params);
            return true;
        },
    },



    _methods: {
        "SAP_TABSTRIP_GET_TAB_ID": function (msg, resultCallback) {
            SAPTopNavigationBarBehavior._helpers.GetTabID.call(this, msg);
            resultCallback(msg);
        },

    },

    _eventHandler: function (recorder, ev) {
        if (ev.type == "dblclick")
            return false;

        var spProtal73Level1Tab = SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTAB_PORTAL73, 4);
        if (spProtal73Level1Tab != null) {
            ev.target = spProtal73Level1Tab;
            return SAPTopNavigationBarBehavior._helpers.Portal73FillRecordInformation.call(this, ev, recorder, true);
        }


        var spProtal73Level2Tab = SapConfigurationUtil.getContainerElement(ev.target, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_SECONDLEVELTAB_PORTAL73, 4);
        if (spProtal73Level2Tab != null) {
            ev.target = spProtal73Level2Tab;
            return SAPTopNavigationBarBehavior._helpers.Portal73FillRecordInformation.call(this, ev, recorder);
        }

        var bsPath = "";
        var params = { event: 'on' + ev.type };
        // In case the record was on a 2nd level tab we put in first the select tab for replay
        if (!SapConfigurationUtil.isElementOfSpecifier(ev.target, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTAB) &&
            !SapConfigurationUtil.isElementOfSpecifier(ev.target.parentElement, SAP_SPECIFIER_ENUM.SAPSP_TOPNAVIGATIONBAR_FIRSTLEVELTAB)) {
            bsPath = SAPTopNavigationBarBehavior._helpers.GetSelectedTabText() + ";";
        }

        bsPath += ev.target.innerText;
        params["TopNavigation path"] = bsPath;
        recorder.sendRecordEvent(this, ev, params);
        return true;
    }
};