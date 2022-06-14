function FirefoxWebSocketProxyStrategy() {

}

FirefoxWebSocketProxyStrategy.prototype = {

    _createInnerChannel: function () {
        return new FirefoxWebSocketProxyComChannel();
    }
};
