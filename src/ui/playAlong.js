// Pure helpers for the "play-along" tap feature: map a tap's screen position on
// the mandala to musical params, so X and Y both mean something —
//   Y (vertical)   -> pitch  (top = high, bottom = low)
//   X (horizontal) -> stereo pan (left .. right)
// The pitch is later quantised to the current scale by the engine.

export const LONG_PRESS_MS = 320;   // hold beyond this -> glitch gesture
export const MOVE_TOL = 12;         // px of movement that turns a tap into a drag

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// x,y are canvas-local pixels; w,h the canvas CSS size.
export function tapToField(x, y, w, h) {
  const pitch01 = h > 0 ? clamp01(1 - y / h) : 0.5;
  const px = w > 0 ? (x / w) * 2 - 1 : 0;
  const pan = px < -1 ? -1 : px > 1 ? 1 : px;
  return { pitch01, pan };
}
