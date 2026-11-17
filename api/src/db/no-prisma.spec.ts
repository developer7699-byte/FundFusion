import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
const apiPkg = JSON.parse(
  readFileSync(join(repoRoot, 'api', 'package.json'), 'utf8'),
) as {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  prisma?: unknown;
};

function sourceFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (full.endsWith('.ts') && !full.endsWith('no-prisma.spec.ts'))
      acc.push(full);
  }
  return acc;
}

describe('prisma is gone', () => {
  it('no source file references prisma', () => {
    const offenders = sourceFiles(join(repoRoot, 'api', 'src'))
      .filter((f) =>
        /@prisma\/client|PrismaService|PrismaModule/.test(
          readFileSync(f, 'utf8'),
        ),
      )
      .map((f) => f.replace(repoRoot + '/', ''));
    expect(offenders).toEqual([]);
  });

  it('no prisma dependency remains', () => {
    const deps = { ...apiPkg.dependencies, ...apiPkg.devDependencies };
    expect(deps['@prisma/client']).toBeUndefined();
    expect(deps['prisma']).toBeUndefined();
  });

  it('no prisma scripts remain', () => {
    expect(
      Object.keys(apiPkg.scripts).filter((s) => s.startsWith('prisma:')),
    ).toEqual([]);
  });

  it('no prisma seed block remains', () => {
    expect(apiPkg.prisma).toBeUndefined();
  });

  it('the prisma directory is gone', () => {
    expect(existsSync(join(repoRoot, 'api', 'prisma'))).toBe(false);
    expect(existsSync(join(repoRoot, 'api', 'src', 'prisma'))).toBe(false);
  });
});
