import { readAudio } from '../audio-input.js';

// FFT SPECTRUM: seeing what the sound is made of.
//
// Press A for the microphone or F for an audio file. Low sounds are on the left and high
// sounds on the right. Hum and whistle, or play a song, and watch which bars move. Use this
// sketch to find out which frequency range to use in your own sketches. See audio-input.js
// for what the FFT does.
//
// Why are the bars not spread evenly in Hz? Our ears hear in ratios: going up one octave
// means doubling the frequency, both from 100 to 200 Hz and from 5000 to 10000 Hz. So each
// bar here covers a little more Hz than the bar before it, which makes every octave the
// same width. This is called a logarithmic scale. With even steps, nearly all of the music
// would end up in the leftmost bars.
//
// At the far left, some neighboring bars show the same height. The FFT can't separate
// frequencies closer than about 23 Hz, so they are reading the same bin.
//
// TRY THIS
// - Set MIN_HZ and MAX_HZ to 300 and 3000 to zoom in on the human voice.
// - Set BARS to 8, and then 128.
// - Set PEAK_FALL to 0, so the peaks stay at the loudest moment so far.
// - Draw the bars as a ring: use the circle formula from lissajous.js for their position.

const BARS = 32;
const MIN_HZ = 40;
const MAX_HZ = 12000;

// How far the peak markers fall each frame, as a fraction of the full height.
const PEAK_FALL = 0.005;

const LABELS = [ 100, 1000, 5000 ];

// What to show until there is any sound to draw.
const MESSAGES = {
	off: 'Press A for the microphone or F for an audio file',
	starting: 'Starting the sound. The browser may ask for permission',
	error: 'Could not start the sound, see the browser console'
};

export default {
	name: 'FFT spectrum',
	sketch( p ) {

		const peaks = new Array( BARS ).fill( 0 );

		// The frequency at a position from 0 (the left edge) to 1 (the right edge).
		// Each step multiplies the frequency by the same amount, as described above.
		const hzAt = ( position ) => MIN_HZ * Math.pow( MAX_HZ / MIN_HZ, position );

		// The opposite: which position a frequency has.
		const positionOf = ( hz ) => Math.log( hz / MIN_HZ ) / Math.log( MAX_HZ / MIN_HZ );

		p.setup = () => {

			p.createCanvas( 1024, 1024 );
			p.colorMode( p.HSB, 360, 100, 100 );
			p.noStroke();
			p.textSize( 28 );

		};

		p.draw = () => {

			p.background( 0 );

			const sound = readAudio();

			if ( sound.status !== 'on' ) {

				p.fill( 0, 0, 100 );
				p.textAlign( p.CENTER, p.CENTER );
				p.text( MESSAGES[ sound.status ], p.width / 2, p.height / 2 );
				return;

			}

			const barWidth = p.width / BARS;

			// Leaves room for the labels at the bottom.
			const floor = p.height - 50;

			for ( let bar = 0; bar < BARS; bar ++ ) {

				const value = sound.band( hzAt( bar / BARS ), hzAt( ( bar + 1 ) / BARS ) );

				// A peak jumps up at once and falls slowly, which is easier to read than the
				// bars alone. Math.max picks whichever is higher: the sound or the falling peak.
				peaks[ bar ] = Math.max( value, peaks[ bar ] - PEAK_FALL );

				const x = bar * barWidth;

				// From red at the low end to violet at the high end.
				const hue = p.map( bar, 0, BARS, 0, 280 );

				p.fill( hue, 80, 100 );
				p.rect( x + 2, floor - value * floor, barWidth - 4, value * floor );

				p.fill( hue, 30, 100 );
				p.rect( x + 2, floor - peaks[ bar ] * floor - 6, barWidth - 4, 6 );

			}

			p.fill( 0, 0, 70 );
			p.textAlign( p.CENTER, p.BOTTOM );

			for ( const hz of LABELS ) {

				const label = hz < 1000 ? `${ hz } Hz` : `${ hz / 1000 } kHz`;

				p.text( label, positionOf( hz ) * p.width, p.height - 8 );

			}

		};

	}
};
