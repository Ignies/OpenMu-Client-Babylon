import './style.less';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { With } from 'miniplex';
import { Store } from '../../../store';
import { useRenderId } from '../../../hooks';
import {
  onAnyScreenPosition,
  onScreenPosition,
} from '../../../libs/screenPositionBus';
import type { Entity } from '../../../ecs/world';
import {
  CHAT_FADE_TICKS,
  CHAT_TEXT,
  GM_BG,
  GM_CHAT_TEXT,
  GM_GUILD_TEXT,
  GM_NAME_TEXT,
  GuildRelation,
  HERO_BG,
  HERO_TEXT,
  SHOP_TITLE_PREFIX,
  chatLineBg,
  guildLine,
  pkTextColour,
  relationStyle,
  shopTitleColours,
  shopTitleSummary,
  unionLine,
} from '../../../common/nameTags';
import { Social } from '../../../social';
import { guildMarkDataUrl, isEmptyGuildMark } from '../../../common/guildMark';
import { Economy } from '../../../economy';
import { GuildMemberRoleEnum } from '../../../common/packets/ServerToClientPackets';

type TagEntity = With<Entity, 'nameTag' | 'screenPosition'>;

/** `RenderBitmap(BITMAP_GUILD, x, y, 8, 8)` (UIControls.cpp:1214) - the mark is
 * drawn 8x8 in the guild lists, and the same size in front of the name.
 * Inline, because `.app img { width: 100%; height: 100% }` (style.less) beats
 * both the attributes and any class rule that loads after it. */
const MARK_PX = 8;

type Line = {
  text: string;
  colour: string;
  bg: string;
  alpha?: number;
  bold?: boolean;
  /** The name line: the only one the safe-zone hover blink inverts. */
  isName?: true;
  /** The `[Store] ` half of a shop-title line, drawn in its own colour. */
  prefix?: { text: string; colour: string };
  /** The guild mark, drawn 8x8 in front of the text (the guild lists' `RenderBitmap(BITMAP_GUILD, x, y, 8, 8)`, UIControls.cpp:1214). */
  mark?: string;
};

/**
 * `RenderBoolean` (ZzzInterface.cpp:787): the balloon is a stack of
 * equal-width boxes - the shop title *or* the union and guild lines, the
 * name, then the chat lines, each with its own background.
 *
 * Colours follow the owner: a GM takes the dark grey box with the cyan name,
 * the hero is yellow-green on olive, a guild mate or an ally takes the union
 * colours, a rival the red ones and anyone else the GR_NONE blue-grey; the
 * name itself is then tinted by PK (`SetPlayerColor`). The chat lines below
 * are backed by `GuildColor`, so a member of the guild we are at war with
 * gets the dark red box.
 */
