// Listens to the microphone or an audio file, and turns the sound into numbers a sketch
// can animate with.
//
// In a sketch, ask for the numbers once at the top of draw:
//
//   const sound = readAudio();
//
//   sound.level    how loud it is overall, 0 to 1
//   sound.bass     20-250 Hz: kick drums, bass lines. 0 to 1
//   sound.mid      250-2000 Hz: voices, most instruments. 0 to 1
//   sound.treble   2000-10000 Hz: hi-hats, the sharp part of consonants. 0 to 1
//   sound.beat     true on the one frame where the bass suddenly jumps
//   sound.band( lowHz, highHz )   the same kind of number for any range you choose
//   sound.status   'off', 'starting', 'on' or 'error'
//
// While there is no sound on, every number is 0 and beat is false. So a sketch written
// as `SIZE + sound.bass * 100` simply stays at SIZE until someone presses A or F. A sketch
// doesn't need to know where the sound comes from, and only one source runs at a time.
//
// HOW IT WORKS
// Sound reaches the computer as one long list of air pressure values over time. The FFT
// (Fast Fourier Transform) takes a short slice of that list and works out how much of each
// frequency it contains, a bit like the sliders on a mixing desk. The browser's
// AnalyserNode does the math for us and hands back one number per frequency "bin".

// The FFT looks at this many samples at a time, which gives FFT_SIZE / 2 bins. At the usual
// 48000 samples per second, that is 1024 bins of about 23 Hz each. A larger size separates
// low notes better, but looks further back in time, so the visuals lag behind the sound.
// It has to be a power of 2.
const FFT_SIZE = 2048;

// 0 to 1. How much of the previous frame is kept. Low is twitchy, high is smooth but slow.
const SMOOTHING = 0.7;

// The loudness range that is mapped to 0 to 1. A file is much louder than what a microphone
// picks up across a room, so it gets its own range.
//
// Raise min if the numbers don't drop when it is quiet. Lower max if they never get near 1.
// If they stay stuck near 1, raise max: the beat detection needs room to see the bass jump.
const MICROPHONE_DECIBELS = { min: - 85, max: - 25 };
const FILE_DECIBELS = { min: - 85, max: - 10 };

// A beat is when the bass jumps this far above its own recent average, and is above the
// minimum, so that a quiet room can't trigger it. The pause stops one kick drum from counting
// several times.
//
// The jump is a fixed amount and not a percentage. The numbers follow a decibel scale, where
// a kick adds about the same amount whether the music around it is quiet or loud.
const BEAT_JUMP = 0.06;
const BEAT_MIN_BASS = 0.3;
const BEAT_PAUSE_MS = 180;

let status = 'off';

// Where the sound is coming from: 'microphone', 'file' or null.
let source = null;

let context = null;
let analyser = null;
let bins = null;

let stream = null;
let player = null;

let bassAverage = 0;
let lastBeatTime = 0;

// Never added to the page, as it is only used to open the browser's file dialog.
const filePicker = document.createElement( 'input' );
filePicker.type = 'file';
filePicker.accept = 'audio/*';

filePicker.addEventListener( 'change', () => {

	const file = filePicker.files[ 0 ];

	// Cleared so that choosing the same file again later still counts as a change.
	filePicker.value = '';

	if ( file ) startFile( file );

} );

// Turns the microphone on or off. Called from the A key in three-scene.js.
export async function toggleMicrophone() {

	// The permission dialog can be open for a long time. A second press shouldn't start
	// another request in the meantime.
	if ( status === 'starting' ) return;

	if ( source === 'microphone' ) {

		stopAudio();
		return;

	}

	stopAudio();
	status = 'starting';

	try {

		// Made before the wait below, while we are still inside the key press. Browsers
		// only allow audio to start after the user has done something.
		context = new AudioContext();

		// These three settings are made for phone calls. They treat music as noise and
		// flatten the differences in loudness that we want to see.
		stream = await navigator.mediaDevices.getUserMedia( {
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false
			}
		} );

		context.resume();

		// Not connected on to the speakers, so the microphone can't cause feedback.
		startAnalyser( context.createMediaStreamSource( stream ), MICROPHONE_DECIBELS );

		source = 'microphone';
		status = 'on';
		console.log( 'Sound: microphone' );

	} catch ( error ) {

		// Most likely the permission was denied, or there is no microphone. Browsers also
		// only allow microphones on https:// and localhost. The sketches keep running.
		stopAudio();
		status = 'error';
		console.error( 'Could not open the microphone:', error );

	}

}

