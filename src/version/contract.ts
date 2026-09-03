/**
 * THE CONTRACT for a game version - the one object the base game (`src/`)
 * reads to learn which MU / OpenMU version it is talking to. One folder per
 * version under `versions/<id>/` exports it as `gameVersion` from `index.ts`,
 * listed in `versions/registry.ts` and loaded at runtime by the bootstrap
 * (src/main.tsx -> src/version/index.ts `loadGameVersion`).
 *
 * Base code never says `if (version === ...)`: it reads `features.*` and the
 * protocol / data fields below. Everything a version can differ in must be a
 * field here, or a module under the version folder (`packets/`, `tables/`,
 * `data/`, `ui/`) that the base reaches through the resolved handles in
 * `src/version/index.ts`.
 */

/** Folder name under `versions/`; the registry entry's `id`. */
export type GameVersionId = string;

/** The 12-number list `SimpleModulusKeys.Create*Keys` takes: 4 modulus, 4 crypt, 4 xor. */
export type SimpleModulusKeyList = readonly number[];

export interface VersionEncryption {
  /**
   * Client → server SimpleModulus (C3/C4 packets). OpenMU: the "default client
   * key" of `PipelinedSimpleModulusEncryptor` — unchanged from 0.95 to S6;
   * only the 0.75 plug-in ships its own Enc1/Dec2 keys.
   */
  readonly clientToServer: SimpleModulusKeyList;
  /** Server → client SimpleModulus (the decryptor's "default client key"). */
  readonly serverToClient: SimpleModulusKeyList;
  /**
   * The 32-byte Xor32 key applied to every client → server packet after
   * SimpleModulus. Webzen rotated it during Season 6; OpenMU keeps one key
   * for S6 (`Network/Xor/DefaultKeys`) and one for every earlier client
   * (`PreSeason6NetworkEncryptionFactoryPlugIn`).
   */
  readonly xor32Key: Uint8Array;
  /** The 3-byte key the login name / password are xor'ed with (`Xor3Byte`). */
  readonly xor3Key: Uint8Array;
}

export interface VersionProtocol {
  /**
   * Which OpenMU packet XML flavour `versions/<id>/packets/` was generated
   * from. `season6` = the un-suffixed definitions; older sets use the
   * `…075` / `…095` variants OpenMU keeps beside them.
   */
  readonly packetSet: 'season6' | '0.95' | '0.75';
  /**
   * Name-suffix rank the dispatcher should prefer when several generated
   * packets share a code (`AddCharactersToScope` / `…075` / `…095` /
   * `…Extended`): lower wins. `createSocket.ts` owns the sort today (Lane E);
   * this is the value it should read.
   */
  variantRank(packetName: string): number;
  readonly encryption: VersionEncryption;
}

export interface VersionData {
  /** Base URL of the original `Data/` tree (sprites, Local/*.bmd, gate.bmd). Trailing slash. */
  readonly folder: string;
  /** Base URL of the converted models / terrain / sounds (`public/game-assets`). Trailing slash. */
  readonly assets: string;
  /** `Data/Local/<locale>/` subfolder used for language tables. */
  readonly locale: string;
}

/**
 * Feature flags: what the *server* of this version knows about. Checked by
 * the consumer that would render or send it, never by an accumulator
 *.
 */
export interface VersionFeatures {
  /** Master level + master skill tree (S3+). */
  readonly masterSkills: boolean;
  /** Socket items / seeds & spheres (S4+). */
  readonly socketItems: boolean;
  /** Ancient sets (0.97+). */
  readonly ancientItems: boolean;
  /** Harmony jewel + refine stones (S3+). */
  readonly harmonyJewel: boolean;
  /** Dark Lord / Magic Gladiator character classes (0.97 / 0.99+). */
  readonly darkLord: boolean;
  readonly magicGladiator: boolean;
  /** Summoner / Rage Fighter (S3 / S5+). */
  readonly summoner: boolean;
  readonly rageFighter: boolean;
  /** MU Helper (S6 E3, OpenMU `MuHelper`). */
  readonly muHelper: boolean;
  /** Item hotkeys / consumable belt row (S6). */
  readonly itemHotkeys: boolean;
  /** Cash shop / in-game shop banner (S6). */
  readonly cashShop: boolean;
  /** Blood Castle / Devil Square / Chaos Castle event windows. */
  readonly events: boolean;
  /** Quest system with the S6 NPC dialogue windows (`Quest_eng.bmd`). */
  readonly questDialogs: boolean;
}

export interface GameVersion {
  readonly id: GameVersionId;
  /** Human label for the title bar / login page. */
  readonly label: string;
  /**
   * The token a published server line puts first to say which client it wants
   * (`[S6EP3:Name:…](…)`) - see `common/serverList.ts`. A field rather than
   * something derived from `openMu`, because a version that is not a season
   * and an episode still has to name itself in one short word.
   *
   * This is what tells the picker a world is playable: a world asking for a
   * tag no registry entry carries is a world this client cannot enter. Must
   * match the `versions/registry.ts` entry's `listTag`.
   */
  readonly listTag: string;
  /** How OpenMU identifies this client (`GameClientDefinition`). */
  readonly openMu: {
    readonly season: number;
    readonly episode: number;
    /** `Persistence/Initialization/<folder>` that seeds this version. */
    readonly initializer: string;
    /** `-version:<arg>` for `MUnique.OpenMU.Startup`. */
    readonly versionArg: string;
  };
  /** 5 ASCII bytes sent in `LoginShortPassword.ClientVersion` (e.g. "10404"). */
  readonly clientVersionBytes: readonly number[];
  /** 16 ASCII bytes sent in `LoginShortPassword.ClientSerial`. */
  readonly serialBytes: readonly number[];
  readonly protocol: VersionProtocol;
  readonly data: VersionData;
  readonly features: VersionFeatures;
}

export function asciiBytes(s: string): number[] {
  return Array.from(s, ch => ch.charCodeAt(0));
}