function buildLines(entity: TagEntity): Line[] {
  const tag = entity.nameTag;
  const hero = Store.world?.playerEntity;
  const isHero = entity === hero;
  const isGm = !!entity.isGm;

  const relation = isHero
    ? GuildRelation.Union
    : Social.guildRelationOf(entity.guild?.id);

  let box = relationStyle(relation);
  if (isGm) box = { text: GM_GUILD_TEXT, bg: GM_BG };
  if (isHero) box = { text: HERO_TEXT, bg: HERO_BG };

  const lines: Line[] = [];

  // `IsShopInViewport(c->Owner)`: a player with a stall up shows its title
  // instead of the guild lines.
  const shopTitle =
    entity.netId !== undefined ? Economy.shopTitles.get(entity.netId) : undefined;

  if (shopTitle) {
    const shop = shopTitleColours(tag.color, relation);
    lines.push({
      text: shopTitleSummary(shopTitle),
      colour: shop.title,
      bg: shop.bg,
      bold: true,
      prefix: { text: SHOP_TITLE_PREFIX, colour: shop.prefix },
    });
  } else {
    const guild = entity.guild ? Store.guilds.get(entity.guild.id) : undefined;
    if (guild?.alliance) {
      lines.push({
        text: unionLine(
          guild.alliance,
          relation,
          entity.guild!.role === GuildMemberRoleEnum.GuildMaster
        ),
        colour: box.text,
        bg: box.bg,
      });
    }
    if (guild && entity.guild) {
      lines.push({
        text: guildLine(guild.name, entity.guild.role),
        colour: box.text,
        bg: box.bg,
      });
    }
  }

  const ownMark = entity.guild ? Store.guilds.get(entity.guild.id)?.logo : undefined;
  lines.push({
    text: entity.objectNameInWorld ?? '',
    colour: isGm ? GM_NAME_TEXT : pkTextColour(tag.color),
    bg: box.bg,
    bold: isGm,
    isName: true,
    mark:
      ownMark && ownMark.length > 0 && !isEmptyGuildMark(ownMark)
        ? guildMarkDataUrl(ownMark)
        : undefined,
  });

  const chatBg = chatLineBg(Social.guildTeamOf(entity.guild?.id), isGm);
  const chatColour = isGm ? GM_CHAT_TEXT : CHAT_TEXT;
  const alphaOf = (life: number) =>
    life > 0 && life < CHAT_FADE_TICKS ? 128 / 255 : 1;

  if (tag.life[1] > 0) {
    lines.push({
      text: tag.text[1],
      colour: chatColour,
      bg: chatBg,
      alpha: alphaOf(tag.life[1]),
    });
  }
  if (tag.life[0] > 0) {
    lines.push({
      text: tag.text[0],
      colour: chatColour,
      bg: chatBg,
      alpha: alphaOf(tag.life[0]),
    });
  }

  return lines;
}

/**
 * The hover blink of `RenderBoolean` (ZzzInterface.cpp:915): while the hero
 * stands in a safe zone and the cursor is on somebody else's balloon, the
 * name swaps its text and background colours every other frame
 * (`WorldTime % 24 < 12`). We drive it from `currentPointerTarget` - the
 * original tests the balloon's own screen rect, but our tags never take the
 * pointer - and from a CSS animation rather than per-frame state, at a 480 ms
 * period instead of 24 ms so it reads as a blink and not as a strobe.
 */
function shouldBlink(entity: TagEntity): boolean {
  const world = Store.world;
  if (!world) return false;
  if (world.currentPointerTarget !== entity) return false;
  if (entity === world.playerEntity) return false;
  return !!world.playerEntity?.attributeSystem.isAboveZero('inSafeZone');
}

// Stable React keys for entities (miniplex entities carry no id).
const entityIds = new WeakMap<object, number>();
let nextEntityId = 1;
function keyOf(entity: Entity): number {
  let id = entityIds.get(entity);
  if (id === undefined) {
    id = nextEntityId++;
    entityIds.set(entity, id);
  }
  return id;
}

const linesKey = (lines: Line[], blink: boolean) =>
  `${blink ? 'B' : ''}\n` +
  lines
    .map(
      l =>
        `${l.mark ? 'M' : ''}${l.prefix?.text ?? ''}${l.text}|${l.colour}|${l.bg}|${l.alpha ?? 1}|${
          l.bold ? 'b' : ''
        }|${l.prefix?.colour ?? ''}`
    )
    .join('\n');

