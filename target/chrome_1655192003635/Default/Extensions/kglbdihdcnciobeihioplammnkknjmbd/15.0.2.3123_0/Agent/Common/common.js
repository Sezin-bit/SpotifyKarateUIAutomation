// © Copyright 1992-2017 Hewlett Packard Enterprise Development LP
//Messages
var MSG_TYPES = {
    REGISTER_FRAME: "REGISTER_FRAME",
    QUERY: "QUERY_ATTR",
    SRVC_SET_GLOBAL_VARIABLES: "SRVC_SET_GLOBAL_VARIABLES",
    SRVC_GET_ALL_BROWSERS: "SRVC_GET_ALL_BROWSERS",
    QUERY_DESC_TO_ID: "QUERY_DESC_TO_ID",
    SRVC_CALL_OBJ_EVENT: "SRVC_CALL_OBJ_EVENT",
    SRVC_INVOKE_METHOD: "SRVC_INVOKE_METHOD",
    SRVC_MAKE_OBJ_VISIBLE: "SRVC_MAKE_OBJ_VISIBLE",
    SRVC_GET_SCREEN_RECT: "SRVC_GET_SCREEN_RECT",
    SRVC_EDIT_SET: "SRVC_EDIT_SET",
    SRVC_GET_FORM: "SRVC_GET_FORM",
    RECORD: "RECORD",
    REQUEST_COMID: "REQUEST_COMID",
    RESPONSE_COMID: "RESPONSE_COMID",
    DISPATCH_TO_FRAME_ELEM: "DISPATCH_TO_FRAME_ELEM",
    MATCH_DESC_TO_ID: "MATCH_DESC_TO_ID",
    FRAME_FROM_POINT: "FRAME_FROM_POINT",
    QUERY_GET_TABLE_DATA: "QUERY_GET_TABLE_DATA",
    SRVC_LOAD_KIT: "SRVC_LOAD_KIT",
    WEBEXT_REPORT_LINE: "WEBEXT_REPORT_LINE",
    WEBEXT_RECORD_EVENT: "WEBEXT_RECORD_EVENT"
    //SRVC_SET_EMULATOR_DEVICE: "SRVC_SET_EMULATOR_DEVICE"
};

function Msg(type, to, data, tab) {
    this._msgType = type;
    this._to = to || {};
    this._tab = tab;
    this._data = data;
}

Msg.prototype = {
    _msgType: null,
    _to: null,
    _tab: -1,
    _data: null,
    toString: function() {
        return "\nType:" + this._msgType + "\nTo:" + this._to + "\nTab:" + this._tab + "\nData:" + this._data;
    },
    clone: function () {
        return new Msg(this._msgType, this._to, this._data, this._tab);
    },
    QTP_COM_ID: -1
};

function mergeMessages(tgtMsg, srcMsg, valNameMapping, logger) {
    function mergeStatus(tgtMsg, srcMsg, logger)
    {
        // if no status to merge - return
        if (!srcMsg.status)
            return;

        // if target already has an error status - don't override it
        if (tgtMsg.status && tgtMsg.status !== "OK") {

            // display warning if source status is also an error
            if (logger && srcMsg.status !== "OK")
                logger.warn("mergeMessages: Trying to merge copy two error statuses: " + srcMsg.status + " into " + tgtMsg.status);

            return;
        }

        // merge the status
        tgtMsg.status = srcMsg.status;
    }

    valNameMapping = valNameMapping || {};
    // msg like SVRC_GET_FORM's msg._data is null, but contains a WEB_PN_ID as a return value
    // if we don't assign a default object here, statement below will throw a null exception
    tgtMsg._data = tgtMsg._data || {};

    for (var key in srcMsg._data) {
        tgtMsg._data[valNameMapping[key] || key] = srcMsg._data[key];
    }

    for (var p in valNameMapping) {
        if (p !== valNameMapping[p])
            tgtMsg._data[p] = tgtMsg._data[valNameMapping[p]];
    }

    mergeStatus(tgtMsg, srcMsg, logger);

    return tgtMsg;
}

var ErrorReporter = {
	ThrowGeneralError: function () {
		throw this.CreateExceptionObjFromStatus("ERROR");
	},
	ThrowNotImplemented: function (method) {
		var e = this.CreateExceptionObjFromStatus("NotImplemented");
		e.Details = method;
		throw e;
	},
	ThrowObjectNotFound: function () {
		throw this.CreateExceptionObjFromStatus("ObjectNotFound");
	},
    ThrowObjectDisabled: function () {
		throw this.CreateExceptionObjFromStatus("ObjectDisabled");
	},
	ThrowItemNotFound: function () {
		throw this.CreateExceptionObjFromStatus("ItemNotFound");
	},
	ThrowItemNotUnique: function () {
	    throw this.CreateExceptionObjFromStatus("ItemNotUnique");
	},
	ThrowInvalidArg: function () {
		throw this.CreateExceptionObjFromStatus("InvalidArgument");
	},
	ThrowOutOfRange: function () {
		throw this.CreateExceptionObjFromStatus("OutOfRange");
	},
	ThrowMethodNotFound: function () {
	    throw this.CreateExceptionObjFromStatus("MethodNotFound");
	},
	CreateExceptionObjFromStatus: function (status) {
		return new Error(status);
	}
};

