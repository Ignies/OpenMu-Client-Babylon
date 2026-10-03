import { MonsterActionType } from '../../objects/enum';
import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 541,
  Name: 'Interim Reward Chest',
  npcModel: { file: 'DoppelgangerBox', scale: 2.3 },
  // `PlayMonsterSoundGlobal` (ZzzCharacter.cpp:15118-15216): the box as it opens.
  globalVoice: {
    bus: 'ambient',
    cues: [
      { on: MonsterActionType.Die, when: 'start', sound: 'Sound/Doppelganger/treasurebox_open' },
    ],
  },
});
