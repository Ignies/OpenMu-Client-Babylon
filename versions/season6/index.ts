/**
 * Season 6 Episode 3 — the version this client was written against and the
 * OpenMU default (`-version:season6`, `Persistence/Initialization/VersionSeasonSix`).
 * Everything the base game did before the version seam existed lives here.
 */
import { asciiBytes, type GameVersion } from '../../src/version/contract';
import { season6Data } from './data';

/** OpenMU `SimpleModulusEncryptor.DefaultClientKey` / `SimpleModulusDecryptor.DefaultClientKey`. */
const CLIENT_TO_SERVER_KEYS = [128079, 164742, 70235, 106898, 23489, 11911, 19816, 13647, 48413, 46165, 15171, 37433];
const SERVER_TO_CLIENT_KEYS = [73326, 109989, 98843, 171058, 18035, 30340, 24701, 11141, 62004, 64409, 35374, 64599];

/** OpenMU `Network/Xor/DefaultKeys.Xor32Key` (Season 6 GMO key). */
const XOR32_KEY = new Uint8Array([
  0xab, 0x11, 0xcd, 0xfe, 0x18, 0x23, 0xc5, 0xa3, 0xca, 0x33, 0xc1, 0xcc, 0x66, 0x67, 0x21, 0xf3,
  0x32, 0x12, 0x15, 0x35, 0x29, 0xff, 0xfe, 0x1d, 0x44, 0xef, 0xcd, 0x41, 0x26, 0x3c, 0x4e, 0x4d,
]);
const XOR3_KEY = new Uint8Array([0xfc, 0xcf, 0xab]);

/**
 * Packets that share a code with no sub-code: prefer the classic S6 layout over
 * the `…075` / `…095` and the `…Extended` (open-source client >= 106.3) variants.
 */
function variantRank(name: string): number {
  if (/Extended$/.test(name)) return 2;
  if (/0(75|95)$/.test(name)) return 1;
  return 0;
}

export const gameVersion: GameVersion = {
  id: 'season6',
  label: 'Season 6 Episode 3',
  listTag: 'S6EP3',
  openMu: { season: 6, episode: 3, initializer: 'VersionSeasonSix', versionArg: 'season6' },
  clientVersionBytes: asciiBytes('10404'),
  serialBytes: asciiBytes('k1Pk2jcET48mxL3b'),
  protocol: {
    packetSet: 'season6',
    variantRank,
    encryption: {
      clientToServer: CLIENT_TO_SERVER_KEYS,
      serverToClient: SERVER_TO_CLIENT_KEYS,
      xor32Key: XOR32_KEY,
      xor3Key: XOR3_KEY,
    },
  },
  data: season6Data,
  features: {
    masterSkills: true,
    socketItems: true,
    ancientItems: true,
    harmonyJewel: true,
    darkLord: true,
    magicGladiator: true,
    summoner: true,
    rageFighter: true,
    muHelper: true,
    itemHotkeys: true,
    cashShop: true,
    events: true,
    questDialogs: true,
  },
};
