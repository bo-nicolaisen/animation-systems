const PARTICLE_COUNT = 800;

// Particles following a slowly changing noise field, leaving trails behind them.
export default {
	name: 'Noise flow',
	sketch( p ) {

		const particles = [];

		p.setup = () => {

			p.createCanvas( 1024, 1024 );
			p.background( 0 );
			p.stroke( 120, 220, 255 );
			p.strokeWeight( 2 );

			for ( let i = 0; i < PARTICLE_COUNT; i ++ ) {

				particles.push( { x: p.random( p.width ), y: p.random( p.height ) } );

			}

		};

		p.draw = () => {

			// A nearly transparent black instead of a full clear, so that the
			// previous frames fade out slowly. This is what makes the trails.
			p.background( 0, 24 );

			for ( const particle of particles ) {

				const angle = p.noise( particle.x * 0.003, particle.y * 0.003, p.frameCount * 0.002 ) * p.TWO_PI * 2;
				const x = particle.x + Math.cos( angle ) * 2;
				const y = particle.y + Math.sin( angle ) * 2;

				p.line( particle.x, particle.y, x, y );

				particle.x = x;
				particle.y = y;

				// A new random spot when leaving the canvas. Coming back in from the opposite
				// edge doesn't work: the noise is different there, and if it points back out,
				// the particle gets stuck jumping between the two edges.
				if ( x < 0 || x > p.width || y < 0 || y > p.height ) {

					particle.x = p.random( p.width );
					particle.y = p.random( p.height );

				}

			}

		};

	}
};
