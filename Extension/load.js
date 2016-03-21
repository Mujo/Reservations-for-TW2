function injectJs(link) {
        var scr = document.createElement("script");
        scr.type="text/javascript";
        scr.src=link;
        (document.head || document.body || document.documentElement).appendChild(scr);
}
//console.log('chrome.storage', chrome.storage);
//console.log('chrome.runtime.onMessage', chrome.runtime.onMessage);
injectJs(chrome.extension.getURL("utils.js"));
injectJs(chrome.extension.getURL("reservations.js"));
var private = {};

//window.chrome = chrome;
// chrome.runtime.onMessage.addListener(function (msg, sender, callback) {
// 	//console.log("chegou no load", msg, sender, callback);
// 	msg.status = "load";
// 	msg.sender = sender;
// 	callback(msg);
// 	return true;
// });

// window.onMessageHandler = function (msg, sender, callback) {
// 	console.log("chegou no load", msg);
// 	//msg.status = "load";
// 	//msg.sender = sender;
// 	callback(msg);
// };
// chrome.runtime.onMessage.addListener(window.onMessageHandler);
// 
// chrome.runtime.sendMessage(
//     "foo",
//     function (response) {
//         console.log(response);
//     }
// );