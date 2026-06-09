import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const EXE = process.env.PW_CHROMIUM || ''; // set to a chromium binary, else use Playwright's bundled one
const DIR = 'manual';
const SHOTS = `${DIR}/shots`;

// inline each screenshot as a data URI so the HTML + PDF are fully self-contained
function img(name) {
  const p = `${SHOTS}/${name}.png`;
  if (!existsSync(p)) return '';
  return 'data:image/png;base64,' + readFileSync(p).toString('base64');
}
const phone = (name, caption) => img(name)
  ? `<figure class="phone"><img src="${img(name)}" alt="${caption}"/><figcaption>${caption}</figcaption></figure>`
  : '';

// ---- content -------------------------------------------------------------
const sections = [
  {
    id: 'intro', title: '1 · What The Drift is',
    body: `
      <p><em>The Drift</em> is a generative ambient music instrument that runs entirely in your
      browser. It builds a piece of music from a handful of <strong>loops</strong> — each one a single
      synthesized note on its own slightly-irrational length. Because no two loops share a tidy ratio,
      they drift endlessly in and out of phase, so the music shifts forever and <strong>never
      repeats</strong>.</p>
      <p>Everything is synthesized live with the Web Audio API — there are no samples, no account, and
      no server. It works offline and installs as an app. The whole thing is built to be calm: you land
      straight inside a full-screen visual and shape the sound from there.</p>`,
    shots: [['01-welcome', 'The opening splash — “Begin the drift” starts the sound']],
  },
  {
    id: 'start', title: '2 · Getting started',
    body: `
      <p>Tap <strong>Begin the drift</strong> on the welcome screen. That single tap both starts
      playback and unlocks audio (browsers require a gesture before any sound). You arrive in the
      <strong>mandala</strong> — the permanent, full-screen home of the experience.</p>
      <p>The centre of the mandala is the <strong>play / pause</strong> button. A floating
      <strong>dock</strong> along the bottom is the remote for everything else. The chrome quietly
      fades after a few seconds of stillness and returns the moment you move or tap.</p>`,
    shots: [['02-mandala', 'The mandala and the dock — your home base']],
  },
  {
    id: 'scenes', title: '3 · Scenes — one-tap moods',
    body: `
      <p>The fastest way to change the whole feel is a <strong>Scene</strong>. Open
      <strong>Sound</strong> from the dock and you land on the Scenes tab: eleven curated presets,
      ordered from calm to alert — Deep Rest, Stillness, Tide, Inner Sun, Clear Mind, Reverie,
      Procession, Arcade Dusk, Daybreak, Quickening, Murmuration. One tap re-tunes every dial,
      instrument and texture at once.</p>
      <p>Found something you love? <strong>Save</strong> it to <em>Yours</em>, or
      <strong>Share link</strong> to copy a URL that encodes the entire setup.</p>`,
    shots: [['03-console-scenes', 'Scenes — eleven curated presets, calm → alert']],
  },
  {
    id: 'shape', title: '4 · Shaping the sound',
    body: `
      <p>The Sound &amp; tuning console holds tabbed control groups. Every knob has a plain-language
      readout, so you can dial by ear:</p>
      <ul>
        <li><strong>Voice</strong> — the mood (harmonic palette), the ensemble of instruments, and the
        tuning reference (432 Hz, 440 Hz and others).</li>
        <li><strong>Motion</strong> — Density (how many loops), Tempo, Drift (how unequal the loops
        are), Register, and Evolve / Journey (how fast the field changes on its own).</li>
        <li><strong>Space</strong> — reverb size, timbral colour, Bloom (a bell-like shimmer) and
        tape-stutter.</li>
        <li><strong>Atmosphere</strong> — an ambience bed (rain, vinyl, wind, fire…) and brainwave
        beats (Delta → Gamma) with binaural / monaural / isochronic delivery.</li>
        <li><strong>Mixer</strong> — Master, Loops, Ambience, Beat and Glue (compression) levels.</li>
      </ul>`,
    shots: [
      ['05-console-space', 'Space — reverb, colour, bloom, stutter'],
      ['06-console-atmosphere', 'Atmosphere — ambience + brainwave beats'],
    ],
  },
  {
    id: 'voicemix', title: '4 · Shaping the sound (continued)',
    body: `<p>Voice sets the harmonic character and the instruments; the Mixer balances the layers.
      None of these need headphones except the binaural beats and spatial audio, which are flagged
      in the interface where it matters.</p>`,
    shots: [
      ['04-console-voice', 'Voice — mood, ensemble, tuning'],
      ['07-console-mixer', 'Mixer — balance the layers'],
    ],
  },
  {
    id: 'breath', title: '5 · The breath guide',
    body: `
      <p>Tap <strong>Breathe</strong> in the dock to start an animated breathing pacer. Choose a
      pattern — Coherent (about 5.5 breaths a minute), Box (4-4-4-4) or 4-7-8 — and a pace. The ring
      expands on the inhale and settles on the exhale, in both the 2D and 3D views.</p>
      <p>You can also let it breathe <em>with sound</em> (a soft swell on each inhale) and, on
      supported phones, add <strong>haptic pacing</strong> — a gentle buzz at each phase change so you
      can keep your eyes closed.</p>`,
    shots: [['09-breathe', 'The breath guide — pattern, pace, sound & haptics']],
  },
  {
    id: 'timers', title: '6 · Meditation & sleep tools',
    body: `
      <p><strong>Session</strong> sets a timed sit — opening and closing singing-bowl bells, with
      optional interval bells. <strong>Sleep</strong> fades gently to silence after a set time, and a
      <strong>Wake / sunrise</strong> timer starts inaudible and rises slowly over up to eight hours.</p>
      <p><strong>Journey</strong> mode travels between scenes on a timed arc with smooth crossfades —
      Into Sleep, Deep Focus, Sunrise, Unwind — or an open-ended Endless Drift that simply wanders.</p>`,
    shots: [
      ['10-session', 'Session — a timed sit with bells'],
      ['11-journey', 'Journey — timed arcs between scenes'],
    ],
  },
  {
    id: 'views', title: '7 · Two ways to watch',
    body: `
      <p>The top-corner control flips between the <strong>2D mandala</strong> — rotating hands that
      bloom on each strike, threads lighting when loops align — and a <strong>3D space</strong>: a
      WebGL orrery where every voice is a glowing orb on its own tilted orbit, with comet trails and a
      central star. Drag to rotate, pinch to zoom.</p>
      <p>With <strong>spatial audio</strong> on (headphones), each voice’s sound is placed where its
      orb appears, and the soundstage follows the camera as you turn the orrery.</p>`,
    shots: [['16-space3d', '3D space — each voice an orb on its own orbit']],
  },
  {
    id: 'extras', title: '8 · Feel toggles, sharing & dark mode',
    body: `
      <p>The <strong>More</strong> menu (the ⋯ on the dock) holds the live “feel” toggles —
      <em>Play along</em> (tap the mandala to drop notes in key), <em>Spatial audio</em>, and
      <em>Entrain light</em> (the field pulses with the beat) — plus <strong>About</strong>.</p>
      <p>From About you can <strong>Export</strong> the current drift to a WAV file (1–5 minutes,
      rendered offline), <strong>copy a share link</strong>, go fullscreen, or switch to the
      <strong>Midnight palette</strong> — a sleep-friendly dark theme for the panels and sheets.</p>`,
    shots: [
      ['12-more', 'The More menu — feel toggles + About'],
      ['15-midnight', 'Midnight palette — a dark theme for night'],
    ],
  },
  {
    id: 'export', title: '8 · Sharing & export (continued)',
    body: `<p>A share link rebuilds your exact setup — every dial, the seed, and any hand-authored
      Atelier data — for anyone who opens it. Export renders the same field deterministically to a
      44.1 kHz stereo WAV you can keep.</p>`,
    shots: [
      ['13-about', 'About — export, share, fullscreen, palette'],
      ['14-export', 'Export — render a WAV of this drift'],
    ],
  },
  {
    id: 'atelier', title: '9 · Atelier — the expert workshop',
    body: `
      <p>Hidden for the curious: <strong>triple-tap the title</strong> in the Sound panel to unlock the
      <strong>Atelier</strong>. It turns the generator into a hand-authored instrument — pick a key and
      one of 24 scales and toggle individual notes; build each loop’s instrument, note and length in
      the <em>Voice loom</em>; lock voices so they hold while the rest keep drifting; and map a MIDI
      controller to the dials and transport.</p>
      <p>The Atelier also hides a pair of optional <strong>lab scopes</strong> — a live
      <em>spectrogram</em> (frequency × time) and a stereo <em>vectorscope</em> — tapped off the master
      output, for seeing exactly how your tweaks reshape the sound.</p>`,
    shots: [['08-atelier', 'Atelier — hand-authoring, MIDI, and lab scopes']],
  },
];

