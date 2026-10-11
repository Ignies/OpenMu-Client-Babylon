import { defineMonsterModel } from '@/controllers/monsters';
import { MonsterActionType as M } from '../objects/enum';

export default defineMonsterModel({
  type: 42,
  name: 'Tantallos',
  voices: ['Sound/jaikan1', 'Sound/jaikan2', 'Sound/jaikan_attack1', 'Sound/jaikan_attack2', 'Sound/jaikan_die'],
  clipSpeeds: { [M.Attack1]: 0.35, [M.Attack2]: 0.35 },
  speedScale: 0.4,
});
