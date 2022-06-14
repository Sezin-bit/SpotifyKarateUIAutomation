var PlayerMethodFormat = {
    "Common": {
        "Exist" : [{
            "name": "timeout",
            "default": 0
        }],
        "GetROProperties":[
            {
                "name": "properties",
                "default": []
            }
        ],
        "GetAllROProperties":[
            {
                "name": "properties",
                "default": []
            }
        ],
        "GetROProperty":[
            {
                "name": "property",
                "default": ""
            }
        ],
        "CaptureBitmap":[
            {
                "name": "fullFileName",
                "default": ""
            },
            {
                "name": "overrideExisting",
                "default": false
            },
            {
                "name": "sendToReport",
                "default": false
            }
        ],
	"Click": [
            {
                "name": "x",
                "default": -9999
            },
            {
                "name": "y",
                "default": -9999
            },
            {
                "name": "button",
                "default": "micLeftBtn"
            }
        ],
        "MiddleClick": [
            {
                "name": "x",
                "default": -9999
            },
            {
                "name": "y",
                "default": -9999
            }
        ],
        "RightClick": [
            {
                "name": "x",
                "default": -9999
            },
            {
                "name": "y",
                "default": -9999
            }
        ],
        "DoubleClick": [
            {
                "name": "interval",
                "default": 200  // ms
            },
            {
                "name": "x",
                "default": -9999
            },
            {
                "name": "y",
                "default": -9999
            }
        ],
        "FireEvent": [
            {
                "name": "EventName",
                "default": "onclick"
            },
            {
                "name": "x",
                "default": -9999
            },
            {
                "name": "y",
                "default": -9999
            },
            {
                "name": "button",
                "default": "micLeftBtn"
            }
        ],
        "LongPress": [
            {
                "name": "duration",
                "default": 1
            },
            {
                "name": "x",
                "default": -9999
            },
            {
                "name": "y",
                "default": -9999
            }

        ],
        "HoverTap": [
            {
                "name": "x",
                "default": -9999
            },
            {
                "name": "y",
                "default": -9999
            }
        ],
        "Pan": [
            {
                "name": "deltaX",
                "default": 0
            },
            {
                "name": "deltaY",
                "default": 0
            },
            {
                "name": "duration",
                "default": 500 //ms
            },
            {
                "name": "startX",
                "default": -9999
            },
            {
                "name": "startY",
                "default": -9999
            }
        ],
        "Swipe": [
            {
                "name": "direction",
                "default": "moveDown"
            },
            {
                "name": "distance",
                "default": 200
            },
            {
                "name":"duration",
                "default": 250 //ms
            },
            {
                "name": "startX",
                "default": -9999
            },
            {
                "name": "startY",
                "default": -9999
            }
        ],
        "Pinch": [
            {
                "name": "scale",
                "default": 0.0
            },
            {
                "name": "duration",
                "default": 1
            },
            {
                "name": "x",
                "default":-9999
            },
            {
                "name": "y",
                "default": -9999
            }
        ],
        "Submit":[]
	
    },
    "WebEdit": {
        "Set" : [
            {
                "name": "value",
                "default": ""
            },
            {
                "name": "performCommit",
                "default": true 
            }
        ],
        "SetSecure": [
            {
                "name": "encryptedText",
                "default": ""
            }
        ]
    },
    "WebCheckBox": {
        "Set": [
            {
                "name": "value",
                "default": "ON"
            }
        ]
    },
    "Page": {
        "RunScript": [
            {
                "name": "script",
                "default":""
            }
        ],
        "RunScriptFromFile": [
            {
                "name": "script",
                "default":""
            }
        ],
        "GetROProperties":[
            {
                "name": "properties",
                "default": []
            }
        ],
        "GetAllROProperties":[
            {
                "name": "properties",
                "default": []
            }
        ],
        "GetROProperty":[
            {
                "name": "property",
                "default": ""
            }
        ]
    },
    "WebList": {
        "Select": [
            { "name": "value", "default": "" }
        ],
        "Deselect": [
            { "name": "value", "default": "" }
        ],
        "ExtendSelect": [
            { "name": "value", "default": "" }
        ],
        "GetItem": [
            { "name": "index", "default": 1 }
        ],
        "MakeItemVisible": [
            { "name": "value", "default": "" },
            { "name": "xpath", "default": "" },
            { "name": "timeout", "default": 20 }
        ]
    },
    "WebRadioGroup": {
        "Select": [
            {
                "name": "value",
                "default": "#0"
            }
        ]
    }
};

var PlayerMethodAdaptorUtil = {
    buildArgsArray: function(actionField, elemDef){
        if (Util.isNullOrUndefined(elemDef)) {
            return null;        
        }
        var method = actionField["method"];
        var argsArray = null;
        if(Util.isNullOrUndefined(actionField["unnamedArguments"])) {
            argsArray = [];
        } else {
            argsArray = Util.deepObjectClone(actionField["unnamedArguments"]);
        }
        var argsObj = elemDef[method];
        var length = argsArray.length;
        if(argsArray.length === argsObj.length) {
            return argsArray;
        }
        var namedArgs = actionField["namedArguments"]
        if(Util.isNullOrUndefined(namedArgs)) {
            namedArgs= {}
        }
        for (var len = argsArray.length; len < argsObj.length; len++) {
            var parameterName = argsObj[len]["name"];
            if(Util.isUndefined(namedArgs[parameterName])) {
                argsArray.push(argsObj[len]["default"])
            } else {
                argsArray.push(namedArgs[parameterName])
            }
        }
        return argsArray;
    },

    generateArgsArray: function(actionField, elemType) {
        var elemDefine = PlayerMethodFormat[elemType];
        if(Util.isNullOrUndefined(elemDefine)) {
            return null;
        }
        return this.buildArgsArray(actionField, elemDefine);
    }
}

