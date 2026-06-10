import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { GANZFELD_PROGRAM } from '../../constants.js';
import { fmt } from '../../format.js';

// Ganzfeld sheet: a live programme's progress + end control, or the launcher
// (what it is, the moderated-flicker opt-in, and Begin).
export function GanzfeldSheet() {
  const ganzfeld = useDriftStore((s) => s.ganzfeld);
  const ganzfeldPhase = useDriftStore((s) => s.ganzfeldPhase);
  const ganzfeldElapsed = useDriftStore((s) => s.ganzfeldElapsed);
  const beginGanzfeld = useDriftStore((s) => s.beginGanzfeld);
  const cancelGanzfeld = useDriftStore((s) => s.cancelGanzfeld);
  const ganzfeldStrobe = useDriftStore((s) => s.ganzfeldStrobe);
  const toggleGanzfeldStrobe = useDriftStore((s) => s.toggleGanzfeldStrobe);
  const setSheet = useDriftStore((s) => s.setSheet);

  const prog = GANZFELD_PROGRAM;

  if (ganzfeld) {
    const phases = prog.phases;
    const idx = Math.max(0, ganzfeldPhase);
    const here = phases[idx];
    return (
      <div className="sheet-body">
        <div className="journey-live">
          <h2 className="sheet-title">{prog.name}</h2>
          <div className="journey-live-top">
            <span className="journey-live-time">{fmt(ganzfeldElapsed)} in &middot; {here.name}</span>
          </div>
          <div className="journey-path">
            {phases.map((p, i) => (
              <React.Fragment key={p.name}>
                {i > 0 && <span className="journey-arrow">&rarr;</span>}
                <span className={"journey-stopname" + (i === idx ? " now" : "") + (i < idx ? " past" : "")}>{p.name}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="drift-cap">{here.note}</div>
          <button className="session-begin end" onClick={() => { cancelGanzfeld(); setSheet(null); }}>End Ganzfeld</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-body">
      <h2 className="sheet-title">Ganzfeld</h2>
      <p className="sheet-lede">{prog.blurb}</p>
      <div className="ganz-phases">
        {prog.phases.map((p) => (
          <div key={p.name} className="ganz-phase">
            <span className="ganz-phase-at">{p.at}′</span>
            <span className="ganz-phase-name">{p.name}</span>
            <span className="ganz-phase-note">{p.note}</span>
          </div>
        ))}
      </div>

      <button className={"ganz-strobe" + (ganzfeldStrobe ? " on" : "")} onClick={toggleGanzfeldStrobe}
        role="switch" aria-checked={ganzfeldStrobe}>
        <span className="ganz-strobe-text">
          <span className="ganz-strobe-title">Moderated flicker</span>
          <span className="ganz-strobe-sub">A gentle, bounded light pulse in the deep phase. Off by default; never runs under reduce-motion.</span>
        </span>
        <span className="ganz-strobe-state">{ganzfeldStrobe ? "On" : "Off"}</span>
      </button>

      <p className="ganz-tip">Best with eyes closed or facing a soft, even light. Settle in and let it carry you.</p>
      <button className="session-begin" onClick={() => { beginGanzfeld({ strobe: ganzfeldStrobe }); setSheet(null); }}>
        Begin Ganzfeld
      </button>
    </div>
  );
}
