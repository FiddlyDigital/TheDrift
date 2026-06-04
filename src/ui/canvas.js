import { drawGlyph, MOOD_VIZ } from './glyphs.jsx';
import { BREATH_PATTERNS } from './constants.js';

export function createRenderer({ ctx, canvas, engine, ripplesRef, levRef, bellSeenRef, bellPulseRef, journeyPulseRef, immersiveRef, breathRef, breathPatRef }) {
  const PAD_T = 24, PAD_B = 22;
  const INK = "44,39,31";
  const ACC = "176,97,58";

  function emitRipple(x, y, max, str, delay) {
    ripplesRef.current.push({ x: x, y: y, t0: (engine.ctx ? engine.ctx.currentTime : 0) + (delay || 0), max: max, str: str });
  }

  function drawRipples(audioNow, accTuple) {
    const acc = accTuple || ACC;
    const ripples = ripplesRef.current;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      const age = audioNow - rp.t0;
      const life = 3.4;
      if (age > life) { ripples.splice(i, 1); continue; }
      if (age < 0) continue;
      const k = age / life;
      const rad = 8 + k * rp.max;
      const a = (1 - k) * 0.16 * rp.str;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${acc},${a})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // progress + wrap detection, independent of which view is showing.
  // when paused, voices still drift on a wall clock (idle "preview" motion)
  // so the instrument always looks alive — but without strikes or audio.
  function updateProgress(audioNow) {
    const voices = engine.voices;
    const playing = engine.playing;
    const wall = performance.now() / 1000;
    for (const v of voices) {
      let prog;
      if (playing) {
        prog = engine.progress(v);
        v.viz.justWrapped = prog < v.viz.prev - 0.4;
        if (v.viz.justWrapped) { v.viz.strike = audioNow; v.viz.fx = v.viz.nextFx; }
      } else {
        if (v._pv == null) v._pv = (v.viz.prev != null ? v.viz.prev : Math.random());
        prog = (((v._pv + wall / v.period) % 1) + 1) % 1;
        v.viz.justWrapped = false;
      }
      v.viz.prog = prog;
      v.viz.prev = prog;
    }
  }

  // ---- panel view: stacked bars + stereo drift ----
  function drawPanel(w, h, audioNow) {
    const narrow = w < 540;
    const PAD_L = narrow ? 46 : 78;
    const PAD_R = narrow ? 16 : 54;
    const STEREO_H = narrow ? 70 : 88;
    const voices = engine.voices;
    const areaW = w - PAD_L - PAD_R;
    const n = voices.length;
    const barsH = h - PAD_T - PAD_B - STEREO_H;
    const rowH = n ? barsH / n : 0;
    let maxP = 1;
    for (const v of voices) if (v.period > maxP) maxP = v.period;

    drawRipples(audioNow);

    for (let i = 0; i < n; i++) {
      const v = voices[i];
      const y = PAD_T + rowH * (i + 0.5);
      const barLen = Math.max(46, (v.period / maxP) * areaW);
      const x0 = PAD_L;
      const x1 = x0 + barLen;
      const prog = v.viz.prog;

      if (v.viz.justWrapped) {
        const isStutter = v.viz.fx === "stutter";
        emitRipple(x0, y, 70 + (1 - (v.midi - 40) / 44) * 90, (0.7 + Math.random() * 0.5) * (isStutter ? 1.3 : 1));
        if (isStutter) {
          const bursts = 3 + Math.floor(Math.random() * 3);
          for (let s = 1; s <= bursts; s++) emitRipple(x0, y, 34, 0.5, s * 0.06);
        }
      }

      const px = x0 + prog * barLen;

      ctx.beginPath();
      ctx.moveTo(x0, y); ctx.lineTo(x1, y);
      ctx.strokeStyle = `rgba(${INK},0.18)`;
      ctx.lineWidth = 1; ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 4);
      ctx.strokeStyle = `rgba(${INK},0.28)`; ctx.stroke();

      const grad = ctx.createLinearGradient(x0, 0, px, 0);
      grad.addColorStop(0, `rgba(${ACC},0.04)`);
      grad.addColorStop(1, `rgba(${ACC},0.5)`);
      ctx.beginPath();
      ctx.moveTo(x0, y); ctx.lineTo(px, y);
      ctx.strokeStyle = grad; ctx.lineWidth = 1.6; ctx.stroke();

      const since = audioNow - v.viz.strike;
      let dotR = 3.1;
      if (since >= 0 && since < 2.2) {
        const e = since / 2.2;
        const bloomR = 4 + (1 - e) * 16;
        const ba = (1 - e) * 0.5;
        const rg = ctx.createRadialGradient(x0, y, 0, x0, y, bloomR);
        rg.addColorStop(0, `rgba(${ACC},${ba})`);
        rg.addColorStop(1, `rgba(${ACC},0)`);
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(x0, y, bloomR, 0, Math.PI * 2); ctx.fill();
        dotR = 3.1 + (1 - e) * 2.4;
      }
      if (v.viz.fx === "stutter" && since >= 0 && since < 0.9) {
        const e = since / 0.9;
        ctx.strokeStyle = `rgba(${ACC},${(1 - e) * 0.8})`;
        ctx.lineWidth = 1;
        for (let s = 0; s < 5; s++) {
          const sx = x0 + 5 + s * 4.5;
          const hh = 2.5 + (4 - s) * 0.8;
          ctx.beginPath(); ctx.moveTo(sx, y - hh); ctx.lineTo(sx, y + hh); ctx.stroke();
        }
      }

      drawGlyph(ctx, v.family, x0, y, dotR, `rgba(${INK},0.92)`);

      ctx.beginPath();
      ctx.arc(px, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ACC},0.95)`; ctx.fill();

      ctx.font = (narrow ? "10px" : "11px") + " 'IBM Plex Mono', monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${INK},0.85)`;
      ctx.fillText(v.name, PAD_L - (narrow ? 9 : 16), y);
      if (!narrow) {
        ctx.textAlign = "left";
        ctx.fillStyle = `rgba(${INK},0.4)`;
        ctx.font = "9.5px 'IBM Plex Mono', monospace";
        ctx.fillText(v.period.toFixed(1) + "s", x1 + 8, y);
      }
    }

    // stereo drift plot
    const sTop = h - PAD_B - STEREO_H + 14;
    const sBot = h - PAD_B - 16;
    const axisY = (sTop + sBot) / 2;
    const sx0 = PAD_L, sx1 = w - PAD_R;
    const scx = (sx0 + sx1) / 2;
    const half = (sx1 - sx0) / 2;

    ctx.beginPath();
    ctx.moveTo(sx0, sTop - 10); ctx.lineTo(sx1, sTop - 10);
    ctx.strokeStyle = `rgba(${INK},0.10)`; ctx.lineWidth = 1; ctx.stroke();

    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(scx, sTop); ctx.lineTo(scx, sBot);
    ctx.strokeStyle = `rgba(${INK},0.14)`; ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(sx0, axisY); ctx.lineTo(sx1, axisY);
    ctx.strokeStyle = `rgba(${INK},0.10)`; ctx.stroke();

    ctx.font = "9.5px 'IBM Plex Mono', monospace";
    ctx.fillStyle = `rgba(${INK},0.4)`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left"; ctx.fillText("STEREO DRIFT", sx0, sTop - 22);
    ctx.textAlign = "left"; ctx.fillText("L", sx0, axisY);
    ctx.textAlign = "right"; ctx.fillText("R", sx1, axisY);

    for (let i = 0; i < n; i++) {
      const v = voices[i];
      const pan = engine.ctx ? engine.panAt(v, audioNow) : v.panBase;
      const dx = scx + pan * half;
      const dy = n > 1 ? sTop + 6 + (i / (n - 1)) * (sBot - sTop - 12) : axisY;
      const since = audioNow - v.viz.strike;
      const lit = engine.playing && since >= 0 && since < 1.6;
      const e = lit ? since / 1.6 : 1;

      ctx.beginPath(); ctx.moveTo(scx, dy); ctx.lineTo(dx, dy);
      ctx.strokeStyle = `rgba(${INK},${lit ? 0.18 + (1 - e) * 0.25 : 0.12})`;
      ctx.lineWidth = 1; ctx.stroke();

      if (lit) {
        const gr = 3 + (1 - e) * 9;
        const rg = ctx.createRadialGradient(dx, dy, 0, dx, dy, gr);
        rg.addColorStop(0, `rgba(${ACC},${(1 - e) * 0.45})`);
        rg.addColorStop(1, `rgba(${ACC},0)`);
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(dx, dy, gr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(dx, dy, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = lit ? `rgba(${ACC},0.95)` : `rgba(${INK},0.5)`;
      ctx.fill();
    }
  }

  // ---- immersive view: orbital mandala ----
  function drawMandala(w, h, audioNow) {
    const voices = engine.voices;
    const n = voices.length;
    const cx = w / 2, cy = h / 2;
    const minDim = Math.min(w, h);

    const pal = MOOD_VIZ[engine.params.mood] || MOOD_VIZ.reflection;
    const INKv = pal.ink, ACCv = pal.acc;
    const space = engine.params.space;
    const colr = engine.params.color;
    const tempo = engine.params.tempo;
    const haloK = 0.7 + space * 0.95;     // reverb -> larger blooms / ripples
    // live output level drives a gentle, real-time swell of the whole field
    const lev = (levRef.current && levRef.current.level) || 0;
    const levLow = (levRef.current && levRef.current.low) || 0;
    const levHigh = (levRef.current && levRef.current.high) || 0;
    const glow = 0.55 + colr * 0.5 + (engine.params.bloom || 0) * 0.22 + lev * 0.5;

    // deep, mood-tinted background wash
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.78);
    bg.addColorStop(0, pal.bg[0]);
    bg.addColorStop(1, pal.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // gentle breathing + a very slow rotation (eased faster by tempo).
    const breath = 1 + Math.sin(audioNow * 0.13) * 0.03 + levLow * 0.04;
    const spin = audioNow * (0.010 + tempo * 0.024);
    const rMax = minDim * (n > 8 ? 0.42 : 0.38) * breath;
    const rMin = minDim * 0.10 * breath;

    for (let i = 0; i < n; i++) {
      const v = voices[i];
      const t = n > 1 ? i / (n - 1) : 0.5;
      const R = rMin + t * (rMax - rMin);
      const ang = -Math.PI / 2 + spin + v.viz.prog * Math.PI * 2;
      v.viz.R = R; v.viz.ang = ang;
      v.viz.mx = cx + Math.cos(ang) * R;
      v.viz.my = cy + Math.sin(ang) * R;
      if (v.viz.justWrapped) {
        const isStutter = v.viz.fx === "stutter";
        emitRipple(v.viz.mx, v.viz.my, (60 + (1 - (v.midi - 40) / 44) * 80) * haloK, (0.7 + Math.random() * 0.4) * (isStutter ? 1.3 : 1));
        if (isStutter) {
          const b = 3 + Math.floor(Math.random() * 3);
          for (let s = 1; s <= b; s++) emitRipple(v.viz.mx, v.viz.my, 30 * haloK, 0.5, s * 0.06);
        }
      }
    }

    // orbit rings
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, voices[i].viz.R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${INKv},0.08)`;
      ctx.lineWidth = 1; ctx.stroke();
    }

    drawRipples(audioNow, ACCv);

    // alignment threads (the happy accidents)
    const TH = 0.30;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let d = Math.abs(voices[i].viz.ang - voices[j].viz.ang) % (Math.PI * 2);
        if (d > Math.PI) d = Math.PI * 2 - d;
        if (d < TH) {
          const al = (1 - d / TH) * 0.26 * glow;
          ctx.beginPath();
          ctx.moveTo(voices[i].viz.mx, voices[i].viz.my);
          ctx.lineTo(voices[j].viz.mx, voices[j].viz.my);
          ctx.strokeStyle = `rgba(${ACCv},${al})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }

    // hands, trails, blooms, dots
    for (let i = 0; i < n; i++) {
      const v = voices[i];
      const hg = ctx.createLinearGradient(cx, cy, v.viz.mx, v.viz.my);
      hg.addColorStop(0, `rgba(${INKv},0.02)`);
      hg.addColorStop(1, `rgba(${INKv},0.17)`);
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(v.viz.mx, v.viz.my);
      ctx.strokeStyle = hg; ctx.lineWidth = 1; ctx.stroke();

      // trailing arc behind the hand
      ctx.beginPath();
      ctx.arc(cx, cy, v.viz.R, v.viz.ang - 0.1 * Math.PI * 2, v.viz.ang);
      ctx.strokeStyle = `rgba(${ACCv},${0.34 * glow})`;
      ctx.lineWidth = 1.6; ctx.stroke();

      const since = audioNow - v.viz.strike;
      let dotR = 3.2;
      if (since >= 0 && since < 2.4) {
        const e = since / 2.4;
        const bR = (4 + (1 - e) * 22) * haloK;
        const ba = (1 - e) * 0.55 * glow;
        const rg = ctx.createRadialGradient(v.viz.mx, v.viz.my, 0, v.viz.mx, v.viz.my, bR);
        rg.addColorStop(0, `rgba(${ACCv},${ba})`);
        rg.addColorStop(1, `rgba(${ACCv},0)`);
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(v.viz.mx, v.viz.my, bR, 0, Math.PI * 2); ctx.fill();
        dotR = 3.2 + (1 - e) * 2.8;
      }
      drawGlyph(ctx, v.family, v.viz.mx, v.viz.my, dotR, `rgba(${INKv},0.92)`);
    }

    // centre: a soft glow that breathes with the actual output level
    if (!breathRef.current) {
      const idle = 0.5 + 0.5 * Math.sin(audioNow * 0.45);
      const drive = 0.35 * idle + 0.9 * lev;
      const cR = (9 + drive * 30) * haloK;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR);
      cg.addColorStop(0, `rgba(${ACCv},${(0.18 + lev * 0.4) * glow})`);
      cg.addColorStop(1, `rgba(${ACCv},0)`);
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.fill();
    }

    // ---- bell strikes ring the whole field ----
    if (bellPulseRef.current) {
      const bp = bellPulseRef.current;
      const age = audioNow - bp.t0;
      const life = 4.2;
      if (age > life) { bellPulseRef.current = null; }
      else if (age >= 0) {
        const reach = minDim * 0.52;
        for (let wv = 0; wv < 3; wv++) {
          const wAge = age - wv * 0.55;
          if (wAge < 0) continue;
          const k = wAge / life;
          if (k > 1) continue;
          const rad = 6 + k * reach;
          const a = (1 - k) * (1 - k) * 0.5 * bp.vel;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${ACCv},${a})`;
          ctx.lineWidth = 2 - k * 1.4;
          ctx.stroke();
        }
        // a brief central flare on the strike
        if (age < 1.2) {
          const fk = 1 - age / 1.2;
          const fR = (14 + fk * 34) * haloK;
          const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fR);
          fg.addColorStop(0, `rgba(${ACCv},${fk * 0.5 * bp.vel})`);
          fg.addColorStop(1, `rgba(${ACCv},0)`);
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(cx, cy, fR, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // ---- journey waypoint pulse ----
    if (journeyPulseRef.current) {
      const jp = journeyPulseRef.current;
      const age = audioNow - jp.t0;
      const life = 3.6;
      if (age > life) { journeyPulseRef.current = null; }
      else if (age >= 0) {
        const k = age / life;
        const rad = rMax * (0.5 + k * 0.8);
        const a = (1 - k) * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ACCv},${a})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    // ---- breath synchronization guide ----
    if (breathRef.current) {
      const pat = BREATH_PATTERNS[breathPatRef.current] || BREATH_PATTERNS.calm;
      let pos = audioNow % pat.total;
      let phase = pat.seq[0], local = 0;
      for (let k = 0; k < pat.seq.length; k++) {
        if (pos < pat.seq[k].d) { phase = pat.seq[k]; local = pos / pat.seq[k].d; break; }
        pos -= pat.seq[k].d;
      }
      // eased lung-fullness 0..1 for this moment
      const ease = phase.s0 === phase.s1
        ? phase.s0
        : phase.s0 + (phase.s1 - phase.s0) * (0.5 - 0.5 * Math.cos(local * Math.PI));
      const rB = minDim * (0.05 + ease * 0.28);

      // soft filled orb
      const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, rB);
      og.addColorStop(0, `rgba(${ACCv},${(0.06 + ease * 0.16) * glow})`);
      og.addColorStop(0.72, `rgba(${ACCv},${(0.02 + ease * 0.06) * glow})`);
      og.addColorStop(1, `rgba(${ACCv},0)`);
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(cx, cy, rB, 0, Math.PI * 2); ctx.fill();

      // the crisp ring to follow
      ctx.beginPath(); ctx.arc(cx, cy, rB, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ACCv},${0.3 + ease * 0.3})`;
      ctx.lineWidth = 1.4; ctx.stroke();

      // faint phase word + seconds remaining, centred
      ctx.save();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      try { ctx.letterSpacing = "0.24em"; } catch (e) {}
      ctx.font = `${Math.round(minDim * 0.024)}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
      ctx.fillStyle = `rgba(${INKv},0.62)`;
      ctx.fillText(phase.label.toUpperCase(), cx, cy - minDim * 0.012);
      try { ctx.letterSpacing = "0px"; } catch (e) {}
      const left = Math.max(1, Math.ceil(phase.d - local * phase.d));
      ctx.font = `${Math.round(minDim * 0.040)}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
      ctx.fillStyle = `rgba(${INKv},0.4)`;
      ctx.fillText(String(left), cx, cy + minDim * 0.028);
      ctx.restore();
    }
  }

  function draw(dim) {
    const { w, h } = dim;
    ctx.clearRect(0, 0, w, h);
    const audioNow = engine.ctx ? engine.ctx.currentTime : performance.now() / 1000;
    const lv = engine.playing ? engine.sampleLevels() : { level: 0, low: 0, high: 0 };
    levRef.current = lv;
    // detect a fresh bell strike and ring the whole field from the centre
    if (engine.bellSeq !== bellSeenRef.current) {
      bellSeenRef.current = engine.bellSeq;
      bellPulseRef.current = { t0: engine.lastBell || audioNow, vel: engine.lastBellVel || 1 };
    }
    updateProgress(audioNow);
    if (immersiveRef.current) drawMandala(w, h, audioNow);
    else drawPanel(w, h, audioNow);
  }

  return { emitRipple, draw };
}
