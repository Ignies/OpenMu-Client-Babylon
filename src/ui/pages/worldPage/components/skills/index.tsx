import './style.less';
import { t } from '../../../../../i18n';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import { isKey } from '../../../../../common/keyBindings';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { playUiSound } from '../../../../../libs/sfx';
import { skillDefinition } from '../../../../../common/skillsDatabase';
import { skills } from '../../../../../skills';
import { SkillIcon } from '../../../../components/skillIcon';
import {
  SKILL_ICON_HEIGHT,
  SKILL_ICON_WIDTH,
} from '../../../../../common/skillCasting';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import { MuButton } from '../../../../components/muButton';
import { toggleMasterSkillsWindow } from '../masterSkills/windowState';
import { OK_SPRITE, BTN_HEIGHT, BTN_WIDTH } from '../../../../components/msgWindow/layout';

/**
 * The learned-skill list: every skill the server taught (`Store.skills`),
 * with its icon, name, level, mana / AG cost and the master level of a
 * master skill, greyed when `skills.requirementsMet` fails (the hotbar's
 * `bCantSkill` rule). A click makes it the current skill, like a click on a
 * hotbar slot. The original has no such window — its list *is* the five
 * scrolling bar slots — so this uses the item-window chrome. Toggled by the
 * skill-list key (K); the master button below opens the master tree.
 */

const WINDOW_ID = 'skill-list';
const HOT_KEY = 'skillList';

const TITLE_Y = 12;
const LIST = { x: 12, y: 40, width: 166, height: 330 };
const ROW_HEIGHT = 34;
const MASTER_BUTTON = { x: 68, y: 382 };

const SkillRow = observer(({ number, level }: { number: number; level: number }) => {
  const def = skillDefinition(number);
  const usable = skills.requirementsMet(number);
  const selected = Store.currentSkill === number;
  const cost = def ? (def.ag > 0 ? `AG ${def.ag}` : def.mana > 0 ? `MP ${def.mana}` : '') : '';
  const masterLevel = skills.masterSkillLevel(number);

  return (
    <div
      className={`skill-row${selected ? ' skill-row-selected' : ''}${usable ? '' : ' skill-row-blocked'}`}
      style={{ height: ROW_HEIGHT }}
      onClick={() => {
        Store.selectSkill(number);
        playUiSound('click');
      }}
    >
      <div className="skill-row-icon" style={{ width: SKILL_ICON_WIDTH, height: SKILL_ICON_HEIGHT }}>
        <SkillIcon number={number} disabled={!usable} />
      </div>
      <div className="skill-row-text">
        <div className="skill-row-name">
          {def?.name ?? t('skills.unnamed', { number })}
        </div>
        <div className="skill-row-meta">
          {masterLevel > 0
            ? t('skills.masterLevelShort', { level: masterLevel })
            : level > 0
              ? t('skills.levelShort', { level })
              : ''}
          {cost ? (masterLevel > 0 || level > 0 ? ` · ${cost}` : cost) : ''}
        </div>
      </div>
    </div>
  );
});

export const SkillListWindow = observer(() => {
  const toggle = () =>
    runInAction(() => {
      Store.skillListEnabled = !Store.skillListEnabled;
    });

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key) && Store.world?.playerEntity) {
      toggle();
      playUiSound('click');
    }
  });

  if (!Store.skillListEnabled) return null;

  const column = 1 + (Store.inventoryEnabled ? 1 : 0) + (Store.characterInfoEnabled ? 1 : 0);

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="skill-list-window"
      column={column}
      label={t('skills.title')}
      onClose={() =>
        runInAction(() => {
          Store.skillListEnabled = false;
        })
      }
    >
      <div className="window-title" style={{ top: TITLE_Y }}>
        Skills
      </div>
      <MuTableFrame left={LIST.x} top={LIST.y} width={LIST.width} height={LIST.height} />
      <div
        className="skill-list"
        style={{ left: LIST.x + 6, top: LIST.y + 6, width: LIST.width - 12, height: LIST.height - 12 }}
      >
        {Store.skills.length === 0 && (
          <div className="skill-list-empty">{t('skills.empty')}</div>
        )}
        {Store.skills.map(s => (
          <SkillRow key={s.number} number={s.number} level={s.level} />
        ))}
      </div>
      <div className="skill-list-master" style={{ left: MASTER_BUTTON.x, top: MASTER_BUTTON.y }}>
        <MuButton
          file={OK_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          label={t('skills.master')}
          onClick={() => toggleMasterSkillsWindow()}
        />
      </div>
    </MuItemWindow>
  );
});
