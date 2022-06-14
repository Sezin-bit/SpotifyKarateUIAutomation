/* message send out:
new_websocket_exception
open
error
message
close
send_exception
////////////////////// methods:
connect 
disconnect
send
*/

var pageWorkerContent = {
    _channel: null,
    _logger:null,

    init: function () {
        this._logger = new LoggerUtil("PageWorkerContent");
        self.port.on("connect", function (url) {
            if (this._channel) {
                return;
            }

            try {
                this._channel = new WebSocketComChannel();
                this._channel.connect(url);
            } catch (e) {
                this._channel = null;
                self.port.emit("new_websocket_exception", e.message);
                return;
            }

            this._channel.addListener("open", function (msg) {
                self.port.emit("open", msg);
            });
            this._channel.addListener("close", function (msg) {
                this._channel = null;
                self.port.emit("close", msg);
            }.bind(this));

            this._channel.addListener("message", function (msg) {
                var sendObj = {
                    type: "message",
                    data: msg
                };
                sendObj = JSON.stringify(sendObj);
                self.port.emit("message", sendObj);
            });
            this._channel.addListener("error", function (msg) {
                self.port.emit("error", msg);
            });

        }.bind(this));

        self.port.on("send", function (msg) {
            if (!this._channel) {
                this._logger.error("can't send:" + msg + " because _channel is null!");
                return;
            }
            msg = JSON.parse(msg);
            this._channel.sendMessage(msg);
        }.bind(this));

        self.port.on("disconnect", function () {
            if (this._channel) {
                this._channel.disconnect();
                this._channel = null;
            }
        }.bind(this));
    }
};

LoggerUtilSettings.init();
pageWorkerContent.init();