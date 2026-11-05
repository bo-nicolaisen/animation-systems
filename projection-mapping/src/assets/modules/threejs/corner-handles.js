import { isValidQuad } from './homography.js';

const HANDLE_SIZE = 22;

// Creates one draggable handle per corner.
//
// The handles are plain DOM elements on top of the canvas, not three.js objects. The
// browser then does the hit testing, so we don't need raycasting, and they stay the
// same size on screen no matter how the image is warped. They also don't depend on
// the texture or the renderer, so changing either later won't affect them.
//
// `corners` is changed directly, so the caller always sees the current positions.
// Corners are fractions of the window measured from its middle, with Y pointing up.
// - onChange is called on every accepted move, to update the image.
// - onDragEnd is called when a corner is let go, to save the result.
export function createCornerHandles( { corners, onChange, onDragEnd } ) {

	const handles = corners.map( ( _, index ) => {

		const handle = document.createElement( 'div' );

		// Styled here since style.css isn't imported in this project. The light fill and
		// dark ring keep the handle visible on both bright and dark content.
		// touch-action: none stops touch screens from scrolling instead of dragging.
		Object.assign( handle.style, {
			position: 'fixed',
			width: `${ HANDLE_SIZE }px`,
			height: `${ HANDLE_SIZE }px`,
			transform: 'translate(-50%, -50%)',
			boxSizing: 'border-box',
			borderRadius: '50%',
			border: '2px solid #fff',
			outline: '2px solid #000',
			background: 'rgba(255, 0, 200, 0.5)',
			cursor: 'grab',
			touchAction: 'none'
		} );

		// The distance between the pointer and the corner when it was grabbed. Without
		// it, the corner would jump to the pointer, up to half a handle away, on the
		// first move. That matters when calibrating down to the pixel.
		const grabOffset = { x: 0, y: 0 };

		handle.addEventListener( 'pointerdown', ( event ) => {

			// Pointer capture keeps sending events to this handle even if a fast drag
			// leaves it behind, or the pointer leaves the window.
			handle.setPointerCapture( event.pointerId );

			const pointer = pointerToFraction( event );
			grabOffset.x = corners[ index ].x - pointer.x;
			grabOffset.y = corners[ index ].y - pointer.y;

		} );

		handle.addEventListener( 'pointermove', ( event ) => {

			if ( ! handle.hasPointerCapture( event.pointerId ) ) return;

			const pointer = pointerToFraction( event );

			// Stay inside the window. A corner dropped outside could never be grabbed again.
			const candidate = {
				x: clamp( pointer.x + grabOffset.x, - 0.5, 0.5 ),
				y: clamp( pointer.y + grabOffset.y, - 0.5, 0.5 )
			};

			// Test the move on a copy, and ignore it if the shape would break. The handle
			// then stays at its last valid position until the pointer returns to where
			// the shape is valid again.
			const test = [ ...corners ];
			test[ index ] = candidate;

			if ( ! isValidQuad( test ) ) return;

			corners[ index ] = candidate;
			update();
			onChange();

		} );

		// Fires both when the pointer is released and when the browser cancels the drag,
		// so a cancelled drag is saved too.
		handle.addEventListener( 'lostpointercapture', () => onDragEnd() );

		document.body.appendChild( handle );

		return handle;

	} );

	// Moves the handles to the current corners. The canvas fills the window, so a
	// fraction converts directly to a screen position. Screen Y points down, so it flips.
	function update() {

		handles.forEach( ( handle, index ) => {

			const { x, y } = corners[ index ];

			handle.style.left = `${ ( x + 0.5 ) * window.innerWidth }px`;
			handle.style.top = `${ ( 0.5 - y ) * window.innerHeight }px`;

		} );

	}

	function setVisible( visible ) {

		handles.forEach( ( handle ) => {

			handle.style.display = visible ? 'block' : 'none';

		} );

	}

	update();

	return { update, setVisible };

}

// The opposite of the conversion in update().
function pointerToFraction( event ) {

	return {
		x: event.clientX / window.innerWidth - 0.5,
		y: 0.5 - event.clientY / window.innerHeight
	};

}

function clamp( value, min, max ) {

	return Math.min( Math.max( value, min ), max );

}
