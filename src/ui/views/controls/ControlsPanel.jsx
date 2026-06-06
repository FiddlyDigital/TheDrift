import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { SECTIONS } from '../../constants.js';
import { ScenesSection } from './ScenesSection.jsx';
import { VoiceSection } from './VoiceSection.jsx';
import { MotionSection } from './MotionSection.jsx';
import { SpaceSection } from './SpaceSection.jsx';
import { AtmosphereSection } from './AtmosphereSection.jsx';
import { MixerSection } from './MixerSection.jsx';
import { AtelierSection } from './AtelierSection.jsx';

const PANELS = {
  scenes: ScenesSection,
  voice: VoiceSection,
  motion: MotionSection,
  space: SpaceSection,
  atmos: AtmosphereSection,
  mixer: MixerSection,
};

// Tabbed control panel (Sound view). The hidden Atelier tab appears only when
// expert mode is unlocked.
export function ControlsPanel() {
  const section = useDriftStore((s) => s.section);
  const setSection = useDriftStore((s) => s.setSection);
  const expert = useDriftStore((s) => s.expert);
  const sections = expert ? SECTIONS.concat([{ id: "atelier", name: "Atelier" }]) : SECTIONS;
  const Panel = PANELS[section];

  return (
    <div className="controls">
      <nav className="panel-tabs" role="tablist" aria-label="Control sections">
        {sections.map((s) => (
          <button key={s.id} role="tab" id={"tab-" + s.id}
            aria-selected={section === s.id}
            aria-controls={"panel-" + s.id}
            className={"panel-tab" + (section === s.id ? " active" : "") + (s.id === "atelier" ? " atelier-tab" : "")}
            onClick={() => setSection(s.id)}>
            {s.name}
          </button>
        ))}
      </nav>
      {Panel && <Panel />}
      {section === "atelier" && expert && <AtelierSection />}
    </div>
  );
}
