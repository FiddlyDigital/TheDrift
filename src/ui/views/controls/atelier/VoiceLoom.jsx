import React from 'react';
import { ENGINE, parseVoices, buildScalePool } from '../../../../engine/index.js';
import { useDriftStore } from '../../../store/useDriftStore.js';
import { PlusIcon } from '../../../icons.jsx';
import { LoomRow } from './LoomRow.jsx';

// The voice loom: pin the generative field into editable voices, then tweak
// instrument / note / length / lock per voice.
export function VoiceLoom() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);

  const loomSpecs = parseVoices(params.voices);
  const INSTRUMENT_KEYS = Object.keys(ENGINE.constructor.INSTRUMENTS || {});
  const { pool } = buildScalePool(params);

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
            let rowPool = pool;
            if (spec.note != null && rowPool.indexOf(spec.note) < 0) rowPool = [spec.note].concat(rowPool);
            return (
              <LoomRow key={i} spec={spec} pool={rowPool} instKeys={INSTRUMENT_KEYS}
                onField={(patch) => setVoiceField(i, patch)} onRemove={() => removeVoice(i)} />
            );
          })}
          {loomSpecs.length < 12 && (
            <button className="loom-add" onClick={addVoice}><PlusIcon /> Add voice</button>
          )}
        </div>
      )}
    </div>
  );
}
