import { defineWindow } from '@/controllers/interface/windows';
import { GmPanelWindow } from '.';

export default defineWindow({ id: 'gm_panel', module: 'gm', slot: 'hud', order: 480, component: GmPanelWindow });
