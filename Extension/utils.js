var base256 = (function (alpha) {
	var alphabet = alpha || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſƀƁƂƃ',
		base = alphabet.length;
	return {
		encode: function (enc) {
			enc = parseInt(enc);
			if (typeof enc !== 'number' || enc !== parseInt(enc))
				//throw '"encode" only accepts integers.';
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

Object.defineProperty(String.prototype, "hash", {
	get: function hash() {
		/*jshint bitwise:false */
		var i, l, hval = 0x811c9dc5;

		for (i = 0, l = this.length; i < l; i++) {
			hval ^= this.charCodeAt(i);
			hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
		}

		// Convert to 8 digit hex string
		return (hval >>> 0).zip(4);
		//return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
	}
});

String.prototype.pad = function (l) {
	return (new Array(l + 1).join("0") + this).slice(-l);
}

String.prototype.chunk = function (size) {
	var chunks = new Array(this.length / size + .5 | 0),
		nChunks = chunks.length;

	var newo = 0;
	for (var i = 0, o = 0; i < nChunks; ++i, o = newo) {
		newo += size;
		chunks[i] = this.substr(o, size);
	}

	return chunks;
}

Object.defineProperty(Number.prototype, "smallDate", {
	get: function smallDate() {
		return (this / 1000 / 60 / 60 / 24 | 0).zip(2);
	}
});

Object.defineProperty(String.prototype, "largeDate", {
	get: function largeDate() {
		return (this).unzip() * 1000 * 60 * 60 * 24;
	}
});

Number.prototype.zip = function (l) {
	return (l) ? base256.encode(this).pad(l) : base256.encode(this);
}

String.prototype.unzip = function () {
	return base256.decode(this);
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