type Slot = {
  entity: TagEntity;
  el: HTMLDivElement;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

/**
 * `RenderBooleans` (ZzzInterface.cpp:8777): every balloon is centred on its
 * owner's anchor with its bottom edge on it, then balloons that overlap are
 * pushed above or below each other (one bubble pass), and finally clamped to
 * the screen. Positions come from CalculateScreenPositionSystem per entity;
 * the layout runs once per frame after the last of them.
 */
function layout(slots: Map<Entity, Slot>, viewW: number, viewH: number) {
  const list: Slot[] = [];
  for (const s of slots.values()) {
    if (!s.visible) {
      s.el.style.transform = 'translate(-10000px, -10000px)';
      continue;
    }
    s.width = s.el.offsetWidth;
    s.height = s.el.offsetHeight;
    s.x = s.entity.screenPosition.x - s.width / 2;
    s.y = s.entity.screenPosition.y - s.height;
    list.push(s);
  }

  for (const ci of list) {
    for (const cj of list) {
      if (ci === cj) continue;
      if (
        ci.x + ci.width > cj.x &&
        ci.x < cj.x + cj.width &&
        ci.y + ci.height > cj.y &&
        ci.y < cj.y + cj.height
      ) {
        if (ci.y < cj.y + cj.height / 2) ci.y = cj.y - ci.height;
        else ci.y = cj.y + cj.height;
      }
    }
  }

  for (const s of list) {
    if (s.x < 0) s.x = 0;
    if (s.x >= viewW - s.width) s.x = viewW - s.width;
    if (s.y < 0) s.y = 0;
    if (s.y >= viewH - s.height) s.y = viewH - s.height;
    s.el.style.transform = `translate(${Math.floor(s.x)}px, ${Math.floor(s.y)}px)`;
  }
}

const NameTag = ({
  entity,
  register,
}: {
  entity: TagEntity;
  register: (entity: TagEntity, el: HTMLDivElement | null) => void;
}) => {
  const [state, setState] = useState<{ lines: Line[]; blink: boolean }>(() => ({
    lines: buildLines(entity),
    blink: shouldBlink(entity),
  }));
  const keyRef = useRef(linesKey(state.lines, state.blink));

  // Content can change every tick (chat fade, new lines, guild info
  // arriving); re-render only when the rendered text/colours differ.
  useEffect(() => {
    const handler = () => {
      if (!entity.nameTag) return;
      const next = { lines: buildLines(entity), blink: shouldBlink(entity) };
      const key = linesKey(next.lines, next.blink);
      if (key !== keyRef.current) {
        keyRef.current = key;
        setState(next);
      }
    };
    return onScreenPosition(entity, handler);
  }, [entity]);

  return (
    <div className="name-tag" ref={el => register(entity, el)}>
      {state.lines.map((line, i) => (
        <div
          key={i}
          className={`line${line.bold ? ' bold' : ''}${
            state.blink && line.isName ? ' blink' : ''
          }`}
          style={{
            color: line.colour,
            backgroundColor: line.bg,
            opacity: line.alpha ?? 1,
            // The blink swaps text and background; CSS reads them back off
            // these variables so the animation needs no second render.
            ['--tag-text' as string]: line.colour,
            ['--tag-bg' as string]: line.bg,
          }}
        >
          {line.mark && (
            <img
              className="name-tag-mark"
              src={line.mark}
              alt=""
              width={MARK_PX}
              height={MARK_PX}
              style={{ width: MARK_PX, height: MARK_PX }}
            />
          )}
          {line.prefix && (
            <span style={{ color: line.prefix.colour }}>{line.prefix.text}</span>
          )}
          {line.text}
        </div>
      ))}
    </div>
  );
};

export const NameTags = () => {
  const world = Store.world!;
  const { refresh } = useRenderId();
  const query = useMemo(
    () => world.with('nameTag', 'screenPosition'),
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

  const rootRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef(new Map<Entity, Slot>());

  const register = useMemo(
    () => (entity: TagEntity, el: HTMLDivElement | null) => {
      const slots = slotsRef.current;
      if (!el) {
        slots.delete(entity);
        return;
      }
      const slot = slots.get(entity);
      if (slot) slot.el = el;
      else
        slots.set(entity, {
          entity,
          el,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          visible: false,
        });
    },
    []
  );

  // One layout per frame, after the per-entity position events.
  useEffect(() => {
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      const root = rootRef.current;
      if (!root) return;
      layout(slotsRef.current, root.clientWidth, root.clientHeight);
    };
    const handler = (
      entity: Entity,
      screenPosition: { x: number; y: number }
    ) => {
      const slot = slotsRef.current.get(entity);
      if (!slot) return;
      slot.visible =
        screenPosition.x * screenPosition.x +
          screenPosition.y * screenPosition.y >=
        0.1;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    };
    return onAnyScreenPosition(handler);
  }, []);

  return (
    <div className="name-tags" ref={rootRef}>
      {query.entities.map(entity => (
        <NameTag
          key={keyOf(entity)}
          entity={entity as TagEntity}
          register={register}
        />
      ))}
    </div>
  );
};