var Util = {

    /**
    * identity() returns the same value that is used as the argument. In math: f(x) = x
    * @param {*} x - Whatever you want
    * @returns {*} The value passed as an argument
    */
    identity: function (x) {
        return x;
    },
    identityWithCallback: function(x) {
        var resultCallback = arguments[arguments.length - 1];

        resultCallback(x);
    },
	isUndefined: function (x) {
		return typeof (x) === "undefined";
	},
	isNullOrUndefined: function(x) {
	    return Util.isUndefined(x) || x === null;
	},
	isObject: function (val) {
		return typeof (val) === "object" && !Array.isArray(val);
	},
	isFunction: function (val) {
	    return typeof (val) === "function";
	},
	isLegacyObject: function(obj) {
	    if (typeof (obj) !== "undefined")
	        return false;

	    // This is in the special case of document.all , here are it's charectaristics:
	    // * typeof(document.all) === 'undefined'
	    // * Boolean(document.all) === false
	    // * document.all.toString() === "[object HTMLAllCollection]"
	    var objStrVal = "" + obj; // this is so that if obj is null/undefined we don't get an exception
	    if (objStrVal.search("HTMLAllCollection") !== -1)
	        return true;

	    return false;
	},

    /**
    * parseJSON() safely parse JSON strings to objects
    * @param {String} string - JSON string to be parsed
    * @param {Object} [logger] - logger to be used to log errors
    * @returns {Object} object resulted from parsing the passed string. null is returned if parsing fails.
    */
	parseJSON: function (str, logger) {
		if (typeof(JSON) === "undefined" || JSON.parse == null) {
			if (logger)
				logger.error("JSON or JSON.parse is undefined");
			return null;
		}
		if (!str) {
			if (logger)
				logger.error("Tried to parse empty message");
			return null;
		}
		if (logger)
			logger.trace("Parsing string: \n", str);

		try {
			return JSON.parse(str);
		}
		catch (e) {
			if (logger)
				logger.error("Failed to parse string with exception: " + e + "\nString was: " + str + "\nStack:" + e.stack);
			return null;
		}
	},

    /**
    * capitalize() makes the first letter in str upper case
    * @param {String} str - a string
    * @returns {String} The capitalized string
    **/
	capitalize: function (str) {
	    return str[0].toUpperCase() + str.slice(1);
	},

    /**
    * alwaysFalse() returns false
    * @returns {boolean} false
    */
	alwaysFalse: function () {
		return false;
	},

    /**
    * alwaysTrue() returns true
    * @returns {boolean} true
    */
	alwaysTrue: function () {
		return true;
	},

    /**
    * makeArray() method converts array-like objects to real arrays
    * @param {Object} seq - The array-like object
    * @returns {Array} an array containing the elements of the array-like object
    */
	makeArray: function (seq) {
	    if (Array.isArray(seq))
	        return seq;

	    var array = new Array(seq.length);
	    for (var i = 0; i < seq.length; i++) {
	        array[i] = seq[i];
	    }

	    return array;
	},

	/**
	 * The arrayFindIndex() method returns an index in the array, if an element in the array satisfies the provided testing function. Otherwise -1 is returned.
	 * Once Chrome & Safari support Array.findIndex (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex)
	 *  this function should be removed
	 * @param {Array} arr - The array object to look in
	 * @param {Function} predicate - The predicate function to run on each element on the array
	 * @param {Object} [thisArg] - The context of in which the predicate should be called
	 * @returns {Number} The index in the array for which the predicate function is true
	 */
	arrayFindIndex: function (arr, predicate, thisArg) {
	    thisArg = thisArg || this;
	    var result = -1;
	    var realArray = Util.makeArray(arr);
	    realArray.some(function (element, index, array) {
	        if (predicate.call(thisArg, element, index, array)) {
	            result = index;
	            return true;
	        }
	        return false;
	    });

	    return result;
	},

    /**
	 * The arrayFind() method returns a value in the array, if an element in the array satisfies the provided testing function. Otherwise undefined is returned.
	 * Once Chrome & Safari support Array.find (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find)
	 *  this function should be removed
	 * @param {Array} arr - The array object to look in
	 * @param {Function} predicate - The predicate function to run on each element on the array
	 * @param {Object} [thisArg] - The context of in which the predicate should be called
	 * @returns {*} The first value in the array that satisfies 'predicate' or 'undefined' if none do
	 */
	arrayFind: function (arr, predicate, thisArg) {
	    var realArray = Util.makeArray(arr);
	    var index = Util.arrayFindIndex(realArray, predicate, thisArg);
	    if (index !== -1)
	        return arr[index];
	},

	/**
	 * arrayCompact() method returns a copy of the array with all falsy values removed. In JavaScript, false, null, 0, "", undefined and NaN are all falsy.
	 *                    returns null if parameter passed to it is not an array.
	 * @param {Array} arr - The array to compact
	 * @returns {Array} a copy of the array without all falsy elements
	 */
	arrayCompact: function(arr) {
	    if (!Array.isArray(arr))
	        return null;

	    return arr.filter(Util.identity);
	},

	/**
	 * arrayWrap() method returns the array of the object passed to it is an array, otherwise it returns an array with one elements which is the object passed to it
	 * @param {Object} obj - The object to wrap with an array
	 * @returns {Array} an array containing the object passed as param or obj obj is an array
	 */
	arrayWrap: function (obj) {
	    if (Array.isArray(obj))
	        return obj;

	    return [obj];
	},

	arrayReduce: function (array, iterateFunc, startVal) {
	    if (!Array.isArray(array))
	        return null;
	    var startIndex = 1;
	    var cumulator = array[0];
	    if (!!startVal) {
	        cumulator = startVal;
	        startIndex = 0;
	    }
	    for (var i = startIndex; i < array.length; i++) {
	        cumulator = iterateFunc(cumulator, array[i], i, array);
	    }
	    return cumulator;
	},
    /**
	 * stringNthPosition() method returns the n`th position of a substring in a string
	 * @param {String} str - The string to search in
	 * @param {String} substr - The sub-string to search for
	 * @param {Number} n - The occurence number of the substring to search for
     * @returns {Number} the index of the n'th occurence of the substring in the string. This value is -1 if there's no n'th occurence of the substring.
	 */
	stringNthPosition: function (str, substr, n) {
	    var pos = -1;

	    while (n--) {
	        var index = str.indexOf(substr, pos + 1);
	        if (index === -1)
	            return -1;

	        pos = index;
	    }

	    return pos;
	},

	/**
	 * stringCount() method returns the number of occurences of a substring in a string. The returned number includes overlapping substrings.
     *   for example: "ababa" has 2 "aba"'s in it
     * @param {String} str - The string to search in
	 * @param {String} substr - The sub-string to search for
     * @returns {Number} the number of occurences of the subtring in the full string. -1 for empty substrings.
	 */
	stringCount: function (str, substr) {
	    if (!substr)
	        return -1;

	    var count = -1;
	    var index = -1;

	    do {
	        count++;
	        index = str.indexOf(substr, index + 1);
	    } while (index !== -1);

	    return count;
	},

	stringTrimLeft: function (str) {
	    if (typeof (str) !== "string")
	        throw Error("stringTrimLeft called with non-string");

	    if (typeof (str.trimLeft) === "function")
	        return str.trimLeft(str);

	    return str.replace(/^\s+/, "")
	},

	formatString: function (format) {
	    var args = Array.prototype.slice.call(arguments, 1);
	    return format.replace(/{(\d+)}/g, function (match, number) {
	        return typeof args[number] != 'undefined'
              ? args[number]
              : match
	        ;
	    });
	},

	shallowObjectClone: function (srcObj) {
		var targetObj = {};
		for (var key in srcObj) {
			// We don't clone functions here, because when calling window.postMessage with cloned objects, objects with function members will trigger exception
			// Detail: https://stackoverflow.com/questions/46145403/failed-to-execute-postmessage-on-serviceworker-function-could-not-be-cloned
			if (typeof srcObj[key] !== "function") {
				targetObj[key] = srcObj[key];
			}
		}
		return targetObj;
	},
	deepObjectClone: function (srcObj) {
	    if (srcObj == null || typeof srcObj !== "object") {
	        return srcObj;
	    }
	    var targetObj;
	    if (Array.isArray(srcObj)) {
	        targetObj = [];
	        for (var index = 0; index < srcObj.length; index++) {
	            var cloneValue = arguments.callee(srcObj[index]);
	            targetObj[index] = cloneValue;
	        }
	        return targetObj;
	    }
	    var constr = srcObj.constructor;
	    switch (constr) {
	        case RegExp:
	            targetObj = new RegExp(srcObj);
	            break;
	        case Date:
	            targetObj = new Data(srcObj.getTime());
	            break;
	        default:
	            targetObj = {};
	            break;
	    }
	    for (var key in srcObj) {
	        targetObj[key] = arguments.callee(srcObj[key]);
	    }
	    return targetObj;
	},
    // Don't require all the element to be contained in its parents, 90% is enough (magic number pulled out of thin air)
    // Kronos case (QCIM1J76091): if the intersection is above a certain threshold we dont need to scroll (without taking into account the size of the element)
    isVisible: function (elemRect, containerRect) {
        var intersection = Util.intersectRect(containerRect, elemRect);
        if (Util.isRectEmpty(intersection))
            return false;
	    var minimalIntersectionSize = Math.min(Util.rectArea(elemRect) * 0.9, 10000);
	    return Util.rectArea(intersection) > minimalIntersectionSize;
    },

    isRectFullyInRect: function (elemRect, containerRect) {
        var intersection = Util.intersectRect(containerRect, elemRect);
        if (Util.isRectEmpty(intersection))
            return false;

        return Util.rectArea(intersection) == Util.rectArea(elemRect);
    },

    rectArea: function (rect) {
        if (!Util.isRect(rect)) {
            return 0;
        }
        var width = rect.right - rect.left;
        var height = rect.bottom - rect.top;
        return width * height;
    },
    intersectRect: function (r1, r2) {
        var intersectionRect = { top: 0, left: 0, bottom: 0, right: 0 };
        // if one of two rectanges is invalid, an empty one is returned meaning no intersection.
        if (Util.isRectEmpty(r1) || Util.isRectEmpty(r2))
            return intersectionRect;

        // If top-left coordinate of one rectangle is contained in other one and vice versa, two rectangles are intersected.
        var isIntersected = false;
        if (((r1.left < r2.right && r1.left >= r2.left) || (r2.left < r1.right && r2.left >= r1.left))
            && ((r1.top < r2.bottom && r1.top >= r2.top) || (r2.top < r1.bottom && r2.top >= r1.top)))
            isIntersected = true;

        if (!isIntersected)
            return intersectionRect;

        // calculate intersection rectangle
        intersectionRect.top = Math.max(r1.top, r2.top);;
        intersectionRect.left = Math.max(r1.left, r2.left);
        intersectionRect.bottom = Math.min(r1.bottom, r2.bottom);
        intersectionRect.right = Math.min(r1.right, r2.right);

        return intersectionRect;
    },
    getCenterPoint: function (rect) {
        return {
            x: (rect.left + rect.right) / 2,
            y: (rect.top + rect.bottom) / 2
        };
    },
    isPoint: function (point) {
        return !Util.isUndefined(point) &&
                !Util.isUndefined(point.x) &&
                !Util.isUndefined(point.y);
    },
    isRect: function (rectCandidate) {
        return !Util.isUndefined(rectCandidate) &&
	            !Util.isUndefined(rectCandidate.top) &&
                !Util.isUndefined(rectCandidate.bottom) &&
                !Util.isUndefined(rectCandidate.left) &&
                !Util.isUndefined(rectCandidate.right);
    },

    isCircle:function (circleCandidate) {
        return !Util.isUndefined(circleCandidate) &&
	            !Util.isUndefined(circleCandidate.x) &&
                !Util.isUndefined(circleCandidate.y) &&
                !Util.isUndefined(circleCandidate.radius) &&
                circleCandidate.radius >= 0;
    },

    isEqualRects: function (rect1, rect2, threshold) {
        if (!threshold)
            threshold = 10;

        var isEdgeEqual = function (e1, e2) {
            return Math.abs(e1 - e2) < threshold;
        };

        if (!Util.isRect(rect1) || !Util.isRect(rect2))
            return false;

        return isEdgeEqual(rect1.top, rect2.top) &&
                isEdgeEqual(rect1.bottom, rect2.bottom) &&
                isEdgeEqual(rect1.left, rect2.left) &&
                isEdgeEqual(rect1.right, rect2.right);
    },

    /**
	 * isRectEmpty() method to check whether a rectangle has positive size.
     * @param {Object} rect - A rectangle contains left, top, right and bottom.
     * @returns {Boolean} True if rectangle is empty, false the other case.
    */
    isRectEmpty: function (rect) {
        if (!Util.isRect(rect)) return true;
        return rect.right <= rect.left || rect.bottom <= rect.top;
    },

    isPointInRect: function (point, rect, logger) {
        logger = logger || LoggerUtilSettings.getEmptyLogger();

        if (!Util.isPoint(point)) {
            logger.error("isPointInRect: received invalid point: ", point);
            return false;
        }

        if (!Util.isRect(rect)) {
            logger.error("isPointInRect: received invalid rect: ", rect);
            return false;
        }

        return ((point.x >= rect.left) &&
                (point.x <= rect.right) &&
                (point.y >= rect.top) &&
                (point.y <= rect.bottom));
    },

    isPointInCircle: function(point, circle, logger) {
        logger = logger || LoggerUtilSettings.getEmptyLogger();

        if (!Util.isPoint(point)) {
            logger.error("isPointInCircle: received invalid point: ", point);
            return false;
        }

        if (!Util.isCircle(circle)) {
            logger.error("isPointInCircle: received invalid circle: ", circle);
            return false;
        }

        var dx = circle.x - point.x;
        var dy = circle.y - point.y;
        var dist = (dx * dx) + (dy * dy);
        if (dist <= (circle.radius * circle.radius))
            return true;

        return false;
    },

    isPointInPoly: function (point, coords, logger) {
        logger = logger || LoggerUtilSettings.getEmptyLogger();

        if (Util.isNullOrUndefined(coords) || !Array.isArray(coords)) {
            logger.error("isPointInPoly: received invalid coords: ", coords);
            return false;
        }

        var intersects = 0;
        var wherex = point.x;
        var wherey = point.y;
        var totalv = coords.length / 2;
        var totalc = totalv * 2;
        var xval = coords[totalc - 2];
        var yval = coords[totalc - 1];
        var end = totalc;
        var pointer = 1;

        if ((yval >= wherey) != (coords[pointer] >= wherey))
            if ((xval >= wherex) == (coords[0] >= wherex))
                intersects += (xval >= wherex) ? 1 : 0;
            else
                intersects += ((xval - (yval - wherey) *
                (coords[0] - xval) /
                (coords[pointer] - yval)) >= wherex) ? 1 : 0;

        // XXX I wonder what this is doing - so do I; this is a translation of ptinpoly.c
        while (pointer < end) {
            yval = coords[pointer];
            pointer += 2;
            if (yval >= wherey) {
                while ((pointer < end) && (coords[pointer] >= wherey))
                    pointer += 2;
                if (pointer >= end)
                    break;
                if ((coords[pointer - 3] >= wherex) ==
                    (coords[pointer - 1] >= wherex))
                    intersects += (coords[pointer - 3] >= wherex) ? 1 : 0;
                else {
                    intersects +=
                        ((coords[pointer - 3] - (coords[pointer - 2] - wherey) *
                        (coords[pointer - 1] - coords[pointer - 3]) /
                        (coords[pointer] - coords[pointer - 2])) >= wherex) ? 1 : 0;
                }
            }
            else {
                while ((pointer < end) && (coords[pointer] < wherey))
                    pointer += 2;
                if (pointer >= end)
                    break;
                if ((coords[pointer - 3] >= wherex) ==
                    (coords[pointer - 1] >= wherex))
                    intersects += (coords[pointer - 3] >= wherex) ? 1 : 0;
                else {
                    intersects +=
                        ((coords[pointer - 3] - (coords[pointer - 2] - wherey) *
                        (coords[pointer - 1] - coords[pointer - 3]) /
                        (coords[pointer] - coords[pointer - 2])) >= wherex) ? 1 : 0;
                }
            }
        }
        if ((intersects & 1) != 0)
            return true;

        return false;

    },

    getAgentNPObj: function () {
        return window.document.getElementById("__QTP__OBJ__");
    },
    assert: function (cond, msg, logger) {
        if (!cond) {
            if (logger)
                logger.error("ASSERT: " + msg);
            //alert(msg);
        }
    },
    generateQTPPropertyName: function () {
        return "__QTP__" + (new Date()).getTime();
    },
    padLeft: function (n, ndigits) { // pad a number with leading zeros to ndigits
        var num = "" + n; // convert number to string
        var zeros = ndigits - num.length; // how many zeros to pad
        while (zeros > 0) {
            num = "0" + num;
            --zeros;
        }
        return num;
    },
    getTextNodesValue: function (node) {
        if (node.tagName === "SCRIPT") {
            return [];
        }

        if (node.nodeType === 3) {
            return [node.nodeValue];
        }
        var res = [];
        var childNodes = Util.makeArray(node.childNodes);
        childNodes.forEach(function (element) {
            res = res.concat(Util.getTextNodesValue(element));
        });
        return res;
    },
    cleanSpecialChars: function (strToClean) {
        if (typeof strToClean !== 'string')
            return strToClean;

        // Handle String
        var cleanAttrVal = strToClean.replace(/\n|\r/gm, "");
        cleanAttrVal = cleanAttrVal.replace(/\t/g, " ");
        return cleanAttrVal;
    },

    /**
     * cleanMultipleSpaces() method cleans multiple spaces and replaces them with a single space
     * @param {String} strToClean - The string to clean
     * @returns {String} the result clean string. if parameter is not a legal string, the parameter is returned instead.
     */
    cleanMultipleSpaces: function(strToClean) {
        if (typeof strToClean !== 'string')
            return strToClean;

        strToClean = strToClean.replace(/\xa0/g, ' '); // replace "&nbsp;" with ' '
        return strToClean.replace(/ +/g, ' '); // collapse adjacent spaces
    },
    browserApplicationVersion: function (logger) {
        // For Firefox.
        if (typeof navigator === "undefined" && typeof require === "function" && typeof requirejs === "undefined") {
            var system = require("sdk/system");

	        if (system)
            {
                var appVersion = system.vendor + " " + system.name + " " + system.version;
                return appVersion;
            }
        }

        var browserVersion = Util._parseUserAgent(navigator.userAgent, logger);
        if (browserVersion)
            return browserVersion;

        var browserVersion = Util._guessBrowserFromVendorAndPlatform(navigator.vendor, navigator.platform, logger);
        if (browserVersion)
            return browserVersion;

        if (logger) logger.error("browserApplicationVersion: unable to detect browser");

        return "UnknownBrowser 0";
    },
    _parseUserAgent: function (userAgent, logger) {
        var browserName, regex;
        if (userAgent.indexOf("OPR") !== -1) {
            // "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.73 Safari/537.36 OPR/34.0.2036.25"
            browserName = "Opera";
            regex = /OPR\S+/;
        }
        else if (userAgent.indexOf("Edge") !== -1) {
            // "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240"
            regex = /Edge\S+/;
            browserName = "Edge";
        }
        else if (userAgent.indexOf("Edg") !== -1) {
            // "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36 Edg/80.0.361.66"
            regex = /Edg\S+/;
            browserName = "Chromium Edge";
        }
        else if (userAgent.indexOf("PhantomJS") !== -1) {
            // "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1"
            regex = /PhantomJS\S+/;
            browserName = "PhantomJS";
        }
        else if (userAgent.indexOf("Chrome") !== -1) {
            // "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36"
            regex = /Chrome\S+/;
            browserName = "Chrome";
        }
        else if (userAgent.indexOf("Firefox") !== -1) {
            // "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0"
            regex = /Firefox\S+/;
            browserName = "Mozilla Firefox";
        }
        else if (userAgent.indexOf("Safari") !== -1 && userAgent.indexOf("Version") !== -1) {
            //"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/600.6.3 (KHTML, like Gecko) Version/7.1.6 Safari/537.85.15"
            regex = /Version\S+/;
            browserName = "Safari";
        }
        else if (userAgent.indexOf("JavaFX") !== -1){
            //Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.14(KHTML,Like Gecko) JavaFX/2.2 Safari/535.14
            regex = /JavaFX\S+/;
            browserName = "JavaFX";
        }
        else if (userAgent.indexOf("iPhone") !== -1 || userAgent.indexOf("iPad") !== -1 || userAgent.indexOf("iPod") !== -1) {
            // Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12F69
            // Mozilla/5.0 (iPad; CPU OS 7_1_1 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Mobile/11D201
            regex = /\b(?:iPhone|iPad|iPod)\b.*?OS [\d_]+/
            browserName = "Safari";
        }
        else {
            if (logger) logger.warn("_parseUserAgent: unknown user agent: " + userAgent);
            return null;
        }

        var sVersion = regex.exec(userAgent);
        if (!sVersion) {
            if (logger) logger.warn("_parseUserAgent: unable to parse user agent: " + userAgent);
            return null;
        }

        var sVersion = sVersion[0];
        sVersion = sVersion.replace("/", " ");
        sVersion = sVersion.replace(/_/g, "."); // replace all occurences of _ with .
        sVersion = sVersion.slice(sVersion.lastIndexOf(" ") + 1);

        var version = sVersion.split(".");
        return browserName + " " + version[0] + "." + version[1];
    },

    _guessBrowserFromVendorAndPlatform: function(vendor, platform, logger) {
        if (vendor == null || platform == null) {
            if (logger) logger.error("_guessBrowserFromVendorAndPlatform: missing vendor or platform values. vendor: " + vendor + " platform: " + platform);
            return null;
        }

        if (vendor.match(/apple/i) && platform.match(/(?:ipad|ipod|iphone)/i))
            return "Safari 0";

        if (logger) logger.warn("_guessBrowserFromVendorAndPlatform: unable to detect browser. vendor: " + vendor + " platform: " + platform);
        return null;
    },

	jsonStringify: function (jsonObj, logger) {
	    if (typeof (JSON) === "undefined") {
	        if (logger)
	            logger.error("jsonStringify: JSON is undefined");
	        return null;
	    }
	    if (JSON.stringify == null) {
	        if (logger)
	            logger.error("jsonStringify: JSON.stringify is undefined");
	        return null;
	    }

		return JSON.stringify(jsonObj);
	},

    cleanTextProperty: function (text) {
        if (typeof text !== 'string') {
            return text;
        }

        text = Util.stringTrimLeft(text);
        text = text.replace(/\t/g, " ");
        //for defect AGM 3497 [Cross browser support]Difference between properties between IE and Firefox & Chrome
        //replace the enter character with space in order that the behavior will be same in 3 browsers
        text = text.replace(/\r\n|\r|\n/g, " ");
        text = text.replace(/ +/g, " "); // collapse adjacent spaces
        text = text.replace(/\xA0/g, " "); // &nbsp;
        return text;
    },
    extend: function (obj, properties) {
        if (properties) {
            Object.keys(properties).forEach(function (key) {
                obj[key] = properties[key];
            });
        }
        return obj;
    },

    /**
    * Calculate and return the rectangle of the tab with the given dimensions
    * @param {Object} pageDimensions - Page Dimensions object contains the values for keys: innerHeight, outerHeight, innerWidth, outerWidth, window_rect
    * @param {Object} logger - the logger instance to be used
    * @returns the rectangle of the tab
    */
    calculateTabRect: function (pageDimensions, logger)
    {
        if (!pageDimensions.window_rect) {
            if (logger)
                logger.warn("window_rect is null on pageDimensions.");
            return null;
        }

        if (logger)
            logger.trace("calculateTabRect: pageDimensions: ", pageDimensions);

        var deltaWidth = pageDimensions.outerWidth > pageDimensions.innerWidth ? pageDimensions.outerWidth - pageDimensions.innerWidth : 0;
        var deltaHeight = pageDimensions.outerHeight > pageDimensions.innerHeight ? pageDimensions.outerHeight - pageDimensions.innerHeight : 0;

        // Since we can't calculate the top and bottom borders (due to the Omnibox) we assume the top and bottom borders are the same as those on the sides
        var borderPixels =deltaWidth / 2;

        var rect = {};
        var window_rect = pageDimensions.window_rect;

        rect.top = window_rect.top + deltaHeight - borderPixels;
        if (typeof navigator !== "undefined" && navigator.userAgent.indexOf("Edge") != -1 && BrowserServices.isEdgeMaximized()) {
            rect.top -= (window.outerHeight - window.screen.availHeight) / 2;
        }
        rect.bottom = window_rect.top + pageDimensions.outerHeight;
        rect.left = window_rect.left + borderPixels;
        rect.right = window_rect.left + pageDimensions.outerWidth - borderPixels;

        return rect;
    },

	calculateTabRectByScreenAttribs: function (pageDimensions, logger)
    {
        if (logger)
            logger.trace("calculateTabRectByScreenAttribs: pageDimensions: ", pageDimensions);

		var screen_height = screen.height;
		var screen_availheight = screen.availHeight;
		var screen_width = screen.width;
		var screen_availwidth = screen.availWidth;

		// Since we can't calculate the top and bottom borders (due to the Omnibox) we assume the top and bottom borders are the same as those on the sides
		var borderPixels = (screen_availwidth - pageDimensions.innerWidth) / 2;

		//calculate the signal bar height
		var signal_bar = screen_height - screen_availheight;

		//calculate the address bar height, assume the address bar and the button bar have same height
		var address_bar = (screen_availheight - pageDimensions.innerHeight)/2;

		var rect = {};
		var window_rect = pageDimensions.window_rect;
		rect.top = window_rect.top + address_bar + signal_bar - borderPixels;
		rect.bottom = window_rect.top + screen_availheight;
		rect.left = window_rect.left + borderPixels;
		rect.right = window_rect.left + screen_availwidth - borderPixels;

        return rect;
    },

    getMicClass: function (ao) {
        var micclass = ao.GetAttrSync('micclass');
        while (Array.isArray(micclass))
            micclass = micclass[0];
        return micclass;
    },

    isContainerMicclass: function (micclass) {
        return micclass === "Browser" || micclass === "Page" || Util.isFrame(micclass);
    },

    isFrame: function (micclass) {
        return micclass === "Frame" || micclass === "SAPFrame";
    },

    /**
     * Polymorphic mapping. If `obj` is an Array, return obj.map(func), otherwise return func(obj)
     * @param {*} obj - Either a scalar or an Array
     * @param {function} func - The function that performs the mapping
     * @param {Object} [thisArg] - The context of in which the map function should be called
     * @returns obj as mapped by func
     */
    map: function (obj, func, thisArg) {
        thisArg = thisArg || this;
        if (Array.isArray(obj))
            return obj.map(func, thisArg);

        return func.call(thisArg, obj);
    },

    /**
     * objectFromArray() returns an object which has all array elements represented in it as properties
     * @param {Array} arr - The array who's elements should be translated to object properties
     * @param {Object} value - The value to give these properties (fixed value for all of the properties in the newly created object)
     * @returns {Object} a result object with the properties in the array
     */
    objectFromArray: function (arr, value) {
        var obj = Object.create(null);

        arr.forEach(function (key) {
            obj[key] = value;
        });

        return obj;
    },

    /**
     * simple class inheritance
     * @param {Function} child
     * @param {Function} base
     * @param {Object} [properties] override functions or new properties
     */
    inherit: function (child, base, properties) {
        var baseP = base.prototype;

        child.prototype = Object.create(baseP);
        var childP = child.prototype;

        childP.constructor = child;

        Util.extend(childP, properties);
    },

    functionStringify: function (func) {
        if (typeof (func) !== 'function')
            return null;

        return '(' + func.toString() + ')();';
    },

    convertXmlStrToJson: function (xmlDoc) {
        var x2js = new X2JS();
        return x2js.xml_str2json(xmlDoc);
    },

    isInjectableUrl: function (url) {
        if (!url)
            return false;

        // Starts with 'XX:'
        return !url.match(/^(?:chrome|edge|opera|about|javascript):/);
    },

    /**
     * traverseObject() traverses an object and calls a visitor function for every node of the object
     * @param {Object} obj - The object to traverse
     * @param {function} traverseVisitorFunc - The visitor function that will be called for each node.
     *    signature: {Boolean} traverseVisitorFunc({Object} parentNode, {String} nodeName, {String} parentPath)
     *    if the visitor function returns false, the traverse will stop.
     */
    traverseObject: function (obj, traverseVisitorFunc, parentPath) {

        // in the first call (with root node) parentPath is empty string
        parentPath = parentPath || "";

        for (var nodeName in obj) {

            // call visitor
            var cont = traverseVisitorFunc(obj, nodeName, parentPath);
            if (cont === false)
                return;

            // none-null object nodes are traversed recursively
            if (typeof (obj[nodeName]) === "object" && obj[nodeName] != null)
                this.traverseObject(obj[nodeName], traverseVisitorFunc, parentPath + nodeName + "/");
        }
    },

    /**
    * Checks is an element has a specified CSS class
    * @param {element} elem - the element to examine
    * @param {string} name - a CSS class
    * @returns {boolean} - whether the element has the specified CSS class
    **/
    elemHasClass: function (elem, name) {
        if (elem.classList && elem.classList.contains)
            return elem.classList.contains(name);

        if (!elem.className)
            return false;

        var names = elem.className.split(/\s+/);
        return names.indexOf(name) != -1;
    },
    /**
    * calls a function after a specified number of milliseconds.
    * @param {function} func - the function that will be executed.
    * @param {Number} timeout - the number of milliseconds to wait before execute the code
    * @param param1, param2... - Optional. Additional parameters to pass to the function.
    * @return {Number} a number, representing the ID value of the timer that is set.
    */
    setTimeout: function (func, timeout) {
        var setTimeoutFunction;
        //this judgement must be execute first, Firefox may throw exception when use window.setTimeout
        if (typeof require === "function" && typeof requirejs === "undefined") {
            try {
                var timers = require("sdk/timers");
                if (timers)
                    setTimeoutFunction = require("sdk/timers").setTimeout;
            } catch(e) {
            }
        }

        if (!setTimeoutFunction && typeof window === "object") {
            setTimeoutFunction = window.setTimeout;
        }

        setTimeoutFunction = setTimeoutFunction || setTimeout;

        return setTimeoutFunction.apply(window, arguments);
    },
    /**
    * calls a function or evaluates an expression at specified intervals (in milliseconds)
    * @param {function} func - The function that will be executed.
    * @param {number} timeout - The intervals (in milliseconds) on how often to execute the code.
    * @param param1, param2,... Optional. Additional parameters to pass to the function.
    * @return {Number} A number, representing the ID value of the timer that is set. Use this value
    *   with the clearInterval() method to cancel the timer.
    *
    */
    setInterval: function (func, timeout) {
        var setIntervalFunction;
        //this judgement must be execute first, Firefox may throw exception when use window.setInterval
        if (typeof require === "function" && typeof requirejs === "undefined") {
            try {
                var timers = require("sdk/timers");
                if (timers)
                    setIntervalFunction = require("sdk/timers").setInterval;
            } catch(e) {
            }
        }

        if (!setIntervalFunction && typeof window === "object") {
            setIntervalFunction = window.setInterval;
        }

        setIntervalFunction = setIntervalFunction || setInterval;

        return setIntervalFunction.apply(window, arguments);
    },
    /**
    * Clears a timer set with the setInterval() method.
    * @param id_of_setinterval - the ID of the timer returned by the setInterval() method.
    * @returns No return value
    */
    clearInterval: function (id_of_setinterval) {
        var clearIntervalFunction;
        //this judgement must be execute first, Firefox may throw exception when use window.setInterval
        //so we use require("sdk/timers").setInterval for Firefox, so here we use  require("sdk/timers").clearInterval accordingly
        if (typeof require === "function" && typeof requirejs === "undefined") {
            try {
                var timers = require("sdk/timers");
                if (timers)
                    clearIntervalFunction = require("sdk/timers").clearInterval;
            } catch(e) {
            }
        }

        if (!clearIntervalFunction && typeof window === "object") {
            clearIntervalFunction = window.clearInterval;
        }

        clearIntervalFunction = clearIntervalFunction || clearInterval;

        return clearIntervalFunction.apply(window, [id_of_setinterval]);
    },

    /**
     * nodeContains() is a browser agnostic wrapper for Node.prototype.contains which is similar to calling rootNode.contains(otherNode)
     *                  returns a Boolean value indicating whether a node (otherNode) is a descendant of a given node (rootNode) or not.
     *                  https://developer.mozilla.org/en/docs/Web/API/Node/contains
     * @param {node} rootNode - the potential parent node
     * @param {node} otherNode - the other node.
     * @returns {boolean} whether or not otherNode is a decendant of rootNode.
     */
    nodeContains: function (rootNode, otherNode) {
        if (rootNode == null || otherNode == null)
            return false;

        if (rootNode.contains != null)
            return rootNode.contains(otherNode);

        if (rootNode === otherNode)
            return true;

        if (rootNode.compareDocumentPosition)
            return !!(rootNode.compareDocumentPosition(otherNode) & Node.DOCUMENT_POSITION_CONTAINED_BY);

        var currentNode = otherNode.parentNode;
        while (currentNode) {
            if (currentNode === rootNode) {
                return true;
            }

            currentNode = currentNode.parentNode;
        }

        return false;
    },

    /**
     * returns a new string with some or all maches of a pattern replaced by a replacement which is string.
     * Note: we wrap the replacement string with an anonymouse function so it won't be mistreated as special replacement patterns.
     * Following we can find more details about raw string.replace.
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
     */
    safeReplace: function(source, search, replacement) {
        return source.replace(search, function() { return replacement; });
    },

    /**
    * Traversing up through its ancestors in the DOM tree and returns the element that matches the predicate
    */
    findAncestor: function (element, pred) {
        for (var elem = element; elem; elem = elem.parentElement)
            if (pred(elem))
                return elem;
    },

    isExtEventRegistered: function (element, eventName) {
        var attr = element.getAttribute("_uft_ext_events_hooked");
        var json = attr ? JSON.parse(attr) : null;
        var eventAttached = (json && json.events) ? json.events.indexOf("on" + eventName.toLowerCase()) >= 0 : false;
        return eventAttached;
    },
    startsWith: function(str, sub){
        if (typeof str !== "string" || typeof sub !== "string")
            return false;
        return str.startsWith ? str.startsWith(sub) : (str.indexOf(sub)== 0);
    },
    isFrameXSS: function (frameElem, containerWin) {
        try{
          if (frameElem.src == "gap://ready")
            return false;
        	var doc = frameElem.contentWindow.document;
        }catch(ex){
        	return false;
        }
        return true;
    },
    safeConsoleError:function(str){
    	var func = console.error || console.log;
    	if(func)
    		func.call(console, str);
    },
    safeConsoleWarn:function(str){
    	var func = console.warn || console.log;
    	if(func)
    		func.call(console, str);
    },
    valMatchReg:function(actualValue, expectReg){
		var regExp = new RegExp("^\\s*(?:" + expectReg + ")\\s*$", "i");
        return regExp.test(actualValue);
    },
    getChromeVersion: function  () {
        var pieces = navigator.userAgent.match(/Chrom(?:e|ium)\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/);
        if (pieces == null || pieces.length != 5) {
            return undefined;
        }
        pieces = pieces.map(function(piece) {
            return parseInt(piece, 10);
        });
        return {
            major: pieces[1],
            minor: pieces[2],
            build: pieces[3],
            patch: pieces[4]
        };
    },
    getMaxLevel: function(win){
    	return CrossContextCfgUtil.getConfig("MaxIFrameDepthToWait");
    },
    getWindowDepth:function(){
        var win = window;
        var level = 0;
        while(win != win.parent){
            win = win.parent; 
            ++level;
        }
        return level;
    },
    getDynamicTimeoutValue:function(){
       var toWait = this.getMaxLevel() - this.getWindowDepth() - 1;
       toWait = toWait<=0 ? 1 : toWait;
       return toWait*500 + 500;
    }
};


