import p5 from 'p5';
import * as THREE from 'three';

// p5's friendly errors help while writing sketches, so they stay on in dev. In a build,
// the check it runs at each sketch start would parse the whole bundle, and it reports
// names used by three.js as conflicts.
p5.disableFriendlyErrors = import.meta.env.PROD;

// Runs a p5 sketch on a hidden canvas and shows that canvas as a three.js texture.
//
// The sketch is an instance-mode function, see textures/index.js for the format.
//
// Returns a promise, because p5 doesn't start right away: it can wait for the page
// to load, and setup can be async. The canvas only exists once setup has finished.
// Resolves to:
// - texture: the CanvasTexture. It stays up to date by itself.
// - dispose: stops the sketch and frees the texture.
export function createP5Texture( sketch ) {

	return new Promise( ( resolve, reject ) => {

		// Hidden, since only the warped copy on the plane should be seen.
		const container = document.createElement( 'div' );
		container.style.display = 'none';

		new p5( ( p ) => {

			sketch( p );

			const { setup, draw, createCanvas } = p;

			// One canvas pixel = one texture pixel, or a HiDPI screen would double the
			// size of the upload for no visible gain. This can't simply be set before the
			// sketch's setup, because every createCanvas starts over at the screen's
			// density, and setting it after setup would clear what setup has drawn.
			p.createCanvas = ( ...args ) => {

				const renderer = createCanvas.apply( p, args );
				p.pixelDensity( 1 );
				return renderer;

			};

			let texture;

			p.setup = async () => {

				try {

					await setup?.call( p );

				} catch ( error ) {

					p.remove();
					container.remove();
					reject( error );

					// p5 only skips the draw loop if setup throws.
					throw error;

				}

				texture = new THREE.CanvasTexture( p.canvas );

				resolve( {
					texture,
					dispose() {

						p.remove();
						texture.dispose();
						container.remove();

					}
				} );

			};

			// Upload after each draw and not on each three.js frame. This way a sketch that
			// uses frameRate() or noLoop() only costs an upload when something has changed.
			if ( draw ) {

				p.draw = () => {

					draw.call( p );
					texture.needsUpdate = true;

				};

			}

		}, container );

		document.body.appendChild( container );

	} );

}
