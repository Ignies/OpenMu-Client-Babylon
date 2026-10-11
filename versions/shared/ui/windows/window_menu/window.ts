import { defineWindow } from '@/controllers/interface/windows';
import { WindowMenu } from '.';

export default defineWindow({ id: 'window_menu', slot: 'hud', order: 362, component: WindowMenu });
