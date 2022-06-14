function ChromeNativeMessagingStrategy() {
}

ChromeNativeMessagingStrategy.prototype = {
    
     _createInnerChannel: function(){
      return new NativeMessagingComChannel();  
    }
};

