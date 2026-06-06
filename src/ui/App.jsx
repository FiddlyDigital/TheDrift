import React, { useRef } from 'react';
import { ENGINE, parseScaleNotes, parseVoices } from '../engine/index.js';
import {
  tempoLabel, stutterLabel, bloomLabel, driftLabel, registerLabel, spaceLabel,
  colorLabel, evolveLabel, journeyLabel, texlevelLabel, glueLabel, binlevelLabel, pctLabel,
} from './labels.js';
import {
  BRAINWAVES, BREATH_PATTERNS, BREATH_ORDER, TUNINGS, SECTIONS, TEXTURES,
  KEYS, STR_KEYS, INT_KEYS, NUM_DEFAULTS,
  SCENES, SCENE_DIAL_KEYS, SCENE_BY_NAME,
  JOURNEYS, JOURNEY_STEP_KEYS, JOURNEY_CONT_KEYS,
  DRIFT_POOL, DRIFT_SEG_MIN, DRIFT_SEG_MAX, EXPORT_OPTS,
  SLEEP_OPTS, SLEEP_FADE, WAKE_OPTS, WAKE_RISE,
  SESSION_OPTS, INTERVAL_OPTS, SESSION_DUCK,
  SCALES, SCALE_ORDER, SCALE_NAMES, NOTE_NAMES,
} from './constants.js';
import {
  PlayIcon, PauseIcon, DiceIcon, LinkIcon, InstallIcon,
  FullscreenIcon, FullscreenExitIcon, VizIcon, ReturnIcon,
  SpeakerIcon, MoonIcon, BreathIcon, BellIcon, SlidersIcon,
  RouteIcon, InfoIcon, DownloadIcon, SunriseIcon, CloseIcon, SaveIcon, CubeIcon,
  LockIcon, UnlockIcon, PlusIcon, HeadphonesIcon,
} from './icons.jsx';
import { drawGlyph, FAMILY_LABEL, MOOD_VIZ, GlyphSVG } from './glyphs.jsx';
import { Dial } from './components/Dial.jsx';
import { Slider } from './components/Slider.jsx';
import { partOfDay, welcomeWhisper } from './store/util.js';
import { MIDI_CONTROLS } from './store/midiSlice.js';
import { useDriftStore } from './store/useDriftStore.js';
import { useVisualizer } from './hooks/useVisualizer.js';
import { useTimers } from './hooks/useTimers.js';
import { useMidiBridge } from './hooks/useMidiBridge.js';
import { useMediaSession } from './hooks/useMediaSession.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
import { useImmersiveIdle } from './hooks/useImmersiveIdle.js';
import { usePersistence } from './hooks/usePersistence.js';

