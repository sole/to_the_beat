import os
import urllib.request, urllib.parse, urllib.error
import re
import shutil

# compress JS

files = [
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

SRC = '../src/'
DST = '../build/'
COMPRESSED_JS = 'main_compressed.js'
outfile = DST + 'js/' + COMPRESSED_JS

# For some reason the audio of the "closurified" files gets borked,
# even under the "benign" whitespace only optimisation setting
# So disabling compression for now.
USE_CLOSURE = False

js_dir = DST + 'js/'
if not os.path.exists(js_dir):
	os.makedirs(js_dir)


# ~~~

def get_response(data):
	post_data = urllib.parse.urlencode(data)
	request = urllib.request.Request('http://closure-compiler.appspot.com/compile', post_data.encode())
	response = urllib.request.urlopen( request )

	compressed = response.read()

	return compressed

string = ''

for filename in files:
	with open(SRC + 'js/' + filename, 'r') as f:
		string += f.read() + "\n"

if USE_CLOSURE:
	print('Files collected')

	print('Calling Closure API service...')

	values = {
		#'compilation_level': 'SIMPLE_OPTIMIZATIONS',
		'compilation_level': 'WHITESPACE_ONLY',
		'output_format': 'text',
		'output_info': 'compiled_code',
		'js_code': string
	}

	compressed_js = get_response( values )

	print('compressed size', len( compressed_js) )

	if len(compressed_js) == 1:
		print('BOOOH ERRORS FOUND!!!')
		values['output_info'] = 'errors'

		errors = get_response( values )
		print(errors)

	else:

		with open(outfile, 'wb') as f:
			f.write(compressed_js)
else:
	with open(outfile, 'wb') as f:
		f.write(bytes(string, 'UTF-8'))

# massage index.html
index_contents = open(SRC + 'index.html').read()

unpacked_re = re.compile( r'<!--unpacked-->(.*?)<!--/unpacked-->', re.MULTILINE | re.DOTALL )
index_contents = unpacked_re.sub( '<script type="text/javascript" src="js/main_compressed.js"></script>', index_contents )

#libs_re = re.compile( r'src="libs/', re.MULTILINE | re.DOTALL )
#index_contents = libs_re.sub( 'src="http://sole.github.com/cdn/', index_contents )

with open( DST + 'index.html', 'wb' ) as f:
	f.write( bytes(index_contents, 'UTF-8') )
	
# css
css_dir = DST + 'css/'
if not os.path.exists(css_dir):
	os.makedirs(css_dir)
shutil.copy( SRC + 'css/style.css', css_dir + 'style.css' )
	

