var ImageLinkBehavior = {
    _micclass: ["Image", "Hyperlink"],
    _attrs: {
        "href": function () {
            var parentAnchor;
            return (parentAnchor = this._getImageParentAnchor()) ?
                parentAnchor.href : "";
        },

        "url": function () {
            return this.GetAttrSync("href");
        },

        "target": function () {
            var parentAnchor;
            return (parentAnchor = this._getImageParentAnchor()) ?
                parentAnchor.target : "";
        },

        "image type": function () {
            var type = this._getImageTypeName();
            if (type !== "Server Side ImageMap") {
                type = "Image Link";
            }
            return type;
        },

        "attribute": function (msg) {
            var attrVal = this._getAttributes(this._elem, msg);
            if (attrVal)
                return attrVal;

            var parentAnchorElem = this._getImageParentAnchor();
            if (parentAnchorElem)
                return this._getAttributes(parentAnchorElem, msg) || "";

            return "";
        }
    },

    override: {
        getParent: function () {
            var anchor = this._getImageParentAnchor();
            return this._getParentAO(anchor);
        }
    }
};