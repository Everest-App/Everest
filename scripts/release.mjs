#!/usr/bin/env node

/**
 * Release Orchestrator
 *
 * Usage:
 *   node scripts/release.mjs patch|minor|major
 *
 * Steps:
 *   1. Validate environment (clean git, npm auth)
 *   2. Bump version across all package.json files
 *   3. Build core package
 *   4. Build desktop app
 *   5. Validate build outputs
 *   6. Generate desktop installers
 *   7. Publish npm package
 *   8. Git commit + tag
 *   9. Print release summary
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');

// ─── Helpers ─────────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(msg) {
  console.log(`${COLORS.cyan}▸${COLORS.reset} ${msg}`);
}

function success(msg) {
  console.log(`${COLORS.green}✔${COLORS.reset} ${msg}`);
}

function warn(msg) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`);
}

function fail(msg) {
  console.error(`${COLORS.red}✖ ${msg}${COLORS.reset}`);
  process.exit(1);
}

function header(msg) {
  console.log(`\n${COLORS.bold}${COLORS.blue}━━━ ${msg} ━━━${COLORS.reset}\n`);
}

function run(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  log(`${COLORS.dim}$ ${cmd}${COLORS.reset}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, FORCE_COLOR: '1' } });
  } catch (err) {
    fail(`Command failed: ${cmd}`);
  }
}

function runSilent(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

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
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += statSync(fullPath).size;
    }
  }
  return size;
}

// ─── Version Bump ────────────────────────────────────────────────

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: fail(`Invalid version type: ${type}. Use patch, minor, or major.`);
  }
}

// ─── Package.json Paths ──────────────────────────────────────────

const PKG_ROOT = join(ROOT, 'package.json');
const PKG_CORE = join(ROOT, 'packages/core/package.json');
const PKG_DESKTOP = join(ROOT, 'apps/desktop/package.json');

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const bumpType = process.argv[2];

  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    fail('Usage: node scripts/release.mjs <patch|minor|major>');
  }

  const startTime = Date.now();

  // ── Step 1: Validate Environment ────────────────────────────────
  header('Step 1/9: Validating Environment');

  // Check git clean
  const gitStatus = runSilent('git status --porcelain');
  if (gitStatus === null) {
    warn('Not a git repository — skipping git checks');
  } else if (gitStatus.length > 0) {
    warn('Working directory has uncommitted changes. Proceeding anyway...');
  } else {
    success('Git working directory is clean');
  }

  // Check npm auth
  const npmUser = runSilent('npm whoami 2>/dev/null');
  if (!npmUser) {
    warn('Not logged in to npm. Publish step will be skipped.');
  } else {
    success(`Logged in to npm as: ${npmUser}`);
  }

  // ── Step 2: Bump Version ────────────────────────────────────────
  header('Step 2/9: Bumping Version');

  const rootPkg = readJson(PKG_ROOT);
  const oldVersion = rootPkg.version;
  const newVersion = bumpVersion(oldVersion, bumpType);

  log(`Version: ${oldVersion} → ${COLORS.bold}${newVersion}${COLORS.reset}`);

  // ── Step 3: Sync Versions ───────────────────────────────────────
  header('Step 3/9: Syncing Versions');

  // Update root
  rootPkg.version = newVersion;
  writeJson(PKG_ROOT, rootPkg);
  success(`Updated ${PKG_ROOT}`);

  // Update core
  const corePkg = readJson(PKG_CORE);
  corePkg.version = newVersion;
  writeJson(PKG_CORE, corePkg);
  success(`Updated ${PKG_CORE}`);

  // Update desktop
  const desktopPkg = readJson(PKG_DESKTOP);
  desktopPkg.version = newVersion;
  // Also update buildVersion if present
  if (desktopPkg.build && desktopPkg.build.buildVersion) {
    desktopPkg.build.buildVersion = newVersion;
  }
  writeJson(PKG_DESKTOP, desktopPkg);
  success(`Updated ${PKG_DESKTOP}`);

  // ── Step 4: Build Core Package ──────────────────────────────────
  header('Step 4/9: Building Core Package');
  run('npm run build -w packages/core');
  success('Core package built');

  // ── Step 5: Build Desktop App ───────────────────────────────────
  header('Step 5/9: Building Desktop App');
  run('npm run build -w apps/desktop');
  success('Desktop app built');

  // ── Step 6: Validate Builds ─────────────────────────────────────
  header('Step 6/9: Validating Builds');

  const coreDistDir = join(ROOT, 'packages/core/dist');
  const desktopDistDir = join(ROOT, 'apps/desktop/dist');

  if (!existsSync(join(coreDistDir, 'cjs', 'index.js'))) {
    fail('Core package build validation failed: dist/cjs/index.js not found');
  }
  success('Core dist/cjs/index.js exists');

  if (!existsSync(join(coreDistDir, 'esm', 'index.js'))) {
    fail('Core package build validation failed: dist/esm/index.js not found');
  }
  success('Core dist/esm/index.js exists');

  if (!existsSync(join(coreDistDir, 'esm', 'index.d.ts'))) {
    fail('Core package build validation failed: dist/esm/index.d.ts not found');
  }
  success('Core dist/esm/index.d.ts exists');

  if (!existsSync(join(desktopDistDir, 'renderer'))) {
    fail('Desktop build validation failed: dist/renderer/ not found');
  }
  success('Desktop dist/renderer/ exists');

  if (!existsSync(join(desktopDistDir, 'main'))) {
    fail('Desktop build validation failed: dist/main/ not found');
  }
  success('Desktop dist/main/ exists');

  const coreSize = getDirSize(coreDistDir);
  const desktopSize = getDirSize(desktopDistDir);
  log(`Core dist size: ${formatBytes(coreSize)}`);
  log(`Desktop dist size: ${formatBytes(desktopSize)}`);

  // Check for accidental source maps
  const mapFiles = runSilent(`find ${desktopDistDir} -name "*.map" -type f 2>/dev/null`);
  if (mapFiles && mapFiles.length > 0) {
    warn(`Found .map files in desktop dist — these will be excluded from asar`);
  } else {
    success('No source maps in desktop dist');
  }

  // ── Step 7: Generate Installers ─────────────────────────────────
  header('Step 7/9: Generating Desktop Installers');

  const desktopDir = join(ROOT, 'apps/desktop');
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  log('Building Mac DMG (x64 + arm64) and Windows NSIS installer...');
  run('npx electron-builder --mac --win', { cwd: desktopDir });
  success('Mac + Windows installers generated');

  // List generated artifacts
  const distOutputDir = join(desktopDir, 'dist');
  if (existsSync(distOutputDir)) {
    const artifacts = readdirSync(distOutputDir)
      .filter(f => /\.(dmg|exe|AppImage|snap|deb)$/i.test(f));
    if (artifacts.length > 0) {
      log('Generated artifacts:');
      for (const artifact of artifacts) {
        const size = statSync(join(distOutputDir, artifact)).size;
        console.log(`  ${COLORS.green}→${COLORS.reset} ${artifact} (${formatBytes(size)})`);
      }
    }
  }

  // ── Step 8: Publish npm Package ─────────────────────────────────
  header('Step 8/9: Publishing npm Package');

  if (npmUser) {
    log('Running npm pack --dry-run to verify contents...');
    run('npm pack --dry-run -w packages/core');

    log('Publishing @api-platform/core...');
    run('npm publish --access public -w packages/core');
    success(`@api-platform/core@${newVersion} published`);
  } else {
    warn('Skipping npm publish — not logged in. Run manually:');
    console.log(`  ${COLORS.dim}npm publish --access public -w packages/core${COLORS.reset}`);
  }

  // ── Step 9: Git Commit + Tag ────────────────────────────────────
  header('Step 9/9: Git Commit & Tag');

  if (runSilent('git rev-parse --git-dir') !== null) {
    run(`git add -A`);
    run(`git commit -m "release: v${newVersion}"`);
    run(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
    success(`Created tag v${newVersion}`);
    log(`Push with: ${COLORS.dim}git push && git push --tags${COLORS.reset}`);
  } else {
    warn('Not a git repository — skipping commit and tag');
  }

  // ── Summary ─────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`
${COLORS.bold}${COLORS.green}━━━ Release Complete ━━━${COLORS.reset}

  ${COLORS.bold}Version:${COLORS.reset}  ${oldVersion} → ${COLORS.bold}${newVersion}${COLORS.reset}
  ${COLORS.bold}Type:${COLORS.reset}     ${bumpType}
  ${COLORS.bold}Time:${COLORS.reset}     ${elapsed}s
  ${COLORS.bold}Core:${COLORS.reset}     ${formatBytes(coreSize)}
  ${COLORS.bold}Desktop:${COLORS.reset}  ${formatBytes(desktopSize)}

  ${COLORS.dim}Don't forget: git push && git push --tags${COLORS.reset}
`);
}

main().catch((err) => {
  fail(`Unexpected error: ${err.message}`);
});
