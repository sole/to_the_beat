var fs = require('fs');


var files = [
	'libs/AudioContextMonkeyPatch.js',
	'libs/Detector.js',
	'libs/AudioDetector.js',
	'libs/Sorollet.js',
	'libs/Sorollet-legacy.js',
	'libs/THREE.r58.min.js',
	'libs/Tween.js',
	'data/song.js',
	'data/gfx.js',
	'main.js'
]

var SRC = '../src/'
var DST = '../build/'
var COMPRESSED_JS = 'main_compressed.js'
var outfile = DST + 'js/' + COMPRESSED_JS
var js_dir = DST + 'js/'

if(!fs.existsSync(js_dir)) {
	fs.mkdirSync(js_dir);
}

var str = '';

files.forEach(function(f) {
	var contents = fs.readFileSync(SRC + 'js/' + f);
	str += contents;
});

fs.writeFileSync(outfile, str);

// 'massage' index.html
var index_contents = String(fs.readFileSync(SRC + 'index.html'));

var unpacked_re = /<!--unpacked-->((\s|.)*?)<!--\/unpacked-->/mg;

index_contents = index_contents.replace( unpacked_re, '<script type="text/javascript" src="js/main_compressed.js"></script>' );

fs.writeFileSync( DST + 'index.html', index_contents );

