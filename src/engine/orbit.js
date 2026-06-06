/* Shared orbit geometry for the 3D "Drift Space" — used by BOTH the WebGL
   renderer (to draw the orbs) and the spatial-audio panner (to place their
   sound), so the picture and the sound are guaranteed to agree.

   Each voice rides a tilted circular orbit around the centre. Its position is
   a pure function of its loop progress (theta) plus a seeded plane. */

const TWO_PI = Math.PI * 2;

// deterministic hash -> 0..1, so each voice keeps the same orbit plane
function seedRand(n) {
  let t = (n + 1) * 0.6180339887;
  t = Math.sin(t * 127.1) * 43758.5453;
  return t - Math.floor(t);
}

// assign each voice a stable orbit { radius, tilt, azimuth }. Radius scales
// with loop length (longer loop -> wider orbit); tilt/azimuth are seeded by
// the voice's row so the planes are spread but reproducible.
export function assignOrbits(voices) {
  let maxP = 1, minP = 1e9;
  for (const v of voices) {
    if (v.period > maxP) maxP = v.period;
    if (v.period < minP) minP = v.period;
  }
  const span = Math.max(0.001, maxP - minP);
  for (const v of voices) {
    const norm = (v.period - minP) / span;        // 0 (short) .. 1 (long)
    const i = v.row != null ? v.row : (v.id || 0);
    v.orbit = {
      radius: 0.55 + norm * 1.35,                 // longer loop -> wider orbit
      tilt: (seedRand(i) - 0.5) * 1.4,            // -0.7..0.7 rad lean
      azimuth: seedRand(i + 100) * TWO_PI,        // which way it leans
    };
  }
  return voices;
}

// position on a tilted ring at angle theta -> out[x,y,z]
export function orbitPosition(orbit, theta, out) {
  out = out || [0, 0, 0];
  const radius = orbit.radius;
  // point on a flat ring in XZ
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  // tilt around X axis
  const ct = Math.cos(orbit.tilt), st = Math.sin(orbit.tilt);
  const y1 = -z * st;
  const z1 = z * ct;
  // azimuth around Y axis (rotate which way the plane leans)
  const ca = Math.cos(orbit.azimuth), sa = Math.sin(orbit.azimuth);
  out[0] = x * ca + z1 * sa;
  out[1] = y1;
  out[2] = -x * sa + z1 * ca;
  return out;
}
