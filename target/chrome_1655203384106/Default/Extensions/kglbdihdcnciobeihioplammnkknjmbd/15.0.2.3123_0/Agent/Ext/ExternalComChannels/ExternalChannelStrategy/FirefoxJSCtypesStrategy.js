function FirefoxJSCtypesStrategy() {
}

FirefoxJSCtypesStrategy.prototype = {
    
     _createInnerChannel: function(){
          return new FirefoxJSCtypesComChannel();  
    }
};

