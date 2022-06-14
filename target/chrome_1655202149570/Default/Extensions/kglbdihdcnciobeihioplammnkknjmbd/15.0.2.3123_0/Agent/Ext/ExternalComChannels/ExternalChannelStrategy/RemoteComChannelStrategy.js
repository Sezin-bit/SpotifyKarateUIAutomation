function RemoteComChannelStrategy() {
}

RemoteComChannelStrategy.prototype = {
    
    _createInnerChannel: function(){
      return new WebSocketComChannel();  
    },
 
    _sendRegistrationMessage: function () {
        var msg = new Msg("REGISTER_AGENT", RtIdUtils.GetDaemonRtId(), {});
        this.sendEvent(msg);
    },
};
