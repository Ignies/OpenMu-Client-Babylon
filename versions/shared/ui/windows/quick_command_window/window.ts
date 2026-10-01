import { defineWindow } from '@/controllers/interface/windows';
import { QuickCommandWindow } from '.';

export default defineWindow({ id: 'quick_command', slot: 'hud', order: 250, component: QuickCommandWindow });
