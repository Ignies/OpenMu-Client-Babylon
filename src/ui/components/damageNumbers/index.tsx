import './style.less';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { With } from 'miniplex';
import type { Entity } from '../../../ecs/world';
import type { Events } from '../../../libs/eventBus/events';
import type { MuSprite } from '../../../libs/mu/sprites';
import { useEventBus } from '../../../hooks/useEventBus';
import { usePositionOnScreen } from '../../../hooks';
import { useMuSprite } from '../muSprite';

const FONT_FILE = 'FontTest.OZT';

const ATLAS_WIDTH = 256;
const ATLAS_HEIGHT = 32;

const DIGIT_CELL = 16;

const MISS_SRC = { x: 0, y: 17, width: 32, height: 15 };
const MISS_SIZE = { width: 45, height: 20 };

const SPAWN_HEIGHT = 140;
const START_GRAVITY = 10;
const GRAVITY_DECAY = 0.3;
const SCALE_DECAY = 5;
const MIN_SCALE = 15;
const ALPHA_FROM_GRAVITY = 0.4;

const REFERENCE_FPS = 25;

const NORMAL_SCALE = 15;
const BIG_SCALE = 50;

const MAX_POINTS = 100;

const MU_SCALE = 100;

const PX_PER_MU = DIGIT_CELL / MIN_SCALE;

const DIGIT_ADVANCE = DIGIT_CELL * Math.SQRT1_2;

type Rgb = readonly [number, number, number];

const SHIELD_COLOUR: Rgb = [0.8, 1, 0];
const MISS_SELF_COLOUR: Rgb = [1, 1, 1];
const MISS_OTHER_COLOUR: Rgb = [0.5, 0.5, 0.5];

function shade(colour: Rgb, amount: number): Rgb {
  return [
    Math.max(0, colour[0] - amount),
    Math.max(0, colour[1] - amount),
    Math.max(0, colour[2] - amount),
  ];
}

