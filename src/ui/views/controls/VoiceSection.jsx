import React from 'react';
import { ENGINE } from '../../../engine/index.js';
import { useDriftStore } from '../../store/useDriftStore.js';
import { TUNINGS } from '../../constants.js';

// Mood, ensemble and concert tuning.
export function VoiceSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const AE = ENGINE.constructor;

  return (
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
  );
}
