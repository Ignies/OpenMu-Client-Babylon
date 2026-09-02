import './style.less';
import { t } from '../../../../../i18n';
import { useEffect, useRef, useState, type WheelEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import { isKey } from '../../../../../common/keyBindings';
import { BaseClass, getBaseClass } from '../../../../../common/characterStats';
import { PVP_MURDERER1 } from '../../../../../common/nameTags';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { EventBus } from '../../../../../libs/eventBus';
import { ENUM_WORLD } from '../../../../../common';
import { LL } from '../../../../../libs/localization';
import { playUiSound, uiClick } from '../../../../../libs/sfx';
import { loadMoveReqList, type MoveReqEntry } from '../../../../../libs/mu/moveReqFile';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuText } from '../../../../components/muText';
import { useWindowChrome } from '../../../../components/muWindow/useWindowChrome';

/**
 * `CNewUIMoveCommandWindow` (NewUIMoveCommandWindow.cpp): the "M" window -
 * the rows of `MoveReq_eng.bmd` on a black panel in the top-left corner
 * (`Create(m_pNewUIMng, 1, 1)`), map / required level / zen in three
 * centred columns, white when the hero can go and dark red when not, with
 * the failing number in bright red (`SettingCanMoveMap` / `Render`). A click
 * on a white row sends `WarpCommandRequest` with the row's index and hides
 * the window; the server answers with `MapChanged` (logic.ts) or a blue
 * message. Escape and the red bar at the bottom close it.
 *
 * Rules kept from `SettingCanMoveMap`: level (2/3 for MG / DL / RF, never
 * for a 400 requirement), zen, and `Hero->PK < PVP_MURDERER1`. Dropped: the
 * Icarus wing / Dinorant / Fenrir and the Uniria-in-Lorencia mount checks
 * (the server refuses those with a message anyway), and the gens-only
 * (`_bStrife`) block on Vulcanus - OpenMU has no gens influence, so the row
 * stays clickable and the server decides.
 *
 * Offline, a click warps locally through `requestWarp` for the maps this
 * client stages, so the window is still usable without a server.
 */

const WINDOW_ID = 'move-window';
const HOT_KEY = 'warpList';

/** `MOVECOMMAND_MAX_RENDER_TEXTLINE`. */
const MAX_LINES = 31;
/**
 * `m_iRealFontHeight` = 12 + 2 at 640 wide. That makes the panel 494 px
 * tall - taller than the 480 stage - so rows are 13 px here: 60 + 31 × 13 =
 * 463 keeps the close bar on screen.
 */
const ROW_HEIGHT = 13;
/** `m_MapNameUISize.x` at 640 (220) + 10. */
const WIDTH = 230;
/** `m_MapNameUISize.y`. */
const HEIGHT = 60 + ROW_HEIGHT * MAX_LINES;
/** `m_StartUISubjectName`: the title, centred at width/2, y 4. */
const TITLE_Y = 4;
/** The column headers sit 20 px under the title. */
const HEADER_Y = TITLE_Y + 20;
/** `m_StartMapNamePos`: the first row. */
const ROWS = { x: 2, y: 38 };
/** The three column centres at 640 (`SetPos`). */
const COL = { map: 62, level: 119, zen: 159 };
/** Rows are hit-tested `m_MapNameUISize.x - 22` wide. */
const ROW_WIDTH = WIDTH - 22;

/** `m_ScrollBarPos` = right edge - 14, top = first row - 3. */
const SCROLLBAR = { x: WIDTH - 14, y: ROWS.y - 3, width: 7 };
const SCROLLBAR_CAP = 3;
const SCROLLBAR_HEIGHT = MAX_LINES * ROW_HEIGHT;
/** `MOVECOMMAND_SCROLLBTN_*`: the thumb, 4 px left of the track so it is centred on it. */
const THUMB = { width: 15, height: 30 };
const THUMB_X = SCROLLBAR.x - (THUMB.width / 2 - SCROLLBAR.width / 2);

/** `RenderColor(m_StartMapNamePos.x, h - font - 6, w - 5, font)`. */
const CLOSE_BAR = { x: ROWS.x, y: HEIGHT - ROW_HEIGHT - 6, width: WIDTH - 5, height: ROW_HEIGHT };

