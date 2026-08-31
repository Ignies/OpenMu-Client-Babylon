/**
 * The flag beside a language in the Options selector.
 *
 * Drawn as inline SVG rather than a flag emoji on purpose: Windows ships no
 * regional-indicator glyphs, so `🇪🇸` renders as the letters "ES" in every
 * browser on the platform most of the players are on. Twelve rectangles and a
 * few paths cost nothing and look the same everywhere.
 *
 * One entry per `FlagRegion` in `i18n/layer.ts`; adding a language with a new
 * region means adding its shape to `SHAPES` here.
 */

import type { CSSProperties, ReactNode } from 'react';
import type { FlagRegion } from '../../../i18n';

/** The 3:2 field every flag is drawn in. */
const W = 24;
const H = 16;

/** A five-pointed star, point up, as a path — China's are the only ones. */
function star(cx: number, cy: number, r: number, rotation = 0): string {
  const points: string[] = [];

  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.382;
    const angle = rotation + (Math.PI / 5) * i - Math.PI / 2;
    points.push(
      `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`
    );
  }

  return `M${points.join('L')}Z`;
}

/** Horizontal bands, top to bottom, as a share of the height. */
function bands(colors: readonly string[]): ReactNode {
  const h = H / colors.length;
  return colors.map((fill, i) => (
    <rect key={i} x={0} y={i * h} width={W} height={h} fill={fill} />
  ));
}

/** Vertical bands, hoist to fly. */
function stripes(colors: readonly string[]): ReactNode {
  const w = W / colors.length;
  return colors.map((fill, i) => (
    <rect key={i} x={i * w} y={0} width={w} height={H} fill={fill} />
  ));
}

const SHAPES: Record<FlagRegion, ReactNode> = {
  // Union Jack: the white saltire under a narrower red one, then the cross.
  GB: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#012169" />
      <path d="M0,0 L24,16 M24,0 L0,16" fill="none" stroke="#ffffff" strokeWidth={3.4} />
      <path d="M0,0 L24,16 M24,0 L0,16" fill="none" stroke="#c8102e" strokeWidth={1.5} />
      <rect x={9.2} y={0} width={5.6} height={H} fill="#ffffff" />
      <rect x={0} y={5.2} width={W} height={5.6} fill="#ffffff" />
      <rect x={10.4} y={0} width={3.2} height={H} fill="#c8102e" />
      <rect x={0} y={6.4} width={W} height={3.2} fill="#c8102e" />
    </>
  ),

  // 1:2:1 bands; the coat of arms is far below the size this renders at.
  ES: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#c60b1e" />
      <rect x={0} y={4} width={W} height={8} fill="#ffc400" />
    </>
  ),

  FR: stripes(['#002395', '#ffffff', '#ed2939']),
  IT: stripes(['#008c45', '#f4f5f0', '#cd212a']),

  // 2:3 split with the armillary sphere reduced to its yellow ring.
  PT: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#da291c" />
      <rect x={0} y={0} width={9.6} height={H} fill="#046a38" />
      <circle
        cx={9.6}
        cy={8}
        r={3.2}
        fill="#da291c"
        stroke="#ffe900"
        strokeWidth={1.2}
      />
    </>
  ),

  RU: bands(['#ffffff', '#0039a6', '#d52b1e']),

  // The big star and its four companions, each turned to face it.
  CN: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#ee1c25" />
      <path d={star(4.4, 4.4, 2.8)} fill="#ffff00" />
      <path d={star(8.9, 1.9, 1.0, 0.35)} fill="#ffff00" />
      <path d={star(10.4, 4.0, 1.0, 0.75)} fill="#ffff00" />
      <path d={star(10.4, 6.6, 1.0, 1.1)} fill="#ffff00" />
      <path d={star(8.9, 8.6, 1.0, 1.5)} fill="#ffff00" />
    </>
  ),

  JP: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
      <circle cx={12} cy={8} r={4.8} fill="#bc002d" />
    </>
  ),

  // 1:1:2:1:1 bands — the blue centre is twice the others.
  TH: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#a51931" />
      <rect x={0} y={2.67} width={W} height={10.66} fill="#f4f5f8" />
      <rect x={0} y={5.33} width={W} height={5.34} fill="#2d2a4a" />
    </>
  ),

  // Taegeuk as two halves of one disc, with the four trigrams as bar groups.
  KR: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
      <g transform="rotate(-33 12 8)">
        <path d="M7.6,8 A4.4,4.4 0 0 1 16.4,8 A2.2,2.2 0 0 0 12,8 Z" fill="#cd2e3a" />
        <path d="M7.6,8 A2.2,2.2 0 0 1 12,8 A2.2,2.2 0 0 0 16.4,8 A4.4,4.4 0 0 1 7.6,8 Z" fill="#0047a0" />
      </g>
      {}
      <g fill="#0f0f0f">
        <rect x={1.6} y={7.2} width={3.4} height={0.5} />
        <rect x={1.6} y={8.0} width={3.4} height={0.5} />
        <rect x={1.6} y={8.8} width={3.4} height={0.5} />
        <rect x={19.0} y={7.2} width={3.4} height={0.5} />
        <rect x={19.0} y={8.0} width={3.4} height={0.5} />
        <rect x={19.0} y={8.8} width={3.4} height={0.5} />
        <rect x={10.3} y={0.4} width={3.4} height={0.5} />
        <rect x={10.3} y={1.2} width={3.4} height={0.5} />
        <rect x={10.3} y={14.3} width={3.4} height={0.5} />
        <rect x={10.3} y={15.1} width={3.4} height={0.5} />
      </g>
    </>
  ),

  BG: bands(['#ffffff', '#00966e', '#d62612']),
  RO: stripes(['#002b7f', '#fcd116', '#ce1126']),
  DE: bands(['#000000', '#dd0000', '#ffce00']),
};

/** The regions `SHAPES` actually draws — the language list is checked against it. */
export const SHAPES_REGIONS = Object.keys(SHAPES) as FlagRegion[];

export function MuFlag({
  region,
  width = 20,
  title,
  style,
}: {
  region: FlagRegion;
  /** Drawn at 3:2; the height follows. */
  width?: number;
  title?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className="mu-flag"
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={Math.round((width * H) / W)}
      shapeRendering="geometricPrecision"
      style={style}
      role="img"
      aria-label={title}
    >
      {title !== undefined && <title>{title}</title>}
      {SHAPES[region]}
      {}
      <rect
        x={0.25}
        y={0.25}
        width={W - 0.5}
        height={H - 0.5}
        fill="none"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth={0.5}
      />
    </svg>
  );
}