var Constants = {
    noCoordinate: -9999,
};

var RtIdUtils = {
    IsRuntimeId: function (webId) {

        if (!webId) {
            return false;
        }

        if (typeof (webId) !== "object") {
            return false;
        }

        if (!("browser" in webId && "page" in webId && "frame" in webId && "object" in webId)) {
            return false;
        }

        if (webId.browser >= -1 && webId.page >= -1 && webId.frame >= -1) {
            // webId is legal runtime Id of AO
            return true;
        }
        else if (RtIdUtils.IsRTIDExtension(webId)) {
            // webId is legal runtime Id of Extension
            return true;
        }
        else if (RtIdUtils.IsRTIDTestingTool(webId)) {
            // webId is legal runtime Id of UFT / Testing Tool
            return true;
        }
        else {
            return false;
        }
    },
    IsRTIDAgent: function (rtid) {
        return rtid.browser === -1 && rtid.page === -1 && rtid.frame === -1 && rtid.object === null;
    },
    IsRTIDBrowser: function (rtid) {
        return rtid.browser !== -1 && rtid.page === -1 && rtid.frame === -1 && rtid.object === null;
    },
    IsRTIDPage: function (rtid) {
        return rtid.browser !== -1 && rtid.page !== -1 && rtid.frame === -1 && rtid.object === null;
    },
    IsRTIDFrame: function (rtid) {
        return rtid.browser !== -1 && rtid.page !== -1 && rtid.frame !== -1 && rtid.object === null;
    },
    IsRTIDAO: function (rtid) {
        return rtid.browser !== -1 && rtid.page !== -1 && rtid.frame !== -1 && rtid.object !== null;
    },
    IsRTIDExtension: function (rtid) {
        return RtIdUtils._IsRTIDEqualToControl(rtid, RtIdUtils.GetExtensionRtId());
    },
    IsRTIDTestingTool: function (rtid) {
        return RtIdUtils._IsRTIDEqualToControl(rtid, RtIdUtils.GetTestingToolRtId());
    },
    IsRTIDDaemon: function (rtid) {
        return RtIdUtils._IsRTIDEqualToControl(rtid, RtIdUtils.GetDaemonRtId());
    },
    _IsRTIDEqualToControl: function (rtid, controlRtId) {
         return rtid.browser === controlRtId.browser &&
            rtid.page === controlRtId.page &&
            rtid.frame === controlRtId.frame &&
            !rtid.object;
    },

    IsRTIDEqual: function (rtid1, rtid2) {
        if (!this.IsRuntimeId(rtid1) || !this.IsRuntimeId(rtid2))
            return false;

        if (rtid1.browser !== rtid2.browser)
            return false;

        if (rtid1.page !== rtid2.page)
            return false;

        if (rtid1.frame !== rtid2.frame)
            return false;

        if ((!this.IsRTIDAO(rtid1) && this.IsRTIDAO(rtid2)) ||
            (this.IsRTIDAO(rtid1) && !this.IsRTIDAO(rtid2)))
            return false;

        if (rtid1.object === rtid2.object)
            return true;

        if (rtid1.object.entry !== rtid2.object.entry)
            return false;

        if (rtid1.object.frameCockie !== rtid2.object.frameCockie)
            return false;

        return true;
    },

    GetExtensionRtId: function () {
        return { browser: -2, page: -2, frame: -2, object: null };
    },

    GetTestingToolRtId: function () {
        return { browser: -5, page: -5, frame: -5, object: null };
    },

    GetDaemonRtId: function () {
        return { browser: -7, page: -7, frame: -7, object: null };
    },
    GetAgentRtid: function () {
        return { browser: -1, page: -1, frame: -1, object: null };
    },
    GetBrowserRtid: function (rtid) {
        var clonedRtid = Util.deepObjectClone(rtid);
        if (this.IsRuntimeId(clonedRtid)) {
            clonedRtid.page = -1;
            clonedRtid.frame = -1;
            clonedRtid.object = null;
        }
        return clonedRtid;
    }
};

