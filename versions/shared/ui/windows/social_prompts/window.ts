import { defineWindow } from '@/controllers/interface/windows';
import { SocialPrompts } from '.';

export default defineWindow({ id: 'social_prompts', slot: 'hud', order: 330, component: SocialPrompts });
