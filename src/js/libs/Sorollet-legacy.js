// Something to be able to use old (~2008) data with recent Sorollet versions
SOROLLET.Legacy = {};
SOROLLET.Legacy.loadSongFromArray = function(player, song) {
	var i = 0, j,
		size = song.length,
		voice,
		M_PI_2 = Math.PI / 2.0;

	player.voices = [];
	player.patterns = [];
	player.orderList = [];

	while(i < size) { // -1?

		// bpm, speed, num channels
		player.setBPM(song[i]); i++;
		// legacy // player.setSpeed(song[i]);
		i++;
		var numVoices = song[i]; i++;

		// legacy
		//sorollet_song.frames_per_second = sorollet_song.bpm * 0.4f;
		//sorollet_song.seconds_per_row = sorollet_song.speed / sorollet_song.frames_per_second;

		// Init voices
		for(j = 0; j < numVoices; j++) {
			voice = new SOROLLET.Voice();
			voice.setSamplingRate(player.samplingRate);
			player.voices.push( voice );
		}

		// Order list
		var numOrders = song[i]; i++;

		for(j = 0; j < numOrders; j++) {
			player.orderList.push(song[i]); i++;
		}

		// Patterns
		var numPatterns = song[i]; i++;

		for(j = 0; j < numPatterns; j++) {
			var numRows = song[i]; i++;
			var pattern = new SOROLLET.Pattern(numVoices, numRows);

			for(var row = 0; row < numRows; row++) {

				for(var col = 0; col < numVoices; col++) {

					var cell = pattern.getCell(row, col);
					cell.note = song[i]; i++;
					cell.volume = charToFloat(song[i], 0.0, 1.0); i++;

				}

			}

			player.patterns.push(pattern);
		}

		// Synths config
		for(j = 0; j < numVoices; j++) {
			
			voice = player.voices[j];

			var oscillatorMix = charToFloat(song[i], 0.0, 1.0); i++; // TODO to wave1Volume, wave2Volume
			voice.currentVolume = charToFloat(song[i], 0.0, 1.0); i++;

			// Osc1
			voice.wave1Function = enumToWave(song[i]); i++;
			voice.wave1Phase = charToFloat(song[i], -M_PI_2, M_PI_2); i++;
			voice.wave1Octave = song[i]; i++;

			// Osc2
			voice.wave2Function = enumToWave(song[i]); i++;
			voice.wave2Phase = charToFloat(song[i], -M_PI_2, M_PI_2); i++;
			voice.wave2Octave = song[i]; i++;

			// Noise level
			voice.noiseAmount = charToFloat(song[i], 0.0, 1.0); i++;

			
			// Begins section of "massively not implemented features"
			// Filter
			// type
			// sorollet_synths[j].filter_type = song[i]; i++;
			i++;

			// frequency
			// sorollet_synths[j].filter_frequency = charToFloat(song[i], 22.0f, 300.0);
			i++;
			// resonance
			// sorollet_synths[j].filter_resonance = charToFloat(song[i], 0.0, 0.2f);
			i++;

			// Saturate
			// sorollet_synths[j].saturate_active = song[i];
			i++;
			//sorollet_synths[j].saturate_max = charToFloat(song[i], 0.0, 1.0);
			i++;

			// EQ
			// sorollet_synths[j].eq_active = song[i];
			i++;
			// sorollet_synths[j].eq_state.lg = charToFloat(song[i], 0.0, 10.0);
			i++;
			// sorollet_synths[j].eq_state.mg = charToFloat(song[i], 0.0, 10.0);
			i++;
			// sorollet_synths[j].eq_state.hg = charToFloat(song[i], 0.0, 10.0);
			i++;

			// Bass boost
			// sorollet_synths[j].bass_boost_active = song[i];
			i++;
			// sorollet_synths[j].bass_boost_multiplier = charToFloat(song[i], 0.0, 8.0f);
			i++;


			// Envelopes
			var attack_time;
			var decay_time;
			var sustain_level;
			var release_time;
			var env;

			// Amp envelope
			// sorollet_synths[j].amp_envelope_active = song[i];
			i++;
			attack_time = charToFloat(song[i], 0.0, 16.0); i++;
			decay_time = charToFloat(song[i], 0.0, 16.0); i++;
			sustain_level = charToFloat(song[i], 0.0, 1.0); i++;
			release_time = charToFloat(song[i], 0.0, 16.0); i++;

			// sorollet_adsr_set_values(&sorollet_synths[j].amp_envelope, attack_time, decay_time, sustain_level, release_time);
			env = voice.volumeEnvelope;
			env.setAttack(attack_time);
			env.setDecay(decay_time);
			env.setSustainLevel(sustain_level);
			env.setRelease(release_time);

			// Pitch envelope
			// sorollet_synths[j].pitch_envelope_active = song[i];
			i++;
			
			attack_time = charToFloat(song[i], 0.0, 16.0); i++;
			decay_time = charToFloat(song[i], 0.0, 16.0); i++;
			sustain_level = charToFloat(song[i], 0.0, 1.0); i++;
			release_time = charToFloat(song[i], 0.0, 16.0); i++;

			//sorollet_adsr_set_values(&sorollet_synths[j].pitch_envelope, attack_time, decay_time, sustain_level, release_time);
			env = voice.pitchEnvelope;
			env.setAttack(attack_time);
			env.setDecay(decay_time);
			env.setSustainLevel(sustain_level);
			env.setRelease(release_time);


			// Filter frequency envelope
			// TODO not implemented
			// sorollet_synths[j].filter_freq_envelope_active = song[i];
			i++;
			// attack_time = charToFloat(song[i], 0.0, 16.0);
			i++;
			// decay_time = charToFloat(song[i], 0.0, 16.0);
			i++;
			// sustain_level = charToFloat(song[i], 0.0, 1.0);
			i++;
			// release_time = charToFloat(song[i], 0.0, 16.0);
			i++;

			//sorollet_adsr_set_values(&sorollet_synths[j].filter_freq_envelope, attack_time, decay_time, sustain_level, release_time);

			// Precalc filter parameters if the envelope is not used
			/*if(!sorollet_synths[j].filter_freq_envelope_active)
			{
				sorollet_synth_prepare_filter(&sorollet_synths[j], sorollet_synths[j].filter_frequency);
			}*/

		}

		return 0;
	}
	return -1;

	function charToFloat(value, outMin, outMax) {
		var tmp_value = value / 255.0;
		var out = tmp_value * (outMax - outMin) + outMin;
		return out;
	}

	function enumToWave(value) {
		switch(value) {
			case 1: return SOROLLET.Voice.prototype.getTriangleBuffer;
			case 2: return SOROLLET.Voice.prototype.getSquareBuffer;
			case 3: return SOROLLET.Voice.prototype.getSawtoothBuffer;
		}
		return SOROLLET.Voice.prototype.getSineBuffer;
	}
	
};
