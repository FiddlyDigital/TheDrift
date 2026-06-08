# The Drift — Product Description

**Live:** https://fiddlydigital.github.io/TheDrift/
**Repository:** https://github.com/FiddlyDigital/TheDrift

The Drift is a generative ambient music instrument that runs entirely in a web
browser. All sound is synthesized on the device using the Web Audio API; there
are no audio files, no server, no account, and no network requirement after the
first load. It is installable as a Progressive Web App and works offline.

---

## 1. The problem

Music used for sleep, focus, meditation, or background ambience is usually
delivered as fixed recordings. Fixed recordings loop and repeat, which makes
them predictable and, over long listening sessions, fatiguing. The common
alternatives each have a cost:

- **Streaming playlists** require connectivity and an account, and still play
  fixed tracks.
- **Audio-loop apps** repeat on a known cycle.
- **Full music software (DAWs)** can generate endless material but are complex
  and not designed for passive listening.

There is a gap between *passive* tools (press play, no control) and *active*
tools (full production environments). Nothing in that gap produces music that
never repeats, gives the listener graduated control, and runs offline with no
account.

## 2. How it solves it

The Drift builds music from **multiple independent loops, each one a single
synthesized note repeating on its own loop length**. The loop lengths are
deliberately unequal and nudged off clean ratios, so the loops drift in and out
of phase with each other continuously. Because the loops never realign, the
combined output never repeats.

This single mechanism (a tape-loop phasing technique, implemented in code)
gives:

- **Endlessness** — the field is non-repeating for as long as it plays.
- **Determinism** — the whole arrangement is generated from a numeric **seed**,
  so any state is reproducible and shareable.
- **Graduated control** — the same engine serves one-tap presets, timed
  programs, individual parameter dials, and a full per-voice editor.

The product is organized so a user can engage at any level: press a preset and
walk away, or specify the key, scale, instruments, notes, and loop lengths by
hand and let the engine keep them drifting.

---

## 3. The generative core

- **Unequal loops.** A field is 2–12 voices. Each voice has its own loop length
  (period). Periods are spread across roughly 8–48 seconds (controlled by the
  Drift dial) and given small irrational offsets so they avoid clean integer
  ratios, producing continuously changing phase relationships.
- **One note per voice.** Each voice plays a single pitch drawn from the active
  scale. Lower notes are given longer loops (a bass-drone bias).
- **Seeded randomness.** The note, instrument, loop length, stereo position, and
  timing of every voice are produced by a seeded pseudo-random generator
  (`mulberry32`). The same seed + parameters always produce the same field.
- **Autonomous evolution (Evolve dial).** Over a long listen, each voice on its
  own slow clock re-voices to a neighbouring scale tone, nudges its loop length
  (phase-continuously, no click), and re-aims its stereo drift. Timbre (Color,
  Bloom) also wanders on slow non-repeating oscillators. This keeps a static
  preset alive without changing its identity.
- **Autonomous mood migration (Journey dial).** Independently of Evolve, the
  field can slowly crossfade its harmonic palette to a new mood over minutes.

---

## 4. Sound engine

All audio is synthesized in real time. There are no recorded samples.

- **Per-note synthesis.** Struck instruments use additive partials with a
  percussive attack and exponential decay through a per-note lowpass filter.
  Sustained instruments swell and release within their loop, with optional
  formant banks (choir), detuned oscillator stacks, vibrato, and breath noise.
- **Generated reverb.** A convolver fed an exponentially-decaying noise impulse;
  the tail length (≈2–7 s) and wet/dry mix follow the Space dial.
- **Master chain.** Per-field gain → loop level → dry/reverb split → warmth
  lowpass → dynamics compressor with makeup gain (the Glue dial) → automatic
  loudness leveler → master → sleep/wake fade → output limiter.
- **Automatic loudness leveling.** A slow feed-forward auto-gain rides the
  program so a sparse 4-loop scene and a dense 12-loop scene land near the same
  perceived level.
- **Separate buses.** Ambience bed, binaural tones, and meditation bells each
  have their own bus and level, mixed under one master.

### Instruments (22, all synthesized)

| Family | Instruments |
|---|---|
| Struck / plucked | Felt Piano, Bell, Marimba, Harp, Handpan, Kalimba, Woodblock, Frame drum |
| Sustained / bowed | Strings, Choir, Flute, Drone |
| World percussion | Tabla, Udu, Balafon, Singing bowl |
| 8-bit / chiptune | Pulse lead, Blip, Triangle bass |
| Glitch (gesture) | Arpeggio, Birdsong, Trill |

