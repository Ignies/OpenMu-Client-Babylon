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
  'party.reply.on': 'Pozvánky do družiny: hra se tě zeptá.',
  'party.reply.off':
    'Pozvánky do družiny: odmítají se samy. Příkazem /re on se tě hra zase bude ptát.',
  'party.reply.auto':
    'Pozvánky do družiny: přijímají se samy. Příkazem /re on se tě hra zase bude ptát.',
  'party.reply.status': 'Pozvánky do družiny: /re {mode}. Použij /re on, /re off nebo /re auto.',
  'party.reply.declined': 'Pozvánka do družiny od hráče {name} odmítnuta (/re).',
  'party.reply.accepted': 'Pozvánka do družiny od hráče {name} přijata (/re).',
} satisfies Partial<Record<keyof typeof en, string>>;
