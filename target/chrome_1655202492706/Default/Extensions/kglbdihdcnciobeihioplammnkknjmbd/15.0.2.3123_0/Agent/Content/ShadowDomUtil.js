var CrossContextCfgUtil = {
   _exceptCounter:0,
   _default_settings:{
     maxiframedepthtowait:5,                //MaxIFrameDepthToWait
     shadowdomfilterelement:["lightning"]   //ShadowDOMFilterElement
   },
   
    getConfig:function(key){
        key = String(key).toLowerCase();
        var defaultVal = this._default_settings[key];

        try{
            var val = localStorage.getItem("uft_cfg_" + key);
            if(key === "maxiframedepthtowait"){ 
                var val = Number(val);
                val = val>0 ? val : defaultVal;
            } else if(key === "shadowdomfilterelement"){
                val = val ? val.split(";"):defaultVal;
            }
        } catch (ex){
            val = defaultVal;
            if(this._exceptCounter++ < 10 ){
              if(window.console && window.console.error) 
                  console.error(ex); //in case it was overwritten
            }
        }
        return val;
    },

    setConfig:function(key, val){
        key = String(key).toLowerCase();
        if(typeof localStorage !== "undefined"){
            localStorage.setItem("uft_cfg_"+key, val); 
        }
    }
};

ShadowDomUtil = {
    _supportShadowDom: function () {
        return typeof (ShadowRoot) != "undefined";
    },

    _belongToFilteredElement : function(elem){
        var filteredElementTagNames = CrossContextCfgUtil.getConfig("ShadowDOMFilterElement");
        var tagName = elem.tagName.toLowerCase();
        //tagName for exaple: forcegenerated-flexipage_lightning_sgsfa_opportunity_master_opportunity__view_js
        return filteredElementTagNames.some(function(value){
            return tagName.includes(value);
        });
    },

    makeArray:function(seq) {
        if (Array.isArray(seq))
            return seq;

        var array = new Array(seq.length);
        for (var i = 0; i < seq.length; i++) {
            array[i] = seq[i];
        }

        return array;
    },

    _getEmptyLogger: function () {
        function nop() { }
        return {
            trace: nop,
            prettyTrace: nop,
            debug: nop,
            prettyDebug: nop,
            warn: nop,
            info: nop,
            error: nop
        };
    },

    _arrayReduce: function (array, iterateFunc, startVal) {
        if (!Array.isArray(array))
            return null;
        var startIndex = 1;
        var cumulator = array[0];
        if (!!startVal) {
            cumulator = startVal;
            startIndex=0;
        }
        for (var i = startIndex; i < array.length; i++) {
            cumulator = iterateFunc(cumulator, array[i], i, array);
        }
        return cumulator;
    },

    isOpenShadowRoot: function (elem) {
        return  (!!elem && !!elem.shadowRoot && elem.shadowRoot.mode == 'open') &&
                (!this._belongToFilteredElement(elem));
    },

    _findAllNoNestedShadowRoots: function (elem) {
        elem = elem || document;
        var output = [];
        if (this.isOpenShadowRoot(elem))
            output.push(elem.shadowRoot);
        var childlist = this.makeArray(elem.querySelectorAll('*'));

        output = this._arrayReduce(childlist, function (targetAOs, childElem) {
            if (this.isOpenShadowRoot(childElem))
                targetAOs.push(childElem.shadowRoot);
            return targetAOs;
        }.bind(this), output);
        return output;
    },

    findAllShadowRoots: function (elem, logger) {
        logger = logger || this._getEmptyLogger();
        logger.trace("findAllShadowRoots: start ");
        elem = elem || document;
        if (!this._supportShadowDom())
            return [];

        var output = [];
        var firstLayerShadowRoots = [];
        firstLayerShadowRoots = this._findAllNoNestedShadowRoots(elem);
        output = output.concat(firstLayerShadowRoots);

        while (firstLayerShadowRoots.length) {
            var tempArray = firstLayerShadowRoots;

            firstLayerShadowRoots = this._arrayReduce(tempArray, function (targetAOs, childElem) {
                return targetAOs.concat(this._findAllNoNestedShadowRoots(childElem));
            }.bind(this), []);
            output = output.concat(firstLayerShadowRoots);
        }
        logger.trace("findAllShadowRoots: find ", output.length, "shadowRoots");
        return output;
    },

    getElemInShadowRootByPoint: function (elem, point, logger) {
        logger = logger || this._getEmptyLogger();
        elem = elem || document;
        var target;
        if (!this.isOpenShadowRoot(elem) || !point) {
            logger.trace("getElemInShadowRootByPoint: get element with tag name ", elem.tagName);
            return elem;
        }

        target = elem.shadowRoot.elementFromPoint(point.x, point.y);

        if (target === elem) {
            logger.trace("getElemInShadowRootByPoint: get element with tag name ", elem.tagName);
            return elem;
        }

        if (!target) {
            logger.trace("getElemInShadowRootByPoint: get element with tag name ", elem.tagName);
            return elem;
        }

        return this.getElemInShadowRootByPoint(target, point, logger);
    },

    // find the shadowRoot which element is directly under
    getParentShadowRoot: function (elem, logger) {
        logger = logger || this._getEmptyLogger();
        if (!elem || !this._supportShadowDom()) {
            logger.trace("getParentShadowRoot: the Dom element is not within a shadow root ");
            return null;
        }
        if (elem.constructor == ShadowRoot) {
            logger.trace("getParentShadowRoot: we find a parent shadow root here ");
            return elem;
        }

        return this.getParentShadowRoot(elem.parentNode, logger);
    }
};

