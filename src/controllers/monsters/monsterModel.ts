/** A monster body's five voice slots: [0..1] idle / walk, [2..3] attack / hit, [4] death; null = silent. */
export type MonsterVoiceSlots = readonly [string | null, string | null, string | null, string | null, string | null];

/** The special deaths (`SetPlayerDie`, ZzzCharacter.cpp:1372-1420; `CreateBlood` for ice). */
export type MonsterShatter = 'bone' | 'stone' | 'ice' | 'gate' | 'crystal';

/**
 * One monster body (`MODEL_MONSTER01 + type`, `OpenMonsterModel` in ZzzOpenData.cpp): what it sounds
 * like and how fast its clips play. Several monster types share a body, and these follow the body.
 */
export type MonsterModelDef = {
  type: number;
  name: string;
  voices?: MonsterVoiceSlots;
  /** The next five waves, played instead for monster types created with `SubType = 9`. */
  subType9Voices?: MonsterVoiceSlots;
  /** Clip speed by `MonsterActionType`, over the shared defaults. */
  clipSpeeds?: Readonly<Partial<Record<number, number>>>;
  /** Skills whose cast sound a monster in this body never plays (`monsterCastQuiet`). */
  quietCasts?: readonly number[];
  /** What the body breaks into instead of playing Die (the fx controller's `shatterDeathFor`). */
  shatter?: MonsterShatter;
  /** Multiplier on Stop1..Shock (the original's per-body speed scale; Die is never scaled). */
  speedScale?: number;
  /** The Classic shadow: `'alive'` until the body dies (`m_bRenderShadow = false` in its Die branch), `'never'` none. */
  classicShadow?: 'alive' | 'never';
  /**
   * `PushingCharacter`'s own rule for this body when the server moves it: the share of the way a tick
   * covers (0.2 for every other body), a stop (`SetPlayerStop`) on the tile (ZzzCharacter.cpp:3146-3150,
   * :3185), and `walks`: its walk is such a slide too (`ReceiveMoveCharacter`, WSclient.cpp:2093-2101).
   */
  slide?: { readonly speed: number; readonly stops: true; readonly walks?: true };
};

/** A monster body file's default export. */
export function defineMonsterModel(model: MonsterModelDef): MonsterModelDef {
  return model;
}

export class MonsterModelRegistry {
  private readonly byType = new Map<number, MonsterModelDef>();

  add(models: Iterable<MonsterModelDef>): void {
    for (const m of models) this.byType.set(m.type, m);
  }

  get(type: number): MonsterModelDef | null {
    return this.byType.get(type) ?? null;
  }

  all(): MonsterModelDef[] {
    return [...this.byType.values()].sort((a, b) => a.type - b.type);
  }
}
