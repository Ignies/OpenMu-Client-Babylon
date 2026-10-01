import { defineWindow } from '@/controllers/interface/windows';
import { PartyWindow } from '.';

export default defineWindow({ id: 'party', slot: 'hud', order: 260, component: PartyWindow });
