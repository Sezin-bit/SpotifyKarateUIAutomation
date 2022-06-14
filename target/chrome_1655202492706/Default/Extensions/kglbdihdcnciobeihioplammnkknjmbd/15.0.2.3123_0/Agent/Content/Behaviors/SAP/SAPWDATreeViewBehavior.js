var SAPWDATreeViewBehavior = {
    _micclass: ["SAPTreeView"],
    _attrs: {
        "logical name": function () {
            return this.getLogicalName();
        },
        "selectednode": function () {
            return this.getSelectedNode();
        },
    },
    _helpers: {
        getLogicalName: function () {
            var treeTitle = "";
            var title = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_TITLE);
            // Return the title of the tree
            if (title) {
                treeTitle = title.innerText.trim();
                if (treeTitle.length > 0)
                    return treeTitle;
            }

            // If there is no title return the text of the first node
            var firstNode = SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE);
            return firstNode.innerText.trim();
        },
        getSelectedNode: function () {
            var selectedElem = this.getTreeSelectedElement();
            if (selectedElem == null)
                return ""

            var text = this.getTextFromNodeInS4HANA(selectedElem);
            return text == "" ? selectedElem.innerText.trim() : text;
        },
        getTreeSelectedElement: function () {
            return SapConfigurationUtil.getElementOfCollection(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_TREEVIEW_SELECTED_NODE);
        },
        getPathStatus: function (msg) {
            if (!msg || !msg._data["sap path"])
                return;
            msg.status = "ERROR";

            var pPath = msg._data["sap path"];
            if (typeof (pPath) == "string")
                pPath = pPath.split();
            else
                pPath = pPath[0];

            msg._attr_names.push("state");            // start inserting the gathered information
            var obj = this.getLastOpenedNodeAndIndexInPath(pPath);
            if (obj.pNode == null) {
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                msg.status = "OK";
                return;
            }

            // fill the WebInfo with the index of the last expanded item in the path
            msg._attr_names.push("sap path index");
            msg._data["sap path index"] = obj.lPathIdx + 1;//base-1
            var lNodeState = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
            if (obj.lPathIdx == pPath.length - 1) {
                lNodeState = this.getNodeState(obj.pNode);
                msg._data["state"] = lNodeState;
            }
            else
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;// this is not the last item in the path

            //Get the SPAN node element sPointer. At the leaf, pass the node itself.
            var pNodeSpan = lNodeState != SAP_NODESTATE_ENUM.SAP_LEAF ? this.getNodeSpan(obj.pNode) : obj.pNode;

            pNodeSpan = this.replaceElemForDeviceClick(pNodeSpan);//click on text to make sure activate works as expected

            var pGenItemObj = new AO(pNodeSpan, this.getID());
            pGenItemObj.mergeBehavior(CommonBehavior);
            if (pGenItemObj) {
                msg._attr_names.push("inner cell select id");
                msg._data["inner cell select id"] = pGenItemObj.getID();

                msg._attr_names.push("sap expand id")
                var pNodeIcon = this.getNodeIcon(obj.pNode);
                if (pNodeIcon) {
                    var pGenIconObj = content.kitsManager.createAO(pNodeIcon, this.getID());
                    msg._data["sap expand id"] = pGenIconObj.getID();
                }
            }

            msg.status = "OK";
            return;
        },
        getLastOpenedNodeAndIndexInPath: function (pPath) {
            var obj = { lPathIdx: 0, pNode: null };
            if (SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_TREEVIEW_TABLE)
                || SapConfigurationUtil.isElementOfSpecifier(this._elem, SAP_SPECIFIER_ENUM.SAP_WDA_NWBC_TREEVIEW_CONTAINERNODE)) {
                var pCurrentNode = this._elem;
                while (obj.lPathIdx < pPath.length) {
                    var bsText = pPath[obj.lPathIdx];
                    if (bsText == null)
                        return obj;
                    pCurrentNode = this.getSubTreeNodeElementWithSpecifiedText(pCurrentNode, bsText);
                    // if the next level is not found then we return the last one
                    if (pCurrentNode == null)
                        return obj;

                    // return if the node is closed
                    if (this.getNodeState(pCurrentNode) == SAP_NODESTATE_ENUM.SAP_NODE_CLOSED || obj.lPathIdx == pPath.length - 1) {
                        obj.pNode = pCurrentNode;
                        return obj;
                    }
                    obj.lPathIdx++;
                }
            }
            else {
                if (this._elem.id.length == 0)
                    return obj;
                var wantedId = this._elem.id + "-child";
                var pSubTreeContainer = document.getElementById(wantedId);
                while (obj.lPathIdx < pPath.length) {
                    var bsText = pPath[obj.lPathIdx];
                    if (bsText == null)
                        return obj;

                    pCurrentNode = this.getSubTreeNodeElementWithSpecifiedText(pSubTreeContainer, bsText);
                    // if the next level is not found then we return the last one
                    if (pCurrentNode == null)
                        return obj;

                    // return if the node is closed
                    if (this.getNodeState(pCurrentNode) == SAP_NODESTATE_ENUM.SAP_NODE_CLOSED || obj.lPathIdx == pPath.length - 1) {
                        // update the last known replay element
                        obj.pNode = pCurrentNode;
                        return obj;
                    }
                    pSubTreeContainer = this.getElementContainingChildrenOfCurrentNode(pCurrentNode);
                    obj.lPathIdx++;
                }
            }
            return obj;
        },
        getSubTreeNodeElementWithSpecifiedText: function (pNodesContainer, bsText) {
            if (pNodesContainer == null)
                return null;
            var elVector = this.getAllNodesOfSpecifiedNodesContainer(pNodesContainer);
            var index = -1;
            if ((bsText.length > 1) && (bsText.indexOf("#") == 0)) {
                index = parseInt(bsText.substr(1));
                if (isNaN(index))
                    return null;
            }
            // search for string
            if (index == -1) {
                for (var i = 0; i < elVector.length; i++) {

                    var bstrText = this.getTextFromNode(elVector[i]);
                    if (!bstrText) {
                        continue;
                    }
                    if (bsText == bstrText)
                        return elVector[i];
                }
            }
            else // use index
            {
                if (index > elVector.length)
                    return null;

                return elVector[index - 1];
            }
            return null;
        },
        getAllNodesOfSpecifiedNodesContainer: function (pNodesContainer) {
            if (pNodesContainer == null)
                return [];
            var elVector = [];
            //whole NWBC tree view is a kind of NWBC table
            if (SapConfigurationUtil.isElementOfSpecifier(pNodesContainer, SAP_SPECIFIER_ENUM.SAP_TREEVIEW_TABLE)) {
                //return the root node, wholse lv (level) attribute is 2
                var nodeElements = SapConfigurationUtil.filterCollection(pNodesContainer, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);
                if (nodeElements.length <= 0)
                    return [];

                for (var i = 0; i < nodeElements.length; i++) {
                    var level;
                    var attrValue = nodeElements[i].getAttribute("lv");
                    if (isNaN(parseInt(attrValue)))
                        continue;
                    level = parseInt(attrValue);
                    if (level <= 2) {
                        elVector.push(nodeElements[i]);
                    }

                }
                return elVector;
            }

            if (SapConfigurationUtil.isElementOfSpecifier(pNodesContainer, SAP_SPECIFIER_ENUM.SAP_WDA_NWBC_TREEVIEW_CONTAINERNODE)) {
                var parentLevel;
                var attrValue = pNodesContainer.getAttribute("lv");
                if (isNaN(parseInt(attrValue)))
                    return [];
                parentLevel = parseInt(attrValue);

                var parentRowNo;
                attrValue = pNodesContainer.getAttribute("lsMatrixRowIndex");
                if (isNaN(parseInt(attrValue)))
                    return [];
                parentRowNo = parseInt(attrValue);

                var pTree = SapConfigurationUtil.getContainerElement(pNodesContainer, SAP_SPECIFIER_ENUM.SAP_TREEVIEW_TABLE, 5);
                var nodeElements = SapConfigurationUtil.filterCollection(pTree, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);
                if (nodeElements.length <= 0)
                    return [];
                var obj = { nextParentRowNo: -1 };
                //get the row no of next parent node (namely the next node whose level is same as parent node)
                this.loopParentNode(nodeElements, parentRowNo, parentLevel, elVector, obj, true);
                //get child nodes between the parent node row and next parent node (namely the next node whose level is same as parent node) row.
                this.loopParentNode(nodeElements, parentRowNo, parentLevel + 1, elVector, obj, false);
                return elVector;
            }
            return elVector = SapConfigurationUtil.filterCollection(pNodesContainer, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);
        },
        loopParentNode: function (nodeElements, parentRowNo, parentLevel, elVector, obj, ChangeRowNo) {
            for (var i = 0; i < nodeElements.length; i++) {
                var level;
                var attrValue = nodeElements[i].getAttribute("lv");
                if (isNaN(parseInt(attrValue)))
                    return [];
                level = parseInt(attrValue);
                if (level != parentLevel)
                    continue;

                var rowNo;
                attrValue = nodeElements[i].getAttribute("lsMatrixRowIndex");
                if (isNaN(parseInt(attrValue)))
                    return [];
                rowNo = parseInt(attrValue);
                if (rowNo <= parentRowNo)
                    continue;

                if (obj.nextParentRowNo < 0 || rowNo < obj.nextParentRowNo) {
                    if (ChangeRowNo)
                        obj.nextParentRowNo = rowNo;
                    else
                        elVector.push(nodeElements[i]);
                }
            }
        },
        getTextFromNode: function (elem) {
            if (!elem)
                return "";

            var text = SAPTreeViewBehavior._helpers.getTextFromNodeInS4HANA.call(this, elem);

            if (text != "")
                return text;
            else
                return elem.innerText.trim();
        },
        getNodeState: function (pNode) {
            var state = this.getNodeIconWithState(pNode);
            return state;
        },
        getNodeIconWithState: function (elem) {
            if (SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_OPEN)) {
                return SAP_NODESTATE_ENUM.SAP_NODE_OPENED;
            }
            if (SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_CLOSED)) {
                return SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;
            }
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_LEAF)
                || SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_NWBC_TREE_NODE_ICON_IMG_LEAF)) {
                return SAP_NODESTATE_ENUM.SAP_LEAF;
            }

            return SAP_NODESTATE_ENUM.SAP_LEAF;// Default to leaf
        },
        // Find the element that contains all the children of the current element
        getElementContainingChildrenOfCurrentNode: function (elem) {
            // Find the node's ID
            var container = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_CONTAINER);
            if (container == null)
                container = SapConfigurationUtil.getElementOfCollection(document, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_CONTAINER);

            if (container == null)
                return null
            var wantedId = container.id + "-child";

            return document.getElementById(wantedId);
        },
        getNodeSpan: function (pNode) {
            if (pNode == null)
                return null;
            if (SapConfigurationUtil.isElementOfSpecifier(pNode, SAP_SPECIFIER_ENUM.SAP_WDA_NWBC_TREEVIEW_CONTAINERNODE))
                return pNode;
            return SapConfigurationUtil.getElementOfCollection(pNode, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE1);
        },
        getNodeIcon: function (pNode) {
            if (pNode == null)
                return null;

            if (SapConfigurationUtil.isElementOfSpecifier(pNode, SAP_SPECIFIER_ENUM.SAP_WDA_NWBC_TREEVIEW_CONTAINERNODE)) {
                var pOpenIcon = SapConfigurationUtil.getElementOfCollection(pNode, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_OPEN);
                if (pOpenIcon != null)
                    return pOpenIcon;

                var pCloseIcon = SapConfigurationUtil.getElementOfCollection(pNode, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_CLOSED);
                if (pCloseIcon != null)
                    return pCloseIcon;

                var pLeafIcon = SapConfigurationUtil.getElementOfCollection(pNode, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_NWBC_TREE_NODE_ICON_IMG_LEAF);
                if (pLeafIcon != null)
                    return pLeafIcon;

                return pNode;
            }

            var spanElem = this.getNodeSpan(pNode);
            if (spanElem != null)
                return spanElem.previousElementSibling;
            return null;
        },
        getParentNode: function (pNode) {
            if (pNode == null)
                return null;

            //if the element is not the node - then get the container node
            pNode = SapConfigurationUtil.getContainerElement(pNode, SAP_SPECIFIER_ENUM.SAP_WDA_TREEVIEW_CONTAINERNODE, 5);
            if (pNode == null)
                return null;

            if (SapConfigurationUtil.isElementOfSpecifier(pNode, SAP_SPECIFIER_ENUM.SAP_WDA_NWBC_TREEVIEW_CONTAINERNODE)) {
                var childLevel;
                var attrValue = pNode.getAttribute("lv");
                if (isNaN(parseInt(attrValue)))
                    return null;
                childLevel = parseInt(attrValue);

                var childRowNo;
                attrValue = pNode.getAttribute("lsMatrixRowIndex");
                if (isNaN(parseInt(attrValue)))
                    return null;
                childRowNo = parseInt(attrValue);

                if (pNode.parentElement == null)
                    return null;
                if (pNode.parentElement.parentElement == null)
                    return null;


                var nodeElements = SapConfigurationUtil.filterCollection(pNode.parentElement.parentElement, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);
                var pParentNode = null;
                var parentRowNo = -1;
                for (var i = 0; i < nodeElements.length; i++) {
                    var level;
                    var attrValue = nodeElements[i].getAttribute("lv");
                    if (isNaN(parseInt(attrValue)))
                        return null;
                    level = parseInt(attrValue);
                    if (level != childLevel - 1)
                        continue;

                    var rowNo;
                    attrValue = nodeElements[i].getAttribute("lsMatrixRowIndex");
                    if (isNaN(parseInt(attrValue)))
                        return null;
                    rowNo = parseInt(attrValue);
                    if (rowNo >= childRowNo)
                        continue;

                    if (pParentNode == null || rowNo > parentRowNo) {
                        parentRowNo = rowNo;
                        pParentNode = nodeElements[i];
                    }
                }
                return pParentNode;
            }

            //get pNode's sub-tree
            if (pNode.parentElement == null)
                return null;

            //get parent element of the sub-tree
            var spParentElement = pNode.parentElement.previousElementSibling;
            if (spParentElement == null)
                return null;

            if (SapConfigurationUtil.isElementOfSpecifier(spParentElement, SAP_SPECIFIER_ENUM.SAP_WDA_TREEVIEW_CONTAINERNODE))
                return spParentElement;

            return null;
        },
        isLeafNode: function (pNode) {
            //if the element is not the node - then get the container node
            var pNode = SapConfigurationUtil.getContainerElement(pNode, SAP_SPECIFIER_ENUM.SAP_WDA_TREEVIEW_CONTAINERNODE, 5);

            if (pNode == null)
                return false;

            return this.getNodeState(pNode) == SAP_NODESTATE_ENUM.SAP_LEAF;
        },
        getRecordedPath: function (pElement, record_obj) {//virtual from saptreeview
            var pNode = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE, 12);
            if (pNode == null)
                return false;

            if (SapConfigurationUtil.isElementOfSpecifier(pNode, SAP_SPECIFIER_ENUM.SAP_WDA_NWBC_TREEVIEW_CONTAINERNODE)) {
                var pOpenIcon = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_OPEN, 2);
                if (pOpenIcon != null)
                    return false;

                var pCloseIcon = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_CLOSED, 2);
                if (pCloseIcon != null)
                    return false;

                return this.getNodePath(pNode, record_obj);
            }

            // get the column text
            // Zieder: the 6 is just a guesstimation. Fingers crossed.
            var pColumn = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD, 6);
            record_obj.lColumn = this.getColumnIndex(pColumn);
            if ((record_obj.lColumn > 0) && !SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_REPLAYEXPAND))
                record_obj.Column += this.getHeaderText(record_obj.lColumn);
            // if we didn't click on one of the column items 
            // and this is the collapse/expand icon then we do not record
            if (!this.isLeafNode(pNode)) {
                if ((SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_OPEN)) ||
                    (SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_DYNPRO_TREE_NODE_ICON_CLOSED)))
                    return false;
            }

            return this.getNodePath(pNode, record_obj);
        },
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPWDATreeView._eventHandler: Received recordable event: ' + ev.type);
        return SAPTreeViewBehavior._eventHandler.call(this, recorder, ev);
    },

};
