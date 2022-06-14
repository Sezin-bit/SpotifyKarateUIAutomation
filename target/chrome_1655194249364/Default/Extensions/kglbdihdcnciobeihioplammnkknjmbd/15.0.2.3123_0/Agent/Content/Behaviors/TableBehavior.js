var TableBehavior = {
    _micclass: ["WebTable"],
    _attrs: {
        "name": function () {
            if (this._elem.name) {
                return this._elem.name;
            }
            var children = this._elem.getElementsByTagName("*");

            for (var i = 0; i < children.length; i++) {
                if (["TH", "TR", "TD"].indexOf(children[i].tagName) !== -1) {
                    continue;
                }
                var ao = content.kitsManager.createAO(children[i], this._parentID);
                if (Util.getMicClass(ao) === "WebElement") {
                    continue;
                }
                var name = ao.GetAttrSync("name");
                if (name && name.trim() !== "") {
                    return name;
                }
            }
            return "WebTable";
        },

        "border": function () {
            return this._elem.border;
        },

        "rows": function () {
            var rows = this._getRows();
            return rows.length;
        },

        "cols": function (msg) {
			var rowId = 0;
			
			var rows = this._getRows();
            
			if(msg._data.cols != null && typeof msg._data.cols === "number") {
				//cols of specific line requested
				if(msg._data.cols < 1 || msg._data.cols > rows.length) {// Out of range (one based)
					ErrorReporter.ThrowOutOfRange();					
				}
				
				rowId = msg._data.cols - 1;
			}			
            
            if (rows.length === 0) {
                return 0;
            }

            var cells = this._getCells(rows[rowId]);
            return cells.length;
        },

        "column names": function () {
            var rows = this._getRows();
            for (var i = 0; i < rows.length; i++) {
                var colName = text(rows[i]);
                if (colName.trim() !== "") {
                    var cells = this._getCells(rows[i]);
                    return Util.makeArray(cells).map(text).join(";");
                }
            }
            // Helper function
            function text(e) {
				if (content.settings.useinnertextfortextcollection) {
					return e.textContent;
				}
				return ContentUtils.getVisibleTextContent(e);
			}
        },

        "logical name": function () {
            var caption = this.GetAttrSync("table caption");
            if (caption) {
                return caption;
            }

            // The table name is the name of the first object that has a non empty name 
            var rows = this._getRows();
            for (var i = 0; i < rows.length; i++) {
                var cells = this._getCells(rows[i]);
                for (var j = 0; j < cells.length; j++) {
                    var children = cells[j].children;
                    for (var k = 0; k < children.length; k++) {
                        var ao = content.kitsManager.createAO(children[k], this._parentID);
                        var rtnVal;
                        // if this a table then instead of taking the entire table text we take
                        // the logical name of this table
                        if (children[k].tagName === "TABLE") {
                            rtnVal = ao.GetAttrSync("logical name");
                        } else {
                            rtnVal = ao.GetAttrSync("innertext");
                        }
                        // if we got meaningfull text then return
                        if (rtnVal && rtnVal.trim() !== "") {
                            return rtnVal;
                        }
                    }

                    // for cases where the cell itself contains text
                    var text = cells[j].textContent;
                    if (text.trim() !== "")
                        return text;
                }
            }
        },

        "cell id": function (msg) {
            var row = msg._data["cell id"][0][0];
            var col = msg._data["cell id"][0][1];
            var id = msg._to;

            // when the coordinates are (0,0) - return the table id
            if (row === 0 && col === 0) {
                return id;
            }

            // change index to zero-based
            --row;
            --col;

            var rows = this._getRows();
            // row index out of bounds
            if (row < 0 || row >= rows.length) {
                return;
            }

            // if the column was zero (now it is -1) then return the row id
            if (col === -1) {
                id.object = content.kitsManager.createAO(rows[row], this._parentID).getID().object;
                return id;
            }

            var cells = this._getCells(rows[row]);
            // column index out of bounds
            if (col < 0 || col >= cells.length) {
                return;
            }

            id.object = content.kitsManager.createAO(cells[col], this._parentID).getID().object;
            return id;
        },

        "table caption": function () {
            return this._elem.caption ? this._elem.caption.textContent : "";
        }
    },
    _methods: {
        "GET_TABLE_DATA": function (msg, resultCallback) {
            this._logger.trace("TableBehavior: on command GET_TABLE_DATA");
            var rows = this._getRows();
            var maxcol = 0;
            for (var i = 0; i < rows.length; i++) {
                var cells = this._getCells(rows[i]);
                var rowText = [[]];
                for (var j = 0; j < cells.length; j++) {
                    var ao = content.kitsManager.createAO(cells[j], this._parentID);
                    rowText[0].push(ao.GetAttrSync("text"));
                }
                if (cells.length > maxcol) {
                    maxcol = cells.length;
                }
                msg._data["WEB_PN_ROW_DATA" + (i + 1)] = rowText;
            }
            msg._data.row = rows.length;
            msg._data.WEB_AN_MAX_COLUMN = maxcol;
            resultCallback(msg);
        },

        "GET_TABLE_COLUMN": function (msg, resultCallback) {
            this._logger.trace("TableBehavior: on command GET_TABLE_COLUMN");
            if (typeof (msg._data.row) !== "number") {
                ErrorReporter.ThrowInvalidArg();
            }

            var rows = this._getRows();
            if (msg._data.row < 1 || msg._data.row > rows.length) { // Out of range (one based)
                ErrorReporter.ThrowOutOfRange();
            }

            var cells = this._getCells(rows[msg._data.row - 1]);
            msg._data.col = cells.length;
            resultCallback(msg);
        },

        "GET_TABLE_CELL_DATA": function (msg, resultCallback) {
            this._logger.trace("TableBehavior: on command GET_TABLE_CELL_DATA");
            if (typeof (msg._data.row) !== "number" || typeof (msg._data.col) !== "number") {
                ErrorReporter.ThrowInvalidArg();
            }

            var rows = this._getRows();
            if (msg._data.row < 1 || msg._data.row > rows.length) { // Out of range (one based)
                ErrorReporter.ThrowOutOfRange();
            }

            var cells = this._getCells(rows[msg._data.row - 1]);
            if (msg._data.col < 1 || msg._data.col > cells.length) { // Out of range (one based)
                ErrorReporter.ThrowOutOfRange();
            }
            var ao = content.kitsManager.createAO(cells[msg._data.col - 1], this._parentID);
            msg._data.text = ao.GetAttrSync("text");
            resultCallback(msg);
        },

        "GET_ROW_WITH_CELLTEXT": function (msg, resultCallback) {
            this._logger.trace("TableBehavior: on command GET_ROW_WITH_CELLTEXT");
            var start_row = msg._data.row;
            var column = msg._data.col;
            var text = msg._data.text;

            if (typeof (start_row) !== "number" || typeof (column) !== "number") {
                ErrorReporter.ThrowInvalidArg();
            }

            var rows = this._getRows();
            if (start_row > rows.length) {
                ErrorReporter.ThrowOutOfRange();
            }

            var cells = this._getCells(rows[start_row > 0 ? start_row - 1 : 0]);
            if (column > cells.length) {
                ErrorReporter.ThrowOutOfRange();
            }

            msg._data = {};
            msg._attr_names = ["row"];

            msg._data.row = -1;

            var table_text = this.GetAttrSync("text");
            if (table_text.indexOf(text) === -1) { //Check if text in the table at all.
                resultCallback(msg);
                return;
            }

            var i = start_row > 0 ? start_row - 1 : 0;
            for (; i < rows.length; i++) {
                cells = this._getCells(rows[i]);
                if (column > 0) {
                    if (column-1 < cells.length) {
                        var row_text = content.kitsManager.createAO(cells[column - 1], this._parentID).GetAttrSync("text");
                        if (row_text.indexOf(text) !== -1) {
                            msg._data.row = i + 1;
                            resultCallback(msg);
                            return;
                        }
                    }
                } else { // look under all columns
                    for (var j = 0; j < cells.length; j++) {
                        var cell_text = content.kitsManager.createAO(cells[j], this._parentID).GetAttrSync("text");
                        if (cell_text.indexOf(text) !== -1) {
                            msg._data.row = i + 1;
                            resultCallback(msg);
                            return;
                        }
                    }
                }
            }

            // text not found on any row. e.g. user specify to find on given column, but the text is in a row on different column.
            resultCallback(msg);
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        _getRows: function () {
            return this._elem.rows;
        },
        _getCells: function (row) {
            return row.cells;
        }
    }
};

