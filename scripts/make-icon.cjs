// SaveDesk icon generator — pure Node, no dependencies.
// Draws a rounded-square terminal glyph (">_") with analytic anti-aliasing,
// box-filters it down to every target size, writes PNGs (zlib) and a
// multi-resolution Windows .ico containing those PNGs.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MASTER = 1024;
const SIZES = [16, 24, 32, 48, 64, 128, 256];

// ---------- geometry (normalized 0..1, y down) ----------
const CORNER_RADIUS = 0.225;
const STROKE = 0.085;

// capsule SDF: distance to a rounded line segment
function capsuleSDF(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h, dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy);
}

function roundedRectSDF(px, py, halfW, halfH, r) {
  const qx = Math.abs(px) - halfW + r;
  const qy = Math.abs(py) - halfH + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

// scene: returns signed distance (<0 inside)
function sceneSDF(x, y) {
  // map to centered coords
  const cx = x - 0.5;
  const cy = y - 0.5;

  const bg = roundedRectSDF(cx, cy, 0.5 - 0.002, 0.5 - 0.002, CORNER_RADIUS);

  // glyph ">_" — chevron from (0.30,0.28)->(0.50,0.50)->(0.30,0.72), underscore (0.56,0.72)->(0.78,0.72)
  const c1 = capsuleSDF(x, y, 0.285, 0.28, 0.505, 0.50) - STROKE / 2;
  const c2 = capsuleSDF(x, y, 0.505, 0.50, 0.285, 0.72) - STROKE / 2;
  const us = capsuleSDF(x, y, 0.565, 0.72, 0.79, 0.72) - STROKE / 2;
  const glyph = Math.min(c1, c2, us);

  return { bg, glyph };
}

// vertical gradient background: #2563eb (top) -> #1e3a8a (bottom), white glyph
function bgColor(t) {
  const from = [37, 99, 235];
  const to = [30, 58, 138];
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t),
  ];
}

const SS = 4; // supersample factor per axis
function renderMaster() {
  const buf = Buffer.alloc(MASTER * MASTER * 4);
  for (let py = 0; py < MASTER; py++) {
    for (let px = 0; px < MASTER; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / MASTER;
          const y = (py + (sy + 0.5) / SS) / MASTER;
          const { bg, glyph } = sceneSDF(x, y);
          const aaBg = Math.min(1, Math.max(0, 0.5 - bg * MASTER * 1.2));
          const aaGlyph = Math.min(1, Math.max(0, 0.5 - glyph * MASTER * 1.2));
          const t = y;
          const [br, bgc, bb] = bgColor(t);
          // composite glyph (white) over gradient, over transparent
          const gr = 255, gg = 255, gb = 255;
          const cr = gr * aaGlyph + br * (1 - aaGlyph);
          const cg = gg * aaGlyph + bgc * (1 - aaGlyph);
          const cb = gb * aaGlyph + bb * (1 - aaGlyph);
          const alpha = Math.max(aaBg, aaGlyph);
          r += cr * alpha; g += cg * alpha; b += cb * alpha; a += alpha;
        }
      }
      const n = SS * SS;
      const o = (py * MASTER + px) * 4;
      const A = a / n;
      buf[o] = A > 0 ? Math.round(r / a) : 0;
      buf[o + 1] = A > 0 ? Math.round(g / a) : 0;
      buf[o + 2] = A > 0 ? Math.round(b / a) : 0;
      buf[o + 3] = Math.round(A * 255);
    }
  }
  return buf;
}

function boxDownsample(src, srcSize, dstSize) {
  const f = srcSize / dstSize;
  const buf = Buffer.alloc(dstSize * dstSize * 4);
  for (let dy = 0; dy < dstSize; dy++) {
    for (let dx = 0; dx < dstSize; dx++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const y0 = Math.floor(dy * f), y1 = Math.floor((dy + 1) * f);
      const x0 = Math.floor(dx * f), x1 = Math.floor((dx + 1) * f);
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const o = (sy * srcSize + sx) * 4;
          const alpha = src[o + 3] / 255;
          r += src[o] * alpha; g += src[o + 1] * alpha; b += src[o + 2] * alpha;
          a += alpha; count++;
        }
      }
      const o = (dy * dstSize + dx) * 4;
      if (a > 0) {
        buf[o] = Math.round(r / a);
        buf[o + 1] = Math.round(g / a);
        buf[o + 2] = Math.round(b / a);
      }
      buf[o + 3] = Math.round((a / count) * 255);
    }
  }
  return buf;
}

// ---------- PNG encoder ----------
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- ICO writer (PNG-compressed entries, Vista+) ----------
function encodeICO(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const blobs = [];
  pngs.forEach(({ size, data }, i) => {
    const e = i * 16;
    entries[e] = size === 256 ? 0 : size; // width (0 = 256)
    entries[e + 1] = size === 256 ? 0 : size;
    entries[e + 2] = 0; // palette
    entries[e + 3] = 0; // reserved
    entries.writeUInt16LE(1, e + 4);  // planes
    entries.writeUInt16LE(32, e + 6); // bpp
    entries.writeUInt32LE(data.length, e + 8);
    entries.writeUInt32LE(offset, e + 12);
    offset += data.length;
    blobs.push(data);
  });
  return Buffer.concat([header, entries, ...blobs]);
}

// ---------- main ----------
const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });

console.log('rendering ' + MASTER + 'px master...');
const master = renderMaster();

const pngs = [];
for (const size of SIZES) {
  const png = encodePNG(boxDownsample(master, MASTER, size), size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  pngs.push({ size, data: png });
  console.log(`  icon-${size}.png written`);
}

fs.copyFileSync(path.join(outDir, 'icon-256.png'), path.join(outDir, 'icon.png'));

const ico = encodeICO(pngs);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
console.log('  icon.ico written (' + ico.length + ' bytes, ' + SIZES.length + ' sizes)');
console.log('DONE');
