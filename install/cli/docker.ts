// The running stack: every Docker call the commands make goes through here.
import { composeArgs } from './compose';
import type { Config } from './config';
import { attach, must, run, runLogged, type Result } from './exec';
import type { Paths } from './paths';

export type ServiceState = { service: string; state: string; health: string };

export class Stack {
  constructor(
    readonly config: Config,
    readonly paths: Paths,
  ) {}

  /** `docker` arguments for this stack plus `extra`. */
  command(...extra: string[]): string[] {
    return [...composeArgs(this.config, this.paths), ...extra];
  }

  compose(extra: string[], input?: string): Promise<Result> {
    return run('docker', this.command(...extra), { input });
  }

  build(log: string, onLine?: (line: string) => void): Promise<number> {
    return runLogged('docker', this.command('build'), log, onLine);
  }

  async up(...services: string[]): Promise<void> {
    const r = await this.compose(['up', '-d', '--no-build', '--wait', '--wait-timeout', '600', '--remove-orphans', ...services]);
    if (r.code !== 0) throw new Error(r.err || r.out);
  }

  async stop(...services: string[]): Promise<void> {
    await this.compose(['stop', ...services]);
  }

  /** A command inside a running service. */
  exec(service: string, cmd: string[], input?: string): Promise<Result> {
    return this.compose(['exec', '-T', service, ...cmd], input);
  }

  /** A one-off container of a service's image, with its env and volumes (and any extra binds). */
  once(service: string, cmd: string[], opts: { input?: string; binds?: string[] } = {}): Promise<Result> {
    const binds = (opts.binds ?? []).flatMap(b => ['-v', b]);
    return this.compose(['run', '--rm', '--no-deps', '-T', ...binds, service, ...cmd], opts.input);
  }

  logs(service?: string): Promise<number> {
    return attach('docker', this.command('logs', '-f', '--tail', '200', ...(service ? [service] : [])));
  }

  async states(): Promise<ServiceState[]> {
    const r = await this.compose(['ps', '-a', '--format', 'json']);
    if (r.code !== 0 || !r.out) return [];
    const rows = r.out.startsWith('[') ? JSON.parse(r.out) : r.out.split('\n').map(l => JSON.parse(l));
    return rows.map((row: { Service: string; State: string; Health: string }) => ({ service: row.Service, state: row.State, health: row.Health }));
  }

  /** `docker compose config`: proves the files and the rendered state fit together. */
  async validate(): Promise<void> {
    await must('docker', this.command('config', '--quiet'));
  }
}

/** Docker must be running, with Compose 2.24.4 or newer (`!reset` / `!override` in compose.yml). */
export async function dockerProblem(): Promise<string | undefined> {
  const info = await run('docker', ['info', '--format', '{{.ServerVersion}}']);
  if (info.code !== 0) return 'Docker is not running (or this user may not use it).';
  const v = await run('docker', ['compose', 'version', '--short']);
  const [major, minor, patch] = v.out.replace(/^v/, '').split('.').map(Number);
  const ok = major > 2 || (major === 2 && (minor > 24 || (minor === 24 && patch >= 4)));
  if (v.code !== 0 || !ok) return `Docker Compose 2.24.4 or newer is needed (found ${v.out || 'none'}).`;
}
