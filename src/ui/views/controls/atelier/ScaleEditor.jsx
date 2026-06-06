import React from 'react';
import { parseScaleNotes } from '../../../../engine/index.js';
import { useDriftStore } from '../../../store/useDriftStore.js';
import { SCALES, SCALE_ORDER, SCALE_NAMES, NOTE_NAMES } from '../../../constants.js';

// Atelier scale editing: key, mode and the per-degree note grid. Any edit flips
// the mood to "custom" so the engine reads key + scaleNotes.
export function ScaleEditor() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const activeScaleNotes = parseScaleNotes(params.scaleNotes);

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

  return (
    <>
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
    </>
  );
}
