function MobileCenterComChannelStrategy() {
}

MobileCenterComChannelStrategy.prototype = {

    _createInnerChannel: function () {
        return new MobileCenterComChannel();
    }
};

