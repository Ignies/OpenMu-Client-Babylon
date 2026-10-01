import { defineWindow } from '@/controllers/interface/windows';
import { SkillListWindow } from '.';

export default defineWindow({ id: 'skills', slot: 'hud', order: 280, component: SkillListWindow });
