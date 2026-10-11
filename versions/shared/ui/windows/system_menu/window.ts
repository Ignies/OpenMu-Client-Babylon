import { defineWindow } from '@/controllers/interface/windows';
import { SystemMenuWindow } from '.';

export default defineWindow({ id: 'system_menu', slot: 'hud', order: 365, component: SystemMenuWindow });
