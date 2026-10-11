import { defineSkill } from '@/controllers/skills/define';
import { afterRelease, atCaster, cm, seq, ticks } from '@/controllers/skills/visuals';
import { landingSound, spiralRibbons } from '../../_shared';

export default defineSkill({
  id: 53,
  name: "Improve AG",
  // ReceiveMagicFinish drops eBuff_AddAG (WSclient.cpp:3921-3923).
  effect: 7,
  // 53 Improve AG, at the release (ZzzCharacter.cpp:2859-2864, :4343-4363): 4× JOINT_HEALING sub10 from ±80 offset
  // +300 z, width 15, LT 80, MaxTails 20, Light (1,0.5,1)/11.
  visual: { impact: afterRelease(seq(landingSound, atCaster(spiralRibbons(4, [1 / 11, 0.5 / 11, 1 / 11], cm(15), 20, ticks(80)), 0.2))) },
  // SOUND_SWELLLIFE after the four joints (:4364).
  sound: 'Sound/eSwellLife',
  soundOnLanding: true,
  buffs: {
    // 7 AG recovery: the orbiting healing rings.
    7: () => ({ healingRings: true }),
  },
  target: 'self',
});
