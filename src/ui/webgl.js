import { MOOD_VIZ } from './glyphs.jsx';

/* The Drift — WebGL "Drift Space" renderer.
   An abstract 3D orrery: each voice is a glowing orb orbiting a central
   star, on its own seeded tilted plane, travelling at exactly its loop
   rate so the visual drift matches the audio drift. Drag to rotate the
   camera. Strikes emit particle bursts. Raw WebGL — no dependencies. */

// ---- tiny mat4 helpers (column-major) --------------------------------
function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}
// rotation from yaw (around Y) then pitch (around X)
function mat4ViewRot(yaw, pitch, dist) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  // R = Rx(pitch) * Ry(yaw)
  const r00 = cy,        r01 = 0,    r02 = -sy;
  const r10 = sx * sy,   r11 = cx,   r12 = sx * cy;
  const r20 = cx * sy,   r21 = -sx,  r22 = cx * cy;
  // translate camera back by dist along view Z (column-major)
  return new Float32Array([
    r00, r10, r20, 0,
    r01, r11, r21, 0,
    r02, r12, r22, 0,
    0,   0,   -dist, 1,
  ]);
}

// rotate a point by the per-orbit tilt: spin around its plane, then tilt.
// orbit plane is defined by tilt (lean) and azimuth (which way it leans).
function orbitPoint(theta, radius, tilt, azimuth, out) {
  // point on a flat ring in XZ
  let x = Math.cos(theta) * radius;
  let y = 0;
  let z = Math.sin(theta) * radius;
  // tilt around X axis
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  let y1 = y * ct - z * st;
  let z1 = y * st + z * ct;
  let x1 = x;
  // azimuth around Y axis (rotate which way the plane leans)
  const ca = Math.cos(azimuth), sa = Math.sin(azimuth);
  out[0] = x1 * ca + z1 * sa;
  out[1] = y1;
  out[2] = -x1 * sa + z1 * ca;
}

