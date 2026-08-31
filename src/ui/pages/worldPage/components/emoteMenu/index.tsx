import { isKey } from '../../../../../common/keyBindings';
import { t } from '../../../../../i18n';
import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { useWindowStackEntry } from '../../../../components/muWindow/useWindowChrome';
import { playUiSound } from '../../../../../libs/sfx';
import {
  EMOTE_RINGS,
  EMOTES,
  type EmoteDefinition,
} from '../../../../../common/emotes';
import {
  EMOJI_BUBBLES,
  type EmojiBubbleDefinition,
} from '../../../../../common/emojiBubbles';

/**
 * Radial emote menu on º/` by default (TAB is the minimap as in the original, E is a
 * potion slot). The original client had no window for these
 * (`CheckChatText` fired them from chat words), so the layout is ours; the
 * colours follow the rest of the interface.
 */

const HOT_KEY = 'emoteMenu';

const SIZE = 580;
const CENTER = SIZE / 2;
const HUB_RADIUS = 48;
const RING_GAP = 6;
const RING_DEPTH = [66, 76, 62];
const WEDGE_GAP_DEG = 1.6;

/**
 * A wedge is either an animated emote (plays a clip, told to the server) or an
 * emoji bubble (overlay only) — see common/emojiBubbles.ts for why those are
 * separate things.
 */
type RadialEntry =
  | { kind: 'emote'; id: string; glyph: string; emote: EmoteDefinition }
  | { kind: 'emoji'; id: string; label: string; glyph: string; emoji: EmojiBubbleDefinition };

/** The hub caption. Emote names are translated; emoji keep their own label. */
function entryLabel(entry: RadialEntry): string {
  return entry.kind === 'emote' ? t(entry.emote.labelKey) : entry.label;
}

const ENTRIES: RadialEntry[] = [
  ...EMOTES.map(
    (emote): RadialEntry => ({
      kind: 'emote',
      id: `emote_${emote.id}`,
      glyph: emote.glyph,
      emote,
    })
  ),
  ...EMOJI_BUBBLES.map(
    (emoji): RadialEntry => ({
      kind: 'emoji',
      id: `emoji_${emoji.id}`,
      label: emoji.label,
      glyph: emoji.glyph,
      emoji,
    })
  ),
];

/** Wedges per ring, innermost first: the two emote rings, then the emoji ring. */
const RINGS = [...EMOTE_RINGS, EMOJI_BUBBLES.length];

type Wedge = {
  entry: RadialEntry;
  path: string;
  labelX: number;
  labelY: number;
  ring: number;
};

function polar(radius: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

function wedgePath(
  inner: number,
  outer: number,
  startDeg: number,
  endDeg: number
): string {
  const [x1, y1] = polar(outer, startDeg);
  const [x2, y2] = polar(outer, endDeg);
  const [x3, y3] = polar(inner, endDeg);
  const [x4, y4] = polar(inner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

function buildWedges(): Wedge[] {
  const wedges: Wedge[] = [];
  let index = 0;
  let inner = HUB_RADIUS + RING_GAP;

  RINGS.forEach((count, ring) => {
    const outer = inner + RING_DEPTH[ring];
    const step = 360 / count;
    const mid = (inner + outer) / 2;

    for (let i = 0; i < count && index < ENTRIES.length; i++, index++) {
      // First wedge centred on 12 o'clock.
      const start = -90 - step / 2 + i * step + WEDGE_GAP_DEG / 2;
      const end = start + step - WEDGE_GAP_DEG;
      const [labelX, labelY] = polar(mid, start + (end - start) / 2);

      wedges.push({
        entry: ENTRIES[index],
        path: wedgePath(inner, outer, start, end),
        labelX,
        labelY,
        ring,
      });
    }

    inner = outer + RING_GAP;
  });

  return wedges;
}

const WEDGES = buildWedges();
const OUTER_RADIUS =
  HUB_RADIUS +
  RING_GAP * RINGS.length +
  RING_DEPTH.slice(0, RINGS.length).reduce((a, b) => a + b, 0);

function isTypingInField(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

const EMOTE_MENU_ID = 'emote-menu';

export const EmoteMenu = observer(() => {
  const [hovered, setHovered] = useState<RadialEntry | null>(null);

  const open = Store.emoteMenuEnabled;

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      if (isTypingInField()) return;
      if (!Store.world?.playerEntity) return;
      Store.emoteMenuEnabled = !Store.emoteMenuEnabled;
      playUiSound(Store.emoteMenuEnabled ? 'window' : 'click');
    }
  });

  // A sheet over the windows: Escape closes it before anything under it.
  useWindowStackEntry(EMOTE_MENU_ID, open, () => {
    Store.emoteMenuEnabled = false;
  });

  useEffect(() => {
    if (!open) setHovered(null);
  }, [open]);

  if (!open) return null;

  const hero = Store.world?.playerEntity;
  const velocity = hero?.movement?.velocity;
  const heroBusy =
    !hero ||
    !!hero.dying ||
    (!!velocity && (velocity.x !== 0 || velocity.y !== 0));

  const close = () => {
    Store.emoteMenuEnabled = false;
  };

  const pick = (entry: RadialEntry) => {
    const world = Store.world;
    if (!world) return;

    if (entry.kind === 'emoji') {
      // Bubbles are an overlay, not a clip: they can be popped while walking
      // or mid-action, so they skip the standing-idle gate the emotes need.
      if (!hero || hero.dying) {
        playUiSound('error');
        return;
      }

      playUiSound('click');
      world.emojiRequest = entry.emoji.id;
      close();
      return;
    }

    if (heroBusy) {
      playUiSound('error');
      return;
    }

    playUiSound('click');
    world.emoteRequest = entry.emote.id;
    close();
  };

  return (
    <div className="emote-menu-page" onPointerDown={close}>
      <div
        className="emote-menu"
        style={{ width: SIZE, height: SIZE }}
        onPointerDown={e => e.stopPropagation()}
        onContextMenu={e => e.preventDefault()}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          onPointerLeave={() => setHovered(null)}
        >
          <defs>
            <radialGradient id="emote-plate" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2a2118" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#0c0a08" stopOpacity="0.92" />
            </radialGradient>
            <radialGradient id="emote-plate-hot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8c6a2c" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#4a3412" stopOpacity="0.95" />
            </radialGradient>
          </defs>

          <circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_RADIUS + 4}
            className="emote-halo"
          />

          {WEDGES.map(w => {
            const hot = hovered?.id === w.entry.id;
            return (
              <g
                key={w.entry.id}
                className={`emote-wedge ring-${w.ring}${hot ? ' hot' : ''}${
                  w.entry.kind === 'emoji' ? ' emoji' : ''
                }`}
                onPointerEnter={() => setHovered(w.entry)}
                onClick={() => pick(w.entry)}
              >
                <path d={w.path} />
                <text
                  x={w.labelX}
                  y={w.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {w.entry.glyph}
                </text>
              </g>
            );
          })}

          <g className="emote-hub" onClick={close}>
            <circle cx={CENTER} cy={CENTER} r={HUB_RADIUS} />
            {hovered ? (
              <text
                x={CENTER}
                y={CENTER}
                textAnchor="middle"
                dominantBaseline="central"
                className="hub-label"
              >
                {entryLabel(hovered)}
              </text>
            ) : (
              <>
                <text
                  x={CENTER}
                  y={CENTER - 8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="hub-label"
                >
                  {heroBusy ? t('emote.emojiOnly') : t('emote.menu')}
                </text>
                <text
                  x={CENTER}
                  y={CENTER + 10}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="hub-hint"
                >
                  E / Esc
                </text>
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
});
