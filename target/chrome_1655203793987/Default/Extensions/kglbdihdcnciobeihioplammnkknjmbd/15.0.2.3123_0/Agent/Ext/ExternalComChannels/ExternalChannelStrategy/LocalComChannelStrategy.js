function LocalComChannelStrategy() {
}

LocalComChannelStrategy.prototype = {
    
    _createInnerChannel: function(){
      return new WebSocketComChannel();  
    },

    _sendRegistrationMessage: function () {
        this._logger.trace("LocalComChannelStrategy._sendRegistrationMessage: sending Registration Message");
        var msg = this._prepareRequest({}, InnerChannelMsgType.VOIDREQUEST);
        this._prepareLocalAgentRegistionMessage(msg);
        this._innerChannel.sendMessage(msg);
    },


    _prepareLocalAgentRegistionMessage: function (channelMessage) {
        channelMessage.handlerType = "OutputChannel";
        channelMessage.data.format = "OutputChannelRegistrationFormat";
        channelMessage.data.version = 1;
        channelMessage.data.agentType = "HelloIeHowAreYou";
        channelMessage.data.registrationFlag = true;
    }

};
