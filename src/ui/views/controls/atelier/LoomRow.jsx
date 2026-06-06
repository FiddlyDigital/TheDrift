import React from 'react';
import { ENGINE } from '../../../../engine/index.js';
import { GlyphSVG } from '../../../glyphs.jsx';
import { LockIcon, UnlockIcon, CloseIcon } from '../../../icons.jsx';
import { noteLabel } from '../../../format.js';

// One voice in the loom: instrument, note, lock and length. Presentational —
// the note pool and all edits come in via props.
export function LoomRow({ spec, pool, instKeys, onField, onRemove }) {
  const AE = ENGINE.constructor;
  const family = spec.inst && AE.INSTRUMENTS[spec.inst] ? AE.INSTRUMENTS[spec.inst].family : "piano";

  return (
    <div className="loom-row">
      <div className="loom-top">
        <span className="loom-glyph"><GlyphSVG family={family} /></span>
        <select className="loom-select" value={spec.inst || "*"}
          onChange={(e) => onField({ inst: e.target.value === "*" ? null : e.target.value })}>
          <option value="*">✱ random</option>
          {instKeys.map((k) => (<option key={k} value={k}>{k}</option>))}
        </select>
        <select className="loom-select" value={spec.note == null ? "_" : String(spec.note)}
          onChange={(e) => onField({ note: e.target.value === "_" ? null : +e.target.value })}>
          <option value="_">roam</option>
          {pool.map((m) => (<option key={m} value={m}>{noteLabel(m)}</option>))}
        </select>
        <button className={"loom-lock" + (spec.lock ? " on" : "")}
          onClick={() => onField({ lock: !spec.lock })}
          title={spec.lock ? "Locked — holds note & length" : "Unlocked — slowly roams"}>
          {spec.lock ? <LockIcon /> : <UnlockIcon />}
        </button>
        <button className="loom-remove" onClick={onRemove} aria-label="Remove voice"><CloseIcon /></button>
      </div>
      <div className="loom-len">
        <span className="loom-len-label">Length</span>
        {spec.len == null ? (
          <button className="chip mini loom-len-roam" onClick={() => onField({ len: 12 })}>roaming &middot; tap to pin</button>
        ) : (
          <>
            <input type="range" className="loom-range" min={3.5} max={48} step={0.5}
              value={spec.len} onChange={(e) => onField({ len: +e.target.value })} />
            <span className="loom-len-val">{(+spec.len).toFixed(1)}s</span>
            <button className="chip mini ghost" onClick={() => onField({ len: null })} title="let length roam">↺</button>
          </>
        )}
      </div>
    </div>
  );
}
