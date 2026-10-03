/** English text of `versions/shared/objects/signs`. See src/i18n/readme.md. */

const en = {
  // What a notice board says, painted onto its plate at map load
  // (versions/shared/objects/signs/signPlates.ts). Keep these short: the plate is 43 texels wide and
  // a long name is shrunk to fit rather than clipped, so it just gets small.
  'sign.lorencia': 'Lorencia',
  'sign.devias': 'Devias',
  'sign.noria': 'Noria',
  'sign.elbeland': 'Elbeland',
  'sign.raklion': 'Raklion',
  'sign.valleyOfLoren': 'Valley of Loren',
  'sign.stadium': 'Stadium',
  'sign.pub': 'Pub',
  'sign.shop': 'Shop',
  'sign.guardhouse': 'Guardhouse',
  'sign.church': 'Church',
  'sign.guild': 'Guild',
  'sign.northCastle': 'Northern Castle',
  'sign.southCastle': 'Southern Castle',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/objects/signs': typeof en;
  }
}
