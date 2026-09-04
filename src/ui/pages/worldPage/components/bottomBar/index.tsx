import { uiClick } from '../../../../../libs/sfx';
import { t } from '../../../../../i18n';
import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { toggleCashShopWindow } from '../../../../../cashShop/state';
import { Messenger } from '../../../../../messenger';
import { ItemIcon } from '../../../../components/itemIcon';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { MuNumber } from '../../../../components/muNumber';
import { Item } from '../../../../../ecs/world';
import { MuResizeGrip } from '../../../../components/muWindow/useWindowChrome';
import { MuWindows } from '../../../../components/muWindow/windowState';
import { SkillIcon } from '../../../../components/skillIcon';
import { MasterExpBar } from '../masterSkills/masterExpBar';
import { PetCommandBar } from './petCommands';
import { isKey } from '../../../../../common/keyBindings';
import { BOTTOM_BAR_ID } from '../../../../components/muWindow';
import { skillDefinition } from '../../../../../common/skillsDatabase';
import {
  isHotbarSkill,
  SKILL_ICON_HEIGHT,
  SKILL_ICON_WIDTH,
} from '../../../../../common/skillCasting';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { skills } from '../../../../../skills';
import { onCooldownTick, skillCooldowns } from '../../../../../skills/cooldowns';
import { SkillTooltip } from '../../../../components/skillTooltip';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import {
  canRegisterItemHotkey,
  countHotkeyItems,
  findHotkeyItem,
} from '../../../../../common/itemHotkeys';

const BAR_ID = BOTTOM_BAR_ID;

const BAR_WIDTH = 640;
const BAR_HEIGHT = 51;
const BAR_TOP = 480 - BAR_HEIGHT;

const local = (screenY: number) => screenY - BAR_TOP;

const FRAME_PIECES = [
  { file: 'newui_menu01.OZJ', x: 0, width: 256 },
  { file: 'newui_menu02.OZJ', x: 256, width: 128 },
  { file: 'partCharge1/newui_menu03.OZJ', x: 384, width: 256 },
];

const HOTKEY_X = 10;
const HOTKEY_STEP = 38;
const HOTKEY_Y = local(443);
const HOTKEY_SIZE = 20;
const HOTKEY_COUNT_X = 30;
const HOTKEY_COUNT_Y = local(457);
const HOTKEY_KEYS = ['Q', 'W', 'E', 'R'];

const SKILL_SLOT_X = 190 + 32;
const SKILL_SLOT_Y = local(431);
const SKILL_SLOT_WIDTH = 32;
const SKILL_SLOT_HEIGHT = 38;
const CURRENT_SKILL_X = 385;

const BUTTON_X = 489;
const BUTTON_STEP = 30;
const BUTTON_WIDTH = 30;
const BUTTON_HEIGHT = 41;
const BUTTON_Y = local(BAR_TOP);

const BUTTON_FRAMES = { up: 0, active: 1, down: 2 } as const;

const EXP_X = 2;
const EXP_Y = local(473);
const EXP_WIDTH = 629;
const EXP_HEIGHT = 4;
const EXP_NUMBER_X = 635;
const EXP_NUMBER_Y = local(469);
const EXP_SUB_BARS = 10;

const Gauge = ({
  file,
  x,
  y,
  width,
  height,
  fill,
}: {
  file: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: number;
}) => {
  const filled = Math.max(0, Math.min(1, fill));

  return (
    <div className="gauge" style={{ left: x, top: y, width, height }}>
      <MuSpriteFrame
        file={file}
        className="gauge-fill"
        width={width}
        height={Math.round(filled * height)}
        style={{ backgroundPosition: 'left bottom' }}
      />
    </div>
  );
};

/**
 * One Q/W/E/R slot (`CNewUIItemHotKey`): shows the best matching potion the
 * inventory holds right now and the summed count. Right click drinks it
 * (`UseItemRButton`); a carried potion dropped here binds the slot to that
 * kind, the way Ctrl+key over the inventory does.
 */
