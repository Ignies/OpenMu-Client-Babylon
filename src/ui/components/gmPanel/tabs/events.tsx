import { observer } from 'mobx-react-lite';
import { t } from '../../../../i18n';
import type { WorldView } from '../../../../gmWorld';
import { gmCommand } from '../../../../common/gmCommands';
import { CommandCard, QuickButton, RunButton } from '../commandForm';

/** Event starts, fireworks and notices. */
export const EventsTab = observer(({ view }: { view: WorldView }) => {
  const hero = view.hero;
  const here = hero ? { x: String(hero.x), y: String(hero.y) } : undefined;

  return (
    <div className="gm-grid-2 gm-events">
      <div>
        <h4 className="gm-section-title">{t('gm.events.start')}</h4>
        <div className="gm-quick">
          <QuickButton command={gmCommand('/startbc')} />
          <QuickButton command={gmCommand('/startcc')} />
          <QuickButton command={gmCommand('/startds')} />
        </div>

        <h4 className="gm-section-title">{t('gm.cmd.fireworks.label')}</h4>
        <p className="gm-hint">{t('gm.events.fireworksHint')}</p>
        <div className="gm-quick">
          <RunButton command={gmCommand('/fireworks')} overrides={here} labelKey="gm.events.here" compact />
          <RunButton
            command={gmCommand('/xmasfireworks')}
            overrides={here}
            labelKey="gm.events.christmasHere"
            compact
          />
        </div>
        <CommandCard command={gmCommand('/fireworks')} />
      </div>

      <div>
        <h4 className="gm-section-title">{t('gm.events.announce')}</h4>
        <CommandCard command={gmCommand('/goldnotice')} />
      </div>
    </div>
  );
});
