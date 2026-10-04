import { defineWindow } from '@/controllers/interface/windows';
import { Vault } from '.';

export default defineWindow({ id: 'vault', module: 'vault', slot: 'hud', order: 100, component: Vault });
