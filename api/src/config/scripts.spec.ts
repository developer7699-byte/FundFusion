import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');

function pkg(workspace: string): { scripts?: Record<string, string> } {
  return JSON.parse(
    readFileSync(join(repoRoot, workspace, 'package.json'), 'utf8'),
  ) as { scripts?: Record<string, string> };
}

const apiPkg = pkg('api');
const webPkg = pkg('web');
const rootPkg = pkg('.');

describe('ci scripts', () => {
  // The CI workflow invokes these by name. `npm run <missing>` exits 0, so a
  // workflow can be green while running nothing. Assert they exist.
  it.each(['lint', 'typecheck', 'build'])('web defines %s', (name) => {
    expect(webPkg.scripts?.[name]).toBeDefined();
  });

  it.each(['lint', 'typecheck', 'test', 'build'])('api defines %s', (name) => {
    expect(apiPkg.scripts?.[name]).toBeDefined();
  });

  it.each(['lint', 'typecheck', 'test', 'build'])('root defines %s', (name) => {
    expect(rootPkg.scripts?.[name]).toBeDefined();
  });

  it('api lint does not mutate the tree', () => {
    expect(apiPkg.scripts?.lint).not.toContain('--fix');
  });
});
