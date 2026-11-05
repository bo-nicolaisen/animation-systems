import { readAudio } from '../audio-input.js';

// PARTICLE FOUNTAIN: a simple particle system.
//
// A particle is only a few numbers: where it is, how fast it is moving and how long it has
// left to live. Every particle follows the same few rules each frame:
//
//   1. Forces change the velocity:    vy += GRAVITY
//   2. The velocity changes position: x += vx, y += vy
//   3. It gets older:                 life -= ...
//   4. When life runs out, it is removed.
//
// That's the whole system. Rain, sparks, smoke and fireworks are this same loop with other
// numbers. Complex-looking behavior comes from many simple things, not from complex code.
//
// To send a particle off in a direction at a given speed, cosine and sine split the speed
// into its x and y parts. See spawn() below. The same two lines place points on a circle
// in lissajous.js.
//
// With sound on, the bass pushes the fountain higher, and each beat sets off a firework.
//
// TRY THIS
// - Set GRAVITY to 0 or to a negative number. What does it look like now?
// - Multiply vx and vy by 0.98 each frame. This is air resistance.
// - Set SPREAD to Math.PI and the fountain turns into an explosion.
// - Remove the blendMode( p.ADD ) line and see what happens where particles overlap.
// - Make a particle pull towards the middle of the canvas instead of downwards.

const SPAWN_PER_FRAME = 4;
const LIFETIME_FRAMES = 180;
const GRAVITY = 0.15;
const LAUNCH_SPEED = 12;

// How far particles can stray from the aiming direction, in radians. Math.PI is half a turn.
const SPREAD = 0.15;

// How much of its speed a particle keeps when it bounces on the floor.
const BOUNCE = 0.6;

const BURST_PARTICLES = 80;
const BURST_SPEED = 6;

// How much the sound adds to the launch speed.
const AUDIO_LAUNCH_SPEED = 6;

export default {
	name: 'Particle fountain',
	sketch( p ) {

		const particles = [];

		// Adds one particle, flying from x, y in the direction of `angle`.
		function spawn( x, y, angle, speed, hue ) {

			particles.push( {
				x,
				y,
				vx: Math.cos( angle ) * speed,
				vy: Math.sin( angle ) * speed,
				life: 1,
				hue
			} );

		}

		p.setup = () => {

			p.createCanvas( 1024, 1024 );
			p.colorMode( p.HSB, 360, 100, 100, 1 );
			p.noStroke();

		};

		p.draw = () => {

			// ADD mode makes overlapping particles add up towards white, like real light does.
			// In this mode black adds nothing, so the background has to be drawn in the
			// normal mode or the old frame would stay on the canvas.
			p.blendMode( p.BLEND );
			p.background( 0 );
			p.blendMode( p.ADD );

			const time = p.millis() * 0.001;
			const sound = readAudio();

			// SPAWNING
			// Sine waves move the fountain and aim it, so it never quite repeats itself.
			const fountainX = p.width / 2 + Math.sin( time * 0.7 ) * 250;

			// In p5, Y points down, so straight up is -90 degrees, or -HALF_PI.
			const aim = - p.HALF_PI + Math.sin( time * 1.3 ) * 0.3;
			const speed = LAUNCH_SPEED + sound.bass * AUDIO_LAUNCH_SPEED;
			const fountainHue = ( time * 30 ) % 360;

			for ( let i = 0; i < SPAWN_PER_FRAME; i ++ ) {

				const angle = aim + p.random( - SPREAD, SPREAD );

				spawn( fountainX, p.height, angle, speed * p.random( 0.8, 1.1 ), fountainHue );

			}

			// A firework: the same spawn, with the angles spread around a full circle.
			if ( sound.beat ) {

				const burstX = p.random( p.width * 0.2, p.width * 0.8 );
				const burstY = p.random( p.height * 0.2, p.height * 0.5 );
				const burstHue = p.random( 360 );

				for ( let i = 0; i < BURST_PARTICLES; i ++ ) {

					spawn( burstX, burstY, i / BURST_PARTICLES * p.TWO_PI, BURST_SPEED, burstHue );

				}

			}

			// UPDATING AND DRAWING
			// Going backwards, because removing an item moves all the later ones down one
			// place. Going forwards, the loop would then skip the particle after a removed one.
			for ( let i = particles.length - 1; i >= 0; i -- ) {

				const particle = particles[ i ];

				particle.vy += GRAVITY;
				particle.x += particle.vx;
				particle.y += particle.vy;
				particle.life -= 1 / LIFETIME_FRAMES;

				// Bounce. Moving it back up to the floor keeps it from getting stuck below.
				if ( particle.y > p.height ) {

					particle.y = p.height;
					particle.vy *= - BOUNCE;

				}

				if ( particle.life <= 0 ) {

					particles.splice( i, 1 );
					continue;

				}

				// Life goes from 1 to 0, so it works directly as both opacity and a size factor.
				p.fill( particle.hue, 80, 100, particle.life );
				p.circle( particle.x, particle.y, 4 + particle.life * 10 );

			}

		};

	}
};
