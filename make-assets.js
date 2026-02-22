const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function makePng(width, height, r, g, b) {
  function u32(n) { const buf = Buffer.alloc(4); buf.writeUInt32BE(n); return buf; }
  function crc32(buf) {
    let crc = -1;
    const t = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = t[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  }
  function chunk(name, data) {
    const nb = Buffer.from(name, 'ascii');
    const c = Buffer.concat([nb, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(c));
    return Buffer.concat([u32(data.length), c, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;

  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0;
  for (let x = 0; x < width; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }

  const rawRows = [];
  for (let y = 0; y < height; y++) rawRows.push(row);
  const compressed = zlib.deflateSync(Buffer.concat(rawRows));

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

const blue = [30, 64, 175];
fs.writeFileSync(path.join(assetsDir, 'icon.png'), makePng(1024, 1024, ...blue));
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), makePng(1024, 1024, ...blue));
fs.writeFileSync(path.join(assetsDir, 'splash.png'), makePng(640, 1136, ...blue));
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), makePng(64, 64, ...blue));

console.log('Assets creados en:', assetsDir);
console.log('  icon.png (1024x1024)');
console.log('  adaptive-icon.png (1024x1024)');
console.log('  splash.png (640x1136)');
console.log('  favicon.png (64x64)');
