var SAPListItemBehavior = {
    _micclass: ["SAPListboxItem", "WebElement", "StdObject"],

    _attrs: {
    },

    _methods: {
    },

    _eventHandler: function (recorder, ev) {
        // this._logger.trace('SAPListItem._eventHandler: Received recordable event: ' + ev.type);
        // if (ContentUtils.isTouchEnabled())
        //     return this._eventHandlerTouchEnabled.call(this._elem, recorder, ev);

        switch (ev.type) {
            case 'focus':
            case 'blur':
            case 'click':
                //GetParentObj
                var listInput = this._getParentList(this._elem);
                if (Util.isNullOrUndefined(listInput)) {
                    this._logger.trace('SAPListItemBehavior.getParentList: failed!');
                    //Do not let other kits to handle this events.
                    return true;
                }

                //NewAO
                var sapListAO;
                if (listInput == SAPListBox_getLastClicked) {
                    sapListAO = SAPKitFactory.createAO(listInput, this._parentID, [SAPListBoxBehavior]);
                }
                else if (listInput == SAPComboBox_getLastClicked) {
                    sapListAO = SAPKitFactory.createAO(listInput, this._parentID, [SAPComboBoxBehavior]);
                }
                else if (SapConfigurationUtil.isElementOfSpecifier(listInput, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN)) {
                    sapListAO = SAPKitFactory.createAO(listInput, this._parentID, [SAPComboBoxBehavior, SAPCRMComboBoxBehavior]);
                }

                //Reset new ao attributes
                if (!sapListAO) {
                    this._logger.error('SAPKitFactory.createAO(listInput, pParentObj, []): failed!');
                    return false;
                }

                var id = sapListAO.getID();
                var selectValue = this._getSingleSelectValue(this._elem);

                recorder.sendRecordEvent(sapListAO, ev, {
                    event: 'on' + ev.type,
                    value: selectValue,
                    "sap event from item": true,
                });

                return true;
        }
        return false;
    },



    _helpers: {
        isLearnable: Util.alwaysFalse,
        // To find the parent list
        _getParentList: function (elem) {
            var parentList;
            var containerElement = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPWDLIST_CONTAINER_FRAME, 5);
            if (!containerElement) {
                containerElement = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPWD_LIST_OPTION_CONTAINER, 6);
            }
            if (containerElement) {
                if (document) {
                    var inputId;
                    var isWDLstOptionCnter = SapConfigurationUtil.isElementOfSpecifier(containerElement, SAP_SPECIFIER_ENUM.SAPWD_LIST_OPTION_CONTAINER);
                    var lsData = containerElement.getAttribute("parid");
                    if (lsData == null || lsData == "" || isWDLstOptionCnter == false) {
                        if (lsData == null && !isWDLstOptionCnter) {
                            lsData = containerElement.getAttribute("id");
                        }
                        if (lsData) {
                            inputId = lsData;
                            if (inputId.length > 0) {
                                parentList = document.GetElementById(inputId);
                                if (parentList) {
                                    return parentList;
                                }

                                var vectorInputLists = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPWD_LIST_MAIN);
                                var length = vectorInputLists.length;
                                for (let l = 0; l < length; l++) {
                                    var lid;
                                    var id = vectorInputLists[l].id;
                                    if (!Util.isNullOrUndefined(id)) {
                                        if (id != inputId) {
                                            // try to get its "lid" attribute's value instead
                                            lid = vectorInputLists[l].getAttribute("lid");
                                            if (!Util.isNullOrUndefined(id))
                                                id = lid;
                                        }

                                        // it needs to compare again, because the vtId's value may comes from vtLid
                                        if (id == inputId) {
                                            parentList = vectorInputLists[l];
                                            return parentList;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (isWDLstOptionCnter) {
                        var containerId = containerElement.getAttribute("id");
                        if (containerId && containerId.endsWith("-r")) {
                            containerId = containerId.substr(0, containerId.length - 2);
                        }
                        //filter list input parts by the container of the list options
                        var vectorLists;
                        vectorLists = SapConfigurationUtil.filterCollection(document, SAP_SPECIFIER_ENUM.SAPWD_LIST_ELEMENT_INPUT_DROPDOWN1);
                        if (!Util.isNullOrUndefined(vectorLists)) {
                            for (var i = 0; i < vectorLists.length; i++) {
                                var input = vectorLists[i];

                                var lsDataValue = input.getAttribute("lsdata");
                                if (lsDataValue) {
                                    var lsDataStr = lsDataValue;

                                    //handle the lsdata like: 
                                    // Case 1) :lsdata="{0:true,1:false,2:false,3:false,4:'DROPDOWNSELECT',5:true,6:'WD14',7:'1',8:false,9:'',10:false,11:'NONE',12:false,13:'',14:'OFF',15:'DEFAULT',16:false,17:false,18:false}" 
                                    // Case 2) lsdata="{0:'',1:true,2:false,3:false,4:false,5:'DROPDOWNSELECT',6:true,7:'WD0194',8:'00',9:false,10:'Application',11:'',12:false,13:true,14:'',15:'',16:'AUTO',17:'NONE',18:0,19:'LEFT',20:'STRING',21:false,22:'',23:'OFF',24:'DEFAULT',25:false,26:false,27:false,28:'',29:20,30:true}" bMarkedAsFocussed="false">
                                    //		   lsdata="{0:'',1:true,2:false,3:false,4:false,5:'DROPDOWNSELECT',6:true,7:'WD0194',8:'00',9:false,10:'Application',11:'',12:false,13:true,14:'',15:'',16:'AUTO',17:'NONE',18:0,19:'LEFT',20:'STRING',21:false,22:'',23:'OFF',24:'DEFAULT',25:false,26:false,27:false,28:'',29:20,30:true}" bMarkedAsFocussed="true">
                                    // Case 3) lsdata="{4:true,7:'WD0118'}"
                                    if (lsDataStr.indexOf(":'WD") >= 0) {
                                        var lsIndexStr = SAPUtils.extractDataFromLsDataStr(lsDataStr, ":'WD", "'");
                                        if (!!lsIndexStr) {
                                            lsIndexStr = "WD" + lsIndexStr;
                                            if (lsIndexStr == containerId) {
                                                if (!parentList) {
                                                    parentList = input;
                                                }
                                                else {
                                                    // Like in Case 2) SAPList in table cells, could not identify input part by options container id in lsdata, as multiple has the same options container, so 
                                                    // get input part by last clicked SAPList.
                                                    if (!(parentList = SAPListBox_getLastClicked) || !(parentList = SAPComboBox_getLastClicked)) {
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    //Case 4: {2:'aaaaJKNE.BasicSearchView.Component.Description',3:'0',4:'User'} (EP5 http://mydvmsap13.swinfra.net:50200/irj/portal)
                                    else {
                                        var lsIndexStr = SAPUtils.extractDataFromLsDataStr(lsDataStr, "2:'", "'");
                                        if (lsIndexStr == containerId) {
                                            if (!parentList) {
                                                parentList = input;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (parentList) {
                            return parentList;
                        }
                    }
                }
            }

            var listOptionsParent = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_OPTIONS_CONTAINER_PARENT, 3);
            if (listOptionsParent) {
                var containerId = listOptionsParent.getAttribute("id");
                if (containerId) {
                    if (containerId.endsWith("items")) {
                        containerId = containerId.substr(0, containerId.length - 5);
                    }
                    while (containerId.endsWith("_")) {
                        containerId = containerId.substr(0, containerId.length - 1);
                    }
                    var listElement = document.getElementById(containerId);
                    if (listElement && (SapConfigurationUtil.isElementOfSpecifier(listElement, SAP_SPECIFIER_ENUM.SAP_CRM_INPUT_MAIN))) {
                        return listElement;
                    }
                }
            }
            return null;
        },

        _getSingleSelectValue: function (elem) {
            var selectedValue;

            // To do, actually we can always return the inner text of current element pElement, but for risk consideration, leave the task in future.
            // Here for CRM returns inner text directly.
            var listOptionsContainer = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAP_CRM_LIST_OPTION_CONTAINER, 5);
            if (listOptionsContainer) {
                selectedValue = elem.innerText;
                if (selectedValue)
                    return selectedValue;
            }

            var tr = elem.parentElement;
            if (tr) {
                var body = tr.parentElement;
                if (body) {
                    selectedValue = elem.innerText;

                    var listSelectedItem = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_SELECTED_ITEM);
                    var listSelectedItemS4Hana = SapConfigurationUtil.getContainerElement(elem, SAP_SPECIFIER_ENUM.SAPWD_LISTBOX_SELECTED_ITEM_S4HANA);

                    if (!listSelectedItem && !listSelectedItemS4Hana) {
                        return selectedValue;
                    }

                    if (listSelectedItem) {
                        var selectedIndex = -1;
                        var indexString = "";

                        //get item index
                        var value = listSelectedItem.getAttribute("k");
                        if (value) {
                            selectedIndex = parseInt(value, 10);
                            if (!selectedIndex) // one field should be read
                                selectedIndex = -1;
                        }

                        //check if the value of selected item is unique, if we can know its index
                        if (selectedIndex >= 0) {
                            var matchNo = 0;

                            var itemElements = SapConfigurationUtil.filterCollection(body, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM);
                            var itemCount = itemElements.size();
                            for (var i = 0; i < itemCount; i++) {
                                var itemElem = itemElements[i];

                                //skip the inner SAPWD_LIST_ITEM embedded in outer SAPWD_LIST_ITEM
                                var parent = itemElem.parentElement();
                                if (SapConfigurationUtil.isElementOfSpecifier(parent, SAP_SPECIFIER_ENUM.SAPWD_LIST_ITEM))
                                    continue;

                                var itemValue = itemElem.innerText();
                                if (!itemElem || !itemValue)
                                    continue;
                                if (itemValue == selectedValue)
                                    matchNo++;
                            }

                            //if the value of selected item is not unique, we return index string instead
                            if (matchNo > 1) {
                                //the index to record should be 0-based
                                indexString = "#" + (selectedIndex - 1).toString();
                                return indexString;
                            }
                        }
                    }

                    if (listSelectedItemS4Hana) {
                        var lsdataValue = pListSelectedItemS4Hana.getAttribute("lsdata");
                        if (lsdataValue) {
                            var lsDataStr = lsdataValue;
                            var lsTextStr = "";
                            //handle the lsdata like: 
                            //Case 1: {0:'1',1:....,4:'Text\x20for\x20Attribute\x3a\x20texts'}
                            //Case 2: {0:'1',1:....,4:'Text\x20for\x20Attribute\x3a\x20texts',5:'Text\x20for\x20Attribute\x3a\x20descriptiveText'}
                            if (lsDataStr.indexOf("4:'") >= 0) {
                                var text = SAPUtils.extractDataFromLsDataStr(lsDataStr, "4:'", "'");
                                lsTextStr += text;
                            }
                            if (lsDataStr.indexOf("5:'") >= 0) {
                                var text = SAPUtils.extractDataFromLsDataStr(lsDataStr, "5:'", "'");
                                lsTextStr += text;
                            }
                            if (!!lsTextStr) {
                                lsTextStr = lsTextStr.replace("\\x20", " ");
                                lsTextStr = lsTextStr.replace("\\x3a", ":");
                                selectedValue = lsTextStr;
                            }
                        }
                    }
                }
            }
            return selectedValue;
        },

        isObjSpyable:function(){
            return false;
        },
    }
};
