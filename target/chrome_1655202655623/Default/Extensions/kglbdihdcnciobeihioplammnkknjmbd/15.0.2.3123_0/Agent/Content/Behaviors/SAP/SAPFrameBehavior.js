var SAPFrameBehavior = {
	_attrs: {
		"name": function () {
			if (SapConfigurationUtil.isElementOfSpecifier(window.frameElement, SAP_SPECIFIER_ENUM.SAPSP_NWBC_DIALOG_FRAME)) {
				var attrName = window.name;
				var name = "";
				if (!Util.isNullOrUndefined(attrName)) {
					//remove the variable numbers from the name
					var pos = attrName.indexOf("_");
					if (pos >= 0) {
						name = attrName.substr(0, pos);
					}
				}
				return name;
			}
			else {
				var attrName = window.name;
				if (!Util.isNullOrUndefined(attrName) && SAPFrameBehavior._helpers._isItsFrame(attrName)) {
					// Special case: Name starts with "itsframe". check id.
					if (window.frameElement != null) {
						var id = window.frameElement.id;
						if (!Util.isNullOrUndefined(id) && id.length > 0) {
							return id;
						}
					}
				}
				return "";
			}
		},

		micclass: function () {
            return this._isPage ? ["Page"] : ["SAPFrame"];
        },

		"minimized": function () {
			return "";
		},

		"logical name": function () {
			var logicalName = typeof (window.document.title) === "string" ? window.document.title : "";
			if (!Util.isNullOrUndefined(logicalName) && logicalName.length > 0)
				return logicalName;
			else {
				return window.name;
			}
		},

		"visible": function () {
			return SAPFrameBehavior._helpers._isVisible();
		},

		"url without form data": function () {
			//SAP URL uses '~' and '?' as a separators.
			//first get the whole url from the inner AO
			// TODO : Continue from here with GetAttrEx
			var attrUrl = window.document.location.href.replace(/\/$/, "");;
			if (Util.isNullOrUndefined(attrUrl))
				return "";

			if (attrUrl.length > 0) {
				//separate the url from the data. take the left most separator.
				var posTil = attrUrl.indexOf("~");
				var posQM = attrUrl.indexOf("?");
				var pos;
				if (posTil == -1 && posQM == -1)
					pos = -1;
				else if (posTil != -1 && posQM != -1)
					pos = (posTil < posQM) ? posTil : posQM;
				else if (posTil == -1)
					pos = posQM;
				else
					pos = posTil;
				var urlData;
				if (pos != -1) {
					//found a separator - take the URL only till the separator
					urlData = attrUrl.substr(pos, attrUrl.length - pos);
					attrUrl = attrUrl.substr(0, pos);
				}
				return attrUrl;
			}
			else	//couldn't find URL
				return "";

		},
		//use the inner AO of the container
		//return spWebFrame->GetAttrEx(AttrName, pAttrData, ppAttrVal); 
	},

	_helpers: {
		_isItsFrame: function (name) {
			return !Util.isNullOrUndefined(name)
				&& name.indexOf("itsframe") == 0
				&& name.length > "itsframe".length;
		},

		_isVisible: function () {
			//Get the frame's element
			if (window.frameElement == null)
				return true;	// pFrame has no element --> it is a page

			//Is pFrame explicitly hidden?
			if (SAPUtils.isHidden(window.frameElement))
				return false;

			//Have we reached the top document (page)? --> visible
			//Always top! ?? 
			if (document != null)
				return true;

			//Get parent frame through page
			var page = window.frameElement.parent;
			//to do
			//var parentFrame = WIKitsUtils:: GetFrameObjByDocument (pPage, doc/*spDoc*/);

			//pFrame is visible iff its parent is visible
			return IsVisible(pParentFrame);
		},
	},

	_isICWCFrame: function () {
		var ret = document.getElementById("BackButton");
		if (ret != null)
			return true;

		ret = document.getElementById("allTabStrip-tbl");
		if (ret != null)
			return true;

		return false;
	},
}