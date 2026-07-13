const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  const width = size, height = size;
  const radius = size * 0.1875;

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * (1 + width * 4) + 1 + x * 4;

      const cx = width / 2, cy = height / 2;
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      const inCorner = dx > cx - radius || dy > cy - radius;
      const cornerDist = Math.sqrt(
        Math.max(0, dx - (cx - radius)) ** 2 +
        Math.max(0, dy - (cy - radius)) ** 2
      );
      const inRoundedRect = !inCorner || cornerDist <= radius;

      const circleR = size * 0.3516;
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const inCircle = distFromCenter <= circleR;

      let r, g, b, a;
      if (!inRoundedRect) {
        r = 0; g = 0; b = 0; a = 0;
      } else if (inCircle) {
        r = fgR; g = fgG; b = fgB; a = 255;
      } else {
        r = bgR; g = bgG; b = bgB; a = 255;
      }
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// #0D0D0D background, #D4A843 gold circle
const bg = [0x0D, 0x0D, 0x0D];
const fg = [0xD4, 0xA8, 0x43];

[192, 512].forEach((size) => {
  const png = makePNG(size, bg[0], bg[1], bg[2], fg[0], fg[1], fg[2]);
  const fname = `icon-${size}x${size}.png`;
  fs.writeFileSync(path.join(outDir, fname), png);
  console.log(`Generated ${fname} (${png.length} bytes)`);
});

// Apple touch icon (180x180)
const apple = makePNG(180, bg[0], bg[1], bg[2], fg[0], fg[1], fg[2]);
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), apple);
console.log(`Generated apple-touch-icon.png (${apple.length} bytes)`);

// Maskable icon (512x512 with full bleed)
const maskable = makePNG(512, fg[0], fg[1], fg[2], 0x0D, 0x0D, 0x0D);
fs.writeFileSync(path.join(outDir, 'icon-maskable-512x512.png'), maskable);
console.log(`Generated icon-maskable-512x512.png (${maskable.length} bytes)`);
