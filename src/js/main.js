(function() {
	'use strict';

	var DEVELOPING = true,
		SAMPLING_RATE = 48000,
		BUFFER_SIZE = 4096;

	var renderer,
		scene,
		camera, cameraTarget = new THREE.Vector3(),
        rotation = 0, // for _the_ effect
        lastRenderTime = 0,
		textXPLSV,
        textToTheBeat,
        grid,
		audioContext,
		jsAudioNode,
		sorolletPlayer,
        songOrder, songPattern, songRow,
        infoLayer = document.getElementById('info');

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

        // Events
        sorolletPlayer.addEventListener('orderChanged', function(ev) {
            songOrder = ev.order;
            updateInfo();
        }, false);

        sorolletPlayer.addEventListener('patternChanged', function(ev) {
            songPattern = ev.pattern;
            updateInfo();
        }, false);

        sorolletPlayer.addEventListener('rowChanged', function(ev) {
            songRow = ev.row;
            updateInfo();
        }, false);

        // init values - maybe it should listen to the first orderChanged event and
        // start rendering then (and unlisten to that event) TODO review this
        songOrder = 0;
        songPattern = sorolletPlayer.orderList[songOrder];
        songRow = 0;


        // For debugging/hacking
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

        // TODO center geometry

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
        //scene.fog = new THREE.Fog(0x383733, 100, 200);

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
        scene.add(textToTheBeat);
        
        grid = makeGrid(5000);
        scene.add(grid);

		var meshMaterial = new THREE.MeshBasicMaterial({ color: 0xFF00FF, wireframe: true });

		var cube = new THREE.Mesh( new THREE.CubeGeometry( 5, 5, 5 ), meshMaterial );
		cube.position.set( 0, 0, 0 );
		//scene.add( cube );

        console.log(scene.rotation);
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

    function updateEffect(time, deltaTime, order, pattern, row) {
        var mainOrder = 2;
        var endingOrder = 6;

        var cameraFOV = 90,
            cameraAspect = 1.3;

        var eyeX = -90, eyeY = 0, eyeZ = 30;
        var rotationX, rotationY;

        if(order < mainOrder) {
            cameraFOV = 100;
            eyeX = -250 + row;
        } else {
            var radius = 120;
            var ang = time * 0.08; //0.0008;
            cameraFOV = 120;
            eyeX = radius * Math.sin(ang);
            eyeY = radius * Math.cos(ang);
        }

        var thePattern = sorolletPlayer.patterns[sorolletPlayer.orderList[order]];
        if(thePattern === undefined) {
            console.log('aaag', order, sorolletPlayer.orderList[order]);
        }

        var theCell = thePattern.getCell(row, 0);
        var bdNote = theCell.note;
        var extra = 0;



        if(bdNote == 48) {
            extra += 5;
        }

        if(extra > 0) {
            var am = 0.75 * deltaTime;

            extra -= am;
            if(extra < 0) {
                extra = 0;
            }

            rotation += am;
            if(rotation < 0) {
                rotation = 0;
            }

        }

        if(order >= mainOrder) {
            if(row % 8 === 0) {
                rotationY = -0.25 * rotation;
            } else {
                rotationX = 0.25 * rotation;
            }
        }

        // TODO: camera FOV
        if(order >= mainOrder) {

            scene.rotation.z = rotation;

            if(rotationX) {

                scene.rotation.x = rotationX;
            }


            if(rotationY) {
                scene.rotation.y = rotationY;
                scene.rotation.z *= -rotationY;
            }

        }


        // Text
        var textScale, activeText, activeTextChildren, activeTextNumChildren, range = 0.06;
        
        if(order < mainOrder) {
            textScale = 40 + rrand(0, 5);
        } else {
            textScale = 80;
        }

        if(row < 16 || (row > 32 && row < 48)) {
            activeText = textXPLSV;
            scene.add(textXPLSV);
            scene.remove(textToTheBeat);
		} else {
            activeText = textToTheBeat;
            scene.remove(textXPLSV);
            scene.add(textToTheBeat);
		}
       
        activeText.scale.set(textScale, textScale, textScale);

        activeTextChildren = activeText.children;
        activeTextNumChildren = activeTextChildren.length;

        for(var i = 0; i < activeTextNumChildren; i++) {
            var child = activeTextChildren[i];
            child.position.set(rrand(0, range), rrand(0, range), rrand(0, range));
        }

        // TODO vertically downwards moving text

        // camera!

        camera.position.set(eyeX, eyeY, eyeZ);
        camera.lookAt(cameraTarget);
    }

    
    function updateInfo() {
        info.innerHTML = 'order ' + songOrder + ': ' + songPattern + '/' + songRow;
    }

    function rrand(min, max) {
        return (Math.random() + min) * (max - min);
    }

	function onResize() {
		var w = window.innerWidth,
			h = window.innerHeight;

		renderer.setSize(w, h);
	}

	function render() {
		requestAnimationFrame( render );

        var t = Date.now() * 0.001;

        updateEffect(t, t - lastRenderTime, songOrder, songPattern, songRow);
        lastRenderTime = t;

        //camera.position.set(s * Math.sin(t), s * Math.cos(t/2), s * Math.cos(t));
        //camera.lookAt(cameraTarget);

		renderer.render( scene, camera );
	}

})();
