var base256 = (function (alpha) {
	var alphabet = alpha || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſƀƁƂƃ',
		base = alphabet.length;
	return {
		encode: function (enc) {
			enc = parseInt(enc);
			if (typeof enc !== 'number')
				return '';
			var encoded = '';
			while (enc) {
				var remainder = enc % base;
				enc = Math.floor(enc / base);
				encoded = alphabet[remainder].toString() + encoded;
			}
			return encoded;
		},
		decode: function (dec) {
			if (typeof dec !== 'string' && !(dec instanceof String))
				throw '"decode" only accepts strings.';
			var decoded = 0;
			while (dec) {
				var alphabetPosition = alphabet.indexOf(dec[0]);
				if (alphabetPosition < 0)
					throw '"decode" can\'t find "' + dec[0] + '" in the alphabet: "' + alphabet + '"';
				var powerOf = dec.length - 1;
				decoded += alphabetPosition * (Math.pow(base, powerOf));
				dec = dec.substring(1);
			}
			return decoded;
		}
	};
})();

var hash = function hash(str) {
		/*jshint bitwise:false */
		var i, l, hval = 0x811c9dc5;

		for (i = 0, l = str.length; i < l; i++) {
		hval ^= str.charCodeAt(i);
		hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
		}

		// Convert to 8 digit hex string
		return zip(hval >>> 0, 4);
}

var pad = function (str, l) {
	return (new Array(l + 1).join("0") + str).slice(-l);
}


var chunk = function (str, size) {
	var chunks = new Array(str.length / size + .5 | 0),
		nChunks = chunks.length;

	var newo = 0;
	for (var i = 0, o = 0; i < nChunks; ++i, o = newo) {
		newo += size;
		chunks[i] = str.substr(o, size);
	}

	return chunks;
}

var zip = function (num, l) {
	return (l) ? pad(base256.encode(num), l) : base256.encode(num);
}

var unzip = function (str) {
	return base256.decode(str);
}

var checkIfLoaded = function (selector, callback) {
		var count = 0, check = function check() {
		if (selector && (
			(typeof (selector) === "boolean")
			|| (selector instanceof Function && selector())
			|| (selector instanceof Object && Object.keys(selector).length)
			|| ((typeof (selector) === 'string' || selector instanceof String) && $(selector).length === selector.split(",").length))) {
			callback();
		} else {
			if (count <= 50) {
				count++;
				setTimeout(check, 200);
			} else {
				console.warn(selector, "not found! max tries reached.");
			}
		}
		};
		check(count);
}