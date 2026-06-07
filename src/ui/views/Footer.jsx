import React from 'react';
import { useDriftStore } from '../store/useDriftStore.js';
import { DiceIcon, SaveIcon, InstallIcon, LinkIcon } from '../icons.jsx';

// Seed controls, save-to-library, transient toasts and share / install actions.
export function Footer() {
  const seed = useDriftStore((s) => s.params.seed);
  const update = useDriftStore((s) => s.update);
  const reshuffle = useDriftStore((s) => s.reshuffle);
  const saveCurrent = useDriftStore((s) => s.saveCurrent);
  const savedToast = useDriftStore((s) => s.savedToast);
  const copied = useDriftStore((s) => s.copied);
  const expertToast = useDriftStore((s) => s.expertToast);
  const spatialToast = useDriftStore((s) => s.spatialToast);
  const playAlongToast = useDriftStore((s) => s.playAlongToast);
  const installPrompt = useDriftStore((s) => s.installPrompt);
  const install = useDriftStore((s) => s.install);
  const share = useDriftStore((s) => s.share);

  return (
    <footer className="footer">
      <div className="seed-block">
        <div className="seed-field">
          <label htmlFor="seed">Seed</label>
          <input id="seed" className="seed-input" type="number" value={seed}
            onChange={(e) => update("seed", Math.max(1, +e.target.value || 1))} />
        </div>
        <button className="ghost-btn" onClick={reshuffle}><DiceIcon /> Reshuffle</button>
        <button className="ghost-btn save-btn" onClick={saveCurrent}><SaveIcon /> Save this drift</button>
      </div>
      <div className="footer-right">
        <span className={"toast" + (savedToast ? " show" : "")}>kept in your library</span>
        <span className={"toast" + (copied ? " show" : "")}>link copied</span>
        <span className={"toast" + (expertToast ? " show" : "")}>Atelier unlocked &mdash; see the new tab</span>
        <span className={"toast" + (spatialToast ? " show" : "")}>Spatial audio on &mdash; best with headphones</span>
        <span className={"toast" + (playAlongToast ? " show" : "")}>Play along &mdash; tap height for pitch, hold for a glitch</span>
        {installPrompt && (
          <button className="ghost-btn" onClick={install}><InstallIcon /> Install app</button>
        )}
        <button className="ghost-btn" onClick={share}><LinkIcon /> Copy share link</button>
      </div>
    </footer>
  );
}
