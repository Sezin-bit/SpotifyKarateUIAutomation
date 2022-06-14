function JavaFXComChannelStrategy() {
}

JavaFXComChannelStrategy.prototype = {

    _createInnerChannel: function () {
        return new JavaFXComChannel();
    }

};

