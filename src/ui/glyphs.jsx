import React from 'react';

// ---- instrument glyphs (canvas) --------------------------------------
export function drawGlyph(ctx, family, x, y, r, color) {
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.3;
  switch (family) {
    case "bell": // filled diamond
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); break;
    case "marimba": // filled square
      ctx.fillRect(x - r * 0.82, y - r * 0.82, r * 1.64, r * 1.64); break;
    case "harp": // ring
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); break;
    case "handpan": // tone-field dimple: ring with a filled centre
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill(); break;
    case "kalimba": // upright tine: a thin vertical bar
      ctx.fillRect(x - r * 0.3, y - r, r * 0.6, r * 2); break;
    case "wood": // wooden plank: a flat horizontal bar
      ctx.fillRect(x - r, y - r * 0.42, r * 2, r * 0.84); break;
    case "frame": // drum head seen at an angle: a flat ellipse
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); break;
    case "strings": // open diamond
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.stroke(); break;
    case "choir": // filled triangle up
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.92, y + r * 0.72); ctx.lineTo(x - r * 0.92, y + r * 0.72); ctx.closePath(); ctx.fill(); break;
    case "flute": // hollow square
      ctx.strokeRect(x - r * 0.78, y - r * 0.78, r * 1.56, r * 1.56); break;
    case "drone": // filled triangle down
      ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x + r * 0.92, y - r * 0.72); ctx.lineTo(x - r * 0.92, y - r * 0.72); ctx.closePath(); ctx.fill(); break;
    case "chip": { // 8-bit pixel staircase
      const u = r * 0.62;
      const bx = x - u * 1.5, by = y + u * 1.5;
      ctx.fillRect(bx, by - u, u, u);
      ctx.fillRect(bx + u, by - 2 * u, u, u);
      ctx.fillRect(bx + 2 * u, by - 3 * u, u, u);
      break;
    }
    case "tabla": { // tuned drum: filled hexagon
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 3;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill(); break;
    }
    case "udu": // clay pot: body + small neck opening
      ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - r * 0.92, r * 0.34, 0, Math.PI * 2); ctx.stroke(); break;
    case "balafon": { // wooden bars: three vertical keys, middle tallest
      const bw = r * 0.42, gap = r * 0.52;
      for (let k = -1; k <= 1; k++) {
        const hh = r * (k === 0 ? 1.0 : 0.78);
        ctx.fillRect(x + k * gap - bw / 2, y - hh, bw, hh * 2);
      }
      break;
    }
    case "bowl": // singing bowl: lower half-disc
      ctx.beginPath(); ctx.arc(x, y - r * 0.2, r, 0, Math.PI, false); ctx.closePath(); ctx.fill(); break;
    case "arp": // arpeggio: a rising staircase of three dots
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(x + k * r * 0.7, y - k * r * 0.7, r * 0.42, 0, Math.PI * 2); ctx.fill(); }
      break;
    case "chirp": // birdsong: a small up-flicking tick (like a checkmark)
      ctx.lineWidth = r * 0.34;
      ctx.beginPath(); ctx.moveTo(x - r * 0.9, y + r * 0.3); ctx.lineTo(x - r * 0.1, y + r * 0.7); ctx.lineTo(x + r * 0.95, y - r * 0.9); ctx.stroke();
      break;
    case "trill": // trill: two stacked dots (the alternating pair)
      ctx.beginPath(); ctx.arc(x, y - r * 0.55, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y + r * 0.55, r * 0.5, 0, Math.PI * 2); ctx.fill();
      break;
    default: // piano: filled circle
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}

export const FAMILY_LABEL = { piano: "Felt piano", bell: "Bells", marimba: "Marimba", harp: "Harp", handpan: "Handpan", kalimba: "Kalimba", wood: "Woodblock", frame: "Frame drum", strings: "Strings", choir: "Choir", flute: "Flute", drone: "Drone", chip: "8-bit pulse", tabla: "Tabla", udu: "Udu", balafon: "Balafon", bowl: "Singing bowl", arp: "Arpeggio", chirp: "Birdsong", trill: "Trill" };

