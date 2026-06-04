# The Drift

**Live site: [fiddlydigital.github.io/TheDrift](https://fiddlydigital.github.io/TheDrift/)**

A generative ambient music system. Multiple loops, each a single synthesized note on its own irrational length, drift endlessly in and out of phase — so the music never repeats.

---

## Getting started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

The dev server runs at `http://localhost:5173` by default.

---

## Production build

```bash
npm run build
```

Output goes to `dist/`. The bundle is:

- **Minified** via Terser (2-pass, console stripped)
- **Obfuscated** via `javascript-obfuscator` (hex identifiers, string array shuffling)
- ~496 KB JS / ~131 KB gzip

Deploy the contents of `dist/` to any static host (Netlify, Vercel, GitHub Pages, S3, etc.).

---

## Features

### Sound engine
- **Synthesized instruments** — all audio generated in the browser via the Web Audio API, no samples required:
  - Felt Piano, Bells/Glasswork, Marimba, Harp, Handpan, Kalimba, Woodblock, Frame Drum
  - Strings, Choir, Flute, Drone (sustained/bowed)
  - Tabla, Balafon, Udu, Singing Bowl (world percussion)
  - 8-bit Pulse Lead, Blip, Triangle Bass (chiptune)
- **Ensembles** — curated instrument pools: Felt Piano, Glasswork, Handpan, Percussion, World, 8-Bit, Strings, Choir, Orchestra (random mix)
- **Generated reverb** — exponentially-decaying noise convolver, length tied to the Space dial
- **Binaural beats** — Delta / Theta / Alpha / Beta bands, isolated L/R via channel merger (use headphones)
- **Ambience bed** — synthesized layers: Rain, Vinyl, Wind, Fire, Static, Tape hiss, White / Pink / Brown noise

### Generative system
- **Unequal loop lengths** — irrational period nudges ensure loops never fall into clean ratios, producing ever-changing phase relationships
- **Seeded RNG** — every setup is driven by a reproducible seed; share links encode the full state in the URL hash
- **Autonomous evolve** — voices slowly re-pitch to neighbouring scale tones, nudge their loop length and stereo drift over long listens
- **Journey mode** — autonomous mood migration, crossfading between harmonic palettes on a configurable time scale

### Moods (harmonic palettes)
Reflection · Drift · Dusk · Elegy · Suspended · Curious · Pensive · Open · Vast

### Controls
| Dial | What it does |
|---|---|
| Density | Number of simultaneous loops (2–12) |
| Tempo | Scales every loop length (slow ↔ fast) |
| Drift | Length spread — how unequal the loops are |
| Register | Pitch range (deep bass ↔ glassy high) |
| Space | Reverb tail length |
| Color | Timbral brightness (felt ↔ bright) |
| Bloom | FM shimmer — bell-like sidebands that collide at high values |
| Stutter | Tape-stutter probability per strike |
| Evolve | Rate of autonomous field mutation |
| Journey | Autonomous mood migration speed |
| Glue | Output compression (transparent ↔ pumping) |

### Curated scenes
One-tap presets that configure the whole instrument: Deep Rest · Stillness · Inner Sun · Tide · Clear Mind · Quickening · Arcade Dusk · Procession · Reverie

### Programmed journeys
Timed arcs that travel between scenes with smooth crossfades: Into Sleep · Deep Focus · Unwind

### Meditation tools
- **Session timer** — timed sit with opening/closing singing-bowl bells and configurable interval bells
- **Sleep timer** — auto-fade to silence after a set duration
- **Wake / sunrise timer** — starts silent and rises slowly from inaudible to full
- **Breath guide** — animated ring paced to Coherent (5.5/min), Box (4-4-4-4), or 4-7-8 breathing patterns
- **Tuning** — A4 reference: 415 Hz (baroque) · 432 Hz (natural) · 440 Hz (concert) · 444 Hz (C=528 Hz) · 448 Hz

### Visualization
- **Orbital mandala** — full-screen immersive view; each loop is a slowly-rotating hand that blooms on strike, with connecting threads that light up when loops align. Mood-tinted (each palette has its own colour field), audio-reactive (breathes and brightens with the live output)
- **Panel view** — stacked bar display showing loop lengths, playhead positions, stereo drift plot, and instrument glyphs

### Other
- **Export to WAV** — renders 1–5 minutes offline at 44.1 kHz stereo (all loops, reverb, ambience, and binaural beats printed)
- **Personal library** — save and recall favourite configurations
- **Share link** — encodes the full state (all dials + seed) in the URL hash
- **PWA** — installable, works offline, lock-screen media controls via Media Session API

---

## Project structure

```
src/
  engine/
    constants.js        # MOODS, INSTRUMENTS, ENSEMBLES, BINAURAL data
    utils.js            # RNG, midiToFreq, clamp, noteName
    AmbientEngine.js    # Audio engine class
    index.js            # Singleton export
  ui/
    labels.js           # Dial label functions
    constants.js        # UI constants (scenes, journeys, textures…)
    persistence.js      # URL hash + localStorage read/write
    glyphs.jsx          # Canvas instrument glyphs + DOM legend
    icons.jsx           # SVG icon components
    canvas.js           # Canvas renderer factory (mandala + panel)
    components/
      Slider.jsx
      Dial.jsx
    App.jsx             # Main React component
  main.jsx              # Entry point + service worker registration
  styles.css

public/
  icons/
  manifest.webmanifest
  sw.js

project/                # Original design prototype (reference only)
```

---

## Tech stack

- **React 18** — UI
- **Web Audio API** — all synthesis and effects (no external audio libs)
- **Vite 5** — build tooling
- **Terser** — minification
- **javascript-obfuscator** — bundle obfuscation

---

## License

MIT
