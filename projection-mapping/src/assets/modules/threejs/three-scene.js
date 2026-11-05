import * as THREE from 'three';

import { computeHomography, applyHomography, isValidQuad } from './homography.js';
import { createCornerHandles } from './corner-handles.js';
import { createTestPatternTexture } from './test-pattern.js';
import { createP5Texture } from '../p5/p5-texture.js';
import { toggleMicrophone, toggleAudioFile } from '../p5/audio-input.js';
import { textures } from '../p5/textures/index.js';

// The plane's size before the corner pin. The homography moves its corners to the
// calibrated positions whatever this is, so it has no effect on the result. That is
// also why textures of any size can share the plane.
const PLANE_SIZE = 1024;

// Where the 4 corners of the plane start, before any calibration.
//
// Corners are stored as fractions of the window, measured from its middle: x and y
// both go from -0.5 to 0.5, with Y pointing up. Pixels would tie the calibration to
// one window size. With fractions, the shape follows the window, so it isn't cropped
// when the window shrinks, and it still lines up on a projector after a resize.
//
// The order matches the plane's vertices: top left, top right, bottom left, bottom right.
const DEFAULT_CORNERS = [
	{ x: - 0.25, y: 0.25 },
	{ x: 0.25, y: 0.25 },
	{ x: - 0.25, y: - 0.25 },
	{ x: 0.25, y: - 0.25 }
];

const STORAGE_KEY = 'projection-mapping:corners';

// Returns the saved corners, or the defaults if there are none we can use. Saved data
// can be missing, or damaged, or from an older version of the code, so it is checked
// before use. The try/catch is there because the browser can block localStorage
// completely, and JSON.parse throws on invalid text. Neither should stop the scene.
function loadCorners() {

	try {

		const saved = JSON.parse( localStorage.getItem( STORAGE_KEY ) );

		const isUsable = Array.isArray( saved )
			&& saved.length === 4
			&& saved.every( ( corner ) => Number.isFinite( corner?.x ) && Number.isFinite( corner?.y ) )
			&& isValidQuad( saved );

		if ( isUsable ) return saved;

	} catch ( error ) {

		console.warn( 'Could not load the saved corners:', error );

	}

	return copyDefaultCorners();

}

function saveCorners( corners ) {

	try {

		localStorage.setItem( STORAGE_KEY, JSON.stringify( corners ) );

	} catch ( error ) {

		console.warn( 'Could not save the corners:', error );

	}

}

function clearSavedCorners() {

	try {

		localStorage.removeItem( STORAGE_KEY );

	} catch ( error ) {

		console.warn( 'Could not clear the saved corners:', error );

	}

}

// A copy, so that dragging a corner can never change DEFAULT_CORNERS.
function copyDefaultCorners() {

	return DEFAULT_CORNERS.map( ( corner ) => ( { ...corner } ) );

}

