import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'fitlife-phase0-test-'));
try {
  const outfile = join(dir, 'unit.mjs');
  await build({ entryPoints: ['qa/phase0-unit.ts'], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
  await import(pathToFileURL(outfile).href);
} finally { await rm(dir, { recursive: true, force: true }); }