const SCROLL_TOP_SPRITE = 'newui_scrollbar_up.OZT';
const SCROLL_MIDDLE_SPRITE = 'newui_scrollbar_m.OZT';
const SCROLL_BOTTOM_SPRITE = 'newui_scrollbar_down.OZT';
const THUMB_ON_SPRITE = 'newui_scroll_on.OZT';
const THUMB_OFF_SPRITE = 'newui_scroll_off.OZT';

// `RenderFrame` / `Render` colours.
const TITLE_COLOR = 'rgb(255, 204, 26)';
const HEADER_COLOR = 'rgb(127, 178, 255)';
const CAN_MOVE_COLOR = '#fff';
const CANNOT_MOVE_COLOR = 'rgb(164, 39, 17)';
const FAILING_COLOR = 'rgb(255, 51, 26)';

/**
 * `CharacterExtensions.GetEffectiveMoveLevelRequirement` (OpenMU):
 * `LevelWarpRequirementReductionPercent` = ceil(100 / 3) = 34 on MG, DL and
 * RF - the original's `CLASS_DARK` (the gladiator) / `CLASS_DARK_LORD` /
 * `CLASS_RAGEFIGHTER` × 2/3. The server's integer arithmetic is used so the
 * greying agrees with what it accepts (140 → 92, where the client's
 * `int(140 * 2.f / 3.f)` says 93).
 */
const LEVEL_REDUCTION_PERCENT = 34;
const REDUCED_CLASSES: ReadonlySet<BaseClass> = new Set([
  BaseClass.MagicGladiator,
  BaseClass.DarkLord,
  BaseClass.RageFighter,
]);

export function effectiveMoveLevel(reqLevel: number, cls: BaseClass): number {
  if (reqLevel === 400 || !REDUCED_CLASSES.has(cls)) return reqLevel;
  return Math.trunc((reqLevel * (100 - LEVEL_REDUCTION_PERCENT)) / 100);
}

/**
 * `MoveReq_eng.bmd` index → OpenMU `WarpInfo.Index` where the two disagree.
 * The Season 6 `Gates.cs` warp list numbers every row the same as the file
 * (1 Arena, 2 Lorencia, 3 Noria, 4 Devias, 31 Elveland, 23 Icarus, …)
 * except Vulcanus, which the file calls 42 (the original's gens `anStrifeIndex`)
 * and OpenMU seeds as 37. OpenMU's 44 LorenMarket / 48 LaCleon have no row in
 * the Eng file (34 LaCleon maps to OpenMU's 34 "Raklion", the same gate).
 */
const SERVER_INDEX: Readonly<Record<number, number>> = {
  42: 37,
};

/** The staged maps an offline click can still land on, by the file's `index`. */
const OFFLINE_MAPS: Readonly<Record<number, ENUM_WORLD>> = {
  2: ENUM_WORLD.WD_0LORENCIA,
  3: ENUM_WORLD.WD_3NORIA,
  4: ENUM_WORLD.WD_2DEVIAS,
  8: ENUM_WORLD.WD_1DUNGEON,
  11: ENUM_WORLD.WD_7ATLANSE,
  14: ENUM_WORLD.WD_4LOSTTOWER,
  21: ENUM_WORLD.WD_8TARKAN,
  23: ENUM_WORLD.WD_10ICARUS,
};

type RowState = {
  entry: MoveReqEntry;
  reqLevel: number;
  levelOk: boolean;
  zenOk: boolean;
  canMove: boolean;
};

/** `SettingCanMoveMap` for one row. */
function rowState(entry: MoveReqEntry, level: number, zen: number, cls: BaseClass, pk: number): RowState {
  const reqLevel = effectiveMoveLevel(entry.reqLevel, cls);
  const levelOk = level >= reqLevel;
  const zenOk = zen >= entry.zen;
  return { entry, reqLevel, levelOk, zenOk, canMove: levelOk && zenOk && pk < PVP_MURDERER1 };
}

export function openMoveWindow(): void {
  runInAction(() => {
    Store.warpWindowEnabled = true;
  });
}

