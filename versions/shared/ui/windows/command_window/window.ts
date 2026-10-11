import { defineWindow } from '@/controllers/interface/windows';
import { CommandWindow } from '.';

export default defineWindow({ id: 'command', slot: 'hud', order: 240, component: CommandWindow });
