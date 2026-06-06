import React from 'react';
import { ENGINE, parseScaleNotes, parseVoices } from '../../../engine/index.js';
import { useDriftStore } from '../../store/useDriftStore.js';
import { MIDI_CONTROLS } from '../../store/midiSlice.js';
import { SCALES, SCALE_ORDER, SCALE_NAMES, NOTE_NAMES } from '../../constants.js';
import { GlyphSVG } from '../../glyphs.jsx';
import { LockIcon, UnlockIcon, CloseIcon, PlusIcon } from '../../icons.jsx';

// Hidden expert section: hand-compose key, mode, notes, the per-voice loom and
// MIDI mappings. Kept as one cohesive component in Phase 1 (a finer split into
// ScaleEditor / VoiceLoom / MidiPanel is deferred to Phase 2).
export function AtelierSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const midiSupported = useDriftStore((s) => s.midiSupported);
  const midiEnabled = useDriftStore((s) => s.midiEnabled);
  const midiInputs = useDriftStore((s) => s.midiInputs);
  const midiLearn = useDriftStore((s) => s.midiLearn);
  const midiMap = useDriftStore((s) => s.midiMap);
  const enableMidi = useDriftStore((s) => s.enableMidi);
  const setMidiLearn = useDriftStore((s) => s.setMidiLearn);
  const clearMidiBinding = useDriftStore((s) => s.clearMidiBinding);

  const AE = ENGINE.constructor;
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
  );
}
