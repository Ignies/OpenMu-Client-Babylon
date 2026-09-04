import { describe, expect, it } from 'vitest';
import { gameVersion } from './index';

const rank = gameVersion.protocol.variantRank;

/** The variant a 0.97d client must win with, per family that shares a code. */
const WINNERS: [winner: string, losers: string[]][] = [
  // UpdateCharacterStatsPlugIn097, MinimumClient(0, 97).
  ['CharacterInformation097', ['CharacterInformation', 'CharacterInformation075', 'CharacterInformationExtended']],
  // The …095 view plug-ins outrank their 075 siblings at 0.97.
  ['AddCharactersToScope095', ['AddCharactersToScope', 'AddCharactersToScope075', 'AddCharacterToScopeExtended']],
  ['AddNpcsToScope095', ['AddNpcsToScope', 'AddNpcsToScope075']],
  ['AddSummonedMonstersToScope095', ['AddSummonedMonstersToScope', 'AddSummonedMonstersToScope075']],
  ['AreaSkillAnimation095', ['AreaSkillAnimation', 'AreaSkillAnimation075']],
  ['SkillAnimation095', ['SkillAnimation', 'SkillAnimation075']],
  ['CharacterList095', ['CharacterList', 'CharacterList075', 'CharacterListExtended']],
  ['RespawnAfterDeath095', ['RespawnAfterDeath', 'RespawnAfterDeath075', 'RespawnAfterDeathExtended']],
  ['SkillAdded095', ['SkillAdded', 'SkillAdded075']],
  ['SkillRemoved095', ['SkillRemoved', 'SkillRemoved075']],
  // Nothing newer is suitable: MapChangePlugIn / ObjectMovedPlugIn are
  // MinimumClient(1, 0), and the others have no 095 sibling at all.
  ['MapChanged075', ['MapChanged']],
  ['ObjectWalked075', ['ObjectWalked', 'ObjectWalkedExtended']],
  ['AddTransformedCharactersToScope075', ['AddTransformedCharactersToScope']],
  ['SkillListUpdate075', ['SkillListUpdate']],
  // The classic layout wins where OpenMU caps the 075 plug-in at 0.89.
  ['MoneyDropped', ['MoneyDropped075', 'MoneyDroppedExtended']],
  ['PartyList', ['PartyList075']],
  ['GuildList', ['GuildList075']],
  ['MagicEffectCancelled', ['MagicEffectCancelled075']],
  ['AssignCharacterToGuild', ['AssignCharacterToGuild075']],
];

describe('0.97d variant rank', () => {
  it.each(WINNERS)('prefers %s', (winner, losers) => {
    for (const loser of losers) {
      expect(rank(winner)).toBeLessThan(rank(loser));
    }
  });

  it('never picks an Extended (client >= 106.3) layout', () => {
    expect(rank('CharacterInformationExtended')).toBeGreaterThan(rank('CharacterInformation'));
    expect(rank('MoneyDroppedExtended')).toBeGreaterThan(rank('MoneyDropped'));
  });
});

describe('0.97d contract', () => {
  it('uses the pre-Season-6 Xor32 key and the shared SimpleModulus keys', () => {
    const { encryption } = gameVersion.protocol;
    expect([...encryption.xor32Key.slice(0, 4)]).toEqual([0xe7, 0x6d, 0x3a, 0x89]);
    expect(encryption.xor32Key.length).toBe(32);
    expect([...encryption.xor3Key]).toEqual([0xfc, 0xcf, 0xab]);
    expect(encryption.clientToServer[0]).toBe(128079);
    expect(encryption.serverToClient[0]).toBe(73326);
  });

  it('sends the five version bytes of the 0.97d client', () => {
    expect([...gameVersion.clientVersionBytes]).toEqual([0x31, 0x3b, 0x3a, 0x34, 0x39]);
    // The same bytes unmangled ('0'+1, '9'+2, '7'+3, '0'+4, '4'+5).
    const plain = gameVersion.clientVersionBytes.map((b, i) => b - (i + 1));
    expect(String.fromCharCode(...plain)).toBe('09704');
    expect(gameVersion.serialBytes.length).toBe(16);
  });
});
