//holds
window.logException = {};
window.knownLogLevels = ["ALL", "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF"];
window.deletedCats = [];

window.defaultPort = 8824;
window.keyDefaultPort = "UFT_daemonPort";

function createLogCombo(id, logLevel) {
	var logLevelCombo = document.createElement("select");
	logLevelCombo.id = id;
	window.knownLogLevels.forEach(function (level, i) {
		var logOpt = document.createElement("option");
		logOpt.value = level;
		logOpt.innerText = level;
		logLevelCombo.appendChild(logOpt);
		if (level === logLevel)
			logLevelCombo.selectedIndex = i;
	});

	return logLevelCombo;
}

function deleteException(element) {
	var trElem = element.parentNode.parentNode;
	deletedCats.push(trElem.cells[1].innerText);
	trElem.parentNode.removeChild(trElem);
}

function createExceptionRow(catName, catLogLevel) {
	var exceptionRow = document.createElement("tr");
	var cell = document.createElement("td");
	var btn = document.createElement("input");
	btn.className="delBtn";
	btn.type="button";
	btn.value = "X";
	btn.addEventListener("click",function(){deleteException(btn);},false);
	cell.appendChild(btn);

	//cell.style["width"] = "7%";
	exceptionRow.appendChild(cell);
	
	cell = document.createElement("td");
	cell.innerText = catName;
	//cell.style["width"] = "60%";
	exceptionRow.appendChild(cell);
	cell = document.createElement("td");
	var logCombo = createLogCombo(catName + "_LogLevel", catLogLevel);
	cell.appendChild(logCombo);
	//cell.style["width"] = "33%";
	exceptionRow.appendChild(cell);
	return exceptionRow;
}

function init() {
    
    // init the default port
    var defaultPort = window.localStorage.getItem(window.keyDefaultPort);
    defaultPort = defaultPort || window.defaultPort;
    var defaultPortInput = document.getElementById("defaultPort");
    defaultPortInput.value = defaultPort;

	//init the default logging level
	var defaultLogLevel = window.localStorage.getItem("log:defaultLevel");
	defaultLogLevel = defaultLogLevel || LoggerUtilSettings.DEFAULT_LOG_LEVEL;

	//default level
	var defaultContainer = document.getElementById("defaultLogLevelContainer");
	var defaultLevelCombo = createLogCombo("defaultLogLevel", defaultLogLevel);
	defaultContainer.appendChild(defaultLevelCombo);
	Array.prototype.forEach.call(defaultLevelCombo.options, function (o, i) {
		if (defaultLogLevel === o.value)
			defaultLevelCombo.selectedIndex = i;
	});

	//new exception table needs a combo box
	var newExceptionCombo = createLogCombo("newExceptionLogLevel", "ALL");
	var newExceptionTD = document.getElementById("newExceptionsSelect");
	newExceptionTD.appendChild(newExceptionCombo);

	//exception list
	var exceptionList = document.getElementById("exceptions").getElementsByTagName("tbody")[0];
	//iterates over the localStorage and gets all the category exceptions
	for (var i = 0; i < localStorage.length; ++i) {
		var settingKey = localStorage.key(i);
		if (settingKey.match(/^log:cat:/)) {
			var catName = settingKey.split(":")[2];
			var level = localStorage.getItem(settingKey);
			var exceptionRow = createExceptionRow(catName, level);
			exceptionList.appendChild(exceptionRow);
		}
	}

	document.getElementById("addCategorySetting").addEventListener("click", addException, false);
	document.getElementById("saveBtn").addEventListener("click", saveSettings, false);
}

function addException() {
	var exceptionT = document.getElementById("exceptions").getElementsByTagName("tbody")[0];
	var catNameTB = document.getElementById("newCatName");
	var logLevelCB = document.getElementById("newExceptionLogLevel");
	exceptionT.appendChild(createExceptionRow(catNameTB.value, newExceptionLogLevel.options[logLevelCB.selectedIndex].value));

	//clear
	catNameTB.value = "";
	logLevelCB.selectedIndex = 0;
}

function saveSettings() {
    
    // port.
    var defaultPortInput = document.getElementById("defaultPort");
    var port = defaultPortInput.value || window.defaultPort;
    window.localStorage.setItem(window.keyDefaultPort, port);

	var defaultLevel = document.getElementById("defaultLogLevel");
	window.localStorage.setItem("log:defaultLevel", defaultLevel.options[defaultLevel.selectedIndex].value);

	//removing the deleted categories
	deletedCats.forEach(function (cat) {
		window.localStorage.removeItem("log:cat:" + cat);
	});
	deletedCats = [];

	//saving the exceptions
	var exceptionRows = document.getElementById("exceptions").getElementsByTagName("tbody")[0].rows;
	Array.prototype.forEach.call(exceptionRows, function (exception) {
		var catName = exception.cells[1].innerText;
		var logLevel = exception.cells[2].firstChild.options[exception.cells[2].firstChild.selectedIndex].value;
		window.localStorage.setItem("log:cat:" + catName, logLevel);
	});

	LoggerUtilSettings.saveSettings(localStorage);
}

init();

