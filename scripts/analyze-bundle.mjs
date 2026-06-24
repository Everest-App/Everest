#!/usr/bin/env node

/**
 * Bundle Analyzer
 *
 * Scans the desktop app's production dependencies and reports:
 *   - Top 10 largest packages by disk size
 *   - Known heavy packages with lighter alternatives
 *   - Duplicate packages
 *   - Total estimated size
 *
 * Usage:
 *   node scripts/analyze-bundle.mjs
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const DESKTOP_DIR = join(ROOT, 'apps/desktop');
const NODE_MODULES = join(DESKTOP_DIR, 'node_modules');

// ─── Colors ──────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// ─── Helpers ─────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getDirSize(dir) {
  let size = 0;
  if (!existsSync(dir)) return 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          size += getDirSize(fullPath);
        } else {
          size += statSync(fullPath).size;
        }
      } catch { /* skip inaccessible files */ }
    }
  } catch { /* skip inaccessible dirs */ }
  return size;
}

// Known heavy packages → lighter alternatives
const HEAVY_ALTERNATIVES = {
  'moment': { alt: 'dayjs', reason: '~70KB → ~2KB gzipped' },
  'lodash': { alt: 'lodash-es (tree-shakeable) or native methods', reason: 'Full lodash is ~70KB, use cherry-pick imports' },
  'request': { alt: 'node-fetch or undici', reason: 'Deprecated, large bundle' },
  'bluebird': { alt: 'native Promises', reason: 'Not needed in modern Node.js' },
  'underscore': { alt: 'native Array/Object methods', reason: 'Legacy utility library' },
  'node-uuid': { alt: 'crypto.randomUUID()', reason: 'Built into Node.js 19+' },
  'chalk': { alt: 'picocolors', reason: '~20KB → ~1KB' },
  'commander': { alt: 'parseargs (Node.js built-in)', reason: 'Built into Node.js 18.3+' },
};

// ─── Main ────────────────────────────────────────────────────────