//Firefox and chrome support only 3 values for ready state
//complete - once it has loaded.
//loading - once it is finished parsing but still loading sub-resources
//interactive - Returns "loading" while the Document is loading
//see: http://www.whatwg.org/specs/web-apps/current-work/multipage/dom.html#current-document-readiness
var ReadyState2Status = {
    unintialized: 0,
    complete: 4,
    loading: 1,
    interactive: 4    // Since REG_VAL_SYNC_ON_INTERACTIVE is mostly not set we return complete.
};


////////////////////////


function MultipleResponses(responsesToWaitFor) {
    this._logger = new LoggerUtil("Common.MultipleResponses");
    this._logger.trace("Common.MultipleResponses");

    if (responsesToWaitFor < 1) {
        this._logger.warn("MultipleResponses: received invalid numOfResponses=" + responsesToWaitFor);
        return;
    }

    this._numOfResponses = responsesToWaitFor;
}

MultipleResponses.prototype = {
    _logger: null,
    _numOfResponses: -1,

    callback: function (func/* arguments number here may vary - last argument is a callback*/) {
        var self = this; // Faster than bind
        return (function () {
            --self._numOfResponses;
            self._logger.trace("callback called - waiting for ", self._numOfResponses);
            var done = self._numOfResponses === 0;
            switch (arguments.length) {
                case 0: return func.call(self, done);
                case 1: return func.call(self, done, arguments[0]);
                default:
                    var args = [done].concat(Util.makeArray(arguments));
                    return func.apply(self, args);
            }
        });
    }
};

