/** English text of the `buff_bar` HUD element. See src/i18n/readme.md. */

const en = {
  'buff.debuff': 'Debuff',
  'buff.remainingSec': '{seconds} sec',
  'buff.remainingMin': '{minutes} min {seconds} sec',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/buff_bar': typeof en;
  }
}
