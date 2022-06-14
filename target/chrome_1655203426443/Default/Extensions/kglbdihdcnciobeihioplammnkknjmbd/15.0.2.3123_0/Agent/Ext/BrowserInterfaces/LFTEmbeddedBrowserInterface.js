var webViewId = {
    id: 1000,
    windowId: 1
};

function LFTEmbeddedBrowserAPI() {
    this._logger = new LoggerUtil("BrowserControlAPI");
    this._logger.trace("BrowserControlAPI started.");
    this._clientTabId = webViewId;
}

Util.inherit(LFTEmbeddedBrowserAPI, EmbeddedBrowserAPI, {
    name: "LFTEmbeddedBrowserAPI",
    createExternalComChannel: function () {
        var uftWSChannel = new WebSocketComChannel();
        uftWSChannel.connect = uftWSChannel.connect.bind(uftWSChannel,"ws://127.0.0.1:8822");
        var lftWSChannel = new WebSocketComChannel();
        lftWSChannel.connect = lftWSChannel.connect.bind(lftWSChannel,"ws://127.0.0.1:8824");
        return new ExternalComChannel({
            _createInnerChannel: function(){
                return new GroupedComChannel(lftWSChannel, uftWSChannel);
            }
        });
    }
});