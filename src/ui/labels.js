// ---- descriptive labels for the abstract dials -----------------------

export function tempoLabel(v) {
  if (v < 0.2) return "glacial";
  if (v < 0.42) return "slow";
  if (v < 0.62) return "flowing";
  if (v < 0.82) return "moving";
  return "brisk";
}
export function stutterLabel(v) {
  if (v < 0.04) return "none";
  if (v < 0.25) return "rare";
  if (v < 0.5) return "occasional";
  if (v < 0.78) return "frequent";
  return "restless";
}
export function bloomLabel(v) {
  if (v < 0.04) return "pure";
  if (v < 0.28) return "glassy";
  if (v < 0.55) return "shimmering";
  if (v < 0.8) return "ringing";
  return "colliding";
}
export function driftLabel(v) {
  if (v < 0.2) return "nearly even";
  if (v < 0.45) return "loosening";
  if (v < 0.7) return "unequal";
  if (v < 0.88) return "wide";
  return "scattered";
}
export function registerLabel(v) {
  if (v < 0.2) return "deep";
  if (v < 0.42) return "low";
  if (v < 0.62) return "middle";
  if (v < 0.82) return "high";
  return "glassy";
}
export function spaceLabel(v) {
  if (v < 0.2) return "close";
  if (v < 0.45) return "room";
  if (v < 0.7) return "hall";
  if (v < 0.88) return "cathedral";
  return "endless";
}
export function colorLabel(v) {
  if (v < 0.22) return "felt, muted";
  if (v < 0.45) return "soft";
  if (v < 0.68) return "warm";
  if (v < 0.86) return "open";
  return "bright";
}
export function evolveLabel(v) {
  if (v < 0.04) return "fixed";
  if (v < 0.3) return "slow drift";
  if (v < 0.6) return "wandering";
  if (v < 0.85) return "shifting";
  return "restless";
}
export function journeyLabel(v) {
  if (v < 0.04) return "off";
  if (v < 0.34) return "unfolding";
  if (v < 0.66) return "drifting";
  if (v < 0.88) return "roaming";
  return "restless";
}
export function texlevelLabel(v) {
  if (v < 0.18) return "faint";
  if (v < 0.42) return "soft";
  if (v < 0.68) return "present";
  if (v < 0.86) return "forward";
  return "immersive";
}
export function glueLabel(v) {
  if (v < 0.04) return "transparent";
  if (v < 0.3) return "gentle";
  if (v < 0.58) return "firm";
  if (v < 0.84) return "pressed";
  return "pumping";
}
export function binlevelLabel(v) {
  if (v < 0.18) return "faint";
  if (v < 0.45) return "soft";
  if (v < 0.72) return "present";
  return "strong";
}
// raw gain faders (master, loops) read most clearly as a percentage
export function pctLabel(v) { return Math.round(v * 100) + "%"; }

// ---- one-line explanations for every dial in the Tune view ----------
export const DIAL_HINTS = {
  // motion
  "Density":   "How many loops play at once. More loops, lusher field.",
  "Tempo":     "How often each loop comes around to its note.",
  "Drift":     "How unequal the loops are. More drift, longer before they realign.",
  "Register":  "How high or low the music sits.",
  "Evolve":    "How much the field reshapes itself over time.",
  "Journey":   "Autonomous wander between related moods.",
  // space
  "Space":     "The size of the room the music plays in.",
  "Color":     "Brightness — dark and felt at one end, glassy at the other.",
  "Bloom":     "How much each note flowers out at its attack.",
  "Stutter":   "Random tape-stutters and dropouts.",
  // mixer
  "Master":    "Overall output level.",
  "Loops":     "How loud the generative music is.",
  "Ambience":  "Level of the background bed — rain, vinyl, wind, fire.",
  "Beat":      "Level of the binaural tones. Use headphones.",
  "Glue":      "Bonds the layers together. Higher, warmer and more cohesive.",
};
