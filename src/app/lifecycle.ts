import { weather } from '@/controllers/weather';
import { lighting } from '@/controllers/lighting';
import { effects } from '@/controllers/fx';
import { combat } from '@/controllers/combat';
import { sound } from '@/controllers/sound';
import { maps } from '@/controllers/maps';
import { events } from '@/features/events';
import { skills } from '@/features/skills';
import { quests } from '@/features/quests';

/**
 * What a map change resets, in this exact order (unchanged from the original
 * inline sequence in loadMapIntoScene). Why each one resets: see app/readme.md.
 */
const MAP_RESET: readonly { reset(): void }[] = [weather, lighting, effects, events, skills, combat, quests, sound, maps];

export function resetForMapChange(): void {
  for (const r of MAP_RESET) r.reset();
}