The Glitch family is distinct: instead of one held note per strike, each strike
fires a short multi-note gesture — a rapid broken-chord arpeggio, a soft high
birdsong burst, or a rapid two-note trill — drawn from the active scale.

### Ensembles (10)

Curated instrument pools the seed draws from: **Felt Piano, Glasswork, Handpan,
Percussion, World, 8-Bit, Glitch, Strings, Choir, Orchestra** (Orchestra is a
broad random mix).

### Harmony — moods (9)

Each mood is a consonant scale (a root + a set of intervals): **Reflection,
Drift, Dusk, Elegy, Suspended, Curious, Pensive, Open, Vast.**

---

## 5. Controls (parameters)

Every parameter is a single value. Changing one updates the engine live; mood,
ensemble, density, scale, and seed rebuild the field (mood/ensemble/scale with a
crossfade).

| Control | Range | Effect |
|---|---|---|
| Density | 2–12 | Number of simultaneous loops |
| Tempo | 0–1 | Scales every loop length (slow ↔ fast; 0.5 = unchanged) |
| Drift | 0–1 | Loop-length spread — how unequal the loops are |
| Register | 0–1 | Pitch range (deep ↔ high; sets the lowest octave) |
| Space | 0–1 | Reverb tail length and wet/dry mix |
| Color | 0–1 | Timbral brightness (per-note lowpass cutoff) |
| Bloom | 0–1 | FM shimmer depth (bell-like sidebands) |
| Stutter | 0–1 | Probability of a tape-stutter retrigger burst per strike |
| Evolve | 0–1 | Rate of autonomous re-voicing / length / pan mutation |
| Journey | 0–1 | Autonomous mood-migration rate (0 = off) |
| Glue | 0–1 | Master compression amount |
| Tuning | 5 options | A4 reference pitch |
| Binaural | 6 options | Binaural-beat band |
| Beat level | 0–1 | Binaural tone level |
| Texture | multi-select | Active ambience layers |
| Ambience level | 0–1 | Ambience bed level |
| Loops level | 0–1 | Generative music level |
| Master | 0–1 | Output volume |
| Seed | integer | Reproducible field identity |

