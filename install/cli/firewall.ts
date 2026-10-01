// Opens the web ports (and SSH) on the host firewall: ufw or firewalld on Linux, Windows Firewall on Windows.
// Docker publishes only the web container's ports, so nothing else of the stack is reachable either way.
import type { Config } from './config';
import { run } from './exec';
import { isWindows } from './paths';
import { publicPorts } from './render/caddy';
import { ui } from './ui';

const has = async (cmd: string) => (await run(isWindows ? 'where' : 'sh', isWindows ? [cmd] : ['-c', `command -v ${cmd}`])).code === 0;

/** The port this SSH session came in on, so enabling the firewall never cuts it off. */
function sshPort(): number {
  return Number(process.env.SSH_CONNECTION?.split(' ')[3]) || 22;
}

export async function openFirewall(c: Config): Promise<void> {
  const ports = publicPorts(c).map(p => (p === 22 ? sshPort() : p));
  if (isWindows) {
    for (const port of ports.filter(p => p !== sshPort())) {
      await run('powershell', ['-NoProfile', '-Command', `if (-not (Get-NetFirewallRule -DisplayName 'MU ${port}' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'MU ${port}' -Direction Inbound -Protocol TCP -LocalPort ${port} -Action Allow | Out-Null }`]);
    }
    ui.ok(`Windows Firewall: ${ports.filter(p => p !== sshPort()).join(', ')} open`);
    return;
  }
  if (await has('ufw')) {
    for (const port of ports) await run('ufw', ['allow', `${port}/tcp`]);
    if (c.mode === 'domain') await run('ufw', ['allow', '443/udp']);
    await run('ufw', ['--force', 'enable']);
    ui.ok(`ufw: ${ports.join(', ')} open, everything else closed`);
  } else if (await has('firewall-cmd')) {
    for (const port of ports) await run('firewall-cmd', ['--permanent', `--add-port=${port}/tcp`]);
    await run('firewall-cmd', ['--reload']);
    ui.ok(`firewalld: ${ports.join(', ')} open`);
  } else {
    ui.warn(`No ufw or firewalld found. Open ${ports.join(', ')} in your provider's firewall.`);
  }
}
