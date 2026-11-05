import * as THREE from 'three';

// Draws a texture designed to reveal mapping errors:
// - The checkerboard shows foreshortening: squares should shrink towards the far
//   edge, and every grid line should stay straight.
// - The red diagonals run corner to corner and cross at the image center. They
//   should stay straight with no kink, which the plain 2-triangle version fails.
// - The corner labels show if the image has been flipped or rotated.
export function createTestPatternTexture( size = 512, squares = 8 ) {

	const canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;

	const ctx = canvas.getContext( '2d' );
	const squareSize = size / squares;

	// Dark gray instead of black, so the edges of the plane stay visible against
	// the black background.
	for ( let row = 0; row < squares; row ++ ) {

		for ( let col = 0; col < squares; col ++ ) {

			ctx.fillStyle = ( row + col ) % 2 === 0 ? '#f0f0f0' : '#404040';
			ctx.fillRect( col * squareSize, row * squareSize, squareSize, squareSize );

		}

	}

	ctx.strokeStyle = '#ff2020';
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo( 0, 0 );
	ctx.lineTo( size, size );
	ctx.moveTo( size, 0 );
	ctx.lineTo( 0, size );
	ctx.stroke();

	ctx.font = `bold ${ squareSize * 0.5 }px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = '#0060ff';

	const near = squareSize * 0.5;
	const far = size - near;

	// Shifted one square in from the corners so the labels don't sit on the diagonals.
	ctx.fillText( 'TL', near + squareSize, near );
	ctx.fillText( 'TR', far - squareSize, near );
	ctx.fillText( 'BL', near + squareSize, far );
	ctx.fillText( 'BR', far - squareSize, far );

	return new THREE.CanvasTexture( canvas );

}
