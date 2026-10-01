// OpenMU, installed the OpenMU way: their repository at a release tag, their all-in-one compose.
// With a source ref set, their own Startup/Dockerfile builds the image instead of pulling the release.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from './config';
import { must, runLogged } from './exec';
import type { Paths } from './paths';

export const OPENMU_REPO = 'https://github.com/MUnique/OpenMU.git';

const git = (p: Paths, ...args: string[]) => must('git', ['-C', p.openmu, ...args]);

/** Checks out the ref the config names (release tag, or the source ref), fetching only that. */
export async function checkoutOpenMu(c: Config, p: Paths): Promise<void> {
  const ref = c.openmuSourceRef || `v${c.openmuVersion}`;
  if (!existsSync(join(p.openmu, '.git'))) {
    await must('git', ['init', '-q', p.openmu]);
    await git(p, 'remote', 'add', 'origin', OPENMU_REPO);
  }
  await git(p, 'fetch', '-q', '--depth', '1', 'origin', ref);
  await git(p, 'checkout', '-q', '--force', 'FETCH_HEAD');
}

/** Builds OpenMU from its source with its own Dockerfile, when the config asks for a source ref. */
export async function buildOpenMuFromSource(c: Config, p: Paths, log: string, onLine?: (l: string) => void): Promise<void> {
  if (!c.openmuSourceRef) return;
  const src = join(p.openmu, 'src');
  const code = await runLogged('docker', ['build', '-t', 'mu-openmu-base:local', '-f', join(src, 'Startup', 'Dockerfile'), src], log, onLine);
  if (code !== 0) throw new Error(`Building OpenMU from source failed; see ${log}`);
}