const ConsumableItem = observer(({ index, hotKey }: { index: number; hotKey: string }) => {
  const items = Store.playerData.items;
  const hotkey = Store.itemHotkeys[index];
  const slot = findHotkeyItem(items, index, hotkey);
  const icon: Item | null = slot >= 0 ? items[slot] : null;
  const count = slot >= 0 ? countHotkeyItems(items, index, hotkey) : 0;
  const picked = Store.pickedItem;
  const canBind = !!picked && canRegisterItemHotkey(picked.item);
  const name = icon ? ItemsDatabase.getItem(icon.group, icon.num)?.ItemName : undefined;

  return (
    <>
      <div
        className={`consumable-item${canBind ? ' can-bind' : ''}`}
        title={
          name
            ? t('bottomBar.itemSlot', { name, key: hotKey })
            : t('bottomBar.emptySlot', { key: hotKey })
        }
        style={{
          left: HOTKEY_X + index * HOTKEY_STEP,
          top: HOTKEY_Y,
          width: HOTKEY_SIZE,
          height: HOTKEY_SIZE,
        }}
        onPointerDown={event => {
          if (event.button !== 0 || !picked) return;
          event.stopPropagation();
          if (!canBind) return;
          Store.setItemHotkey(index, picked.item);
          Store.cancelPickedItem();
        }}
        onContextMenu={event => {
          event.preventDefault();
          event.stopPropagation();
          Store.useItemHotkey(index);
        }}
      >
        {!!icon && <ItemIcon item={icon} />}
      </div>
      {count > 0 && (
        <MuNumber
          value={count}
          x={HOTKEY_COUNT_X + index * HOTKEY_STEP}
          y={HOTKEY_COUNT_Y}
        />
      )}
    </>
  );
});

const HOTKEY_CODES = ['KeyQ', 'KeyW', 'KeyE', 'KeyR'];

const ConsumableItems = () => {
  useEventBus('keyPressed', code => {
    const i = HOTKEY_CODES.indexOf(code);
    if (i < 0) return;
    // Ctrl+key over the inventory binds; that is the inventory's job.
    const keys = Store.world?.keyboardInput.pressedKeys;
    if (keys && (keys.has('ControlLeft') || keys.has('ControlRight'))) return;
    Store.useItemHotkey(i);
  });

  return (
    <>
      {HOTKEY_KEYS.map((key, i) => (
        <ConsumableItem key={key} index={i} hotKey={key} />
      ))}
    </>
  );
};

const BarButton = ({
  index,
  file,
  title,
  onClick,
}: {
  index: number;
  file: string;
  title: string;
  onClick?: () => void;
}) => (
  <div
    className="bar-button"
    title={title}
    style={{ left: BUTTON_X + index * BUTTON_STEP, top: BUTTON_Y }}
  >
    <MuButton
      file={file}
      width={BUTTON_WIDTH}
      height={BUTTON_HEIGHT}
      frames={BUTTON_FRAMES}
      onClick={onClick}
    />
  </div>
);

export const ExpBar = observer(() => {
  const progress = Store.playerData.expPercent;

  return (
    <>
      <MuSpriteFrame
        file="newui_Exbar.OZJ"
        className="exp-fill"
        style={{
          left: EXP_X,
          top: EXP_Y,
          width: Math.round(progress * EXP_WIDTH),
          height: EXP_HEIGHT,
          backgroundSize: '100% 100%',
        }}
      />
      <MuNumber
        value={Math.trunc(progress * EXP_SUB_BARS)}
        x={EXP_NUMBER_X}
        y={EXP_NUMBER_Y}
      />
    </>
  );
});

/** `RenderSkillIcon(…, x + 6, y + 6, 20, 28)`: the icon inside a 32x38 box. */
const SKILL_ICON_INSET_X = 6;
const SKILL_ICON_INSET_Y = 6;

