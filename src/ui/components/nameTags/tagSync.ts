// The per-frame half of the name tags, kept store-free so it can be tested.
import { CHAT_FADE_TICKS } from '../../../common/nameTags';

export type TagAnchor = { screenPosition: { x: number; y: number } };

export type TagElement = {
  style: { transform: string };
  offsetWidth: number;
  offsetHeight: number;
};

export type TagSlot<
  E extends TagAnchor = TagAnchor,
  El extends TagElement = TagElement
> = {
  entity: E;
  el: El;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  /** The floored translate last written to `el`. */
  tx: number;
  ty: number;
  /** `el` holds the off-screen transform. */
  parked: boolean;
};

export function newTagSlot<E extends TagAnchor, El extends TagElement>(
  entity: E,
  el: El
): TagSlot<E, El> {
  return {
    entity,
    el,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
    tx: NaN,
    ty: NaN,
    parked: false,
  };
}

export const PARKED_TRANSFORM = 'translate(-10000px, -10000px)';

const visibleSlots: TagSlot[] = [];

/**
 * `RenderBooleans` (ZzzInterface.cpp:8777): every balloon is centred on its
 * owner's anchor with its bottom edge on it, then balloons that overlap are
 * pushed above or below each other (one bubble pass, in slot order), and
 * finally clamped to the screen.
 *
 * Sizes come from the slots and a transform is written only when it changes.
 * `legacy` is the `?tagsync=0` path: read every size and write every
 * transform, each pass.
 */
export function layoutTags(
  slots: Iterable<TagSlot>,
  viewW: number,
  viewH: number,
  legacy = false
): void {
  const list = visibleSlots;
  list.length = 0;

  for (const s of slots) {
    if (!s.visible) {
      if (legacy || !s.parked) {
        s.el.style.transform = PARKED_TRANSFORM;
        s.parked = true;
      }
      continue;
    }
    if (legacy) {
      s.width = s.el.offsetWidth;
      s.height = s.el.offsetHeight;
    }
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
    const tx = Math.floor(s.x);
    const ty = Math.floor(s.y);
    if (legacy || s.parked || tx !== s.tx || ty !== s.ty) {
      s.el.style.transform = `translate(${tx}px, ${ty}px)`;
      s.tx = tx;
      s.ty = ty;
      s.parked = false;
    }
  }

  list.length = 0;
}

/** A chat line as the balloon draws it: gone, faded (128/255) or full. */
export function lifeBucket(life: number): 0 | 1 | 2 {
  if (!(life > 0)) return 0;
  return life < CHAT_FADE_TICKS ? 1 : 2;
}

/**
 * Every value the balloon's lines and blink are built from. The per-frame
 * check compares these instead of rebuilding the lines.
 */
export type TagInputs = {
  name: string | undefined;
  color: number;
  isGm: boolean;
  isHero: boolean;
  guildId: number | undefined;
  guildRole: number | undefined;
  guild: object | undefined;
  guildName: string | undefined;
  alliance: string | undefined;
  logo: readonly number[] | undefined;
  relation: number;
  team: number;
  selfDefense: boolean;
  shopTitle: string | undefined;
  text0: string;
  text1: string;
  life0: number;
  life1: number;
  blink: boolean;
  language: number;
};

/** Never equal to a read (`life0` is a bucket), so the first check rebuilds. */
export function newTagInputs(): TagInputs {
  return {
    name: undefined,
    color: 0,
    isGm: false,
    isHero: false,
    guildId: undefined,
    guildRole: undefined,
    guild: undefined,
    guildName: undefined,
    alliance: undefined,
    logo: undefined,
    relation: 0,
    team: 0,
    selfDefense: false,
    shopTitle: undefined,
    text0: '',
    text1: '',
    life0: -1,
    life1: 0,
    blink: false,
    language: 0,
  };
}

export const TAG_INPUT_KEYS = Object.keys(
  newTagInputs()
) as (keyof TagInputs)[];

/** Copies `next` into `prev` and returns true when any field differs. */
export function syncTagInputs(prev: TagInputs, next: TagInputs): boolean {
  for (let i = 0; i < TAG_INPUT_KEYS.length; i++) {
    const key = TAG_INPUT_KEYS[i];
    if (prev[key] !== next[key]) {
      Object.assign(prev, next);
      return true;
    }
  }
  return false;
}