// Stops the file that is playing, or else lets the user choose one. Called from the F key
// in three-scene.js. Whatever is on keeps running until a file has actually been chosen.
export function toggleAudioFile() {

	if ( status === 'starting' ) return;

	if ( source === 'file' ) {

		stopAudio();
		return;

	}

	filePicker.click();

}

async function startFile( file ) {

	stopAudio();
	status = 'starting';

	try {

		context = new AudioContext();
		context.resume();

		// An <audio> element streams the file, so a long track doesn't have to fit in memory.
		player = new Audio( URL.createObjectURL( file ) );
		player.loop = true;

		startAnalyser( context.createMediaElementSource( player ), FILE_DECIBELS );

		// Once an <audio> element is connected to an AudioContext, its sound goes wherever
		// the context sends it. So the analyser has to pass it on for us to hear it.
		analyser.connect( context.destination );

		await player.play();

		source = 'file';
		status = 'on';
		console.log( `Sound: ${ file.name }` );

	} catch ( error ) {

		// Most likely a format the browser can't play. The sketches keep running.
		stopAudio();
		status = 'error';
		console.error( `Could not play "${ file.name }":`, error );

	}

}

function startAnalyser( input, decibels ) {

	analyser = context.createAnalyser();
	analyser.fftSize = FFT_SIZE;
	analyser.smoothingTimeConstant = SMOOTHING;
	analyser.minDecibels = decibels.min;
	analyser.maxDecibels = decibels.max;

	bins = new Uint8Array( analyser.frequencyBinCount );

	input.connect( analyser );

}

function stopAudio() {

	stream?.getTracks().forEach( ( track ) => track.stop() );

	if ( player ) {

		player.pause();
		URL.revokeObjectURL( player.src );

	}

	context?.close();

	stream = null;
	player = null;
	context = null;
	analyser = null;
	bins = null;
	bassAverage = 0;

	source = null;
	status = 'off';

}

// The average strength of a frequency range, from 0 to 1.
function band( lowHz, highHz ) {

	if ( status !== 'on' ) return 0;

	const hzPerBin = context.sampleRate / FFT_SIZE;
	const lastBin = bins.length - 1;

	const first = Math.min( Math.round( lowHz / hzPerBin ), lastBin );
	const last = Math.min( Math.max( Math.round( highHz / hzPerBin ), first ), lastBin );

	let sum = 0;

	for ( let i = first; i <= last; i ++ ) sum += bins[ i ];

	// Each bin is a byte, from 0 to 255.
	return sum / ( last - first + 1 ) / 255;

}

// Call this once per frame, at the top of draw. Calling it more often would make the beat
// detection see the same frame twice.
export function readAudio() {

	if ( status !== 'on' ) {

		return { status, level: 0, bass: 0, mid: 0, treble: 0, beat: false, band };

	}

	analyser.getByteFrequencyData( bins );

	const bass = band( 20, 250 );
	const mid = band( 250, 2000 );
	const treble = band( 2000, 10000 );

	const now = performance.now();

	const beat = bass - bassAverage > BEAT_JUMP
		&& bass > BEAT_MIN_BASS
		&& now - lastBeatTime > BEAT_PAUSE_MS;

	if ( beat ) lastBeatTime = now;

	// A slow-moving average: each frame moves it 5% of the way towards the current value.
	bassAverage += ( bass - bassAverage ) * 0.05;

	return { status, level: ( bass + mid + treble ) / 3, bass, mid, treble, beat, band };

}
