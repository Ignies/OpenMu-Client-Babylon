import { defineWindow } from '@/controllers/interface/windows';
import { MobileControls } from '.';

export default defineWindow({ id: 'mobile_controls', slot: 'hud', order: 490, component: MobileControls });
