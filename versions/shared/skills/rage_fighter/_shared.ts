import { type BoneGlow } from '@/controllers/fx/aura';
import { RGBS, TEX } from '@/controllers/fx/recipes';
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
