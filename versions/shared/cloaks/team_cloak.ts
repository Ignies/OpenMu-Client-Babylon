import type { CloakWearer } from '@/controllers/actors/cloaks';
import type { Rgb } from '@/controllers/cloth';
import { duelEnemyId } from '@/modules/events/duel';
import { GuildMarks } from '@/modules/guild';
import { Social } from '@/modules/social/social';

const RED: Rgb = [1, 0.2, 0];
const BLUE: Rgb = [0, 0.2, 1];

/**
 * `CloakLight`, the team colour that puts a cloak on anyone (ZzzCharacter.cpp:9188-9246), or null. Battle Soccer:
 * the hero's guild and the guild it plays by the hero's team (`HeroSoccerTeam`), then the two teams the score
 * names, red and blue (`SoccerObserver`, which the score sets for players and watchers alike). A duel, only
 * while the hero fights it (`IsDuelEnabled`; a spectator never enables it): the enemy red, the hero blue.
 */
export function teamLight(w: CloakWearer): Rgb | null {
  let light: Rgb | null = null;
  const guild = w.guild === null ? undefined : GuildMarks.get(w.guild)?.name;
  if (guild) {
    const war = Social.guildWar;
    if (war?.soccer) {
      const mine = Social.myGuild ? GuildMarks.get(Social.myGuild.id)?.name : undefined;
      if (guild === mine) light = war.team === 0 ? RED : BLUE;
      if (guild === war.enemyGuild) light = war.team === 0 ? BLUE : RED;
    }
    const match = Social.battleSoccer;
    if (match) {
      if (guild === match.redTeam) light = RED;
      if (guild === match.blueTeam) light = BLUE;
    }
  }
  const enemy = duelEnemyId();
  if (enemy !== null) {
    if (w.netId === enemy) light = RED;
    else if (w.hero) light = BLUE;
  }
  return light;
}
