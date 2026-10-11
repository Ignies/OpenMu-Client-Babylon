import { defineWindow } from '@/controllers/interface/windows';
import { BottomBar } from '.';

export default defineWindow({ id: 'bottom_bar', slot: 'hud', order: 70, component: BottomBar });
