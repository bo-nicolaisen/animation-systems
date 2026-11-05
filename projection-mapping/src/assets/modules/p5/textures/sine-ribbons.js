import { readAudio } from '../audio-input.js';

// SINE RIBBONS: animating with a sine wave.
//
// Math.sin( angle ) swings smoothly between -1 and 1 forever, which makes it the most
// useful animation tool there is. Nearly every use of it has this shape:
//
//   value = center + Math.sin( time * speed + offset ) * amplitude
//
//   center     the value it swings around
//   amplitude  how far it swings to each side
//   speed      how fast it swings
//   offset     where in the swing it starts (also called the phase)
//
// The offset is the interesting one. If every dot had the same offset, they would all
// go up and down together. When each dot is a little bit behind its neighbor, a travelling
// wave appears, even though each dot only ever moves straight up and down.
//
// TRY THIS
// - Set DOT_OFFSET to 0 and the wave turns into dots moving as one.
// - Make SPEED negative. Which way does the wave travel now?
// - Add a second, faster sine to `y`: it's how you get less regular movement.
// - Replace the size calculation with a fixed number. Then the ribbons look much flatter.

const RIBBONS = 12;
const DOTS_PER_RIBBON = 64;

const SPEED = 1.2;
const AMPLITUDE = 140;

// How far each dot is behind the dot before it. A larger number gives shorter waves.
const DOT_OFFSET = 0.14;

// How far each ribbon is behind the ribbon before it.
const RIBBON_OFFSET = 0.3;

// How much the sound adds on top of the values above.
const AUDIO_AMPLITUDE = 220;
const AUDIO_DOT_SIZE = 18;

export default {
	name: 'Sine ribbons',
	sketch( p ) {

		p.setup = () => {

			p.createCanvas( 1024, 1024 );
			p.colorMode( p.HSB, 360, 100, 100 );
			p.noStroke();

		};

		p.draw = () => {

			p.background( 0 );

			// Seconds since the start. Time from the clock runs at the same speed on every
			// computer, while p.frameCount depends on how fast the computer is.
			const time = p.millis() * 0.001;

			// All of these are 0 while there is no sound on, so the sketch works without it.
			const sound = readAudio();
			const amplitude = AMPLITUDE + sound.bass * AUDIO_AMPLITUDE;
			const extraSize = sound.treble * AUDIO_DOT_SIZE;

			const dotSpacing = p.width / ( DOTS_PER_RIBBON - 1 );

			for ( let ribbon = 0; ribbon < RIBBONS; ribbon ++ ) {

				// Spreads the ribbons evenly from top to bottom.
				const centerY = p.map( ribbon, 0, RIBBONS - 1, p.height * 0.25, p.height * 0.75 );
				const ribbonOffset = ribbon * RIBBON_OFFSET;

				p.fill( 180 + ribbon * 10, 70, 100 );

				for ( let dot = 0; dot < DOTS_PER_RIBBON; dot ++ ) {

					// The formula from the top of the file.
					const angle = time * SPEED + dot * DOT_OFFSET + ribbonOffset;
					const y = centerY + Math.sin( angle ) * amplitude;

					// Cosine is the same wave as sine, a quarter of a swing ahead. It tells which
					// way the sine is moving and how fast. Here the dots are largest when moving
					// down through the center and smallest on the way back up, which makes the
					// ribbons look like they are twisting in 3D.
					const size = 5 + ( Math.cos( angle ) + 1 ) * 5 + extraSize;

					p.circle( dot * dotSpacing, y, size );

				}

			}

		};

	}
};
