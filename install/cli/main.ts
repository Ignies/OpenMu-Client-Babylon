// `mu`: the server installer and manager. Run with no arguments for the menu. See install/readme.md.
import { files, paths } from './paths';
import { loadConfig } from './state';
import { ui, pc } from './ui';
import { install } from './commands/install';
import { adopt } from './commands/adopt';
import { backupNow, configure, logs, restoreBackup, status, uninstall, update } from './commands/manage';

const HELP = `mu [command]
  (none)       menu
  install      set up a new server
  adopt        move an existing hand-made server into this setup
  update       back up, pull from git, rebuild, restart (rolls back on failure)
  config       change address, passwords, features or the OpenMU version
  status       what is running and answering
  logs [svc]   follow the logs (proxy, openmu-startup, cashshop, ...)
  backup       back up the database and all service data
  restore [d]  put a backup back
  uninstall    remove the server (data kept unless you say otherwise)`;

const p = paths();
const [command, arg] = process.argv.slice(2);
const config = loadConfig(p);

async function needsConfig() {
  if (config) return config;
  ui.error(`Nothing is installed yet (no ${files(p).config}). Run ${pc.bold('mu install')} or ${pc.bold('mu adopt')}.`);
  process.exit(1);
}

async function menu(): Promise<string> {
  ui.intro('MU server');
  if (!config) {
    return ui.select('Nothing is installed here yet.', [
      { value: 'install', label: 'Install a new server' },
      { value: 'adopt', label: 'Adopt an existing server', hint: 'move a hand-made OpenMU setup in' },
    ]);
  }
  return ui.select('What do you want to do?', [
    { value: 'status', label: 'Status' },
    { value: 'update', label: 'Update from GitHub' },
    { value: 'config', label: 'Change settings' },
    { value: 'logs', label: 'Logs' },
    { value: 'backup', label: 'Back up now' },
    { value: 'restore', label: 'Restore a backup' },
    { value: 'uninstall', label: 'Uninstall' },
  ]);
}

try {
  const chosen = command ?? (await menu());
  switch (chosen) {
    case 'install':
      if (config && !(await ui.confirm('A server is already installed here. Install again over it?', false))) break;
      await install(p);
      break;
    case 'adopt':
      await adopt(p);
      break;
    case 'update':
      await update(await needsConfig(), p);
      break;
    case 'config':
      await configure(await needsConfig(), p);
      break;
    case 'status':
      await status(await needsConfig(), p);
      break;
    case 'logs':
      await logs(await needsConfig(), p, arg);
      break;
    case 'backup':
      await backupNow(await needsConfig(), p);
      break;
    case 'restore':
      await restoreBackup(await needsConfig(), p, arg);
      break;
    case 'uninstall':
      await uninstall(await needsConfig(), p);
      break;
    default:
      console.log(HELP);
  }
} catch (e) {
  ui.error((e as Error).message);
  process.exit(1);
}
