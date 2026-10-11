import { defineWindow } from '@/controllers/interface/windows';
import { BuffBar } from '.';

export default defineWindow({ id: 'buff_bar', slot: 'hud', order: 60, component: BuffBar });
