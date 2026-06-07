import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { Dial } from '../../components/Dial.jsx';
import { HeadphonesIcon } from '../../icons.jsx';
import { pctLabel, texlevelLabel, binlevelLabel, glueLabel, sidechainLabel } from '../../labels.js';

// Per-layer levels under one master, plus the spatial-audio toggle.
export function MixerSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const volume = useDriftStore((s) => s.volume);
  const setVolume = useDriftStore((s) => s.setVolume);
  const spatial = useDriftStore((s) => s.spatial);
  const toggleSpatial = useDriftStore((s) => s.toggleSpatial);

  return (
    <div className="panel-body" role="tabpanel" id="panel-mixer" aria-labelledby="tab-mixer">
      <p className="mixer-intro">Balance the layers — the music, the ambience bed and the binaural tones each have their own level, under one master.</p>
      <div className="dials">
        <Dial name="Master" value={volume} label={pctLabel(volume)}
          min={0} max={1} step={0.01} onChange={setVolume} />
        <Dial name="Loops" value={params.looplevel} label={pctLabel(params.looplevel)}
          min={0} max={1} step={0.01} onChange={(v) => update("looplevel", v)} />
        <Dial name="Ambience" value={params.texlevel} label={texlevelLabel(params.texlevel)}
          min={0} max={1} step={0.01} onChange={(v) => update("texlevel", v)} />
        <Dial name="Beat" value={params.binlevel} label={params.binaural === "off" ? "off" : binlevelLabel(params.binlevel)}
          min={0} max={1} step={0.01} onChange={(v) => update("binlevel", v)} />
        <Dial name="Glue" value={params.glue} label={glueLabel(params.glue)}
          min={0} max={1} step={0.01} onChange={(v) => update("glue", v)} />
        <Dial name="Sidechain" value={params.sidechain == null ? 0 : params.sidechain} label={sidechainLabel(params.sidechain == null ? 0 : params.sidechain)}
          min={0} max={1} step={0.01} onChange={(v) => update("sidechain", v)} />
      </div>
      <div className="mood-row spatial-row">
        <span className="row-label">Spatial</span>
        <button className={"chip lg" + (spatial ? " active" : "")} onClick={toggleSpatial}>
          <HeadphonesIcon /> {spatial ? "3D audio on" : "3D audio off"}
        </button>
        <span className="spatial-note">Places each voice in 3D to match the orrery — best with headphones.</span>
      </div>
    </div>
  );
}
