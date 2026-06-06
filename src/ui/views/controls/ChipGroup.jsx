import React from 'react';

// Label + a row of selectable buttons — the shared shape behind Mood, Ensemble,
// Tuning, Ambience, Brainwaves and Scene. Emits the existing mood-row / moods /
// active markup so behaviour is unchanged; callers supply the per-option logic.
export function ChipGroup({
  label, options, getKey, isActive, onPick, renderOption,
  buttonClass = "mood", containerClass = "moods", getTitle, children,
}) {
  return (
    <div className="mood-row">
      <span className="row-label">{label}</span>
      <div className={containerClass}>
        {options.map((o) => (
          <button key={getKey(o)}
            className={buttonClass + (isActive(o) ? " active" : "")}
            onClick={() => onPick(o)}
            title={getTitle ? getTitle(o) : undefined}>
            {renderOption(o)}
          </button>
        ))}
        {children}
      </div>
    </div>
  );
}
