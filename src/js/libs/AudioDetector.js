// AudioDetector.js / https://github.com/sole/AudioDetector.js
// Based on alteredq & mrdoob's Detector.js https://github.com/mrdoob/three.js/blob/master/examples/js/Detector.js
AudioDetector = {

	REVISION: 3,
	webAudioSupport: typeof(window.AudioContext) === 'function' || typeof( window.webkitAudioContext ) === 'function',
	oggSupport: document.createElement('audio').canPlayType('audio/ogg'),

	errorMessages: {
		'webAudioSupport': 'Your browser does not seem to support the <a href="https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html" style="color:#000">Web Audio API</a>.<br/>' +
				'Find out how to get it <a href="http://chromium.googlecode.com/svn/trunk/samples/audio/index.html" style="color:#000">here</a>.',
		'oggSupport': 'Your browser does not seem to support OGG audio.<br/>' +
				'Find out how to get it <a href="https://developer.mozilla.org/En/Media_formats_supported_by_the_audio_and_video_elements" style="color:#000">here</a>.'
	},

	getErrorMessage: function ( message ) {

		var element = document.createElement( 'div' );
		element.style.fontFamily = 'monospace';
		element.style.fontSize = '13px';
		element.style.fontWeight = 'normal';
		element.style.textAlign = 'center';
		element.style.background = '#fff';
		element.style.color = '#000';
		element.style.padding = '1.5em';
		element.style.width = '350px';
		element.style.margin = '2em auto';
		element.style.zIndex = 1000;
		element.style.position = 'relative';
		element.style.top = '0px';
		element.style.left = '0px';
		element.style.border = '6px solid red';
		element.innerHTML = message;

		return element;

	},

	detects: function( conditions ) {
		if( ! ( conditions instanceof Array ) ) {
			this.showErrorMessage('<span style="font-size: 200%;">Oi!</span> <strong>conditions</strong> must be an Array with conditions to be checked');
			return false;
		}

		for(var i = 0; i < conditions.length; i++) {
			var propertyName = conditions[i];
			
			if(this.errorMessages[propertyName] !== undefined) {
				var checkResult = this[propertyName];
				if(!checkResult) {
					this.showErrorMessage(this.errorMessages[propertyName]);
					return false;
				}
			}
		}

		return true;

	},

	showErrorMessage: function ( message, parameters ) {

		var parent, id, element;

		parameters = parameters || {};

		parent = parameters.parent !== undefined ? parameters.parent : document.body;
		id = parameters.id !== undefined ? parameters.id : 'audio-error-message';

		element = AudioDetector.getErrorMessage(message);
		element.id = id;

		parent.appendChild( element );
		
		element.style.position = 'absolute';
		element.style.top = '100px';
		element.style.left = ((window.innerWidth - element.clientWidth) / 2) + 'px';

	}

};
