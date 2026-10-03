/** English text of the `balgass_entry` window. See src/i18n/readme.md. */

const en = {
  'quest.werewolf.name': 'Werewolf Guardsman',
  'quest.werewolf.line1': '\'Do you even know about me? I have been both blessed and cursed by Lugard. You may be helped if you are qualified.\'',
  'quest.werewolf.line2': 'If you have passed Apostle Devin\'s test, the Werewolf Guardsman will send you and your party members to Balgass\' Barracks.',
  'quest.werewolf.line3': 'You must stand close together to enter Balgass\' Barracks at once.',
  'quest.werewolf.line4': 'To receive help from the Werewolf Guardsman, you must pay him 3,000,000 Zen.',
  'quest.gatekeeper.name': 'Gatekeeper',
  'quest.gatekeeper.line1': '\'Hmm, who are you? Has Balgass even approved of you?\'',
  'quest.gatekeeper.line2': 'Lugard\'s 12 apostles are helping by blinding the gatekeeper on the road to Balgass\' Resting Place.',
  'quest.gatekeeper.line3': 'Apostle Devin\'s third mission lets you enter the Resting Place.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/balgass_entry': typeof en;
  }
}
