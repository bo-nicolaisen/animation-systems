// The p5 textures that can be shown on the plane. The position in this array sets the
// number key: the first one is key 1, the second is key 2, and so on up to 9.
// Key 0 is always the test pattern.
//
// To add a texture, make a file in this folder and add it to the array. A texture is a
// name and a normal p5 sketch in instance mode, where every p5 call starts with `p.`:
//
//   export default {
//   	name: 'My texture',
//   	sketch( p ) {
//   		p.setup = () => {
//   			p.createCanvas( 1024, 1024 );
//   		};
//   		p.draw = () => {
//   			p.background( 0 );
//   		};
//   	}
//   };
//
// Good to know when writing one:
// - The whole canvas is stretched to fit the 4 corners, so give it the same aspect ratio
//   as the surface you are mapping onto, or circles won't stay round.
// - Black means "no light" on the projector.
// - Don't call resizeCanvas. three.js can't change the size of an uploaded texture.
// - Mouse input doesn't mean anything here, as the canvas is hidden.
// - A sketch starts over each time you switch to it.
// - To react to sound, see README.md in this folder.
import noiseFlow from './noise-flow.js';
import pulseGrid from './pulse-grid.js';
import colorWaves from './color-waves.js';
import sineRibbons from './sine-ribbons.js';
import lissajous from './lissajous.js';
import particleFountain from './particle-fountain.js';
import fftSpectrum from './fft-spectrum.js';

export const textures = [
	noiseFlow,
	pulseGrid,
	colorWaves,
	sineRibbons,
	lissajous,
	particleFountain,
	fftSpectrum
];
