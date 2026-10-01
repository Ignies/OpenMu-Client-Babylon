import { defineWindow } from '@/controllers/interface/windows';
import { NpcShop } from '.';

export default defineWindow({ id: 'npc_shop', slot: 'hud', order: 90, component: NpcShop });
