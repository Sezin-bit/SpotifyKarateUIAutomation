var RoleWebKit = KitUtil.CreateKit("RoleWebKit", ContentUtils.isWebRoleBasedKitEnabled);
var RoleWebUtil = {
    createAO: function (elem, parentId, behaviors) {
        return KitUtil.createAO(elem, parentId, behaviors);
    },
    getRole: function (elem) {
        return elem.getAttribute('role');
    },
    getName: function (elem) {
        return elem.getAttribute('name');
    },
    getLogicalName: function (elem) {
        return ContentUtils.getAccNameFromControl(elem) || elem.getAttribute('name') || elem.getAttribute('id') || Util.cleanTextProperty(elem.textContent);
    },
    getText: function (elem) {
        return Util.cleanTextProperty((elem.textContent || "").trimRight());
    }
};
// Register the kit
KitsManager.prototype.LoadKit(RoleWebKit);
