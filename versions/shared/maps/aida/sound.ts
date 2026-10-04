import type { MonsterCue, MapSound, Sounds, VoiceSet } from '@/controllers/sound';
import { hookOnce, hookWalk, type Play } from '../shared/sound';
import { MonsterActionType } from '@versions/shared/objects/enum';

const A = MonsterActionType;

/** Walk chatter, then Attack1 / Attack2 / death behind the latch. */
const aidaLine = (walk: Play, at1: Sounds, at2: Sounds, die: Sounds, walkChance = 15): MonsterCue[] => [
  hookWalk(walk, walkChance),
  hookOnce([A.Attack1], at1),
  hookOnce([A.Attack2], at2),
  hookOnce([A.Die], die),
];

const WITCH_QUEEN: readonly MonsterCue[] = [
  hookWalk(['Sound/w34/wq_idle1', 'Sound/w34/wq_idle2']),
  hookOnce([A.Attack1], 'Sound/w34/wq_attack2'),
  // SOUND_CHAOS_THUNDER01 + rand() % 2 and her own line, behind one latch
  hookOnce([A.Attack2], ['Sound/eElec1', 'Sound/eElec2']),
  hookOnce([A.Attack2], 'Sound/w34/wq_attack1'),
  hookOnce([A.Die], 'Sound/w34/wq_death'),
];
const STONE_GOLEM = aidaLine(
  ['Sound/w34/bg_idle1', 'Sound/w34/bg_idle2'],
  'Sound/w34/bg_attack1',
  'Sound/w34/bg_attack2',
  'Sound/w34/bg_death'
);
// The data ships `dr_idle01`, so `dr_idle1.wav` (MapManager.cpp:344) never
// loads and half the walk rolls are silent.
const DEATH_RIDER = aidaLine(
  'Sound/w34/dr_idle2',
  'Sound/w34/dr_attack1',
  'Sound/w34/dr_attack2',
  'Sound/w34/dr_death',
  30
);
const FOREST_ORC = aidaLine(
  ['Sound/w34/fo_idle1', 'Sound/w34/fo_idle2'],
  'Sound/w34/fo_attack1',
  'Sound/w34/fo_attack2',
  'Sound/w34/fo_death'
);

/** `M33Aida::RenderAidaMonsterVisual` (GMAida.cpp:723-1390), no world guard. */
const AIDA: VoiceSet = {
  100: WITCH_QUEEN,
  // GOLDEN_STONE_GOLEM
  101: STONE_GOLEM,
  102: DEATH_RIDER,
  103: FOREST_ORC,
  // DEATH_TREE
  104: aidaLine(
    ['Sound/w34/dt_idle1', 'Sound/w34/dt_idle2'],
    'Sound/w34/dt_attack1',
    'Sound/w34/dt_attack2',
    'Sound/w34/dt_death'
  ),
  // HELL_MAINE - Attack1 plays the ATTACK3 wave and Attack3 the ATTACK1 one
  105: [
    hookWalk(['Sound/w34/hm_idle1', 'Sound/w34/hm_idle2']),
    hookOnce([A.Attack1], 'Sound/w34/hm_bloodywind'),
    hookOnce([A.Attack2], 'Sound/w34/hm_firelay'),
    hookOnce([A.Attack3], 'Sound/w34/hm_attack1'),
    hookOnce([A.Die], 'Sound/w34/hm_death'),
  ],
  // BLOODY_ORC / BLOODY_DEATH_RIDER / BLOODY_GOLEM / BLOODY_WITCH_QUEEN
  193: FOREST_ORC,
  194: DEATH_RIDER,
  195: STONE_GOLEM,
  196: WITCH_QUEEN,
};

/** Aida's sound (`MapLayer.sound`), read by the sound controller. */
export const AIDA_SOUND: MapSound = {
  // `PlayBuffer(SOUND_AIDA_AMBIENT)` every frame (GMAida.cpp:92).
  beds: [{ sound: 'Sound/w34/aida_ambi', volume: 0.4 }],
  music: 'Music/Aida',
  monsterCuesAnyMap: AIDA,
};
