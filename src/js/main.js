(function() {
	'use strict';

	var DEVELOPING = true,
		SAMPLING_RATE = 48000,
		BUFFER_SIZE = 4096;

	var renderer,
		scene,
		camera,
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
		var voice1 = sorolletPlayer.voices[0];
		var voice2 = sorolletPlayer.voices[1];

		// Manually override some stuff so that this sounds sort of decent
		voice1.wave1Octave = 3;
		voice1.pitchEnvelope.setOutputRange(-10, 10);
		voice1.pitchEnvelope.setTimeScale(3);

		voice2.wave1Volume = 0;
		voice2.wave2Volume = 0;
		voice2.noiseAmount = 0.5;
		voice2.volumeEnvelope.setAttack(0);
		voice2.volumeEnvelope.setDecay(0.2);
		voice2.volumeEnvelope.setTimeScale(0.1);
		
		var debug = document.getElementById('debug');

		var gui1 = new SOROLLET.VoiceGUI();
		gui1.attachTo( voice1 );

		var gui2 = new SOROLLET.VoiceGUI();
		gui2.attachTo( voice2 );

		debug.appendChild(gui1.dom);
		debug.appendChild(gui2.dom);

		// for better hackage
		window.sorolletPlayer = sorolletPlayer;

	}

	function graphicsSetup() {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
		camera.position.set(5, 5, 5);
		camera.lookAt(new THREE.Vector3(0, 0, 0) );

		var meshMaterial = new THREE.MeshBasicMaterial({ color: 0xFF00FF, wireframe: true });

		var cube = new THREE.Mesh( new THREE.CubeGeometry( 5, 5, 5 ), meshMaterial );
		cube.position.set( 0, 0, 0 );
		scene.add( cube );
	}

	function setup() {
		renderer = new THREE.WebGLRenderer({ antialias: false });
		renderer.setClearColorHex( 0xeeeeee, 1.0 );
		
		document.getElementById('renderer').appendChild(renderer.domElement);

		window.addEventListener('resize', onResize, false);
		onResize();

		// TODO 3d paraphernalia setup
		graphicsSetup();

		// Audio setup
		audioSetup();

		// Finally start playing!
		// what was that thing that didn't quite work on Chrome if this was done too early due to some GC thingy? TODO check that out!
		jsAudioNode.connect( audioContext.destination );
		sorolletPlayer.play();
		render();
	}

	function onResize() {
		var w = window.innerWidth,
			h = window.innerHeight;

		renderer.setSize(w, h);
	}

	function render() {
		requestAnimationFrame( render );

		renderer.render( scene, camera );
	}

})();
