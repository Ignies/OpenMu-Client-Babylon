export const NPC_MODEL_TABLE: Readonly<
  Record<number, readonly [file: string, scale: number]>
> = {
  // Kalima gate props (ZzzCharacter.cpp:13046-13064): all seven gates share
  // `MODEL_WARCRAFT` (Data\Skill\HellGate) and stand on animation frame 10.
  152: ['/Skill/HellGate',  1.0],
  153: ['/Skill/HellGate',  1.0],
  154: ['/Skill/HellGate',  1.0],
  155: ['/Skill/HellGate',  1.0],
  156: ['/Skill/HellGate',  1.0],
  157: ['/Skill/HellGate',  1.0],
  158: ['/Skill/HellGate',  1.0],
  // Soccer ball (ZzzCharacter.cpp:14015-14021). Its `BlendMesh = 2` — the
  // additive panel — is not modelled.
  200: ['/Skill/Ball01',  1.8],
  // Crywolf statue (ZzzCharacter.cpp:14260). The five altars (205-209) spawn
  // invisible and are routed to HiddenNpc in modelFactoryPerId.
  204: ['/Object35/Object82',  1.0],
  // Castle Siege props and staff (GMBattleCastle.cpp:1286-1381). 220 (the
  // guard) is a monster model and lives in MONSTER_MODEL_TABLE.
  215: ['NpcBarrier', 1.52],
  216: ['NpcCrown',  1.0],
  217: ['NpcCheckFloor',  1.0],
  218: ['NpcCheckFloor',  1.0],
  219: ['NpcGateSwitch',  1.1],
  221: ['Model_Npc_Catapult_Att',  0.8],
  222: ['Model_Npc_Catapult_Def',  0.8],
  223: ['NpcSenatus',  1.1],
  224: ['NpcClerk',  1.0],
  226: ['Breeder',  1.0],
  // 230/248/250 (Alex/Martin/Harold) and 253 (Amy) are NOT here: Man01/Girl01
  // are rig-only GLBs (0 meshes) — those NPCs compose body parts in
  // npcs/man.ts and npcs/girl.ts .
  231: ['DeviasTrader01',  1.0],
  232: ['BloodCastle01',  1.0],
  233: ['BloodCastle02',  1.0],
  235: ['Sevina01',  1.0],
  237: ['DevilNpc01',  1.0],
  238: ['MixNpc01',  1.0],
  239: ['Tournament01',  1.0],
  240: ['Storage01',  1.0],
  241: ['Master01',  1.0],
  242: ['ElfWizard01',  1.0],
  243: ['ElfMerchant01',  1.0],
  244: ['SnowMerchant01',  1.0],
  245: ['SnowWizard01',  1.0],
  246: ['SnowSmith01',  1.0],
  251: ['Smith01', 0.95],
  254: ['Wizard01',  1.0],
  255: ['Female01',  1.0],
  256: ['npc_mulyak',  1.0],
  259: ['kalnpc',  1.0],
  // Kanturu 2nd gateway machine (GM_Kanturu_2nd.cpp:106-118).
  367: ['to3gate', 4.76],
  368: ['Elpis',  2.5],
  369: ['os',  1.0],
  370: ['je',  1.0],
  // Blood Castle suppliers (ZzzCharacter.cpp:14369-14389).
  376: ['npcpharmercy1',  1.0],
  377: ['npcpharmercy2',  1.0],
  379: ['Wedding',  1.1],
  // Cursed Temple (w_CursedTemple.cpp:164-215).
  380: ['songsom',  1.0],
  381: ['allied',  1.2],
  382: ['illusion',  1.2],
  383: ['songko',  1.8],
  384: ['songk2',  1.5],
  385: ['mirazu', 0.95],
  406: ['devin',  1.0],
  407: ['WereQuarrel',  1.9],
  408: ['cry2doorhead',  1.2],
  // Elbeland shop NPCs (GMNewTown.cpp:863-885). Previously mis-numbered as
  // 258/212/400, which left the real types unmapped — they rendered as the
  // Bull Fighter fallback.
  415: ['silvia',  1.0],
  416: ['rhea',  1.0],
  417: ['marce', 1.05],
  // S6 cherry-blossom event NPCs (ZzzCharacter.cpp:14428-14447, models from
  // ZzzOpenData.cpp:2093-2098). The spirit's original also floats +170
  // units above the terrain; the tree draws no shadow. Not modelled here.
  450: ['cherryblossom/cherry_blossom', 0.65],
  451: ['cherryblossom/sakuratree',  1.0],
  452: ['goblinmaster',  1.1],
  453: ['seedgoblin',  0.9],
  // Xmas 2008 transformed snowman (ZzzCharacter.cpp:14496-14501).
  477: ['/Item/xmas/snowman',  1.3],
  478: ['npc_mulyak',  1.0],
  479: ['titus',  1.1],
  492: ['gambler_moss',  0.8],
  540: ['Lugard',  1.1],
  541: ['DoppelgangerBox',  2.3],
  542: ['DoppelgangerBox',  3.3],
  // Gens Vanert (MONSTER_GENS_VANERT -> MODAL_GENS_NPC_BARNERT,
  // ZzzCharacter.cpp:14691 / ZzzOpenData.cpp:2190).
  544: ['barnert',  1.0],
  545: ['UnitedMarketPlace_christine',  1.1],
  546: ['UnitedMarkedPlace_raul',  1.0],
  547: ['UnitedMarkedPlace_julia',  1.0],
  // ZzzCharacter.cpp:14719-14731. 'tersia' was previously mis-numbered 210.
  566: ['tersia', 0.93],
  567: ['bena',  1.0],
  577: ['UnitedMarketPlace_christine',  1.1],
  578: ['volvo',  0.9],
  // Lucky-item NPC David (ZzzCharacter.cpp:14450-14456).
  579: ['LuckyItem/npc_burial', 0.95],
};

/**
 * Entries are relative to `Data/NPC/` — the folder `OpenNpc` loads from. A
 * handful of types the server spawns as NPCs are props whose model lives
 * elsewhere (`Data/Skill`, `Data/Object35`, `Data/Item`); those are written
 * with a leading `/` and resolve against the asset root instead.
 */
export function npcModelFile(file: string): string {
  return file.startsWith('/') ? `${file.slice(1)}.glb` : `NPC/${file}.glb`;
}
