import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuItemWindow, MuTableFrame } from '@/controllers/interface/components/mu_window';
import { loadCredits, type Credit } from '@/modules/credits';
import { creditGroups, type CreditGroup } from './groups';

export { creditGroups } from './groups';

/**
 * The project's credits in the default item-window frame: the special thanks, everyone who wrote
 * or reported for the client, and the playtesters, read from GitHub (`modules/credits`). Hidden:
 * Ctrl+F8 opens it on every page; drawn by `src/app/App.tsx`.
 */

export const PROJECT_CREDITS = 'project_credits';

const TITLE_Y = 12;
/** The X in the frame art. */
const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };
const TABLE = { left: 12, top: 40, width: 166, height: 346 };
const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };
const EXIT_SPRITE = 'newui_exit_00.OZT';

const HEADING: Record<CreditGroup, TextKey> = {
  thanks: 'projectCredits.thanks',
  contributors: 'projectCredits.contributors',
  playtesters: 'projectCredits.playtesters',
  reporters: 'projectCredits.reporters',
  everyone: 'projectCredits.everyoneHeading',
};

/** "900 commits, 1 reports", or empty for someone with neither. */
const counts = (c: Credit) =>
  [
    c.commits > 0 ? t('projectCredits.commits', { count: c.commits }) : '',
    c.reports > 0 ? t('projectCredits.reports', { count: c.reports }) : '',
  ]
    .filter(Boolean)
    .join(', ');

/** Every group, its count and its names; the lines on what the client builds on close the list. */
export const CreditsList = observer(({ list }: { list: readonly Credit[] }) => (
  <>
    {creditGroups(list).map(({ group, credits }) => (
      <section key={group} className="pc-group">
        <div className="pc-heading">
          {group === 'everyone' ? t(HEADING[group]) : `${t(HEADING[group])} (${credits.length})`}
        </div>
        {group === 'thanks' && <div className="pc-note">{t('projectCredits.thanksNote')}</div>}
        {credits.map(c => (
          <div key={`${c.kind}:${c.name}`} className="pc-row">
            <span className="pc-name">{c.kind === 'everyone' ? t('projectCredits.everyone') : c.name}</span>
            {counts(c) && <span className="pc-count">{counts(c)}</span>}
            {c.note && <div className="pc-note">{c.note}</div>}
            {c.roll && <div className="pc-roll">{c.roll.join(', ')}</div>}
          </div>
        ))}
      </section>
    ))}
    <div className="pc-note pc-foot">{t('projectCredits.owners')}</div>
    <div className="pc-note pc-foot">{t('projectCredits.season6')}</div>
  </>
));

const close = () => MuWindows.setOpen(PROJECT_CREDITS, false);

export const ProjectCreditsWindow = observer(() => {
  const open = MuWindows.isOpen(PROJECT_CREDITS);
  const [list, setList] = useState<Credit[] | null>(null);

  useEffect(() => {
    if (open) void loadCredits().then(setList);
  }, [open]);

  if (!open) return null;

  return (
    <MuItemWindow id={PROJECT_CREDITS} className="project-credits" label={t('projectCredits.title')} onClose={close}>
      <div className="pc-title" style={{ top: TITLE_Y }}>
        {t('projectCredits.title')}
      </div>
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={close} />
      <div className="pc-fill" style={TABLE} />
      <MuTableFrame {...TABLE} />
      <div
        className="pc-list"
        data-no-drag="true"
        style={{ left: TABLE.left + 6, top: TABLE.top + 6, width: TABLE.width - 12, height: TABLE.height - 12 }}
      >
        {list ? <CreditsList list={list} /> : <div className="pc-note">{t('projectCredits.loading')}</div>}
      </div>
      <div data-no-drag="true" style={{ position: 'absolute', left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}>
        <MuButton
          file={EXIT_SPRITE}
          width={EXIT_BUTTON.width}
          height={EXIT_BUTTON.height}
          frames={{ up: 0, down: 1 }}
          onClick={close}
        />
      </div>
    </MuItemWindow>
  );
});
