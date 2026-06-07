import React, { useEffect } from 'react';
import { useDriftStore } from '../store/useDriftStore.js';
import { ControlsPanel } from './controls/ControlsPanel.jsx';
import { PlayIcon, PauseIcon, DiceIcon, SaveIcon, InstallIcon, LinkIcon, CloseIcon } from '../icons.jsx';
import { fmt } from '../format.js';

// The Sound & tuning console — a slide-over drawer that layers over the
// persistent immersive mandala. It owns the title (triple-tap unlocks the
// hidden Atelier), a compact transport, the tabbed control sections, and the
// seed / save / share footer. Closing it returns you to the bare mandala.
export function SoundConsole() {
  const open = useDriftStore((s) => s.consoleOpen);
  const setOpen = useDriftStore((s) => s.setConsoleOpen);
  const playing = useDriftStore((s) => s.playing);
  const elapsed = useDriftStore((s) => s.elapsed);
  const toggle = useDriftStore((s) => s.toggle);
  const expert = useDriftStore((s) => s.expert);
  const unlockExpert = useDriftStore((s) => s.unlockExpert);
  const seed = useDriftStore((s) => s.params.seed);
  const update = useDriftStore((s) => s.update);
  const reshuffle = useDriftStore((s) => s.reshuffle);
  const saveCurrent = useDriftStore((s) => s.saveCurrent);
  const installPrompt = useDriftStore((s) => s.installPrompt);
  const install = useDriftStore((s) => s.install);
  const share = useDriftStore((s) => s.share);

  // Escape closes the drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <div className={"console-scrim" + (open ? " show" : "")} onClick={() => setOpen(false)} aria-hidden="true"></div>
      <aside className={"console" + (open ? " open" : "")} role="dialog" aria-label="Sound and tuning"
        aria-hidden={!open} inert={!open ? true : undefined}>
        <header className="console-head">
          <div className="console-id">
            <div className="eyebrow">Sound &amp; tuning</div>
            <h1 className="console-title" onClick={unlockExpert} title={expert ? "Atelier unlocked" : undefined}>
              The Drift<em>.</em>
            </h1>
          </div>
          <div className="console-transport">
            <span className="console-clock">{playing ? "playing" : "paused"} &middot; {fmt(elapsed)}</span>
            <button className="console-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="console-close" onClick={() => setOpen(false)} aria-label="Close sound panel" title="Close (Esc)">
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="console-body">
          <ControlsPanel />
        </div>

        <footer className="console-foot">
          <div className="seed-block">
            <div className="seed-field">
              <label htmlFor="seed">Seed</label>
              <input id="seed" className="seed-input" type="number" value={seed}
                onChange={(e) => update("seed", Math.max(1, +e.target.value || 1))} />
            </div>
            <button className="ghost-btn" onClick={reshuffle}><DiceIcon /> Reshuffle</button>
            <button className="ghost-btn save-btn" onClick={saveCurrent}><SaveIcon /> Save this drift</button>
          </div>
          <div className="console-foot-right">
            {installPrompt && (
              <button className="ghost-btn" onClick={install}><InstallIcon /> Install app</button>
            )}
            <button className="ghost-btn" onClick={share}><LinkIcon /> Copy share link</button>
          </div>
        </footer>
      </aside>
    </>
  );
}
