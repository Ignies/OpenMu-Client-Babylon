import { MonsterActionType } from '../../objects/enum';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 477,
  Name: 'Transformed Snowman',
  // Xmas 2008 transformed snowman (ZzzCharacter.cpp:14496-14501).
  npcModel: { file: '/Item/xmas/snowman', scale: 1.3 },
  // `PlayMonsterSoundGlobal`, also for the Snowman ring's skin (ZzzCharacter.cpp:15167-15189). Its death
  // line needs `LifeTime == 100`, which CreateMonster always sets for it (:14781-14786).
  globalVoice: {
    bus: 'monsters',
    cues: [
      { on: MonsterActionType.Walk, when: 'hold', sound: 'Sound/xmas/SnowMan_Walk01' },
      { on: MonsterActionType.Attack1, when: 'start', sound: 'Sound/xmas/SnowMan_Attack01' },
      { on: MonsterActionType.Attack2, when: 'start', sound: 'Sound/xmas/SnowMan_Attack02' },
      { on: MonsterActionType.Shock, when: 'start', sound: 'Sound/xmas/SnowMan_Damage01' },
      { on: MonsterActionType.Die, when: 'start', sound: 'Sound/xmas/SnowMan_Death01' },
    ],
  },
});
