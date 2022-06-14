var VirtualTextBehavior = {
    MIN_CHARS_IN_TEXT: 10,
    _attrs: {
        "micclass": function() {
            return "";
        },
        "text before": function () {
            return this._getTextBeforeData().text;
        },
        "text after": function () {
            var selectedRange = this._elem;

            // Create a custom Range object for all after the selected
            var afterTxtRange = new Range();
            afterTxtRange.setStart(selectedRange.endContainer, selectedRange.endOffset);
            afterTxtRange.setEndAfter(document.body.lastChild);

            // Get all after text
            var allAfterTxt = Util.cleanSpecialChars(Util.stringTrimLeft(afterTxtRange.toString()));
            allAfterTxt = Util.cleanMultipleSpaces(allAfterTxt);

            // Return if the after text is too short
            if (allAfterTxt.length <= VirtualTextBehavior.MIN_CHARS_IN_TEXT)
                return allAfterTxt;

            // Cut the text in the first space after the minimum number of chars
            var lastSpaceIndex = allAfterTxt.indexOf(' ', VirtualTextBehavior.MIN_CHARS_IN_TEXT);
            if (lastSpaceIndex === -1)
                return allAfterTxt;

            var afterTxt = allAfterTxt.substr(0, lastSpaceIndex);
            return afterTxt;
        },
        "newindexoftextafter": function () {
            // Since we get the text just after the "Selected Text", So the LastIndex should always be 1
            return 1;
        },
        "indexoftextbefore": function () {
            return this._getTextBeforeData().index;
        },
        "frame name": function () {
            return "";
        },
        "is input text": function () {
            var range = this._elem;
            var relatedElement = range.commonAncestorContainer;
            
            var nodeName = relatedElement.nodeName.toLowerCase();      
            switch (nodeName) {
                case "input":
                case "textarea":
                    return true;
            }

            return false;
        }
    },
    _helpers: {
        isLearnable: Util.alwaysFalse,
        _getTextBeforeData: function () {
            if (this._txtBeforeData) // instantiate this lazily
                return this._txtBeforeData;

            var selectedRange = this._elem;

            // Create a custom Range object for all before the selected
            var beforeTxtRange = new Range();
            beforeTxtRange.setStart(document.body, 0);
            beforeTxtRange.setEnd(selectedRange.startContainer, selectedRange.startOffset);

            // Get all after text
            var allBeforeText = Util.cleanSpecialChars(beforeTxtRange.toString().trimRight());
            allBeforeText = Util.cleanMultipleSpaces(allBeforeText);

            // Return if the before text is too short
            if (allBeforeText.length <= VirtualTextBehavior.MIN_CHARS_IN_TEXT)
                return allBeforeText;

            // Cut the text in the first space after the minimum number of chars
            var lastSpaceIndex = allBeforeText.lastIndexOf(' ', allBeforeText.length - VirtualTextBehavior.MIN_CHARS_IN_TEXT);

            if (lastSpaceIndex === -1) {
                this._txtBeforeData = {
                    text: allBeforeText,
                    index: 1
                };
            }
            else {
                var beforeTxt = allBeforeText.substr(lastSpaceIndex + 1);
                this._txtBeforeData = {};
                this._txtBeforeData.text = beforeTxt;
                this._txtBeforeData.index = Util.stringCount(allBeforeText, beforeTxt);
            }

            return this._txtBeforeData;
        }
    }
};