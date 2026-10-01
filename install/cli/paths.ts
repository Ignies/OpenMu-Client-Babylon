// Where things live. The state folder sits outside the repo so a re-clone or `git clean` never loses it.
import { join, resolve } from 'node:path';

export type Paths = {
  repo: string;
  state: string;
  /** OpenMU's own repository, checked out at the release we run. */
  openmu: string;
  backups: string;
};

export const isWindows = process.platform === 'win32';

export function paths(env: Record<string, string | undefined> = process.env): Paths {
  const repo = resolve(import.meta.dir, '../..');
  const state = env.MU_STATE || (isWindows ? join(env.ProgramData || 'C:\\ProgramData', 'mu-server') : '/etc/mu-server');
  return { repo, state, openmu: join(state, 'openmu'), backups: join(state, 'backups') };
}

export const files = (p: Paths) => ({
  config: join(p.state, 'mu.env'),
  stackEnv: join(p.state, 'stack.env'),
  caddyfile: join(p.state, 'Caddyfile'),
  serverList: join(p.state, 'serverlist.md'),
  serviceEnv: (service: string) => join(p.state, 'env', `${service}.env`),
  openmuCompose: join(p.openmu, 'deploy', 'all-in-one', 'docker-compose.yml'),
  compose: join(p.repo, 'install', 'stack', 'compose.yml'),
  composeIp: join(p.repo, 'install', 'stack', 'compose.ip.yml'),
});
