import { defineWindow } from '@/controllers/interface/windows';
import { BalgassEntryWindow } from '.';

export default defineWindow({ id: 'balgass_entry', module: 'quests', slot: 'hud', order: 410, component: BalgassEntryWindow });
