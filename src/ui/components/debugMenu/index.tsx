import './style.less';
import './modules';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../store';
import { useEventBus } from '../../../hooks/useEventBus';
import { uiClick } from '../../../libs/sfx';
import { MuSpriteFrame } from '../muSprite';
import { MuButton } from '../muButton';
import { MuResizeGrip, useWindowChrome } from '../muWindow/useWindowChrome';
import { TEXT_COLOR } from '../../pages/serversPage/layout';
import {
  DebugMenu,
  type DebugAction,
  type DebugRow,
} from '../../../common/debugMenu';

/**
 * The offline debug window (documentation/debug_menu/ARCHITECTURE.md): the
 * registry's single consumer. Tabs come from `DebugMenu.modules`, rows are
 * rendered by kind - the window knows no module by name. Drawn with the
 * Options window's stone chrome and plate/gold vocabulary so it reads as
 * part of the client, not as an overlay.
 *
 * F9 toggles it - a raw `keyPressed` code on purpose, not a `KeyBindings`
 * action, so the player-facing Keys tab stays clean. Offline only: online
 * sessions render null and never see the key.
 */

const WINDOW_ID = 'debug-menu';

const TOGGLE_KEY = 'F9';

const ART_WIDTH = 213;

const WIN_WIDTH = ART_WIDTH * 2;
const WIN_HEIGHT = 470;

const TOP_HEIGHT = 65;
const BOTTOM_HEIGHT = 43;

const CONTENT_TOP = TOP_HEIGHT + 14;
const TAB_HEIGHT = 24;
const TAB_GAP = 4;
const CONTENT_X = 28;
const CONTENT_WIDTH = WIN_WIDTH - CONTENT_X * 2;

const CLOSE_WIDTH = 108;
const CLOSE_HEIGHT = 30;
const CLOSE_Y = WIN_HEIGHT - 47;

const CONTENT_HEIGHT = CLOSE_Y - (CONTENT_TOP + TAB_HEIGHT + 12) - 8;

const CHECK_SIZE = 16;

const SLIDER_WIDTH = 98;
const SLIDER_HEIGHT = 13;
const THUMB_SIZE = 13;
const GAUGE_INSET_X = 3;
const GAUGE_INSET_Y = 3;
const GAUGE_WIDTH = 95 - GAUGE_INSET_X;
const GAUGE_HEIGHT = 10 - GAUGE_INSET_Y;

/** How often the live `info` rows re-read their values while open. */
const REFRESH_MS = 500;

const CheckRow = observer(({
  row,
}: {
  row: Extract<DebugRow, { kind: 'check' }>;
}) => {
  const checked = row.get();
  const flip = uiClick(() => row.set(!checked));

  return (
    <div className="debug-row debug-check">
      <MuSpriteFrame
        file="op2_ch.OZT"
        y={checked ? CHECK_SIZE : 0}
        width={CHECK_SIZE}
        height={CHECK_SIZE}
        style={{ cursor: 'pointer', flex: 'none' }}
        onClick={flip}
      />
      <span className="debug-label debug-clickable" onClick={flip}>
        {row.label}
      </span>
    </div>
  );
});

const SliderRow = observer(({
  row,
}: {
  row: Extract<DebugRow, { kind: 'slider' }>;
}) => {
  const min = row.min ?? 0;
  const value = Math.min(Math.max(min, row.get()), row.max);
  const span = row.max - min;
  const ratio = span === 0 ? 0 : (value - min) / span;

  return (
    <div className="debug-row debug-slider-row">
      <span className="debug-label">{row.label}</span>
      <span className="debug-value">
        {row.display ? row.display(value) : value}
      </span>
      <div
        className="debug-slider"
        style={{ width: SLIDER_WIDTH, height: SLIDER_HEIGHT }}
      >
        <MuSpriteFrame
          file="op2_volume1.OZT"
          width={SLIDER_WIDTH}
          height={SLIDER_HEIGHT}
          style={{ position: 'absolute', left: 0, top: 0 }}
        />
        <MuSpriteFrame
          file="op2_volume2.OZJ"
          width={Math.round(GAUGE_WIDTH * ratio)}
          height={GAUGE_HEIGHT}
          style={{
            position: 'absolute',
            left: GAUGE_INSET_X,
            top: GAUGE_INSET_Y,
            backgroundRepeat: 'repeat',
          }}
        />
        <MuSpriteFrame
          file="op2_volume3.OZT"
          width={THUMB_SIZE}
          height={THUMB_SIZE}
          style={{
            position: 'absolute',
            left: Math.round((SLIDER_WIDTH - THUMB_SIZE) * ratio),
            top: 0,
            pointerEvents: 'none',
          }}
        />
        <input
          type="range"
          className="debug-range"
          min={min}
          max={row.max}
          step={row.step ?? 1}
          value={value}
          onChange={e => row.set(Number(e.target.value))}
        />
      </div>
    </div>
  );
});

const Chip = observer(({ item }: { item: DebugAction }) => (
  <div
    className={`debug-chip${item.active?.() ? ' is-active' : ''}`}
    onClick={uiClick(item.onClick)}
  >
    {item.label}
  </div>
));

