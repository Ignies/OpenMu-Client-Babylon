import { defineWindow } from '@/controllers/interface/windows';
import { SlideHelpBar } from '.';

export default defineWindow({ id: 'slide_help', slot: 'hud', order: 50, component: SlideHelpBar });