////////////////////////
var AttrPartialValueUtil = {
    IsPartialValue: function (val) {
        return val && val.type === 'partial';
    },

    WrapValue: function (attrName, val, attachedData) {
        return { type: "partial", attr: attrName, value: val, data: attachedData };
    },

    GetValue: function (wrappedValue, logger) {
        logger = logger || LoggerUtilSettings.getEmptyLogger();

        Util.assert(AttrPartialValueUtil.IsPartialValue(wrappedValue), "AttrPartialValueUtil.GetValue: Received an object which is not a wrapped Partial value", logger);

        return wrappedValue.value;
    },

    GetAttachedData: function (wrappedValue, logger) {
        logger = logger || LoggerUtilSettings.getEmptyLogger();

        Util.assert(AttrPartialValueUtil.IsPartialValue(wrappedValue), "AttrPartialValueUtil.GetValue: Received an object which is not a wrapped Partial value", logger);

        return wrappedValue.data;
    }
};

var StatusUtil = {
    OK: "OK",
    OBJECT_NOT_FOUND: "ObjectNotFound",
    OBJECT_NOT_UNIQUE: "ObjectNotUnique",
    METHOD_NOT_IMPL: "MethodNotImpl",

    /**
    * isUnexpected() functions returns a boolean indicating whether or not the status is an unexpected failure status.
    *               If the status is one of the known UFT statuses, or an empty status (undefined, null...) false is returned.
    *               Otherwise true is returned.
    * @param {*} status - the status of a message
    * @returns {boolean} true if the status indicates an unexpected failure status
    */
    isUnexpected: function (status) {
        if (!status)
            return false;

        switch (status) {
            case StatusUtil.OK:
            case StatusUtil.OBJECT_NOT_FOUND:
            case StatusUtil.OBJECT_NOT_UNIQUE:
            case StatusUtil.METHOD_NOT_IMPL:
                return false;
        }

        return true;
    }
};

var ControlLearnType = {
    "Yes": 0,
    "No": 1,
    "IfChildren": 2
};

var ChildrenLearnType = {
    "Yes": 0,
    "No": 1,
    "LetMeSupply": 2
};

if (typeof exports !== "undefined") {
    // Ensure RtIdUtils is exported if exports exist. This is necessary for RtIdUtils to be available
    // in Firefox add-on.
    exports.Util = Util;
}