// ---- per-mood visualization palette (deep tint + luminous accent) ----
export const MOOD_VIZ = {
  reflection: { bg: ["#1a140c", "#0c0905"], ink: "214,198,170", acc: "228,152,94" },  // warm amber
  drift:      { bg: ["#07191b", "#040c0d"], ink: "168,208,212", acc: "84,206,214" },  // airy cyan
  dusk:       { bg: ["#120e22", "#070512"], ink: "188,178,222", acc: "150,128,238" }, // indigo
  elegy:      { bg: ["#1d0d14", "#0e0609"], ink: "220,180,194", acc: "232,108,140" }, // muted rose
  suspended:  { bg: ["#141a0c", "#090d05"], ink: "200,208,168", acc: "182,200,92" },  // green-gold
  curious:    { bg: ["#07190f", "#040c08"], ink: "176,216,192", acc: "76,216,150" },  // bright teal
  pensive:    { bg: ["#0b1320", "#05080f"], ink: "182,198,224", acc: "108,160,238" }, // soft blue
  open:       { bg: ["#091a18", "#040d0c"], ink: "182,216,208", acc: "92,214,198" },  // seafoam aqua
  vast:       { bg: ["#110c20", "#070510"], ink: "196,184,226", acc: "150,128,242" }, // aurora violet
};

// ---- instrument glyphs (svg, for the DOM legend) ---------------------
export function GlyphSVG({ family }) {
  const ink = "#2c271f";
  const p = { width: 12, height: 12, viewBox: "0 0 12 12" };
  switch (family) {
    case "bell": return (<svg {...p}><path d="M6 1 11 6 6 11 1 6Z" fill={ink} /></svg>);
    case "marimba": return (<svg {...p}><rect x="1.7" y="1.7" width="8.6" height="8.6" fill={ink} /></svg>);
    case "harp": return (<svg {...p}><circle cx="6" cy="6" r="4.4" fill="none" stroke={ink} strokeWidth="1.3" /></svg>);
    case "handpan": return (<svg {...p}><circle cx="6" cy="6" r="4.4" fill="none" stroke={ink} strokeWidth="1.3" /><circle cx="6" cy="6" r="1.8" fill={ink} /></svg>);
    case "kalimba": return (<svg {...p}><rect x="4.6" y="1.4" width="2.8" height="9.2" fill={ink} /></svg>);
    case "wood": return (<svg {...p}><rect x="1.4" y="4.4" width="9.2" height="3.2" fill={ink} /></svg>);
    case "frame": return (<svg {...p}><ellipse cx="6" cy="6" rx="4.8" ry="2.9" fill={ink} /></svg>);
    case "strings": return (<svg {...p}><path d="M6 1 11 6 6 11 1 6Z" fill="none" stroke={ink} strokeWidth="1.3" /></svg>);
    case "choir": return (<svg {...p}><path d="M6 1.4 10.6 10 1.4 10Z" fill={ink} /></svg>);
    case "flute": return (<svg {...p}><rect x="1.8" y="1.8" width="8.4" height="8.4" fill="none" stroke={ink} strokeWidth="1.3" /></svg>);
    case "drone": return (<svg {...p}><path d="M6 10.6 10.6 2 1.4 2Z" fill={ink} /></svg>);
    case "chip": return (<svg {...p}><rect x="1.4" y="6.6" width="3" height="3" fill={ink} /><rect x="4.5" y="4.5" width="3" height="3" fill={ink} /><rect x="7.6" y="2.4" width="3" height="3" fill={ink} /></svg>);
    case "tabla": return (<svg {...p}><path d="M6 1.2 10.2 3.6 10.2 8.4 6 10.8 1.8 8.4 1.8 3.6Z" fill={ink} /></svg>);
    case "udu": return (<svg {...p}><circle cx="6" cy="7" r="4.1" fill={ink} /><circle cx="6" cy="2.2" r="1.5" fill="none" stroke={ink} strokeWidth="1.1" /></svg>);
    case "balafon": return (<svg {...p}><rect x="1.7" y="3" width="1.9" height="6" fill={ink} /><rect x="5.05" y="1.6" width="1.9" height="8.8" fill={ink} /><rect x="8.4" y="3" width="1.9" height="6" fill={ink} /></svg>);
    case "bowl": return (<svg {...p}><path d="M1.4 4.6 A4.6 4.6 0 0 1 10.6 4.6 Z" fill={ink} /></svg>);
    case "arp": return (<svg {...p}><circle cx="2.4" cy="9" r="1.7" fill={ink} /><circle cx="6" cy="6" r="1.7" fill={ink} /><circle cx="9.6" cy="3" r="1.7" fill={ink} /></svg>);
    case "chirp": return (<svg {...p}><path d="M1.4 7 4 9 10.6 2" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);
    case "trill": return (<svg {...p}><circle cx="6" cy="3.4" r="2" fill={ink} /><circle cx="6" cy="8.6" r="2" fill={ink} /></svg>);
    default: return (<svg {...p}><circle cx="6" cy="6" r="4.6" fill={ink} /></svg>);
  }
}
