/**
 * The texture-pack picker on Options -> Video.
 *
 * Built like the language picker next to it, and for the same reason: the
 * list is discovered at runtime rather than compiled in, so it cannot be a
 * slider over a fixed set of names. A deployment that ships no packs sees
 * "Original" alone.
 *
 * Choosing a pack repoints the textures that are already on screen; nothing
 * is reloaded and no map is re-entered (`common/texturePacks.ts`).
 */

import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { uiClick } from '../../../libs/sfx';
import { t } from '../../../i18n';
import {
  ORIGINAL_PACK,
  loadPackIndex,
  setActivePack,
  texturePacks,
} from '../../../common/texturePacks';

const ROW_HEIGHT = 18;
const PLATE_HEIGHT = 18;
/** Rows before the list scrolls, when the caller does not say otherwise. */
const VISIBLE_ROWS = 8;

const mb = (bytes?: number) =>
  bytes === undefined ? '' : ` (${(bytes / 1048576).toFixed(0)} MB)`;

export const TexturePackSelect = observer(
  ({
    left,
    top,
    width,
    visibleRows = VISIBLE_ROWS,
  }: {
    left: number;
    top: number;
    width: number;
    /** Cap the open list so it cannot run past the window it sits in. */
    visibleRows?: number;
  }) => {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    // The index is only needed once the player opens Options at all.
    useEffect(() => {
      void loadPackIndex();
    }, []);

    useEffect(() => {
      if (!open) return;
      const onDown = (e: PointerEvent) => {
        if (!root.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('pointerdown', onDown, true);
      return () => document.removeEventListener('pointerdown', onDown, true);
    }, [open]);

    const active = texturePacks.active;
    const label = active ? active.name : t('options.texturePack.original');

    const choose = (id: string) => {
      setOpen(false);
      void setActivePack(id);
    };

    return (
      <div ref={root} className="options-language" style={{ left, top, width }}>
        <span className="options-label" style={{ left: 0, top: 0 }}>
          {t('options.texturePack')}
        </span>

        <div
          className={`options-combo${open ? ' is-open' : ''}`}
          style={{ top: 12, width, height: PLATE_HEIGHT }}
          title={t('options.texturePackHint')}
          onClick={uiClick(() => setOpen(v => !v))}
        >
          <span className="options-combo-name">
            {texturePacks.loading ? `${label}...` : label}
          </span>
          <span className="options-combo-arrow">{open ? '▲' : '▼'}</span>
        </div>

        {open && (
          <div
            className="options-combo-list scrollable"
            style={{
              top: 12 + PLATE_HEIGHT + 2,
              width,
              maxHeight: visibleRows * ROW_HEIGHT + 4,
            }}
          >
            <div
              className={`options-combo-row${
                texturePacks.activeId === ORIGINAL_PACK ? ' is-active' : ''
              }`}
              onClick={uiClick(() => choose(ORIGINAL_PACK))}
            >
              <span className="options-combo-name">
                {t('options.texturePack.original')}
              </span>
            </div>
            {texturePacks.available.map(pack => (
              <div
                key={pack.id}
                className={`options-combo-row${
                  pack.id === texturePacks.activeId ? ' is-active' : ''
                }`}
                onClick={uiClick(() => choose(pack.id))}
              >
                <span className="options-combo-name">
                  {pack.name}
                  {mb(pack.bytes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