/** IMAGE_SKILLBOX / IMAGE_SKILLBOX_USE: the empty box, and the lit copy. */
const SKILLBOX_SPRITE = 'newui_skillbox.OZJ';
const SKILLBOX_USE_SPRITE = 'newui_skillbox2.OZJ';

/**
 * Which hot-key slot each of the five boxes shows, per page
 * (`iStartSkillIndex`, with 10 folded back to 0). The slot index *is* the
 * digit that fires it — which is why the bar art has 1..5 printed on it —
 * so the second page is 6..9 and 0, and nothing here is off by one.
 */
const BAR_PAGES: readonly (readonly number[])[] = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 0],
];
/** Every slot in bar order, for the drag-to-bind strip. */
const ALL_SLOTS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
/** The drop strip that appears over the slots while a skill is dragged. */
const HOTKEY_STRIP_X = SKILL_SLOT_X - 14;
const HOTKEY_STRIP_Y = SKILL_SLOT_Y - 16;
const HOTKEY_STRIP_STEP = 19;
const HOTKEY_STRIP_SIZE = 16;
/** Pixels the pointer must travel before a press becomes a drag, not a click. */
const DRAG_THRESHOLD = 4;
/** RenderSkillDelay: red at half alpha rising from the slot's floor. */
const DELAY_TINT = 'rgba(255, 128, 128, 0.5)';
/** Drop targets: a digit slot is 0..9; the current-skill box; nothing. */
const DROP_CURRENT = -2;
const DROP_NONE = -1;

/**
 * The learned-skill fan (`m_bSkillList`, NewUIMainFrameWindow.cpp:1546):
 * 32×38 boxes at y 390 spreading out from the current-skill box, right,
 * left, right…; boxes 15..18 continue leftward and everything past 18
 * climbs one row.
 */
const FAN_Y = local(390);
const FAN_WRAP = 18;

function fanPosition(count: number): { left: number; top: number } {
  const w = SKILL_SLOT_WIDTH;
  const top = count >= FAN_WRAP ? FAN_Y - SKILL_SLOT_HEIGHT : FAN_Y;
  let left: number;
  if (count < 14) {
    const half = Math.floor(count / 2);
    left = count % 2 === 0 ? CURRENT_SKILL_X + half * w : CURRENT_SKILL_X - (half + 1) * w;
  } else if (count < FAN_WRAP) {
    left = CURRENT_SKILL_X - 8 * w - (count - 14) * w;
  } else {
    left = CURRENT_SKILL_X - 12 * w + (count - 17) * w;
  }
  return { left, top };
}

type SkillDrag = { number: number; x: number; y: number; moved: boolean; fromFan: boolean };

/**
 * The ghost icon under the cursor while a skill is dragged off the bar
 * (CNewUIPickedItem-style, portalled so the bar's scale does not apply).
 */
const SkillDragGhost = ({ drag }: { drag: SkillDrag }) =>
  createPortal(
    <div
      className="skill-drag-ghost"
      style={{
        left: drag.x - SKILL_ICON_WIDTH / 2,
        top: drag.y - SKILL_ICON_HEIGHT / 2,
      }}
    >
      <SkillIcon number={drag.number} />
    </div>,
    document.body
  );

/**
 * CNewUISkillList: the five bar slots are hot keys 1..5 or 6..9,0 — the page
 * holding the current skill (`IsArrayUp`), the mouse wheel flips it, and the
 * slot index is the digit that fires it, so box one really is key 1.
 *
 * A click on a bound slot makes it the current skill; a click on an *empty*
 * slot (and a right click on a bound one) opens the fan of every learned
 * skill (`m_bSkillList`) as a picker for that slot — the box after the last
 * skill clears it. A click on the current-skill box opens the same fan to
 * select rather than bind, and a right click there goes back to the plain
 * attack. Ctrl+digit over an icon binds that key (`SetHotKey`), as does
 * dropping a dragged skill on the digit strip; dropping one on the
 * current-skill box selects it. Icons the hero cannot use are greyed
 * (bCantSkill), a running delay sweeps the slot red from the bottom
 * (RenderSkillDelay), and hovering shows RenderSkillInfo.
 */