**Where the controls live.** The Drift is *immersive-first*: the listener lands
in the full-screen mandala and stays there — there is no separate editor screen.
The parameter panels — **Scenes, Voice, Motion, Space, Atmosphere, Mixer** (and
**Atelier** when unlocked) — live in a **Sound & tuning console** that slides in
over the mandala (a right-hand drawer on desktop, a bottom sheet on mobile) and
also carries the seed / save / share actions. Everything *experiential* sits on
a floating **dock** instead: play/pause (the mandala's own centre), the breath
guide, the live "feel" toggles (play-along, spatial audio, entrain-light), and
the Session / Journey / About sheets. On phones the feel toggles and About fold
into a **More** menu so the dock stays narrow. A top-corner control toggles the
2D mandala / 3D space view and fullscreen. The About sheet carries a **Midnight
palette** toggle that swaps the warm-paper surfaces (sheets, console, welcome,
chips) for a sleep-friendly dark theme; the immersive mandala itself is dark in
either mode.

---

## 6. Presets, programs, and timed experiences

### Curated scenes (11)

One tap sets every parameter. Ordered from calm to alert: **Deep Rest,
Stillness, Tide, Inner Sun, Clear Mind, Reverie, Procession, Arcade Dusk,
Daybreak, Quickening, Murmuration.** Each scene holds a fixed mood (it does not
auto-migrate); its slow variation comes from Evolve.

### Programmed journeys (4)

Timed arcs that move between scenes with crossfades:

- **Into Sleep** (45 min, fades to silence): Clear Mind → Tide → Stillness → Deep Rest
- **Deep Focus** (50 min): Quickening → Clear Mind → Clear Mind → Stillness
- **Sunrise** (30 min): Stillness → Tide → Inner Sun → Quickening
- **Unwind** (25 min): Reverie → Arcade Dusk → Tide

### Endless drift

An open-ended program that wanders indefinitely between a pool of ambient scenes
on randomized legs (≈2.5–5 minutes each), never stopping.

### Meditation and sleep tools

- **Session timer.** A timed sit (5/10/15/20/30/45 min) framed by opening and
  closing singing-bowl bells, with optional interval bells (every 3/5/10 min).
  The field ducks under the closing bells.
- **Sleep timer.** Auto-fade to silence after 15/30/45/60 minutes.
- **Wake / sunrise timer.** Starts inaudible and rises slowly to full over
  30 min to 8 hours (nap to full night).
- **Breath guide.** An animated ring paced to one of three patterns — Coherent
  (5.5/min), Box (4-4-4-4), or 4-7-8 — with a phase label and countdown. Renders
  in both the 2D and 3D views. Started, paced, and given its audible swell from
  the dock's **Breathe** popover, which can also drive **haptic pacing** on
  supported touch devices — a gentle buzz on each inhale/exhale so you can keep
  your eyes closed, with an adjustable strength.

### Ambience textures (9)

Synthesized layers that combine freely under the music: **Rain, Vinyl, Wind,
Fire, Static, Tape hiss, White noise, Pink noise, Brown noise.**

### Binaural beats

Two pure sine tones, one isolated to each ear, kept dry and channel-isolated so
the perceived beat survives. Bands: **Delta (2.5 Hz), Theta (6 Hz), Alpha
(10 Hz), Beta (18 Hz), Gamma (40 Hz)**, plus Off. Gamma is a dedicated "task
anchor" — a fast pulse in the gamma range associated with focused attention,
kept subtle via the Beat level. Effective only on headphones.

### Tuning

A4 reference pitch: **415 Hz** (baroque), **432 Hz** (natural), **440 Hz**
(concert standard), **444 Hz** (tunes C to 528 Hz), **448 Hz** (bright).

---

## 7. Atelier — hidden expert mode

Unlocked by triple-tapping the title in the Sound panel; remembered per device.
It adds an **Atelier** panel that turns the generator into a hand-authored
instrument while preserving the drift model.

- **Custom harmony.** Pick a **key** (12 chromatic roots), a **mode** (24
  scales: the seven diatonic modes, harmonic and melodic minor, dominant and
  exotic seven-note scales such as Phrygian dominant, Lydian dominant, Harmonic
  major and Byzantine, pentatonics, blues, Japanese and other world scales, the
  symmetric whole-tone/diminished/augmented scales, and chromatic), and toggle
  individual scale **degrees** on a 12-note grid. This feeds the same field
  builder the named moods use.
- **Voice loom.** A per-loop editor. **Capture field** snapshots the playing
  voices into editable rows. Each row sets the **instrument** (any of the 22, or
  random), the **note** (a scale tone, or "roam" = generative), and the **loop
  length** (a slider, or "roam"). Add/remove voices; "Return to generative"
  clears it.
- **Per-voice lock.** A locked voice holds its pinned note and length;
  everything unlocked keeps slowly evolving, and stereo/timbre always drift.
  Authored voices still loop and phase-drift like every other voice.

Atelier creations are encoded in the share URL like any other state.

### MIDI control (Web MIDI)

External MIDI controllers can drive the instrument, so it can be played with
physical knobs, faders, and buttons. Mapping uses a **MIDI-learn** flow: enable
MIDI, click **Learn** on a control, then move a knob or press a key on the
controller — the next message binds to that control. Bindings are saved in the
browser and reconnect automatically on the next visit; devices can be added or
removed while running.

**Continuous controls** (bind to a Control-Change message; the CC value 0–127 is
scaled to the control's range, and the on-screen dial moves with the hardware):

- Density
- Tempo
- Drift
- Register
- Space
- Color
- Bloom
- Stutter
- Evolve
- Journey
- Glue
- Loops level
- Ambience level
- Master volume

**Transport and actions** (bind to a Control-Change or a Note; triggered on
button press / note-on):

- Play / Pause (toggle)
- Start
- Stop
- Next scene
- Previous scene
- Reshuffle (new seed)

A control change moves the same parameter the on-screen dial does, so hardware
and UI stay in sync. Requires a browser with Web MIDI support (Chromium-based:
Chrome, Edge, Opera); other browsers show a "not supported" notice. Sysex is not
requested.

---

## 8. Visualizations

Three views, all driven by the live audio state.

- **Panel.** Stacked horizontal bars — one per voice — showing loop length,
  playhead position, strike blooms, stutter marks, instrument glyphs, and a
  stereo-drift plot.
- **Mandala (immersive).** A full-screen orbital display. Each voice is a hand
  rotating at its loop rate; threads light up when loops align; bell strikes
  ring the field; the center breathes with the live output level. Mood-tinted
  per palette.
- **3D Space (immersive).** A WebGL orrery: each voice is a glowing orb on a
  seeded tilted orbit, travelling at its loop rate, with a fading comet trail
  and a particle burst on each strike, around a central star. Drag (mouse or
  touch) to rotate; pinch or scroll to zoom. Toggle between Mandala and 3D
  Space.

### Play along (Raindrop)

An optional mode (a toggle in the dock, off by default, remembered per device)
that lets the listener lightly play along with the generative field
by tapping the full-screen mandala. **Position is musical:** vertical position
sets pitch (top = high, bottom = low, quantised to the active scale so it stays
consonant) and horizontal position sets stereo pan. A **tap** drops a single
transient note; a **long-press or two-finger touch** drops a short glitch
gesture (a rapid arpeggio/birdsong/trill run). Each tap also rings a ripple at
the touch point, and the dropped note borrows the instrument of the
nearest-pitched playing voice so it blends in. Drops are one-shots routed
through the shared reverb/compression/limiter chain; they never touch the
scheduler, so the running loops keep drifting undisturbed. It is gated to the
immersive mandala while playing, so stray taps (e.g. to reveal the controls)
stay silent.

**Immersive behavior.** The mandala is the home view — there is no separate
"player" screen to enter or leave. The on-screen chrome (dock and corner)
auto-hides after 3.2 s of inactivity and the cursor hides with it; any movement
restores them. A screen wake lock is requested while playing, a fullscreen
toggle sits in the corner, and Escape closes the Sound console.

---

## 9. 3D spatial audio

An optional mode (off by default, persisted per device, best with headphones)
that places each voice's sound in 3D to match the 3D Space orrery. Each voice is
routed through an HRTF panner positioned every frame to exactly where its orb is
drawn. The geometry is shared between the renderer and the audio engine, so the
sound and the picture agree. In the 3D view the soundstage follows the camera —
rotating the orrery rotates the sound field; zoom changes front/back depth.
Distance does not change loudness (direction only). When off, the original
stereo placement is used.

---

## 10. Output, persistence, and sharing

- **Export to WAV.** Renders 1/2/3/5 minutes offline at 44.1 kHz, 16-bit,
  stereo. The render is deterministic: the same seed and parameters reproduce
  the same audio (the export prints the stereo mix).
- **Personal library.** Save the current configuration (up to 24) with an
  auto-generated or custom name; recall, rename (double-click), or delete.
  Stored locally.
- **Share links.** The complete state (every parameter plus the seed, and any
  Atelier scale/voice data) is encoded in the URL hash. Copying the link shares
  the exact sound; opening it restores it. Default-valued expert keys are
  omitted so ordinary links stay short.
- **Resume.** The last configuration is restored on next launch from local
  storage (elapsed time and play state are not restored).
- **Time-of-day default.** On a first visit, the starting scene is chosen by the
  current hour; the welcome screen shows a matching line. (The music is not
  otherwise changed by the clock during a session.)

---

## 11. Platform integration

- **Progressive Web App.** Installable on desktop and mobile; works offline via
  a service worker (network-first for app assets, cache fallback).
- **Lock-screen / media controls.** Media Session integration provides
  play/pause/stop and next/previous (cycle scene), with title, artist, album,
  and mood-colored artwork. A silent anchor element keeps background playback
  alive.
- **Screen wake lock** while playing (where supported).
- **Mobile orientation.** The installed app is locked to portrait.

---

## 12. Privacy and data

- No accounts, no sign-in.
- No backend server; nothing is uploaded.
- No analytics or telemetry.
- All state lives in the browser: the URL hash (for sharing) and local storage
  (config, library, and preferences such as volume, breath pattern / pace /
  audible swell / haptic pacing, beat-delivery mode, colour palette
  (paper / midnight), unlocked Atelier, the spatial-audio, play-along, and
  entrain-light toggles, and whether the one-time onboarding hint has been
  seen).

---

## 13. Technical summary

- **UI:** Preact (via `preact/compat`) with a Zustand store split into slices.
  The app uses only standard React APIs, so it builds against Preact for a
  smaller runtime.
- **Audio & effects:** Web Audio API only (synthesis, convolver reverb,
  compressor, stereo and HRTF panning, offline render). No external audio
  libraries, no samples.
- **Visuals:** 2D Canvas (panel, mandala) and raw WebGL (3D space), no 3D
  library.
- **Build:** Vite 5, Terser minification; a system font stack (no bundled or
  web-served fonts).
- **Structure:** the engine (synthesis, scheduler, generative logic) is separate
  from the UI; harmony/instrument data and shared orbit geometry are standalone
  modules.
- **Tests:** unit tests (Vitest + @testing-library/preact) cover the pure
  utilities, label functions, Atelier parsing, orbit geometry, the
  position→pitch/pan mapping, store behaviour, and component rendering.
- **Delivery:** GitHub Actions runs tests → build → deploy to GitHub Pages on
  push to `main`.
