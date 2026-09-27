import { MuSpriteFrame } from '../../components/muSprite';

/**
 * The page's icons, taken from MU's own interface art: the gate for the
 * worlds, the repair hammer for the server setup, the skill tree's down arrow
 * for the download. Where the sheet holds a lit and an idle state, the active
 * tab shows the lit one.
 */
const MU_ICONS = {
  worlds: { file: 'gate_button1.OZJ', width: 24, height: 24, lit: 0, idle: 0 },
  setup: {
    file: 'newui_repair_00.OZT',
    width: 36,
    height: 29,
    lit: 0,
    idle: 29,
  },
  download: {
    file: 'Master_arrow(D).OZT',
    width: 15,
    height: 19,
    lit: 0,
    idle: 0,
  },
} as const;

export type MuIconName = keyof typeof MU_ICONS;

export const MuIcon = ({
  name,
  size,
  lit = false,
}: {
  name: MuIconName;
  /** The longer side, px. */
  size: number;
  lit?: boolean;
}) => {
  const icon = MU_ICONS[name];
  const scale = size / Math.max(icon.width, icon.height);

  return (
    <span
      className={`ws-mu-icon${lit ? ' is-lit' : ''}`}
      style={{ width: icon.width * scale, height: icon.height * scale }}
      aria-hidden
    >
      <MuSpriteFrame
        file={icon.file}
        y={lit ? icon.lit : icon.idle}
        width={icon.width}
        height={icon.height}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          imageRendering: 'auto',
        }}
      />
    </span>
  );
};
