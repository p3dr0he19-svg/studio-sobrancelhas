// Gera os ícones PNG do PWA (sem dependências). Uso: node tools/gerar-icones.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const out = path.join(__dirname, '..', 'icons');

// Sobrancelha em traço contínuo (mesmo desenho do SVG, em coordenadas 0–64)
const curvas = [
  [[12, 38], [18, 28.5], [27.5, 23.5], [38, 24.5]],
  [[38, 24.5], [44.5, 25.1], [49.5, 28], [52, 32]],
  [[52, 32], [48, 29.4], [43, 28.4], [38, 28.8]],
  [[38, 28.8], [29.4, 29.5], [22.5, 33.4], [18, 38.5]]
];
const pts = [];
curvas.forEach(([a, b, c, d]) => { for (let i = 0; i <= 60; i++) { const t = i / 60, u = 1 - t; pts.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]); } });
function distSeg(px, py, [ax, ay], [bx, by]) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); const x = ax + t * dx - px, y = ay + t * dy - py; return Math.sqrt(x * x + y * y); }
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function desenha(size, bg, fg, acc, escala) {
  const px = Buffer.alloc(size * size * 4); const k = size / 64; const e = escala || 0.78;
  const map = v => (v - 32) * e + 32; // encolhe para a zona segura (maskable)
  const P = pts.map(([x, y]) => [map(x) * k, map(y) * k]); const hw = 1.5 * e * k; const dot = [map(47) * k, map(17) * k, 2 * e * k];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cx = x + 0.5, cy = y + 0.5; let col = bg ? hex(bg) : [0, 0, 0]; let a = bg ? 1 : 0;
    let d = 1e9; for (let i = 1; i < P.length; i++) { const dd = distSeg(cx, cy, P[i - 1], P[i]); if (dd < d) d = dd; }
    const cov = Math.max(0, Math.min(1, hw + 0.5 - d));
    const f = hex(fg); col = col.map((c, i) => c * (1 - cov) + f[i] * cov); a = Math.max(a, cov);
    const dd = Math.hypot(cx - dot[0], cy - dot[1]); const c2 = Math.max(0, Math.min(1, dot[2] + 0.5 - dd));
    const g = hex(acc); col = col.map((c, i) => c * (1 - c2) + g[i] * c2); a = Math.max(a, c2);
    const o = (y * size + x) * 4; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = Math.round(a * 255);
  }
  return png(size, px);
}
function crc(buf) { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const b of buf) r = t[(r ^ b) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; }
function chunk(tipo, dados) { const l = Buffer.alloc(4); l.writeUInt32BE(dados.length); const td = Buffer.concat([Buffer.from(tipo), dados]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size); for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(size, 0); ih.writeUInt32BE(size, 4); ih[8] = 8; ih[9] = 6; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const temas = { painel: ['#3B2A2F', '#E7B9AA', '#D4A88C'], cliente: ['#F3E1DA', '#9B5E52', '#D4A88C'] };
for (const [nome, [bg, fg, acc]] of Object.entries(temas)) for (const s of [192, 512]) fs.writeFileSync(path.join(out, `${nome}-${s}.png`), desenha(s, bg, fg, acc));
fs.writeFileSync(path.join(out, 'badge.png'), desenha(96, null, '#FFFFFF', '#FFFFFF', 1.25));
console.log('Ícones gerados em', out);
