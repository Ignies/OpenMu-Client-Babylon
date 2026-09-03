import { observer } from 'mobx-react-lite';
import { t } from '../../../../../i18n';
import { ItemGroup } from '../../../../../common/itemStats';
import {
  closeGoldenArcher,
  goldenArcherWindow,
  registerRena,
} from '../../../../../events/goldenArcher';
import { MuButton } from '../../../../components/muButton';
import { MuItemWindow } from '../../../../components/muWindow';
import { ItemIcon } from '../../../../components/itemIcon';
import {
  BUTTON,
  BUTTON_COLOR_ENABLED,
  BUTTON_FRAMES,
  BUTTON_SPRITE,
  BUTTON_X,
  EXIT_BUTTON,
  EXIT_SPRITE,
  HEAD_CLOSE,
  INTRO_X,
  INTRO_WIDTH,
  TITLE_WIDTH,
  TITLE_X,
  TITLE_Y,
} from './layout';

/**
 * `CNewUIGoldBowmanLena` (NewUIGoldBowmanLena.cpp): the 190x429 frame, three
 * intro lines, the Rena rows (in inventory / registered, with the item at
 * their side like the reference's `RenderItem3D`), the Register button at
 * y 285 and the exit at (13, 392).
 */

const INTRO_Y = 100;
const INTRO_STEP = 15;
const ROWS_Y = 180;
const ROW_STEP = 45;
const ROW_LABEL_HEIGHT = 15;
const REGISTER_BUTTON_Y = 285;
const ICON = { width: 24, height: 30 };

const RENA_ITEM = { group: ItemGroup.Potion, num: 21 };

export const GoldenArcherWindow = observer(() => {
  const w = goldenArcherWindow();
  if (!w.open) return null;

  const intro = [
    t('goldenArcher.intro1'),
    t('goldenArcher.intro2'),
    t('goldenArcher.intro3'),
  ];
  const rows = [
    { label: t('goldenArcher.renaLabel'), count: w.remaining },
    { label: t('goldenArcher.registeredLabel'), count: w.registered },
  ];
  const title = t('goldenArcher.title');
  const close = () => closeGoldenArcher();

  return (
    <MuItemWindow
      id="golden-archer"
      className="event-window"
      label={title}
      onClose={close}
    >
      <div
        className="event-title"
        style={{ left: TITLE_X, top: TITLE_Y, width: TITLE_WIDTH }}
      >
        {title}
      </div>
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={close} />

      {intro.map((line, i) => (
        <div
          key={i}
          className="event-intro"
          style={{
            left: INTRO_X,
            top: INTRO_Y + i * INTRO_STEP,
            width: INTRO_WIDTH,
            height: INTRO_STEP,
            lineHeight: `${INTRO_STEP}px`,
          }}
        >
          {line}
        </div>
      ))}

      {rows.map((row, i) => (
        <div key={i}>
          <div
            className="event-intro"
            style={{
              left: INTRO_X,
              top: ROWS_Y + i * ROW_STEP,
              width: INTRO_WIDTH,
              height: ROW_LABEL_HEIGHT,
              lineHeight: `${ROW_LABEL_HEIGHT}px`,
              color: 'rgb(71,223,250)',
            }}
          >
            {row.label}
          </div>
          <div
            className="event-intro"
            style={{
              left: INTRO_X,
              top: ROWS_Y + i * ROW_STEP + ROW_LABEL_HEIGHT,
              width: INTRO_WIDTH,
              height: ICON.height,
              lineHeight: `${ICON.height}px`,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: ICON.width,
                height: ICON.height,
                verticalAlign: 'middle',
              }}
            >
              <ItemIcon item={RENA_ITEM} />
            </span>
            {`  X  ${row.count}`}
          </div>
        </div>
      ))}

      <div
        className="event-button"
        data-no-drag="true"
        style={{ left: BUTTON_X, top: REGISTER_BUTTON_Y }}
      >
        <MuButton
          file={BUTTON_SPRITE}
          width={BUTTON.width}
          height={BUTTON.height}
          frames={BUTTON_FRAMES}
          label={t('goldenArcher.register')}
          color={BUTTON_COLOR_ENABLED}
          activeColor={BUTTON_COLOR_ENABLED}
          onClick={() => registerRena()}
          labelStyle={{ fontWeight: 'bold', fontSize: 11 }}
        />
      </div>

      <div
        className="event-button"
        data-no-drag="true"
        style={{ left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}
        title={t('common.close')}
      >
        <MuButton
          file={EXIT_SPRITE}
          width={EXIT_BUTTON.width}
          height={EXIT_BUTTON.height}
          frames={{ up: 0, active: 1, down: 2 }}
          onClick={close}
        />
      </div>
    </MuItemWindow>
  );
});
