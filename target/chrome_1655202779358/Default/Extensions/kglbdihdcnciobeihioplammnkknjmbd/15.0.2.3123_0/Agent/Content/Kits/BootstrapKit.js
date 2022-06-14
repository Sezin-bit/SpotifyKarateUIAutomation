var BootstrapKit = KitUtil.CreateKit("BootstrapKit", function () {
    return ContentUtils.runOnDocSync(function () {
        return !!(window.angular || window.getAllAngularRootElements
            || (typeof ($) !== 'undefined' && $.fn && $.fn.tooltip && $.fn.tooltip.Constructor && $.fn.tooltip.Constructor.VERSION));
    });
})

var BootstrapUtil = {
    matchControl: function (elem, matchingLabelClasses, controlCriteria) {
        if(controlCriteria(elem))
            return this._getLabelFromControl(elem, matchingLabelClasses);
        return null;
    },
    _getLabelFromControl: function (elem, classNames) {
        var labels = ContentUtils.getLabelsFromControl(elem);
        if (labels && labels.length) {
            return Util.makeArray(labels).filter(function (label) {
                return this.hasExpectedClass(label, classNames);
            }, this)[0];
        }
    },

    hasExpectedClass: function (elem, classRegNames) {
        return classRegNames.some(function (regName) {
            if (!elem.className)
                return false;

            return regName.test(elem.className);
        });
    },
};

var BootstrapButton = {
    createAO: function (elem, parentId) {
        if (BootstrapUtil.hasExpectedClass(elem, this._matchingRegClasses))
            return KitUtil.createAO(elem, parentId, [ButtonBehavior]);

        var label = BootstrapUtil.matchControl(elem, this._matchingRegClasses, this._isCheckBoxOrRadio);
        if (label)
            return KitUtil.createAO(label, parentId, [ButtonBehavior]);

        return null;
    },
    // Bootstrap button's specific classes
    _matchingRegClasses: [/\bbtn-(outline-)?(primary|secondary|success|info|warning|danger|link)\b/i],

    _isCheckBoxOrRadio: function (elem) {
        return elem.tagName === 'INPUT' && (elem.type === 'checkbox' || elem.type === 'radio');
    },
};

// Register factories (order matters)
BootstrapKit.registerFactory(BootstrapButton);

// Register the kit
KitsManager.prototype.LoadKit(BootstrapKit);
