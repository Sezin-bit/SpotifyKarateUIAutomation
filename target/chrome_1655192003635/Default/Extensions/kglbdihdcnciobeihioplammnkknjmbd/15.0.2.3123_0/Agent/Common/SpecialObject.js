var SpecialObject = {
    _create: function (type, params) {
        var ret = {
            specialObj: true,
            type: type
        };

        if (params)
            Util.extend(ret, params);

        return ret;
    },

    CreateDescription: function (description) {
        return this._create('recorded_description', { description: description });
    },

    CreatePropertyBag: function (properties) {
        return this._create('property_bag', { properties: properties });
    },

    CreateDotObj: function (id) {
        return this._create('object', { id: id });
    },

    CreateElementRequest: function (uid, asyncId) {
        return this._create('DotObjMarkerElementRequest', { objUID: uid, dotUtilObjAsyncID: asyncId });
    },

    CreateDocumentRequest: function (asyncId) {
        return this._create('DotObjMarkerDocumentRequest', { dotUtilObjAsyncID: asyncId });
    },

    CreateReferenceRequest: function (ref) {
        return this._create('DotObjMarkerReferenceRequest', { objRef: ref });
    },

    CreateDotObjInHTML: function (cookie, asyncId) {
        return this._create('DotObjInHTML', { cookie: cookie, dotUtilObjAsyncID: asyncId });
    },

    CreateMMFile: function (html) {
        return this._create('writeMMFile', { html: html });
    },

    CreateFrameSource: function (path, source) {
        return this._create('saveFrameSource', { fullPath: path, frameSource: source });
    },

    CreateTime: function (time) {
        return this._create('UTCTime', {
            year: time.getUTCFullYear(),
            month: time.getUTCMonth() + 1,
            day: time.getUTCDate(),
            hour: time.getUTCHours(),
            minute: time.getUTCMinutes(),
            second: time.getUTCSeconds(),
            milliseconds: time.getUTCMilliseconds()
        });
    },

    CreateAsyncRequest: function (cookie) {
        return this._create('AsyncRequest', { cookie: cookie, onTimeout: null });
    },

    CreateProcessId: function () {
        return this._create('processId');
    },

    CreateEventId: function (event, id) {
        return this._create('event id', {
            point: {
                x: event.clientX, y: event.clientY
            },
            name: event.type,
            sourceId: id,
            index: new Date().getTime() % 1000000 // index should be unique, this should be unique enough
        });
    },

    CreateBase64: function (value) {
        return this._create('Base64', { data: value });
    }
}