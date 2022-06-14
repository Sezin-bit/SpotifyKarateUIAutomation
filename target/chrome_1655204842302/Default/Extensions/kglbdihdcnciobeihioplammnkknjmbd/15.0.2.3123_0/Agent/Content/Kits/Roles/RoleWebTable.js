var RoleWebTable = {
    isRoleBased: true,
    _util: {
        isWebTable: function (elem) {
            if (elem.tagName === 'TABLE') {
                return false;
            }
            var role = RoleWebUtil.getRole(elem);
            return role === "grid";
        }
    },
    createAO: function (elem, parentId) {
        if (RoleWebTable._util.isWebTable(elem)) {
            return RoleWebUtil.createAO(elem, parentId, [TableBehavior, this._behavior]);
        }

        return null;
    },
    _behavior: {
        name: 'RoleWebTableBehavior',
        _attrs: {
            "logical name": function () {
                return RoleWebUtil.getLogicalName(this._elem);
            },
            "cols": function (msg) {
                var columnHeaders = this._getColumnHeaders();
                if (columnHeaders.length > 0) {
                    return columnHeaders.length;
                }

                var rows = this._getRows();
                if (rows.length === 0) {
                    return 0;
                }
                var cells = this._getCells(rows[0]);
                return cells.length;
            },
            "column names": function () {
                var columnHeaders = this._getColumnHeaders();
                return Util.makeArray(columnHeaders).map(function (col) {
                    return col.textContent;
                }).join(';');
            }
        },
        _helpers: {
            _filteredByContainer: function (items) {
                return Util.makeArray(items).filter(function (item) {
                    return (this._elem === Util.findAncestor(item, function (e) {
                        return e.matches && e.matches('[role=grid]');
                    }));
                }, this);
            },
            _getRows: function () {
                var rows = this._elem.querySelectorAll('[role=row]');
                return this._filteredByContainer(rows);
            },
            _getCells: function (row) {
                var cells = row.querySelectorAll('[role=gridcell]');
                return this._filteredByContainer(cells);
            },
            _getColumnHeaders: function () {
                var headers = this._elem.querySelectorAll('[role=columnheader]');
                return this._filteredByContainer(headers);
            }
        }
    }
};

RoleWebKit.registerFactory(RoleWebTable);