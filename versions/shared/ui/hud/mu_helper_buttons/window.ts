import { defineWindow } from '@/controllers/interface/windows';
import { MuHelperButtons } from '.';

export default defineWindow({ id: 'mu_helper_buttons', module: 'mu_helper', slot: 'hud', order: 456, component: MuHelperButtons });
