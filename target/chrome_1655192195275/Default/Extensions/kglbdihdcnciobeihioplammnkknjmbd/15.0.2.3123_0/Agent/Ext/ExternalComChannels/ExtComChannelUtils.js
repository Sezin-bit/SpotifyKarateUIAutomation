var ExtChannelEvent = {
    MESSAGE : "message",
    RESPONSE : "response",
    CONNECTED : "connected",
    DISCONNECTED : "disconnected"
};

var InnerChannelStatus = {
    CLOSED: "closed",
    CONNECTING: "connecting",
    OPEN: "open",
};

// Defines the events used by external com channel and its inner channel.
var InnerChannelEvent = {
    MESSAGE : "message",
    RESPONSE : "response",
    OPEN: "open",
    CLOSE: "close",
    ERROR: "error"
};

var ExtComChannelUtil = {
    getHandlerForMessage: function (msg) {
        switch (msg._msgType) {
            case "EVENT_INSPECT_ELEMENT":
            case "EVENT_INSPECT_CANCEL":
                return "AutInspection";
            case "EVENT_RECORD":
                return "Record";
            case "WEBEXT_REPORT_LINE":
                return "Replay";
            default:
                return "Query";
        }
    }
};