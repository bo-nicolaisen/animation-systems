// A homography is a 3 x 3 matrix that maps one flat quad onto another, keeping
// straight lines straight. A point (x, y) is mapped like this:
//
//   [x']   [h11 h12 h13]   [x]
//   [y'] = [h21 h22 h23] * [y]        final position = (x' / w, y' / w)
//   [w ]   [h31 h32 h33]   [1]
//
// The division by w is what creates perspective foreshortening, since w changes
// across the surface. No three.js import is needed here, so the math can be
// tested on its own.

// Calculates the homography that moves the 4 `src` corners onto the 4 `dst` corners.
// Both are arrays of { x, y } in the same corner order.
// Returns the 9 matrix values row by row: [ h11, h12, h13, h21, h22, h23, h31, h32, h33 ].
export function computeHomography( src, dst ) {

	// A homography only has 8 unknowns, not 9: multiplying the whole matrix by a
	// number gives the same result after the division by w. So we can fix h33 = 1.
	//
	// Writing out the mapping above for one corner gives:
	//   x' = ( h11 x + h12 y + h13 ) / ( h31 x + h32 y + 1 )
	//   y' = ( h21 x + h22 y + h23 ) / ( h31 x + h32 y + 1 )
	//
	// Multiplying both sides by the denominator and moving things around gives two
	// equations that are linear in the unknowns:
	//   h11 x + h12 y + h13                     - h31 x x' - h32 y x' = x'
	//                       h21 x + h22 y + h23 - h31 x y' - h32 y y' = y'
	//
	// 4 corners x 2 equations = 8 equations for 8 unknowns, so the corners
	// determine the matrix exactly. Each row below is one equation.
	const A = [];
	const b = [];

	for ( let i = 0; i < 4; i ++ ) {

		const { x, y } = src[ i ];
		const { x: dx, y: dy } = dst[ i ];

		A.push( [ x, y, 1, 0, 0, 0, - x * dx, - y * dx ] );
		b.push( dx );

		A.push( [ 0, 0, 0, x, y, 1, - x * dy, - y * dy ] );
		b.push( dy );

	}

	return [ ...solveLinearSystem( A, b ), 1 ];

}

// Puts a homography into a mesh's matrix, so the standard three.js shaders apply it
// and we can keep using any built-in material.
//
// three.js matrices are 4 x 4 because they also handle z. The homography's rows
// for x, y and w go into the rows for x, y and w, and its third column goes into
// the fourth column, which is the one that is multiplied by the vertex's w = 1.
// Row and column 3 stay as they would in an identity matrix, leaving z alone:
//
//   [h11 h12  0  h13]
//   [h21 h22  0  h23]
//   [ 0   0   1   0 ]
//   [h31 h32  0  h33]
//
// This only works with an orthographic camera. Its projection leaves w untouched,
// so our w reaches gl_Position and the GPU does the division for us. It also
// interpolates the UVs with perspective correction based on the same w, which is
// why every pixel is correct with only 4 vertices.
//
// The corners must form a convex shape. Otherwise w can reach zero or go negative
// inside the quad and the image breaks. Use isValidQuad to check this first.
export function applyHomography( mesh, h ) {

	mesh.matrix.set(
		h[ 0 ], h[ 1 ], 0, h[ 2 ],
		h[ 3 ], h[ 4 ], 0, h[ 5 ],
		0, 0, 1, 0,
		h[ 6 ], h[ 7 ], 0, h[ 8 ]
	);

	// Stop three.js from rebuilding the matrix from position/rotation/scale, which
	// would overwrite ours on every frame.
	mesh.matrixAutoUpdate = false;

	// With auto update off, three.js doesn't know the matrix has changed and would
	// keep rendering with the old matrixWorld. This must be set on every change.
	mesh.matrixWorldNeedsUpdate = true;

	// The frustum culling check assumes an ordinary matrix with no w row, so it could
	// wrongly decide the mesh is off screen and skip it.
	mesh.frustumCulled = false;

}

// A corner may not get closer to a straight line through its neighbors than this.
// The value is a cross product of two edges, in the corners' own units. For window
// fractions, 0.001 corresponds to two edges of about 3% of the window at a right angle.
const MIN_CORNER_TURN = 0.001;

// Checks that 4 corners, ordered top left, top right, bottom left, bottom right with
// Y pointing up, form a shape the homography can show correctly.
//
// Walking around the outside of a convex shape, you turn the same way at every corner.
// The cross product of two edges in a row tells us which way we turned, so:
// - A dent (concave) or crossed edges give a mix of left and right turns.
// - A mirrored shape turns the opposite way at all corners. Its back would face the
//   camera, and the plane would disappear.
// - Corners on one line or on top of each other barely turn at all.
//
// The unwarped plane walks clockwise in the order below, which with Y up means every
// cross product is negative. Scaling X and Y doesn't change the signs, so this works
// for both pixels and window fractions.
export function isValidQuad( corners ) {

	// The perimeter order, which is not the array order: the array goes back and
	// forth across the plane, row by row, like the vertices.
	const [ topLeft, topRight, bottomLeft, bottomRight ] = corners;
	const perimeter = [ topLeft, topRight, bottomRight, bottomLeft ];

	return perimeter.every( ( corner, i ) => {

		const next = perimeter[ ( i + 1 ) % 4 ];
		const afterNext = perimeter[ ( i + 2 ) % 4 ];

		const cross = ( next.x - corner.x ) * ( afterNext.y - next.y )
			- ( next.y - corner.y ) * ( afterNext.x - next.x );

		return cross < - MIN_CORNER_TURN;

	} );

}

// Solves A * x = b with Gaussian elimination. A is an array of rows.
function solveLinearSystem( A, b ) {

	const n = b.length;

	// Work on one combined table, with b as an extra column on each row.
	const rows = A.map( ( row, i ) => [ ...row, b[ i ] ] );

	// Forward elimination: clear everything below the diagonal, column by column.
	for ( let col = 0; col < n; col ++ ) {

		// Pivoting: use the remaining row with the largest value in this column.
		// We have to divide by this value, and dividing by a tiny number magnifies
		// rounding errors. Pixel coordinates make the values vary a lot in size.
		let pivot = col;

		for ( let row = col + 1; row < n; row ++ ) {

			if ( Math.abs( rows[ row ][ col ] ) > Math.abs( rows[ pivot ][ col ] ) ) pivot = row;

		}

		[ rows[ col ], rows[ pivot ] ] = [ rows[ pivot ], rows[ col ] ];

		// No usable pivot means there is no single solution. This happens when 3 or
		// more corners lie on one line, or when corners sit on top of each other.
		if ( Math.abs( rows[ col ][ col ] ) < 1e-10 ) {

			throw new Error( 'computeHomography: the corners do not form a valid quad' );

		}

		for ( let row = col + 1; row < n; row ++ ) {

			const factor = rows[ row ][ col ] / rows[ col ][ col ];

			for ( let c = col; c <= n; c ++ ) rows[ row ][ c ] -= factor * rows[ col ][ c ];

		}

	}

	// Back substitution: the last row now has one unknown left. Solve it, then
	// work upwards, using the values we already know on each row.
	const x = new Array( n );

	for ( let row = n - 1; row >= 0; row -- ) {

		let sum = rows[ row ][ n ];

		for ( let c = row + 1; c < n; c ++ ) sum -= rows[ row ][ c ] * x[ c ];

		x[ row ] = sum / rows[ row ][ row ];

	}

	return x;

}