// Wrapped in a function so that importing this module does nothing by itself:
// main.js decides when the scene starts.
export function startScene() {

	const scene = new THREE.Scene();

	// CAMERA
	// Orthographic instead of perspective, for two reasons:
	// 1. A corner pin is a 2D operation on the output image. The camera should
	//    not add any perspective of its own.
	// 2. With the frustum set to the window size in pixels, 1 world unit = 1 CSS
	//    pixel, with (0,0) in the middle of the window. A corner's position in the
	//    scene is then simply its pixel offset, which makes dragging corners with
	//    the mouse easy later on. (The Y axis still points up, as always in three.js.)
	const camera = new THREE.OrthographicCamera(
		- window.innerWidth / 2, window.innerWidth / 2,
		window.innerHeight / 2, - window.innerHeight / 2,
		0.1, 1000
	);

	// The plane sits at z = 0, so the camera just needs to be in front of it.
	// The distance has no effect on the size in an orthographic view.
	camera.position.z = 1;

	// RENDERER
	const renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	// Black background: on a projector, black means "no light", so everything
	// outside the plane stays dark on the wall.
	renderer.setClearColor( 0x000000 );

	// Fixed and full window, so page margins and other content can't offset the
	// output or cause scrollbars. Done here to keep the setup in one file.
	renderer.domElement.style.position = 'fixed';
	renderer.domElement.style.inset = '0';
	document.body.appendChild( renderer.domElement );

	// TEXTURE
	// Settings every texture needs, whether it is the test pattern or a p5 sketch.
	function prepareTexture( texture ) {

		// A canvas stores sRGB colors. Without this line three.js would read them as
		// linear and the image would come out too bright and washed out.
		texture.colorSpace = THREE.SRGBColorSpace;

		// A corner pin squeezes the texture more in one direction than the other, which
		// regular filtering turns into blur. Anisotropic filtering keeps it sharp.
		texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

		return texture;

	}

	// Kept for the whole session, as it is the view used for calibrating.
	const testPatternTexture = prepareTexture( createTestPatternTexture() );

	// MATERIAL
	// The emissive part is what we see: it gives off its own light, so no lights
	// are needed in the scene and the image stays at full brightness, which is
	// what we want when the projector is the actual light source.
	const material = new THREE.MeshStandardMaterial( {

		// emissive (color) x emissiveMap (texture) x emissiveIntensity = final pixel.
		// White x texture x 1 gives us the image's own colors.
		emissive: 0xffffff,
		emissiveMap: testPatternTexture,
		emissiveIntensity: 1,

		// Black base color: the material reflects nothing, so only the emissive
		// part reaches the screen. This also means adding a light later won't
		// change the image.
		color: 0x000000,

		// A sketch can leave areas transparent, but emissiveMap ignores alpha. The alpha
		// is read from `map`, so we assign the same texture here too. Its colors
		// are multiplied by the black base color, so only its alpha has any effect.
		map: testPatternTexture,
		transparent: true

	} );

	// GEOMETRY
	// 1 x 1 segments gives exactly 4 vertices, the 4 corners we want to pin.
	// PlaneGeometry orders them like this in its position attribute:
	//   0 = top left, 1 = top right, 2 = bottom left, 3 = bottom right
	const geometry = new THREE.PlaneGeometry( PLANE_SIZE, PLANE_SIZE, 1, 1 );

	const plane = new THREE.Mesh( geometry, material );
	scene.add( plane );

	// CORNER PIN
	// Moving the 4 vertices directly would give a kink along the diagonal, because
	// each of the 2 triangles interpolates its UVs separately. Instead the vertices
	// stay where they are, and a homography moves them through the mesh's matrix.
	// See homography.js for the math.
	//
	// The source corners are the plane's own corners, in the same order as the targets.
	const sourceCorners = [
		{ x: - PLANE_SIZE / 2, y: PLANE_SIZE / 2 },
		{ x: PLANE_SIZE / 2, y: PLANE_SIZE / 2 },
		{ x: - PLANE_SIZE / 2, y: - PLANE_SIZE / 2 },
		{ x: PLANE_SIZE / 2, y: - PLANE_SIZE / 2 }
	];

	// The current calibration. This array is the only place the corners are stored,
	// and the drag handles change it directly.
	const corners = loadCorners();

	// REFERENCE LINES
	// A check that doesn't depend on the homography: these lines go straight between
	// the target corners and are not affected by the plane's matrix. If the mapping is
	// right, they cover the red diagonals in the test pattern along their whole length,
	// so they are only shown together with the test pattern.
	//
	// 4 empty points just to create the buffer. applyCorners fills in the positions.
	const referenceLines = new THREE.LineSegments(
		new THREE.BufferGeometry().setFromPoints( DEFAULT_CORNERS.map( () => new THREE.Vector2() ) ),

		// The plane is transparent, so three.js draws it after opaque objects and it
		// would cover these lines. Marking them transparent too and raising their
		// renderOrder draws them last, and with no depth test they are always on top.
		new THREE.LineBasicMaterial( { color: 0x00ff00, transparent: true, depthTest: false } )
	);

	referenceLines.renderOrder = 1;

	// The culling check uses a bounding sphere calculated once from the positions,
	// and these positions keep changing.
	referenceLines.frustumCulled = false;

	scene.add( referenceLines );

	// Brings the image in line with `corners`. Everything that changes the corners or the
	// window size ends up here, so there is one single path from calibration to screen.
	function applyCorners() {

		// From window fractions to world units. The camera makes 1 unit = 1 pixel.
		const targetCorners = corners.map( ( corner ) => ( {
			x: corner.x * window.innerWidth,
			y: corner.y * window.innerHeight
		} ) );

		applyHomography( plane, computeHomography( sourceCorners, targetCorners ) );

		const [ topLeft, topRight, bottomLeft, bottomRight ] = targetCorners;

		// The diagonals, as two separate line segments.
		referenceLines.geometry.setFromPoints( [ topLeft, bottomRight, topRight, bottomLeft ] );

	}

	applyCorners();

	// DRAG HANDLES
	const handles = createCornerHandles( {
		corners,
		onChange: applyCorners,

		// Saved when a corner is let go and not during the drag, since a drag can
		// produce hundreds of moves and only the final position matters.
		onDragEnd: () => saveCorners( corners )
	} );

	// SWITCHING TEXTURES
	// The running sketch, or null while the test pattern is showing.
	let activeSketch = null;

	// Starting a sketch takes a moment, and another key can be pressed in the meantime.
	// Each switch gets a number, so a sketch can tell when it is no longer the latest one.
	let latestSwitch = 0;

	function setTexture( texture ) {

		material.map = texture;
		material.emissiveMap = texture;
		referenceLines.visible = texture === testPatternTexture;

	}

	function showTestPattern() {

		latestSwitch ++;

		setTexture( testPatternTexture );

		activeSketch?.dispose();
		activeSketch = null;

	}

	async function showSketch( { name, sketch } ) {

		const thisSwitch = ++ latestSwitch;

		let started;

		try {

			started = await createP5Texture( sketch );

		} catch ( error ) {

			// The current texture stays up. On a projector, that is better than going dark.
			console.error( `Could not start the texture "${ name }":`, error );
			return;

		}

		if ( thisSwitch !== latestSwitch ) {

			started.dispose();
			return;

		}

		// Swapped only now that the new sketch is ready, so there is no black flash.
		setTexture( prepareTexture( started.texture ) );

		activeSketch?.dispose();
		activeSketch = started;

		console.log( `Texture: ${ name }` );

	}

	// KEYBOARD
	// H: hide or show the handles, since they would otherwise be projected onto the wall.
	// R: go back to the default corners and forget the saved calibration.
	// 0: show the test pattern, for calibrating.
	// 1-9: show a p5 texture, in the order of textures/index.js.
	// A: turn the microphone on or off, for the textures that react to sound.
	// F: choose an audio file to play, or stop the one that is playing.
	let handlesVisible = true;

	window.addEventListener( 'keydown', ( event ) => {

		const key = event.key.toLowerCase();

		if ( key === '0' ) {

			showTestPattern();

		} else if ( key >= '1' && key <= '9' ) {

			// Holding a key down repeats it, which would restart the sketch over and over.
			if ( event.repeat ) return;

			const texture = textures[ Number( key ) - 1 ];

			if ( texture ) showSketch( texture );

		} else if ( key === 'h' ) {

			handlesVisible = ! handlesVisible;
			handles.setVisible( handlesVisible );

		} else if ( key === 'a' ) {

			// Holding the key down would switch the microphone on and off repeatedly.
			if ( event.repeat ) return;

			toggleMicrophone();

		} else if ( key === 'f' ) {

			if ( event.repeat ) return;

			toggleAudioFile();

		} else if ( key === 'r' ) {

			// Replace the contents, not the array, because the handles hold on to this array.
			corners.splice( 0, 4, ...copyDefaultCorners() );
			clearSavedCorners();
			applyCorners();
			handles.update();

		}

	} );

	// RESIZE
	// Keep 1 world unit = 1 pixel when the window changes size. The corners are window
	// fractions, so the same fractions now mean new pixel positions: the homography
	// has to be recalculated and the handles moved.
	window.addEventListener( 'resize', () => {

		camera.left = - window.innerWidth / 2;
		camera.right = window.innerWidth / 2;
		camera.top = window.innerHeight / 2;
		camera.bottom = - window.innerHeight / 2;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

		applyCorners();
		handles.update();

	} );

	// RENDER LOOP
	// Redraws every frame, so any change to the corners shows up without further work.
	renderer.setAnimationLoop( () => {

		renderer.render( scene, camera );

	} );

}
