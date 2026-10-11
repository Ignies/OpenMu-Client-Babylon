import { defineWindow } from '@/controllers/interface/windows';
import { PartyList } from '.';

export default defineWindow({ id: 'party_list', module: 'party', slot: 'hud', order: 65, component: PartyList });
