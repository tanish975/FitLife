import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'fitlife-cloud-test-'));
try {
  const outfile = join(dir, 'cloud-unit.mjs');
  await build({ entryPoints: ['qa/cloud-unit.ts'], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
  await import(pathToFileURL(outfile).href);
} finally { await rm(dir, { recursive: true, force: true }); }
