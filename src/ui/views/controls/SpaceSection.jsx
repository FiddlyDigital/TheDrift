import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { Dial } from '../../components/Dial.jsx';
import { spaceLabel, colorLabel, bloomLabel, stutterLabel } from '../../labels.js';

// Reverb space, tone color, bloom and stutter dials.
export function SpaceSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);

  return (
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
  );
}
