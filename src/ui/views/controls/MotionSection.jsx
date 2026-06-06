import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { parseVoices } from '../../../engine/index.js';
import { Dial } from '../../components/Dial.jsx';
import {
  tempoLabel, driftLabel, registerLabel, evolveLabel, journeyLabel,
} from '../../labels.js';

// Density, tempo, drift, register, evolve and journey dials. When the Atelier
// loom is in use, density is pinned and read-only.
export function MotionSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const loomSpecs = parseVoices(params.voices);

  return (
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
  );
}