const SkillSlots = observer(() => {
  const [listOpen, setListOpen] = useState(false);
  /** The slot the open fan is picking for; -1 = it is only browsing. */
  const [assignSlot, setAssignSlot] = useState(-1);
  // The wheel's choice of page; the current skill's page wins while it has one.
  const [pageOverride, setPageOverride] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(-1);
  const [tip, setTip] = useState<{ number: number; x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<SkillDrag | null>(null);
  const [dropSlot, setDropSlot] = useState(DROP_NONE);
  const skillList = Store.skills;

  const closeList = () => {
    setListOpen(false);
    setAssignSlot(-1);
  };
  /** Open the fan as the picker for one hot key. */
  const openPicker = (slot: number) => {
    setTip(null);
    setAssignSlot(slot);
    setListOpen(true);
  };
  // RenderSkillDelay: the sweep's height is written straight to the element
  // on the cooldown layer's tick, so a running delay renders nothing. The
  // observable map only changes when a delay starts / ends (slot re-render).
  const delayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slotNumbers = useRef<number[]>([]);
  useEffect(() => {
    const sweep = () => {
      const numbers = slotNumbers.current;
      for (let i = 0; i < numbers.length; i++) {
        const el = delayRefs.current[i];
        if (!el) continue;
        const delay = numbers[i] >= 0 ? skills.cooldown(numbers[i]) : null;
        const css = delay ? Math.round(delay.fraction * SKILL_SLOT_HEIGHT) + 'px' : '0px';
        if (el.style.height !== css) el.style.height = css;
      }
    };
    sweep();
    return onCooldownTick(sweep);
  });
  // Which slot holds the current skill, or -1 — guarded, because with no
  // current skill `indexOf(-1)` would answer with the first *empty* slot.
  const currentIdx =
    Store.currentSkill >= 0 ? Store.skillHotkeys.indexOf(Store.currentSkill) : -1;
  useEffect(() => setPageOverride(null), [currentIdx]);
  const pageUp = pageOverride ?? BAR_PAGES[1].includes(currentIdx);
  const page = BAR_PAGES[pageUp ? 1 : 0];
  const fanSkills = skillList.map(s => s.number).filter(isHotbarSkill);

  useEventBus('keyPressed', code => {
    if (code === 'Escape' && listOpen) {
      closeList();
      return;
    }
    const m = /^(?:Digit|Numpad)(\d)$/.exec(code);
    if (!m) return;
    const slot = +m[1];
    const keys = Store.world?.keyboardInput.pressedKeys;
    const ctrl = !!keys && (keys.has('ControlLeft') || keys.has('ControlRight'));
    // Ctrl+digit over a slot, or a digit while dragging, binds the key.
    const bind = drag?.number ?? (ctrl ? hovered : -1);
    if (bind >= 0) {
      Store.assignSkillHotkey(slot, bind);
      return;
    }
    const number = Store.skillHotkeys[slot];
    if (number >= 0) Store.selectSkill(number);
  });

  // The drag lives on the window: the pointer leaves the bar at once.
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) =>
      setDrag(d => {
        if (!d) return d;
        const moved = d.moved || Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_THRESHOLD;
        return { ...d, x: e.clientX, y: e.clientY, moved };
      });
    const onUp = () => {
      if (!drag.moved) {
        // A click in the fan binds while the fan is a picker and otherwise
        // selects; either way it closes (NewUIMainFrameWindow.cpp:1636).
        if (drag.fromFan && assignSlot >= 0) Store.assignSkillHotkey(assignSlot, drag.number);
        else Store.selectSkill(drag.number);
        if (drag.fromFan) {
          setListOpen(false);
          setAssignSlot(-1);
        }
      } else if (dropSlot >= 0) {
        Store.assignSkillHotkey(dropSlot, drag.number);
      } else if (dropSlot === DROP_CURRENT) {
        Store.selectSkill(drag.number);
      }
      setDrag(null);
      setDropSlot(DROP_NONE);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, dropSlot, assignSlot]);

  const hotkeyOf = (number: number) => {
    const i = Store.skillHotkeys.indexOf(number);
    return i < 0 ? '' : String(i);
  };

  const dragging = !!drag?.moved;
  const leaveDrop = (slot: number) => setDropSlot(s => (s === slot ? DROP_NONE : s));

  /** Pointer handlers shared by the bar slots and the fan boxes. */
  const boxEvents = (number: number, fromFan: boolean) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 || number < 0) return;
      e.stopPropagation();
      uiClick(() => {})();
      setTip(null);
      setDrag({ number, x: e.clientX, y: e.clientY, moved: false, fromFan });
    },
    onPointerEnter: () => setHovered(number),
    onPointerMove: (e: React.PointerEvent) => {
      if (number >= 0 && !drag) setTip({ number, x: e.clientX, y: e.clientY });
    },
    onPointerLeave: () => {
      setHovered(h => (h === number ? -1 : h));
      setTip(t => (t?.number === number ? null : t));
    },
  });

  /** IMAGE_SKILLBOX / IMAGE_SKILLBOX_USE: the box under a fan or lit slot. */
  const boxArt = (lit: boolean) => (
    <MuSpriteFrame
      file={lit ? SKILLBOX_USE_SPRITE : SKILLBOX_SPRITE}
      className="skill-box-art"
      width={SKILL_SLOT_WIDTH}
      height={SKILL_SLOT_HEIGHT}
    />
  );

  return (
    <>
      {page.map((slot, i) => {
        const number = Store.skillHotkeys[slot] ?? -1;
        const usable = number >= 0 && skills.requirementsMet(number);
        // Tracked: a delay starting or ending re-renders the slot (the sweep itself is not React).
        const cooling = number >= 0 && skillCooldowns.has(number);
        const selected = number >= 0 && number === Store.currentSkill;
        const picking = listOpen && assignSlot === slot;
        const name = skillDefinition(number)?.name ?? `#${number}`;
        slotNumbers.current[i] = number;
        const classes = ['skill-slot'];
        if (selected) classes.push('selected');
        if (number >= 0 && !usable) classes.push('unusable');
        if (number < 0) classes.push('empty');
        if (picking) classes.push('picking');
        const events = boxEvents(number, false);
        return (
          <div
            key={slot}
            className={classes.join(' ')}
            title={
              number >= 0
                ? t('bottomBar.boundSlot', { name, key: slot })
                : t('bottomBar.pickSkill', { key: slot })
            }
            style={{
              left: SKILL_SLOT_X + i * SKILL_SLOT_WIDTH,
              top: SKILL_SLOT_Y,
              width: SKILL_SLOT_WIDTH,
              height: SKILL_SLOT_HEIGHT,
            }}
            {...events}
            onPointerDown={e => {
              // An empty box is the "choose a skill" button; a bound one drags.
              if (e.button === 0 && number < 0) {
                e.stopPropagation();
                uiClick(() => openPicker(slot))();
                return;
              }
              events.onPointerDown(e);
            }}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              uiClick(() => openPicker(slot))();
            }}
            onWheel={() => setPageOverride(!pageUp)}
          >
            {selected && boxArt(true)}
            {number >= 0 && (
              <div className="skill-icon" style={{ left: SKILL_ICON_INSET_X, top: SKILL_ICON_INSET_Y }}>
                <SkillIcon number={number} disabled={!usable} />
              </div>
            )}
            {cooling && (
              <div
                ref={el => (delayRefs.current[i] = el)}
                className="skill-delay"
                style={{ height: 0, background: DELAY_TINT }}
              />
            )}
            {number >= 0 && <div className="skill-hotkey">{slot}</div>}
          </div>
        );
      })}
      <div
        className={[
          'skill-slot current',
          Store.currentSkill >= 0 ? 'selected' : '',
          dragging && dropSlot === DROP_CURRENT ? 'drop-target' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={
          dragging
            ? undefined
            : (skillDefinition(Store.currentSkill)?.name ??
                t('bottomBar.noSkill')) + t('bottomBar.skillHint')
        }
        style={{
          left: CURRENT_SKILL_X,
          top: SKILL_SLOT_Y,
          width: SKILL_SLOT_WIDTH,
          height: SKILL_SLOT_HEIGHT,
        }}
        onClick={uiClick(() => {
          if (listOpen) closeList();
          else {
            setAssignSlot(-1);
            setListOpen(true);
          }
        })}
        onContextMenu={e => {
          e.preventDefault();
          uiClick(() => Store.selectSkill(-1))();
        }}
        onPointerEnter={() => dragging && setDropSlot(DROP_CURRENT)}
        onPointerLeave={() => leaveDrop(DROP_CURRENT)}
      >
        {Store.currentSkill >= 0 && (
          <div className="skill-icon" style={{ left: SKILL_ICON_INSET_X, top: SKILL_ICON_INSET_Y }}>
            <SkillIcon
              number={Store.currentSkill}
              disabled={!skills.requirementsMet(Store.currentSkill)}
            />
          </div>
        )}
      </div>
      {listOpen &&
        fanSkills.map((number, count) => {
          const { left, top } = fanPosition(count);
          const usable = skills.requirementsMet(number);
          const key = hotkeyOf(number);
          const selected = number === Store.currentSkill;
          const classes = ['skill-slot', 'fan'];
          if (selected) classes.push('selected');
          if (!usable) classes.push('unusable');
          return (
            <div
              key={number}
              className={classes.join(' ')}
              style={{ left, top, width: SKILL_SLOT_WIDTH, height: SKILL_SLOT_HEIGHT }}
              {...boxEvents(number, true)}
            >
              {boxArt(selected)}
              <div className="skill-icon" style={{ left: SKILL_ICON_INSET_X, top: SKILL_ICON_INSET_Y }}>
                <SkillIcon number={number} disabled={!usable} />
              </div>
              {key && <div className="skill-hotkey">{key}</div>}
            </div>
          );
        })}
      {listOpen && assignSlot >= 0 && (
        <div
          className="skill-slot fan clear"
          title={t('bottomBar.clearSlot', { key: assignSlot })}
          style={{
            ...fanPosition(fanSkills.length),
            width: SKILL_SLOT_WIDTH,
            height: SKILL_SLOT_HEIGHT,
          }}
          onClick={uiClick(() => {
            Store.assignSkillHotkey(assignSlot, -1);
            closeList();
          })}
        >
          {boxArt(false)}
          <span>&times;</span>
        </div>
      )}
      {dragging &&
        ALL_SLOTS.map((slot, i) => (
          <div
            key={slot}
            className={dropSlot === slot ? 'skill-hotkey-target drop-target' : 'skill-hotkey-target'}
            style={{
              left: HOTKEY_STRIP_X + i * HOTKEY_STRIP_STEP,
              top: HOTKEY_STRIP_Y,
              width: HOTKEY_STRIP_SIZE,
              height: HOTKEY_STRIP_SIZE,
            }}
            onPointerEnter={() => setDropSlot(slot)}
            onPointerLeave={() => leaveDrop(slot)}
          >
            {slot}
          </div>
        ))}
      {dragging && drag && <SkillDragGhost drag={drag} />}
      {tip && !dragging && (
        <SkillTooltip
          number={tip.number}
          level={skillList.find(s => s.number === tip.number)?.level ?? 0}
          x={tip.x}
          y={tip.y}
        />
      )}
    </>
  );
});

