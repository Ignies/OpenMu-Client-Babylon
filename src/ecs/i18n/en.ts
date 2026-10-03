/** English text of the ECS systems (`src/ecs`). See src/i18n/readme.md. */

const en = {
  'instrument.needStanding': 'Stand still to take out an instrument',
  'notify.arrowsReloaded': 'Arrows reloaded',
  'notify.noMoreArrows': 'No more arrows',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/ecs': typeof en;
  }
}
