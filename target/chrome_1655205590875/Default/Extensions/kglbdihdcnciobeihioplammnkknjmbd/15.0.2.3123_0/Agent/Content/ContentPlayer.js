function ContentPlayer() {
    //this._logger = new LoggerUtil("ContentPlayer");
    //this._logger.info("content.player was created");
}

ContentPlayer.prototype = {
    _logger: null,
    init: function () {},

    onMessage: function (msg, sender, resultCallback) {
        //this._logger.info("onMessage: Received message: \n", msg);
        var targetObj = PlayerUtil.getTargetTestObject(msg["testObject"]);
        if(PlayerTestObjectUtil.isPage(targetObj)){
            //this._logger.info("onMessage: Target object is Page");
            content.frame.onMessageForPlayer(msg, resultCallback);
            return;
        }
        var desc = PlayerTestObjectUtil.getDescriptionProperties(targetObj);
        //this._logger.info("onMessage: Got description properties: ", desc);
        //TODO: handle no AO created or the numbers of aos greater than 1
        var aos = content.frame.GetAOByDescription(desc, null);
        //this._logger.info("onMessage: Got AOs: ", aos);
        if (aos.length <= 0) {
            PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.OBJECT_NOT_FOUND);
            resultCallback(msg);
            return;
        }
        
        if(aos.length >= 1 && !Util.isNullOrUndefined(msg.vri)){
            this._filterAOsByVRI(aos, msg.vri, function (filtedAOs) {
                if (filtedAOs.length == 1) {
                    var targetAO = filtedAOs[0];
                    targetAO.invokeAction(msg, resultCallback);
                } else if (filtedAOs.length <= 0) {
                    PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.OBJECT_NOT_FOUND);
                    resultCallback(msg);
                } else {
                    // TODO: Support ordinal identifier
                    PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.OBJECT_NOT_UNIQUE);
                    resultCallback(msg);
                }
            }.bind(this));
            return;
        }

        if (aos.length > 1) {
            // TODO: Support ordinal identifier
            PlayerStateHandler.setErrorCode(msg, PLAYER_STATE_TYPES.OBJECT_NOT_UNIQUE);
            resultCallback(msg);
            return;
        }
        var targetAO = aos[0];
        targetAO.invokeAction(msg, resultCallback);
    },

    _filterAOsByVRI: function (candidateAOs, vri, callback) {
        // example:
        // "vri": [{ 
        //      "relations": [{"relation": "above","inline": true},{"relation": "left", "inline": false}], 
        //      "rect":{"abs_x":0, "abs_y":0, "width": 10, "height": 10}
        // }]
        // relation type: left | right | above | below | contains | closest-x | closest-y | closest
        this._addAOPosition(candidateAOs, 0, function () {
            vri.forEach(function (vri) {
                candidateAOs = this._filterVRIRelation(candidateAOs, vri);
            }, this);
            callback(candidateAOs);
        }.bind(this));
    },

    _addAOPosition: function (candidateAOs, index, callback) {
        if (index >= candidateAOs.length)
            callback();
        else {
            var ao = candidateAOs[index];
            var positionQueryMsg = new Msg("QUERY_ATTR", ao.getID(), {
                abs_x: null,
                abs_y: null,
                height: null,
                width: null
            });
            ao.QUERY_ATTR(positionQueryMsg, function (positionResponseMsg) {
                ao.position = positionResponseMsg._data;
                this._addAOPosition(candidateAOs, index + 1, callback);
            }.bind(this));
        }
    },

    _filterVRIRelation: function (candidateAOs, vriRelation) {
        var ro = vriRelation.rect;
        var relations = vriRelation.relations;
        for (var i = 0; i < relations.length; i++) {
            if (relations[i].relation === "closest-x" ||
                relations[i].relation === "closest-y" ||
                relations[i].relation === "closest") {
                candidateAOs = this._findClosestAO(candidateAOs, ro, relations[i].relation);
            } else {
                for (var j = 0; j < candidateAOs.length; j++) {
                    var co = candidateAOs[j].position;
                    if (Util.isNullOrUndefined(co))
                        continue;
                    if (!this._matchVRIRelation(co, ro, relations[i].relation, relations[i].inline)) {
                        candidateAOs.splice(j, 1);
                        j--;
                    }
                }
            }
        }
        return candidateAOs;
    },

    _findClosestAO: function (candidateAOs, ro, relation) {
        var min_dist = undefined;
        var matchedAOs = [];
        // referenced object rect
        ro.left = ro.abs_x;
        ro.right = ro.abs_x + ro.width;
        ro.top = ro.abs_y;
        ro.bottom = ro.abs_y + ro.height;
        for (var i = 0; i < candidateAOs.length; i++) {
            // candidate object rect
            co = candidateAOs[i].position;
            if (Util.isNullOrUndefined(co))
                continue;
            co.left = co.abs_x;
            co.right = co.abs_x + co.width;
            co.top = co.abs_y;
            co.bottom = co.abs_y + co.height;
            switch (relation) {
                case "closest-x":
                    var ro_x = ro.left + ro.width / 2;
                    var co_x = ro_x < co.left ? co.left : (ro_x > co.right ? co.right : ro_x);
                    var dist = Math.abs(ro_x - co_x);
                    break;
                case "closest-y":
                    var ro_y = ro.top + ro.height / 2;
                    var co_y = ro_y < co.top ? co.top : (ro_y > co.bottom ? co.bottom : ro_y);
                    var dist = Math.abs(ro_y - co_y);
                    break;
                case "closest":
                    var ro_x = ro.left + ro.width / 2;
                    var co_x = ro_x < co.left ? co.left : (ro_x > co.right ? co.right : ro_x);
                    var dist_x = Math.abs(ro_x - co_x);
                    var ro_y = ro.top + ro.height / 2;
                    var co_y = ro_y < co.top ? co.top : (ro_y > co.bottom ? co.bottom : ro_y);
                    var dist_y = Math.abs(ro_y - co_y);
                    var dist = dist_x * dist_x + dist_y * dist_y;
                    break;
                default:
                    continue;
            }
            if (Util.isNullOrUndefined(min_dist) || min_dist > dist) {
                min_dist = dist;
                matchedAOs = [candidateAOs[i]];
            } else if (min_dist === dist)
                matchedAOs.push(candidateAOs[i]);
        }
        return matchedAOs;
    },

    // check if the candiate object match the referenced object relation (left|right|above|below|contains)
    _matchVRIRelation: function (co, ro, relation, inline) {
        // referenced object rect
        ro.left = ro.abs_x;
        ro.right = ro.abs_x + ro.width;
        ro.top = ro.abs_y;
        ro.bottom = ro.abs_y + ro.height;
        // candidate object rect
        co.left = co.abs_x;
        co.right = co.abs_x + co.width;
        co.top = co.abs_y;
        co.bottom = co.abs_y + co.height;

        switch (relation) {
            case "left":
                if (inline == true)
                    return ro.left < co.left &&
                        ro.right < co.right &&
                        ro.bottom >= co.top &&
                        ro.top <= co.bottom;
                return ro.left < co.left && ro.right < co.right;
            case "right":
                if (inline == true)
                    return ro.left > co.left &&
                        ro.right > co.right &&
                        // vertical projection intersection condition
                        ro.bottom >= co.top &&
                        ro.top <= co.bottom;
                return ro.left > co.left && ro.right > co.right;
            case "above":
                if (inline == true)
                    return ro.top < co.top &&
                        ro.bottom < co.bottom &&
                        // horizontal projection intersection condition
                        ro.right >= co.left &&
                        ro.left <= co.right;
                return ro.top < co.top && ro.bottom < co.bottom;
            case "below":
                if (inline == true)
                    return ro.top > co.top &&
                        ro.bottom > co.bottom &&
                        // horizontal projection intersection condition
                        ro.right >= co.left &&
                        ro.left <= co.right;
                return ro.top > co.top && ro.bottom > co.bottom;
            case "contains":
                return ro.left <= co.left &&
                    ro.right >= co.right &&
                    ro.top <= co.top &&
                    ro.bottom >= co.bottom;
            default:
                return false;
        }
    }
};
