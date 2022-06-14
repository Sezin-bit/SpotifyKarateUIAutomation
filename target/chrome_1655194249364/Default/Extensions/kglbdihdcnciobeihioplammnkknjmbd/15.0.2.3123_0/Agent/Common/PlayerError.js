var PLAYER_STATE_TYPES = {
    "OK": {
        "code": 0,
        "status": "OK",
        "message": "Step passed"
    },
    "OBJECT_NOT_FOUND": {
        "code": 1001,
        "status": "ObjectNotFound",
        "message": "this is a customized error of object not found"
    },
    "OBJECT_NOT_UNIQUE": {
        "code": 1002, 
        "status": "ObjectNotUnique",
        "message": "this is a customized error of object not unique"
    },
    "OBJECT_DISABLED": {
        "code": 1003,
        "status": "ObjectDisabled",
        "message": "this test object is disabled"
    },
    "ITEM_NOT_FOUND": {
        "code": 1004,
        "status": "ItemNotFound",
        "message": "this is a customized error of item not found"
    },
    "ITEM_NOT_UNIQUE": {
        "code": 1005,
        "status": "ItemNotUnique",
        "message": "this is a customized error of item not unique"
    },
    "METHOD_NOT_IMPL": {
        "code": 2001, 
        "status": "MethodNotImpl",
        "message": "this is a customized error of method not implemented"
    },
    "TOUCH_NOT_ENABLED": {
        "code": 2002,
        "status": "NotTouchEnabled",
        "message": "The browser is not touch enabled"
    },
    "INVALID_ARGUMENT": {
        "code": 3001,
        "status": "InvalidArgument",
        "message": "this is a customized error of invalid argument"
    },
    "RETRY": {
        "code": 4001,
        "status": "Retry",
        "message": "this is a customized error of retry"
    },
    "TIMED_OUT": {
        "code": 4002,
        "status": "TimedOut",
        "message": "this is a customized error of timed out"
    }
};

var PlayerStateHandler = {
    setErrorCode: function (response, error_type) {
        if (Util.isNullOrUndefined(response)) {
            return;
        }
        if (Util.isNullOrUndefined(error_type)) {
            return;
        }
        response["status"] = error_type["status"];
        response["error"] = error_type;
    }
};