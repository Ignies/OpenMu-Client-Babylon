import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { BaseClass, getBaseClass } from '@/core/types';
import { Ecs } from '@/ecs/current';
import { Hero } from '@/modules/hero';
import { HeroSkills } from '@/modules/skills';
import { Social } from '@/modules/social/social';
import { GameOptions } from '@/controllers/settings';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { useUiStageScale } from '@/controllers/interface/components/ui_stage';
import { uiClick } from '@/controllers/sound/sfx';
import { cornerPanelSpan } from '../minimap/corner';
import { nameColor, rowLooks, type RowLook, type SeenPlayer } from './rows';

/**
 * `CNewUIPartyListWindow` (NewUIPartyListWindow.cpp): the members always on screen at
 * (640 - 79, 14), one 77x23 plate every 24 px with the name, the HP steps and, for the leader or
 * the hero's own row, the X that kicks or leaves. A member out of sight is drawn on red, one
 * under Greater Defense on green, the hovered one grey; with an ally skill selected a right click
 * on a member casts it on them (`SelectCharacterInPartyList`). Reads `Social.partyMembers`.
 */

/** Two stage pixels in from the right edge (640 - 79 + 77). */
const RIGHT = 2;
const TOP = 14;
const ROW = { width: 77, height: 23, step: 24 };
// `left`/`top`, not `x`/`y`: these go straight into `style`.
const FILL = { left: 2, top: 2, width: 74, height: 17 };
const NAME = { x: 4, y: 4 };
/** `m_iLimitUserIDHeight`: the leader's name stops at the flag. */
const NAME_WIDTH = [48, 58];
const FLAG = { x: 53, y: 3, width: 9, height: 10 };
const EXIT = { x: 63, y: 3, size: 11 };
const HP = { x: 4, y: 16, width: 69, height: 3 };
const SAMPLE_MS = 250;
const UNSEEN: RowLook = { sight: 'far', defense: false };

const BACK_SPRITE = 'newui_Party_Back.OZT';
const HP_SPRITE = 'newui_Party_HpBar.OZJ';
const FLAG_SPRITE = 'newui_Party_flag.OZT';
const EXIT_SPRITE = 'newui_Party_X.OZT';

/** `eBuff_Defense`: the elf's Greater Defense. */
const GREATER_DEFENSE = 2;

/** Heal, Greater Defense / Damage, Teleport Ally, Soul Barrier, Thorns, Recover and their master forms. */
const ALLY_SKILLS = new Set([26, 413, 27, 417, 423, 28, 420, 422, 15, 16, 403, 404, 217, 234]);
const ALLY_CASTERS = new Set([BaseClass.Elf, BaseClass.Wizard, BaseClass.Summoner]);

function sampleLooks(): RowLook[] {
  const players: SeenPlayer[] = [];
  for (const e of Ecs.world?.playersQuery.entities ?? []) {
    if (e.localPlayer) continue;
    players.push({
      name: e.objectNameInWorld ?? '',
      visible: e.visibility?.state === 'visible',
      dead: !!e.dying,
      defense: !!e.buffs?.has(GREATER_DEFENSE),
    });
  }
  return rowLooks(Social.partyMembers, Hero.name, players);
}

/** The right click on a found member: the selected ally skill goes to them. */
function castOn(name: string): void {
  const world = Ecs.world;
  if (!world || !ALLY_CASTERS.has(getBaseClass(Hero.charClass))) return;
  if (!ALLY_SKILLS.has(HeroSkills.currentSkill)) return;
  const target = world.playersQuery.entities.find(
    e => !e.localPlayer && e.objectNameInWorld?.trimEnd() === name.trimEnd()
  );
  if (target) world.castRequest = { target, point: null, forced: false };
}

export const PartyList = observer(() => {
  const members = Social.partyMembers;
  const scale = useUiStageScale();
  const [looks, setLooks] = useState<RowLook[]>([]);
  const [hovered, setHovered] = useState(-1);
  const active = members.length > 0;

  useEffect(() => {
    if (!active) return;
    const sample = () => setLooks(sampleLooks());
    sample();
    const id = setInterval(sample, SAMPLE_MS);
    return () => clearInterval(id);
  }, [active, members]);

  if (!active) return null;

  const mayRemove = (name: string) => Social.isPartyLeader || name === Hero.name;
  // Left of the corner minimap (ours) as the original steps left of the windows on the right.
  const right = (GameOptions.minimapCorner ? cornerPanelSpan() : 0) + RIGHT * scale;

  return (
    <div className="party-list" style={{ right, top: TOP * scale, transform: `scale(${scale})` }}>
      {members.map((member, i) => {
        const look = looks[i] ?? UNSEEN;
        const far = look.sight === 'far';
        const filled = Math.round((Math.min(10, Math.max(0, member.healthStep)) / 10) * HP.width);
        return (
          <div
            key={`${i}-${member.name}`}
            className="party-list-row"
            style={{ top: i * ROW.step, width: ROW.width, height: ROW.height }}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(h => (h === i ? -1 : h))}
            onContextMenu={e => {
              e.preventDefault();
              if (look.sight === 'near') castOn(member.name);
            }}
          >
            <div className="party-list-fill" style={FILL} />
            {far && <div className="party-list-fill far" style={FILL} />}
            {!far && look.defense && <div className="party-list-fill defense" style={FILL} />}
            {!far && hovered === i && <div className="party-list-fill hovered" style={FILL} />}
            <MuSpriteFrame file={BACK_SPRITE} width={ROW.width} height={ROW.height} className="party-list-back" />
            {i === 0 && (
              <MuSpriteFrame
                file={FLAG_SPRITE}
                width={FLAG.width}
                height={FLAG.height}
                className="party-list-part"
                style={{ left: FLAG.x, top: FLAG.y }}
              />
            )}
            <div
              className="party-list-name"
              style={{ left: NAME.x, top: NAME.y, width: NAME_WIDTH[i === 0 ? 0 : 1], color: nameColor(i, look.sight) }}
            >
              {member.name}
            </div>
            {filled > 0 && (
              <MuSpriteFrame
                file={HP_SPRITE}
                width={filled}
                height={HP.height}
                className="party-list-part"
                style={{ left: HP.x, top: HP.y }}
              />
            )}
            {mayRemove(member.name) && (
              <MuSpriteFrame
                file={EXIT_SPRITE}
                width={EXIT.size}
                height={EXIT.size}
                className="party-list-part party-list-exit"
                style={{ left: EXIT.x, top: EXIT.y }}
                onClick={uiClick(() => Social.partyKick(member.index))}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
