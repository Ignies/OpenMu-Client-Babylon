import { defineWindow } from '@/controllers/interface/windows';
import { ChaosMachine } from '.';

export default defineWindow({ id: 'chaos_machine', module: 'chaos_mix', slot: 'hud', order: 110, component: ChaosMachine });
