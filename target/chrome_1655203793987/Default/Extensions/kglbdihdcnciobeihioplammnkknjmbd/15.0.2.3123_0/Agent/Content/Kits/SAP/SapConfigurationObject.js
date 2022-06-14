var sapConfigFlags = {
    RegComparing: 1,
    Exist: 2,
    Negate: 4,
    CaseInsensitive: 8,
    MultipleValues: 16,
    CustomDomAttribute: 32,
    JumpToAnotherFilter: 64,
    DomProperty: 128,
    WindowProperty: 256,
    StyleAttribute: 512,
    SubString: 1024
};

var SapConfigurationUtil = {

    logger: new LoggerUtil("SapConfigurationUtil"),

    isElementOfSpecifier: function (elem, sapObjfilter) {
        if (elem == null)
            return false;

        var filters = sapConfig[sapObjfilter];
        if (Util.isNullOrUndefined(filters))
            return false;

        // TODO: give quick check higher priority.
        var match = filters.every(function (filter) {
            var attributeName = filter.Name;
            var values = filter.Value;
            var flags = parseInt(filter.Flags);
            flags = Util.isNullOrUndefined(flags) ? 0 : flags;
            return SapConfigurationUtil._isElementOfSpecComponent(elem, attributeName, values, flags);
        });
        if (match) {
            SapConfigurationUtil.logger.debug("SapConfigurationObject.isElementOfSpecifier" + "for elem" + elem.tagName, "with configFilter" + JSON.stringify(sapObjfilter));
            return true;
        } else
            return false;
    },

    filterCollection: function (elem, sapObjfilter) {
        if (elem == null)
            return [];

        SapConfigurationUtil.logger.debug("SapConfigurationObject.filterCollection " + "for elem " + elem.tagName, "with configFilter" + JSON.stringify(sapObjfilter));

        var items;
        if (elem.length == undefined)//elem is a html element or document
            items = elem.getElementsByTagName("*");
        else//elem is a html collection
            items = elem;
        // TODO: filter for tag name.
        var vectorElements = [];
        for (var i = 0; i < items.length; i++) {
            if (this.isElementOfSpecifier(items[i], sapObjfilter))
                vectorElements.push(items[i]);
        }
        return vectorElements;
    },

    getContainerElement: function (elem, sapObjfilter, maxLevel = 10) {
        //Align with C++ implementation.
        maxLevel += 1;
        while (elem != null && elem.tagName != null && maxLevel-- >= 0) {
            if (this.isElementOfSpecifier(elem, sapObjfilter)) {
                SapConfigurationUtil.logger.debug("SapConfigurationObject.getContainerElement " + "for elem " + elem.tagName + " up to " + maxLevel + " levels", "with configFilter" + JSON.stringify(sapObjfilter));
                return elem;
            }
            elem = elem.parentNode;
        }
        return null;
    },

    getContainerElementOfSpecifiers: function (elem, sapObjfilters, maxLevel = 10) {
        for (var i = 0; i < sapObjfilters.length; i++) {
            var ret = this.getContainerElement(elem, sapObjfilters[i], maxLevel);
            if (ret != null)
                return { "element": ret, "specifier": sapObjfilters[i] };
        }
        return null;
    },

    getElementOfCollection: function (elem, sapObjfilter) {
        if (elem == null)
            return null;

        var items = elem.length != null ? elem : elem.getElementsByTagName("*");
        // TODO: filter for tag name.
        for (i = 0; i < items.length; i++) {
            if (items[i] != null && this.isElementOfSpecifier(items[i], sapObjfilter)) {
                SapConfigurationUtil.logger.debug("SapConfigurationObject.getElementOfCollection " + "for elem " + elem.tagName, "with configFilter" + JSON.stringify(sapObjfilter));
                return items[i];
            }
        }
    },

    getSpecifierValue: function (sapObjfilter, name) {
        var filters = sapConfig[sapObjfilter];
        if (filters == null)
            return null;
        var target = filters.find(filter => filter.name == name);
        if (target != null)
            return target.value;
    },

    getItemContainingSpecifierText: function (elements, sapObjfilter) {
        if (elements == null || elements.length == 0)
            return null;

        var value = this.getSpecifierValue(sapObjfilter, "Value");
        if (value == null)
            return null;

        for (var i = 0; i < elements.length; i++) {
            if (elements[i].outerHTML.indexOf(value) >= 0)
                return elements[i];
        }
    },

    findElement: function (pDoc, flags) {
        if (pDoc == null) return null;
        var elVector = SapConfigurationUtil.filterCollection(pDoc, flags);
        if (elVector.length == 0) return null;
        return elVector[0];
    },

    GetFramesFromDocument: function (elem) {
        var elem_document = elem.ownerDocument;//elem inside document
        if (elem.tagName == 'FRAME' || elem.tagName == 'IFRAME')
            elem_document = elem.contentDocument//elem outside document
        if (!!elem_document) {
            var pFramesCollection = elem_document.getElementsByTagName('FRAME');
            // FRAME and IFRAME can't be in the same document 
            // Search for "IFRAME" tag within this collection 
            if (pFramesCollection.length == 0)
                pFramesCollection = elem_document.getElementsByTagName('IFRAME');
            //querySelectorAll will return a NodeList which is read-only
            //so that we need transfer it to array
            Array.from(pFramesCollection);
            var FramesVector = [];
            // add to vector all frames if exist
            if (pFramesCollection.length > 0) {
                for (var i = 0; i < pFramesCollection.length; i++) {
                    FramesVector = Array.prototype.concat(
                        FramesVector,
                        pFramesCollection[i],
                        SapConfigurationUtil.GetFramesFromDocument(pFramesCollection[i]));
                }
            }
        }

        return FramesVector;
    },

    _isElementOfSpecComponent: function (elem, attributeName, values, flags) {
        if (elem == null)
            return null;

        var reVal = false;

        if (flags & sapConfigFlags.JumpToAnotherFilter) {

            if (flags & sapConfigFlags.MultipleValues) {
                if (typeof values == "string")
                    values = values.split('|');

                reVal = values.some(function (value) {
                    return SapConfigurationUtil.isElementOfSpecifier(elem, value);
                });
            } else
                reVal = SapConfigurationUtil.isElementOfSpecifier(elem, values);
        } else {

            var val = SapConfigurationUtil._getHTMLObjectPropValue(elem, attributeName, flags);

            if (flags & sapConfigFlags.Exist) {
                if (Util.isNullOrUndefined(val))
                    reVal = false;
                else
                    reVal = true;
            } else {
                if (Util.isNullOrUndefined(val) || typeof val != "string")
                    ret = false;
                else if (flags & sapConfigFlags.MultipleValues) {
                    if (typeof values == "string")
                        values = values.split('|');
                    reVal = values.some(function (value) {
                        return SapConfigurationUtil._compareValue(val, value, flags) == true;
                    });
                } else
                    reVal = SapConfigurationUtil._compareValue(val, values, flags);
            }
        }

        if (flags & sapConfigFlags.Negate)
            return !reVal;

        // if (reVal)
        //     SapConfigurationUtil.logger.debug("SapConfigurationObject._isElementOfSpecComponent" + "for elem" + elem.tagName + "with attributeName" + attributeName + "for values" + values + "with flags" + flags);

        return reVal;
    },

    _getHTMLObjectPropValue: function (elem, attributeName, flags) {
        if (elem == null)
            return null;

        var reVal = null;
        if (flags & sapConfigFlags.WindowProperty)
            reVal = SapConfigurationUtil._getWindowPropValue(elem, attributeName);
        else if (flags & sapConfigFlags.DomProperty)
            reVal = SapConfigurationUtil._getDocumentPropValue(elem, attributeName);
        else
            reVal = SapConfigurationUtil._getElementPropValue(elem, attributeName, flags);

        // if (reVal != null)
        //     SapConfigurationUtil.logger.debug("SapConfigurationObject._getHTMLObjectPropValue" + "for elem" + elem.tagName + "with attributeName" + attributeName + "with flags" + flags);

        return reVal;
    },

    _getDocumentPropValue: function (elem, attributeName) {
        if (elem == null)
            return null;

        var reval = null;
        var documentInContext = elem.ownerDocument;
        if (!Util.isNullOrUndefined(documentInContext)) {
            if (attributeName.toUpperCase() == "URL") {
                reval = document.location.href;
            }
        }

        if (reval != null)
            SapConfigurationUtil.logger.debug("SapConfigurationObject._getDocumentPropValue" + "for elem" + elem.tagName + "with attributeName" + attributeName);

        return reval;
    },

    _getWindowPropValue: function (elem, attributeName) {
        // elem needed???
        if (elem == null)
            return null;

        var reval = null;

        if (attributeName.toUpperCase() == "NAME") {
            //For chrome to get the elem(frame) name as the window name
            //reval = window.name;
            reval = elem.name;
            SapConfigurationUtil.logger.debug("SapConfigurationObject._getWindowPropValue" + "for elem" + elem.tagName + "with attributeName" + attributeName + " = " + reval);
        }

        return reval;
    },

    _getElementPropValue: function (elem, attributeName, flags) {
        if (elem == null)
            return null;

        var reval = null;
        if (!Util.isNullOrUndefined(elem)) {
            if (flags & sapConfigFlags.CustomDomAttribute) {
                var attr = elem.attributes[attributeName];
                if (attr != null)
                    reval = attr.value;
            } else if (flags & sapConfigFlags.StyleAttribute) {
                var styles = elem.styles;
                reval = elem[attributeName]
            } else if (flags & sapConfigFlags.StyleAttribute) {
                var styles = elem.styles;
                reval = elem[attributeName]
            } else if (attributeName.toUpperCase() == "CLASSNAME") {
                reval = elem.className;
            } else if (attributeName.toUpperCase() == "TAGNAME") {
                reval = elem.tagName;
            } else if (attributeName.toUpperCase() == "ID") {
                reval = elem.id;
            } else if (attributeName.toUpperCase() == "OUTERHTML") {
                reval = elem.outerHTML;
            } else if (attributeName.toUpperCase() == "INNERHTML") {
                reval = elem.innerHTML;
            } else if (attributeName.toUpperCase() == "INNERTEXT") {
                reval = elem.innerText;
            }
        }

        //SapConfigurationUtil.logger.debug("SapConfigurationObject._getElementPropValue" + "for elem" + elem.tagName + "with attributeName" + attributeName + "with flags" + flags + " with value = " + reval);

        return reval;
    },

    _compareValue: function (value1, value2, flags) {

        //SapConfigurationUtil.logger.debug("SapConfigurationObject._compareValue" + "for value1" + value1 + "value2" + value2 + "with flags" + flags);
        if (Util.isNullOrUndefined(value1) && Util.isNullOrUndefined(value2))
            return true;

        if (flags & sapConfigFlags.RegComparing)
            return Util.valMatchReg(value1, value2);

        if (flags & sapConfigFlags.CaseInsensitive) {
            value1 = value1.toUpperCase();
            value2 = value2.toUpperCase();
        }

        if (flags & sapConfigFlags.SubString)
            return value1.includes(value2);
        else
            return value1 == value2;
    }
}