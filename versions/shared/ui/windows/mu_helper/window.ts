import { defineWindow } from '@/controllers/interface/windows';
import { MuHelperWindow } from '.';

export default defineWindow({ id: 'mu_helper', slot: 'hud', order: 170, component: MuHelperWindow });
