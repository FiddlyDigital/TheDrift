import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { TEXTURES, BRAINWAVES, BEAT_MODES, BREATH_PATTERNS, BREATH_ORDER, BREATH_RATE_MIN, BREATH_RATE_MAX } from '../../constants.js';
import { ChipGroup } from './ChipGroup.jsx';
import { Dial } from '../../components/Dial.jsx';

// Ambience texture bed, the brainwave-beat layer (with delivery mode + optional
// light entrainment), and the breath guide — the focus/meditation controls.
export function AtmosphereSection() {
  const params = useDriftStore((s) => s.params);
  const update = useDriftStore((s) => s.update);
  const toggleTexture = useDriftStore((s) => s.toggleTexture);
  const beatmode = useDriftStore((s) => s.beatmode);
  const setBeatMode = useDriftStore((s) => s.setBeatMode);
  const entrainViz = useDriftStore((s) => s.entrainViz);
  const toggleEntrainViz = useDriftStore((s) => s.toggleEntrainViz);
  const breathOn = useDriftStore((s) => s.breathOn);
  const setBreathOn = useDriftStore((s) => s.setBreathOn);
  const breathPat = useDriftStore((s) => s.breathPat);
  const setBreathPat = useDriftStore((s) => s.setBreathPat);
  const breathRate = useDriftStore((s) => s.breathRate);
  const setBreathRate = useDriftStore((s) => s.setBreathRate);
  const breathAudible = useDriftStore((s) => s.breathAudible);
  const setBreathAudible = useDriftStore((s) => s.setBreathAudible);
  const texSet = new Set((params.texture || "").split(".").filter(Boolean));

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

      {beatOn && (
        <div className="mood-row">
          <span className="row-label">Entrain light</span>
          <button className={"chip lg" + (entrainViz ? " active" : "")} onClick={toggleEntrainViz}>
            {entrainViz ? "Pulsing with the beat" : "Off"}
          </button>
          <span className="spatial-note">Gently pulses the light in time with the beat. Slow bands only.</span>
        </div>
      )}

      <ChipGroup label="Breath" options={BREATH_ORDER} getKey={(id) => id}
        isActive={(id) => breathOn && breathPat === id}
        onPick={(id) => { if (breathOn && breathPat === id) { setBreathOn(false); } else { setBreathPat(id); setBreathOn(true); } }}
        renderOption={(id) => BREATH_PATTERNS[id].name} />

      {breathOn && (
        <>
          <div className="mood-row">
            <span className="row-label">Breathe with sound</span>
            <button className={"chip lg" + (breathAudible ? " active" : "")} onClick={() => setBreathAudible((v) => !v)}>
              {breathAudible ? "On" : "Silent"}
            </button>
            <span className="spatial-note">The field swells with your in-breath and settles as you exhale.</span>
          </div>
          {breathPat === "calm" && (
            <div className="dials">
              <Dial name="Rate" value={breathRate} label={breathRate.toFixed(1) + "/min"}
                min={BREATH_RATE_MIN} max={BREATH_RATE_MAX} step={0.5} onChange={setBreathRate} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
