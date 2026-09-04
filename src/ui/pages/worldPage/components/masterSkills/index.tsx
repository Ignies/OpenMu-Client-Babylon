import './style.less';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { isKey } from '../../../../../common/keyBindings';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { useWindowStackEntry } from '../../../../components/muWindow/useWindowChrome';
import { playUiSound } from '../../../../../libs/sfx';
import { skillDefinition } from '../../../../../common/skillsDatabase';
import { t } from '../../../../../i18n';
import { skills, type MasterTreeEntry } from '../../../../../skills';
import {
  formatMasterText,
  MASTER_ICON_HEIGHT,
  MASTER_ICON_WIDTH,
  MASTER_TEXT,
  masterSkillIconCell,
} from '../../../../../skills/masterTree';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { useUiStageScale } from '../../../../components/uiStage';
import { TEXT_COLOR } from '../../../../pages/serversPage/layout';
import {
  BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT,
  BTN_SINGLE_X,
  BTN_WIDTH,
  BTN_Y,
  CANCEL_SPRITE,
  OK_SPRITE,
  WIN_HEIGHT,
  WIN_WIDTH,
} from '../../../../components/msgWindow/layout';
import { MasterSkillsWindowState, toggleMasterSkillsWindow } from './windowState';
import {
  ARROWS,
  BACK_LEFT_SPRITE,
  BACK_LEFT_WIDTH,
  BACK_RIGHT_SPRITE,
  BACK_RIGHT_WIDTH,
  BOX_HEIGHT,
  BOX_SPRITE,
  BOX_WIDTH,
  CATEGORY_POS,
  CATEGORY_TEXT_COLOR,
  CATEGORY_TEXT_X,
  CATEGORY_TEXT_Y,
  CLASS_NAME_X,
  CLOSE,
  CLOSE_SPRITE,
  EXP_HOVER,
  EXP_PERCENT_X,
  EXP_TIP,
  HEADER_Y,
  ICON_GREY_SPRITE,
  ICON_INSET_X,
  ICON_INSET_Y,
  ICON_SPRITE,
  LEVEL_POINT_X,
  LEVEL_TEXT_X,
  LEVEL_TEXT_Y,
  MASTER_LEVEL_X,
  NODE_STEP_X,
  NODE_STEP_Y,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TIP_COLORS,
  TIP_FLIP_Y,
  TIP_OFFSET,
} from './layout';

/**
 * `CNewUIMasterLevel` (NewUIMasterLevel.cpp): the master skill tree sheet.
 * Three category columns of nodes (`new_Master_box` + the class's icons from
 * `new_Master_Icon` / `new_Master_non_Icon`, arrows between ranks), the
 * header with class name, master level, points and EXP, a hover tip per node
 * built from `MasterSkillTooltip_eng.bmd`, and a click on an open node that
 * asks before spending a point (`CMaster_Level_Interface` message box →
 * `AddMasterSkillPoint`). Toggled by the master-skills key (A) and the
 * character sheet's master button; Escape closes.
 */

const HOT_KEY = 'masterSkills';

type Dialog =
  | { kind: 'confirm'; entry: MasterTreeEntry }
  | { kind: 'notice'; text: string };

/** Rows the sheet has room for: `MAX_MASTER_TREE_RANK` - 1. */
const MAX_RANK = 9;

/** Whether the node has a place on the sheet; anything else is not drawn. */
const onSheet = (entry: MasterTreeEntry) =>
  entry.group >= 0 &&
  entry.group < CATEGORY_POS.length &&
  entry.rank >= 1 &&
  entry.rank <= MAX_RANK &&
  entry.column >= 0 &&
  entry.column < 4;

const nodeOrigin = (entry: MasterTreeEntry) => {
  const origin = CATEGORY_POS[entry.group] ?? CATEGORY_POS[0];
  return {
    x: origin.x + entry.column * NODE_STEP_X,
    y: origin.y + (entry.rank - 1) * NODE_STEP_Y,
  };
};

/**
 * A bad table row must not take the whole React tree down with it: the
 * sheet stays up, the nodes are dropped and the error is logged.
 */
class NodesBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('master skill tree: node render failed', error);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

const Text = ({
  x,
  y,
  color,
  center,
  bold,
  children,
}: {
  x: number;
  y: number;
  color?: string;
  center?: boolean;
  bold?: boolean;
  children: React.ReactNode;
}) => (
  <div
    className="master-text"
    style={{
      left: x,
      top: y,
      color,
      fontWeight: bold ? 'bold' : undefined,
      transform: center ? 'translateX(-50%)' : undefined,
    }}
  >
    {children}
  </div>
);

