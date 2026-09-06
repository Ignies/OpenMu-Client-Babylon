import { observer } from 'mobx-react-lite';
import { t } from '../../../../../i18n';
import { Store } from '../../../../../store';
import { useMuSprite } from '../../../../components/muSprite';
import { MobileButton, ScaledFrame } from './mobileButton';
import { SLOT_SCALE, SKILLBOX_SPRITE, SKILLBOX_USE_SPRITE, BOX_WIDTH, BOX_HEIGHT } from './consts';

/** `mini_map_ui_portal.OZT`: the minimap's own 30 px portal marker. */
const PORTAL_SPRITE = 'mini_map_ui_portal.OZT';
const GLYPH = 34;

/**
 * The warp list, one thumb away. It writes `Store.warpWindowEnabled` - the
 * same field the `M` key writes - so the Move Command window itself needs no
 * knowledge of any of this. That window already registers its size with
 * `MuWindows`, so `fitScaleOf` caps it to something that fits a phone.
 */
export const MoveButton = observer(() => {
  const open = Store.warpWindowEnabled;
  const portal = useMuSprite(PORTAL_SPRITE);

  return (
    <MobileButton
      className="mobile-move-button"
      title={t('warp.title')}
      onTap={() => {
        Store.warpWindowEnabled = !Store.warpWindowEnabled;
      }}
    >
      {pressed => (
        <ScaledFrame
          file={pressed || open ? SKILLBOX_USE_SPRITE : SKILLBOX_SPRITE}
          width={BOX_WIDTH}
          height={BOX_HEIGHT}
          scale={SLOT_SCALE}
        >
          <div
            className="mobile-move-glyph"
            style={{
              width: GLYPH,
              height: GLYPH,
              backgroundImage: portal ? `url(${portal.url})` : undefined,
            }}
          />
        </ScaledFrame>
      )}
    </MobileButton>
  );
});
