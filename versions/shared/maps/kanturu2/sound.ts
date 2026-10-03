import type { MapSound, VoiceSet } from '@/controllers/sound';
import { WALK, hookPlay, hookWalk, smallLoop } from '../shared/sound';
import { MonsterActionType } from '@versions/shared/objects/enum';

const A = MonsterActionType;

/**
 * `M38Kanturu2nd::Render_Kanturu2nd_MonsterVisual` (GM_Kanturu_2nd.cpp:793-1071),
 * no world guard. Stop and Walk both clear its latch, so a per-clip play
 * stands in for it; the deaths are re-issued every frame.
 */
export const KANTURU_2ND: VoiceSet = {
  // PERSONA
  114: [
    hookWalk(['Sound/w38/perso_idle-01', 'Sound/w38/perso_idle-02'], 15, WALK),
    hookPlay([A.Attack1], 'Sound/w38/perso_attack-01'),
    hookPlay([A.Attack2], 'Sound/w38/perso_attack-02'),
    hookPlay([A.Die], 'Sound/w38/perso_death'),
  ],
  // TWIN_TAIL - one of the pair every 500 ms of walking (:963-990)
  115: [
    {
      ...hookPlay(WALK, ['Sound/w38/twin_idle-01', 'Sound/w38/twin_idle-02']),
      period: 500,
    },
    hookPlay([A.Attack1], 'Sound/w38/twin_attack-01'),
    hookPlay([A.Attack2], 'Sound/w38/twin_attack-02'),
    hookPlay([A.Die], 'Sound/w38/twin_death'),
  ],
  // DREADFEAR
  116: [
    hookWalk(['Sound/w38/dred_idle-01', 'Sound/w38/dred_idle-02'], 15, WALK),
    hookPlay([A.Attack1], 'Sound/w38/dred_attack-01'),
    hookPlay([A.Attack2], 'Sound/w38/dred_attack-02'),
    hookPlay([A.Die], 'Sound/w38/dred_death'),
  ],
};

/** Kanturu relics' sound (`MapLayer.sound`), read by the sound controller. */
export const KANTURU_2ND_SOUND: MapSound = {
  // The Kanturu "global" loop (GM_Kanturu_2nd.cpp:196).
  beds: [{ sound: 'Sound/w38/kan_relic_global', volume: 0.4 }],
  music: 'Music/kanturu_2nd',
  // GM_Kanturu_2nd.cpp:194-210 (`Sound_Kanturu2nd_Object`).
  objectLoops: [
    smallLoop([9], 'Sound/w38/kan_relic_gear', 0.35),
    smallLoop([31, 35, 36, 37], 'Sound/w38/kan_relic_incubator', 0.3),
  ],
  monsterCuesAnyMap: KANTURU_2ND,
};