/**
 * The four orbs (HP / SD / AG / MP gauges and their numbers): the only part
 * of the bar that follows the hero's vitals, so it is the only part that
 * re-renders on a tick of them.
 */
const Orbs = observer(() => {
  const playerData = Store.playerData;
  return (
    <>
      <Gauge
        file="newui_menu_red.OZJ"
        x={158}
        y={local(480 - 48)}
        width={45}
        height={39}
        fill={playerData.hpPercent}
      />
      <MuNumber value={playerData.currentHP} x={158 + 25} y={local(480 - 18)} />

      <Gauge
        file="newui_menu_SD.OZJ"
        x={204}
        y={local(480 - 49)}
        width={16}
        height={39}
        fill={playerData.sdPercent}
      />
      <MuNumber value={playerData.currentSD} x={204 + 15} y={local(480 - 18)} />

      <Gauge
        file="newui_menu_AG.OZJ"
        x={256 + 128 + 36}
        y={local(480 - 49)}
        width={16}
        height={39}
        fill={playerData.agPercent}
      />
      <MuNumber
        value={playerData.currentAG}
        x={256 + 128 + 36 + 10}
        y={local(480 - 18)}
      />

      <Gauge
        file="newui_menu_blue.OZJ"
        x={256 + 128 + 53}
        y={local(480 - 48)}
        width={45}
        height={39}
        fill={playerData.mpPercent}
      />
      <MuNumber
        value={playerData.currentMP}
        x={256 + 128 + 53 + 30}
        y={local(480 - 18)}
      />
    </>
  );
});

