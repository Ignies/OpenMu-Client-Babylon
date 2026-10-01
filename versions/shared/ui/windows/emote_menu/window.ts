import { defineWindow } from '@/controllers/interface/windows';
import { EmoteMenu } from '.';

export default defineWindow({ id: 'emote_menu', slot: 'hud', order: 210, component: EmoteMenu });
