var SenchaKit = KitUtil.CreateKit("SenchaKit", function () {
    return ContentUtils.runOnDocSync(function () {
        return !!(window.Ext && window.Ext.version);
    });
})

var SenchaButton = {
    createAO: function (elem, parentId) {
        if (Util.elemHasClass(elem, 'x-button'))
            return KitUtil.createAO(elem, parentId, [ButtonBehavior]);

        return null;
    },
};

// Register factories (order matters)
SenchaKit.registerFactory(SenchaButton);

// Register the kit
KitsManager.prototype.LoadKit(SenchaKit);
