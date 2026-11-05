import { readAudio } from '../audio-input.js';

// LISSAJOUS: drawing shapes with sine and cosine together.
//
// Use cosine for x and sine for y with the same angle, and you get a point on a circle:
//
//   x = Math.cos( angle ) * radius
//   y = Math.sin( angle ) * radius
//
// This is worth remembering, as it is how you place anything in a ring or send it in a
// given direction. Now multiply the angle by different numbers on each axis:
//
//   x = Math.cos( angle * a ) * radius
//   y = Math.sin( angle * b ) * radius
//
// With a = 2 and b = 3, x swings back and forth twice in the time y swings three times, and
// the point traces a knot instead of a circle. These curves are called Lissajous figures.
// The dots show the moving point itself, and the line shows the whole path it follows.
//
// This sketch also shows the "kick" trick for reacting to beats. A beat only lasts for one
// frame, which is too short to see. So a beat sets `kick` to 1, and every frame shrinks it
// a little, which turns the single frame into a short, soft pulse. It works on anything.
//
// TRY THIS
// - Add [ 1, 1 ] to RATIOS. Where does the circle come from, and why does it flatten?
// - Set PHASE_SPEED to 0 to stop the curve turning.
// - Change KICK_FADE to 0.7 and then 0.98, and compare the two pulses.
// - Set DOTS to 1 and follow one single point.

const RADIUS = 340;
const CURVE_POINTS = 600;
const DOTS = 12;

// The [ a, b ] pairs to go through, and how long each one is shown.
const RATIOS = [ [ 1, 2 ], [ 2, 3 ], [ 3, 4 ], [ 3, 5 ], [ 4, 5 ], [ 5, 6 ] ];
const SECONDS_PER_RATIO = 8;

// Pushes x and y out of step over time, which makes the curve look like it is turning.
const PHASE_SPEED = 0.3;

// How much of the kick is left after each frame. Has to stay below 1 to ever fade out.
const KICK_FADE = 0.92;

// How much the sound adds on top of the values above.
const AUDIO_KICK_RADIUS = 100;
const AUDIO_MID_RADIUS = 60;
const AUDIO_LINE_WEIGHT = 10;

export default {
	name: 'Lissajous',
	sketch( p ) {

		let kick = 0;

		p.setup = () => {

			p.createCanvas( 1024, 1024 );
			p.colorMode( p.HSB, 360, 100, 100 );

		};

		p.draw = () => {

			p.background( 0 );

			const time = p.millis() * 0.001;

			const sound = readAudio();

			if ( sound.beat ) kick = 1;

			kick *= KICK_FADE;

			const radius = RADIUS + kick * AUDIO_KICK_RADIUS + sound.mid * AUDIO_MID_RADIUS;

			// Counts 0, 1, 2... through the list, and % starts over when it reaches the end.
			const [ a, b ] = RATIOS[ Math.floor( time / SECONDS_PER_RATIO ) % RATIOS.length ];
			const phase = time * PHASE_SPEED;

			// Used for both the line and the dots, as they follow the same formula.
			const pointAt = ( angle ) => ( {
				x: p.width / 2 + Math.cos( angle * a + phase ) * radius,
				y: p.height / 2 + Math.sin( angle * b ) * radius
			} );

			const hue = ( time * 20 ) % 360;

			// THE LINE: the whole path, from one full turn of the angle.
			p.noFill();
			p.stroke( hue, 60, 100 );
			p.strokeWeight( 2 + sound.treble * AUDIO_LINE_WEIGHT );

			p.beginShape();

			for ( let i = 0; i < CURVE_POINTS; i ++ ) {

				const point = pointAt( i / CURVE_POINTS * p.TWO_PI );

				p.vertex( point.x, point.y );

			}

			p.endShape( p.CLOSE );

			// THE DOTS: evenly spaced around the turn, all moving along the path.
			p.noStroke();
			p.fill( ( hue + 180 ) % 360, 40, 100 );

			for ( let i = 0; i < DOTS; i ++ ) {

				const point = pointAt( time * 0.5 + i / DOTS * p.TWO_PI );

				p.circle( point.x, point.y, 18 + kick * 30 );

			}

		};

	}
};