const NodeTip = observer(({ entry }: { entry: MasterTreeEntry }) => {
  const { x, y } = nodeOrigin(entry);
  const up = y > TIP_FLIP_Y;
  return (
    <div
      className={`master-tip${up ? ' master-tip-up' : ''}`}
      style={{ left: x + TIP_OFFSET.x, top: up ? y : y + TIP_OFFSET.y }}
    >
      {skills.masterSkillTooltip(entry).map((line, i) => (
        <div
          key={i}
          className="master-tip-line"
          style={{ color: TIP_COLORS[line.color], fontWeight: line.bold ? 'bold' : undefined }}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
});

const Node = observer(
  ({
    entry,
    hovered,
    onHover,
    onClick,
  }: {
    entry: MasterTreeEntry;
    hovered: boolean;
    onHover: (entry: MasterTreeEntry | null) => void;
    onClick: (entry: MasterTreeEntry) => void;
  }) => {
    const { x, y } = nodeOrigin(entry);
    const open = skills.masterSkillOpen(entry);
    const level = skills.masterSkillInfo(entry).level;
    const cell = masterSkillIconCell(entry.skill);
    const arrow = ARROWS[entry.arrow];

    return (
      <div className="master-node" style={{ left: x, top: y }}>
        <MuSpriteFrame file={BOX_SPRITE} width={BOX_WIDTH} height={BOX_HEIGHT} />
        <MuSpriteFrame
          className="master-node-icon"
          file={open ? ICON_SPRITE : ICON_GREY_SPRITE}
          x={cell.x}
          y={cell.y}
          width={MASTER_ICON_WIDTH}
          height={MASTER_ICON_HEIGHT}
          style={{ left: ICON_INSET_X, top: ICON_INSET_Y }}
          onClick={() => onClick(entry)}
        >
          <div
            style={{ position: 'absolute', inset: 0 }}
            onMouseEnter={() => onHover(entry)}
            onMouseLeave={() => onHover(null)}
          />
        </MuSpriteFrame>
        {arrow && (
          <MuSpriteFrame
            file={arrow.file}
            width={arrow.width}
            height={arrow.height}
            style={{ left: arrow.dx, top: arrow.dy, backgroundSize: '100% 100%' }}
          />
        )}
        <div
          className="master-node-level"
          style={{ left: LEVEL_TEXT_X, top: LEVEL_TEXT_Y, color: open ? '#fff' : '#787878' }}
        >
          {level}
        </div>
        {hovered && <NodeTip entry={entry} />}
      </div>
    );
  }
);

const MasterDialog = ({
  dialog,
  onClose,
}: {
  dialog: Dialog;
  onClose: (accepted: boolean) => void;
}) => {
  const text =
    dialog.kind === 'notice'
      ? dialog.text
      : t(
          dialog.entry.requiredPoints === 1 ? 'master.spendPoint' : 'master.spendPoints',
          {
            points: dialog.entry.requiredPoints,
            skill:
              skillDefinition(dialog.entry.skill)?.name ??
              t('master.skillFallback', { number: dialog.entry.skill }),
          }
        );
  const buttons = { up: 0, active: 1, down: 2 };

  return (
    <div className="master-dialog-layer">
      <MuSpriteFrame file={BACK_SPRITE} width={WIN_WIDTH} height={WIN_HEIGHT} className="master-dialog">
        <div className="master-dialog-text">{text}</div>
        {dialog.kind === 'confirm' ? (
          <>
            <MuButton
              file={OK_SPRITE}
              width={BTN_WIDTH}
              height={BTN_HEIGHT}
              frames={buttons}
              color={TEXT_COLOR.brightGray}
              activeColor={TEXT_COLOR.white}
              onClick={() => onClose(true)}
              style={{ position: 'absolute', left: BTN_BOTH_OK_X, top: BTN_Y }}
            />
            <MuButton
              file={CANCEL_SPRITE}
              width={BTN_WIDTH}
              height={BTN_HEIGHT}
              frames={buttons}
              color={TEXT_COLOR.brightGray}
              activeColor={TEXT_COLOR.white}
              onClick={() => onClose(false)}
              style={{ position: 'absolute', left: BTN_BOTH_CANCEL_X, top: BTN_Y }}
            />
          </>
        ) : (
          <MuButton
            file={OK_SPRITE}
            width={BTN_WIDTH}
            height={BTN_HEIGHT}
            frames={buttons}
            color={TEXT_COLOR.brightGray}
            activeColor={TEXT_COLOR.white}
            onClick={() => onClose(false)}
            style={{ position: 'absolute', left: BTN_SINGLE_X, top: BTN_Y }}
          />
        )}
      </MuSpriteFrame>
    </div>
  );
};

/** `CheckSkillPoint` / `CheckAttributeArea`: the refusal each block prints. */
function blockText(block: NonNullable<ReturnType<typeof skills.masterLearnBlock>>): string {
  switch (block) {
    case 'maxed':
    case 'points':
      return MASTER_TEXT.maxed;
    case 'equipment':
      return MASTER_TEXT.equipment;
    case 'requirements':
      return MASTER_TEXT.unmet;
  }
}

const MASTER_SKILLS_ID = 'master-skills';

export const MasterSkillsWindow = observer(() => {
  const open = MasterSkillsWindowState.open;
  const scale = useUiStageScale();
  const [hovered, setHovered] = useState<MasterTreeEntry | null>(null);
  const [expHover, setExpHover] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      if (!Store.world?.playerEntity) return;
      toggleMasterSkillsWindow();
      playUiSound('click');
    }
  });

  // A sheet over the windows: Escape closes it before anything under it.
  useWindowStackEntry(MASTER_SKILLS_ID, open, () => {
    toggleMasterSkillsWindow(false);
    playUiSound('click');
  });

  useEffect(() => {
    if (!open) {
      setHovered(null);
      setDialog(null);
      return;
    }
    skills.loadMasterTree().catch(err => console.warn('master tree data', err));
  }, [open]);

  if (!open) return null;

  const loaded = skills.masterTreeLoaded;
  const entries = loaded ? skills.masterTree : [];
  const text = skills.masterTreeText();
  const category = skills.masterCategoryPoints();
  const { current, next } = skills.masterExperience;
  const expPercent = skills.masterExpPercent * 100;

  const onNodeClick = (entry: MasterTreeEntry) => {
    playUiSound('click');
    const block = skills.masterLearnBlock(entry);
    setDialog(block ? { kind: 'notice', text: blockText(block) } : { kind: 'confirm', entry });
  };

  const onDialogClose = (accepted: boolean) => {
    if (accepted && dialog?.kind === 'confirm') skills.learnMasterSkill(dialog.entry.skill);
    setDialog(null);
  };

  return (
    <div className="master-skills-overlay" onContextMenu={e => e.preventDefault()}>
      <div
        className="master-skills-stage"
        style={{ width: SHEET_WIDTH, height: SHEET_HEIGHT, transform: `scale(${scale})` }}
      >
        <MuSpriteFrame
          file={BACK_LEFT_SPRITE}
          width={BACK_LEFT_WIDTH}
          height={SHEET_HEIGHT}
          style={{ left: 0, top: 0 }}
        />
        <MuSpriteFrame
          file={BACK_RIGHT_SPRITE}
          width={BACK_RIGHT_WIDTH}
          height={SHEET_HEIGHT}
          style={{ left: BACK_LEFT_WIDTH, top: 0 }}
        />

        <NodesBoundary>
          {entries.filter(onSheet).map(entry => (
            <Node
              key={entry.index}
              entry={entry}
              hovered={hovered === entry}
              onHover={setHovered}
              onClick={onNodeClick}
            />
          ))}
        </NodesBoundary>

        <div style={{ left: CLOSE.x, top: CLOSE.y }} className="master-close">
          <MuButton
            file={CLOSE_SPRITE}
            width={CLOSE.width}
            height={CLOSE.height}
            frames={{ up: 0, active: 1, down: 1 }}
            onClick={() => toggleMasterSkillsWindow(false)}
          />
        </div>

        <Text x={CLASS_NAME_X} y={HEADER_Y}>
          {text.className}
        </Text>
        <Text x={MASTER_LEVEL_X} y={HEADER_Y}>
          {formatMasterText(MASTER_TEXT.masterLevel, skills.masterLevel)}
        </Text>
        <Text x={LEVEL_POINT_X} y={HEADER_Y}>
          {formatMasterText(MASTER_TEXT.levelPoints, skills.masterLevelUpPoints)}
        </Text>
        {next !== 0 && (
          <Text x={EXP_PERCENT_X} y={HEADER_Y}>
            {formatMasterText(MASTER_TEXT.expPercent, expPercent)}
          </Text>
        )}
        <div
          style={{ left: EXP_HOVER.x, top: EXP_HOVER.y, width: EXP_HOVER.width, height: EXP_HOVER.height }}
          onMouseEnter={() => setExpHover(true)}
          onMouseLeave={() => setExpHover(false)}
        />
        {expHover && (
          <div className="master-tip" style={{ left: EXP_TIP.x, top: EXP_TIP.y }}>
            <div className="master-tip-line">{`${current} / ${next}`}</div>
          </div>
        )}

        {text.categories.map((name, i) => (
          <Text key={i} x={CATEGORY_TEXT_X[i]} y={CATEGORY_TEXT_Y} color={CATEGORY_TEXT_COLOR} center>
            {`${name}: ${category[i]}`}
          </Text>
        ))}

        {!loaded && (
          <Text x={SHEET_WIDTH / 2} y={SHEET_HEIGHT / 2} center>
            {t('common.loading')}
          </Text>
        )}
      </div>

      {dialog && <MasterDialog dialog={dialog} onClose={onDialogClose} />}
    </div>
  );
});
