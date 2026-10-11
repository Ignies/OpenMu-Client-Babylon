import { defineWindow } from '@/controllers/interface/windows';
import { Minimap } from '.';

export default defineWindow({ id: 'minimap', slot: 'hud', order: 450, component: Minimap });
