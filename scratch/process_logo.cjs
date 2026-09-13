const fs = require('fs');
const zlib = require('zlib');

// Read source PNG
const buf = fs.readFileSync('client/public/floww-logo.png');
let offset = 8;
const idatParts = [];
while (offset < buf.length) {
  const length = buf.readUInt32BE(offset);
  const type = buf.slice(offset + 4, offset + 8).toString('ascii');
  const data = buf.slice(offset + 8, offset + 8 + length);
  if (type === 'IDAT') idatParts.push(data);
  offset += 12 + length;
}
const raw = zlib.inflateSync(Buffer.concat(idatParts));

const srcW = 1024, srcH = 1024, bpp = 4, rowLen = srcW * bpp;
const pixels = Buffer.alloc(srcW * srcH * 4);
let rawOffset = 0, prevRow = Buffer.alloc(rowLen);

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

for (let y = 0; y < srcH; y++) {
  const filter = raw[rawOffset++];
  const curRow = Buffer.alloc(rowLen);
  for (let x = 0; x < rowLen; x++) {
    const rawVal = raw[rawOffset++];
    const a = x >= bpp ? curRow[x - bpp] : 0;
    const b = prevRow[x];
    const c = x >= bpp ? prevRow[x - bpp] : 0;
    let val = 0;
    if (filter === 0) val = rawVal;
    else if (filter === 1) val = (rawVal + a) & 0xff;
    else if (filter === 2) val = (rawVal + b) & 0xff;
    else if (filter === 3) val = (rawVal + Math.floor((a + b) / 2)) & 0xff;
    else if (filter === 4) val = (rawVal + paeth(a, b, c)) & 0xff;
    curRow[x] = val;
  }
  curRow.copy(pixels, y * rowLen);
  prevRow = curRow;
}

// Bounding box of non-background
// Background is ~ (244, 245, 249)
let minX = srcW, maxX = 0, minY = srcH, maxY = 0;
for (let y = 0; y < srcH; y++) {
  for (let x = 0; x < srcW; x++) {
    const idx = (y * srcW + x) * 4;
    const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
    const diff = Math.hypot(r - 244, g - 245, b - 249);
    if (diff > 10) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log('Swirl bounds:', { minX, maxX, minY, maxY });

// Add modest padding around the swirl so it has breathing room, and make it a clean square
const swirlW = maxX - minX;
const swirlH = maxY - minY;
const maxDim = Math.max(swirlW, swirlH);
const pad = Math.round(maxDim * 0.12); // 12% padding

const cropSize = maxDim + pad * 2;
const centerX = (minX + maxX) / 2;
const centerY = (minY + maxY) / 2;

const cropStartX = Math.round(centerX - cropSize / 2);
const cropStartY = Math.round(centerY - cropSize / 2);

const destW = cropSize;
const destH = cropSize;
const outPixels = Buffer.alloc(destW * destH * 4);

const bgR = 244, bgG = 245, bgB = 249;

for (let dy = 0; dy < destH; dy++) {
  for (let dx = 0; dx < destW; dx++) {
    const sx = cropStartX + dx;
    const sy = cropStartY + dy;
    const outIdx = (dy * destW + dx) * 4;

    if (sx < 0 || sx >= srcW || sy < 0 || sy >= srcH) {
      outPixels[outIdx] = 0;
      outPixels[outIdx+1] = 0;
      outPixels[outIdx+2] = 0;
      outPixels[outIdx+3] = 0;
      continue;
    }

    const srcIdx = (sy * srcW + sx) * 4;
    const r = pixels[srcIdx];
    const g = pixels[srcIdx+1];
    const b = pixels[srcIdx+2];

    // Calculate distance from background color
    const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
    
    // Background threshold
    if (dist < 12) {
      outPixels[outIdx] = 0;
      outPixels[outIdx+1] = 0;
      outPixels[outIdx+2] = 0;
      outPixels[outIdx+3] = 0;
    } else {
      // Smooth alpha ramp for anti-aliasing between dist 12 and dist 40
      let alpha = 1;
      if (dist < 45) {
        alpha = (dist - 12) / (45 - 12);
      }
      const aByte = Math.min(255, Math.max(0, Math.round(alpha * 255)));

      // De-contaminate edges (remove background tint from anti-aliased edge pixels)
      // src = alpha * fg + (1 - alpha) * bg => fg = (src - (1-alpha)*bg) / alpha
      let fgR = r, fgG = g, fgB = b;
      if (alpha > 0.1 && alpha < 0.99) {
        fgR = Math.min(255, Math.max(0, Math.round((r - (1 - alpha) * bgR) / alpha)));
        fgG = Math.min(255, Math.max(0, Math.round((g - (1 - alpha) * bgG) / alpha)));
        fgB = Math.min(255, Math.max(0, Math.round((b - (1 - alpha) * bgB) / alpha)));
      }

      outPixels[outIdx] = fgR;
      outPixels[outIdx+1] = fgG;
      outPixels[outIdx+2] = fgB;
      outPixels[outIdx+3] = aByte;
    }
  }
}

// Function to encode RGBA buffer to PNG
function createPNG(w, h, rgba) {
  const rowSize = w * 4;
  const rawScanlines = Buffer.alloc(h * (1 + rowSize));
  let inOff = 0, outOff = 0;
  for (let y = 0; y < h; y++) {
    rawScanlines[outOff++] = 0; // Filter None
    rgba.copy(rawScanlines, outOff, inOff, inOff + rowSize);
    inOff += rowSize;
    outOff += rowSize;
  }
  const compressed = zlib.deflateSync(rawScanlines);

  // Helper to build chunk
  function makeChunk(type, data) {
    const len = data.length;
    const b = Buffer.alloc(12 + len);
    b.writeUInt32BE(len, 0);
    b.write(type, 4, 4, 'ascii');
    data.copy(b, 8);
    // CRC
    const crc = crc32(b.slice(4, 8 + len));
    b.writeInt32BE(crc, 8 + len);
    return b;
  }

  // Standard CRC32 table
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ (-1));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const outPng = createPNG(destW, destH, outPixels);
fs.writeFileSync('client/public/floww-logo.png', outPng);
console.log('Saved cropped transparent PNG to client/public/floww-logo.png, size:', outPng.length, 'dimensions:', destW, 'x', destH);

// Also generate base64 for SVG favicon embedding
const b64 = outPng.toString('base64');
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="floww-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0052FF" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#2563EB" stop-opacity="0" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#floww-glow)" />
  <image href="data:image/png;base64,${b64}" x="6" y="6" width="88" height="88" />
</svg>`;
fs.writeFileSync('client/public/favicon.svg', faviconSvg);
console.log('Updated favicon.svg with large cropped transparent logo');
