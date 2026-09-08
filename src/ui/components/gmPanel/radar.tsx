import { observer } from 'mobx-react-lite';
import { RADAR_RANGE, type Nearby, type WorldView } from '../../../gmWorld';

/**
 * Everything in scope, drawn around you.
 *
 * SVG rather than canvas: there are tens of marks, not thousands, and an SVG
 * scales with the panel and keeps each mark a real element - so a mark can be
 * clicked, and a screen reader gets a title instead of a picture.
 *
 * North is up and X runs right, matching the coordinates the commands take, so
 * a point on this reads straight into `/teleport x y`. The original's minimap
 * is rotated; this one is not, on purpose - it is an instrument, not scenery.
 */

const SIZE = 240;
const CENTRE = SIZE / 2;

/** Tiles per pixel at the default range. */
const scaleFor = (range: number) => CENTRE / range;

const COLOUR: Record<Nearby['kind'], string> = {
  player: '#e8c877',
  monster: '#d8756a',
  npc: '#7f9bb5',
};

export const Radar = observer(function Radar({
  view,
  selected,
  onPick,
}: {
  view: WorldView;
  selected: number | null;
  onPick: (entry: Nearby) => void;
}) {
  const hero = view.hero;
  if (!hero) return null;

  // Grow the range rather than dropping what falls outside it: scope is
  // usually well inside the default, and a monster that vanishes off the edge
  // is worse than one drawn small.
  const furthest = view.nearby.reduce((max, entry) => Math.max(max, entry.distance), 0);
  const range = Math.max(RADAR_RANGE, Math.ceil(furthest / 4) * 4);
  const scale = scaleFor(range);

  const rings = [range / 3, (range * 2) / 3, range];

  return (
    <svg
      className="gm-radar"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`${view.nearby.length} objects in scope`}
    >
      <rect x={0} y={0} width={SIZE} height={SIZE} className="gm-radar-bg" rx={4} />

      {rings.map(ring => (
        <circle
          key={ring}
          cx={CENTRE}
          cy={CENTRE}
          r={ring * scale}
          className="gm-radar-ring"
        />
      ))}
      <line x1={CENTRE} y1={4} x2={CENTRE} y2={SIZE - 4} className="gm-radar-axis" />
      <line x1={4} y1={CENTRE} x2={SIZE - 4} y2={CENTRE} className="gm-radar-axis" />

      {view.nearby.map(entry => {
        // MU's Y grows south; SVG's grows down, so it maps straight across.
        const cx = CENTRE + (entry.x - hero.x) * scale;
        const cy = CENTRE + (entry.y - hero.y) * scale;

        // Anything beyond the computed range would be an object that appeared
        // between the range being chosen and this loop; clamp to the edge
        // rather than drawing outside the box.
        const clampedX = Math.min(Math.max(cx, 3), SIZE - 3);
        const clampedY = Math.min(Math.max(cy, 3), SIZE - 3);

        const isSelected = selected === entry.netId;
        const isTarget = view.targetNetId === entry.netId;

        return (
          <g
            key={entry.netId}
            className={`gm-radar-mark${isSelected ? ' is-selected' : ''}`}
            onClick={() => onPick(entry)}
          >
            <title>{`${entry.name} (${entry.x}, ${entry.y})`}</title>
            {isSelected || isTarget ? (
              <circle cx={clampedX} cy={clampedY} r={7} className="gm-radar-halo" />
            ) : null}
            <circle
              cx={clampedX}
              cy={clampedY}
              r={entry.kind === 'player' ? 4 : 3}
              fill={COLOUR[entry.kind]}
              opacity={entry.dying ? 0.35 : 1}
            />
            {entry.isGm ? (
              <circle cx={clampedX} cy={clampedY} r={6} className="gm-radar-gm" />
            ) : null}
          </g>
        );
      })}

      <g className="gm-radar-hero">
        <circle cx={CENTRE} cy={CENTRE} r={4} />
        <circle cx={CENTRE} cy={CENTRE} r={8} className="gm-radar-hero-ring" />
      </g>

      <text x={6} y={SIZE - 6} className="gm-radar-scale">
        {range} tiles
      </text>
    </svg>
  );
});
