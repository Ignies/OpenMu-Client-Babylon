/**
 * COPY-ME skeleton for a new game version. `cp -r versions/_template
 * versions/<id>`, then fill every `TODO`. It compiles as-is so the base game
 * can be typechecked against any version folder; it is never selected
 * (`VITE_GAME_VERSION=_template` would connect with all-zero bytes).
 *
 * Where each value comes from (OpenMU = c:\MuDev\OpenMU\src):
 * - openMu.*            Persistence/Initialization/<Version075|Version095d|VersionSeasonSix>/DataInitialization.cs
 *                       (`CreateGameClientDefinition`: Season, Episode, Language, Version, Serial)
 *                       and the initializer's `Key` string = `-version:<arg>`
 * - clientVersionBytes  the 5 ASCII bytes of `GameClientDefinition.Version` ("07500", "09504", "10404")
 * - serialBytes         `GameClientDefinition.Serial` (16 ASCII bytes)
 * - encryption          Network/PlugIns/<…>NetworkEncryptionFactoryPlugIn.cs for the version:
 *                       Season6Episode3 (S6 keys), PreSeason6 (any older client: same
 *                       SimpleModulus keys, different Xor32 key), Version075 (own Enc1/Dec2 keys)
 * - packetSet           which XML variants `packets/` was generated from 
 * - features            what that server version implements (Persistence/Initialization/<ver>/*)
 */
import { asciiBytes, type GameVersion } from '../../src/version/contract';
import { templateData } from './data';

// TODO: SimpleModulus keys. Every version 0.95+ uses these S6 defaults
// (OpenMU PreSeason6NetworkEncryptionFactoryPlugIn remarks); 0.75 has its own.
const CLIENT_TO_SERVER_KEYS = [128079, 164742, 70235, 106898, 23489, 11911, 19816, 13647, 48413, 46165, 15171, 37433];
const SERVER_TO_CLIENT_KEYS = [73326, 109989, 98843, 171058, 18035, 30340, 24701, 11141, 62004, 64409, 35374, 64599];

// TODO: Xor32 key — OpenMU Network/Xor/DefaultKeys (S6) or
// PreSeason6NetworkEncryptionFactoryPlugIn.Xor32Key (every earlier client).
const XOR32_KEY = new Uint8Array(32);
const XOR3_KEY = new Uint8Array([0xfc, 0xcf, 0xab]);

/**
 * TODO: which generated variant wins when several packets share a code.
 * Lower rank wins. For a pre-S6 set generated from the `…095` / `…075`
 * entries, prefer those; for S6 prefer the un-suffixed names.
 */
function variantRank(name: string): number {
  if (/Extended$/.test(name)) return 2;
  if (/0(75|95)$/.test(name)) return 1;
  return 0;
}

export const gameVersion: GameVersion = {
  id: '_template', // TODO: folder name
  label: 'TODO',
  // TODO: the token published server lines lead with, e.g. 'S6EP3'. Short,
  // unspaced and carrying a digit, or `serverList.ts` will not read it as one.
  listTag: 'V0.0',
  openMu: { season: 0, episode: 0, initializer: 'TODO', versionArg: 'TODO' },
  clientVersionBytes: asciiBytes('00000'), // TODO
  serialBytes: asciiBytes('0000000000000000'), // TODO
  protocol: {
    packetSet: 'season6', // TODO
    variantRank,
    encryption: {
      clientToServer: CLIENT_TO_SERVER_KEYS,
      serverToClient: SERVER_TO_CLIENT_KEYS,
      xor32Key: XOR32_KEY,
      xor3Key: XOR3_KEY,
    },
  },
  data: templateData,
  // TODO: one line per flag, with the season it appeared in as the reason.
  features: {
    masterSkills: false,
    socketItems: false,
    ancientItems: false,
    harmonyJewel: false,
    darkLord: false,
    magicGladiator: false,
    summoner: false,
    rageFighter: false,
    muHelper: false,
    itemHotkeys: false,
    cashShop: false,
    events: false,
    questDialogs: false,
  },
};
