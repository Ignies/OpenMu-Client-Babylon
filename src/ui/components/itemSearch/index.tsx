import './style.less';
import { useState } from 'react';
import { itemDisplayName } from '../../../common/itemTooltip';
import { t } from '../../../i18n';
import type { Item } from '../../../ecs/world';

/**
 * The find box over an item grid: type a few letters and everything that
 * does not match dims. Nothing is hidden or moved - the grid is the
 * server's layout - so a search is only ever a way of looking at it.
 *
 * `useItemSearch` owns the query; the box draws it and `matcher` is what a
 * grid passes to `dimmed`.
 */

export type ItemSearch = {
  query: string;
  setQuery: (value: string) => void;
  /** True while something is typed: the grid should dim non-matches. */
  active: boolean;
  matches: (item: Item) => boolean;
};

export function itemMatchesQuery(item: Item, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return itemDisplayName(item).toLowerCase().includes(needle);
}

export function useItemSearch(): ItemSearch {
  const [query, setQuery] = useState('');
  return {
    query,
    setQuery,
    active: query.trim().length > 0,
    matches: item => itemMatchesQuery(item, query),
  };
}

export const ItemSearchBox = ({
  search,
  left,
  top,
  width,
}: {
  search: ItemSearch;
  left: number;
  top: number;
  width: number;
}) => (
  <input
    className="item-search"
    data-no-drag="true"
    type="text"
    spellCheck={false}
    value={search.query}
    placeholder={t('search.placeholder')}
    title={t('search.hint')}
    style={{ left, top, width }}
    onChange={event => search.setQuery(event.target.value)}
    onKeyDown={event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        search.setQuery('');
        (event.target as HTMLInputElement).blur();
      }
    }}
  />
);
