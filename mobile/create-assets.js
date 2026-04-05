// Creates valid placeholder PNG assets for Expo using Node.js zlib
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data: filter byte (0) + RGB pixels per row
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return c ^ -1;
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// Sky blue 1024x1024 icon
fs.writeFileSync(path.join(assetsDir, 'icon.png'), createPNG(1024, 1024, 14, 165, 233));
// Sky blue splash 2048x2048
fs.writeFileSync(path.join(assetsDir, 'splash.png'), createPNG(2048, 2048, 14, 165, 233));
// Adaptive icon 1024x1024
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), createPNG(1024, 1024, 14, 165, 233));
// Favicon 48x48
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), createPNG(48, 48, 14, 165, 233));
// Notification icon 96x96
fs.writeFileSync(path.join(assetsDir, 'notification-icon.png'), createPNG(96, 96, 255, 255, 255));

console.log('✅ All PNG assets created successfully!');
console.log('   icon.png, splash.png, adaptive-icon.png, favicon.png, notification-icon.png');
