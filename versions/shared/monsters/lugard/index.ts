import { MonsterActionType } from '../../objects/enum';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 540,
  Name: 'Lugard',
  npcModel: { file: 'Lugard', scale: 1.1 },
  // `PlayMonsterSoundGlobal` (ZzzCharacter.cpp:15118-15216): one idle loop in two.
  globalVoice: {
    bus: 'ambient',
    cues: [
      { on: MonsterActionType.Stop1, when: 'loop', sound: 'Sound/Doppelganger/Lugard', oneIn: 2 },
    ],
  },
});
