import { MonsterActionType } from '@versions/shared/objects/enum';
import type { MonsterCue, MapSound, Sounds, VoiceSet } from '@/controllers/sound';
import { ATTACK_1_2 } from '../shared/sound';

const A = MonsterActionType;

/** `CGM_PK_Field::PlayMonsterSound` (GM_PK_Field.cpp). */
const PK_FIELD_LINE = (
  attack: Sounds,
  damage: Sounds,
  move: Sounds,
  death: Sounds
): readonly MonsterCue[] => [
  { on: ATTACK_1_2, play: attack },
  { on: [A.Shock], play: damage },
  { on: [A.Walk], play: move, chance: 20 },
  { on: [A.Die], play: death },
];

const LAVA_GIANT: readonly MonsterCue[] = [
  { on: [A.Attack1], play: 'Sound/w64/BurningLavaGolem_attack01' },
  { on: [A.Attack2], play: 'Sound/w64/BurningLavaGolem_attack02' },
  { on: [A.Shock], play: 'Sound/w64/BurningLavaGolem_damage01' },
  { on: [A.Walk], play: 'Sound/w64/BurningLavaGolem_move01', chance: 20 },
  { on: [A.Die], play: 'Sound/w64/BurningLavaGolem_death' },
];

const BLOOD_ASSASSIN = PK_FIELD_LINE(
  'Sound/w64/BloodAssassin_attack',
  'Sound/w64/BloodAssassin_damage01',
  'Sound/w64/BloodAssassin_move01',
  'Sound/w64/BloodAssassin_death'
);

export const PK_FIELD: VoiceSet = {
  // ZOMBIE_FIGHTER
  157: PK_FIELD_LINE(
    'Sound/w64/ZombieWarrior_attack',
    'Sound/w64/ZombieWarrior_damage01',
    'Sound/w64/ZombieWarrior_move01',
    'Sound/w64/ZombieWarrior_death'
  ),
  // GLADIATOR
  158: PK_FIELD_LINE(
    'Sound/w64/RaisedGladiator_attack',
    'Sound/w64/RaisedGladiator_damage01',
    'Sound/w64/RaisedGladiator_move01',
    'Sound/w64/RaisedGladiator_death'
  ),
  // SLAUGHTERER
  159: PK_FIELD_LINE(
    'Sound/w64/AshesButcher_attack',
    'Sound/w64/AshesButcher_damage01',
    'Sound/w64/AshesButcher_move01',
    'Sound/w64/AshesButcher_death'
  ),
  // BLOOD_ASSASSIN / CRUEL_BLOOD_ASSASSIN
  160: BLOOD_ASSASSIN,
  161: BLOOD_ASSASSIN,
  // LAVA_GIANT / BURNING_LAVA_GIANT
  162: LAVA_GIANT,
  163: LAVA_GIANT,
};

/** Vulcanus' sound (`MapLayer.sound`), read by the sound controller. */
export const VULCANUS_SOUND: MapSound = {
  music: 'Music/PK_Field',
  monsterCues: PK_FIELD,
};
