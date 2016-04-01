function injectJs(link) {
	try {
		var scr = document.createElement("script");
		scr.type = "text/javascript";
		scr.src = link;
		(document.head || document.body || document.documentElement).appendChild(scr);
	} catch (error) {
		setTimeout(injectJs, 200, link);
	}
}


injectJs(chrome.extension.getURL("utils.js"));
injectJs(chrome.extension.getURL("reservations.js"));