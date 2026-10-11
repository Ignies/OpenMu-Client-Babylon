/**
 * Options -> Interface -> Modules: the modules the current world streams (src/modules/_api, "Streaming"),
 * how each runs and the player's consent, which Forget clears so the next entry into the world asks again.
 */

import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { StreamedModules, forgetModuleConsent, moduleConsent } from '@/modules/_api/streamPorts';
import { OptionsButton } from './controls';

const FORGET_WIDTH = 64;

function consentKey(firstParty: boolean, consent: boolean | undefined): TextKey {
  if (firstParty) return 'options.modules.notNeeded';
  if (consent === undefined) return 'options.modules.notAsked';
  return consent ? 'options.modules.allowed' : 'options.modules.refused';
}

export const ModulesList = observer(() => {
  const list = StreamedModules.list;
  if (!list.length) return <div className="options-modules-none">{t('options.modules.none')}</div>;

  return (
    <div className="options-modules">
      {list.map(m => {
        const consent = m.firstParty ? undefined : moduleConsent(m);
        return (
          <div key={m.id} className="options-module">
            <div className="options-module-text">
              <div className="options-module-name">{`${m.id} ${m.version}`}</div>
              <div className="options-module-state">
                {t(m.firstParty ? 'options.modules.firstParty' : 'options.modules.sandboxed')}
                {' - '}
                {t(consentKey(m.firstParty, consent))}
              </div>
            </div>
            {consent !== undefined && (
              <OptionsButton
                label={t('options.modules.forget')}
                width={FORGET_WIDTH}
                onClick={() => forgetModuleConsent(m)}
                style={{ position: 'relative', flex: 'none' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
