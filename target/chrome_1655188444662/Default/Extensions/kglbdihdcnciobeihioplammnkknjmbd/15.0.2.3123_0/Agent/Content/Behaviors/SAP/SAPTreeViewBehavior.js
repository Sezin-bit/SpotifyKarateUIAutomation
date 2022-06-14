var SAPTreeViewBehavior = {
    _micclass: ["SAPTreeView"],
    _attrs: {
        "micclass": function () {
            return "SAPTreeView";
        },
        "highlight source index": function () {
            var pTmpElement = this._elem;
            while (pTmpElement != null) {
                if (pTmpElement.offsetParent == null)
                    return null;

                if (SapConfigurationUtil.isElementOfSpecifier(pTmpElement, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_COLUMN_TREE_BORDER)) {
                    //We want the source index of the PARENT of SAPSP_TREEVIEW_COLUMN_TREE_BORDER
                    var lSourceIndex = SAPUtils.getSourceIndex(pTmpElement.offsetParent);
                    if (lSourceIndex != -1)
                        return lSourceIndex;
                }
                pTmpElement = pTmpElement.offsetParent;
            }

            return null;
        },
        "selectednode": function () {
            var NodeElements = this.getNodesVector();
            var SpecifierElem = SapConfigurationUtil.getItemContainingSpecifierText(NodeElements, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_HIGHLIGHTED);
            if (SpecifierElem) {
                return SpecifierElem.innerText;
            }
            return "";
        },
        "sap web component name": function () {
            return SAPUtils.getComponentName(this._elem, this);
        },
        "sap web component runtime ID": function () {
            return SAPUtils.getComponentRuntimeID(this._elem, this);
        },
    },
    _helpers: {
        getNodesVector: function () {
            return SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);
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
            var pathSize = pPath.length;
            var obj = { iPathIdx: 0 };
            var pNode = this.getLastNodeInPath(pPath, obj, pathSize);

            msg._attr_names.push("state");
            msg._attr_names.push("sap path index");
            msg._data["sap path index"] = obj.iPathIdx;

            if (pNode == null) {
                msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                msg.status = "OK";
                return;
            }

            var pObj;
            // we return only the id for the object which were asked
            var spColumn = msg._data["sap column"];
            if (spColumn != null) {
                var pReplay = this.getReplayElement(pNode, spColumn);
                if (pReplay != null) {
                    if (msg._data.hasOwnProperty["inner cell select id"]) {
                        pObj = new AO(pReplay, this.getID());
                        pObj.mergeBehavior(CommonBehavior);
                        if (pObj != null)
                            msg._data["inner cell select id"] = pObj.getID();
                    }

                    if (msg._data.WEB_AN_CELL_ID) {
                        // Zieder: the 5 is just a guestimation. I'm a hopefull guy.
                        var pCell = SapConfigurationUtil.getContainerElement(pReplay, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD, 5);

                        pObj = new AO(pCell, this.getID());
                        pObj.mergeBehavior(CommonBehavior);
                        if (pObj != NULL)
                            msg._data.WEB_AN_CELL_ID = pObj.getID();
                    }
                }
            }

            if (msg._data.hasOwnProperty["sap expand id"]) {
                //expand the tree to expose the element we operate on.
                var pReplayElement = this.getReplayElement(pNode, 0);
                if (pReplayElement != null) {
                    pObj = content.kitsManager.createAO(pReplayElement, this.getID());
                    if (pObj != null)
                        msg._data["sap expand id"] = pObj.getID();
                }
            }

            if (this.isLeafNode(pNode)) {
                if (obj.iPathIdx < pathSize)
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                else
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_LEAF;
            }
            else {
                var bIsOpened = this.isNodeOpened(pNode);
                if (bIsOpened && (obj.iPathIdx < pathSize))
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_NOTFOUND;
                else if (bIsOpened)
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_OPENED;
                else
                    msg._data["state"] = SAP_NODESTATE_ENUM.SAP_NODE_CLOSED;
            }

            msg.status = "OK";
            return;

        },
        getLastNodeInPath: function (pPath, obj, pathSize) {
            // return the last visible node in the path 
            // and the index (1-base) of the level of the node in the path
            var pLastNode = null;
            for (obj.iPathIdx = 0; obj.iPathIdx < pathSize;) {
                // get the current node
                pNode = this.getNodeByText(pLastNode, pPath[obj.iPathIdx]);
                // if no more opened node - return the last node
                if (pNode == null)
                    return pLastNode;

                // only if we found the node we increament the path index
                obj.iPathIdx++;
                // exist if this is the leaf, the last item in path, or the last opened item
                if (this.isLeafNode(pNode) || obj.iPathIdx == pathSize || !this.isNodeOpened(pNode))
                    return pNode;

                pLastNode = pNode;
            }
            return pNode;
        },
        getRecordedPath: function (pElement, record_obj) {
            var pNode = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);
            if (pNode == null)
                return false;

            // get the column text
            // Zieder: the 5 is just a guesstimation. Fingers crossed.
            var pColumn = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD, 5);
            record_obj.lColumn = this.getColumnIndex(pColumn);
            if ((record_obj.lColumn > 0) && !SapConfigurationUtil.isElementOfSpecifier(pElement, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_REPLAYEXPAND))
                record_obj.Column += this.getHeaderText(lColumn);
            // if we didn't click on one of the column items 
            // and this is not the leaf then we do not record
            else if (!this.isLeafNode(pNode))
                return false;

            this.getNodePath(pNode, record_obj);
            return true;
        },
        getNodeByText: function (pNode, bsPath) {
            //check for regular expression
            var bRegExp = false;
            if (bsPath.indexOf("RegExp:=")) {
                bRegExp = true;//indicate we're searching for a regular expression match
                bsPath = bsPath.substr(8);//set the string after the prefix
            }

            var NodeElements = this.getNodesVector();
            if (NodeElements.length == 0) {
                return null;
            }

            var idx = 0;
            var pChildNode = null;
            while (pChildNode = this.getChildNode(pNode, idx, NodeElements)) {
                if (bRegExp) {
                    if (this.getNodeText(pChildNode).match(bsPath) != null)
                        return pChildNode;
                }
                else {
                    if (bsPath == this.getNodeText(pChildNode))
                        return pChildNode;
                }
                idx++;
            }

            // if no such text check if it of the form "#N"
            if (bsPath.indexOf("#") == 0) {
                idx = parseInt(bsText.substr(1));
                if (idx > 0)
                    return this.getChildNode(pNode, SAPUtils.convertToZeroBase(idx), NodeElements);	// convert to 0-base
            }
            return null;
        },
        getChildNode: function (pNode, iChild, NodeElements) {
            // index is 0-base
            if (pNode == null)
                pNode = this._elem;

            var Index = this.getNodeIndex(NodeElements, pNode) + 1;
            var Level = this.getNodeLevel(pNode);

            if (NodeElements.length == 0) {
                return null;
            }

            // if the level is < 0 then this we are looking for item from the first level
            // so update the level to one below the first item (relay that it's from the first level)
            if (Level < 0)
                Level = this.getNodeLevel(NodeElements[0]) - 1;

            while (Index < NodeElements.length) {
                var CurrentLevel = this.getNodeLevel(NodeElements[Index]);

                // if we are back to the original level then there is no such child
                if (Level == CurrentLevel)
                    return null;

                // enumerate only the direct childrens
                if (Level == CurrentLevel - 1) {
                    if (iChild == 0)
                        return NodeElements[Index];

                    iChild--;
                }
                Index++;
            }
            return null;
        },
        getReplayElement: function (pNode, pColumn) {
            // get the replay element of the node
            // Column:	0 - expand/collapse
            //			>0 - the Column of the specified index in the node
            //			string - the text of the header of this column (by index)
            if (pNode == null)
                return null;
            // retrieve the expand/collapse element
            var lVal = parseInt(pColumn);
            if (!isNaN(lVal)) {
                if (lVal == 0)
                    return SapConfigurationUtil.GetElementOfCollection(pNode, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_REPLAYEXPAND);

                var ColumnVector = this.getColumnVector(pNode);
                if (ColumnVector.length == 0)
                    return null;

                // retrieve the column item within the node
                // if we have the index use it
                if (lVal > 0 && lVal <= ColumnVector.length)
                    return ColumnVector[SAPUtils.convertToZeroBase(lVal)];
            }
            else {
                // if we have a string (text or #<number>) - find the correct column item
                var bsText = pColumn;
                var index = -1;
                if ((bsText.length > 1) && (bsText.indexOf("#") == 0)) {
                    // return column by index - "#<number>"
                    index = parseInt(bsText.substr(1));

                    if ((index > 0) && (index <= ColumnVector.length))
                        return SapConfigurationUtil.getElementOfCollection(ColumnVector[SAPUtils.convertToZeroBase(index)], SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_REPLAYSELECT);
                }
                else {
                    // return column by the text of the header
                    var HeaderVector = this.getHeaderVector();
                    if (HeaderVector.length == 0)
                        return null;

                    for (var i = 0; i < ColumnVector.length && i < HeaderVector.length; i++) {
                        if (bsText == this.getNodeText(HeaderVector[i]))
                            return SapConfigurationUtil.getElementOfCollection(ColumnVector[i], SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_REPLAYSELECT);
                    }
                }
            }
            return null;
        },
        isNodeOpened: function (pNode) {
            return SapConfigurationUtil.isElementOfSpecifier(pNode, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_NODEOPENED);
        },
        isLeafNode: function (pNode) {
            return SapConfigurationUtil.isElementOfSpecifier(pNode, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_LEAFNODE);
        },
        getColumnIndex: function (pElement) {
            // return the column index of the element (1-base) in the node.
            // 0 - if the element is not in a column
            //Zieder: the 5 is just a guesstimation. 5 sounds lucky.
            var pColumn = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD, 5);
            if (pColumn != null) {
                var pNode = SapConfigurationUtil.getContainerElement(pElement, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);
                if (pNode != null) {
                    var ColumnVector = this.getColumnVector(pNode);
                    for (var i = 0; i < ColumnVector.length; i++)
                        if (pColumn == ColumnVector[i])
                            return i + 1;
                }
            }
            return 0;
        },
        getColumnVector: function (pNode) {
            // return the vector of all the columns inside a node
            return SapConfigurationUtil.filterCollection(pNode, SAP_SPECIFIER_ENUM.SAP_PLAIN_OLD_TD);
        },
        getHeaderVector: function () {
            // return the vector of all the headers of the treeview
            return SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERHEADER);
        },
        getHeaderText: function (idx) {
            // return the text of the main header of the treeview (if exists)
            // index is 1-base
            if (idx > 0) {
                var HeaderVector = this.getHeaderVector();
                if (idx <= HeaderVector.length) {
                    return HeaderVector[idx - 1].innerText.trim();
                }
            }
            return "";
        },
        getNodeText: function (pNode) {
            var text = this.getTextFromNodeInS4HANA(pNode);
            if (text != "")
                return text;

            var ColumnVector = this.getColumnVector(pNode);
            for (var i = 0; i < ColumnVector.length; i++) {
                var bsText = ColumnVector[i].innerText.trim();
                if (bsText.length > 0)
                    return bsText;
            }

            return pNode.innerText.trim();
        },
        getNodeLevel: function (pNode) {
            var bsLevel = pNode.getAttribute("treeLevel") != null ? pNode.getAttribute("treeLevel") : pNode.getAttribute("tree_level");
            if (bsLevel.length > 0) {
                bsLevel = parseInt(bsLevel);
                if (!isNaN(bsLevel))
                    return bsLevel;
            }
            return -1;
        },
        getNodePath: function (pNode, record_obj) {
            var tmpText;
            while (pNode != null) {
                tmpText = this.getNodeText(pNode);
                if (record_obj.Path.length > 0)
                    record_obj.Path = tmpText + ";" + record_obj.Path;
                else
                    record_obj.Path = tmpText;
                pNode = this.getParentNode(pNode);
            }
            return true;
        },
        getParentNode: function (pNode) {
            if (pNode == null)
                return null;

            // if the element is not the node - then get the container node
            pNode = SapConfigurationUtil.getContainerElement(pNode, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);

            var NodeElements = this.getNodesVector();
            if (NodeElements.length == 0)
                return null;

            var Index = this.getNodeIndex(NodeElements, pNode);
            var CurrentLevel = this.getNodeLevel(pNode);
            while (Index > 0) {
                var Level = this.getNodeLevel(NodeElements[Index - 1]);
                if (Level < CurrentLevel)
                    return NodeElements[Index - 1];
                Index--;
            }
            return null;
        },
        getNodesVector: function () {
            return SapConfigurationUtil.filterCollection(this._elem, SAP_SPECIFIER_ENUM.SAPSP_TREEVIEW_CONTAINERNODE);
        },
        getNodeIndex: function (NodeElements, pNode) {
            if (pNode == null)
                return -1;

            var NodeSourceIndex = SAPUtils.getSourceIndex(pNode);
            for (var i = 0; i < NodeElements.length; i++) {
                if (SAPUtils.getSourceIndex(NodeElements[i]) == NodeSourceIndex)
                    return i;
            }
            return -1;
        },
        getTreeViewLabelInS4HANA: function (pNode) {
            //NWA 753 
            //<td id="tree#118#1#1" subct="HIC" lsdata="{4:1,5:'INDENT'}" lsmatrixrowindex="1" lsmatrixcolindex="0" acf="CSEL" ut="2" lv="1" class="urSTC urST3TDHic urST5L urCursorClickable urStd urST4Sel2" style="border-right: none; height: 26px;">
            //      <span id="tree#118#1#1#Level#i-r" class="lsTextView--root lsControl--valign">
            //          <span id="tree#118#1#1#Level#i" ct="TV" lsdata="{5:'INHERIT',11:true,13:{ctmenu:1,focusable:'X'}}" lsevents="{Activate:[{ClientAction:'none'},{modalNo:'0',rgv:[{code:'action/1',eventtype:4,setsid:true,type:'GuiTree'}]}]}" tabindex="-1" ti="-1" class="lsTextView lsTextNoWrapping lsControl--noWrapping lsTextView--usedInTable lsTextView--design-standard " style="margin:0px;white-space:nowrap;">&nbsp;</span></span>
            //      <span id="tree#118#1#1#Text#i-r" class="lsTextView--root lsControl--valign">
            //          <span id="tree#118#1#1#Text#i" ct="TV" lsdata="{5:'INHERIT',11:true,13:{ctmenu:1,focusable:'X'}}" lsevents="{Activate:[{ClientAction:'none'},{modalNo:'0',rgv:[{code:'action/1',eventtype:4,setsid:true,type:'GuiTree'}]}]}" tabindex="-1" ti="-1" class="lsTextView lsTextNoWrapping lsControl--noWrapping lsTextView--usedInTable lsTextView--design-standard " style="white-space:nowrap;" title="">DragDrop Text 1</span></span>
            //S4HANA
            //<td id="tree#148#2#1" subct="HIC" lsdata="{4:1,5:'INDENT'}" lsmatrixrowindex="1" lsmatrixcolindex="1" role="gridcell" acf="CSEL" ut="2" lv="1" class="urSTC urST3TDHic urST5L urCursorClickable urStd" style="border-right: none; height: 24px;">
            //      <span id="tree#148#2#1#Text#i-r" class="lsTextView--root lsControl--valign">
            //      <span id="tree#148#2#1#Text#i" ct="TV" lsdata="{5:'INHERIT',10:true,11:true,13:{ctmenu:1,focusable:'X'}}" lsevents="{Activate:[{ClientAction:'none'},{rgv:[{0:'GuiTree',1:'action/1',3:true,13:4}]}]}" aria-readonly="true" aria-labelledby="tree#148#2#1#Text#i-arialabel" tabindex="0" ti="0" class="lsTextView lsTextNoWrapping lsControl--noWrapping lsTextView--usedInTable lsTextView--design-standard " style=";white-space:nowrap" title="">DragDrop Text 1</span>
            //      <span id="tree#148#2#1#Text#i-arialabel" style=";display:none;visibility:hidden">DragDrop Text 1</span></span>
                 
            //S4HANA duplicate text, two nodes inside treeview element
            if (SapConfigurationUtil.isElementOfSpecifier(pNode, SAP_SPECIFIER_ENUM.SAPSP_S4HANA_WDA_NWBC_TreeView_Item)
                || SapConfigurationUtil.getElementOfCollection(pNode, SAP_SPECIFIER_ENUM.SAPSP_S4HANA_WDA_NWBC_TreeView_Item) != null) {
                {
                    var S4HANA_Treeview_Label = SapConfigurationUtil.getElementOfCollection(pNode, SAP_SPECIFIER_ENUM.SAPSP_S4HANA_WDA_NWBC_TreeView_Item_Label);
                    if (S4HANA_Treeview_Label != null)
                        return S4HANA_Treeview_Label;
                }
            }
            return null;
        },
        getTextFromNodeInS4HANA: function (elem) {
            var S4HANA_Treeview_Label = this.getTreeViewLabelInS4HANA(elem);
            if (S4HANA_Treeview_Label != null)
                return S4HANA_Treeview_Label.innerText.trim();
            return "";
        },
        replaceElemForDeviceClick: function (elem) {
            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAPSP_S4HANA_WDA_NWBC_TreeView_Item)
                || SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAPSP_S4HANA_WDA_NWBC_TreeView_Item) != null) {//S4HANA
                var S4HANA_Treeview_Label = this.getTreeViewLabelInS4HANA(elem);
                if (S4HANA_Treeview_Label == null)
                    return elem;
                //fire click event on Container will scroll down the scroll bar so that we are able to see the treeview item
                var S4HANA_Treeview_Label_Container = SapConfigurationUtil.getContainerElement(S4HANA_Treeview_Label, SAP_SPECIFIER_ENUM.SAPSP_S4HANA_WDA_NWBC_TreeView_Item_Label_Container, 2);
                return S4HANA_Treeview_Label_Container != null ? S4HANA_Treeview_Label_Container : elem;
            }

            if (SapConfigurationUtil.isElementOfSpecifier(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TREEVIEW_CONTAINERNODE)) {
                var Treeview_Label = SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TreeView_ContainerNode_Label);//WDA
                if (Treeview_Label == null){
                    Treeview_Label = SapConfigurationUtil.getElementOfCollection(elem, SAP_SPECIFIER_ENUM.SAP_WDA_TreeView_ContainerNode_Webgui_Label);//Webgui
                }
                return Treeview_Label != null ? Treeview_Label : elem;
            }

            return elem;
        },
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('SAPTreeView._eventHandler: Received recordable event: ' + ev.type);
        // It will filter mouseover, mouseup and click event
        // and use mousedown event as click
        if (ev.type == 'mouseover' || ev.type == 'mouseup') {
            return;
        }

        var record_obj = { Path: "", Column: "", lColumn: 0 };
        if (!this.getRecordedPath(ev.target, record_obj))
            return false;

        var params = { event: 'on' + ev.type };
        // first we add the path information of the Drop
        params["sap path"] = record_obj.Path;
        params["col"] = record_obj.Column;
        params["sap column"] = record_obj.lColumn;
        recorder.sendRecordEvent(this, ev, params);
        return true;
    },

    _methods: {
        "GET_PATH_STATUS": function (msg, resultCallback) {
            this.getPathStatus(msg);
            resultCallback(msg);
        },
    }
};


