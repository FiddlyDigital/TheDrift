import React, { useMemo } from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { TEXTURES, BRAINWAVES, BEAT_MODES } from '../../constants.js';
import { ChipGroup } from './ChipGroup.jsx';

// The audible atmosphere: the ambience texture bed and the brainwave-beat layer
// (with its delivery mode). The breath guide and the optional light entrainment
// are experiential and live in the immersive dock, not here.
export function AtmosphereSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const toggleTexture = useDriftStore((s) => s.toggleTexture);
  const beatmode = useDriftStore((s) => s.beatmode);
  const setBeatMode = useDriftStore((s) => s.setBeatMode);
  const texSet = useMemo(() => new Set((params.texture || "").split(".").filter(Boolean)), [params.texture]);

  const beatOn = params.binaural !== "off";

  return (
    <div className="panel-body" role="tabpanel" id="panel-atmos" aria-labelledby="tab-atmos">
      <ChipGroup label="Ambience" options={TEXTURES} getKey={(t) => t.id}
        isActive={(t) => texSet.has(t.id)} onPick={(t) => toggleTexture(t.id)}
        renderOption={(t) => t.name} />

      <ChipGroup label="Brainwaves" options={BRAINWAVES} getKey={(b) => b.id}
        isActive={(b) => params.binaural === b.id} onPick={(b) => update("binaural", b.id)}
        getTitle={(b) => b.hz ? b.hz + " · " + b.note : "Brainwave beats off"}
        renderOption={(b) => b.name}>
        {beatOn && (() => {
          const b = BRAINWAVES.find((x) => x.id === params.binaural);
          const m = BEAT_MODES.find((x) => x.id === beatmode);
          return b ? <span className="bin-note">{b.hz} &middot; {b.note}{m ? " · " + m.name.toLowerCase() : ""}</span> : null;
        })()}
      </ChipGroup>

      {beatOn && (
        <ChipGroup label="Beat mode" options={BEAT_MODES} getKey={(m) => m.id}
          isActive={(m) => beatmode === m.id} onPick={(m) => setBeatMode(m.id)}
          getTitle={(m) => m.note} renderOption={(m) => m.name} />
      )}

      <p className="atmos-note">
        The breath guide and light entrainment live in the dock at the bottom of the mandala.
      </p>
    </div>
  );
}
