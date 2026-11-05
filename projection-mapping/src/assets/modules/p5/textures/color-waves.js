const BAND_HEIGHT = 8;

// Horizontal bands of color that drift over the whole surface.
export default {
	name: 'Color waves',
	sketch( p ) {

		p.setup = () => {

			p.createCanvas( 1024, 1024 );
			p.colorMode( p.HSB, 360, 100, 100 );
			p.noStroke();

		};

		p.draw = () => {

			const time = p.millis() * 0.001;

			for ( let y = 0; y < p.height; y += BAND_HEIGHT ) {

				const wave = Math.sin( y * 0.01 + time ) + Math.sin( y * 0.023 - time * 0.7 );

				p.fill( ( 200 + wave * 80 + 360 ) % 360, 80, 90 );
				p.rect( 0, y, p.width, BAND_HEIGHT );

			}

		};

	}
};
