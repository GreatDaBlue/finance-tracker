const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateIcon(size) {
  const width = size;
  const height = size;
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const rSquircle = width * 0.48;
  const cornerR = width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = Math.max(Math.abs(x - cx) - (rSquircle - cornerR), 0);
      const dy = Math.max(Math.abs(y - cy) - (rSquircle - cornerR), 0);
      const distCorner = Math.sqrt(dx * dx + dy * dy);

      if (distCorner > cornerR) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Background Blue to Indigo Gradient
      const t = (x + y) / (width + height);
      let r = Math.round(59 * (1 - t) + 29 * t);
      let g = Math.round(130 * (1 - t) + 78 * t);
      let b = Math.round(246 * (1 - t) + 216 * t);
      let a = 255;

      if (distCorner > cornerR - 1) {
        a = Math.round(255 * (cornerR - distCorner));
      }

      // Coin circle: center (cx - size*0.035, cy), radius size * 0.28
      const coinCx = cx - size * 0.035;
      const coinCy = cy;
      const coinR = size * 0.28;
      const distCoin = Math.sqrt((x - coinCx) ** 2 + (y - coinCy) ** 2);

      if (distCoin <= coinR) {
        const ct = (x - (coinCx - coinR) + y - (coinCy - coinR)) / (coinR * 2.8);
        r = Math.round(254 * (1 - ct) + 202 * ct);
        g = Math.round(224 * (1 - ct) + 138 * ct);
        b = Math.round(30 * (1 - ct) + 4 * ct);

        // Outer coin highlight border
        if (distCoin > coinR - (size * 0.016)) {
          r = 254; g = 249; b = 195;
        } else if (distCoin > coinR - (size * 0.035) && distCoin < coinR - (size * 0.025)) {
          r = 234; g = 179; b = 8;
        }

        // ₫ character area approximation (simple solid color contrast in center)
        const dCx = Math.abs(x - coinCx);
        const dCy = Math.abs(y - coinCy);
        if (dCx < size * 0.09 && dCy < size * 0.09) {
          // Subtle darker gold emblem
          r = Math.round(r * 0.75 + 133 * 0.25);
          g = Math.round(g * 0.75 + 77 * 0.25);
          b = Math.round(b * 0.75 + 14 * 0.25);
        }
      }

      // Badge question mark circle on bottom right
      const bCx = cx + size * 0.22;
      const bCy = cy + size * 0.22;
      const bR = size * 0.15;
      const distBadge = Math.sqrt((x - bCx) ** 2 + (y - bCy) ** 2);

      if (distBadge <= bR) {
        r = 239; g = 68; b = 68; // Red
        if (distBadge > bR - (size * 0.024)) {
          r = 255; g = 255; b = 255; // White border
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '../public');
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateIcon(180));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateIcon(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateIcon(512));
console.log('Successfully generated apple-touch-icon.png, pwa-192x192.png, and pwa-512x512.png in client/public/');
