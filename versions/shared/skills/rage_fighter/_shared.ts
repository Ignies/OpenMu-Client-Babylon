import { type BoneGlow } from '@/controllers/fx/aura';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { effects } from '@/controllers/fx';
import { TICK, entityPos, entityYaw, type RGB } from '@/controllers/fx/core';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { after, ticks, type Step } from '@/controllers/skills/visuals';
import { PlayerAction } from '@versions/shared/objects/enum';
import type { ClipPick } from '@/controllers/combat';
import type { Sounds } from '@/controllers/sound';

/** The two clips a party buff (266-268) picks between, evens (SetRageSkillAni, MonkSystem.cpp:2866-2874). */
export const PARTY_BUFF_CLIPS: readonly PlayerAction[] = [PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES, PlayerAction.PLAYER_SKILL_HP_UP_OURFORCES];
/** `rand_fps_check(2)`: the party buffs toss a coin for their clip rather than go by the caster. */
export const partyBuffClip: ClipPick = () => PARTY_BUFF_CLIPS[Math.random() < 0.5 ? 0 : 1];
/** The sound goes with the toss (SkillCast.cpp:915-931): ATT_UP with Rage_Buff_1, HP_UP with Rage_Buff_2. */
export const partyBuffSound = (clip: PlayerAction): Sounds =>
  clip === PARTY_BUFF_CLIPS[1] ? 'Sound/Ragefighter/Rage_Buff_2' : 'Sound/Ragefighter/Rage_Buff_1';

/** The Ourforces glow's 17 bones, in three breathing groups (ZzzEffect.cpp:9602-9636). */
const OURFORCES_BONES = [12, 17, 5, 10, 36, 27, 37, 28, 11, 35, 2, 3, 36, 20, 27, 4, 26] as const;
const OURFORCES_SLOW = new Set([5, 12, 7, 8, 9, 14, 15, 16]);
const ourforcesBreathe = (t: number, i: number): number =>
  i < 3 ? (Math.sin(t * 10) + 1) * 0.25 + 0.2 : OURFORCES_SLOW.has(i) ? (Math.sin(t * 5) + 1) * 0.25 + 0.5 : (Math.sin(t * 10) + 1) * 0.3 + 0.3;
export const OURFORCES_GLOW: BoneGlow = { bones: OURFORCES_BONES, texture: TEX.flareRed, colour: RGBS.white, size: 0.96, breathe: ourforcesBreathe };

/** The ticks a wind pillar raises its sub 3: LifeTime 40 and 30 of 50, or 60 and 50 of 70 (MoveHandlers.cpp:9538, :9590). */
const WIND_FORCE_THROWS = [11, 21];

/**
 * One MODEL_WINDFOCE (wind_foce.bmd) at `at`, where it stays. Each tick it turns to `-WorldTime * 0.3` degrees, or
 * `* 0.9` when `fast` (sub 2, 3), grows 0.1 up to 3 and keeps 0.9 of its Light (0.85 fast) (MoveHandlers.cpp:9524-9609);
 * LifeTime 50, 70 fast (ZzzEffect.cpp:6004-6023). Drawn RENDER_BRIGHT at Light x 6, clamped (ZzzObject.cpp:2509-2514):
 * the blend is (ONE, ONE), so the Alpha it also loses shows nothing.
 */
function windPillar(colour: RGB, fast: boolean): Step {
  const keep = fast ? 0.85 : 0.9;
  // Degrees a ms of WorldTime as radians a second; MU's yaw turns the other way.
  const spin = ((fast ? 0.9 : 0.3) * 1000 * Math.PI) / 180;
  const moves = (t: number): number => Math.floor(t / TICK + 1e-6);
  return (at, c) =>
    effects.spawn('model', c.scene, at, {
      model: MODEL.windForce,
      seconds: ticks(fast ? 70 : 50),
      yaw: entityYaw(c.caster),
      spin,
      scaleAt: t => Math.min(3, 1 + 0.1 * moves(t)),
      colour,
      blendMesh: 0,
      blendLight: t => 6 * keep ** moves(t),
      blendClamp: true,
      fadeTail: 0,
    });
}

/**
 * The wind pillar Dark Side and the Ourforces buffs raise at the caster's feet (MonkSystem.cpp:1151, :1179, :1209,
 * :1298), and the fast sub 3 pillar it raises where it stands on its 11th and 21st tick, in `thrown`'s Light.
 */
export const windForce = (colour: RGB, fast: boolean, thrown: RGB): Step => {
  const own = windPillar(colour, fast);
  const sub3 = windPillar(thrown, true);
  return (_at, c) => {
    const feet = entityPos(c.caster, 0, new Vector3());
    own(feet, c);
    for (const tick of WIND_FORCE_THROWS) after(ticks(tick), sub3)(feet, c);
  };
};
