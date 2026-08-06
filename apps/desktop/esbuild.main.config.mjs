import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.argv.includes('--watch');

const commonConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: false,
  minify: !isDev,
  external: [
    'electron',
    'sql.js', // WASM external resource
  ],
  loader: {
    '.ts': 'ts',
    '.js': 'js',
  },
};

async function build() {
  try {
    // Build main process
    await esbuild.build({
      ...commonConfig,
      entryPoints: [path.join(__dirname, 'src/main/main.ts')],
      outfile: path.join(__dirname, 'dist/main/main/main.js'),
    });

    // Build preload script
    await esbuild.build({
      ...commonConfig,
      entryPoints: [path.join(__dirname, 'src/preload/preload.ts')],
      outfile: path.join(__dirname, 'dist/main/preload/preload.js'),
    });

    console.log('✓ Main process and preload bundled successfully via esbuild.');
  } catch (err) {
    console.error('Failed to bundle main process:', err);
    process.exit(1);
  }
}

build();
