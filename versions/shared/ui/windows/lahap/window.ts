import { defineWindow } from '@/controllers/interface/windows';
import { LahapWindow } from '.';

export default defineWindow({ id: 'lahap', module: 'chaos_mix', slot: 'hud', order: 415, component: LahapWindow });