export function closeMoveWindow(): void {
  runInAction(() => {
    Store.warpWindowEnabled = false;
  });
}

const Row = ({ row, y, onClick }: { row: RowState; y: number; onClick: () => void }) => {
  const base = row.canMove ? CAN_MOVE_COLOR : CANNOT_MOVE_COLOR;
  const failing = (ok: boolean) => (row.canMove || ok ? base : FAILING_COLOR);
  return (
    <div
      className={`move-row${row.canMove ? ' can-move' : ''}`}
      data-no-drag="true"
      style={{ left: ROWS.x, top: y - 1, width: ROW_WIDTH, height: ROW_HEIGHT }}
      onClick={row.canMove ? uiClick(onClick) : undefined}
    >
      <MuText className="move-label" color={base} style={{ left: COL.map - ROWS.x, top: 1 }} text={row.entry.name} />
      <MuText
        className="move-label"
        color={failing(row.levelOk)}
        style={{ left: COL.level - ROWS.x, top: 1 }}
        text={String(row.reqLevel)}
      />
      <MuText
        className="move-label"
        color={failing(row.zenOk)}
        style={{ left: COL.zen - ROWS.x, top: 1 }}
        text={String(row.entry.zen)}
      />
    </div>
  );
};

export const MoveCommandWindow = observer(() => {
  const [entries, setEntries] = useState<readonly MoveReqEntry[]>([]);
  const [first, setFirst] = useState(0);
  const dragging = useRef<{ pointerId: number; startY: number; startFirst: number } | null>(null);
  const open = Store.warpWindowEnabled;
  const chrome = useWindowChrome(WINDOW_ID, {
    width: WIDTH,
    height: HEIGHT,
    // `UpdateKeyEvent`: Escape closes it with SOUND_CLICK01.
    onClose: () => {
      closeMoveWindow();
      playUiSound('click');
    },
  });
  // Fit-capped by the window state, so the close bar always stays on screen.
  const scale = chrome.scale;

  useEventBus('keyPressed', key => {
    if (!Store.world?.playerEntity) return;
    if (isKey(HOT_KEY, key)) {
      if (Store.warpWindowEnabled) closeMoveWindow();
      else openMoveWindow();
    }
  });

  useEffect(() => {
    if (!open) return;
    // `OpenningProcess`: back to the top every time it opens.
    setFirst(0);
    let cancelled = false;
    loadMoveReqList().then(
      list => {
        if (!cancelled) setEntries(list);
      },
      err => console.error('Could not load MoveReq_eng.bmd:', err)
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const { level, money, charClass } = Store.playerData;
  const cls = getBaseClass(charClass);
  const pk = Store.world?.playerEntity?.heroState ?? 3;

  const total = entries.length;
  const maxFirst = Math.max(0, total - MAX_LINES);
  const start = Math.min(first, maxFirst);
  const visible = entries.slice(start, start + MAX_LINES);
  const scrollable = maxFirst > 0;
  /** `m_iTotalMoveScrBtnPixel`: the thumb travels the track less its own height. */
  const thumbTravel = SCROLLBAR_HEIGHT - THUMB.height;
  const thumbY = SCROLLBAR.y + (scrollable ? Math.round((start / maxFirst) * thumbTravel) : 0);

  const scrollBy = (rows: number) => setFirst(f => Math.max(0, Math.min(maxFirst, f + rows)));

  const onWheel = (e: WheelEvent) => {
    if (!scrollable) return;
    scrollBy(e.deltaY > 0 ? 1 : -1);
  };

  const onThumbDown = (e: React.PointerEvent) => {
    if (!scrollable || e.button !== 0) return;
    dragging.current = { pointerId: e.pointerId, startY: e.clientY, startFirst: start };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  };
  const onThumbMove = (e: React.PointerEvent) => {
    const drag = dragging.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dy = (e.clientY - drag.startY) / scale;
    setFirst(Math.max(0, Math.min(maxFirst, Math.round(drag.startFirst + (dy / thumbTravel) * maxFirst))));
  };
  const onThumbUp = (e: React.PointerEvent) => {
    if (dragging.current?.pointerId === e.pointerId) dragging.current = null;
  };

  const warpTo = (entry: MoveReqEntry) => {
    closeMoveWindow();
    if (Store.isOffline) {
      const map = OFFLINE_MAPS[entry.index];
      if (map !== undefined) EventBus.emit('requestWarp', { map });
      return;
    }
    Store.warpCommandRequest(SERVER_INDEX[entry.index] ?? entry.index);
  };

  return (
    <div
      ref={chrome.ref as React.Ref<HTMLDivElement>}
      role="dialog"
      aria-label={t('moveList.title')}
      tabIndex={-1}
      className="move-window"
      onPointerDown={chrome.onPointerDown}
      onWheel={onWheel}
      style={{
        width: WIDTH,
        height: HEIGHT,
        ...chrome.style,
        transform: `scale(${scale})`,
        // Anchored at the stage's top-left (1,1): scale from that corner, not
        // from the bottom-right the chrome assumes for bar-anchored windows.
        transformOrigin: '0 0',
      }}
    >
      {/* GlobalText 933 in g_hFontBold (255, 204, 26). */}
      <MuText
        face="bold"
        className="move-label"
        color={TITLE_COLOR}
        style={{ left: WIDTH / 2, top: TITLE_Y }}
        text={LL('warp-window.title')}
      />
      {/* GlobalText 934 / 935 / 936 in (127, 178, 255). */}
      <MuText className="move-label" color={HEADER_COLOR} style={{ left: COL.map, top: HEADER_Y }} text={LL('warp-window.map')} />
      <MuText className="move-label" color={HEADER_COLOR} style={{ left: COL.level, top: HEADER_Y }} text={LL('warp-window.min-lvl')} />
      <MuText className="move-label" color={HEADER_COLOR} style={{ left: COL.zen, top: HEADER_Y }} text={LL('warp-window.cost')} />

      {visible.map((entry, i) => (
        <Row
          key={entry.index}
          row={rowState(entry, level, money, cls, pk)}
          y={ROWS.y + i * ROW_HEIGHT}
          onClick={() => warpTo(entry)}
        />
      ))}

      {/* The chat-log scrollbar: up cap, stretched middle, down cap, and the 15x30 thumb. */}
      <MuSpriteFrame
        file={SCROLL_TOP_SPRITE}
        width={SCROLLBAR.width}
        height={SCROLLBAR_CAP}
        className="move-scrollbar"
        style={{ left: SCROLLBAR.x, top: SCROLLBAR.y }}
      />
      <MuSpriteFrame
        file={SCROLL_MIDDLE_SPRITE}
        width={SCROLLBAR.width}
        height={SCROLLBAR_HEIGHT - SCROLLBAR_CAP * 2}
        className="move-scrollbar"
        style={{ left: SCROLLBAR.x, top: SCROLLBAR.y + SCROLLBAR_CAP, backgroundSize: '100% 100%' }}
      />
      <MuSpriteFrame
        file={SCROLL_BOTTOM_SPRITE}
        width={SCROLLBAR.width}
        height={SCROLLBAR_CAP}
        className="move-scrollbar"
        style={{ left: SCROLLBAR.x, top: SCROLLBAR.y + SCROLLBAR_HEIGHT - SCROLLBAR_CAP }}
      />
      <div
        className="move-scroll-thumb"
        data-no-drag="true"
        style={{ left: THUMB_X, top: thumbY, width: THUMB.width, height: THUMB.height }}
        onPointerDown={onThumbDown}
        onPointerMove={onThumbMove}
        onPointerUp={onThumbUp}
        onPointerCancel={onThumbUp}
      >
        <MuSpriteFrame
          file={scrollable ? THUMB_ON_SPRITE : THUMB_OFF_SPRITE}
          width={THUMB.width}
          height={THUMB.height}
        />
      </div>

      {/* GlobalText 1002 on the red bar. */}
      <div
        className="move-close"
        data-no-drag="true"
        style={{ left: CLOSE_BAR.x, top: CLOSE_BAR.y, width: CLOSE_BAR.width, height: CLOSE_BAR.height, lineHeight: `${CLOSE_BAR.height}px` }}
        onClick={uiClick(closeMoveWindow)}
      >
        <MuText text={LL('warp-window.close')} />
      </div>
    </div>
  );
});
