// Before the stack starts: are the ports it publishes free? Another web server on 80/443 is the usual culprit.
import type { Config } from './config';
import { run } from './exec';
import { isWindows } from './paths';
import { publicPorts } from './render/caddy';

export async function busyPorts(c: Config): Promise<number[]> {
  const busy: number[] = [];
  for (const port of publicPorts(c).filter(p => p !== 22)) {
    try {
      Bun.listen({ hostname: '0.0.0.0', port, socket: { data() {} } }).stop(true);
    } catch {
      busy.push(port);
    }
  }
  return busy;
}

/** Who holds a port, as the OS reports it, for the error message. */
export async function holder(port: number): Promise<string> {
  const r = isWindows
    ? await run('powershell', ['-NoProfile', '-Command', `(Get-Process -Id (Get-NetTCPConnection -LocalPort ${port} -State Listen).OwningProcess).ProcessName -join ', '`])
    : await run('sh', ['-c', `ss -ltnpH 'sport = :${port}' | grep -o 'users:(("[^"]*' | cut -d'"' -f2 | sort -u | tr '\\n' ' '`]);
  return r.out.trim() || 'another program';
}
