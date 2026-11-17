import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { platformConfig } from './platform.config';

const repoRoot = join(__dirname, '..', '..', '..');

describe('platformConfig', () => {
  const original = process.env.PLATFORM_NAME;
  afterEach(() => {
    if (original === undefined) delete process.env.PLATFORM_NAME;
    else process.env.PLATFORM_NAME = original;
  });

  it('defaults when PLATFORM_NAME is unset', () => {
    delete process.env.PLATFORM_NAME;
    expect(platformConfig().platformName).toBe('FundFusion');
  });

  // `process.env.X ?? 'default'` returns '' for an empty variable, so an unset
  // key and an empty key must both fall back rather than render as nothing.
  it('defaults when PLATFORM_NAME is empty', () => {
    process.env.PLATFORM_NAME = '';
    expect(platformConfig().platformName).toBe('FundFusion');
  });

  it('reads the configured value', () => {
    process.env.PLATFORM_NAME = 'PandaPay';
    expect(platformConfig().platformName).toBe('PandaPay');
  });
});

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.'))
      continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (
      /\.(ts|tsx|html|css)$/.test(full) &&
      !full.endsWith('platform.config.spec.ts')
    )
      acc.push(full);
  }
  return acc;
}

describe('brand is not hardcoded', () => {
  it('no source file contains the old brand name', () => {
    const offenders = [
      join(repoRoot, 'api', 'src'),
      join(repoRoot, 'web', 'src'),
    ]
      .flatMap((d) => sourceFiles(d))
      .filter((f) => /nexora/i.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(repoRoot + '/', ''));
    expect(offenders).toEqual([]);
  });
});
