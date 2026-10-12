/** English text of the streamed modules (`src/modules/_api`). See src/i18n/readme.md. */

const en = {
  'moduleStream.dropped': 'This world lists a module that cannot be read ({id}): skipped',
  'moduleStream.api': 'Module {id} needs module API {range}, this client serves {have}: skipped',
  'moduleStream.download': 'Module {id} could not be downloaded: skipped',
  'moduleStream.hash': 'Module {id} does not match its hash: skipped',
  'moduleStream.core': 'Module {id} claims to be a core module: refused',
  'moduleStream.builtIn': 'Module {id} has the name of a built-in module: refused',
  'moduleStream.declined': 'Module {id} was not allowed: skipped',
  'moduleStream.failed': 'Module {id} failed to start: unloaded',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/_api': typeof en;
  }
}
