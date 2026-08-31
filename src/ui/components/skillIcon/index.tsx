import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { MuSpriteFrame } from '../muSprite';
import {
  MASTER_SKILL_FIRST,
  SKILL_ICON_HEIGHT,
  SKILL_ICON_WIDTH,
  skillIconCell,
} from '../../../common/skillCasting';
import { skillDefinition } from '../../../common/skillsDatabase';
import { skills } from '../../../skills';
import {
  MASTER_ICON_HEIGHT,
  MASTER_ICON_WIDTH,
  masterSkillIconCell,
  masterTreeDataLoaded,
} from '../../../skills/masterTree';

/** `new_Master_Icon` / its greyed copy: the master tree's own 512 sheet. */
const MASTER_SHEET = ['new_Master_Icon.OZJ', 'new_Master_non_Icon.OZJ'];

/**
 * A skill's icon, at the original's own size (`RenderSkillIcon`: a 20 x 28
 * cell of `newui_skill*.jpg`, never square). `disabled` is `bCantSkill` and
 * picks the shipped `newui_non_*` sheet, the way the original swaps the
 * texture id.
 *
 * A master-tree skill's cell lives in `Skill.bmd` (`Magic_Icon`), which the
 * tree loads lazily — the load is kicked off here so a master skill sitting
 * on a bar slot draws without the tree window ever being opened, and the
 * component is an observer so it repaints when the tables land.
 */
export const SkillIcon = observer(
  ({ number, disabled = false }: { number: number; disabled?: boolean }) => {
    const master = number >= MASTER_SKILL_FIRST;
    const loaded = masterTreeDataLoaded();

    useEffect(() => {
      if (master && !loaded) void skills.loadMasterTree().catch(() => {});
    }, [master, loaded]);

    const name = skillDefinition(number)?.name ?? `#${number}`;

    if (master) {
      if (!loaded) return null;
      const { x, y } = masterSkillIconCell(number);
      return (
        <MuSpriteFrame
          file={MASTER_SHEET[disabled ? 1 : 0]}
          x={x}
          y={y}
          width={MASTER_ICON_WIDTH}
          height={MASTER_ICON_HEIGHT}
          title={name}
        />
      );
    }

    const cell = skillIconCell(number, disabled);

    if (!cell) {
      return (
        <div
          className="skill-icon-text"
          title={name}
          style={{ width: SKILL_ICON_WIDTH, height: SKILL_ICON_HEIGHT }}
        >
          {name.slice(0, 3)}
        </div>
      );
    }

    return (
      <MuSpriteFrame
        file={cell.file}
        x={cell.x}
        y={cell.y}
        width={SKILL_ICON_WIDTH}
        height={SKILL_ICON_HEIGHT}
        title={name}
      />
    );
  }
);
