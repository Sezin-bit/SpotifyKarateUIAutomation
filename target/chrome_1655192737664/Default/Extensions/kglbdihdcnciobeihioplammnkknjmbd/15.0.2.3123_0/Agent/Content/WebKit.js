var WebKit = {
    _logger: new LoggerUtil("Content.WebKit"),
    _tagsToBreakInterestingAOLoop: [],
    name: "WebKit",
    priority: 0,
    createAO: function (element, parentID, noDefault) {
        this._logger.trace(function() { return "createAO: creating AO for element " + element.tagName; });
        var tagName =  element.tagName;
        if(Util.isNullOrUndefined(tagName))
            tagName = "";
        tagName = tagName.toUpperCase();

        if (tagName === "OPTION") {// Don't create AO for OPTION, needed so spy won't think it's pointing at hidden option elements
            element = element.parentNode;
            tagName = element.tagName.toUpperCase();
        }
        var ao = new AO(element, parentID);
        this._logger.trace("createAO: merging common behavior");
        ao.mergeBehavior(CommonBehavior);

        switch (tagName) {
            case "A":
                if (ao._isRealLink()) {
                    ao.mergeBehavior(LinkBehavior);
                } 
                else if (noDefault) { // not a real link and do not want to create default AO
                    return null;
                }
                break;
            case "IMG":
                ao.mergeBehavior(ImageBehavior);
                if (ao._getImageParentAnchor()) // image link
                    ao.mergeBehavior(ImageLinkBehavior);
                break;
            case "BUTTON":
                ao.mergeBehavior(ButtonBehavior);
                break;
            case "INPUT":
                switch (element.type) {
                    case "button":
                    case "submit":
                    case "reset":
                        ao.mergeBehavior(ButtonBehavior);
                        break;
                    case "text":
                        ao.mergeBehavior(EditBehavior);
                        break;
                    case "image":
                        ao.mergeBehavior(ImageBehavior);
                        break;
                    case "checkbox":
                        ao.mergeBehavior(CheckBoxBehavior);
                        break;
                    case "radio":
                        ao.mergeBehavior(RadioGroupBehavior);
                        // Save the element which caused the radio-group to be created (_elem is the active radio-button)
                        ao.refreshRadioGroup(ao._elem);
                        break;
                    case "file":
                        ao.mergeBehavior(FileInputBehavior);
                        break;
                    case "hidden":
                        if (noDefault)
                            return null;
                        break;
                    case "range":
                        ao.mergeBehavior(EditBehavior);
                        ao.mergeBehavior(RangeBaseBehavior);
                        ao.mergeBehavior(RangeBehavior);
                        break;
                    case "number":
                        ao.mergeBehavior(EditBehavior);
                        ao.mergeBehavior(RangeBaseBehavior);
                        ao.mergeBehavior(NumberBehavior);
                        break;
                    default:
                        ao.mergeBehavior(EditBehavior);
                        break;
                }
                break;
            case "TEXTAREA":
                ao.mergeBehavior(EditBehavior);
                break;
            case "SELECT":
                ao.mergeBehavior(ListBehavior);
                break;
            case "AREA":
                ao.mergeBehavior(AreaBehavior);
                break;
            case "TABLE":
                ao.mergeBehavior(TableBehavior);
                break;
            case "IFRAME":  //This will answer queryies from our child Frames.
            case "FRAME":
                ao.mergeBehavior(FrameBehavior);
                break;
            case "VIDEO":
                ao.mergeBehavior(MediaBaseBehavior);
                ao.mergeBehavior(VideoBehavior);
                break;
            case "AUDIO":
                ao.mergeBehavior(MediaBaseBehavior);
                ao.mergeBehavior(AudioBehavior);
                break;
            case "FORM":
                if (noDefault)
                    return null;
                ao.mergeBehavior(FormBehavior);
                break;
            case "OBJECT":
                if (noDefault)
                    return null;
                ao.mergeBehavior(PluginBehavior);
                break;
            case "SPAN":
            case "DIV":
                if (element.isContentEditable) {
                    this._logger.debug("createAO: This is a content editable element");
                    ao.mergeBehavior(ContentEditableBehavior);
                }
                else {
                    return noDefault ? null : ao;
                }
                break;
            default:
                if (noDefault) {
                    return null;
                }
        }

        return ao;
    },
    createPageAO: function (parentID) {
        var ao = this.createAO(document.documentElement, parentID);
        ao.mergeBehavior(FrameBehavior);
        ao.mergeBehavior(PageBehavior);
        return ao;
    },

    createVirtualTextAO: function (range, parentID) {
        var ao = new AO(range, parentID);
        ao.mergeBehavior(VirtualTextBehavior);
        return ao;
    },

    _getFactory: function(useOnlyWebKit) {
        return useOnlyWebKit? this : content.kitsManager;
    },
    _uninterestingMicClasses: Util.objectFromArray(['WebElement', 'WebTable'], true),
    _getInterestingAOHierarchy: function (ao, element, parentID, useOnlyWebKit) {
        var res = [];
        if (element.form) {
            var formAO = this._getFactory(useOnlyWebKit).createAO(element.form, parentID);
            res.push(formAO);
        }

        res.push(ao);
        return res;
    },
    _getInterestingAO: function (element, parentID, useOnlyWebKit) {
        for (var curr = element; curr; curr = curr.parentElement) { // return the AO for the first interesting element
            // break the loop if find special tags
            if(curr.tagName && this._tagsToBreakInterestingAOLoop.indexOf(curr.tagName) > -1)
                break;
            curr = ContentUtils.getTargetElem(curr);
            
            var ao;
            if(useOnlyWebKit){
                //Enter here only when trying to get children in a self-defined container defined in web extension (Web 2.0)
                var kitArr = content.kitsManager.getNeededKits(useOnlyWebKit);
                if(kitArr.length > 0){
                    kitArr.some(function(kit){
                    ao = kit.createAO(curr, parentID,true);
                    return !!ao;
                    })
                }
            }
            else{
                ao = content.kitsManager.createAO(curr, parentID, true);
            }
            
            if (ao) {
                var micClass = Util.getMicClass(ao);
                if (!this._uninterestingMicClasses[micClass])
                    return ao;
            }
        }
        // if no interesting elements, return the AO for the bottom element
        return this.createAO(element, parentID, false);
    },
    createRecordAOArray: function (element, parentID, eventName, useOnlyWebKit) {
        var ao = this._getInterestingAO(element, parentID, useOnlyWebKit);
        return this._getInterestingAOHierarchy(ao, element, parentID, useOnlyWebKit);
    },
    updateTagsToBreakInterestingAOLoop: function (tagsToBreakInterestingAOLoop){
        this._tagsToBreakInterestingAOLoop = tagsToBreakInterestingAOLoop;
    },
    relevant: Util.alwaysTrue,
    webCore: Util.alwaysTrue
};

KitsManager.prototype.LoadKit(WebKit);