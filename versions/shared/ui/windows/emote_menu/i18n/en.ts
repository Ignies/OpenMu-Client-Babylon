/** English text of the `emote_menu` window. See src/i18n/readme.md. */

const en = {
  'emote.menu': 'Emotes',
  'emote.emojiOnly': 'Emoji only',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/emote_menu': typeof en;
  }
}
