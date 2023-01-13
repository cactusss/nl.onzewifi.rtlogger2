"use strict";

const Homey = require('homey');
const fetch = require('node-fetch');
const luxon = require('luxon');
const ip = require('ip');
const Logger = require('./captureLogs.js');
const WebSocket = require('ws');
const http = require("http");

const namespaces = ["manager:alarms", "manager:api", "manager:apps", "manager:audio", "manager:backup", "manager:ble", "manager:cloud", "manager:database", "manager:devices", "manager:devkit", "manager:drivers", "manager:energy", "manager:experiments", "manager:flow", "manager:flowtoken", "manager:geolocation", "manager:googleassistant", "manager:i18n", "manager:images", "manager:insights", "manager:ledring", "manager:logic", "manager:mobile", "manager:notifications", "manager:presence", "manager:reminder", "manager:rf", "manager:sessions", "manager:settings", "manager:speechinput", "manager:speechoutput", "manager:system", "manager:updates", "manager:users", "manager:weather", "manager:webserver", "manager:zigbee", "manager:zones", "manager:zwave", "wireless:433", "wireless:868", "wireless:ble", "wireless:ir", "wireless:nfc"];

class RealTimeLogger extends Homey.App {

	async onInit() {
		if (!this.logger) this.logger = new Logger({ name: 'Realtime Logger²', length: 500, homey: Homey.app });
		this.log(`Realtime Logger² has been initialized`);

		const _ = this;

		var htmlport;
		htmlport = this.homey.settings.get('htmlport') || 9101;
		this.homey.settings.set('htmlport',htmlport);

		var websocketport;
		websocketport = this.homey.settings.get('websocketport') || 9102;
		this.homey.settings.set('websocketport',websocketport);

		// Bij afsluiten de logfile opslaan
		this.homey.on('unload', () => {
			this.log('Realtime Logger²' + this.homey.__("app.app-end"));
			this.logger.saveLogs();
		});

		// Geheugen waarschwing
		this.homey.on('memwarn', () => {
			this.log('Memory warning');
		});

		// CPU spike waarschuwing
		this.homey.on('cpuwarn', () => {
			this.log('CPU Warning');
		});

		// Melding als instellingen zijn bijgewerkt
		this.homey.settings.on('set', async args => {
			this.log('New value ('+ this.homey.settings.get(args) + ') for ' + args + ' saved.');
			htmlport = this.homey.settings.get('htmlport') || '9101';
			websocketport = this.homey.settings.get('websocketport') || '9102';
			this.log('Due to new settings the app needs to restart. Please make that happen!');
		});

		// Global Garbage Collection ieder 5 minuten
		this.intervalIdGc = setInterval(() => {
			global.gc();
		}, 300 * 1000 /*ms*/);


		const ipaddress = ip.address();

		// Minify HTML with https://www.willpeavy.com/tools/minifier/
		const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>< Realtime Logger²> Web Frontend</Realtime></title><style>textarea, label{font-family: Arial; font-size: 13.3333333px; padding: 3px 5px;}table{font-family: Arial, Helvetica, sans-serif; border-collapse: collapse; margin: 20px 0; font-size: 12px; display: block; overflow-x: auto; display: initial;}table thead, table tfoot{position: -webkit-sticky; position: sticky; top: 0px;}table thead{background-color: rgb(208, 208, 208); inset-block-start: 0; /* "top" */}table tfoot{background-color: rgb(208, 208, 208); inset-block-end: 0; /* "bottom" */}table th, table td{border: 1px solid #ddd; padding: 3px; text-align: left;}.indicator{height: 15px; width: 15px; background-color: red; border-radius: 50%; display: inline-block; float: right; margin-top: 3px;}.sortable{cursor: pointer;}.stripe{background-color: #f2f2f2;}.viewPort{height: 100vh; width: 100vw; overflow: hidden; margin: 0px; margin-top: 10px;}.buttonDiv{height: 2em; display: block; margin: 5px}.tableDiv{height: calc(100vh - 3.5em); display: block; overflow: auto; margin: 0px;}.floatRight{float: right}</style><script src="https://code.jquery.com/jquery-3.5.1.min.js"></script><script>var allIDs2Names=[]; const ws=new WebSocket("ws://192.168.178.238:${websocketport}/"); ws.onmessage=function (e){clearTimeout(onmessageTimeout); $(".indicator").css("background-color", "green"); var wsData=JSON.parse(e.data); if (wsData.content=='log'){var markup="<tr><td nowrap>" + wsData.timestamp + "</td><td nowrap>" + wsData.type + "</td><td nowrap>" + wsData.namespace + "</td><td nowrap>" + wsData.category + "</td><td nowrap>" + allIDs2Names[wsData.category] + "</td><td nowrap>" + wsData.source + "</td><td nowrap title='" + wsData.rawdata + "'>" + wsData.rawdata + "</td></tr>"; $("#logtable tbody").prepend(markup); if ($('#logtable tbody tr').length > $('#maxRows').val()){$("#logtable tbody").find("tr:gt(" + ($('#maxRows').val() - 1) + ")").remove();}$("#searchLOG").val($("#searchLOG").val()).trigger('keyup').focus();}if (wsData.content=='nsp'){if (!("homey:" + wsData.nsp in allIDs2Names)){var markup="<tr><td class='checkbox'><input class='nsp' type='checkbox' id='homey:" + wsData.nsp + "' onclick='subscription(this);'/></td><td>homey:" + wsData.nsp + "</td></tr>"; $("#nsptable tbody").append(markup); allIDs2Names["homey:" + wsData.nsp]="";}}if (wsData.content=='dev'){if (!("homey:device:" + wsData.id in allIDs2Names)){var markup="<tr><td class='checkbox'><input class='dev' type='checkbox' id='homey:device:" + wsData.id + "' onclick='subscription(this);'/></td><td>" + wsData.name + "</td><td>" + wsData.id + "</td></tr>"; $("#devtable tbody").append(markup); allIDs2Names["homey:device:" + wsData.id]=wsData.name; sortTable(1, "devtable");}}if (wsData.content=='app'){if (!("homey:app:" + wsData.id in allIDs2Names)){var markup="<tr><td class='checkbox'><input class='app' type='checkbox' id='homey:app:" + wsData.id + "' onclick='subscription(this);'/></td><td>" + wsData.name + "</td><td>" + wsData.id + "</td></tr>"; $("#apptable tbody").append(markup); allIDs2Names["homey:app:" + wsData.id]=wsData.name; sortTable(1, "apptable");}}var onmessageTimeout=setTimeout(function (){if ($(".start").val()=='Resume'){$(".indicator").css("background-color", "orange");}else{$(".indicator").css("background-color", "grey");}$('#logtable tr:visible').each(function (e, v){if (e % 2==0){$(this).addClass('stripe');}else{$(this).removeClass('stripe');}});}, 1000);}; window.addEventListener('beforeunload', function (event){console.log("Sending disconnect event"); ws.send(JSON.stringify({command: 'stop'})); ws.send(JSON.stringify({command: 'unload'}));}); ws.addEventListener('close', function (event){console.log("WebSocket send close event"); $(".indicator").css("background-color", "red");}); ws.addEventListener('error', function (event){console.log("WebSocket send error event"); $(".indicator").css("background-color", "red");}); $(document).ready(function (){ws.addEventListener('open', function (event){$(".indicator").css("background-color", "green"); ws.send(JSON.stringify({command: 'init'})); ws.send(JSON.stringify({command: 'nsp'})); ws.send(JSON.stringify({command: 'dev'})); ws.send(JSON.stringify({command: 'app'})); var onmessageTimeout=setTimeout(function (){if ($(".start").val()=='Resume'){$(".indicator").css("background-color", "orange");}else{$(".indicator").css("background-color", "grey");}}, 1000);}); $(".stop").click(function (){ws.send(JSON.stringify({command: 'stop'}));}); $(".start").click(function (){if ($(".start").prop('value')=='Start' || $(".start").prop('value')=='Resume'){$(".start").prop('value', 'Pause'); ws.send(JSON.stringify({command: 'start'})); $(".indicator").css("background-color", "grey");}else{$(".start").prop('value', 'Resume'); ws.send(JSON.stringify({command: 'stop'})); $(".indicator").css("background-color", "orange");}}); $(".export").click(function (){var html=document.querySelector("table").outerHTML; htmlToCSV(html, 'Homey Debug Log.csv');}); $(".clear").click(function (){$("#logtable tbody").empty();}); $(".log").click(function (){$("#subscriptionsdiv").hide(); $("#logdiv").show(); $("#logtable").show(); $('[id^="search"]').hide(); $("#searchLOG").show()}); $(".subscriptions").click(function (){$("#logdiv").hide(); $("#subscriptionsdiv").show(); if ($('#nsptable').is(':visible')){$("#searchNSP").show()}if ($('#devtable').is(':visible')){$("#searchDEV").show()}if ($('#apptable').is(':visible')){$("#searchAPP").show()}}); $(".nsp").click(function (){$("table").hide(); $('[id^="search"]').hide(); $("#nsptable").show(); $("#searchNSP").show()}); $(".dev").click(function (){$("table").hide(); $('[id^="search"]').hide(); $("#devtable").show(); $("#searchDEV").show()}); $(".app").click(function (){$("table").hide(); $('[id^="search"]').hide(); $("#apptable").show(); $("#searchAPP").show()}); $("#searchLOG").on("keyup", function (){var value=$(this).val().toLowerCase(); $("#logtable tr").not('thead tr').not('tfoot tr').filter(function (){$(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)}); $("#logTotal").html("Displaying " + $('#logtable tbody tr:visible').length + " of " + $('#logtable tbody tr').length + " rows");}); $("#searchNSP").on("keyup", function (){var value=$(this).val().toLowerCase(); $("#nsptable tr").not('thead tr').not('tfoot tr').filter(function (){$(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)}); $("#nspTotal").html("Displaying " + $('#nsptable tbody tr:visible').length + " of " + $('#nsptable tbody tr').length + " rows");}); $("#searchDEV").on("keyup", function (){var value=$(this).val().toLowerCase(); $("#devtable tr").not('thead tr').not('tfoot tr').filter(function (){$(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)}); $("#devTotal").html("Displaying " + $('#devtable tbody tr:visible').length + " of " + $('#devtable tbody tr').length + " rows");}); $("#searchAPP").on("keyup", function (){var value=$(this).val().toLowerCase(); $("#apptable tr").not('thead tr').not('tfoot tr').filter(function (){$(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)}); $("#appTotal").html("Displaying " + $('#apptable tbody tr:visible').length + " of " + $('#apptable tbody tr').length + " rows");}); $('[id^="search"]').keypress(function (e){if (e.which==13){e.preventDefault();}}); $('input[type=search]').on('search', function (){$(this).val('').trigger('keyup').focus()}); $("#toggleNSPs").click(function (){var checkBoxes=$(".nsp"); checkBoxes.prop("checked", !checkBoxes.prop("checked")); $.each(checkBoxes, function (key, value){subscription(value);})}); $("#toggleDEVs").click(function (){var checkBoxes=$(".dev"); checkBoxes.prop("checked", !checkBoxes.prop("checked")); $.each(checkBoxes, function (key, value){subscription(value);})}); $("#toggleAPPs").click(function (){var checkBoxes=$(".app"); checkBoxes.prop("checked", !checkBoxes.prop("checked")); $.each(checkBoxes, function (key, value){subscription(value);})});}); function subscription(checkbox){if (checkbox.checked){ws.send(JSON.stringify({command: 'subscribe', subscription: checkbox.id}));}else{ws.send(JSON.stringify({command: 'unsubscribe', subscription: checkbox.id}));}}function htmlToCSV(html, filename){var data=[]; var rows=document.querySelectorAll("table.logtable tr"); for (var i=0; i < rows.length; i++){var row=[], cols=rows[i].querySelectorAll("td, th"); for (var j=0; j < cols.length; j++){row.push(cols[j].innerText);}data.push(row.join(','));}downloadCSVFile(data.join('\\n'), filename);}function downloadCSVFile(csv, filename){var csv_file, download_link; csv_file=new Blob([csv],{type: 'text/csv'}); download_link=document.createElement('a'); download_link.download=filename; download_link.href=window.URL.createObjectURL(csv_file); download_link.style.display='none'; document.body.appendChild(download_link); download_link.click();}function sortTable(n, table){var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount=0; table=document.getElementById(table); switching=true; dir="asc"; while (switching){switching=false; rows=table.rows; for (i=1; i < (rows.length - 2); i++){shouldSwitch=false; x=rows[i].getElementsByTagName("TD")[n]; y=rows[i + 1].getElementsByTagName("TD")[n]; if (dir=="asc"){if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()){shouldSwitch=true; break;}}else if (dir=="desc"){if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()){shouldSwitch=true; break;}}}if (shouldSwitch){rows[i].parentNode.insertBefore(rows[i + 1], rows[i]); switching=true; switchcount++;}else{if (switchcount==0 && dir=="asc"){dir="desc"; switching=true;}}}}</script></head><body class="viewPort"></body><div class="viewPort"><div id="logdiv"><div class="buttonDiv"><form><input type="button" class="subscriptions" value="Subscriptions" style="height:22px; width:100px"><input type="button" class="start" value="Start" style="height:22px; width:100px"><input type="button" class="export" value="Export" style="height:22px; width:100px"><input type="button" class="clear" value="Clear" style="height:22px; width:100px"><input type="search" id="searchLOG" placeholder="Search within the Logs"/><span class="indicator"></span><span class="floatRight">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><input class="floatRight" type="text" id="maxRows" placeholder="Max No. of Rows" value="1000" size="2"/><label class="floatRight" for="maxRows">Max. rows</label></form></div><div class="tableDiv"><table id="logtable" class="logtable"><thead><tr><th width="1%" class="sortable">Timestamp</th><th width="1%" class="sortable">Type</th><th width="1%" class="sortable">NSP</th><th width="1%" class="sortable">ID</th><th width="1%" class="sortable">Name</th><th width="1%" class="sortable">Event</th><th width="100%">Raw Data</th></tr></thead><tbody></tbody><tfoot><tr><th id="logTotal" colspan="7">Displaying 0 of 0</th></tr></tfoot></table></div></div><div id="subscriptionsdiv" style="display:none;"><div class="buttonDiv"><form><input type="button" class="log" value="Show Log" style="height:22px; width:100px"><input type="button" class="nsp" value="Namespaces" style="height:22px; width:100px"><input type="button" class="dev" value="Devices" style="height:22px; width:100px"><input type="button" class="app" value="Apps" style="height:22px; width:100px"><input type="search" id="searchNSP" style="display:none;" placeholder="Search within the Namespaces"/><input type="search" id="searchDEV" style="display:none;" placeholder="Search within the Devices"/><input type="search" id="searchAPP" style="display:none;" placeholder="Search within the Apps"/></form></div><div class="tableDiv"><table id="nsptable"><thead><tr><th><input id='toggleNSPs' type='checkbox' title='Toggle all checkboxes'/></th><th class="sortable" onclick="sortTable(1, 'nsptable');" width="100%" title='Sort by App Namespace Name'> Namespace</th></tr></thead><tbody></tbody><tfoot><tr><th id="nspTotal" colspan="2"></th></tr></tfoot></table><table id="devtable" style="display:none"><thead><tr><th><input id='toggleDEVs' type='checkbox' title='Toggle all checkboxes'/></th><th class="sortable" onclick="sortTable(1, 'devtable');" width="50%" title='Sort by Device Name'>Device Name</th><th class="sortable" onclick="sortTable(2, 'devtable');" width="50%" title='Sort by Device ID'> ID</th></tr></thead><tbody></tbody><tfoot><tr><th id="devTotal" colspan="3"></th></tr></tfoot></table><table id="apptable" style="display:none"><thead><tr><th><input id='toggleAPPs' type='checkbox' title='Toggle all checkboxes'/></th><th class="sortable" onclick="sortTable(1, 'apptable');" width="50%" title='Sort by App Name'> App Name</th><th class="sortable" onclick="sortTable(2, 'apptable');" width="50%" title='Sort by App ID'>ID </th></tr></thead><tbody></tbody><tfoot><tr><th id="appTotal" colspan="3"></th></tr></tfoot></table></div></div></div></body></html>`;

		var pauzed = true;

		let HomeyId = await this.homey.cloud.getHomeyId();
		let bearerToken = await this.homey.api.getOwnerApiToken();

		var devices = {};
		let deviceurl = 'http://127.0.0.1/api/manager/devices/device/';
		let devicesettings = { contentType: 'application/json', headers: { Authorization: 'Bearer ' + bearerToken } };

		var apps = {};
		let appsurl = 'http://127.0.0.1/api/manager/apps/app';
		let appsurlsettings = { contentType: 'application/json', headers: { Authorization: 'Bearer ' + bearerToken } };

		const wss = new WebSocket.Server({ port: websocketport });
		wss.on('connection', ws => {
			ws.on('message', message => {
				var wsData = JSON.parse(message);
				switch (wsData.command) {
					case 'init':
						_.log("Initialisation request received from frontend");
						break;
					case 'start':
						pauzed = false;
						break;
					case 'stop':
						pauzed = true;
						break;
					case 'nsp':
						wss.clients.forEach(function each(client) {
							namespaces.forEach(function (namespace) {
								client.send(JSON.stringify({ content: "nsp", nsp: namespace }));
							});
						});
						break;
					case 'dev':
						fetch(deviceurl, devicesettings)
							.then(res => res.json())
							.then((json) => {
								var deviceArray = Object.keys(json);
								deviceArray.forEach(function (device) {
									wss.clients.forEach(function each(client) {
										client.send(JSON.stringify({ content: "dev", name: json[device].name, id: json[device].id }));
									});
								});
							});
						break;
					case 'app':
						fetch(appsurl, appsurlsettings)
							.then(res => res.json())
							.then((json) => {
								var appsArray = Object.keys(json);
								appsArray.forEach(function (app) {
									wss.clients.forEach(function each(client) {
										client.send(JSON.stringify({ content: "app", name: json[app].name, id: json[app].id }));
									});
								});
							});
						break;
					case 'subscribe':
						HomeySocket.emit("subscribe", wsData.subscription);
						_.log("Subscribing to " + wsData.subscription);
						break;
					case 'unsubscribe':
						HomeySocket.emit("unsubscribe", wsData.subscription);
						_.log("Unsubscribing from " + wsData.subscription);
						break;
					case 'unload':
						_.log("Unsubscribing from App Events");
						// Unsubscribe to App events
						fetch(appsurl, appsurlsettings)
							.then(res => res.json())
							.then((json) => {
								var appsArray = Object.keys(json);
								appsArray.forEach(function (app) {
									HomeySocket.emit("unsubscribe", 'homey:app:' + json[app].id);
								});
							});

						// Unsubscribe to Device events
						_.log("Unsubscribing from Device Events");
						fetch(deviceurl, devicesettings)
							.then(res => res.json())
							.then((json) => {
								var deviceArray = Object.keys(json);
								deviceArray.forEach(function (device) {
									HomeySocket.emit("unsubscribe", 'homey:device:' + json[device].id);
								});
							});

						// Unsubscribe namespace events
						_.log("Unsubscribing from Namespaces");
						namespaces.forEach(function (namespace) {
							HomeySocket.emit("unsubscribe", 'homey:' + namespace);
						});
						break;
					default:
						break;
				}
			});
		});

		_.log('Connecting to Homey realtime manager...');
		const socket = require("socket.io-client")('http://127.0.0.1', {
			transports: ['websocket', 'polling'],
			perMessageDeflate: false
		});

		var HomeySocket;
		socket.on('connect', function () {
			_.log('Trying to connect to Homey\'s WebSockets');
			socket.emit('handshakeClient', {
				homeyId: HomeyId,
				token: bearerToken
			}, function (error, n) {
				if (error) return _.error('Main socket connection error', error);
				HomeySocket = socket.io.socket(n.namespace);
				HomeySocket.onevent = function (packet) { //Override incoming socket events
					var category = packet.data[0].split(':')[2];
					var eventtitle = packet.data[0].split(':')[2] + ': ' + packet.data[1];
					var data = packet.data[2];
					if (packet.data[2].chunk) {
						data = String.fromCharCode.apply(null, new Uint8Array(packet.data[2].chunk));
					}
					if (apps[packet.data[0].split(':')[2]]) {
						category = 'apps';
						eventtitle = apps[packet.data[0].split(':')[2]] + ': ' + packet.data[1];
					} else if (devices[packet.data[0].split(':')[2]]) {
						category = 'devices';
						eventtitle = devices[packet.data[0].split(':')[2]] + ': ' + packet.data[1];
					}
					var logData = JSON.stringify(packet.data) || [];
					var logParts = logData.split(",");
					var jsonPos = logData.indexOf("{");
					var wsData = {
						content: "log",
						timestamp: luxon.DateTime.now().setZone(_.homey.clock.getTimezone()).toFormat('yyyy-MM-dd HH:mm:ss.SSS'),
						type: packet.type,
						namespace: packet.nsp,
						category: logParts[0].replace("[", "").replace(/"/g, ""),
						source: logParts[1].replace(/"/g, ""),
						rawdata: logData.substring(jsonPos)
					};
					wss.clients.forEach(function each(client) {
						if (!(pauzed)) {
							client.send(JSON.stringify(wsData));
						}
					});
				};

				HomeySocket.once("connect", function () {
					_.log("HomeySocket connection established");
					//socket.close()
				});

				HomeySocket.once("disconnect", function (error) {
					_.log("HomeySocket disconnected", error);
				});
				HomeySocket.once("error", function (error) {
					_.error("HomeySocket error", error);
				});
				HomeySocket.open();
				_.log("Opening HomeySocket");

			});
		});

		http.createServer(function (req, res) {
			res.setHeader("Content-Type", "text/html");
			res.writeHead(200);
			res.end(html);
		}).listen(htmlport, () => {
			_.log(`Webserver is initialized and running on ${ipaddress} on port ${htmlport}`);
			_.log(`You may now connect to http://${ipaddress}:${htmlport}`);
		});

		socket.on('error', function (err) {
			_.error(socket);
		});

		socket.on("connect_error", (err) => {
			_.error(`connect_error due to ${err.message}`);
		});

		socket.on("reconnect", (attempt) => {
			_.log('reconnect: ' + attempt);
		});

		socket.on("reconnect_attempt", (attempt) => {
			_.log('reconnect_attempt: ' + attempt);
		});

		socket.on("reconnect_error", (error) => {
			_.error('reconnect_error: ' + error);
		});

		socket.on("reconnect_failed", () => {
			_.error('reconnect_failed');
		});

		socket.connect();
		_.log("Connecting Socket");

		setInterval(function () {
			global.gc();
		}, 1000 * 300);

	}

	log() {
		console.log.bind(this, luxon.DateTime.now().setZone(this.homey.clock.getTimezone()).toFormat('dd HH:mm:ss') + " [log]").apply(this, arguments);
	}

	error() {
		console.error.bind(this, luxon.DateTime.now().setZone(this.homey.clock.getTimezone()).toFormat('dd HH:mm:ss') + " [err]").apply(this, arguments);
	}

	deletelogs() {
		return this.logger.deleteLogs();
	}

	getlogs() {
		return this.logger.logArray;
	}
}

module.exports = RealTimeLogger;

