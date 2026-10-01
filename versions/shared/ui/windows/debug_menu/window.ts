import { defineWindow } from '@/controllers/interface/windows';
import { DebugMenuWindow } from '.';

export default defineWindow({ id: 'debug_menu', slot: 'hud', order: 470, component: DebugMenuWindow });
