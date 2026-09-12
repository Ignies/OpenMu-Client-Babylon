import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Store } from '../../../store';
import { isNpcOrTrapType } from '../../../ecs/systems/attackSystem';

const STEPS = 20;
const BORDER_WIDTH = 2;
const WIDTH_PER_STEP = 4;
const STEP_SEPARATOR_WIDTH = 1;
const STEPS_WIDTH = STEPS * WIDTH_PER_STEP - 2 * STEP_SEPARATOR_WIDTH;
const TOTAL_WIDTH = STEPS_WIDTH + BORDER_WIDTH * 2;
const BAR_Y = 15;
const BAR_HEIGHT = 5;
const NAME_Y = 2;

const FRAME_COLOUR = 'rgb(51, 0, 0)';
const TRACK_COLOUR = 'rgb(50, 10, 0)';
const FILL_COLOUR = 'rgb(250, 10, 0)';

/**
 * What the panel shows: the target's name, and its health in whole steps when
 * anything knows it. `showBar` is the original's `HealthStatus > 0` - the name
 * is unconditional, the bar is not (NewUINameWindow.cpp:138-144).
 */
type Target = { name: string; steps: number; showBar: boolean };

/**
 * Reads the current target into the scratch record without allocating.
 * Returns `false` when there is nothing to show.
 */
const scratch: Target = { name: '', steps: 0, showBar: false };

function readTarget(out: Target): boolean {
  const world = Store.world;
  if (!world) return false;

  const entity = world.currentPointerTarget ?? world.attackTarget;

  if (!entity || entity.localPlayer) return false;
  if (entity.dying) return false; // SelectedCharacter is cleared once Dead > 0

  // `Kind == KIND_MONSTER`: players and NPCs get the floating name balloon
  // instead. The animation rig is deliberately not the test - the Skeleton
  // line and the Doppelganger set are monsters drawn on the player rig, and
  // asking for `monsterAnimation` left every one of them nameless.
  const type = entity.npcType;
  if (type === undefined || isNpcOrTrapType(type)) return false;

  const name = entity.objectNameInWorld;
  if (!name) return false;

  const attributes = entity.attributeSystem;
  const max = attributes ? attributes.getValue('maxHealth') : 0;
  const current = attributes ? attributes.getValue('currentHealth') : 0;
  const health = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;

  out.name = name;
  out.steps = Math.trunc(health * STEPS);
  out.showBar = health > 0;
  return true;
}

/** Hoisted pip styles: the bar shows at most STEPS of them. */
const PIP_STYLES = Array.from({ length: STEPS }, (_, k) => ({
  left: BORDER_WIDTH + k * WIDTH_PER_STEP,
  top: BORDER_WIDTH,
  width: WIDTH_PER_STEP - STEP_SEPARATOR_WIDTH,
  height: 2,
  backgroundColor: FILL_COLOUR,
}));

const BAR_STYLE = { top: BAR_Y, width: TOTAL_WIDTH, height: BAR_HEIGHT };
const NAME_STYLE = { top: NAME_Y };
const FRAME_STYLE = { backgroundColor: FRAME_COLOUR };
const TRACK_STYLE = {
  left: BORDER_WIDTH,
  top: BORDER_WIDTH,
  width: STEPS_WIDTH,
  height: 1,
  backgroundColor: TRACK_COLOUR,
};

/**
 * The target's name and twenty-step health bar over the screen centre. The
 * pointer target is plain per-frame state, so it is polled once a frame —
 * into a reused record, and React only hears about it when the name or the
 * step count actually changes.
 */
export const TargetHealthBar = observer(() => {
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    let frame = 0;
    let shown: Target | null = null;

    const poll = () => {
      frame = requestAnimationFrame(poll);

      if (!readTarget(scratch)) {
        if (shown) {
          shown = null;
          setTarget(null);
        }
        return;
      }

      if (
        shown &&
        shown.name === scratch.name &&
        shown.steps === scratch.steps &&
        shown.showBar === scratch.showBar
      ) {
        return;
      }

      shown = { name: scratch.name, steps: scratch.steps, showBar: scratch.showBar };
      setTarget(shown);
    };

    frame = requestAnimationFrame(poll);

    return () => cancelAnimationFrame(frame);
  }, []);

  if (!target) return null;

  return (
    <div className="target-health-bar">
      <div className="target-name" style={NAME_STYLE}>
        {target.name}
      </div>

      {target.showBar && (
        <div className="target-bar" style={BAR_STYLE}>
          <div className="bar-shadow" />
          <div className="bar-frame" style={FRAME_STYLE} />
          <div className="bar-track" style={TRACK_STYLE} />
          {PIP_STYLES.slice(0, target.steps).map((style, k) => (
            <div key={k} className="bar-step" style={style} />
          ))}
        </div>
      )}
    </div>
  );
});