// ---- shaders ---------------------------------------------------------
const POINT_VS = `
  attribute vec3 aPos;
  attribute float aSize;
  attribute vec4 aColor;
  uniform mat4 uProj;
  uniform mat4 uView;
  varying vec4 vColor;
  void main() {
    vec4 viewPos = uView * vec4(aPos, 1.0);
    gl_Position = uProj * viewPos;
    // size attenuates with distance from camera
    gl_PointSize = aSize / max(0.2, -viewPos.z);
    vColor = aColor;
  }
`;
const POINT_FS = `
  precision mediump float;
  varying vec4 vColor;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    // soft glowing disc: bright core, smooth falloff
    float a = (1.0 - smoothstep(0.0, 0.5, r));
    a = a * a;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor.rgb, vColor.a * a);
  }
`;
const LINE_VS = `
  attribute vec3 aPos;
  uniform mat4 uProj;
  uniform mat4 uView;
  void main() {
    gl_Position = uProj * uView * vec4(aPos, 1.0);
  }
`;
const LINE_FS = `
  precision mediump float;
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("shader compile failed: " + log);
  }
  return sh;
}
function program(gl, vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("program link failed: " + gl.getProgramInfoLog(p));
  }
  return p;
}

// parse "r,g,b" (0..255) into normalized [r,g,b]
function rgb(str) {
  const a = str.split(",");
  return [(+a[0]) / 255, (+a[1]) / 255, (+a[2]) / 255];
}
// parse "#rrggbb" into normalized [r,g,b]
function hex(str) {
  const h = str.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const MAX_PARTICLES = 480;
const TRAIL_LEN = 28;            // history points streaming behind each orb
const TWO_PI = Math.PI * 2;

export function createWebGLRenderer({ canvas, engine, levRef }) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) return null;

  const pointProg = program(gl, POINT_VS, POINT_FS);
  const lineProg = program(gl, LINE_VS, LINE_FS);

  const pPos = gl.getAttribLocation(pointProg, "aPos");
  const pSize = gl.getAttribLocation(pointProg, "aSize");
  const pColor = gl.getAttribLocation(pointProg, "aColor");
  const pProj = gl.getUniformLocation(pointProg, "uProj");
  const pView = gl.getUniformLocation(pointProg, "uView");

  const lPos = gl.getAttribLocation(lineProg, "aPos");
  const lProj = gl.getUniformLocation(lineProg, "uProj");
  const lView = gl.getUniformLocation(lineProg, "uView");
  const lColor = gl.getUniformLocation(lineProg, "uColor");

  // dynamic point buffer: interleaved [x,y,z, size, r,g,b,a] = 8 floats
  const STRIDE = 8;
  const maxVoices = 16; // density caps at 12; headroom for safety
  const pointCap = maxVoices * (1 + TRAIL_LEN) + 1 + MAX_PARTICLES;
  const pointData = new Float32Array(pointCap * STRIDE);
  const pointBuf = gl.createBuffer();
  const lineBuf = gl.createBuffer();

  // ---- per-voice trail history (ring buffers of recent orb positions) ----
  const trails = [];   // trails[i] = { pos: Float32Array(TRAIL_LEN*3), head, count }
  function ensureTrail(i) {
    if (!trails[i]) trails[i] = { pos: new Float32Array(TRAIL_LEN * 3), head: 0, count: 0 };
    return trails[i];
  }

  // ---- camera state (drag to rotate) ----
  let yaw = 0.5, pitch = -0.55;       // radians
  let velYaw = 0, velPitch = 0;       // momentum after release
  let dragging = false;
  let lastX = 0, lastY = 0;
  let autoSpin = true;                // idle rotation until first drag

  function onDown(e) {
    dragging = true;
    autoSpin = false;
    const p = e.touches ? e.touches[0] : e;
    lastX = p.clientX; lastY = p.clientY;
    velYaw = 0; velPitch = 0;
  }
  function onMove(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastX;
    const dy = p.clientY - lastY;
    lastX = p.clientX; lastY = p.clientY;
    yaw += dx * 0.006;
    pitch += dy * 0.006;
    pitch = Math.max(-1.45, Math.min(1.45, pitch));
    velYaw = dx * 0.006;
    velPitch = dy * 0.006;
    if (e.cancelable) e.preventDefault();
  }
  function onUp() { dragging = false; }

  canvas.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  canvas.addEventListener("touchend", onUp);

  // ---- per-voice orbital params, seeded & stable per voice id ----
  function seedRand(n) {
    // deterministic hash -> 0..1, so each voice keeps its plane
    let t = (n + 1) * 0.6180339887;
    t = (Math.sin(t * 127.1) * 43758.5453);
    return t - Math.floor(t);
  }
  const orbits = [];
  function ensureOrbits() {
    const n = engine.voices.length;
    let maxP = 1, minP = 1e9;
    for (const v of engine.voices) {
      if (v.period > maxP) maxP = v.period;
      if (v.period < minP) minP = v.period;
    }
    const span = Math.max(0.001, maxP - minP);
    for (let i = 0; i < n; i++) {
      const v = engine.voices[i];
      const norm = (v.period - minP) / span;   // 0 (short) .. 1 (long)
      orbits[i] = {
        radius: 0.55 + norm * 1.35,             // longer loop -> wider orbit
        tilt: (seedRand(i) - 0.5) * 1.4,        // -0.7..0.7 rad lean
        azimuth: seedRand(i + 100) * TWO_PI,    // which way it leans
        lastStrike: -1,
      };
    }
    orbits.length = n;
  }
  ensureOrbits();

  // ---- particle ring buffer ----
  const particles = new Float32Array(MAX_PARTICLES * 8); // x,y,z, vx,vy,vz, age, life
  const pColorBuf = new Float32Array(MAX_PARTICLES * 3); // r,g,b per particle
  let pHead = 0;
  let pActive = 0;

  const tmp = [0, 0, 0];

  function emitBurst(px, py, pz, col, count) {
    for (let k = 0; k < count; k++) {
      const i = pHead;
      const o = i * 8;
      // random direction on a sphere
      const u = Math.random() * 2 - 1;
      const th = Math.random() * TWO_PI;
      const s = Math.sqrt(1 - u * u);
      const speed = 0.25 + Math.random() * 0.55;
      particles[o] = px; particles[o + 1] = py; particles[o + 2] = pz;
      particles[o + 3] = s * Math.cos(th) * speed;
      particles[o + 4] = u * speed;
      particles[o + 5] = s * Math.sin(th) * speed;
      particles[o + 6] = 0;                       // age
      particles[o + 7] = 0.7 + Math.random() * 0.5; // life
      pColorBuf[i * 3] = col[0];
      pColorBuf[i * 3 + 1] = col[1];
      pColorBuf[i * 3 + 2] = col[2];
      pHead = (pHead + 1) % MAX_PARTICLES;
      if (pActive < MAX_PARTICLES) pActive++;
    }
  }

  let lastTime = performance.now() / 1000;

  function draw(dim) {
    const now = performance.now() / 1000;
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;     // clamp after a stall

    const w = dim.w, h = dim.h;
    if (canvas.width !== Math.round(w * dim.dpr) || canvas.height !== Math.round(h * dim.dpr)) {
      canvas.width = Math.round(w * dim.dpr);
      canvas.height = Math.round(h * dim.dpr);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);

    const voices = engine.voices;
    const n = voices.length;
    if (orbits.length !== n) { ensureOrbits(); trails.length = 0; }

    const pal = MOOD_VIZ[engine.params.mood] || MOOD_VIZ.reflection;
    const bgEdge = hex(pal.bg[1] || "#08080c");
    const inkCol = rgb(pal.ink);
    const accCol = rgb(pal.acc);

    const lev = (levRef.current && levRef.current.level) || 0;
    const levHigh = (levRef.current && levRef.current.high) || 0;
    const bloom = engine.params.bloom || 0;

    // clear with mood edge color
    gl.clearColor(bgEdge[0], bgEdge[1], bgEdge[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);   // additive glow
    gl.disable(gl.DEPTH_TEST);

    // ---- camera ----
    if (autoSpin && !dragging) yaw += dt * 0.12;
    if (!dragging) {
      yaw += velYaw;
      pitch += velPitch;
      pitch = Math.max(-1.45, Math.min(1.45, pitch));
      velYaw *= 0.94;
      velPitch *= 0.94;
    }
    const proj = mat4Perspective(Math.PI / 3, w / h, 0.1, 50);
    const view = mat4ViewRot(yaw, pitch, 5.6);

    // ---- compute orb world positions, detect strikes, record trails ----
    const orbPos = [];
    for (let i = 0; i < n; i++) {
      const v = voices[i];
      const ob = orbits[i];
      const theta = (v.viz.prog || 0) * TWO_PI;
      orbitPoint(theta, ob.radius, ob.tilt, ob.azimuth, tmp);
      orbPos.push([tmp[0], tmp[1], tmp[2]]);

      // push current position into this voice's trail ring buffer
      const tr = ensureTrail(i);
      tr.pos[tr.head * 3] = tmp[0];
      tr.pos[tr.head * 3 + 1] = tmp[1];
      tr.pos[tr.head * 3 + 2] = tmp[2];
      tr.head = (tr.head + 1) % TRAIL_LEN;
      if (tr.count < TRAIL_LEN) tr.count++;

      // strike detection -> burst
      if (v.viz.strike && v.viz.strike !== ob.lastStrike) {
        ob.lastStrike = v.viz.strike;
        emitBurst(tmp[0], tmp[1], tmp[2], voiceColor(v), 10);
      }
    }

    // ---- draw orbit rings (lines) ----
    gl.useProgram(lineProg);
    gl.uniformMatrix4fv(lProj, false, proj);
    gl.uniformMatrix4fv(lView, false, view);
    const ringSegs = 72;
    const ringVerts = new Float32Array((ringSegs + 1) * 3);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.enableVertexAttribArray(lPos);
    for (let i = 0; i < n; i++) {
      const ob = orbits[i];
      for (let s = 0; s <= ringSegs; s++) {
        const th = (s / ringSegs) * TWO_PI;
        orbitPoint(th, ob.radius, ob.tilt, ob.azimuth, tmp);
        ringVerts[s * 3] = tmp[0];
        ringVerts[s * 3 + 1] = tmp[1];
        ringVerts[s * 3 + 2] = tmp[2];
      }
      gl.bufferData(gl.ARRAY_BUFFER, ringVerts, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(lPos, 3, gl.FLOAT, false, 0, 0);
      const ringA = 0.06 + levHigh * 0.12;
      gl.uniform4f(lColor, inkCol[0], inkCol[1], inkCol[2], ringA);
      gl.drawArrays(gl.LINE_STRIP, 0, ringSegs + 1);
    }

    // ---- build point cloud: star + orbs + particles ----
    let pc = 0;
    function pushPoint(x, y, z, size, r, g, b, a) {
      const o = pc * STRIDE;
      pointData[o] = x; pointData[o + 1] = y; pointData[o + 2] = z;
      pointData[o + 3] = size;
      pointData[o + 4] = r; pointData[o + 5] = g; pointData[o + 6] = b; pointData[o + 7] = a;
      pc++;
    }

    // central star — brightness rides the live level
    const starSize = (260 + lev * 520) * dim.dpr;
    pushPoint(0, 0, 0, starSize, accCol[0], accCol[1], accCol[2], 0.5 + lev * 0.45);

    // per-voice pitch-tinted color: blend mood accent (low) with ink (high)
    function voiceColor(v) {
      const reg = Math.max(0, Math.min(1, (v.midi - 40) / 44));
      return [
        accCol[0] * (1 - reg) + inkCol[0] * reg,
        accCol[1] * (1 - reg) + inkCol[1] * reg,
        accCol[2] * (1 - reg) + inkCol[2] * reg,
      ];
    }

    // trails — a comet stream behind each orb, fading toward the tail.
    // longer reverb (space) lengthens the visible trail.
    const trailFrac = 0.45 + (engine.params.space || 0) * 0.55;
    for (let i = 0; i < n; i++) {
      const tr = trails[i];
      if (!tr || tr.count < 2) continue;
      const col = voiceColor(voices[i]);
      const shown = Math.max(2, Math.floor(tr.count * trailFrac));
      for (let k = 1; k < shown; k++) {
        // walk backward from the most recent sample
        const idx = ((tr.head - 1 - k) % TRAIL_LEN + TRAIL_LEN) % TRAIL_LEN;
        const age = k / shown;                 // 0 (near orb) .. 1 (tail)
        const fade = (1 - age) * (1 - age);    // quadratic falloff
        pushPoint(
          tr.pos[idx * 3], tr.pos[idx * 3 + 1], tr.pos[idx * 3 + 2],
          (10 + fade * 70) * dim.dpr,
          col[0], col[1], col[2],
          fade * 0.5
        );
      }
    }

    // orbs
    const FAMILY_SIZE = {
      strings: 1.5, choir: 1.6, flute: 1.35, drone: 1.7,
      bell: 0.85, kalimba: 0.8, wood: 0.85, chip: 0.8,
    };
    for (let i = 0; i < n; i++) {
      const v = voices[i];
      const p = orbPos[i];
      const col = voiceColor(v);
      // strike bloom: size swells briefly after a strike
      const audioNow = engine.ctx ? engine.ctx.currentTime : now;
      const since = v.viz.strike ? audioNow - v.viz.strike : 99;
      const bloomK = since >= 0 && since < 1.6 ? (1 - since / 1.6) : 0;
      const famSize = FAMILY_SIZE[v.family] || 1.0;
      const size = (120 * famSize + bloomK * 220 + bloom * 60) * dim.dpr;
      const alpha = 0.55 + bloomK * 0.4 + lev * 0.2;
      pushPoint(p[0], p[1], p[2], size, col[0], col[1], col[2], Math.min(1, alpha));
    }

    // particles — advance & fade
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const o = i * 8;
      const life = particles[o + 7];
      if (life <= 0) continue;
      let age = particles[o + 6];
      if (age >= life) { particles[o + 7] = 0; continue; }
      age += dt;
      particles[o + 6] = age;
      particles[o] += particles[o + 3] * dt;
      particles[o + 1] += particles[o + 4] * dt;
      particles[o + 2] += particles[o + 5] * dt;
      const k = 1 - age / life;
      pushPoint(
        particles[o], particles[o + 1], particles[o + 2],
        90 * k * dim.dpr,
        pColorBuf[i * 3], pColorBuf[i * 3 + 1], pColorBuf[i * 3 + 2],
        k * 0.85
      );
    }

    // ---- draw all points ----
    gl.useProgram(pointProg);
    gl.uniformMatrix4fv(pProj, false, proj);
    gl.uniformMatrix4fv(pView, false, view);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pointData.subarray(0, pc * STRIDE), gl.DYNAMIC_DRAW);
    const bytes = STRIDE * 4;
    gl.enableVertexAttribArray(pPos);
    gl.vertexAttribPointer(pPos, 3, gl.FLOAT, false, bytes, 0);
    gl.enableVertexAttribArray(pSize);
    gl.vertexAttribPointer(pSize, 1, gl.FLOAT, false, bytes, 12);
    gl.enableVertexAttribArray(pColor);
    gl.vertexAttribPointer(pColor, 4, gl.FLOAT, false, bytes, 16);
    gl.drawArrays(gl.POINTS, 0, pc);
  }

  function destroy() {
    canvas.removeEventListener("mousedown", onDown);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    canvas.removeEventListener("touchstart", onDown);
    canvas.removeEventListener("touchmove", onMove);
    canvas.removeEventListener("touchend", onUp);
    gl.deleteBuffer(pointBuf);
    gl.deleteBuffer(lineBuf);
    gl.deleteProgram(pointProg);
    gl.deleteProgram(lineProg);
  }

  return { draw, destroy };
}
