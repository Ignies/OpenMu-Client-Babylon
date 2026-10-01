import { defineWindow } from '@/controllers/interface/windows';
import { MoveCommandWindow } from '.';

export default defineWindow({ id: 'move_command', slot: 'hud', order: 200, component: MoveCommandWindow });
