(function() {
	'use strict';

	var DEVELOPING = true,
		SAMPLING_RATE = 48000,
		BUFFER_SIZE = 4096;

	var renderer,
		scene,
		camera, cameraTarget = new THREE.Vector3(),
		textXPLSV,
        textToTheBeat,
        grid,
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

	// Builds a mesh with lines that render the letters in data
	function makeText(data, numInstances) {
		var lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFB2BD, linewidth: 1 });
		var lineGeometry = new THREE.Geometry();
		var text = new THREE.Object3D();
		var index = 0;
		var numCharacters = data[index++];
		var characterWidth = 1.4;
		var x = 0;

		// Build geometry first
		for(var i = 0; i < numCharacters; i++) {
			var numSegments = data[index++];

			console.log('char', i, 'num segs', numSegments);

			for(var j = 0; j < numSegments; j++) {
				var absX1 = data[index++];
				var absY1 = data[index++];
				var absX2 = data[index++];
				var absY2 = data[index++];
				
				console.log('segment', j, 'x', absX1, 'y', absY1);

				lineGeometry.vertices.push(new THREE.Vector3(x + absX1, absY1, 0));
				lineGeometry.vertices.push(new THREE.Vector3(x + absX2, absY2, 0));

			}
				x += characterWidth;

		}

		// and numInstances lines later
		for(var k = 0; k < numInstances; k++) {
			var line = new THREE.Line(lineGeometry, lineMaterial, THREE.LinePieces);
			text.add( line );
		}
	
		return text;

	}


    function makeGrid(width) {

        var num = 30;
        var thickEach = 5;
        var gridInc = 4 * width / num;
        var gridTop = width * 2;
        var xPos = -gridTop;
        var yPos;
        var grid = new THREE.Object3D();
        var gridThinMaterial = new THREE.LineDashedMaterial({ linewidth: 1, color: 0xF1EFB4, dashSize: 2, gapSize: 1, opacity: 0.5, transparent: true, blending: THREE.AdditiveBlending });
        var gridThickMaterial = new THREE.LineBasicMaterial({ linewidth: 3, color: 0xF1EFB4, opacity: 0.5, transparent: true, blending: THREE.AdditiveBlending });
        var geometryThin = new THREE.Geometry();
        var geometryThick = new THREE.Geometry();
        var geometry;

        for(var i = 0; i < num; i++) {
            
            yPos = -gridTop;
            
            for(var j = 0; j < num; j++) {

                if(i % thickEach === 0 & j % thickEach === 0) {
                    
                    geometry = geometryThick;

                } else {

                    geometry = geometryThin;
                
                }
                
                geometry.vertices.push(new THREE.Vector3(xPos, yPos, -gridTop));
                geometry.vertices.push(new THREE.Vector3(xPos, yPos,  gridTop));

                geometry.vertices.push(new THREE.Vector3(xPos, -gridTop, yPos));
                geometry.vertices.push(new THREE.Vector3(xPos,  gridTop, yPos));
                
                yPos += gridInc;
            }

            xPos += gridInc;

        }
        
        geometryThin.computeLineDistances();

        grid.add(new THREE.Line(geometryThin, gridThinMaterial, THREE.LinePieces));
        grid.add(new THREE.Line(geometryThick, gridThickMaterial, THREE.LinePieces));

        return grid;
    }

	function graphicsSetup() {
		scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x383733, 100, 200);

		camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
		var p = 100;
		camera.position.set(p, p, p);
		camera.lookAt(new THREE.Vector3(0, 0, 0) );

        var numCopies = 10;
		var s = 5;

        textXPLSV = makeText(gfx.text_xplsv, numCopies);
		textXPLSV.scale.set(s,s,s);
        scene.add(textXPLSV);
        
        textToTheBeat = makeText(gfx.text_to_the_beat, numCopies);
        textToTheBeat.scale.set(s, s, s);
        //scene.add(textToTheBeat);
        
        grid = makeGrid(5000);
        scene.add(grid);

		var meshMaterial = new THREE.MeshBasicMaterial({ color: 0xFF00FF, wireframe: true });

		var cube = new THREE.Mesh( new THREE.CubeGeometry( 5, 5, 5 ), meshMaterial );
		cube.position.set( 0, 0, 0 );
		//scene.add( cube );
	}

	function setup() {
		renderer = new THREE.WebGLRenderer({ antialias: false });
		renderer.setClearColor( 0x383733, 1.0 );
		
		document.getElementById('renderer').appendChild(renderer.domElement);

		window.addEventListener('resize', onResize, false);
		onResize();

		// 3D paraphernalia setup
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

        var t = Date.now() * 0.0001;
        var s = 100;

        camera.position.set(s * Math.sin(t), s * Math.cos(t/2), s * Math.cos(t));
        camera.lookAt(cameraTarget);

		renderer.render( scene, camera );
	}

})();
