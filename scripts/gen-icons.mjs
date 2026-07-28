// One-off script to generate simple solid-color PNG app icons (no image
// libraries available in this sandbox / no network access to fetch one).
// Draws a rounded-corner-ish indigo square with a white "AI" wordmark using
// bitmap font blocks, then hand-writes a valid PNG via zlib deflate.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// 5x7 bitmap glyphs for "A" and "I", 1 = filled
const GLYPH_A = [
  "01110",
  "10001",
  "10001",
  "11111",
  "10001",
  "10001",
  "10001",
];
const GLYPH_I = [
  "111",
  "010",
  "010",
  "010",
  "010",
  "010",
  "111",
];

function makeIcon(size) {
  const bg = [79, 70, 229]; // indigo accent
  const fg = [255, 255, 255];
  const px = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    px[i * 3] = bg[0];
    px[i * 3 + 1] = bg[1];
    px[i * 3 + 2] = bg[2];
  }

  function drawGlyph(glyph, offsetXCells, cell) {
    const rows = glyph.length;
    const cols = glyph[0].length;
    const totalW = cols * cell;
    const totalH = rows * cell;
    const startX = Math.round(size / 2 - totalW - cell + offsetXCells * cell);
    const startY = Math.round((size - totalH) / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (glyph[r][c] !== "1") continue;
        for (let dy = 0; dy < cell; dy++) {
          for (let dx = 0; dx < cell; dx++) {
            const x = startX + c * cell + dx;
            const y = startY + r * cell + dy;
            if (x < 0 || y < 0 || x >= size || y >= size) continue;
            const idx = (y * size + x) * 3;
            px[idx] = fg[0];
            px[idx + 1] = fg[1];
            px[idx + 2] = fg[2];
          }
        }
      }
    }
  }

  const cell = Math.max(2, Math.floor(size / 16));
  drawGlyph(GLYPH_A, 0, cell);
  drawGlyph(GLYPH_I, 6.5, cell);

  // Raw scanlines with filter byte 0 per row
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    px.subarray(y * stride, (y + 1) * stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v;
    });
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idat = deflateSync(raw);
  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, makeIcon(size));
  console.log(`wrote public/icons/icon-${size}.png`);
}
