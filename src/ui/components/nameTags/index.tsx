import './style.less';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { With } from 'miniplex';
import { Store } from '../../../store';
import { useRenderId } from '../../../hooks';
import {
  onAnyScreenPosition,
  onScreenPosition,
  onScreenPositionFrameEnd,
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
  SELF_DEFENSE_COLOUR,
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
import { devQuery } from '../../../common/devSeams';
import { onLanguageChanged } from '../../../i18n';
import {
  type TagInputs,
  type TagSlot,
  layoutTags,
  lifeBucket,
  newTagInputs,
  newTagSlot,
  syncTagInputs,
} from './tagSync';

type TagEntity = With<Entity, 'nameTag' | 'screenPosition'>;

// `?tagsync=0`: the lines rebuilt every frame, a new ref per render and the
// layout in the next frame's rAF, reading every size.
const TAG_SYNC = devQuery('tagsync') !== '0';

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
  // Self-defense outranks the PK tint for its 60s: the aggressor is marked
  // to the victim (violet in the official client; the state itself comes
  // from OpenMU's blue message, social.ts trackSelfDefense).
  const nameColour = isGm
    ? GM_NAME_TEXT
    : Social.isSelfDefenseActive(entity.objectNameInWorld)
      ? SELF_DEFENSE_COLOUR
      : pkTextColour(tag.color);
  lines.push({
    text: entity.objectNameInWorld ?? '',
    colour: nameColour,
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

// The guild lines are translated, so a language switch is an input too.
let languageEpoch = 0;
onLanguageChanged(() => languageEpoch++);

/** Every value buildLines and shouldBlink read, written into `out`. */
function readTagInputs(entity: TagEntity, out: TagInputs): void {
  const tag = entity.nameTag;
  const isHero = entity === Store.world?.playerEntity;
  const isGm = !!entity.isGm;
  const guildId = entity.guild?.id;
  const guild = guildId !== undefined ? Store.guilds.get(guildId) : undefined;

  out.name = entity.objectNameInWorld;
  out.color = tag.color;
  out.isGm = isGm;
  out.isHero = isHero;
  out.guildId = guildId;
  out.guildRole = entity.guild?.role;
  out.guild = guild;
  out.guildName = guild?.name;
  out.alliance = guild?.alliance;
  out.logo = guild?.logo;
  out.relation = isHero
    ? GuildRelation.Union
    : Social.guildRelationOf(guildId);
  out.team = Social.guildTeamOf(guildId);
  // Polled: it expires by time alone.
  out.selfDefense =
    !isGm && Social.isSelfDefenseActive(entity.objectNameInWorld);
  out.shopTitle =
    entity.netId !== undefined ? Economy.shopTitles.get(entity.netId) : undefined;
  out.text0 = tag.text[0];
  out.text1 = tag.text[1];
  out.life0 = lifeBucket(tag.life[0]);
  out.life1 = lifeBucket(tag.life[1]);
  out.blink = shouldBlink(entity);
  out.language = languageEpoch;
}

const scratchInputs = newTagInputs();

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

type Slot = TagSlot<TagEntity, HTMLDivElement>;

const BORDER_BOX: ResizeObserverOptions = { box: 'border-box' };

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
  const [inputs] = useState(newTagInputs);

  // Content can change every tick (chat fade, new lines, guild info
  // arriving); re-render only when the rendered text/colours differ.
  useEffect(() => {
    const handler = () => {
      if (!entity.nameTag) return;
      if (TAG_SYNC) {
        readTagInputs(entity, scratchInputs);
        if (!syncTagInputs(inputs, scratchInputs)) return;
      }
      const next = { lines: buildLines(entity), blink: shouldBlink(entity) };
      const key = linesKey(next.lines, next.blink);
      if (key !== keyRef.current) {
        keyRef.current = key;
        setState(next);
      }
    };
    return onScreenPosition(entity, handler);
  }, [entity]);

  // Stable, so a content change never drops and re-adds the slot: that
  // parked the balloon for a frame and moved it to the end of the order.
  const stableRef = useCallback(
    (el: HTMLDivElement | null) => register(entity, el),
    [entity, register]
  );

  return (
    <div
      className="name-tag"
      ref={TAG_SYNC ? stableRef : el => register(entity, el)}
    >
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
  // Sizes are cached off the ResizeObserver, so the per-frame layout never
  // reads layout. Null on the `?tagsync=0` path.
  const observerRef = useRef<ResizeObserver | null>(null);
  const elSlotsRef = useRef(new WeakMap<Element, Slot>());

  const register = useMemo(
    () => (entity: TagEntity, el: HTMLDivElement | null) => {
      const slots = slotsRef.current;
      const elSlots = elSlotsRef.current;
      const observer = observerRef.current;
      if (!el) {
        const gone = slots.get(entity);
        if (gone) {
          observer?.unobserve(gone.el);
          elSlots.delete(gone.el);
        }
        slots.delete(entity);
        return;
      }
      let slot = slots.get(entity);
      if (slot) {
        if (slot.el === el) return;
        observer?.unobserve(slot.el);
        elSlots.delete(slot.el);
        slot.el = el;
        slot.parked = false;
        slot.tx = slot.ty = NaN;
      } else {
        slot = newTagSlot(entity, el);
        slots.set(entity, slot);
      }
      elSlots.set(el, slot);
      observer?.observe(el, BORDER_BOX);
    },
    []
  );

  // One layout per frame, after the per-entity position events.
  useEffect(() => {
    const slots = slotsRef.current;
    const visibility = (
      entity: Entity,
      screenPosition: { x: number; y: number }
    ) => {
      const slot = slots.get(entity);
      if (!slot) return false;
      slot.visible =
        screenPosition.x * screenPosition.x +
          screenPosition.y * screenPosition.y >=
        0.1;
      return true;
    };

    if (!TAG_SYNC) {
      let scheduled = false;
      const flush = () => {
        scheduled = false;
        const root = rootRef.current;
        if (!root) return;
        layoutTags(slots.values(), root.clientWidth, root.clientHeight, true);
      };
      return onAnyScreenPosition((entity, screenPosition) => {
        if (visibility(entity, screenPosition) && !scheduled) {
          scheduled = true;
          requestAnimationFrame(flush);
        }
      });
    }

    const root = rootRef.current;
    if (!root) return;
    const elSlots = elSlotsRef.current;
    // Read once here; the observer keeps it after that.
    let viewW = root.clientWidth;
    let viewH = root.clientHeight;

    // Runs after layout and before paint, with this frame's positions still
    // in the entities, so a balloon whose size changed is right in the same
    // frame. offsetWidth/Height rather than borderBoxSize: the same integer
    // rounding the layout always used.
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (el === root) {
          viewW = root.clientWidth;
          viewH = root.clientHeight;
          continue;
        }
        const slot = elSlots.get(el);
        if (!slot) continue;
        slot.width = el.offsetWidth;
        slot.height = el.offsetHeight;
      }
      layoutTags(slots.values(), viewW, viewH);
    });
    observer.observe(root, BORDER_BOX);
    for (const slot of slots.values()) {
      observer.observe(slot.el, BORDER_BOX);
    }
    observerRef.current = observer;

    const offAny = onAnyScreenPosition(visibility);
    // Inside the ECS pass, before scene.render: the balloons land in the
    // frame their positions were projected for.
    const offEnd = onScreenPositionFrameEnd(() =>
      layoutTags(slots.values(), viewW, viewH)
    );
    return () => {
      offAny();
      offEnd();
      observer.disconnect();
      observerRef.current = null;
    };
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