function toCss(colour: Rgb): string {
  const [r, g, b] = colour;
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255
  )})`;
}

function lookFor(kind: number, onSelf: boolean): { colour: Rgb; scale: number } {
  switch (kind) {
    case 0:
      return {
        colour: onSelf ? [1, 0, 0] : [1, 0.6, 0],
        scale: NORMAL_SCALE,
      };
    case 1:
      return { colour: [0, 1, 1], scale: BIG_SCALE };
    case 2:
      return { colour: [0, 1, 0.6], scale: BIG_SCALE };
    case 3:
      return { colour: [0, 0.6, 1], scale: BIG_SCALE };
    case 4:
      return { colour: [1, 0, 1], scale: NORMAL_SCALE };
    case 5:
      return { colour: [0, 1, 0], scale: NORMAL_SCALE };
    case 6:
      return { colour: [0.7, 0.4, 1], scale: NORMAL_SCALE };
    default:
      return { colour: [1, 1, 1], scale: NORMAL_SCALE };
  }
}

const MISS = -1;

type Spawn = {
  value: number;
  colour: Rgb;
  scale: number;
  height: number;
};

function spawnsFor(event: Events['objectDamaged'], onSelf: boolean): Spawn[] {
  const { healthDamage, shieldDamage, kind, isDouble, isTriple } = event;
  const spawns: Spawn[] = [];

  if (healthDamage === 0) {
    spawns.push({
      value: MISS,
      colour: onSelf ? MISS_SELF_COLOUR : MISS_OTHER_COLOUR,
      scale: NORMAL_SCALE,
      height: 0,
    });
  } else {
    const look = lookFor(kind, onSelf);
    const colour = look.colour;
    const scale = isTriple ? BIG_SCALE : look.scale;

    if (isTriple) {
      spawns.push({ value: healthDamage, colour: shade(colour, 0.4), scale, height: 0 });
      spawns.push({ value: healthDamage, colour: shade(colour, 0.2), scale: scale + 5, height: 10 });
      spawns.push({ value: healthDamage, colour, scale: scale + 10, height: 20 });
    } else if (isDouble) {
      spawns.push({ value: healthDamage, colour: shade(colour, 0.4), scale, height: 0 });
      spawns.push({ value: healthDamage, colour: shade(colour, 0.2), scale: scale + 5, height: 10 });
    }

    spawns.push({ value: healthDamage, colour, scale, height: 0 });
  }

  if (shieldDamage > 0) {
    spawns.push({
      value: shieldDamage,
      colour: SHIELD_COLOUR,
      scale: NORMAL_SCALE,
      height: 25,
    });
  }

  return spawns;
}

type FloatingNumber = Spawn & {
  id: number;
  entity: With<Entity, 'transform' | 'screenPosition'>;
};

export const DamageNumbers = () => {
  const [numbers, setNumbers] = useState<FloatingNumber[]>([]);
  const nextId = useRef(0);

  const font = useMuSprite(FONT_FILE);

  useEventBus('objectDamaged', event => {
    const onSelf = event.entity.localPlayer === true;

    const spawned = spawnsFor(event, onSelf).map(spawn => ({
      ...spawn,
      id: nextId.current++,
      entity: event.entity,
    }));

    // The newest numbers win when the cap is hit (`slice(0, …)` kept the
    // oldest and dropped every fresh hit in a crowded fight).
    setNumbers(previous =>
      [...previous, ...spawned].slice(-MAX_POINTS)
    );
  });

  // Expiries are batched: a burst of numbers spawned together also ends
  // together, and one `setState` per frame beats one per number.
  const expired = useRef(new Set<number>());
  const flush = useRef(0);
  useEffect(() => () => cancelAnimationFrame(flush.current), []);
  const remove = useCallback((id: number) => {
    expired.current.add(id);
    if (flush.current) return;
    flush.current = requestAnimationFrame(() => {
      flush.current = 0;
      const gone = expired.current;
      expired.current = new Set();
      setNumbers(previous => previous.filter(number => !gone.has(number.id)));
    });
  }, []);

  return (
    <div className="damage-numbers">
      {numbers.map(number => (
        <FloatingDamageNumber
          key={number.id}
          number={number}
          font={font}
          onDone={remove}
        />
      ))}
    </div>
  );
};

const FloatingDamageNumber = ({
  number,
  font,
  onDone,
}: {
  number: FloatingNumber;
  font: MuSprite | null;
  onDone: (id: number) => void;
}) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const glyphsRef = useRef<HTMLDivElement>(null);

  usePositionOnScreen(number.entity, anchorRef);

  useEffect(() => {
    let gravity = START_GRAVITY;
    let scale = number.scale;
    let height = SPAWN_HEIGHT + number.height;
    let last = performance.now();
    let frame = 0;

    const anchorHeight = number.entity.screenPosition.worldOffsetZ * MU_SCALE;

    const step = (now: number) => {
      const factor = Math.min(((now - last) / 1000) * REFERENCE_FPS, 1);
      last = now;

      height += gravity * factor;
      gravity -= GRAVITY_DECAY * factor;
      scale = Math.max(MIN_SCALE, scale - SCALE_DECAY * factor);

      if (gravity <= 0) {
        onDone(number.id);
        return;
      }

      const element = glyphsRef.current;

      if (element) {
        const offsetY = (anchorHeight - height) * PX_PER_MU;
        const zoom = number.value === MISS ? 1 : scale / MIN_SCALE;

        element.style.transform = `translate(-50%, ${offsetY.toFixed(
          1
        )}px) scale(${zoom.toFixed(3)})`;
        element.style.opacity = Math.min(
          1,
          gravity * ALPHA_FROM_GRAVITY
        ).toFixed(3);
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [number, onDone]);

  const colour = toCss(number.colour);

  return (
    <div ref={anchorRef} className="damage-number">
      <div ref={glyphsRef} className="glyphs">
        {font &&
          (number.value === MISS ? (
            <MissGlyph font={font} colour={colour} />
          ) : (
            <DigitGlyphs font={font} colour={colour} value={number.value} />
          ))}
      </div>
    </div>
  );
};

function maskStyle(font: MuSprite, x: number, y: number) {
  const image = `url(${font.url})`;
  const size = `${ATLAS_WIDTH}px ${ATLAS_HEIGHT}px`;
  const position = `${-x}px ${-y}px`;

  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: size,
    WebkitMaskSize: size,
    maskPosition: position,
    WebkitMaskPosition: position,
  } as const;
}

const DigitGlyphs = ({
  font,
  colour,
  value,
}: {
  font: MuSprite;
  colour: string;
  value: number;
}) => {
  const digits = String(value);

  return (
    <div
      className="digits"
      style={{
        width: (digits.length - 1) * DIGIT_ADVANCE + DIGIT_CELL,
        height: DIGIT_CELL,
      }}
    >
      {[...digits].map((digit, i) => (
        <span
          key={i}
          className="digit"
          style={{
            left: i * DIGIT_ADVANCE,
            width: DIGIT_CELL,
            height: DIGIT_CELL,
            backgroundColor: colour,
            ...maskStyle(font, Number(digit) * DIGIT_CELL, 0),
          }}
        />
      ))}
    </div>
  );
};

const MissGlyph = ({ font, colour }: { font: MuSprite; colour: string }) => {
  const zoomX = (MISS_SIZE.width * PX_PER_MU) / MISS_SRC.width;
  const zoomY = (MISS_SIZE.height * PX_PER_MU) / MISS_SRC.height;
  const image = `url(${font.url})`;
  const size = `${ATLAS_WIDTH * zoomX}px ${ATLAS_HEIGHT * zoomY}px`;
  const position = `${-MISS_SRC.x * zoomX}px ${-MISS_SRC.y * zoomY}px`;

  const width = MISS_SIZE.width * PX_PER_MU;
  const height = MISS_SIZE.height * PX_PER_MU;

  return (
    <div className="digits" style={{ width, height }}>
      <span
        className="digit"
        style={{
          left: 0,
          width,
          height,
          backgroundColor: colour,
          maskImage: image,
          WebkitMaskImage: image,
          maskSize: size,
          WebkitMaskSize: size,
          maskPosition: position,
          WebkitMaskPosition: position,
        }}
      />
    </div>
  );
};
