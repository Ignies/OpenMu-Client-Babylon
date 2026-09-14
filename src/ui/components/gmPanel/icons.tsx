import { observer } from 'mobx-react-lite';
import type { GmSection } from '../../../gmPanel';

/**
 * One line icon per tab, drawn inline so the sidebar needs no sprite and
 * takes the text colour. 20 px grid, 1.6 px strokes.
 */

const PATHS: Record<GmSection, string> = {
  live: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  map: 'M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2V5zm5 0v10m4-8v10',
  logs: 'M5 3h10v14H5zM8 7h4M8 10h4M8 13h3',
  skins: 'M10 2l2 4 4 .5-3 3 .8 4.2L10 11.5 6.2 13.7 7 9.5 4 6.5 8 6z',
  spawn: 'M10 3v14M3 10h14M5.5 5.5l9 9M14.5 5.5l-9 9',
  character: 'M10 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM3.5 17a6.5 6.5 0 0 1 13 0',
  moderation: 'M10 2l6 2.5v5c0 4-2.5 6.5-6 8-3.5-1.5-6-4-6-8v-5L10 2zm-2 7l1.5 1.5L13 7',
  events: 'M4 4h12v12H4zM4 8h12M8 2v4m4-4v4',
  console: 'M3 4h14v12H3zM6 8l2.5 2L6 12m4 0h4',
};

export const TabIcon = observer(({ id }: { id: GmSection }) => (
  <svg className="gm-side-icon" viewBox="0 0 20 20" aria-hidden="true">
    <path d={PATHS[id]} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
