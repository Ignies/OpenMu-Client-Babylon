// The one `docker compose` invocation every command shares: OpenMU's compose first, ours over it.
import { join } from 'node:path';
import type { Config } from './config';
import { files, type Paths } from './paths';
import { mailOn } from './render/mail';
import { MAIL_PROFILE, PROJECT } from './stack';

export function composeArgs(c: Config, p: Paths): string[] {
  const f = files(p);
  const args = ['compose', '-p', PROJECT, '--project-directory', join(p.repo, 'install', 'stack'), '--env-file', f.stackEnv];
  args.push('-f', f.openmuCompose, '-f', f.compose);
  if (c.mode === 'ip') args.push('-f', f.composeIp);
  if (mailOn(c)) args.push('--profile', MAIL_PROFILE);
  return args;
}
