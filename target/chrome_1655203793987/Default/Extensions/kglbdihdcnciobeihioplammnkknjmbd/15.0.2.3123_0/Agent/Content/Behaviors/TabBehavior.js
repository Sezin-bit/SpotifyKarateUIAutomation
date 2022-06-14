var TabBehavior = {
    _micclass: ["WebTabStrip", "StdObject"],
    _attrs: {
        "name": function () {
            return this._elem.name || Util.getMicClass(this);
        },

        "logical name": function () {
            return this.GetAttrSync("acc_name") || this.GetAttrSync("name") || this.GetAttrSync("id");
        },

        "disabled": function () {
            return this._elem.disabled ? 1 : 0;
        },

        "readonly": function () {
            return this._elem.readOnly ? 1 : 0;
        },

        "type": function () {
            return this._elem.type;
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue
    }
};