export const BottomBar = observer(() => {
  const scale = MuWindows.scaleOf(BAR_ID);

  // `CMuHelper::Toggle`: the Start / Stop button of the position panel, on its key.
  useEventBus('keyPressed', code => {
    if (isKey('muHelper', code) && Store.world?.playerEntity) Store.toggleMuHelper();
  });

  return (
    <div
      className="bottom-bar"
      style={{
        width: BAR_WIDTH,
        height: BAR_HEIGHT,
        transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: '50% 100%',
      }}
    >
      {FRAME_PIECES.map(piece => (
        <MuSpriteFrame
          key={piece.file}
          file={piece.file}
          className="frame-piece"
          width={piece.width}
          height={BAR_HEIGHT}
          style={{ left: piece.x, top: 0 }}
        />
      ))}

      <Orbs />

      <ConsumableItems />

      <SkillSlots />

      <BarButton
        index={0}
        file="partCharge1/newui_menu_Bt05.OZJ"
        title={t('bottomBar.itemShop')}
        onClick={() => toggleCashShopWindow()}
      />
      <BarButton
        index={1}
        file="partCharge1/newui_menu_Bt01.OZJ"
        title={t('bottomBar.characterInfo')}
        onClick={() => {
          Store.characterInfoEnabled = !Store.characterInfoEnabled;
        }}
      />
      <BarButton
        index={2}
        file="partCharge1/newui_menu_Bt02.OZJ"
        title={t('bottomBar.inventory')}
        onClick={() => {
          Store.inventoryEnabled = !Store.inventoryEnabled;
        }}
      />
      <BarButton
        index={3}
        file="partCharge1/newui_menu_Bt03.OZJ"
        title={t('bottomBar.friendList')}
        onClick={() => Messenger.toggleWindow()}
      />
      <BarButton
        index={4}
        file="partCharge1/newui_menu_Bt04.OZJ"
        title={t('bottomBar.options')}
        onClick={() => {
          Store.optionsEnabled = !Store.optionsEnabled;
        }}
      />

      <ExpBar />
      <MasterExpBar />
      <PetCommandBar />

      <MuResizeGrip id={BAR_ID} width={BAR_WIDTH} />
    </div>
  );
});
