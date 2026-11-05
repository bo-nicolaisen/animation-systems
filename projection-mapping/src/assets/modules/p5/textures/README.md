# Animating with code

Each file in this folder is a small p5.js sketch that runs as a texture on the projection mapping plane. Open one, change a number, save, and watch what happens. The page reloads by itself and keeps your calibration, but it goes back to the test pattern, so press the sketch's key again.

## Getting started

From the `projection-mapping` folder, run:

```
npm install
npm run dev
```

Then open the address it prints, and use the keyboard:

| Key | What it does |
| --- | --- |
| `1`-`9` | Show a sketch |
| `0` | Show the test pattern, for calibrating |
| `A` | Turn the microphone on or off |
| `F` | Choose an audio file to play on a loop, or stop the one that is playing |
| `H` | Hide or show the corner handles |
| `R` | Reset the corners |

## The sketches

Each one starts with an explanation and a **TRY THIS** list, and has its settings as constants at the top.

| Key | File | What it shows |
| --- | --- | --- |
| `1` | [noise-flow.js](noise-flow.js) | Perlin noise, and trails made by not clearing the canvas fully |
| `2` | [pulse-grid.js](pulse-grid.js) | A sine wave delayed by the distance from the middle |
| `3` | [color-waves.js](color-waves.js) | Adding two sine waves together, used for color |
| `4` | [sine-ribbons.js](sine-ribbons.js) | **Start here.** Amplitude, speed and phase, and how sine and cosine relate |
| `5` | [lissajous.js](lissajous.js) | Circles from cosine and sine, and knots from different frequencies |
| `6` | [particle-fountain.js](particle-fountain.js) | A particle system: velocity, gravity, lifetime, removal |
| `7` | [fft-spectrum.js](fft-spectrum.js) | What the sound contains, split into frequencies |

Sketches 4, 5 and 6 react to sound when the microphone or an audio file is on, and run fine without it. Sketches 1, 2 and 3 don't use sound yet, which makes them good ones to try the recipe below on.

## Make a sketch react to sound

It takes three small changes:

```js
// 1. At the top of the file. Sketches in this folder all use this same path.
import { readAudio } from '../audio-input.js';

p.draw = () => {

	// 2. Once, at the top of draw.
	const sound = readAudio();

	// 3. Add it to any number that controls how the sketch looks.
	const size = 100 + sound.bass * 300;

	p.circle( p.width / 2, p.height / 2, size );

};
```

Press `A` and allow the microphone, or press `F` and choose an audio file. The sketch works the same with both. While there is no sound on, every value is 0, so `size` simply stays at 100.

Saving a file reloads the page, which also stops the sound, so press `A` or `F` again. A file is the easiest way to work on a sketch, as the same song gives you the same sound to test with every time.

| Value | What it is |
| --- | --- |
| `sound.level` | Overall loudness, 0 to 1 |
| `sound.bass` | 20-250 Hz, 0 to 1. Kick drums and bass lines |
| `sound.mid` | 250-2000 Hz, 0 to 1. Voices and most instruments |
| `sound.treble` | 2000-10000 Hz, 0 to 1. Hi-hats and other sharp sounds |
| `sound.beat` | `true` for one frame when the bass suddenly jumps |
| `sound.band( lowHz, highHz )` | Your own range, 0 to 1. Use sketch `7` to find one |

### Patterns worth knowing

**Add to a base value.** Write `BASE + sound.bass * AMOUNT` and not just `sound.bass * AMOUNT`. Otherwise the sketch disappears when the room goes quiet.

**Turn a beat into a pulse.** A beat lasts one frame, which is too short to see. Set a value when it happens, and let it fade (see [lissajous.js](lissajous.js)):

```js
if ( sound.beat ) kick = 1;
kick *= 0.92;
```

**Use a beat as a trigger.** Start something once per beat, like the firework in [particle-fountain.js](particle-fountain.js), or switch to the next color in a list.

**Don't multiply time by sound.** `Math.sin( time * sound.bass )` will jump around wildly. The longer the sketch has been running, the larger `time` is, so even a small change in the sound means a big jump in the angle. To change the speed of something, keep your own angle and add to it each frame:

```js
angle += 0.02 + sound.bass * 0.1;
const y = Math.sin( angle ) * 100;
```

## Make your own

1. Copy a sketch to a new file in this folder, and give it a new `name`.
2. Import it in [index.js](index.js) and add it to the `textures` array. Its place in the array decides its number key.
3. Press that key.

Good to know for projection:

- Black means no light. A dark background and a few bright shapes look far better on a wall than a full, bright image.
- The canvas is stretched to fit the 4 corners. Give it the same proportions as your surface, or circles won't be round.
- The mouse doesn't work in a sketch, because its canvas is hidden. Use time, math or sound instead.

## If the sound doesn't work

- **Nothing moves:** Check that the browser has permission to use the microphone, using the icon in the address bar. Sketch `7` shows the current state.
- **The bars barely move, or never drop:** Change `MICROPHONE_DECIBELS` or `FILE_DECIBELS` in [audio-input.js](../audio-input.js). Every room, microphone and song is different.
- **It works on `localhost`, but not from another computer:** Browsers only allow the microphone on `localhost` and `https://` addresses. Audio files work on both.
- **A file won't play:** The browser can't read that format. MP3 and WAV are the safest choices. The browser console shows the error.

## Going further

- [The Coding Train: Angles and rotation](https://thecodingtrain.com/tracks/the-nature-of-code-2/noc/3-angles/1-angles-and-rotation), video lessons on angles
- [The Nature of Code](https://natureofcode.com/) by Daniel Shiffman, a free book. See the chapters on [oscillation](https://natureofcode.com/oscillation/) and [particle systems](https://natureofcode.com/particles/)
- [p5.js reference](https://p5js.org/reference/)
