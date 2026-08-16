import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcPng = path.join(root, 'apps/desktop/resources/icon.png');
const outIco = path.join(root, 'apps/desktop/resources/icon.ico');
const tmpDir = path.join(root, 'node_modules/.tmp_ico');

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngBuffers = [];

for (const size of sizes) {
  const resizedPng = path.join(tmpDir, `icon_${size}.png`);
  execSync(`sips -z ${size} ${size} "${srcPng}" --out "${resizedPng}" >/dev/null 2>&1`);
  pngBuffers.push({
    size,
    buffer: fs.readFileSync(resizedPng),
  });
}

// Build ICO binary
// Header: 6 bytes
// Entries: 16 bytes per image
// Images data
const count = pngBuffers.length;
const headerSize = 6;
const dirEntrySize = 16;
let offset = headerSize + count * dirEntrySize;

const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type 1 = ICO
header.writeUInt16LE(count, 4); // count

const dirEntries = [];
const imageBuffers = [];

for (const img of pngBuffers) {
  const entry = Buffer.alloc(dirEntrySize);
  const w = img.size === 256 ? 0 : img.size;
  const h = img.size === 256 ? 0 : img.size;
  entry.writeUInt8(w, 0); // width
  entry.writeUInt8(h, 1); // height
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(img.buffer.length, 8); // size
  entry.writeUInt32LE(offset, 12); // offset

  dirEntries.push(entry);
  imageBuffers.push(img.buffer);
  offset += img.buffer.length;
}

const finalIco = Buffer.concat([header, ...dirEntries, ...imageBuffers]);
fs.writeFileSync(outIco, finalIco);

// Cleanup tmpDir
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(`Successfully generated valid ICO: ${outIco} (${finalIco.length} bytes)`);
