/**
 * MU 0.97d - the second version this client carries, and the proving ground
 * for the runtime version seam (Phase 7 step b).
 *
 * OpenMU coverage is partial and that shapes several values below:
 * `Persistence/Initialization/Version097d/` holds only `Items/Jewels.cs`
 * (Version095d's jewels plus the Jewel of Creation) and no
 * `DataInitialization`, so `-version:` accepts season6 / 0.75 / 0.95d only.
 * A 0.97d world is therefore seeded from `0.95d` today. The protocol side is
 * real: OpenMU carries `MinimumClient(0, 97)` view and message plug-ins, so
 * a client that logs in as ClientVersion(0, 97) is answered with a distinct
 * packet mix (see variantRank).
 */
import { asciiBytes, type GameVersion } from '../../src/version/contract';
import { v097dData } from './data';

// The packet lists ride along in the version chunk; UI does not (it reaches
// app code and loads through the registry's loadUi, after this module).
export * as packets from './packets';

/**
 * Identical to Season 6. Proven, not assumed: the reference client's own
 * Webzen `Data/Enc1.dat` / `Data/Dec2.dat` (2003) decode with OpenMU's
 * `SimpleModulusKeySerializer` to exactly these 4+4+4 values - which is what
 * `PreSeason6NetworkEncryptionFactoryPlugIn` says ("the simple modulus keys
 * were never changed").
 */
const CLIENT_TO_SERVER_KEYS = [128079, 164742, 70235, 106898, 23489, 11911, 19816, 13647, 48413, 46165, 15171, 37433];
const SERVER_TO_CLIENT_KEYS = [73326, 109989, 98843, 171058, 18035, 30340, 24701, 11141, 62004, 64409, 35374, 64599];

/** OpenMU `PreSeason6NetworkEncryptionFactoryPlugIn.Xor32Key` - every client before Season 6. */
const XOR32_KEY = new Uint8Array([
  0xe7, 0x6d, 0x3a, 0x89, 0xbc, 0xb2, 0x9f, 0x73, 0x23, 0xa8, 0xfe, 0xb6, 0x49, 0x5d, 0x39, 0x5d,
  0x8a, 0xcb, 0x63, 0x8d, 0xea, 0x7d, 0x2b, 0x5f, 0xc3, 0xb1, 0xe9, 0x83, 0x29, 0x51, 0xe8, 0x56,
]);

/** Unchanged since 0.75; the three bytes also sit verbatim in the reference client's binary. */
const XOR3_KEY = new Uint8Array([0xfc, 0xcf, 0xab]);

/**
 * Families where OpenMU still answers a 0.97d client with the 0.75 layout:
 * the newer plug-in for that view demands `MinimumClient(1, 0)` or higher, or
 * no other variant exists at all.
 */
const PREFERRED_075 = new Set([
  // NewPlayersInScopePlugIn095 sends the 075 packet for transformed players.
  'AddTransformedCharactersToScope075',
  // NpcDialogClosedPlugIn075, MaximumClient(0, 99).
  'CraftingDialogClosed075',
  // MapChangePlugIn / TeleportPlugIn are MinimumClient(1, 0).
  'MapChanged075',
  // ObjectMovedPlugIn is MinimumClient(1, 0).
  'ObjectWalked075',
  // SkillListViewPlugIn095 inherits the full-list send from the 075 plug-in.
  'SkillListUpdate075',
]);

/**
 * Which generated variant wins when several packets share a code, mirroring
 * how OpenMU's `ViewPlugInContainer` resolves plug-ins for a client at
 * ClientVersion(0, 97): the suitable plug-in with the highest
 * `MinimumClient` wins, and a `MaximumClient` below 0.97 rules one out.
 *
 * So: `…097` first, then `…095`, then the handful of `…075` layouts OpenMU
 * has nothing newer for, then the classic layout (its 075 sibling is capped
 * at `MaximumClient(0, 89)`), and never `…Extended` (client >= 106.3).
 */
function variantRank(name: string): number {
  if (/097$/.test(name)) return 0;
  if (/095$/.test(name)) return 1;
  if (PREFERRED_075.has(name)) return 2;
  if (/075$/.test(name)) return 4;
  if (/Extended$/.test(name)) return 5;

  return 3;
}

export const gameVersion: GameVersion = {
  id: 'v097d',
  label: 'MU 0.97d',
  listTag: 'V097D',
  openMu: {
    // ClientVersion(0, 97), the value OpenMU's MinimumClient(0, 97) plug-ins
    // compare against.
    season: 0,
    episode: 97,
    // OpenMU has no 0.97d DataInitialization; Version097d is an item overlay
    // on Version095d, which is what actually seeds a 0.97d world.
    initializer: 'Version095d',
    versionArg: '0.95d',
  },
  /**
   * The five bytes the reference 0.97d client puts on the wire. They are
   * stored mangled in the binary, exactly the way Webzen wrote the array in
   * source (`{'0'+1, '9'+2, '7'+3, '0'+4, '4'+5}` - the same idiom the S6
   * reference client still carries commented out in `WSclient.cpp`), so the
   * version reads "09704", in line with OpenMU's "09504" for 0.95d.
   * OpenMU seeds no `GameClientDefinition` for 0.97d: an operator has to add
   * one with these bytes, or the server falls back to its default version.
   */
  clientVersionBytes: [0x31, 0x3b, 0x3a, 0x34, 0x39],
  /**
   * The reference client's serial. OpenMU never reads the serial
   * (`LogInHandlerPlugIn` resolves the client from the version bytes alone),
   * and this build is a private server's, so it is the one real 0.97d serial
   * available rather than a Webzen original.
   */
  serialBytes: asciiBytes('St0n3agemu97d99i'),
  protocol: {
    packetSet: '0.97d',
    variantRank,
    encryption: {
      clientToServer: CLIENT_TO_SERVER_KEYS,
      serverToClient: SERVER_TO_CLIENT_KEYS,
      xor32Key: XOR32_KEY,
      xor3Key: XOR3_KEY,
    },
  },
  data: v097dData,
  features: {
    // Master level arrived in Season 3.
    masterSkills: false,
    // Sockets are Season 4.
    socketItems: false,
    // Version095d's option types are Option / Luck / Excellent only, and the
    // client ships no ItemSetOption.bmd.
    ancientItems: false,
    // Harmony and refine stones are Season 3.
    harmonyJewel: false,
    // OpenMU's ShowCharacterListPlugIn095: "0.95 doesn't support dark lord
    // (number 16) and newer classes yet".
    darkLord: false,
    // Version095d's CharacterClassInitialization creates it, and class 12
    // fits the 095 character-list layout.
    magicGladiator: true,
    // Summoner is Season 3, Rage Fighter Season 5.
    summoner: false,
    rageFighter: false,
    // MU Helper is Season 6 Episode 3.
    muHelper: false,
    // The consumable belt row and the cash shop are Season 6; the 0.97d
    // client's 97-file Interface set has neither.
    itemHotkeys: false,
    cashShop: false,
    // Devil Square: the client has World10, OpenMU Version095d runs
    // DevilSquareInitializer. Blood Castle has the map (World12) but no
    // server side yet; Chaos Castle does not exist in 0.97d.
    events: true,
    // The flag means the Season 6 quest windows (Quest_eng.bmd). 0.97d has
    // the legacy chain instead (Local/Quest.bmd, OpenMU NpcWindow.LegacyQuest).
    questDialogs: false,
  },
};
