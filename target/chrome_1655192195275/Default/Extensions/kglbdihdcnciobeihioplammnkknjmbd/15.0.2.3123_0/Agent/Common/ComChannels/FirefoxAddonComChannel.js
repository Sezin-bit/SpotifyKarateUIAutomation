if (typeof require === "function") {
    var self = require("sdk/self");
    var FFLoggerUtil = require("./FFLoggerUtil");
    var FirefoxTabs = require("./FirefoxTabs").FirefoxTabs;
}

function FirefoxAddonComChannel() {
    this._logger = new LoggerUtil("ComChannels.FirefoxComChannel.addon");
    this.id = 1;

    this._asyncHelper = new AsyncCommunicationHelper({
        timeout: 15*1000
    }),
    this._asyncHelper.addListener("MessageTimedOut", this);
}

Util.inherit(FirefoxAddonComChannel, FirefoxComChannelBase, {

    _knownWorkerChannelsWithTabID: {},

    _connectionReceivedIds: {},

    _nextContentContextId: 0,

    init: function () {
        this._logger.trace("FirefoxAddonComChannel init called");
        if (!this._innerChannel)
            this._createInnerChannel();
    },

    _createInnerChannel: function () {
        // TODO@EASTON:TODO:: MOVE THE FILES LIST TO A DEDICATED FILE.
        this._logger.trace("_createInnerChannel called");

        try {
            this._innerChannel = require("sdk/page-mod").PageMod({
                include: ["*", "file://*", "about:*", "javascript:*"],
                contentScriptFile: [
                    self.data.url("./ThirdParty/log4javascript_uncompressed.js"),
                    self.data.url("./Common/LoggerUtil.js"),
                    self.data.url("./Common/SpecialObject.js"),
                    self.data.url("./Common/common.js"),
                    self.data.url("./Common/DescriptionUtil.js"),
                    self.data.url("./Common/AsyncCommunicationHelper.js"),
                    self.data.url("./Common/EventDispatcher.js"),
                    self.data.url("./Common/ComChannels/FirefoxContentComChannel.js"),
					self.data.url("./Content/ShadowDomUtil.js"),
                    self.data.url("./Content/ContentUtils.js"),
                    self.data.url("./Content/GestureDetector.js"),
                    self.data.url("./Content/SimulateGesture.js"),
                    self.data.url("./Content/Recorder.js"),
                    self.data.url("./Content/FrameCommunicationChannel.js"),
                    self.data.url("./Content/BrowserInterfaces/FirefoxContentServices.js"),
                    self.data.url("./Content/ContentDispatcher.js"),
                    self.data.url("./Content/DotObj.js"),
                    self.data.url("./Content/DomRequestSubscriber.js"),
                    self.data.url("./Content/BrowserContentHelper.js"),
                    self.data.url("./Content/ElementInspector.js"),
                    self.data.url("./Content/FrameInHTMLContext.js"),
                    self.data.url("./Content/Frame.js"),
                    self.data.url("./Content/KitsManager.js"),
                    self.data.url("./Content/AO.js"),
                    self.data.url("./Content/Behaviors/AreaBehavior.js"),
                    self.data.url("./Content/Behaviors/AudioBehavior.js"),
                    self.data.url("./Content/Behaviors/ButtonBehavior.js"),
                    self.data.url("./Content/Behaviors/CheckBoxBehavior.js"),
                    self.data.url("./Content/Behaviors/CommonBehavior.js"),
                    self.data.url("./Content/Behaviors/ContentEditableBehavior.js"),
                    self.data.url("./Content/Behaviors/EditBehavior.js"),
                    self.data.url("./Content/Behaviors/FileInputBehavior.js"),
                    self.data.url("./Content/Behaviors/FormBehavior.js"),
                    self.data.url("./Content/Behaviors/ImageBehavior.js"),
                    self.data.url("./Content/Behaviors/ImageLinkBehavior.js"),
                    self.data.url("./Content/Behaviors/LinkBehavior.js"),
                    self.data.url("./Content/Behaviors/ListBehavior.js"),
                    self.data.url("./Content/Behaviors/MediaBaseBehavior.js"),
                    self.data.url("./Content/Behaviors/NumberBehavior.js"),
                    self.data.url("./Content/Behaviors/PluginBehavior.js"),
                    self.data.url("./Content/Behaviors/RadioGroupBehavior.js"),
                    self.data.url("./Content/Behaviors/RangeBaseBehavior.js"),
                    self.data.url("./Content/Behaviors/RangeBehavior.js"),
                    self.data.url("./Content/Behaviors/TableBehavior.js"),
                    self.data.url("./Content/Behaviors/VideoBehavior.js"),
                    self.data.url("./Content/Behaviors/TabBehavior.js"),
                    self.data.url("./Content/Behaviors/TreeBehavior.js"),
                    self.data.url("./Content/Behaviors/VirtualTextBehavior.js"),
                    self.data.url("./Content/WebKit.js"),
                    self.data.url("./Content/Kits/KitUtil.js"),
                    self.data.url("./Content/Kits/RoleWebKit.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebMenu.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebButton.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebCheckbox.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebRadioGroup.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebList.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebTab.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebLink.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebTree.js"),
                    self.data.url("./Content/Kits/Roles/RoleWebTable.js"),
                    self.data.url("./Content/Kits/jQmKit.js"),
                    self.data.url("./Content/Kits/SenchaKit.js"),
                    self.data.url("./Content/Kits/BootstrapKit.js"),
                    self.data.url("./Content/inject.js"),
                    self.data.url("./Content/AutoXPath.js"),
                    self.data.url("./Content/auto_css.js"),
                    self.data.url("./Content/WebExtKit.js"),
                    self.data.url("./Content/Extensibility/ToolkitManager.js"),
                    self.data.url("./Content/Extensibility/Toolkit.js"),
                    self.data.url("./Content/Extensibility/Control.js"),
                    self.data.url("./Content/Extensibility/Condition.js"),
                    self.data.url("./Content/Extensibility/WebExtAO.js"),
                    self.data.url("./Content/Extensibility/SectionHandler.js"),
                    self.data.url("./Content/Extensibility/QTPUtil.js"),
                    self.data.url("./Content/Extensibility/PageProxy.js"),
                    self.data.url("./Content/contentLoader.js")
                ],
                attachTo: ["existing", "top", "frame"],
                contentScriptWhen: "start",
                onAttach: function(workerChannel) {
                    this._logger.debug("onAttach - Attach to tab:", workerChannel.tab.id, " url:", workerChannel.tab.url);
                    workerChannel.port.on("connect", this._onConnect.bind(this, workerChannel));
                    workerChannel.port.on("disconnect", this._onDisconnect.bind(this, workerChannel));
                    workerChannel.port.on("message", this._onMessageFromContent.bind(this, workerChannel));
                    workerChannel.on("detach", this._onDetach.bind(this, workerChannel));
                }.bind(this)
            });
        } catch(e) {
            this._logger.error("_createInnerChannel, error: " + e);
        }
    },
    _onConnect: function (workerChannel, msg) {
        this._logger.trace("_onConnect: called with request:", msg);

        var returnMsg = { targetId: msg.sourceId, sourceId: this.id };

        if (this._connectionReceivedIds[msg.sourceId]) {
            this._logger.debug("_onConnect: called for tab that already connected. sourceId:", msg.sourceId, " allocated Id:", this._connectionReceivedIds[msg.sourceId]);
            returnMsg.allocatedId = this._connectionReceivedIds[msg.sourceId];
        }
        else if (msg.sourceId >= 1) {
            this._logger.debug("_onConnect: called with non random source Id using it. sourceId:",  msg.sourceId);
            returnMsg.allocatedId = msg.sourceId;
        }
        else {
            this._logger.debug("_onConnect: called for unknown channel registering it. sourceId:", msg.sourceId, " tab:", workerChannel.tab);
            var allocatedContextId = this._registerWorkerChannel(workerChannel, msg.sourceId);
            returnMsg.allocatedId = allocatedContextId;
            this._logger.debug("_onConnect: registered channel notifing others. sourceId:",  msg.sourceId, " commId:", allocatedContextId);
            this._processMessageLocally("clientConnected", this._getUFTClientObj(workerChannel), workerChannel);
        }
        this._sendMessageToContent("connectResponse", returnMsg, returnMsg.allocatedId);
    },
    _onDisconnect: function (workerChannel, msg) {
        this._logger.trace("_onDisconnect: Received Disconnection From: ", msg);
        var clientId = msg.sourceId;
        if (clientId < 1) {
            // If frame sent a disconnection before it finished registration, it will send the temp id as the source id (reproduced in Gmail.com of August, 2013)
            // In this case we'll do the mapping manually
            this._logger.info("_onDisconnect: Received a disconnection request from a Frame that didn't initialize yet: ", clientId, " - overriding the id with: ", this._connectionReceivedIds[clientId]);
            clientId = this._connectionReceivedIds[clientId];
        }
        if (clientId < 1) {
            this._logger.error("_onDisconnect: get wrong clientId from the channel");
            return;
        }
        if (workerChannel.uftComID !== clientId) {
            this._logger.error("_onDisconnect: the clientId is not matched with the registerId in worker");
            return;
        }
        this._processMessageLocally("clientDisconnected", this._getUFTClientObj(workerChannel), workerChannel);
        this._asyncHelper.onDestinationHasDisconnected(clientId);
        this._unregisterWorkerChannel(workerChannel);
    },
    _onDetach: function (workerChannel) {
        if (!Util.isNullOrUndefined(workerChannel.uftComID)) {
            this._logger.trace("_onDetach: workerChannel.id=", workerChannel.uftComID, " detached");
        }
        else {
            this._logger.error("_onDetach: unknown channel detached");
            return;
        }
        var clientId = workerChannel.uftComID;
        if (!clientId)
            return;

        this._processMessageLocally("clientDisconnected", this._getUFTClientObj(workerChannel), workerChannel);
        this._asyncHelper.onDestinationHasDisconnected(clientId);
        this._unregisterWorkerChannel(workerChannel);
    },

    _onMessageFromContent: function (workerChannel, msg) {
        this._logger.trace("_OnMessageFromContent msg=", msg);

        switch (msg.type) {
            case "request":
            case "event":
                var targetDestination = msg.targetId || msg.data._to;
                if (!this._isToContentChannel(targetDestination, workerChannel)) {
                    this._processMessageLocally("message", msg, workerChannel);
                } else {
                    this._sendMessageToContent("message", msg, msg.targetId);
                }
                break;
            case "response":
                this._processMessageLocally("message", msg, workerChannel);
                break;
        }
    },

    _isToContentChannel: function (target, workerChannel) {
        return target.frame === workerChannel.uftComID;
    },

    _getNativeTabIdFromWorkerChannel: function (workerChannel) {
        if (workerChannel.tab) {
            this._logger.debug("_getNativeTabIdFromWorkerChannel:returning tab.id");
            return workerChannel.tab.id;
        } else {
            this._logger.debug("_getNativeTabIdFromWorkerChannel:No tab on worker channel using comId:", workerChannel.uftComID);
            return this._knownWorkerChannelsWithTabID[workerChannel.uftComID].tabIdStr;
        }
    },

    _getUFTClientObj: function (workerChannel) {
        var client = null;
        if (Util.isNullOrUndefined(workerChannel.uftComID)) {
            this._logger.error("_getUFTClientObj:this client is not registered");
            return client;
        }
        var nativeTabId = this._getNativeTabIdFromWorkerChannel(workerChannel);
        var tabId = FirefoxTabs.getUniqueIdbyTabNativeId(nativeTabId);
        if (tabId === -1) {
            this._logger.error("_getUFTClientObj cannot find the unique tab id. workerChannle.tab.id=", nativeTabId);
        }
        else {
            var windowId = parseInt(nativeTabId.split("-")[1], 10);
            client = { tabID: tabId, windowId: windowId, id: workerChannel.uftComID };
        }
        return client;
    },
    _processMessageLocally: function (type, message, workerChannel) {
        if (!message.target)
            message.target = this._getUFTClientObj(workerChannel);
        if (!message.target) {
            this._logger.error("_processMessageLocally doesn't find the message.target");
            return;
        }

        switch (type) {
            case "message":
                this.onMessage(message);
                break;
            case "clientConnected":
                this._onclientConnected(message);
                break;
            case "clientDisconnected":
                this._onclientDisconnected(message);
                break;
            default:
                this._logger.error("_processMessageLocally doesn't find the message type.");
                break;
        }
    },
    _sendMessageToContent: function (type, message, clientId) {
        this._logger.trace("sendMessageToContent type=", type, "; message", message);
        var workerChannelTabIDObj = this._knownWorkerChannelsWithTabID[clientId];
        if (workerChannelTabIDObj && workerChannelTabIDObj.channel) {
            var workerChannel = workerChannelTabIDObj.channel;

            if (!message.target) {
                message.target = this._getUFTClientObj(workerChannel);
            }
            if (message.target)
                workerChannel.port.emit(type, message);
            else {
                this._logger.warn("sendMessageToContent: no message target!!!!");
            }
        }
        else {
            this._logger.error("_sendMessageToContent: no such clientId. clientId=", clientId, " message= ", message);
        }
    },
    _registerWorkerChannel: function (workerChannel, sourceId) {
        FirefoxTabs.addNativeTab(workerChannel.tab);
        var allocatedContextId = ++this._nextContentContextId;
        workerChannel.uftComID = allocatedContextId;
        var tabId = workerChannel.tab.id;
        this._logger.debug("_registerWorkerChannel - registering channel for tab id:", tabId, " sourceId:", sourceId, " commId:", allocatedContextId);
        this._knownWorkerChannelsWithTabID[allocatedContextId] = { "channel": workerChannel, "tabIdStr": tabId };
        this._connectionReceivedIds[sourceId] = allocatedContextId;
        return allocatedContextId;
    },
    _unregisterWorkerChannel: function (workerChannel) {
        var clientId = workerChannel.uftComID;
        if (clientId) {
            delete this._knownWorkerChannelsWithTabID[clientId];
            delete workerChannel.uftComID;
            for (var key in Object.keys(this._connectionReceivedIds)) {
                if (this._connectionReceivedIds[key] === clientId) {
                    delete this._connectionReceivedIds[key];
                }
            }
        }
    },

    _sendMessageImpl: function (msg) {

        switch (msg.type) {
            case "request":
            case "event":
                var targetId = msg.targetId < 0 ? msg.data._to.frame : msg.targetId;
                this._sendMessageToContent("message", msg, targetId);
                break;
            case "response":
                this._sendMessageToContent("message", msg, msg.target.id);
                break;
        }
    },
    _onclientConnected: function (msg) {
        this._logger.trace("_onclientConnected msg=", msg);
        this.dispatchEvent("clientConnected", msg.target, msg);
    },
    _onclientDisconnected: function (msg) {
        this._logger.trace("_onclientDisconnected msg=", msg);
        this.dispatchEvent("clientDisconnected", msg.target, msg);
    }
});