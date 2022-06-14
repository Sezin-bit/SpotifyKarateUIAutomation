var RoleWebLink = {
    isRoleBased: true,
    _util: {
        isWebLink: function (elem) {
            var role = RoleWebUtil.getRole(elem);
            return role === "link";
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebLink._util.isWebLink(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [LinkBehavior, this._behavior]);
        }

        return null;
    },
    _behavior: {
        _attrs: {
            "data": function() {
                return null;
            }
        },
    }
};

RoleWebKit.registerFactory(RoleWebLink);