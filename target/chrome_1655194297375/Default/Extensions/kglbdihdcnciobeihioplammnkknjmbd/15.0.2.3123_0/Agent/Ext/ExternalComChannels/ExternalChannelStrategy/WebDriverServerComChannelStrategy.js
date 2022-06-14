function WebDriverServerComChannelStrategy() {
}

WebDriverServerComChannelStrategy.prototype = {

    _createInnerChannel: function () {
        return new WebDriverServerComChannel();
    }

};

