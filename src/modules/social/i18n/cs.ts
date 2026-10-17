/** cs text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': 'Už nejsi v družině.',
  'party.onlyLeaderInvites': 'Zvát může jen vůdce družiny.',
  'party.full': 'Družina je plná.',
  'party.invitationSent': 'Pozvánka do družiny odeslána hráči {name}.',
  'guild.joinRequestSent': 'Žádost o vstup do cechu odeslána hráči {name}.',
  'guild.onlyMasterAppoints': 'Členy může jmenovat jen mistr cechu.',
  'guild.onlyMasterCan': 'To může udělat jen mistr cechu.',
  'guild.allianceRequestSent': 'Nabídka aliance odeslána hráči {name}.',
  'guild.hostilityRequestSent': 'Vyhlášení nepřátelství odesláno hráči {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
