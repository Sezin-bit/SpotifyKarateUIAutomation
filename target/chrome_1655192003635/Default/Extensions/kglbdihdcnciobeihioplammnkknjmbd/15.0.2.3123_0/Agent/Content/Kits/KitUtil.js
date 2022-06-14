var KitUtil = {
    CreateKit: function (name, relevantFunc) {
        var factories = [];

        return {
            _logger: new LoggerUtil("Content." + name),
            name: name,
            priority: 1,

            registerFactory: function (factory) {
                factories.push(factory);
            },
	    
	        isDisabled:function(){
                if(!this.name)
                    return false;
                var disabledKits =  ContentUtils.getDisabledWebKits();
                return disabledKits.some(function(kitName){
                     var kitName = kitName + "kit";
                     return this.name.toLowerCase() === kitName.toLowerCase();
                }.bind(this));
            },
            
            /*
              micclass is added only for RoleWebKit
            */
            createAO: function (element, parentId, noDefault, micclass) {
                if(this.isDisabled())
                    return null;
                var ret = null;
                var candidates = factories;
                if (!element.hasAttribute("role")) {
                    candidates = factories.filter(function (factory) {
                        return !factory.isRoleBased;
                    });
                }
                candidates.some(function (factory) {
                    ret = factory.createAO(element, parentId);
                    return ret;
                });
                //if micclass is valid, We want support scripts which are generated when WebAcc is turned off 
                if(micclass && ret){
                    var actualMicClass = Util.getMicClass(ret);
                    if(micclass.isRegExp)
                        var matched = Util.valMatchReg(actualMicClass, micclass.regExQuery);
                    else 
                        var matched = actualMicClass === micclass;

                    ret = matched ? ret : null;
                } 
                return ret;
            },

            relevant: function () {
                var shouldLoad = relevantFunc();

                this._logger.trace(this.name + ' relevant: should load ' + shouldLoad);
                return shouldLoad;
            },
            webCore: Util.alwaysTrue
        };
    },

    createAO: function (elem, parentId, behaviors) {
        var ao = new AO(elem, parentId);
        ao.mergeBehavior(CommonBehavior);
        behaviors.forEach(function (b) { ao.mergeBehavior(b); });
        return ao;
    },
};
