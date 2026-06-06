import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { TEXTURES, BRAINWAVES } from '../../constants.js';

// Ambience texture bed (multi-select) and binaural brainwave layer.
export function AtmosphereSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const toggleTexture = useDriftStore((s) => s.toggleTexture);
  const texSet = new Set((params.texture || "").split(".").filter(Boolean));

  return (
    <div className="panel-body" role="tabpanel" id="panel-atmos" aria-labelledby="tab-atmos">
      <div className="mood-row">
        <span className="row-label">Ambience</span>
        <div className="moods">
          {TEXTURES.map((t) => (
            <button key={t.id}
              className={"mood" + (texSet.has(t.id) ? " active" : "")}
              onClick={() => toggleTexture(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mood-row">
        <span className="row-label">Brainwaves</span>
        <div className="moods">
          {BRAINWAVES.map((b) => (
            <button key={b.id}
              className={"mood" + (params.binaural === b.id ? " active" : "")}
              onClick={() => update("binaural", b.id)}
              title={b.hz ? b.hz + " · " + b.note : "Binaural beats off"}>
              {b.name}
            </button>
          ))}
          {params.binaural !== "off" && (() => {
            const b = BRAINWAVES.find((x) => x.id === params.binaural);
            return b ? <span className="bin-note">{b.hz} &middot; {b.note} &middot; headphones</span> : null;
          })()}
        </div>
      </div>
    </div>
  );
}
