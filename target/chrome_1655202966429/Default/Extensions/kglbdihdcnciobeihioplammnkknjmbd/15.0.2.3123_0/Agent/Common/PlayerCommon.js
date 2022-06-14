var PlayerUtil = {
    isTargetTestObjectInPage: function (obj) {
        if (Util.isNullOrUndefined(obj.child)) {
            return false;
        }
        while (obj.child) {
            if (Util.isNullOrUndefined(obj["child"]["child"])) {
                return obj["Description properties"]["mandatory"]["micclass"] === "Page";
            }
            obj = obj.child;
        }
    },
    isTargetTestObjectInFrame: function (obj) {
        if (Util.isNullOrUndefined(obj.child)) {
            return false;
        }
        while (obj.child) {
            if (Util.isNullOrUndefined(obj["child"]["child"])) {
                return obj["Description properties"]["mandatory"]["micclass"] === "Frame";
            }
            obj = obj.child;
        }
    },
    getTargetTestObject: function(testObject) {
        if(Util.isNullOrUndefined(testObject.child)) {
            return testObject;
        }
        return this.getTargetTestObject(testObject.child);
    }
};

var PlayerTestObjectUtil = {
    getMicClass: function(testObj) {
        //TODO
        //check the every subElement exist
        return testObj["Description properties"]["mandatory"]["micclass"];
    },
    isBrowser: function(testObj) {
        var objType = this.getMicClass(testObj);
        return objType === "Browser";
    },
    isPage: function(testObj) {
        var objType = this.getMicClass(testObj);
        return objType === "Page";
    },
    getDescriptionProperties: function(testObj) {
        return testObj["Description properties"]["mandatory"];
    },
    hasPositionInfo: function(testObj) {
        return !Util.isNullOrUndefined(testObj["Description properties"]) 
            && !Util.isNullOrUndefined(testObj["Description properties"]["additionalInfo"])
            && !Util.isNullOrUndefined(testObj["Description properties"]["additionalInfo"]["abs_x"])
            && !Util.isNullOrUndefined(testObj["Description properties"]["additionalInfo"]["abs_y"])
            && !Util.isNullOrUndefined(testObj["Description properties"]["additionalInfo"]["width"])
            && !Util.isNullOrUndefined(testObj["Description properties"]["additionalInfo"]["height"]);
    }
};