const renderRow = (row: DebugRow) => {
  switch (row.kind) {
    case 'check':
      return <CheckRow key={row.id} row={row} />;
    case 'slider':
      return <SliderRow key={row.id} row={row} />;
    case 'buttons':
      return (
        <div key={row.id} className="debug-row debug-chips">
          {row.items.map(item => (
            <Chip key={item.id} item={item} />
          ))}
        </div>
      );
    case 'list':
      return (
        <div key={row.id} className="debug-list">
          {row.items().map(item => (
            <div
              key={item.id}
              className={`debug-list-row${item.active?.() ? ' is-active' : ''}`}
              onClick={uiClick(item.onClick)}
            >
              {item.label}
            </div>
          ))}
        </div>
      );
    case 'info':
      return (
        <div key={row.id} className="debug-row debug-info">
          <span className="debug-label">{row.label}</span>
          <span className="debug-value">{row.value()}</span>
        </div>
      );
    case 'section':
      return (
        <span key={row.id} className="debug-section">
          {row.label}
        </span>
      );
  }
};

export const DebugMenuWindow = observer(() => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // The `info` rows read live counters; bump a tick so they re-render.
  const [, setTick] = useState(0);

  const open = Store.isOffline && DebugMenu.open;

  useEventBus('keyPressed', key => {
    if (!Store.isOffline) return;
    if (key === TOGGLE_KEY) DebugMenu.toggle();
  });

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setTick(t => t + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, [open]);

  const chrome = useWindowChrome(WINDOW_ID, {
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    onClose: () => DebugMenu.close(),
  });

  if (!open) return null;

  const modules = DebugMenu.modules;
  if (modules.length === 0) return null;

  const tab = modules.find(m => m.id === activeTab) ?? modules[0];

  const tabWidth = Math.min(
    96,
    Math.floor((CONTENT_WIDTH - (modules.length - 1) * TAB_GAP) / modules.length)
  );
  const stripWidth = modules.length * tabWidth + (modules.length - 1) * TAB_GAP;

  return (
    <div className="debug-menu-page">
      <div
        ref={chrome.ref as React.Ref<HTMLDivElement>}
        className="debug-menu"
        style={{
          ...chrome.style,
          position: chrome.anchored ? 'relative' : 'absolute',
          transformOrigin: chrome.anchored ? 'center' : '0 0',
        }}
      >
        <MuSpriteFrame
          file="op1_stone.OZJ"
          width={WIN_WIDTH - 6}
          height={WIN_HEIGHT - 6}
          style={{
            position: 'absolute',
            left: 3,
            top: 3,
            backgroundRepeat: 'repeat',
          }}
        />
        <MuSpriteFrame
          file="op1_back3.OZJ"
          width={5}
          height={WIN_HEIGHT - TOP_HEIGHT - BOTTOM_HEIGHT}
          style={{
            position: 'absolute',
            left: 0,
            top: TOP_HEIGHT,
            backgroundRepeat: 'repeat-y',
          }}
        />
        <MuSpriteFrame
          file="op1_back4.OZJ"
          width={5}
          height={WIN_HEIGHT - TOP_HEIGHT - BOTTOM_HEIGHT}
          style={{
            position: 'absolute',
            right: 0,
            top: TOP_HEIGHT,
            backgroundRepeat: 'repeat-y',
          }}
        />
        {[false, true].map(mirrored => (
          <MuSpriteFrame
            key={`top-${mirrored}`}
            file="op2_back1.OZT"
            width={ART_WIDTH}
            height={TOP_HEIGHT}
            style={{
              position: 'absolute',
              left: mirrored ? ART_WIDTH : 0,
              top: 0,
              ...(mirrored && { transform: 'scaleX(-1)' }),
            }}
          />
        ))}
        {[false, true].map(mirrored => (
          <MuSpriteFrame
            key={`bottom-${mirrored}`}
            file="op1_back2.OZT"
            width={ART_WIDTH}
            height={BOTTOM_HEIGHT}
            style={{
              position: 'absolute',
              left: mirrored ? ART_WIDTH : 0,
              bottom: 0,
              ...(mirrored && { transform: 'scaleX(-1)' }),
            }}
          />
        ))}

        <div
          className="debug-title"
          style={{ top: 10, cursor: 'move' }}
          onPointerDown={chrome.onPointerDown}
        >
          Debug
        </div>

        {modules.map((module, i) => {
          const x =
            Math.floor((WIN_WIDTH - stripWidth) / 2) + i * (tabWidth + TAB_GAP);

          return (
            <div
              key={module.id}
              className={`debug-tab${module.id === tab.id ? ' is-active' : ''}`}
              style={{
                left: x,
                top: CONTENT_TOP,
                width: tabWidth,
                height: TAB_HEIGHT,
              }}
              onClick={uiClick(() => setActiveTab(module.id))}
            >
              {module.title}
            </div>
          );
        })}

        <div
          className="debug-content"
          style={{
            left: CONTENT_X,
            top: CONTENT_TOP + TAB_HEIGHT + 12,
            width: CONTENT_WIDTH,
            height: CONTENT_HEIGHT,
          }}
        >
          {tab.rows().map(renderRow)}
        </div>

        <MuButton
          file="op1_b_all.OZT"
          width={CLOSE_WIDTH}
          height={CLOSE_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label="Close"
          onClick={() => DebugMenu.close()}
          style={{
            position: 'absolute',
            left: Math.floor((WIN_WIDTH - CLOSE_WIDTH) / 2),
            top: CLOSE_Y,
          }}
          labelStyle={{ fontSize: 11, textShadow: '1px 1px 0 rgba(0,0,0,.85)' }}
        />

        <MuResizeGrip id={WINDOW_ID} width={WIN_WIDTH} />
      </div>
    </div>
  );
});