function main() {
  console.log(`\n${C.bold}${C.blue}━━━ Bundle Analyzer ━━━${C.reset}\n`);

  // Check if node_modules exists (might use hoisted root node_modules)
  const nmDir = existsSync(NODE_MODULES) ? NODE_MODULES : join(ROOT, 'node_modules');

  if (!existsSync(nmDir)) {
    console.log(`${C.red}✖ node_modules not found. Run npm install first.${C.reset}`);
    process.exit(1);
  }

  // Read production dependencies from desktop package.json
  const desktopPkg = JSON.parse(readFileSync(join(DESKTOP_DIR, 'package.json'), 'utf-8'));
  const prodDeps = Object.keys(desktopPkg.dependencies || {});
  const devDeps = Object.keys(desktopPkg.devDependencies || {});

  console.log(`${C.cyan}Production dependencies:${C.reset} ${prodDeps.length}`);
  console.log(`${C.cyan}Dev dependencies:${C.reset} ${devDeps.length}\n`);

  // Analyze sizes of all packages in node_modules
  const packageSizes = [];
  const entries = readdirSync(nmDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    if (entry.name.startsWith('@')) {
      // Scoped packages
      const scopeDir = join(nmDir, entry.name);
      const scopedEntries = readdirSync(scopeDir, { withFileTypes: true });
      for (const scopedEntry of scopedEntries) {
        if (!scopedEntry.isDirectory()) continue;
        const pkgName = `${entry.name}/${scopedEntry.name}`;
        const pkgDir = join(scopeDir, scopedEntry.name);
        const size = getDirSize(pkgDir);
        const isProd = prodDeps.includes(pkgName);
        const isDev = devDeps.includes(pkgName);
        packageSizes.push({ name: pkgName, size, isProd, isDev });
      }
    } else {
      const pkgDir = join(nmDir, entry.name);
      const size = getDirSize(pkgDir);
      const isProd = prodDeps.includes(entry.name);
      const isDev = devDeps.includes(entry.name);
      packageSizes.push({ name: entry.name, size, isProd, isDev });
    }
  }

  // Sort by size descending
  packageSizes.sort((a, b) => b.size - a.size);

  // Top 15 largest
  console.log(`${C.bold}Top 15 Largest Packages:${C.reset}\n`);
  console.log(`  ${'Package'.padEnd(40)} ${'Size'.padStart(10)}  Type`);
  console.log(`  ${'─'.repeat(40)} ${'─'.repeat(10)}  ${'─'.repeat(12)}`);

  for (let i = 0; i < Math.min(15, packageSizes.length); i++) {
    const pkg = packageSizes[i];
    const typeLabel = pkg.isProd ? `${C.green}prod${C.reset}` :
                      pkg.isDev ? `${C.yellow}dev${C.reset}` :
                      `${C.dim}transitive${C.reset}`;
    const sizeColor = pkg.size > 5 * 1024 * 1024 ? C.red :
                      pkg.size > 1 * 1024 * 1024 ? C.yellow : C.reset;
    console.log(`  ${pkg.name.padEnd(40)} ${sizeColor}${formatBytes(pkg.size).padStart(10)}${C.reset}  ${typeLabel}`);
  }

  // Total size
  const totalSize = packageSizes.reduce((acc, p) => acc + p.size, 0);
  console.log(`\n  ${'Total'.padEnd(40)} ${C.bold}${formatBytes(totalSize).padStart(10)}${C.reset}`);

  // Check for heavy packages
  console.log(`\n${C.bold}Heavy Package Analysis:${C.reset}\n`);
  let foundHeavy = false;

  for (const pkg of packageSizes) {
    const baseName = pkg.name.split('/').pop();
    if (HEAVY_ALTERNATIVES[pkg.name] || HEAVY_ALTERNATIVES[baseName]) {
      const alt = HEAVY_ALTERNATIVES[pkg.name] || HEAVY_ALTERNATIVES[baseName];
      console.log(`  ${C.yellow}⚠${C.reset} ${C.bold}${pkg.name}${C.reset} (${formatBytes(pkg.size)})`);
      console.log(`    ${C.dim}Alternative: ${alt.alt} — ${alt.reason}${C.reset}`);
      foundHeavy = true;
    }
  }

  if (!foundHeavy) {
    console.log(`  ${C.green}✔${C.reset} No known heavy packages detected`);
  }

  // Check for devDeps that might be in production
  console.log(`\n${C.bold}DevDependency Leak Check:${C.reset}\n`);

  const suspectDeps = packageSizes.filter(p =>
    p.isDev && (p.name === 'typescript' || p.name === 'electron' || p.name.includes('eslint'))
  );

  if (suspectDeps.length > 0) {
    for (const dep of suspectDeps) {
      console.log(`  ${C.yellow}⚠${C.reset} ${dep.name} (${formatBytes(dep.size)}) is a devDependency — ensure it's excluded from asar`);
    }
  } else {
    console.log(`  ${C.green}✔${C.reset} No devDependency leaks detected in node_modules`);
  }

  // Check dist directory sizes
  console.log(`\n${C.bold}Build Output Sizes:${C.reset}\n`);

  const coreDist = join(ROOT, 'packages/core/dist');
  const desktopDist = join(DESKTOP_DIR, 'dist');

  if (existsSync(coreDist)) {
    console.log(`  Core dist:    ${formatBytes(getDirSize(coreDist))}`);
  } else {
    console.log(`  ${C.dim}Core dist:    not built${C.reset}`);
  }

  if (existsSync(desktopDist)) {
    const rendererDir = join(desktopDist, 'renderer');
    const mainDir = join(desktopDist, 'main');
    console.log(`  Desktop dist: ${formatBytes(getDirSize(desktopDist))}`);
    if (existsSync(rendererDir)) {
      console.log(`    ├── renderer: ${formatBytes(getDirSize(rendererDir))}`);
    }
    if (existsSync(mainDir)) {
      console.log(`    └── main:     ${formatBytes(getDirSize(mainDir))}`);
    }
  } else {
    console.log(`  ${C.dim}Desktop dist: not built${C.reset}`);
  }

  console.log('');
}

main();
