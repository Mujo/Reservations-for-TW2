// var onMessageHandler = function (request, sender, sendResponse) {
// 	console.log("chegou no back", request);
// 	// msg.status = "back";
// 	// msg.sender = sender;
// 	sendResponse(request);
// };
// 
// //chrome.runtime.onMessage.addListener(onMessageHandler);
// //chrome.runtime.onMessageExternal.addListener(onMessageHandler);
// chrome.runtime.onMessageExternal.addListener(
//     function(request, sender, sendResponse) {
//         console.log("background.js got a message")
//         console.log(request);
//         console.log(sender);
//         sendResponse("bar");
//     }
// );
