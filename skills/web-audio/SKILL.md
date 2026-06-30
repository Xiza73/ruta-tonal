---
name: web-audio
description: >
  Web Audio API patterns: AudioContext lifecycle, mic capture, AnalyserNode, and real-time
  pitch detection with pitchy. Covers the autoplay-policy, feedback, and buffer-size gotchas.
  Trigger: When working with AudioContext, AnalyserNode, microphone input, tuners, or pitch/frequency detection in the browser.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Capturing microphone input in the browser
- Reading waveform/frequency data with `AnalyserNode` (visualizers, meters)
- Real-time **pitch detection** (tuners, vocal/instrument apps) with `pitchy`
- Anything touching `AudioContext` lifecycle

## Gotchas that bite first

- **AudioContext starts `suspended`** (autoplay policy). It only produces/processes
  sound after `resume()` is called **inside a user gesture** (click/tap).
- **Reuse ONE `AudioContext`** for the whole app — browsers cap how many you can create.
- **Don't connect the mic analyser to `destination`** → that's a feedback loop. Analysing
  doesn't require connecting to output.
- **`pitchy` v4 is ESM-only** (no `require`).
- **`findPitch` input length must equal `detector.inputLength`** — size the `Float32Array` to `analyser.fftSize`.
- Time-domain (`getFloatTimeDomainData`) is for **pitch**; frequency-domain (`getByteFrequencyData`) is for **spectrum visuals**.

## Critical Patterns

### AudioContext — create once, resume on a gesture

```js
const ctx = new AudioContext(); // 'suspended' until a user gesture
startButton.addEventListener('click', () => ctx.resume());
console.log(ctx.sampleRate); // e.g. 48000 — needed by findPitch
```

### Microphone → AnalyserNode

```js
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = ctx.createMediaStreamSource(stream);
const analyser = ctx.createAnalyser();
analyser.fftSize = 2048;        // time-domain samples available
source.connect(analyser);       // NO connect to ctx.destination (avoids feedback)
```

### Real-time pitch detection (pitchy)

```js
import { PitchDetector } from "pitchy";

const detector = PitchDetector.forFloat32Array(analyser.fftSize);
const input = new Float32Array(detector.inputLength); // must match inputLength

function tick() {
  analyser.getFloatTimeDomainData(input);
  const [pitch, clarity] = detector.findPitch(input, ctx.sampleRate);
  if (clarity > 0.9) {          // filter noise / unvoiced frames
    onPitch(pitch);             // pitch in Hz
  }
  requestAnimationFrame(tick);
}
tick();
```

### Hz → musical note (e.g. for a tuner)

```js
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function noteFromPitch(freq) {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440)); // A4 = 440 Hz = MIDI 69
  return NOTES[(midi % 12 + 12) % 12] + (Math.floor(midi / 12) - 1);
}
// cents off pitch: 1200 * Math.log2(freq / refFreq)
```

### Spectrum data (visualizers)

```js
const bins = new Uint8Array(analyser.frequencyBinCount); // = fftSize / 2
analyser.getByteFrequencyData(bins); // 0..255 per bin, draw in a rAF loop
```

### Cleanup — stop the mic and free the context

```js
stream.getTracks().forEach(t => t.stop());
source.disconnect();
await ctx.close();
```

## Commands

```bash
npm install pitchy   # v4+, ESM-only
```

## Resources

- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- AnalyserNode: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
- pitchy (McLeod Pitch Method): https://github.com/ianprime0509/pitchy
