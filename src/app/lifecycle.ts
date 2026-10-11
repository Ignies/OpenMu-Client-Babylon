import { weather } from '@/controllers/weather';
import { lighting } from '@/controllers/lighting';
import { effects } from '@/controllers/fx';
import { combat } from '@/controllers/combat';
import { sound } from '@/controllers/sound';
import { maps } from '@/controllers/maps';
import { events } from '@/modules/events';
import { skills } from '@/modules/skills';
import { redrawBuffLooks } from '@/modules/skills/objectEffects';
import { quests } from '@/modules/quests';
import { evictUnusedContainers } from '@/controllers/assets';
import { disposeSignPlates } from '@versions/shared/objects/signs/signPlates';

/**
 * Last, once nothing of the old map holds them: its sign plates, and the monster and NPC models
 * nothing draws now (the original's `DeleteMonsters` / `DeleteNpcs`, MapManager.cpp:1183-1185).
 */
const releaseUnused = {
  reset(): void {
    disposeSignPlates();
    evictUnusedContainers(['/Monster/', '/Npc/']);
  },
};

/** Right after `effects`: the buff looks it ended, on the bodies the new map keeps. */
const buffLooks = { reset: redrawBuffLooks };

/**
 * What a map change resets, in this exact order (unchanged from the original
 * inline sequence in loadMapIntoScene). Why each one resets: see app/readme.md.
 */
const MAP_RESET: readonly { reset(): void }[] = [weather, lighting, effects, buffLooks, events, skills, combat, quests, sound, maps, releaseUnused];

export function resetForMapChange(): void {
  for (const r of MAP_RESET) r.reset();
}
