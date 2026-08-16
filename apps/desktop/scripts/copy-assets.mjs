import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');
const srcDir = path.join(desktopRoot, 'src/main/storage/migrations');
const destDir = path.join(desktopRoot, 'dist/migrations');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    if (file.endsWith('.sql')) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }
  }
}
