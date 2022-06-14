function KitsManager() {
    this._logger.trace("Created instance");
}

KitsManager.prototype = {
    // Static stuff
    _allKits: [], // static array
    _logger: new LoggerUtil("Content.KitsManager"), // static logger (so LoadKit can also use it)
    LoadKit: function (kit) {
        this._logger.trace("LoadKit: loading kit " + kit.name);
        KitsManager.prototype._allKits.push(kit);
    },
    // non static        
    _kits: null,    
    _initKits: function () {
        if (this._kits && this._kits.allCount === this._allKits.length)
            return; // already initialized and up-to-date

        if (this._kits)
            this._logger.debug("_initKits: Re-loading kits due to count change, was: " + this._kits.allCount + " now: " +  this._allKits.length);
        else
            this._logger.trace("_initKits: Loading kits, count: " + this._allKits.length);

        this._kits = this._allKits.filter(function (kit) {
            return kit.relevant();
        }).sort(function (a, b) {
            return b.priority - a.priority;
        });

        this._logger.trace("_initKits: Relevant kits count: " + this._kits.length);

        this._kits.allCount = this._allKits.length;
    },
    createAO: function (element, parentID, noDefault, micclass) {
        this._logger.trace("createAO: creating AO for element ", element.tagName);
        if (!element) {
            this._logger.error("createAO: null element, AO not created");
            ErrorReporter.ThrowInvalidArg();
        }
        this._initKits();
        for (var i = 0; i < this._kits.length; i++) {
            var ao = this._kits[i].createAO(element, parentID, noDefault, micclass);
            if (ao) {
                return ao;
            }
        }
        this._logger.debug("createAO: create AO failed for element ", element.tagName);
        return null;
    },
    createRecordAOArray: function (element, parentID, eventName) {
        this._logger.trace("createRecordAOArray: creating AO for element " + element);
        if (!element) {
            this._logger.error("createRecordAOArray: null element, AO not created");
            ErrorReporter.ThrowInvalidArg();
        }

        this._initKits();
        for (var i = 0; i < this._kits.length; ++i) {
            if (this._kits[i].createRecordAOArray) {
                var aoArr = this._kits[i].createRecordAOArray(element, parentID, eventName);
                if (aoArr && aoArr.length > 0)
                    return aoArr;
            }
        }
        this._logger.error("createRecordAOArray: create AO failed for element " + element);
        return null;
    },
    createPageAO: function (parentID) {
        this._logger.trace("createPageAO: Started");
        //get the webkit
        return WebKit.createPageAO(parentID);
    },
    createVirtualTextAO: function (range, parentID) {
        this._logger.trace("createVirtualTextAO: Started");
        return WebKit.createVirtualTextAO(range, parentID);
    },
    getNeededKits:function(webCore){
        var neededKits = [];
        neededKits = this._allKits.filter(function (kit) {
            return kit.relevant() && 
                    ((!!webCore) ? kit.webCore() : !kit.webCore);
        }).sort(function (a, b) {
            return b.priority - a.priority;
        });
            
        return neededKits;
    },
    updateTagsToBreakInterestingAOLoop: function(tagsToBreakInterestingAOLoop){
        this._initKits();
        for (var i = 0; i < this._kits.length; ++i) {
            if(this._kits[i].updateTagsToBreakInterestingAOLoop){
                this._kits[i].updateTagsToBreakInterestingAOLoop(tagsToBreakInterestingAOLoop);
            }
        }
	}
};

function ObjectRTIDManager() {
    this._logger = new LoggerUtil("Content.ObjectRTIDManager");
    content.dispatcher.addListener("RegistrationResult", this);
}

ObjectRTIDManager.prototype = {
    _logger: undefined,
    _nextEntry: -1,
    _frameCockie: -1,
    _knownElements: [],
    onRegistrationResult: function (registrationResData) {
        this._logger.info("onRegistrationResult: Started for frame cookie " + registrationResData.frameCount);
        this._frameCockie = registrationResData.frameCount;
    },
    GetIDForElement: function (element) {
        this._logger.trace(function() { return "GetIDForElement: Started for " + element.tagName; });
        if (element.objRTID) {
            this._logger.debug("GetIDForElement: No need to create new ID element already known");
            return element.objRTID;
        }

        element.objRTID = { entry: ++this._nextEntry, frameCockie: this._frameCockie };
        this._knownElements[element.objRTID.entry] = element;
        return element.objRTID;
    },
    GetElementFromID: function (id) {
        if (id.frameCockie !== this._frameCockie) {
            this._logger.error("GetElementFromID: Got ID from a different frame generation!", id);
            return null;
        }
        if (id.entry < 0 || id.entry > this._nextEntry) {
            this._logger.error("GetElementFromID: Got unknown entry ! id = ", id);
            return null;
        }
        if (content.settings["sap support"] == 1) {
            // Up till now, only SAP related AUTs are observed with the need of validation.
            var validElement = this.ElementValidation(this._knownElements[id.entry]);
            if (validElement != null)
                this._knownElements[id.entry] = validElement;
        }
        
        return this._knownElements[id.entry];
    },
    ElementValidation: function (element) {
        // DOM may change after AO was created. If it becomes invalid, we need to update the map.
        // For now we use getBoundingClientRect() for validity checking.
        if (!element.getBoundingClientRect) 
            return null;

        var rect = element.getBoundingClientRect();
        if (rect.width == 0 && rect.height == 0 && element.id != null) {
            var new_element = document.getElementById(element.id);
            if (new_element != null) {
                var new_rect = new_element.getBoundingClientRect();
                if (new_rect.with != 0 || new_rect.height != 0) {
                    return new_element;
                }
            }            
        }
    }
};
