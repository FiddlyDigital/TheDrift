# The Drift

**Live site: [fiddlydigital.github.io/TheDrift](https://fiddlydigital.github.io/TheDrift/)**

A generative ambient music instrument that runs entirely in the browser. Multiple loops, each a single synthesized note on its own irrational length, drift endlessly in and out of phase — so the music never repeats. All sound is synthesized with the Web Audio API (no samples), there is no server or account, and it works offline as a PWA.

For an exhaustive, non-developer feature description and the problem it solves, see **[PRODUCT.md](./PRODUCT.md)**.

---

## Getting started

**Prerequisites:** Node.js 18+

```bash
npm install        # install dependencies
npm run dev        # dev server with hot reload (http://localhost:5173)
npm run build      # production build -> dist/
npm run preview    # preview the production build
npm test           # run the unit tests (Vitest)
```

---

## Production build

```bash
npm run build
```

Output goes to `dist/`. The bundle is:

- **Minified** via Terser (2-pass, console stripped)
- **No web fonts** — UI uses a system serif/mono stack, so there's no render-blocking font fetch
- ~184 KB JS / ~57 KB gzip

Deploy the contents of `dist/` to any static host. Pushing to `main` runs the
CI/CD pipeline (tests → build → deploy to GitHub Pages).

---

## Features

### Interface
The Drift is **immersive-first**: you land straight in the full-screen mandala and stay there. A floating **dock** at the bottom is the remote for the whole experience (play/pause is the mandala's own centre):

- **Sound** opens the *Sound & tuning* console — a panel that slides in over the mandala (a bottom sheet on mobile) holding the tabbed control groups (Scenes, Voice, Motion, Space, Atmosphere, Mixer, and Atelier when unlocked) plus seed / save / share.
- **Breathe** is a popover to start the breath guide and choose its pattern, pace, audible swell, and (on supported phones) haptic pacing.
- **Feel toggles** — play-along, spatial audio, and entrain-light. On phones these (and About) collapse into a **⋯ More** menu so the dock stays uncluttered.
- **Session / Journey / About** open as calm paper sheets over the field.

The top corner toggles **2D mandala ↔ 3D space** and fullscreen. The chrome auto-hides after a few seconds of stillness and returns on the first move; transient confirmations stack in a single toast queue above the dock; a one-time coachmark orients first-time listeners. A **Midnight palette** toggle in the About sheet swaps the warm-paper surfaces for a sleep-friendly dark theme (the immersive mandala is dark either way).

### Sound engine
- **Synthesized instruments (22)** — all audio generated in the browser via the Web Audio API, no samples:
  - Felt Piano, Bell, Marimba, Harp, Handpan, Kalimba, Woodblock, Frame Drum (struck)
  - Strings, Choir, Flute, Drone (sustained/bowed)
  - Tabla, Balafon, Udu, Singing Bowl (world percussion)
  - 8-bit Pulse Lead, Blip, Triangle Bass (chiptune)
  - Arpeggio, Birdsong, Trill (**Glitch** — multi-note gestures fired per strike)
- **Ensembles (10)** — curated instrument pools: Felt Piano, Glasswork, Handpan, Percussion, World, 8-Bit, Glitch, Strings, Choir, Orchestra (random mix)
- **Generated reverb** — exponentially-decaying noise convolver, length tied to the Space dial
- **Binaural beats** — Delta / Theta / Alpha / Beta / **Gamma (40 Hz, "task anchor")** bands, channel-isolated L/R (use headphones)
- **Ambience bed** — synthesized layers: Rain, Vinyl, Wind, Fire, Static, Tape hiss, White / Pink / Brown noise
- **Master chain** — dry/reverb split → warmth lowpass → compressor (Glue) → automatic loudness leveler → limiter

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

Plus a Mixer (Master, Loops, Ambience, Beat, Glue) and a 3D-audio toggle.

### Curated scenes (11)
One-tap presets that configure the whole instrument, ordered calm → alert:
Deep Rest · Stillness · Tide · Inner Sun · Clear Mind · Reverie · Procession · Arcade Dusk · Daybreak · Quickening · Murmuration

### Programmed journeys (4)
Timed arcs that travel between scenes with smooth crossfades: Into Sleep · Deep Focus · Sunrise · Unwind. An open-ended **Endless Drift** wanders indefinitely.

### Meditation & sleep tools
- **Session timer** — timed sit with opening/closing singing-bowl bells and configurable interval bells
- **Sleep timer** — auto-fade to silence after a set duration
- **Wake / sunrise timer** — starts silent and rises slowly from inaudible to full
- **Breath guide** — animated ring paced to Coherent (5.5/min), Box (4-4-4-4), or 4-7-8 patterns (in both 2D and 3D views), with an optional audible breath swell and **haptic pacing** — a gentle buzz at each phase change, on supported touch devices
- **Tuning** — A4 reference: 415 Hz · 432 Hz · 440 Hz · 444 Hz (C=528) · 448 Hz

### Visualization
- **3D Space** — WebGL orrery; each voice is a glowing orb on a seeded tilted orbit travelling at its loop rate, with comet trails, strike particle bursts, and a central star. Drag (mouse/touch) to rotate, pinch/scroll to zoom.
- **Orbital mandala** — full-screen 2D view; each loop is a rotating hand that blooms on strike, with threads that light when loops align. Mood-tinted and audio-reactive.
- **Panel view** — stacked bars showing loop lengths, playheads, stereo-drift plot, and instrument glyphs.

### Play along (Raindrop)
An optional mode (a toggle in the dock, off by default) that lets you tap the full-screen mandala to drop sound into the field without disturbing the generative flow. **Vertical position sets pitch** (top = high, bottom = low, quantised to the current scale) and **horizontal position sets stereo pan**. A tap drops a single transient note; a **long-press or two-finger touch** drops a short glitch gesture. Each tap rings a ripple at the touch point, and the dropped note borrows the instrument of the nearest-pitched playing voice so it blends in. Notes are one-shots routed through the shared effects chain — the running loops keep going untouched.

### 3D spatial audio
An optional HRTF mode (headphones, off by default) that places each voice's sound where its orb appears in the 3D orrery. In the 3D view the soundstage follows the camera — rotating the orrery rotates the sound field. The orbit geometry is shared between the renderer and the audio engine so picture and sound agree.

### Atelier (hidden expert mode)
Unlocked by triple-tapping the title in the Sound panel. Turns the generator into a hand-authored instrument:
- **Custom harmony** — pick a key (12 roots) and a mode (24 scales, from the diatonic modes through exotic, world, and symmetric scales), and toggle individual scale degrees.
- **Voice loom** — a per-loop editor: set each loop's instrument, note (or "roam"), and length; capture the live field into editable rows; lock voices so they hold while the rest keep drifting.
- **Lab scopes** — an optional (off by default) pair of clinical visualizers tapped off the master output: a scrolling **spectrogram** (frequency × time, so phase-drift, Evolve re-voicing, and Bloom sidebands are all legible) and a stereo **vectorscope** (L × R Lissajous, revealing pan-drift and the 3D-spatial HRTF field). Mood-tinted, dark instrument panels.
- **Web MIDI** — map a controller's knobs/faders to the dials and mixer levels, and buttons/keys to transport (Play/Pause, Start, Stop) and scenes (next/prev, reshuffle), via a MIDI-learn flow. Chromium-based browsers only.

### Other
- **Export to WAV** — renders 1–5 minutes offline at 44.1 kHz stereo (deterministic)
- **Personal library** — save and recall favourite configurations (local)
- **Share link** — encodes the full state (all dials + seed, plus any Atelier scale/voice data) in the URL hash
- **PWA** — installable, works offline, rich lock-screen media controls via the Media Session API (live scene/mood/journey metadata, generated artwork, scene-skip handlers, and a progress scrubber for timed sessions/journeys), screen wake lock while playing, portrait-locked on mobile

---

## Project structure

```
src/
  engine/
    constants.js        # MOODS, SCALES, INSTRUMENTS, ENSEMBLES, BINAURAL data
    utils.js            # RNG, midiToFreq, clamp, noteName
    orbit.js            # shared orbit geometry (3D viz + spatial audio)
    AmbientEngine.js    # audio engine: synthesis, scheduler, generative logic, dropNote
    index.js            # singleton export
    __tests__/          # utils, atelier (scale/voice parsing), orbit
  ui/
    App.jsx             # thin shell: owns canvas refs, wires hooks, composes views
    labels.js           # dial label functions
    format.js           # display formatters (note/mood/ensemble names)
    constants.js        # UI constants (scenes, journeys, textures, brainwaves, breath…)
    persistence.js      # URL hash + localStorage read/write
    playAlong.js        # pure tap -> {pitch, pan} mapping for Play along
    glyphs.jsx          # instrument glyphs (canvas + DOM legend) + mood palettes
    icons.jsx           # SVG icon components
    canvas.js           # 2D renderer factory (mandala + panel + ripples)
    webgl.js            # WebGL renderer (3D "Drift Space" orrery)
    scopes.js           # Atelier lab scopes (spectrogram + vectorscope) renderer factories
    midi.js             # Web MIDI manager + message parser
    store/              # Zustand store, split into slices
      useDriftStore.js  # composes the slices into one store
      coreSlice.js      # params, transport, scenes, journey, drift, timers
      librarySlice.js   # saved-library (Yours)
      midiSlice.js      # MIDI map + learn
      exportSlice.js    # WAV export
      uiSlice.js        # console drawer/sheets/welcome/coachmark/toggles
                        #   (breath + haptics, spatial, play-along, entrain, theme)
    hooks/              # effect hooks (visualizer loop, scopes loop, timers, MIDI,
                        #   media session, wake lock, install prompt, immersive idle,
                        #   persistence, usePlayAlong — tap-to-drop)
    views/              # presentational components
      Field.jsx, WelcomeScreen.jsx
      SoundConsole.jsx  # the slide-over "Sound & tuning" drawer (tabs + seed/share)
      ToastHost.jsx     # consolidated toast queue
      controls/         # control panels (Scenes, Voice, Motion, Space, Atmosphere,
                        #   Mixer, Atelier) + ChipGroup primitive + atelier/ subviews
      immersive/        # mandala core, dock (+ Breathe / More popovers), viz corner,
                        #   breath/status overlays, onboarding coachmark
      sheets/           # Journey / Session / Export / Info sheets
    components/         # Slider, Dial
    __tests__/          # labels, midi, store, app smoke, chipgroup, atelier, playalong
  main.jsx              # entry point (error boundary) + service worker registration
  styles.css

public/                 # icons, manifest.webmanifest, sw.js
PRODUCT.md              # full product/feature description
```

---

## Tech stack

- **Preact** (via `preact/compat`) — UI; the app uses only standard React APIs, so it builds against Preact for a much smaller runtime
- **Zustand** — state management (store split into slices)
- **Web Audio API** — all synthesis and effects, incl. HRTF spatial audio (no external audio libs, no samples)
- **WebGL** — 3D visualization (raw, no 3D library)
- **Web MIDI API** — external controller mapping
- **Vite 5** — build tooling
- **Terser** — minification
- **System font stack** — no bundled or web-served fonts
- **Vitest** + **@testing-library/preact** — unit tests
- **GitHub Actions** — CI/CD (test → build → deploy to GitHub Pages)

---

## License

MIT
