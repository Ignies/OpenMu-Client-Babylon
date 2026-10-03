import { MonsterActionType } from '../../objects/enum';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 479,
  Name: 'Doorkeeper Titus',
  npcModel: { file: 'titus', scale: 1.1 },
  // `PlayMonsterSoundGlobal` (ZzzCharacter.cpp:15118-15216): every idle loop.
  globalVoice: {
    bus: 'ambient',
    cues: [
      { on: MonsterActionType.Stop1, when: 'loop', sound: 'Sound/w64/GatekeeperTitus' },
    ],
  },
});