// ---- main ------------------------------------------------------------
// App is a thin shell: it pulls state + actions from the Zustand store, owns the
// DOM refs for the canvases / breath overlay, wires up the effect hooks, and
// renders the view. All behaviour lives in the store slices and the hooks.
export default function App() {
  const {
    // state
    params, playing, elapsed, immersive, vizMode, vizUiVisible, sheet,
    exportMin, exportState, exportPct, volume, activeScene, library, activeSaved,
    savedToast, renamingId, sleepDur, sleepRemain, wakeIn, wakeAt, wakeRising,
    sessionPick, sessionInterval, sessionEnd, sessionRemain,
    journey, journeyRemain, journeyStop, driftOn, driftNow, driftNext, driftProgress,
    _sessionTotal: sessionTotal,
    installPrompt, isFullscreen, breathOn, breathPat, section, expert, expertToast,
    spatial, spatialToast, midiSupported, midiEnabled, midiInputs, midiLearn, midiMap,
    copied, showWelcome, welcomeHiding, families, WELCOME,
    // actions
    update, applyScene, saveCurrent, recallSaved, deleteSaved, renameSaved,
    cycleScene, toggleTexture, reshuffle, toggle, enableMidi, setSleep, setWake,
    beginSession, endSession, beginJourney, cancelJourney, beginDrift, cancelDrift,
    doExport, enterViz, begin, toggleFullscreen, share, install, toggleSpatial,
    unlockExpert, clearMidiBinding, setMidiLearn, setVolume, setSessionPick, setSessionInterval,
    setImmersive, setVizMode, setSheet, setSection, setBreathOn, setBreathPat,
    setExportMin, setRenamingId,
  } = useDriftStore();

  // DOM refs owned by the view; passed into the visualizer hook
  const canvasRef = useRef(null);
  const glCanvasRef = useRef(null);
  const breathRingRef = useRef(null);
  const breathLabelRef = useRef(null);
  const breathCountRef = useRef(null);

  // effect hooks (each reads/drives the store)
  usePersistence();
  useVisualizer({ canvasRef, glCanvasRef, breathRingRef, breathLabelRef, breathCountRef });
  useTimers();
  useMidiBridge();
  useMediaSession();
  useWakeLock();
  useInstallPrompt();
  useImmersiveIdle();

  // ---- clock formatting ----
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), ss = s % 60;
    return m + ":" + String(ss).padStart(2, "0");
  };
  const fmtUntil = (sec) => {
    sec = Math.max(0, sec);
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
      return h + "h" + (m ? " " + m + "m" : "");
    }
    if (sec >= 90) return Math.round(sec / 60) + "m";
    const mm = Math.floor(sec / 60), ss2 = Math.floor(sec % 60);
    return (mm ? mm + "m " : "") + ss2 + "s";
  };

  // ---- derived view state ----
  const AE = ENGINE.constructor;
  const moodName = AE.MOODS && AE.MOODS[params.mood] ? AE.MOODS[params.mood].name : "";
  const ensembleName = AE.ENSEMBLES && AE.ENSEMBLES[params.ensemble] ? AE.ENSEMBLES[params.ensemble].name : "";
  const texSet = new Set((params.texture || "").split(".").filter(Boolean));

  // ---- Atelier (expert) helpers ----
  const sections = expert ? SECTIONS.concat([{ id: "atelier", name: "Atelier" }]) : SECTIONS;
  const INSTRUMENT_KEYS = Object.keys(AE.INSTRUMENTS || {});
  const loomSpecs = parseVoices(params.voices);
  const activeScaleNotes = parseScaleNotes(params.scaleNotes);
  const noteLabel = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

  // the scale pool of MIDI notes available for the current key/mode/register
  // (mirrors the engine's pool builder so the note picker offers valid tones)
  const scalePool = () => {
    const M = AE.MOODS[params.mood] || AE.MOODS.reflection;
    let root = M.root, notes = M.notes;
    if (params.mood === "custom") {
      root = (((Math.round(params.key || 0)) % 12) + 12) % 12;
      if (activeScaleNotes.length) notes = activeScaleNotes;
    }
    const base = Math.round(41 + params.register * 19);
    const pool = [];
    for (let oct = 0; oct < 3; oct++) for (const d of notes) { const m = base + root + d + 12 * oct; if (m <= base + 30) pool.push(m); }
    pool.sort((a, b) => a - b);
    return pool;
  };

  const ensureCustom = () => { if (params.mood !== "custom") update("mood", "custom"); };
  const pickKey = (i) => { ensureCustom(); update("key", i); };
  const pickScale = (id) => { ensureCustom(); update("scaleNotes", SCALES[id].join(".")); };
  const toggleScaleNote = (deg) => {
    ensureCustom();
    const has = activeScaleNotes.indexOf(deg) >= 0;
    const next = has ? activeScaleNotes.filter((d) => d !== deg) : activeScaleNotes.concat([deg]).sort((a, b) => a - b);
    if (!next.length) return;            // a scale needs at least one note
    update("scaleNotes", next.join("."));
  };
  const scaleMatches = (id) => {
    const s = SCALES[id];
    return s.length === activeScaleNotes.length && s.every((d, i) => d === activeScaleNotes[i]);
  };

  const encodeVoices = (arr) => arr.map((s) =>
    (s.inst || "*") + ":" + (s.note == null ? "_" : s.note) + ":" + (s.len == null ? "_" : (+s.len).toFixed(1)) + ":" + (s.lock ? "1" : "0")
  ).join(",");
  const updateVoices = (arr) => update("voices", encodeVoices(arr));
  const setVoiceField = (i, patch) => {
    const arr = parseVoices(params.voices);
    if (!arr[i]) return;
    arr[i] = Object.assign({}, arr[i], patch);
    updateVoices(arr);
  };
  const addVoice = () => {
    const arr = parseVoices(params.voices);
    if (arr.length >= 12) return;
    const pool = scalePool();
    const note = pool.length ? pool[Math.floor(pool.length / 2)] : 60;
    arr.push({ inst: null, note: note, len: 12, lock: false });
    updateVoices(arr);
  };
  const removeVoice = (i) => {
    const arr = parseVoices(params.voices);
    arr.splice(i, 1);
    updateVoices(arr);
  };
  const captureField = () => {
    const specs = ENGINE.voices.map((v) => ({ inst: v.inst, note: v.midi, len: +v.period.toFixed(1), lock: false }));
    if (specs.length) updateVoices(specs);
  };
  const clearLoom = () => update("voices", "");

  return (
    <div className={"stage" + (immersive ? " immersive" : "") + (immersive && !vizUiVisible ? " hide-cursor" : "")}>
      <header className="head">
        <div className="head-left">
          <div className="eyebrow">Generative Ambient System</div>
          <h1 className="title" onClick={unlockExpert} title={expert ? "Atelier unlocked" : undefined}>The Drift<em>.</em></h1>
          <p className="subtitle">
            Unequal loops, each a single held note, drifting endlessly in and
            out of phase &mdash; so the music never repeats.
          </p>
        </div>
        <div className="transport">
          <div className="clock">
            <div><b>{playing ? "playing" : "paused"}</b></div>
            <div>{fmt(elapsed)}</div>
          </div>
          <button className="mandala-btn" onClick={() => setImmersive(true)} aria-label="Back to the mandala" title="Back to the mandala">
            <VizIcon /> <span>Mandala</span>
          </button>
          <button className="play-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </header>

      <div className="field-wrap">
        <canvas className="field" ref={canvasRef}></canvas>
        <canvas className={"field field-gl" + (vizMode === "space" && immersive ? " show" : "")} ref={glCanvasRef}></canvas>
        <div className="field-hint">{ensembleName} &middot; {moodName} &middot; {params.density} loops</div>
        {!playing && (
          <div className="idle-veil" onClick={toggle}>
            <span>press play to begin the drift</span>
          </div>
        )}
      </div>

      {families.length > 1 && (
        <div className="legend">
          {families.map((f) => (
            <span key={f} className="legend-item"><GlyphSVG family={f} /> {FAMILY_LABEL[f] || f}</span>
          ))}
        </div>
      )}

      <div className="controls">
        <nav className="panel-tabs" role="tablist" aria-label="Control sections">
          {sections.map((s) => (
            <button key={s.id} role="tab" id={"tab-" + s.id}
              aria-selected={section === s.id}
              aria-controls={"panel-" + s.id}
              className={"panel-tab" + (section === s.id ? " active" : "") + (s.id === "atelier" ? " atelier-tab" : "")}
              onClick={() => setSection(s.id)}>
              {s.name}
            </button>
          ))}
        </nav>

        {section === "scenes" && (
          <div className="panel-body" role="tabpanel" id="panel-scenes" aria-labelledby="tab-scenes">
            <div className="mood-row">
              <span className="row-label">Scene</span>
              <div className="moods">
                {SCENES.map((sc) => (
                  <button key={sc.name}
                    className={"mood" + (activeScene === sc.name ? " active" : "")}
                    onClick={() => applyScene(sc)}>
                    {sc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Yours</span>
              {library.length > 0 ? (
                <div className="moods saved-row">
                  {library.map((item) => (
                    <div key={item.id}
                      className={"saved" + (activeSaved === item.id ? " active" : "")}>
                      {renamingId === item.id ? (
                        <input className="saved-input" autoFocus defaultValue={item.name}
                          onBlur={(e) => renameSaved(item.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                            else if (e.key === "Escape") setRenamingId(null);
                          }} />
                      ) : (
                        <button className="saved-name" onClick={() => recallSaved(item)}
                          onDoubleClick={() => setRenamingId(item.id)}
                          title="Recall · double-click to rename">
                          {item.name}
                        </button>
                      )}
                      <button className="saved-x" onClick={() => deleteSaved(item.id)}
                        aria-label="Remove from library" title="Remove">&times;</button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="saved-empty">save a drift you love &mdash; it lands here</span>
              )}
            </div>
          </div>
        )}

        {section === "voice" && (
          <div className="panel-body" role="tabpanel" id="panel-voice" aria-labelledby="tab-voice">
            <div className="mood-row">
              <span className="row-label">Mood</span>
              <div className="moods">
                {AE.MOOD_ORDER.map((m) => (
                  <button key={m}
                    className={"mood" + (params.mood === m ? " active" : "")}
                    onClick={() => update("mood", m)}>
                    {AE.MOODS[m].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Ensemble</span>
              <div className="moods">
                {AE.ENSEMBLE_ORDER.map((m) => (
                  <button key={m}
                    className={"mood" + (params.ensemble === m ? " active" : "")}
                    onClick={() => update("ensemble", m)}>
                    {AE.ENSEMBLES[m].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Tuning</span>
              <div className="moods tunings">
                {TUNINGS.map((t) => (
                  <button key={t.hz}
                    className={"tuning-opt" + (params.tuning === t.hz ? " active" : "")}
                    onClick={() => update("tuning", t.hz)}
                    title={t.title}>
                    <span className="tuning-hz">{t.name}</span>
                    <span className="tuning-note">{t.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === "motion" && (
          <div className="panel-body" role="tabpanel" id="panel-motion" aria-labelledby="tab-motion">
            <div className="dials">
              {loomSpecs.length ? (
                <Dial name="Density" value={loomSpecs.length} label={loomSpecs.length + " · in Atelier"}
                  min={2} max={12} step={1} onChange={() => {}} />
              ) : (
                <Dial name="Density" value={params.density} label={params.density + " loops"}
                  min={2} max={12} step={1} onChange={(v) => update("density", v)} />
              )}
              <Dial name="Tempo" value={params.tempo} label={tempoLabel(params.tempo)}
                min={0} max={1} step={0.01} onChange={(v) => update("tempo", v)} />
              <Dial name="Drift" value={params.drift} label={driftLabel(params.drift)}
                min={0} max={1} step={0.01} onChange={(v) => update("drift", v)} />
              <Dial name="Register" value={params.register} label={registerLabel(params.register)}
                min={0} max={1} step={0.01} onChange={(v) => update("register", v)} />
              <Dial name="Evolve" value={params.evolve} label={evolveLabel(params.evolve)}
                min={0} max={1} step={0.01} onChange={(v) => update("evolve", v)} />
              <Dial name="Journey" value={params.journey} label={journeyLabel(params.journey)}
                min={0} max={1} step={0.01} onChange={(v) => update("journey", v)} />
            </div>
          </div>
        )}

        {section === "space" && (
          <div className="panel-body" role="tabpanel" id="panel-space" aria-labelledby="tab-space">
            <div className="dials">
              <Dial name="Space" value={params.space} label={spaceLabel(params.space)}
                min={0} max={1} step={0.01} onChange={(v) => update("space", v)} />
              <Dial name="Color" value={params.color} label={colorLabel(params.color)}
                min={0} max={1} step={0.01} onChange={(v) => update("color", v)} />
              <Dial name="Bloom" value={params.bloom} label={bloomLabel(params.bloom)}
                min={0} max={1} step={0.01} onChange={(v) => update("bloom", v)} />
              <Dial name="Stutter" value={params.stutter} label={stutterLabel(params.stutter)}
                min={0} max={1} step={0.01} onChange={(v) => update("stutter", v)} />
            </div>
          </div>
        )}

        {section === "atmos" && (
          <div className="panel-body" role="tabpanel" id="panel-atmos" aria-labelledby="tab-atmos">
            <div className="mood-row">
              <span className="row-label">Ambience</span>
              <div className="moods">
                {TEXTURES.map((t) => (
                  <button key={t.id}
                    className={"mood" + (texSet.has(t.id) ? " active" : "")}
                    onClick={() => toggleTexture(t.id)}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Brainwaves</span>
              <div className="moods">
                {BRAINWAVES.map((b) => (
                  <button key={b.id}
                    className={"mood" + (params.binaural === b.id ? " active" : "")}
                    onClick={() => update("binaural", b.id)}
                    title={b.hz ? b.hz + " · " + b.note : "Binaural beats off"}>
                    {b.name}
                  </button>
                ))}
                {params.binaural !== "off" && (() => {
                  const b = BRAINWAVES.find((x) => x.id === params.binaural);
                  return b ? <span className="bin-note">{b.hz} &middot; {b.note} &middot; headphones</span> : null;
                })()}
              </div>
            </div>
          </div>
        )}

        {section === "mixer" && (
          <div className="panel-body" role="tabpanel" id="panel-mixer" aria-labelledby="tab-mixer">
            <p className="mixer-intro">Balance the layers — the music, the ambience bed and the binaural tones each have their own level, under one master.</p>
            <div className="dials">
              <Dial name="Master" value={volume} label={pctLabel(volume)}
                min={0} max={1} step={0.01} onChange={setVolume} />
              <Dial name="Loops" value={params.looplevel} label={pctLabel(params.looplevel)}
                min={0} max={1} step={0.01} onChange={(v) => update("looplevel", v)} />
              <Dial name="Ambience" value={params.texlevel} label={texlevelLabel(params.texlevel)}
                min={0} max={1} step={0.01} onChange={(v) => update("texlevel", v)} />
              <Dial name="Beat" value={params.binlevel} label={params.binaural === "off" ? "off" : binlevelLabel(params.binlevel)}
                min={0} max={1} step={0.01} onChange={(v) => update("binlevel", v)} />
              <Dial name="Glue" value={params.glue} label={glueLabel(params.glue)}
                min={0} max={1} step={0.01} onChange={(v) => update("glue", v)} />
            </div>
            <div className="mood-row spatial-row">
              <span className="row-label">Spatial</span>
              <button className={"chip lg" + (spatial ? " active" : "")} onClick={toggleSpatial}>
                <HeadphonesIcon /> {spatial ? "3D audio on" : "3D audio off"}
              </button>
              <span className="spatial-note">Places each voice in 3D to match the orrery — best with headphones.</span>
            </div>
          </div>
        )}

        {section === "atelier" && expert && (
          <div className="panel-body atelier" role="tabpanel" id="panel-atelier" aria-labelledby="tab-atelier">
            <p className="atelier-intro">
              Compose the ingredients by hand, then let them drift. Set a key and mode,
              choose the notes, and build each loop&rsquo;s instrument, note and length.
              Locked voices hold; the rest keep slowly roaming.
            </p>

            <div className="atelier-group">
              <span className="row-label">Key</span>
              <div className="key-row">
                {NOTE_NAMES.map((nm, i) => (
                  <button key={nm}
                    className={"key-btn" + (params.mood === "custom" && ((Math.round(params.key || 0)) % 12 + 12) % 12 === i ? " active" : "")}
                    onClick={() => pickKey(i)}>{nm}</button>
                ))}
              </div>
            </div>

            <div className="atelier-group">
              <span className="row-label">Mode</span>
              <div className="moods">
                {SCALE_ORDER.map((id) => (
                  <button key={id}
                    className={"mood" + (params.mood === "custom" && scaleMatches(id) ? " active" : "")}
                    onClick={() => pickScale(id)}>{SCALE_NAMES[id]}</button>
                ))}
              </div>
            </div>

            <div className="atelier-group">
              <span className="row-label">Notes</span>
              <div className="note-grid">
                {NOTE_NAMES.map((nm, i) => (
                  <button key={nm}
                    className={"note-chip" + (params.mood === "custom" && activeScaleNotes.indexOf(i) >= 0 ? " active" : "") + (i === 0 ? " tonic" : "")}
                    onClick={() => toggleScaleNote(i)}
                    title={"degree " + i}>{nm}</button>
                ))}
              </div>
              <p className="atelier-hint">Degrees from the key. The Mode buttons fill these; toggle to fine-tune.</p>
            </div>

            <div className="atelier-group">
              <div className="loom-head">
                <span className="row-label">Voices</span>
                <div className="loom-actions">
                  <button className="chip" onClick={captureField}>Capture field</button>
                  {loomSpecs.length > 0 && <button className="chip" onClick={clearLoom}>Return to generative</button>}
                </div>
              </div>

              {loomSpecs.length === 0 ? (
                <p className="atelier-hint">
                  The field is generative right now. <b>Capture field</b> to pin what you&rsquo;re hearing
                  into editable loops, then tweak each one.
                </p>
              ) : (
                <div className="loom">
                  {loomSpecs.map((spec, i) => {
                    let pool = scalePool();
                    if (spec.note != null && pool.indexOf(spec.note) < 0) pool = [spec.note].concat(pool);
                    return (
                      <div className="loom-row" key={i}>
                        <div className="loom-top">
                          <span className="loom-glyph"><GlyphSVG family={spec.inst && AE.INSTRUMENTS[spec.inst] ? AE.INSTRUMENTS[spec.inst].family : "piano"} /></span>
                          <select className="loom-select" value={spec.inst || "*"}
                            onChange={(e) => setVoiceField(i, { inst: e.target.value === "*" ? null : e.target.value })}>
                            <option value="*">✱ random</option>
                            {INSTRUMENT_KEYS.map((k) => (<option key={k} value={k}>{k}</option>))}
                          </select>
                          <select className="loom-select" value={spec.note == null ? "_" : String(spec.note)}
                            onChange={(e) => setVoiceField(i, { note: e.target.value === "_" ? null : +e.target.value })}>
                            <option value="_">roam</option>
                            {pool.map((m) => (<option key={m} value={m}>{noteLabel(m)}</option>))}
                          </select>
                          <button className={"loom-lock" + (spec.lock ? " on" : "")}
                            onClick={() => setVoiceField(i, { lock: !spec.lock })}
                            title={spec.lock ? "Locked — holds note & length" : "Unlocked — slowly roams"}>
                            {spec.lock ? <LockIcon /> : <UnlockIcon />}
                          </button>
                          <button className="loom-remove" onClick={() => removeVoice(i)} aria-label="Remove voice"><CloseIcon /></button>
                        </div>
                        <div className="loom-len">
                          <span className="loom-len-label">Length</span>
                          {spec.len == null ? (
                            <button className="chip mini loom-len-roam" onClick={() => setVoiceField(i, { len: 12 })}>roaming &middot; tap to pin</button>
                          ) : (
                            <>
                              <input type="range" className="loom-range" min={3.5} max={48} step={0.5}
                                value={spec.len} onChange={(e) => setVoiceField(i, { len: +e.target.value })} />
                              <span className="loom-len-val">{(+spec.len).toFixed(1)}s</span>
                              <button className="chip mini ghost" onClick={() => setVoiceField(i, { len: null })} title="let length roam">↺</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {loomSpecs.length < 12 && (
                    <button className="loom-add" onClick={addVoice}><PlusIcon /> Add voice</button>
                  )}
                </div>
              )}
            </div>

            <div className="atelier-group">
              <div className="loom-head">
                <span className="row-label">MIDI</span>
                <div className="loom-actions">
                  {!midiSupported ? (
                    <span className="atelier-hint">Not supported in this browser</span>
                  ) : !midiEnabled ? (
                    <button className="chip" onClick={enableMidi}>Enable MIDI</button>
                  ) : (
                    <span className="midi-devices">{midiInputs.length ? midiInputs.map((i) => i.name).join(", ") : "no devices connected"}</span>
                  )}
                </div>
              </div>
              {midiEnabled && (
                <>
                  <div className="midi-map">
                    {MIDI_CONTROLS.map((c) => {
                      const b = midiMap[c.id];
                      const learning = midiLearn === c.id;
                      return (
                        <div className={"midi-row" + (learning ? " learning" : "")} key={c.id}>
                          <span className="midi-label">{c.label}</span>
                          <span className="midi-binding">{b ? (b.type === "cc" ? "CC " + b.number : "Note " + b.number) : "—"}</span>
                          <button className={"chip mini" + (learning ? " active" : "")}
                            onClick={() => setMidiLearn(learning ? null : c.id)}>
                            {learning ? "move a control…" : "Learn"}
                          </button>
                          {b && <button className="chip mini ghost" onClick={() => clearMidiBinding(c.id)} title="clear binding">&times;</button>}
                        </div>
                      );
                    })}
                  </div>
                  <p className="atelier-hint">Click <b>Learn</b>, then move a knob/fader or press a key on your controller to bind it. Knobs map to the ranges; buttons/keys map to transport (Play, Start, Stop) and scene changes.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <div className="seed-block">
          <div className="seed-field">
            <label htmlFor="seed">Seed</label>
            <input id="seed" className="seed-input" type="number" value={params.seed}
              onChange={(e) => update("seed", Math.max(1, +e.target.value || 1))} />
          </div>
          <button className="ghost-btn" onClick={reshuffle}><DiceIcon /> Reshuffle</button>
          <button className="ghost-btn save-btn" onClick={saveCurrent}><SaveIcon /> Save this drift</button>
        </div>
        <div className="footer-right">
          <span className={"toast" + (savedToast ? " show" : "")}>kept in your library</span>
          <span className={"toast" + (copied ? " show" : "")}>link copied</span>
          <span className={"toast" + (expertToast ? " show" : "")}>Atelier unlocked &mdash; see the new tab</span>
          <span className={"toast" + (spatialToast ? " show" : "")}>Spatial audio on &mdash; best with headphones</span>
          {installPrompt && (
            <button className="ghost-btn" onClick={install}><InstallIcon /> Install app</button>
          )}
          <button className="ghost-btn" onClick={share}><LinkIcon /> Copy share link</button>
        </div>
      </footer>

      {immersive && (
        <div className={"viz-corner" + (vizUiVisible ? " show" : "")}>
          {breathOn && (
            <div className="breath-pats">
              {BREATH_ORDER.map((id) => (
                <button key={id}
                  className={"viz-chip mini" + (breathPat === id ? " active" : "")}
                  onClick={() => setBreathPat(id)}>
                  {BREATH_PATTERNS[id].name}
                </button>
              ))}
            </div>
          )}
          <button className={"viz-chip mini" + (vizMode === "space" ? " active" : "")}
            onClick={() => setVizMode((m) => (m === "space" ? "mandala" : "space"))}
            aria-label={vizMode === "space" ? "Switch to mandala" : "Switch to 3D space"}
            title={vizMode === "space" ? "Mandala view" : "3D space view"}>
            {vizMode === "space" ? <VizIcon /> : <CubeIcon />}
          </button>
          <button className={"viz-chip mini" + (spatial ? " active" : "")}
            onClick={toggleSpatial}
            aria-label={spatial ? "Spatial audio on" : "Spatial audio off"}
            title={spatial ? "Spatial audio on (headphones)" : "Spatial audio off"}>
            <HeadphonesIcon />
          </button>
          <button className="viz-chip mini" onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Windowed" : "Fullscreen"}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </button>
        </div>
      )}

      {immersive && breathOn && vizMode === "space" && (
        <div className="breath-overlay" aria-hidden="true">
          <div className="breath-ring" ref={breathRingRef}></div>
          <div className="breath-cue">
            <span className="breath-label" ref={breathLabelRef}></span>
            <span className="breath-count" ref={breathCountRef}></span>
          </div>
        </div>
      )}

      {immersive && (
        <div className={"cast-caption" + (vizUiVisible ? " show" : "")}>
          <b>The Drift</b>
          <span className="dot">&middot;</span>
          <span>{ensembleName}</span>
          <span className="dot">&middot;</span>
          <span>{moodName}</span>
          {activeScene && (<><span className="dot">&middot;</span><span>{activeScene}</span></>)}
        </div>
      )}

      {immersive && sessionEnd > 0 && (
        <div className="session-immersive">
          <span className="session-immersive-ico" aria-hidden="true"><BellIcon /></span>
          {fmt(sessionRemain)}
        </div>
      )}

      {immersive && journey && sessionEnd === 0 && (
        <div className={"session-immersive" + (vizUiVisible ? " show" : "")}>
          <span className="journey-immersive-name">{journey.name}</span>
          <span className="session-meta-sep">&middot;</span>
          {fmt(journeyRemain)}
        </div>
      )}

      {immersive && driftOn && !journey && sessionEnd === 0 && (
        <div className={"session-immersive" + (vizUiVisible ? " show" : "")}>
          <span className="journey-immersive-name">Endless Drift</span>
          <span className="session-meta-sep">&middot;</span>
          {driftNow}
        </div>
      )}

      {immersive && (
        <button
          className={"mandala-core" + (playing ? " playing" : " paused") + (vizUiVisible ? " ui" : "") + (breathOn ? " breath" : "")}
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      )}

      {immersive && (
        <div className={"dock" + (vizUiVisible ? " show" : "")}>
          <span className="dock-time">{fmt(elapsed)}</span>
          <span className="dock-sep" aria-hidden="true"></span>
          <button className="dock-item" onClick={() => setImmersive(false)}>
            <SlidersIcon /><span>Sound</span>
          </button>
          <button className={"dock-item" + (breathOn ? " on" : "")} onClick={() => setBreathOn((b) => !b)}>
            <BreathIcon /><span>Breathe</span>
          </button>
          <button className={"dock-item" + (sessionEnd > 0 ? " on" : "")}
            onClick={() => setSheet((s) => (s === "session" ? null : "session"))}>
            <BellIcon /><span>Session</span>
          </button>
          <button className={"dock-item" + ((journey || driftOn) ? " on" : "")}
            onClick={() => setSheet((s) => (s === "journey" ? null : "journey"))}>
            <RouteIcon /><span>Journey</span>
          </button>
          <span className="dock-sep" aria-hidden="true"></span>
          <button className="dock-icon" onClick={() => setSheet((s) => (s === "info" ? null : "info"))} aria-label="About The Drift">
            <InfoIcon />
          </button>
        </div>
      )}

      {immersive && sheet && (
        <div className="sheet-scrim" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-x" onClick={() => setSheet(null)} aria-label="Close"><CloseIcon /></button>

            {sheet === "session" && (
              <div className="sheet-body">
                {!sessionEnd ? (
                  <>
                    <h2 className="sheet-title">Session</h2>
                    <p className="sheet-lede">A timed sit, opened and closed by a singing bowl.</p>
                    <div className="sheet-group">
                      <span className="sheet-label">Length</span>
                      <div className="session-chips">
                        {SESSION_OPTS.map((m) => (
                          <button key={m} className={"chip lg" + (sessionPick === m ? " active" : "")}
                            onClick={() => setSessionPick(m)}>{m} min</button>
                        ))}
                      </div>
                    </div>
                    <div className="sheet-group">
                      <span className="sheet-label">Interval bell</span>
                      <div className="session-chips">
                        {INTERVAL_OPTS.map((m) => (
                          <button key={m} className={"chip lg" + (sessionInterval === m ? " active" : "")}
                            onClick={() => setSessionInterval(m)}>{m === 0 ? "None" : "every " + m + "m"}</button>
                        ))}
                      </div>
                    </div>
                    <button className="session-begin" onClick={() => { beginSession(sessionPick); setSheet(null); }}>
                      <BellIcon /> Begin {sessionPick}-minute session
                    </button>
                    <div className="sheet-group sheet-aside">
                      <span className="sheet-label">Or drift off &mdash; fade to sleep</span>
                      <div className="session-chips">
                        {SLEEP_OPTS.map((m) => (
                          <button key={m} className={"chip lg" + (sleepDur === m ? " active" : "")}
                            onClick={() => { setSleep(sleepDur === m ? 0 : m); setSheet(null); }}>{m} min</button>
                        ))}
                      </div>
                    </div>
                    <div className="sheet-group">
                      <span className="sheet-label">Or wake gently &mdash; sunrise rise</span>
                      <div className="session-chips">
                        {WAKE_OPTS.map((m) => (
                          <button key={m} className={"chip lg" + (wakeIn === m ? " active" : "")}
                            onClick={() => { setWake(wakeIn === m ? 0 : m); setSheet(null); }}>
                            {m < 60 ? m + " min" : (m / 60) + "h"}
                          </button>
                        ))}
                      </div>
                      {wakeAt > 0 && !wakeRising && (
                        <div className="wake-status">
                          <SunriseIcon /> Rising in <em>{fmtUntil((wakeAt - Date.now()) / 1000)}</em>
                          <button className="export-again" onClick={() => setWake(0)}>Cancel</button>
                        </div>
                      )}
                      {wakeRising && (
                        <div className="wake-status rising">
                          <SunriseIcon /> Sunrise &mdash; rising now
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="session-live">
                    <h2 className="sheet-title">Session</h2>
                    <div className="session-clock">{fmt(sessionRemain)}</div>
                    <div className="session-bar"><div className="session-bar-fill"
                      style={{ width: (sessionTotal ? Math.min(100, (1 - sessionRemain / sessionTotal) * 100) : 0) + "%" }}></div></div>
                    <div className="session-meta">
                      {sessionInterval > 0 ? <span><BellIcon /> bell every {sessionInterval} min</span> : <span>silence between the bells</span>}
                    </div>
                    <button className="session-begin end" onClick={() => { endSession(); setSheet(null); }}>End session</button>
                  </div>
                )}
              </div>
            )}

            {sheet === "journey" && (
              <div className="sheet-body">
                {journey ? (
                  <div className="journey-live">
                    <h2 className="sheet-title">{journey.name}</h2>
                    <div className="journey-live-top">
                      <span className="journey-live-time">{fmt(journeyRemain)} left</span>
                    </div>
                    <div className="journey-track">
                      <div className="journey-track-fill" style={{ width: ((1 - journeyRemain / (journey.total * 60)) * 100) + "%" }}></div>
                      {journey.stops.map((nm, i) => {
                        const n = journey.stops.length;
                        return <span key={i} className={"journey-node" + (i <= journeyStop ? " reached" : "")} style={{ left: (i / (n - 1)) * 100 + "%" }} title={nm}></span>;
                      })}
                    </div>
                    <div className="journey-path">
                      {journey.stops.map((nm, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="journey-arrow">&rarr;</span>}
                          <span className={"journey-stopname" + (i === journeyStop ? " now" : "") + (i < journeyStop ? " past" : "")}>{nm}</span>
                        </React.Fragment>
                      ))}
                    </div>
                    <button className="session-begin end" onClick={() => { cancelJourney(); setSheet(null); }}>End journey</button>
                  </div>
                ) : driftOn ? (
                  <div className="journey-live">
                    <h2 className="sheet-title">Endless Drift</h2>
                    <p className="sheet-lede">Wandering gently between kindred scenes. It never ends &mdash; stop it whenever you like.</p>
                    <div className="drift-now">
                      <span className="drift-now-name">{driftNow}</span>
                      <span className="journey-arrow drift-to">&rarr;</span>
                      <span className="drift-next-name">{driftNext}</span>
                    </div>
                    <div className="journey-track">
                      <div className="journey-track-fill" style={{ width: (driftProgress * 100) + "%" }}></div>
                    </div>
                    <div className="drift-cap">drifting toward <em>{driftNext}</em></div>
                    <button className="session-begin end" onClick={() => { cancelDrift(); setSheet(null); }}>End drift</button>
                  </div>
                ) : (
                  <>
                    <h2 className="sheet-title">Journeys</h2>
                    <p className="sheet-lede">Timed arcs that travel between scenes &mdash; the mandala leads, you follow.</p>
                    <button className="journey-card drift-card" onClick={() => { beginDrift(); setSheet(null); }}>
                      <div className="journey-card-top">
                        <span className="journey-card-name">Endless Drift</span>
                        <span className="journey-card-dur">&infin;</span>
                      </div>
                      <p className="journey-card-blurb">A never-ending wander between kindred calm scenes &mdash; set it and let it run.</p>
                      <div className="journey-card-path">
                        {DRIFT_POOL.slice(0, 4).map((nm, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span className="journey-arrow">&middot;</span>}
                            <span>{nm}</span>
                          </React.Fragment>
                        ))}
                        <span className="journey-arrow">&hellip;</span>
                      </div>
                    </button>
                    <div className="journey-cards">
                      {JOURNEYS.map((j) => (
                        <button key={j.id} className="journey-card" onClick={() => { beginJourney(j); setSheet(null); }}>
                          <div className="journey-card-top">
                            <span className="journey-card-name">{j.name}</span>
                            <span className="journey-card-dur">{j.total} min</span>
                          </div>
                          <p className="journey-card-blurb">{j.blurb}</p>
                          <div className="journey-card-path">
                            {j.stops.map((nm, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && <span className="journey-arrow">&rarr;</span>}
                                <span>{nm}</span>
                              </React.Fragment>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {sheet === "info" && (
              <div className="sheet-body">
                <div className="info-eyebrow">Generative Ambient System</div>
                <h2 className="info-title">The Drift<em>.</em></h2>
                <p className="info-sub">
                  Unequal loops, each a single held note, drifting endlessly in and out of phase
                  &mdash; so the music never repeats.
                </p>
                <p className="info-now">Now playing &middot; {ensembleName} &middot; {moodName}{activeScene ? " · " + activeScene : ""}</p>
                <div className="info-actions">
                  <button className="ghost-btn accent" onClick={() => setSheet("export")}><DownloadIcon /> Export this drift</button>
                  <button className="ghost-btn" onClick={() => { setSheet(null); setImmersive(false); }}><SlidersIcon /> Open Sound &amp; tuning</button>
                  <button className="ghost-btn" onClick={share}>{copied ? "Link copied" : "Copy share link"}</button>
                  <button className="ghost-btn" onClick={toggleFullscreen}>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</button>
                  {installPrompt && <button className="ghost-btn" onClick={install}>Install app</button>}
                </div>
                <div className="info-foot">headphones recommended &middot; tuned to <em>{activeScene || moodName}</em></div>
              </div>
            )}

            {sheet === "export" && (
              <div className="sheet-body">
                <h2 className="sheet-title">Export this drift</h2>
                <p className="sheet-lede">Render what&rsquo;s playing now to a WAV file you can keep &mdash; the loops will keep phasing for the whole length, so it never loops.</p>
                <div className="sheet-group">
                  <span className="sheet-label">Length</span>
                  <div className="session-chips">
                    {EXPORT_OPTS.map((m) => (
                      <button key={m}
                        className={"chip lg" + (exportMin === m ? " active" : "")}
                        disabled={exportState === "rendering"}
                        onClick={() => setExportMin(m)}>{m} min</button>
                    ))}
                  </div>
                </div>
                {exportState === "rendering" ? (
                  <div className="export-progress">
                    <div className="session-bar"><div className="session-bar-fill" style={{ width: Math.round(exportPct * 100) + "%" }}></div></div>
                    <div className="export-status">Rendering &amp; normalising&hellip; {Math.round(exportPct * 100)}%</div>
                  </div>
                ) : (
                  <button className="session-begin" onClick={() => doExport(exportMin)}>
                    <DownloadIcon /> Render {exportMin}-minute WAV
                  </button>
                )}
                {exportState === "done" && <div className="export-status done">Saved &mdash; check your downloads. <button className="export-again" onClick={() => doExport(exportMin)}>Render another</button></div>}
                {exportState === "error" && <div className="export-status err">Render failed &mdash; try a shorter length.</div>}
                <div className="info-foot">{ensembleName} &middot; {moodName}{activeScene ? " · " + activeScene : ""} &middot; 44.1kHz stereo WAV</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showWelcome && (
        <div className={"welcome" + (welcomeHiding ? " hide" : "")}>
          <div className="welcome-rings" aria-hidden="true">
            <i></i><i></i><i></i><i></i>
            <span className="seed"></span>
            <span className="core"></span>
          </div>
          <div className="welcome-word">
            <div className="welcome-eyebrow">Generative Ambient System</div>
            <h1 className="welcome-title">The Drift<em>.</em></h1>
            <p className="welcome-sub">
              Unequal loops, each a single held note, drifting endlessly in and
              out of phase &mdash; so the music never repeats.
            </p>
            <p className="welcome-whisper">{welcomeWhisper(new Date().getHours())}</p>
          </div>
          <button className="welcome-begin" onClick={begin}>
            <PlayIcon /> Begin the drift
          </button>
          <div className="welcome-foot">
            {partOfDay(new Date().getHours()).toLowerCase()} &middot; tuned to <em>{WELCOME.name}</em> &middot; headphones recommended
          </div>
        </div>
      )}
    </div>
  );
}
