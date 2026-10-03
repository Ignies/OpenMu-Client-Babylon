/** English text of several modules (no single owner). See src/i18n/readme.md. */

const en = {
  'personalShop.needLevel': 'A personal shop needs character level 6.',
  'personalShop.openFailed': 'The shop could not be opened.',
  'personalShop.cannotSell': 'This item cannot be sold in a shop.',
  'personalShop.itemGone': 'That item is gone.',
  'guild.alreadyInGuild': 'You already belong to a guild.',
  'guild.notGuildMaster': 'That player is not a guild master.',
  'guild.requestFailed': 'The guild request failed.',
  'quest.itemFallback': 'Item {id}',
  'event.shortOfZen': 'You are short of Zen.',
  'notify.negativePrice': 'The price cannot be negative',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/_shared': typeof en;
  }
}
