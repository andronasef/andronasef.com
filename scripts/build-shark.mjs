import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SHARK_REPO = process.env.SHARK_REPO || 'https://github.com/andronasef/shark.git';
const SHARK_BRANCH = process.env.SHARK_BRANCH || 'main';
const BASE_PATH = process.env.SHARK_BASE || '/p/shark';
const SITE_URL = process.env.SITE_URL || 'https://andronasef.com';
const TARGET_DIR = path.resolve(root, 'dist/p/shark');
const CLONE_DIR = path.resolve(root, 'node_modules/.cache/shark-repo');

const isCI = Boolean(
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  process.env.CI ||
  process.env.CF_PAGES ||
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.GITHUB_ACTIONS
);

const isExplicit =
  process.argv.includes('--force') ||
  process.env.BUILD_SHARK === 'true' ||
  process.env.BUILD_SHARK === '1';

const isSkipped =
  process.env.SKIP_SHARK === 'true' ||
  process.env.SKIP_SHARK === '1';

if (isSkipped) {
  console.log('[shark] SKIP_SHARK is set. Skipping Shark build.');
  process.exit(0);
}

// In non-CI environments, skip by default unless explicitly requested
if (!isCI && !isExplicit) {
  console.log('[shark] Skipping Shark subpath build (not in CI).');
  console.log('[shark] To build Shark locally, run: bun run build:shark (or set BUILD_SHARK=true).');
  process.exit(0);
}

function run(cmd, args, cwd) {
  console.log(`[shark] Running: ${cmd} ${args.join(' ')} (in ${path.relative(root, cwd) || '.'})`);
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${cmd} ${args.join(' ')}`);
  }
}

async function main() {
  console.log(`[shark] Preparing Shark subpath build for ${BASE_PATH}...`);

  // Ensure dist directory exists
  const distDir = path.resolve(root, 'dist');
  await fs.mkdir(distDir, { recursive: true });

  // Clean previous clone cache if any
  if (existsSync(CLONE_DIR)) {
    console.log(`[shark] Cleaning previous clone directory: ${CLONE_DIR}`);
    await fs.rm(CLONE_DIR, { recursive: true, force: true });
  }
  await fs.mkdir(path.dirname(CLONE_DIR), { recursive: true });

  try {
    console.log(`[shark] Shallow cloning ${SHARK_REPO} (branch: ${SHARK_BRANCH})...`);
    run('git', ['clone', '--depth', '1', '--branch', SHARK_BRANCH, SHARK_REPO, CLONE_DIR], root);

    const websiteDir = path.join(CLONE_DIR, 'website');
    if (!existsSync(websiteDir)) {
      throw new Error(`[shark] website directory not found in ${SHARK_REPO}`);
    }

    console.log('[shark] Installing dependencies for Shark website with bun...');
    run('bun', ['install'], websiteDir);

    console.log(`[shark] Building Shark website with base "${BASE_PATH}" and site "${SITE_URL}"...`);
    run('bun', ['run', 'build', '--', '--base', BASE_PATH, '--site', SITE_URL], websiteDir);

    const sharkDist = path.join(websiteDir, 'dist');
    if (!existsSync(sharkDist)) {
      throw new Error('[shark] Shark website build finished, but dist/ was not generated.');
    }

    console.log(`[shark] Deploying Shark build output to ${TARGET_DIR}...`);
    await fs.rm(TARGET_DIR, { recursive: true, force: true });
    await fs.mkdir(TARGET_DIR, { recursive: true });
    await fs.cp(sharkDist, TARGET_DIR, { recursive: true });

    console.log(`[shark] ✓ Successfully built and deployed Shark to ${TARGET_DIR} (available at ${BASE_PATH})!`);
  } catch (err) {
    if (isCI) {
      console.error('[shark] CI build failed:', err.message);
      process.exit(1);
    } else {
      console.warn('[shark] Local build warning (non-CI):', err.message);
      console.warn('[shark] Continuing without Shark subpath.');
    }
  } finally {
    // Clean up temporary clone to save disk space
    if (existsSync(CLONE_DIR)) {
      console.log('[shark] Cleaning up temporary clone directory...');
      await fs.rm(CLONE_DIR, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error('[shark] Unexpected error:', err);
  process.exit(1);
});
