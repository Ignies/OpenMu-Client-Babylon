/** English text of the `render` controller. See src/i18n/readme.md. */

const en = {
  'options.linePlacement.inset': 'Inset',
  'options.linePlacement.centered': 'Centered',
  'options.linePlacement.outset': 'Outset',
  'options.outlineMode.screen': 'Screen-space',
  'options.outlineMode.hull': 'Inverted hull',
  'options.outlineMode.both': 'Both',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Characters',
  'options.style.classic': 'Classic',
  'options.style.cel': 'Cel-shaded',
  'options.style.anime': 'Anime 1.0',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/controllers/render': typeof en;
  }
}
