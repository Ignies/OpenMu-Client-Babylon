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
import type { FlagRegion } from '@/i18n';

/** The 3:2 field every flag is drawn in. */
const W = 24;
const H = 16;

/** A five-pointed star, point up, as a path - China's are the only ones. */
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

/** A sun: `points` rays between an outer and an inner radius, point up. */
function burst(cx: number, cy: number, outer: number, inner: number, points: number): string {
  const out: string[] = [];

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    out.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }

  return `M${out.join('L')}Z`;
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

  // 1:1:2:1:1 bands - the blue centre is twice the others.
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
  PL: bands(['#ffffff', '#dc143c']),

  VN: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#da251d" />
      <path d={star(12, 8.4, 4.8)} fill="#ffff00" />
    </>
  ),

  // The shahada is reduced to a line of white strokes: script this small is
  // noise, and the flag reads by its green, its white line and its sword.
  SA: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#006c35" />
      <path
        d="M5.4,6.8 q1.1,-2.4 2.2,0 q1.1,-2.4 2.2,0 q1.1,-2.4 2.2,0 q1.1,-2.4 2.2,0 q1.1,-2.4 2.2,0 q1.1,-2.4 2.2,0"
        fill="none"
        stroke="#ffffff"
        strokeWidth={0.8}
      />
      <path d="M5.2,10.8 L17.2,10.8" stroke="#ffffff" strokeWidth={0.8} />
      <rect x={16.8} y={9.8} width={0.7} height={2} fill="#ffffff" />
      <rect x={17.5} y={10.45} width={1.6} height={0.7} fill="#ffffff" />
    </>
  ),

  // The Ikurriña: a green saltire under a white cross, on red.
  'ES-PV': (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#d52b1e" />
      <path d="M0,0 L24,16 M24,0 L0,16" fill="none" stroke="#009b48" strokeWidth={2.4} />
      <rect x={10.9} y={0} width={2.2} height={H} fill="#ffffff" />
      <rect x={0} y={6.9} width={W} height={2.2} fill="#ffffff" />
    </>
  ),

  // The red disc sits a little toward the hoist.
  BD: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#006a4e" />
      <circle cx={10.8} cy={8} r={4.6} fill="#f42a41" />
    </>
  ),

  // The Senyera: nine bands, the even ones red.
  'ES-CT': (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#fcdd09" />
      {[1, 3, 5, 7].map(i => (
        <rect key={i} x={0} y={(i * H) / 9} width={W} height={H / 9} fill="#da121a" />
      ))}
    </>
  ),

  // The white sun as a twelve point burst, its blue ring and its disc.
  TW: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#fe0000" />
      <rect x={0} y={0} width={12} height={8} fill="#000095" />
      <path d={burst(6, 4, 3.2, 2.0, 12)} fill="#ffffff" />
      <circle cx={6} cy={4} r={1.9} fill="#000095" />
      <circle cx={6} cy={4} r={1.6} fill="#ffffff" />
    </>
  ),

  CZ: (
    <>
      {bands(['#ffffff', '#d7141a'])}
      <path d="M0,0 L12,8 L0,16 Z" fill="#11457e" />
    </>
  ),

  // The white triangle with its sun and the three stars in its corners.
  PH: (
    <>
      {bands(['#0038a8', '#ce1126'])}
      <path d="M0,0 L13.9,8 L0,16 Z" fill="#ffffff" />
      <path d={burst(4.6, 8, 2.6, 1.3, 8)} fill="#fcd116" />
      <circle cx={4.6} cy={8} r={1.3} fill="#fcd116" />
      <path d={star(1.4, 1.9, 0.9)} fill="#fcd116" />
      <path d={star(1.4, 14.1, 0.9)} fill="#fcd116" />
      <path d={star(11.4, 8, 0.9)} fill="#fcd116" />
    </>
  ),

  // Nine stripes, and the canton five of them tall with its white cross.
  GR: (
    <>
      {bands(['#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf'])}
      <rect x={0} y={0} width={(5 * H) / 9} height={(5 * H) / 9} fill="#0d5eaf" />
      <rect x={(2 * H) / 9} y={0} width={H / 9} height={(5 * H) / 9} fill="#ffffff" />
      <rect x={0} y={(2 * H) / 9} width={(5 * H) / 9} height={H / 9} fill="#ffffff" />
    </>
  ),

  // The Ashoka Chakra as a ring, a hub and eight spokes.
  IN: (
    <>
      {bands(['#ff9933', '#ffffff', '#138808'])}
      <circle cx={12} cy={8} r={2.1} fill="none" stroke="#000080" strokeWidth={0.45} />
      <path
        d="M12,5.9 L12,10.1 M9.9,8 L14.1,8 M10.5,6.5 L13.5,9.5 M13.5,6.5 L10.5,9.5"
        stroke="#000080"
        strokeWidth={0.3}
      />
    </>
  ),

  HU: bands(['#ce2939', '#ffffff', '#477050']),
  ID: bands(['#ce1126', '#ffffff']),

  // The emblem reduced to its central stroke and the two crescents around it.
  IR: (
    <>
      {bands(['#239f40', '#ffffff', '#da0000'])}
      <path
        d="M12,5.8 L12,10.2 M10.6,6.2 Q9.4,8.2 10.9,10 M13.4,6.2 Q14.6,8.2 13.1,10"
        fill="none"
        stroke="#da0000"
        strokeWidth={0.6}
      />
    </>
  ),

  // The civil flag: the arms are far below the size this renders at.
  RS: bands(['#c6363c', '#0c4076', '#ffffff']),

  // The crescent cut from a white disc by a red one, the star facing the hoist.
  TR: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#e30a17" />
      <circle cx={8} cy={8} r={4} fill="#ffffff" />
      <circle cx={9} cy={8} r={3.2} fill="#e30a17" />
      <path d={star(12.6, 8, 1.9, -Math.PI / 2)} fill="#ffffff" />
    </>
  ),

  UA: bands(['#0057b7', '#ffd700']),

  // The white hoist band, and the crescent and star on the green.
  PK: (
    <>
      <rect x={0} y={0} width={W} height={H} fill="#01411c" />
      <rect x={0} y={0} width={6} height={H} fill="#ffffff" />
      <circle cx={15} cy={8.4} r={4.4} fill="#ffffff" />
      <circle cx={16.2} cy={7.2} r={3.8} fill="#01411c" />
      <path d={star(17.6, 5.6, 1.4, 0.6)} fill="#ffffff" />
    </>
  ),
};

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
