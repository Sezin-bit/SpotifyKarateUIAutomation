// © Copyright 1992-2017 Hewlett Packard Enterprise Development LP
var Description = {
    _logger: new LoggerUtil("Common.Description"),

    GetIDsByDescription: function (desc, candidateFunc, optionalParamsObj, resultCallback) {
        this._logger.trace("GetIDsByDescription: Started with the following description:", desc);
        var data = desc || {};
        //remove filter fields
        delete data["Kit Id"];

        if (data.xpath) // if an XPath was specified ignore _xpath
            delete data._xpath;

        if (data._xpath) {
            data.xpath = data._xpath;
            delete data._xpath;
            this.findObjId(data, candidateFunc, optionalParamsObj, (function (children) {
                this._logger.debug("GetIDsByDescription: using _xpath (", data.xpath, ") returned ", (children ? children.length : "[undefined]"), " matches");
                delete data.xpath; // don't need this any more
                if (Util.isUndefined(children) || children.length !== 1) {
                    this.findObjId(data, candidateFunc, optionalParamsObj, resultCallback);
                }
                else {
                    resultCallback(children);
                }
            }).bind(this));
        }
        else {
            this.findObjId(data, candidateFunc, optionalParamsObj, resultCallback);
        }
    },

    GetIDsByDescriptionSync: function (desc, candidateFunc, optionalParamsObj) {
        this._logger.trace("GetIDsByDescriptionSync: Started with the following description:", desc);
        var data = desc || {};
        //remove filter fields
        delete data["Kit Id"];

        if (data.xpath) // if an XPath was specified ignore _xpath
            delete data._xpath;

        if (data._xpath) {
            data.xpath = data._xpath;
            delete data._xpath;
            var children = this.findObjIdSync(data, candidateFunc, optionalParamsObj);
            this._logger.debug("GetIDsByDescriptionSync: using _xpath (", data.xpath, ") returned ", (children ? children.length : "[undefined]"), " matches");
            delete data.xpath; // don't need this any more
            if (children && children.length === 1) {
                return children;
            }
        }

        return this.findObjIdSync(data, candidateFunc, optionalParamsObj);
    },

    _removeDuplicateAOs: function (agentObjects) {
        if (Array.isArray(agentObjects)) {
            return agentObjects.filter(function (ao, index, arr) {
                // Only keep first AO that refer to the same DOM element
                return Util.arrayFindIndex(arr, function (candidate) {
                    return candidate._elem === ao._elem;
                }) === index;
            });
        }
        return agentObjects;
    },

    _findObjIdInternal: function (filterFunc, desc, candidateFunc, additionalParamsObj, resultCallback) {
        this._logger.trace("_findObjIdInternal: Called");
        additionalParamsObj = additionalParamsObj || {};
        var children = candidateFunc(desc, additionalParamsObj.rootElem);
        if (additionalParamsObj.extraAOs)
            children = children.concat(additionalParamsObj.extraAOs);

        var filter = additionalParamsObj.filter || Util.identity;
        var filteredChildren = children.filter(filter);
        if (additionalParamsObj.learn) {
            filteredChildren = this._filterWebExtAOForLearn(filteredChildren);
        }
        return filterFunc(filteredChildren, desc, resultCallback);
    },

    findObjId: function (desc, candidateFunc, additionalParamsObj, resultCallback) {
        var self = this;

        additionalParamsObj = additionalParamsObj || {};
        this._findObjIdInternal(Description.filterAOList.bind(this), desc, candidateFunc, additionalParamsObj, function (resAOs) {
            if (resAOs.length > 0) {
                return resultCallback(self._removeDuplicateAOs(resAOs));
            }

            var potentialTargets = [];
            var shadowRoots = ShadowDomUtil.findAllShadowRoots(document, this._logger);

            if (shadowRoots.length == 0) {
                return resultCallback(self._removeDuplicateAOs(resAOs));
            }
            var multipleResponse = new MultipleResponses(shadowRoots.length);
            shadowRoots.forEach(function (shadowRoot) {
                additionalParamsObj.rootElem = shadowRoot;
                this._findObjIdInternal(Description.filterAOList.bind(this), desc, candidateFunc, additionalParamsObj, multipleResponse.callback(function (doneForAllShadowRoots, resAOsInShadowRoot) {
                    potentialTargets = potentialTargets.concat(resAOsInShadowRoot);
                    if (doneForAllShadowRoots) {
                        resultCallback(self._removeDuplicateAOs(potentialTargets));
                        return;
                    }
                }));
            }, this);

        }.bind(this));

    },

    findObjIdSync: function (desc, candidateFunc, additionalParamsObj) {
        additionalParamsObj = additionalParamsObj || {};
        var aos = this._findObjIdInternal(Description.filterAOListSync.bind(this), desc, candidateFunc, additionalParamsObj);

        var shadowRoots = ShadowDomUtil.findAllShadowRoots(document, this._logger);

        aos = Util.arrayReduce(shadowRoots, function (targetAOs, childElem) {
            additionalParamsObj.rootElem = childElem;
            return targetAOs.concat(this._findObjIdInternal(Description.filterAOListSync.bind(this), desc, candidateFunc, additionalParamsObj));
        }.bind(this), aos);
        return this._removeDuplicateAOs(aos);
    },

    filterAOList: function (aos, filter, resultCallback) {
        var resAOs = [];
        var attrsNum = Object.keys(filter).length;
        // If either collection OR attributes list is empty - return immediately
        if (aos.length * attrsNum === 0) {
            // Return passed AOs:
            //  - if it is empty - we return empty collections
            //  - if the attributes list is empty - we return the original AOs as all AOs match for all attributes (in empty way)
            resultCallback(aos);
            return;
        }
        var allAttrsResManager = new MultipleResponses(aos.length);
        aos.forEach(function (ao) {
            //transform the filter on couple of situations like:
            //attribute/ and style/
            var queryAttrs = this.transformFilter(filter);
            var aoQueryMsg = new Msg("QUERY_ATTR", ao.getID(), queryAttrs);
            ao.onMessage(aoQueryMsg, allAttrsResManager.callback(function (doneForAllAOs, aoQueryMsgRes) {
                this._logger.trace("filterAOList: Got following response message from the AO: ", aoQueryMsgRes);

                if (this._areAttrsEqual(aoQueryMsgRes._data, filter))
                    resAOs.push(ao);

                //now lets see if all our AOs got all their responses for their attributes and if so 
                //lets return the result.
                if (doneForAllAOs)
                    resultCallback(resAOs);
            }.bind(this)));
        }, this);

    },
    filterAOListSync: function (aos, filter) {
        var attrsNum = Object.keys(filter).length;
        // If either collection OR attributes list is empty - return immediately
        if ((aos.length === 0) || (attrsNum === 0)) {
            // Return passed AOs:
            //  - if it is empty - we return empty collections
            //  - if the attributes list in empty - we return the original AOs as all AOs match for all attributes (in empty way)
            return aos;
        }

        var resAOs = aos.filter(function (ao) {
            //transform the filter on couple of situations like:
            //attribute/ and style/
            var queryAttrs = this.transformFilter(filter);

            var attrsValResult = ao.QueryAttributesSync(queryAttrs);
            this._logger.trace("filterAOList: Got the following response message from the AO: ", attrsValResult);

            return this._areAttrsEqual(attrsValResult, filter);
        }, this);

        return resAOs;
    },
    /**
     * Compares and returns whether two attribute objects are equal 
     * @param {Object} attrVals - Object containing web attributes and their values
     * @param {Object} otherAttrVals - Other attributes object
     * @returns {Boolean} True if the two attribute objects have equal values, False otherwise
     */
    _areAttrsEqual: function (attrVals, otherAttrVals) {
        var notEqual = Object.keys(attrVals).some(function (attrName) {
            var matched = false;
            var attrValue = attrVals[attrName];
            var otherAttrValue = otherAttrVals[attrName];

            //checks if we got an attrName related matching like micclass, attribute, etc.
            if (this._MatchFunctions[attrName])
                matched = this._MatchFunctions[attrName](attrValue, otherAttrValue, this._logger);
            else
                matched = this._MatchFunctions.matchByValType(attrValue, otherAttrValue, this._logger);

            if (!matched)
                return true;    //stop we failed to match this AO
        }, this);

        return !notEqual;
    },
    transformFilter: function (filter) {
        var res_filter = {};
        Object.keys(filter).forEach(function (field) {
            switch (field) {
                //ignore attr that doesn't has WEB_ATTR_NAME mapped, so chrome will receive "" as the name of the attr.
                case "":
                case "url without form data":
                    break;
                case "WEB_PN_ID":
                    //property "id" is mapped as WEB_PN_ID as property id,which will be parsed as "WEB_PN_ID" in WebJsonParser.
                    //so here the string "WEB_PN_ID" may be represented as property "id" which should be added in the filter.
                    if (typeof filter.WEB_PN_ID === "string" || filter.WEB_PN_ID && filter.WEB_PN_ID.isRegExp) {
                        res_filter.WEB_PN_ID = filter.WEB_PN_ID;
                    }
                    break;
                case "attribute":
                case "style":
                    // when using DP, ("attribute/key1:=value1", "attribute/key2:=value2") by default
                    // will be converted to [ [{isRegExp: true, regExQuery: key1}, {isRegExp: true, regExQuery: value1}],  [{isRegExp: true, regExQuery: key2}, {isRegExp: true, regExQuery: value2}] ]
                    var attr_pairs = filter[field];
                    res_filter[field] = [];
                    attr_pairs.forEach(function (attr_pair) {
                        var attributeName = attr_pair[0].regExQuery || attr_pair[0];
                        res_filter[field].push(attributeName);
                    });
                    break;
                default:
                    res_filter[field] = filter[field];
                    break;
            }
        });
        return res_filter;
    },

    getElementsByXpath: function (xpath, rootElem) {
        var root = rootElem || document;
        var it = document.evaluate(xpath, root, null, XPathResult.ANY_TYPE, null);
        var elements = [];
        var e;
        while (e = it.iterateNext()) {
            elements.push(e);
        }

        //if elements is empty, try to use the namespace to get element from xpath.
        if (elements.length === 0) {
            function resolverNamespace() {
                if (root === document)
                    return document.body.namespaceURI;
                else
                    return root.namesapceURI;
            }
            var namespaceXPath = Description._convertToNamespaceXPath(xpath);
            var it = document.evaluate(namespaceXPath, root,resolverNamespace,XPathResult.ANY_TYPE, null);
            while (e = it.iterateNext()) {
                elements.push(e);
            }
        }
        return elements
    },
    _convertToNamespaceXPath: function (xpath) {
        var xpathUnits = xpath.split("/");
        if (xpathUnits.length === 1)
            return xpath;
        var newUnit = xpathUnits.map(function (unit) {
            if (unit.length > 0) {
                var firstChar = unit.charAt(0);
                if ((firstChar >= 'a' && firstChar <= 'z') || (firstChar >= 'A' && firstChar <= 'Z'))
                    unit = "uft:" + unit;
            }
            return unit;
        });
        return newUnit.join("/");
    },
    _Selectors: [ // Map special properties to their selector functions
           function (desc, output, rootElem) { // html tag
               var name = 'html tag';
               if (!desc[name])
                   return;

               // If an XPath or CSS were specified it's probably faster not to intersect with tagName
               if (desc.xpath || desc.css)
                   return;

               if (desc[name].isRegExp)
                   return;
               var root = rootElem || document;
               var elements = [];
               elements = Util.makeArray(!root.getElementsByTagName ? root.querySelectorAll(desc[name]) : root.getElementsByTagName(desc[name]));
               output.push(elements);
               delete desc[name];
           },
         function (desc, output, rootElem) { // xpath
             var name = 'xpath';
             if (!desc[name])
                 return;

             var expression = desc[name].regExQuery || desc[name]
             var elements = Description.getElementsByXpath(expression, rootElem);
             delete desc[name];

             output.push(elements);
         },
           function (desc, output, rootElem) { // css
               var name = 'css';
               if (!desc[name])
                   return;

               var root = rootElem || document;
               var elements = [];
               elements = Util.makeArray(root.querySelectorAll(desc[name].regExQuery || desc[name]));
               output.push(elements);
               delete desc[name];
           }
    ],
    GetCandidateElements: function (desc, rootElem) { // Return raw elements that fit the special selector properties
        var selectorsMatches = []; // array of arrays (each selector will add an array of matches)
        this._Selectors.forEach(function (selectorFunc) {
            selectorFunc(desc, selectorsMatches, rootElem); // func will do nothing if not relevant (e.g. property isn't in desc or regex tagName)
        });

        switch (selectorsMatches.length) {
            case 0: // no selector was applied, return all DOM elements
                var root = rootElem || document;
                return Util.makeArray(!root.getElementsByTagName ? root.querySelectorAll('*') : root.getElementsByTagName('*'));
            case 1:
                return selectorsMatches[0];
        }

        // There is more than one selector, get the intersection of all selectors
        // Algorithm: Each element holds the count of the times it was matched, then take only those that were always matched
        // This is O(N*K) where K is the number of selectors rather than the naive O(N^K)
        selectorsMatches.forEach(function (arr) {
            arr.forEach(function (elem) {
                elem._FitSelectorCount = (elem._FitSelectorCount || 0) + 1;
            });
        });

        var ret = selectorsMatches[0].filter(function (elem) { return elem._FitSelectorCount === selectorsMatches.length; });

        // Remove count property
        selectorsMatches.forEach(function (arr) {
            arr.forEach(function (elem) {
                delete elem._FitSelectorCount;
            });
        });

        return ret;
    },
    GetCandidateAOsForContent: function (parentID, optionalRootElem, desc, shadowRootElem) {
        rootElem = shadowRootElem || optionalRootElem;
        var elements = this.GetCandidateElements(desc, rootElem);
        var micclass;
        if (desc)
            micclass = desc['micclass'];
        return elements.map(function (e) { return content.kitsManager.createAO(e, parentID, false, micclass); });
    },
    _MatchFunctions: {
        matchByValType: function (actualVal, expectedVal, logger) {
            if (Util.isNullOrUndefined(actualVal) || Util.isNullOrUndefined(expectedVal))
                return false;

            if (AttrPartialValueUtil.IsPartialValue(expectedVal))
                return this.partialValueMatch(actualVal, expectedVal, logger);

            if (Util.isRect(expectedVal))
                return this.rectangleMatch(actualVal, expectedVal, logger);

            if (expectedVal.isRegExp)
                return this.regExMatch(actualVal, expectedVal, logger);

            return this.stringVals(actualVal, expectedVal, logger);

        },
        micclass: function (actualVal, expectedVal, logger) {
            //Gets the value that needs to be matched since it can be regular value or regular expression (descriptive programming)
            expectedVal = expectedVal.regExQuery || expectedVal;
            expectedVal = expectedVal.toUpperCase();
            actualVal = Array.isArray(actualVal) ? actualVal : [actualVal];
            var filtered = actualVal.filter(function (actualMicClass) {
                return actualMicClass.toUpperCase() === expectedVal;
            });
            var match = filtered.length > 0;
            if (logger)
                logger.debug("_MatchFunctions.micclass: perform case-insensitive check between '", actualVal, "' and '", expectedVal, "'. Match: ", match);
            return match;
        },
        regExMatch: function (actualVal, expectedVal, logger) {
            if (logger)
                logger.debug("matchAttr: Match is regular expression with:", expectedVal.regExQuery);
            // regExp should match the whole property string here
            return Util.valMatchReg(actualVal, expectedVal.regExQuery);
        },
        rectangleMatch: function (actualVal, expectedVal/*, logger*/) {
            return Util.isEqualRects(expectedVal, actualVal);
        },
        partialValueMatch: function (actualVal, expectedVal, logger) {
            if (!AttrPartialValueUtil.IsPartialValue(actualVal) || !AttrPartialValueUtil.IsPartialValue(expectedVal))
                return false;

            return this.matchByValType(AttrPartialValueUtil.GetValue(actualVal), AttrPartialValueUtil.GetValue(expectedVal), logger);
        },
        attribute: function (actualVal, expectedVal, logger) {
            return this.matchAttributeOrStyle(actualVal, expectedVal, logger);
        },
        style: function (actualVal, expectedVal, logger) {
            return this.matchAttributeOrStyle(actualVal, expectedVal, logger);
        },
        matchAttributeOrStyle: function (actualVal, expectedVal, logger) {
            actualVal = Array.isArray(actualVal) ? actualVal : [actualVal];
            expectedVal = Array.isArray(expectedVal) ? expectedVal : [expectedVal];
            Util.assert(actualVal.length === expectedVal.length, "There are different number of values in actual from expected", logger);
            var failed = expectedVal.some(function (expectedPropVal, propIndex) {
                expectedPropVal = expectedPropVal && expectedPropVal[1];
                var propValMatched = this.matchByValType(actualVal[propIndex], expectedPropVal, logger);
                if (!propValMatched)
                    return true;        //stop!
            },
                this);

            return !failed;
        },
        stringVals: function (actualVal, expectedVal/*, logger*/) {
            if (actualVal.trim)
                actualVal = actualVal.trim();
            if (expectedVal.trim)
                expectedVal = expectedVal.trim();
            if (actualVal.toUpperCase && expectedVal.toUpperCase)
                return actualVal.toUpperCase() === expectedVal.toUpperCase();
            else
                return actualVal === expectedVal;

        },
        /**
         The type of "disabled" is defined as boolean globally by UFT, but for web we are using 0/1.
         So here we shall compare the case that the value is either number or boolean.
        */
        disabled: function (actualVal, expectedVal/*, logger*/) {
            return actualVal == expectedVal;
        }
    },
    buildReturnMsg: function (msgType, to, aos, logger) {
        var resMsg = new Msg(msgType, to, { WEB_PN_ID: [] });

        switch (aos.length) {
            case 0:
                if (logger)
                    logger.trace("buildReturnMsg: Object not found");
                resMsg._data.WEB_PN_ID = [];
                resMsg.status = "ObjectNotFound";
                break;
            case 1:
                if (logger)
                    logger.trace("buildReturnMsg: Object is found");
                resMsg._data.WEB_PN_ID = [aos[0].getID()];
                break;
            default:
                resMsg._data.WEB_PN_ID = [];
                var id_set = {};
                for (var i = 0; i < aos.length; ++i) {
                    var id = aos[i].getID();
                    var strID = JSON.stringify(id);
                    // don't return duplicate ids
                    if (!id_set[strID]) {
                        id_set[strID] = true;
                        resMsg._data.WEB_PN_ID.push(id);
                    }
                }
                resMsg.status = resMsg._data.WEB_PN_ID.length > 1 ? "ObjectNotUnique" : "OK";
        }
        return resMsg;
    },

    /**
	* Returns an object containing a name and data, in which, the name is the property key (property name, for example: html tag, micclass ... etc.)  
	*  and the data is the metadata of the property (for example, for 'style/something' the result will be: {name: 'style', data: 'something'})
	* @param {String} the full name of the property, for normal properties it's the same as the property key. for complex properties like 'style/' and 'attribute/'
	*                  it's the 'style' and 'attribute' string. 
	* @returns {Object} Object containing the parsed information from the property name. The object has two keys: 'name' which is the property key ('style' or 'attribute')
	*                  and 'data' which is the metadata of the property (for 'style/bgcolor' it's equal to 'bgcolor').
	*/
    getAttributeInfo: function (propertyFullName) {
        var seperatorIndex = propertyFullName.indexOf("/");

        if (seperatorIndex < 0)
            return { name: propertyFullName.toLowerCase(), data: null };

        return {
            name: propertyFullName.substring(0, seperatorIndex).toLowerCase(),
            data: propertyFullName.substring(seperatorIndex + 1)
        };
    },

    /**
	* Creates an Object with all attributes as Keys 
	* @param {Object} identificationAttributesObj - An object with attributes devided into 4 arrays:
	*                      mandatory / assistive / baseFilter / optionalFilter
	* @param {Object} [attributeCategory] - attribute category - can be one of the values: mandatory / assistive / baseFilter / optionalFilter
	*                      or an array combining the values
	* @returns {Object} Object represents a set of all attributes
	*/
    _getAttrsFromIdentificationProps: function (identificationAttributesObj, attributeCategory) {
        this._logger.trace('_getAttrsFromIdentificationProps: started');

        var attrTypeKeys;
        if (attributeCategory)
            attrTypeKeys = Array.isArray(attributeCategory) ? attributeCategory : [attributeCategory];
        else
            attrTypeKeys = ["mandatory", "assistive", "baseFilter", "optionalFilter"];

        var attrObj = {};
        attrTypeKeys.forEach(function (attrType) {
            identificationAttributesObj[attrType].forEach(function (attr) {
                attrObj[attr] = null;
            }, this);
        }, this);

        return attrObj;
    },

    createRecordDescription: function (agentObject, objIdentificationProps) {
        this._logger.trace("createRecordDescription: started");

        var descriptionObj = {};

        var micclass = Util.getMicClass(agentObject);

        // Add Logical Name
        descriptionObj["logical name"] = this._getLogicalName(agentObject);

        descriptionObj.properties = this._getMandatoryProperties(agentObject, objIdentificationProps);

        // remove properties that with {null} value.
        // According to IE/FF logic, the property that has null value is not inserted as part of the TO.
        for (var key in descriptionObj.properties) {
            if (Util.isNullOrUndefined(descriptionObj.properties[key]))
                delete descriptionObj.properties[key];
        }

        var aoArr = [];

        // Frame TO's not mandatory description is calculated in Page.js (Extension)
        // Page not mandatory description is irrelevant (there's always one page !)
        // Browser's not mandatory description is calculated in the Package side since that there could be multiple browsers opened
        if (!Util.isContainerMicclass(micclass)) {
            //Selectors can remove keys from description, so use Util.shallowObjectClone(descriptionObj.properties) to avoid changing the input descriptionObj.properties.
            aoArr = Description.GetIDsByDescriptionSync(Util.shallowObjectClone(descriptionObj.properties), Description.GetCandidateAOsForContent.bind(Description, agentObject.getID(), null), null);
            Util.assert(aoArr.length > 0, "createRecordDescription: mandatory description returned no matches for micclass: " + micclass, this._logger);
            this._logger.trace('createRecordDescription: Received AO # ', aoArr.length);
        }
        else if (Util.isFrame(micclass) || micclass === "Browser") {
            // For frame objects, add the assistive properties always. The page will filter them out.
            var assistiveAttrsObj = Description._getAttrsFromIdentificationProps(objIdentificationProps, "assistive");
            if (Object.keys(assistiveAttrsObj).length > 0) {
                assistiveAttrsObj = agentObject.QueryAttributesSync(assistiveAttrsObj);

                Util.extend(descriptionObj.properties, assistiveAttrsObj);
            }
        }

        if (aoArr.length > 1) {
            var aoArrWithAssistive = this._getAOArrayWithAssistiveProperties(descriptionObj.properties, agentObject, objIdentificationProps);
            if (aoArrWithAssistive !== null)
                aoArr = aoArrWithAssistive;
            this._logger.trace("createRecordDescription: Added Assistive properties to description: ", descriptionObj);

            Util.assert(aoArr.length > 0, "createRecordDescription: after assistive description, GetIDsByDescriptionSync returned no matches for micclass: " + micclass, this._logger);
        }

        if ((aoArr.length > 1) || Util.isFrame(micclass)) { // for frame we always add a selector
            descriptionObj.selector = this._getSelector(objIdentificationProps.selector, agentObject, aoArr);
        }

        descriptionObj["smart identification properties"] = this._getSmartIdProperties(objIdentificationProps, agentObject);

        descriptionObj["additionalInfo"] = this._getAdditionalInfoProperties(objIdentificationProps, agentObject);

        if (this._isXpathSupported(agentObject))
            descriptionObj.properties._xpath = agentObject.GetAttrSync("_xpath");

        // We always want the micclass
        descriptionObj.properties.micclass = micclass;

        return SpecialObject.CreateDescription(descriptionObj);
    },

    createTestObjectDescription: function (agentObject, objIdentificationProps, callback) {
        this._logger.trace("createTestObjectDescription: started");

        var descSpecialObject = Description.createRecordDescription(agentObject, objIdentificationProps);
        var description = descSpecialObject.description;
        this._logger.info("Test object original description:", description);

        if (Util.isFrame(Util.getMicClass(agentObject))) {
            var msg = new Msg("SRVC_FIX_FRAME_DESCRIPTION", agentObject.getID(), { description: description, objIdentificationProps: { frame: objIdentificationProps } });
            agentObject.onMessage(msg, function (resMsg) {
                descSpecialObject.description = resMsg._data.description;
                callback(descSpecialObject);
            }.bind(this));
            return;
        } else {
            this._fixPartialValuesForDescription(agentObject, description, function (updatedDescription) {
                descSpecialObject.description = updatedDescription;
                callback(descSpecialObject);
            });
        }
    },

    _fixPartialValuesForDescription: function (agentObject, description, callback) {
        this._logger.trace("_fixPartialValuesForDescription: started");

        var queryAttrObj = {};
        Object.keys(description.properties).forEach(function (prop) {
            if (AttrPartialValueUtil.IsPartialValue(prop))
                queryAttrObj[prop] = null;
        });

        Object.keys(description["smart identification properties"]).forEach(function (prop) {
            if (AttrPartialValueUtil.IsPartialValue(prop))
                queryAttrObj[prop] = null;
        });
        this._logger.trace("PartialValue is queryAttrObj = ", queryAttrObj);

        if (Object.keys(queryAttrObj).length == 0) {
            callback(description);
        }
        else {
            var queryAttrMsg = new Msg("QUERY_ATTR", agentObject.getID(), queryAttrObj);
            agentObject.onMessage(queryAttrMsg, function (resMsg) {
                Object.keys(resMsg._data).forEach(function (propName) {
                    if (description.properties[propName])
                        description.properties.propName = resMsg._data.propName;
                    if (description["smart identification properties"].propName)
                        description["smart identification properties"].propName = resMsg._data.propName;
                });
                callback(description);
            });
        }
    },

    _isXpathSupported: function (agentObject) {
        if (!Util.isContainerMicclass(Util.getMicClass(agentObject)) && Util.isNullOrUndefined(agentObject._control)) //if agentObject._control, this agentObject is a WebExtAO. Thus WebExtAOs don't need _xpath. 
            return true;
        return false;
    },

    createEmptyRecordDescription: function (ao) {
        this._logger.trace("createEmptyRecordDescription: called");
        var micclass = Util.getMicClass(ao);

        return {
            "logical name": micclass,
            "smart identification properties": {},
            properties: {
                micclass: micclass
            },
            selector: null
        };
    },

    _getMandatoryProperties: function (agentObject, objIdentificationProps) {
        this._logger.trace("_getMandatoryProperties: called");

        var micclass = Util.getMicClass(agentObject);

        // Get Attributes for current micclass
        var mandatoryAttrsObj = Description._getAttrsFromIdentificationProps(objIdentificationProps, "mandatory");

        // Mandatory Attributes object
        mandatoryAttrsObj = agentObject.QueryAttributesSync(mandatoryAttrsObj);
        Object.keys(mandatoryAttrsObj).forEach(function (key) { // Remove invalid properties
            if (this._invalidForDescription(mandatoryAttrsObj[key]))
                delete mandatoryAttrsObj[key];
        }, this);
        mandatoryAttrsObj.micclass = micclass;

        return mandatoryAttrsObj;
    },

    _getLogicalName: function (agentObject) {
        this._logger.trace("_getLogicalName: called");

        var logicalName = agentObject.GetAttrSync("logical name") || "";

        logicalName = logicalName.trim();
        if (logicalName.length === 0) {
            return Util.getMicClass(agentObject);
        }
        // This piece of code is "inspired" by the logic in CObjectManager::FixLogicalName()
        logicalName = logicalName.substring(0, 30); // 30 = DEFAULT_MAX_LOG_NAME_LEN
        var indexOfWhitespace = logicalName.indexOf(" ", 21); // 20 = DEFAULT_MAX_LOG_NAME_LEN_CUT_WORD, so we start at 20 + 1
        if (indexOfWhitespace >= 0)
            logicalName = logicalName.substring(0, indexOfWhitespace);

        logicalName = logicalName.replace(/\"/g, "'");
        logicalName = logicalName.replace(/:=/g, ':-');
        logicalName = logicalName.replace(/@@/g, '@-');

        return logicalName;
    },

    _getSelector: function (selector, agentObject, candidateAoArr) {
        this._logger.trace("_getSelector: called for selector: ", selector);

        var selectorValue;
        if (selector === "index")
            selectorValue = Description._getIndexOrdinal(agentObject, candidateAoArr);
        else
            this._logger.error("_getSelector default case for selector ", selector);

        this._logger.trace("_getSelector: Adding Selector '", selector, "' with value: ", selectorValue);
        return { name: selector, value: selectorValue };
    },

    _isForceAddingFrameSelector: function () {
        // if we have child frames we assume that they might have the same description as the current frame, 
        // and since we can't really ask them, we simply force adding a selector for the current frame
        return window.frames.length > 0;
    },

    _getIndexOrdinal: function (agentObject, candidateAoArr) {
        this._logger.trace("_getIndexOrdinal: called.");

        var rtidToFind = agentObject.getID();
        var micclass = Util.getMicClass(agentObject);
        if (Util.isFrame(micclass)) {
            // For frame element we always add a selector and the Page will remove it if it's not needed.
            // forceSelector indicates to the page that it should always add a selector even though it's logic might indicate otherwise
            return AttrPartialValueUtil.WrapValue("index", null, { frameRtid: rtidToFind, forceSelector: this._isForceAddingFrameSelector() });
        }

        var index = Util.arrayFindIndex(candidateAoArr, function (elem) {
            return RtIdUtils.IsRTIDEqual(rtidToFind, elem.getID());
        }, this);

        Util.assert(index !== -1, "_getIndexOrdinal: finding the index of the runtime id failed", this._logger);

        return index;
    },

    _getAOArrayWithAssistiveProperties: function (propertiesObj, agentObject, objIdentificationProps) {
        this._logger.trace("_getAOArrayWithAssistiveProperties: called");

        var assistiveAttrNamesArr = objIdentificationProps.assistive;

        var length = assistiveAttrNamesArr.length;
        var aoArr = null;
        for (var i = 0; i < length; i++) {
            var attr = assistiveAttrNamesArr[i];
            var attrVal = agentObject.GetAttrSync(attr);
            if (this._invalidForDescription(attrVal))
                continue;

            propertiesObj[attr] = attrVal;

            aoArr = Description.GetIDsByDescriptionSync(Util.shallowObjectClone(propertiesObj), Description.GetCandidateAOsForContent.bind(Description, agentObject.getID(), null), null);
            Util.assert(aoArr.length > 0, "_getAssistiveProperties: GetIDsByDescriptionSync returned no matches for attrs: " + JSON.stringify(propertiesObj), this._logger);
            if (aoArr.length === 1) // we're done adding assistive properties
                break;
        }
        return aoArr;
    },

    _invalidForDescription: function (value) {
        // We can't use non-null object values for description since (unlike strings/values) they are equal only to themselvs (e.g. SVG.className)
        return value && typeof (value) === "object";
    },

    _getSmartIdProperties: function (objIdentificationProps, agentObject) {
        this._logger.trace("_getSmartIdProperties: called.");

        var smartIdProps = Description._getAttrsFromIdentificationProps(objIdentificationProps, ["baseFilter", "optionalFilter"]);

        smartIdProps = agentObject.QueryAttributesSync(smartIdProps);
        smartIdProps.micclass = Util.getMicClass(agentObject);

        return smartIdProps;
    },

    _getAdditionalInfoProperties: function (objIdentificationProps, agentObject) {
        this._logger.trace("_getAdditionalInfoProperties: called.");
        var additionalInfoProps = {};
        if (objIdentificationProps.additionalInfo) {
            additionalInfoProps = Description._getAttrsFromIdentificationProps(objIdentificationProps, ["additionalInfo"]);
            additionalInfoProps = agentObject.QueryAttributesSync(additionalInfoProps);
        }

        return additionalInfoProps;
    },
    /*
     * To filter by WebExtAO's tag Learn, this method will delete the ao which do not need to learn.
     * According to code processing tag learn in QTWebInfra, it process children at first then process parent. 
     * Here use the same logic to filter the aoList in reverse order.
     *
     * - For WebExtAO:
     *   Control Learn Type - Yes/No/IfChildren
     *      Yes: learn this AO
     *      No: do not learn this AO
     *      IfChildren: learn this AO when it has any valid child.
     *   Children Learn Type - Yes/No/LetMeSupply
     *      Yes: learn children AOs (created based on this AO's children elements)
     *      No: do not learn children AOs
     *      LetMeSupply: learn only the children AOs that this AO supplied by a function
     * - For general AO: both control learn type and children learn type is Yes
     * 
     * The assumption is that aoList is a flattening of the DOM so that all children of an element come after it in the aoList
     */
    _filterWebExtAOForLearn: function (aoList) {

        // Process LearnChildren flag: 
        // No - mark children as 'to delete'.
        // LetMeSupply - mark children not in supply list as 'to delete'.
        // 
        aoList = aoList.reverse();
        var aoDeleteMask = [];
        for (var index = 0; index < aoList.length; ++index) {
            var ao = aoList[index];
            var childrenLearnType = ao.getChildrenLearnType();
            switch (childrenLearnType) {
                case ChildrenLearnType.No:
                    for (var i2 = 0; i2 < index; ++i2) {
                        var ao2 = aoList[i2];
                        if (!aoDeleteMask[i2] && Util.nodeContains(ao._elem, ao2._elem)) {
                            aoDeleteMask[i2] = true;
                        }
                    }
                    break;
                case ChildrenLearnType.LetMeSupply:
                    var childrenSupplied = ao.getChildrenForLearn(ao._elem) || [];
                    for (var i2 = 0; i2 < index; ++i2) {
                        var ao2 = aoList[i2];
                        if (!aoDeleteMask[i2] && Util.nodeContains(ao._elem, ao2._elem)) {
                            if (childrenSupplied.indexOf(ao2._elem) < 0) {
                                aoDeleteMask[i2] = true;
                            }
                        }
                    }
                    break;
            }
        }

        // Clear AOs marked as 'to delete'.
        aoList = aoList.filter(function (ao, index) { return !aoDeleteMask[index]; });

        aoDeleteMask = [];
        // Process LearnControlType:
        // No - mark as delete; 
        // IfChildren - verify if there are valid children.
        //
        for (var index = 0; index < aoList.index; ++index) {
            var ao = aoList[index];
            var controlLearnType = ao.getControlLearnType();
            switch (controlLearnType) {
                case ControlLearnType.No:
                    aoDeleteMask[index] = true;
                    break;
                case ControlLearnType.IfChildren:
                    var hasValidChild = false;
                    for (var i2 = 0; i2 < index; ++i2) {
                        if (!aoDeleteMask[i2] && Util.nodeContains(ao._elem, aoList[i2]._elem)) {
                            hasValidChild = true;
                            break;
                        }
                    }
                    aoDeleteMask[i2] = !hasValidChild;
                    break;
            }
        }

        // Clear AOs marked as 'to delete'.
        aoList = aoList.filter(function (ao, index) { return !aoDeleteMask[index]; });

        return aoList.reverse();
    }
};
