import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { TEXTURES, BRAINWAVES } from '../../constants.js';
import { ChipGroup } from './ChipGroup.jsx';

// Ambience texture bed (multi-select) and binaural brainwave layer.
export function AtmosphereSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const toggleTexture = useDriftStore((s) => s.toggleTexture);
  const texSet = new Set((params.texture || "").split(".").filter(Boolean));

  return (
    <div className="panel-body" role="tabpanel" id="panel-atmos" aria-labelledby="tab-atmos">
      <ChipGroup label="Ambience" options={TEXTURES} getKey={(t) => t.id}
        isActive={(t) => texSet.has(t.id)} onPick={(t) => toggleTexture(t.id)}
        renderOption={(t) => t.name} />

      <ChipGroup label="Brainwaves" options={BRAINWAVES} getKey={(b) => b.id}
        isActive={(b) => params.binaural === b.id} onPick={(b) => update("binaural", b.id)}
        getTitle={(b) => b.hz ? b.hz + " · " + b.note : "Binaural beats off"}
        renderOption={(b) => b.name}>
        {params.binaural !== "off" && (() => {
          const b = BRAINWAVES.find((x) => x.id === params.binaural);
          return b ? <span className="bin-note">{b.hz} &middot; {b.note} &middot; headphones</span> : null;
        })()}
      </ChipGroup>
    </div>
  );
}
