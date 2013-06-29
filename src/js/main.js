(function() {
	'use strict';

	var DEVELOPING = true,
		SAMPLING_RATE = 48000,
		BUFFER_SIZE = 4096,
		MAIN_ORDER = 2,
		ENDING_ORDER = 6;


	var rendering = false,
		renderer,
		scene,
		root,
		rootRotationTween,
		camera, cameraTarget = new THREE.Vector3(),
		cameraTween,
		cameraTargetTween,
		rotation = 0, // for _the_ effect
		rotationX, rotationY,
		boom = 0,
		textScale = 0.5,
		activeText,
		lastRenderTime = 0,
		textXPLSV,
		textToTheBeat,
		grid,
		tris,
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
			if(!rendering) {
				rendering = true;
				render();
			}
		}, false);

		sorolletPlayer.addEventListener('patternChanged', function(ev) {
			songPattern = ev.pattern;
			updateInfo();
		}, false);

		sorolletPlayer.addEventListener('rowChanged', function(ev) {
			songRow = ev.row;
			updateInfo();
		}, false);

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

		THREE.GeometryUtils.center(lineGeometry);

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
		var gridThinMaterial = new THREE.LineDashedMaterial({ linewidth: 1, color: 0xF1EFB4, dashSize: 2, gapSize: 10, opacity: 0.25, transparent: true, blending: THREE.AdditiveBlending });
		var gridThickMaterial = new THREE.LineBasicMaterial({ linewidth: 1, color: 0xF1EFB4, opacity: 0.25, transparent: true, blending: THREE.AdditiveBlending });
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

		grid.materialTween = new TWEEN.Tween({ opacity: 0 })
			.onUpdate(function() {
				gridThinMaterial.opacity = this.opacity;
				gridThickMaterial.opacity = this.opacity;
			})
			.easing(TWEEN.Easing.Exponential.InOut)
			.to({ opacity: 0.4 }, 500);

		return grid;
	}

	function makeTris(length, separation, radius) {

		var geom = new THREE.Geometry();
		var mat = new THREE.LineBasicMaterial({ color: 0x79D1EA, transparent: true, blending: THREE.AdditiveBlending, linewidth: 2, opacity: 0.5 });
		var num = length / separation,
			startX = -length / 2,
			x = startX,
			angle = 0;

		for(var i = 0; i < num; i++) {
			geom.vertices.push(new THREE.Vector3(x, radius * Math.sin(angle), radius * Math.cos(angle)));
			x += separation;
			angle = x * 5;
		}

		THREE.GeometryUtils.center(geom);

		var line = new THREE.Line(geom, mat, THREE.LinePieces);

		return line;
	}


	function graphicsSetup() {
		scene = new THREE.Scene();
		//scene.fog = new THREE.Fog(0x383733, 300, 600);

		root = new THREE.Object3D();
		rootRotationTween = new TWEEN.Tween(root.rotation).easing(TWEEN.Easing.Exponential.In);
		scene.add(root);

		camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
		cameraTween = new TWEEN.Tween(camera.position).easing(TWEEN.Easing.Exponential.InOut);
		cameraTargetTween = new TWEEN.Tween(cameraTarget).easing(TWEEN.Easing.Circular.Out);

		var p = 100;
		camera.position.set(p, p, p);
		camera.lookAt(cameraTarget);

        var numCopies = 10;
		var s = 5;

        textXPLSV = makeText(gfx.text_xplsv, numCopies);
		textXPLSV.scale.set(s,s,s);
		scene.add(textXPLSV);
		activeText = textXPLSV;

		textToTheBeat = makeText(gfx.text_to_the_beat, numCopies);
		textToTheBeat.scale.set(s, s, s);

		grid = makeGrid(1000);

		tris = makeTris(5600, 0.5, 85);
		root.add(tris);

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

		// Event listeners setup

		// Check for notes when the row changes, not on every frame
		sorolletPlayer.addEventListener('rowChanged', function(e) {
			var order = e.order,
				row = e.row,
				r;
			var thePattern = sorolletPlayer.patterns[sorolletPlayer.orderList[order]];
			var theCell = thePattern.getCell(row, 0);
			var bdNote = theCell.note;

			if(bdNote !== null && bdNote === 48) {
				boom += 5;
				textScale += 0.5;

				if(order < MAIN_ORDER) {
					r = 20;
					cameraTween.stop();
					cameraTween.to({
						x: rrand(-r*2, r*2),
						y: rrand(-r, r),
						z: camera.position.z + 0.025
					}, 200).start();
				}

			}

			if(order < MAIN_ORDER) {

				if(row < 16 || (row > 32 && row < 48)) {
					switchText(true);
				} else {
					switchText(false);
				}

			} else {

				if(row % 4 === 0 || bdNote && bdNote === 48) {

					r = 300;

					cameraTween.stop()
						.easing(TWEEN.Easing.Exponential.Out)
						.to({
							x: rrand(-r, r),
							y: rrand(-r, r),
							z: rrand(r / 2, r)
						}, 400)
						.start();

				}

				if(row % 8 === 0) {

					cameraTargetTween
						.stop()
						.to({
							x: rrand(-r, r),
							y: rrand(-5, 5),
							z: 10 + 5 * Math.sin(Date.now() * 0.001)
						}, 1000)
						.start();

					switchText( (activeText !== textXPLSV) );

				}

				if(row % 8 === 0) {

					var rot = Math.PI * 0.05;

					rootRotationTween
						.stop()
						.to({
							x: root.rotation.x + rrand(-rot, rot),
							z: root.rotation.z + rrand(-rot, rot)
						}, 500)
						.start();

				}
			
			}
		
		}, false);

		// also check for some more things on order changes
		sorolletPlayer.addEventListener('orderChanged', function(e) {
			var order = e.order;
			if(order >= MAIN_ORDER && order < ENDING_ORDER + 2) {
				root.add(grid);
				grid.materialTween.start();
			} else {
				root.remove(grid);
			}

		}, false);

		window.addEventListener('keyup', onKeyUp, false);

		// Finally start playing!
		// what was that thing that didn't quite work on Chrome if this was done too early due to some GC thingy? TODO check that out!
		jsAudioNode.connect( audioContext.destination );
		sorolletPlayer.play();
	
	}

	function onKeyUp(e) {
		
		var code = e.keyCode,
			newOrder = -1,
			numOrders = sorolletPlayer.orderList.length;

		if(code === 37) {
			
			// left == rewind
			newOrder = songOrder - 1;
			if(newOrder < 0) {
				newOrder = numOrders - 1;
			}

		} else if(code === 39) {

			// right
			newOrder = songOrder + 1;
			if(newOrder >= numOrders) {
				newOrder = 0;
			}

		}

		if(newOrder > -1) {
			sorolletPlayer.jumpToOrder(newOrder, songRow);
		}
	}

	function updateCamera(time, deltaTime, order, pattern, row) {

		var cameraFOV = 45;
		
		if(order >= MAIN_ORDER) {
			cameraFOV = 110 + 40*Math.sin(time*0.05);
		}

		camera.fov = cameraFOV;
		camera.updateProjectionMatrix();
		camera.lookAt(cameraTarget);

	}

	function updateEffect(time, deltaTime, order, pattern, row) {
		
		// Text
		var tScale, activeTextChildren, activeTextNumChildren, range = 0.06;

		if(order < MAIN_ORDER) {
			tScale = textScale + rrand(0, 0.1);
			var elapsedRows = (order * 64 + row);
			range += 0.8 * (1 - elapsedRows / 128.0);
		} else {
			tScale = 80;
		}

		activeText.scale.set(tScale, tScale, tScale);

		activeTextChildren = activeText.children;
		activeTextNumChildren = activeTextChildren.length;

		for(var i = 0; i < activeTextNumChildren; i++) {
			var child = activeTextChildren[i];
			child.position.set(rrand(-range, range), rrand(-range, range), rrand(-range, range));
		}

		// TODO vertically downwards moving text

		updateCamera(time, deltaTime, order, pattern, row);

	}

	function switchText(xplsv) {
		if(xplsv) {
			activeText = textXPLSV;
			root.remove(textToTheBeat);
		} else {
			activeText = textToTheBeat;
			root.remove(textXPLSV);
		}
		root.add(activeText);
	}


	function updateInfo() {
		info.innerHTML = 'order ' + songOrder + ': ' + songPattern + '/' + songRow + 
			'<br />cam x=' + camera.position.x.toFixed(2) + ' y=' + camera.position.y.toFixed(2) + ' z= ' + camera.position.z.toFixed(2) +
			'<br />target x=' + cameraTarget.x.toFixed(2) + ' y=' + cameraTarget.y.toFixed(2) + ' z= ' + cameraTarget.z.toFixed(2) ;

	}

	function rrand(min, max) {
		return min + Math.random() * (max - min);
	}

	function onResize() {
		var w = window.innerWidth,
			h = window.innerHeight;

		renderer.setSize(w, h);
	}

	function render() {
		requestAnimationFrame( render );

		var t = Date.now() * 0.001;

		TWEEN.update();

		updateEffect(t, t - lastRenderTime, songOrder, songPattern, songRow);
		lastRenderTime = t;

		renderer.render( scene, camera );
	}

})();