// ---- html ----------------------------------------------------------------
const css = `
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; color: #2c271f; background: #f7f1e4;
    font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.55;
  }
  .mono { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; }
  h1, h2, h3 { font-weight: 600; line-height: 1.2; }
  em { color: #8a4a2c; font-style: italic; }
  strong { color: #1d1a14; }
  a { color: #b0613a; }

  /* cover */
  .cover { height: 261mm; display: flex; flex-direction: column; justify-content: center;
    page-break-after: always; text-align: center; }
  .cover .eyebrow { font-size: 10pt; letter-spacing: 0.34em; text-transform: uppercase; color: #7a6f5c; }
  .cover h1 { font-size: 52pt; margin: 8px 0 0; }
  .cover h1 b { color: #b0613a; font-weight: 600; }
  .cover .sub { font-style: italic; font-size: 14pt; color: #5a5142; max-width: 30em; margin: 14px auto 0; }
  .cover .tag { margin-top: 30px; font-size: 9.5pt; letter-spacing: 0.18em; text-transform: uppercase; color: #8a8170; }
  .cover .coverphone { width: 188px; margin: 26px auto 0; border-radius: 22px; border: 6px solid #2c271f;
    box-shadow: 0 14px 36px rgba(0,0,0,0.22); overflow: hidden; display:block; }
  .cover .coverphone img { width: 100%; display: block; }

  section { page-break-inside: avoid; margin: 0 0 22px; }
  h2 { font-size: 17pt; margin: 0 0 4px; border-bottom: 1px solid #d8ccb2; padding-bottom: 6px; }
  p { margin: 8px 0; }
  ul { margin: 8px 0 8px 1.1em; padding: 0; }
  li { margin: 4px 0; }

  .shots { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; margin: 14px 0 2px; }
  figure.phone { margin: 0; width: 205px; text-align: center; page-break-inside: avoid; }
  figure.phone img { width: 100%; display: block; border-radius: 16px; border: 5px solid #2c271f;
    box-shadow: 0 8px 22px rgba(0,0,0,0.18); }
  figure.phone figcaption { font-family: ui-monospace, Menlo, monospace; font-size: 7.6pt;
    color: #6a6151; margin-top: 7px; line-height: 1.35; letter-spacing: 0.01em; }

  footer { margin-top: 8mm; border-top: 1px solid #d8ccb2; padding-top: 8px;
    font-family: ui-monospace, Menlo, monospace; font-size: 8pt; color: #8a8170; text-align: center; }
`;

const body = sections.map((s) => `
  <section id="${s.id}">
    <h2>${s.title}</h2>
    ${s.body}
    <div class="shots">${s.shots.map(([n, c]) => phone(n, c)).join('')}</div>
  </section>`).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="cover">
    <div class="eyebrow">User Manual</div>
    <h1>The Drift<b>.</b></h1>
    <div class="sub">A generative ambient instrument that never repeats — a field guide to every feature, on your phone.</div>
    <div class="coverphone"><img src="${img('02-mandala')}" alt="The Drift on mobile"/></div>
    <div class="tag">Generative Ambient System · fiddlydigital.github.io/TheDrift</div>
  </div>
  ${body}
  <footer>The Drift — user manual · screenshots captured at mobile (Pixel 5) size · generated ${new Date().toISOString().slice(0,10)}</footer>
</body></html>`;

writeFileSync(`${DIR}/the-drift-manual.html`, html);

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: `${DIR}/the-drift-manual.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote manual/the-drift-manual.html and .pdf');
