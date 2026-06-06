import React from 'react';
import { ENGINE } from '../../../engine/index.js';
import { useDriftStore } from '../../store/useDriftStore.js';
import { TUNINGS } from '../../constants.js';
import { ChipGroup } from './ChipGroup.jsx';

// Mood, ensemble and concert tuning.
export function VoiceSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const AE = ENGINE.constructor;

  return (
    <div className="panel-body" role="tabpanel" id="panel-voice" aria-labelledby="tab-voice">
      <ChipGroup label="Mood" options={AE.MOOD_ORDER} getKey={(m) => m}
        isActive={(m) => params.mood === m} onPick={(m) => update("mood", m)}
        renderOption={(m) => AE.MOODS[m].name} />

      <ChipGroup label="Ensemble" options={AE.ENSEMBLE_ORDER} getKey={(m) => m}
        isActive={(m) => params.ensemble === m} onPick={(m) => update("ensemble", m)}
        renderOption={(m) => AE.ENSEMBLES[m].name} />

      <ChipGroup label="Tuning" options={TUNINGS} getKey={(t) => t.hz}
        containerClass="moods tunings" buttonClass="tuning-opt"
        isActive={(t) => params.tuning === t.hz} onPick={(t) => update("tuning", t.hz)}
        getTitle={(t) => t.title}
        renderOption={(t) => (<><span className="tuning-hz">{t.name}</span><span className="tuning-note">{t.note}</span></>)} />
    </div>
  );
}
