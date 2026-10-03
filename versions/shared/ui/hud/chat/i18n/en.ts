/** English text of the `chat` HUD element. See src/i18n/readme.md. */

const en = {
  'chat.normal': 'Normal',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Block whisper',
  'chat.system': 'System messages',
  'chat.log': 'Chat log',
  'chat.frame': 'Frame',
  'chat.size': 'Size',
  'chat.alpha': 'Transparency',
  'chat.whisperOff': 'Whispering is off (F3)',
  'chat.emoji.button': 'Emojis',
  'chat.emoji.recent': 'Recently used',
  'chat.latest': 'Back to the newest messages',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/chat': typeof en;
  }
}
