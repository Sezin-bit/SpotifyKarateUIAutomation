ChromeAPI.prototype.createExternalComChannel = function () {
    return new ExternalComChannel(RemoteComChannelStrategy.prototype);
};