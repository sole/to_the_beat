(function() {
	'use strict';

	var DEVELOPING = true,
		SAMPLING_RATE = 48000,
		BUFFER_SIZE = 4096;

	var renderer,
		audioContext,
		jsAudioNode,
		sorolletPlayer;

	preSetup();

	function preSetup() {
		var container = document.getElementById('container'),
			intro = document.getElementById('intro'),
			start = document.getElementById('start');

		// Audio API & WebGL?
		if( AudioDetector.detects( [ 'webAudioSupport' ] ) ) {
			if( !Detector.webgl ) {
				Detector.addGetWebGLMessage({ parent: container });
				return;
			}
			
			if(DEVELOPING) {
				setup();
			}
		}

		container.style.visibility = 'hidden';

		start.addEventListener('click', function startClick(e) {
			start.removeEventListener('click', startClick);
			intro.className = 'loading';
			start.innerHTML = 'Please wait while LOADING';
			loadingText = start;
			introText = document.getElementById('intro_wrapper');
			setTimeout(setup, 100);
		});

	}

	function audioSetup() {

		audioContext = new AudioContext();
		jsAudioNode = audioContext.createJavaScriptNode( BUFFER_SIZE ),
		sorolletPlayer = new SOROLLET.Player( SAMPLING_RATE );

		jsAudioNode.onaudioprocess = function(event) {
			var buffer = event.outputBuffer,
				outputBufferLeft = buffer.getChannelData(0),
				outputBufferRight = buffer.getChannelData(1),
				numSamples = outputBufferLeft.length,
				sorolletBuffer = sorolletPlayer.getBuffer(numSamples);

			for(var i = 0; i < numSamples; i++) {
				var buf = sorolletBuffer[i];
				outputBufferLeft[i] = buf;
				outputBufferRight[i] = buf;
			}
		};

		// init sorollet using song array
		SOROLLET.Legacy.loadSongFromArray(sorolletPlayer, song);

		console.log(sorolletPlayer);
	}

	function setup() {
		renderer = new THREE.WebGLRenderer({ antialias: false });
		document.body.appendChild(renderer.domElement);

		window.addEventListener('resize', onResize, false);
		onResize();

		// TODO 3d paraphernalia setup

		// Audio setup
		audioSetup();

		// Finally start playing!
		// what was that thing that didn't quite work on Chrome if this was done too early due to some GC thingy? TODO check that out!
		jsAudioNode.connect( audioContext.destination );
		sorolletPlayer.play();
	}

	function onResize() {
		var w = window.innerWidth,
			h = window.innerHeight;

		renderer.setSize(w, h);
	}

})();
