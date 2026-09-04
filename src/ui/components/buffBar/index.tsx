import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { MuSpriteFrame } from '../muSprite';
import { useUiStageScale } from '../uiStage';
import { skills, type ActiveBuff } from '../../../skills';
import { BUFF_ICON_HEIGHT, BUFF_ICON_WIDTH, buffIconCell } from '../../../skills/recipes';
import { t } from '../../../i18n';

/** `CNewUIBuffWindow::SetPos(640)`: the row starts at (220, 15). */
const BAR_X = 220;
const BAR_Y = 15;
/** BUFF_IMG_SPACE / BUFF_MAX_LINE_COUNT. */
const ICON_SPACE = 5;
const ICONS_PER_LINE = 8;
/** How often the remaining-time tip is refreshed; the layer clock is not observable. */
const TICK_MS = 500;

function formatRemaining(seconds: number): string {
  const s = Math.ceil(seconds);
  const m = Math.floor(s / 60);
  return m > 0
    ? t('buff.remainingMin', { minutes: m, seconds: s % 60 })
    : t('buff.remainingSec', { seconds: s });
}

/**
 * `RenderBuffTooltip`: the effect's name in bold blue, then the remaining
 * time when the client can estimate it (`g_BuffToolTipString`). The
 * half-second refresh lives here, so it only runs while a tip is showing.
 */
const BuffTip = ({ buff, x, y }: { buff: ActiveBuff; x: number; y: number }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const remaining = skills.buffRemaining(buff.id);
  return (
    <div className="buff-tip" style={{ left: x, top: y }}>
      <div className="buff-tip-name">{buff.name}</div>
      {remaining !== null && <div>{formatRemaining(remaining)}</div>}
      {buff.kind === 'debuff' && <div className="buff-tip-debuff">{t('buff.debuff')}</div>}
    </div>
  );
};

/**
 * `CNewUIBuffWindow`: the hero's buffs then debuffs (MagicEffectStatus 0x07)
 * as 20×28 cells of `newui_statusicon*.OZJ`, 8 to a line, 5 px apart, in the
 * 640×480 stage. Hovering an icon shows its tip under the icon's centre.
 */
export const BuffBar = observer(() => {
  const buffs = skills.activeBuffs;
  const scale = useUiStageScale();
  const [hovered, setHovered] = useState(-1);

  if (buffs.length === 0) return null;

  return (
    <div
      className="buff-bar"
      style={{ left: BAR_X * scale, top: BAR_Y * scale, transform: `scale(${scale})` }}
    >
      {buffs.map((buff, i) => {
        const x = (i % ICONS_PER_LINE) * (BUFF_ICON_WIDTH + ICON_SPACE);
        const y = Math.floor(i / ICONS_PER_LINE) * (BUFF_ICON_HEIGHT + ICON_SPACE);
        const cell = buffIconCell(buff.id);
        const style = { left: x, top: y, width: BUFF_ICON_WIDTH, height: BUFF_ICON_HEIGHT };
        return (
          <div
            key={buff.id}
            className={`buff ${buff.kind}`}
            style={style}
            onPointerEnter={() => setHovered(buff.id)}
            onPointerLeave={() => setHovered(h => (h === buff.id ? -1 : h))}
          >
            {cell ? (
              <MuSpriteFrame
                file={cell.file}
                x={cell.x}
                y={cell.y}
                width={BUFF_ICON_WIDTH}
                height={BUFF_ICON_HEIGHT}
              />
            ) : (
              <div className="buff-text">{buff.name.slice(0, 3)}</div>
            )}
            {hovered === buff.id && (
              <BuffTip buff={buff} x={BUFF_ICON_WIDTH / 2} y={BUFF_ICON_WIDTH} />
            )}
          </div>
        );
      })}
    </div>
  );
});
