import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MonsterCue, MapSound, Sounds, VoiceSet } from '@/controllers/sound';
import {
  ATTACK_1_2,
  WALK,
  hookOnce,
  hookWalk,
  largeLoop,
  smallLoop,
  type Play,
} from '../shared/sound';

const A = MonsterActionType;

/** Walk chatter, then both attacks and the death behind the latch. */
const kanturuLine = (
  walk: Play,
  attack: Play,
  die: Sounds,
  once: true | 'life' = true,
  walkChance = 15
): MonsterCue[] => [
  hookWalk(walk, walkChance, WALK),
  hookOnce(ATTACK_1_2, attack, once),
  hookOnce([A.Die], die, once),
];

const BERSERK = kanturuLine(
  ['Sound/w37/ber_idle-01', 'Sound/w37/ber_idle-02'],
  ['Sound/w37/ber_attack-01', 'Sound/w37/ber_attack-02'],
  'Sound/w37/ber_death'
);
const GIGANTIS = kanturuLine(
  'Sound/w37/gigan_idle-01',
  ['Sound/w37/gigan_attack-01', 'Sound/w37/gigan_attack-02'],
  'Sound/w37/gigan_death'
);
const GENOCIDER = kanturuLine(
  ['Sound/w37/geno_idle-01', 'Sound/w37/geno_idle-02'],
  ['Sound/w37/geno_attack-01', 'Sound/w37/geno_attack-02'],
  'Sound/w37/geno_death'
);
const KENTAUROS = kanturuLine(
  ['Sound/w37/kenta_idle-01', 'Sound/w37/kenta_idle-02'],
  ['Sound/w37/kenta_attack-01', 'Sound/w37/kenta_skill-01'],
  'Sound/w37/kenta_death',
  'life'
);

/**
 * `M37Kanturu1st::RenderKanturu1stMonsterVisual` (GM_Kanturu_1st.cpp:1087-1602),
 * no world guard. The Splinter Wolf, Iron Rider, Satyros, Blade Hunter and
 * both Kentauros never clear `o->SubType` (`'life'`): one attack or death
 * line per spawn.
 */
export const KANTURU_1ST: VoiceSet = {
  106: BERSERK,
  // SPLINTER_WOLF
  107: kanturuLine(
    ['Sound/w37/swolf_idle-01', 'Sound/w37/swolf_idle-02'],
    ['Sound/w37/swolf_attack-01', 'Sound/w37/swolf_attack-02'],
    'Sound/w37/swolf_death',
    'life'
  ),
  // IRON_RIDER
  108: kanturuLine(
    ['Sound/w37/ir_idle-01', 'Sound/w37/ir_idle-02'],
    ['Sound/w37/ir_attack-01', 'Sound/w37/ir_attack-02'],
    'Sound/w37/ir_death',
    'life'
  ),
  // SATYROS
  109: kanturuLine(
    ['Sound/w37/sati_idle-01', 'Sound/w37/sati_idle-02'],
    ['Sound/w37/sati_attack-01', 'Sound/w37/sati_attack-02'],
    'Sound/w37/sati_death',
    'life'
  ),
  // BLADE_HUNTER
  110: kanturuLine(
    ['Sound/w37/blade_idle-01', 'Sound/w37/blade_idle-02'],
    ['Sound/w37/blade_attack-01', 'Sound/w37/blade_attack-02'],
    'Sound/w37/blade_death',
    'life',
    10
  ),
  111: KENTAUROS,
  112: GIGANTIS,
  113: GENOCIDER,
  // BERSERKER_WARRIOR / KENTAUROS_WARRIOR / GIGANTIS_WARRIOR / SOCCERBALL
  197: BERSERK,
  198: KENTAUROS,
  199: GIGANTIS,
  200: GENOCIDER,
};

/** Kanturu ruins' sound (`MapLayer.sound`), read by the sound controller. */
export const KANTURU_1ST_SOUND: MapSound = {
  // The Kanturu "global" loop (GM_kanturu_1st.cpp:122).
  beds: [{ sound: 'Sound/w37/kan_ruin_global', volume: 0.4 }],
  music: 'Music/kanturu_1st',
  // GM_kanturu_1st.cpp:60-115 (`MoveKanturu1stObject`).
  objectLoops: [
    largeLoop([46], 'Sound/w37/kan_ruin_wheel', 0.35),
    largeLoop([77], 'Sound/w37/kan_ruin_waterfall', 0.4),
    smallLoop([92], 'Sound/w37/kan_ruin_elec', 0.35),
    smallLoop([98], 'Sound/w37/kan_ruin_plant', 0.3),
  ],
  monsterCuesAnyMap: KANTURU_1ST,
};
