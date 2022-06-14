var RangeBaseBehavior = {
    _attrs: {
        "min": function () {
            return this._elem.min;
        },

        "max": function () {
            return this._elem.max;
        },

        "step": function () {
            return this._elem.step;
        }
    }
};
