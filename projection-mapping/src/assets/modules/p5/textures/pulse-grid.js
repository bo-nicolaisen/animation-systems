const CELLS = 12;

// Squares pulsing in a wave from the middle. Hard edges in straight rows make it easy
// to see if the mapping bends anything.
export default {
	name: 'Pulse grid',
	sketch( p ) {

		p.setup = () => {

			p.createCanvas( 1024, 1024 );
			p.rectMode( p.CENTER );
			p.noStroke();
			p.fill( 255 );

		};

		p.draw = () => {

			p.background( 0 );

			const cellSize = p.width / CELLS;

			for ( let row = 0; row < CELLS; row ++ ) {

				for ( let col = 0; col < CELLS; col ++ ) {

					const x = ( col + 0.5 ) * cellSize;
					const y = ( row + 0.5 ) * cellSize;
					const distance = p.dist( x, y, p.width / 2, p.height / 2 );

					// A sine wave going from 0 to 1, delayed by the distance from the middle.
					const pulse = ( Math.sin( p.millis() * 0.003 - distance * 0.012 ) + 1 ) / 2;

					p.square( x, y, cellSize * pulse );

				}

			}

		};

	}
};
