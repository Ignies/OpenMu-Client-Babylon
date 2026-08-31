import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { With } from 'miniplex';
import { Store } from '../../../store';
import { Social } from '../../../social';
import { useRenderId } from '../../../hooks';
import { onScreenPosition } from '../../../libs/screenPositionBus';
import type { Entity } from '../../../ecs/world';
import { stableKeyOf } from './stableKey';

type PartyEntity = With<Entity, 'objectNameInWorld' | 'screenPosition'>;

/** `RenderPartyHP` (ZzzInterface.cpp:8724): ten 3x2 pips in a 42x5 trough. */
const STEPS = 10;
const STEP_WIDTH = 4;
const PIP_WIDTH = 3;
const PIP_HEIGHT = 2;
const BAR_WIDTH = 38;
const BORDER = 2;
const TOTAL_WIDTH = BAR_WIDTH + BORDER * 2;
const TOTAL_HEIGHT = 5;
/** The bar sits over the head, a little above the balloon anchor. */
const OFFSET_Y = 30;

/**
 * The party bar the original draws over every party member in scope
 * (`RenderPartyHP`): a ten-step health bar fed by `PartyHealthUpdate`'s
 * tenths, with the member's name and `HP : N0%` shown while the cursor is on
 * it. The original has no hit box for the name, only for the bar; the
 * hovered readout here is the same rectangle.
 *
 * `p->index <= -1 continue`: only members the client has actually found in
 * scope get a bar, so the hero (index -3) and members on another map are
 * skipped - which is what matching by `objectNameInWorld` does below.
 */
const PartyBar = observer(
  ({ entity, step }: { entity: PartyEntity; step: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [hovered, setHovered] = useState(false);
    const hoveredRef = useRef(false);

    useEffect(() => {
      const handler = (screenPosition: { x: number; y: number }) => {
        const el = ref.current;
        if (!el) return;
        const visible =
          screenPosition.x * screenPosition.x +
            screenPosition.y * screenPosition.y >=
          0.1;
        el.style.transform = visible
          ? `translate(${Math.floor(screenPosition.x - TOTAL_WIDTH / 2)}px, ${Math.floor(
              screenPosition.y - OFFSET_Y
            )}px)`
          : 'translate(-10000px, -10000px)';

        const now = Store.world?.currentPointerTarget === entity;
        if (now !== hoveredRef.current) {
          hoveredRef.current = now;
          setHovered(now);
        }
      };
      return onScreenPosition(entity, handler);
    }, [entity]);

    const filled = Math.max(0, Math.min(STEPS, step));

    return (
      <div ref={ref} className="party-bar">
        {hovered && (
          <div className="party-bar-label">
            {entity.objectNameInWorld} HP : {filled}0%
          </div>
        )}
        <div
          className="party-bar-back"
          style={{ width: TOTAL_WIDTH, height: TOTAL_HEIGHT }}
        />
        <div
          className="party-bar-rail"
          style={{ left: BORDER, top: BORDER, width: BAR_WIDTH, height: 1 }}
        />
        {Array.from({ length: filled }, (_, k) => (
          <div
            key={k}
            className="party-bar-pip"
            style={{
              left: BORDER + k * STEP_WIDTH,
              top: BORDER,
              width: PIP_WIDTH,
              height: PIP_HEIGHT,
            }}
          />
        ))}
      </div>
    );
  }
);

export const PartyBars = observer(() => {
  const world = Store.world!;
  const { refresh } = useRenderId();
  const query = useMemo(
    () => world.with('objectNameInWorld', 'screenPosition', 'playerAnimation'),
    [world]
  );

  useEffect(() => {
    const a = query.onEntityAdded.subscribe(refresh);
    const b = query.onEntityRemoved.subscribe(refresh);
    return () => {
      a();
      b();
    };
  }, [query]);

  if (!Social.inParty) return null;

  // `Party[j].index`: the party list is matched to the objects in scope by
  // name, the hero included (the original skips it, `index == -3`).
  const heroName = Store.playerData.name;
  const steps = new Map(
    Social.partyMembers
      .filter(m => m.name !== heroName)
      .map(m => [
        m.name,
        m.healthStep >= 0
          ? m.healthStep
          : m.maximumHealth > 0
            ? Math.round((m.currentHealth / m.maximumHealth) * STEPS)
            : STEPS,
      ])
  );

  return (
    <div className="party-bars">
      {query.entities
        .filter(e => steps.has(e.objectNameInWorld))
        .map(entity => (
          <PartyBar
            key={stableKeyOf(entity)}
            entity={entity as PartyEntity}
            step={steps.get(entity.objectNameInWorld)!}
          />
        ))}
    </div>
  );
});
