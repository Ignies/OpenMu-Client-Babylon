import './style.less';
import { observer } from 'mobx-react-lite';
import { t, i18n } from '../../../../../i18n';
import { Store } from '../../../../../store';
import { MuItemWindow } from '../../../../components/muWindow';
import { ItemIcon } from '../../../../components/itemIcon';
import { uiClick } from '../../../../../libs/sfx';
import { itemName } from '../../../../../marketplace/categories';
import {
  BUNDLE_SIZES,
  COMBINE_FEE_PER_TEN,
  DISBAND_FEE,
  JEWELS,
  JewelBundle,
  type BundleEntry,
  type JewelKind,
} from './state';

const WINDOW_ID = 'jewel-bundle';

const TITLE_Y = 13;
const TABS_Y = 34;
const LIST_X = 15;
const LIST_Y = 58;
const LIST_WIDTH = 160;
const LIST_HEIGHT = 288;
const FOOT_Y = 352;
const HEAD_CLOSE = { x: 169, y: 7, w: 13, h: 12 };

function zen(value: number): string {
  return value.toLocaleString(i18n.language);
}

const CombineRow = observer(({ kind }: { kind: JewelKind }) => {
  const have = JewelBundle.count(kind);
  const icon = { group: kind.single.group, num: kind.single.num };
  return (
    <div className={`jewel-row${have === 0 ? ' empty' : ''}`}>
      <div className="jewel-icon">
        <ItemIcon item={icon} />
      </div>
      <div className="jewel-name" title={itemName(icon)}>
        {itemName(icon)}
      </div>
      <div className="jewel-count">{have}</div>
      <div className="jewel-buttons">
        {BUNDLE_SIZES.map(({ size, wire }) => (
          <button
            key={size}
            type="button"
            data-no-drag="true"
            disabled={!JewelBundle.canCombine(kind, size)}
            title={t('jewels.combineTip', { n: size })}
            onClick={uiClick(() => JewelBundle.combine(kind, wire))}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
});

const BundleRow = observer(({ entry }: { entry: BundleEntry }) => {
  const item = Store.playerData.items[entry.slot];
  if (!item) return null;
  // The bundles have no name in every language pack (Chaos, the refine
  // stones...), so the name comes from the single jewel they hold.
  const name = t('jewels.bundleName', {
    name: itemName({ group: entry.kind.single.group, num: entry.kind.single.num }),
  });
  return (
    <div className="jewel-row">
      <div className="jewel-icon">
        <ItemIcon item={item} />
      </div>
      <div className="jewel-name" title={name}>
        {name}
      </div>
      <div className="jewel-count">{t('jewels.pieces', { n: entry.pieces })}</div>
      <div className="jewel-buttons">
        <button
          type="button"
          className="wide"
          data-no-drag="true"
          disabled={!JewelBundle.canDisband()}
          onClick={uiClick(() => JewelBundle.disband(entry))}
        >
          {t('jewels.disband')}
        </button>
      </div>
    </div>
  );
});

/**
 * Lahap's / Jeweler Raul's window. The retail client has its own frame for it
 * (`CNewUIGemIntegration`); this one reuses the 190x429 item frame with two
 * tabs - combine single jewels into a bundle of 10/20/30, and disband a bundle.
 */
export const JewelBundleWindow = observer(() => {
  if (!JewelBundle.open) return null;

  const column = 1 + (Store.inventoryEnabled ? 1 : 0) + (Store.characterInfoEnabled ? 1 : 0);
  const bundles = JewelBundle.bundles;

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="jewel-bundle"
      column={column}
      label={t('jewels.title')}
      onClose={() => JewelBundle.close()}
    >
      <div className="window-title" style={{ top: TITLE_Y }}>
        {t('jewels.title')}
      </div>
      <div
        className="head-close"
        data-no-drag="true"
        style={{ left: HEAD_CLOSE.x, top: HEAD_CLOSE.y, width: HEAD_CLOSE.w, height: HEAD_CLOSE.h }}
        onClick={() => JewelBundle.close()}
      />

      <div className="jewel-tabs" data-no-drag="true" style={{ left: LIST_X, top: TABS_Y, width: LIST_WIDTH }}>
        <div
          className={`jewel-tab${JewelBundle.tab === 'combine' ? ' active' : ''}`}
          onClick={uiClick(() => JewelBundle.setTab('combine'))}
        >
          {t('jewels.tabCombine')}
        </div>
        <div
          className={`jewel-tab${JewelBundle.tab === 'disband' ? ' active' : ''}`}
          onClick={uiClick(() => JewelBundle.setTab('disband'))}
        >
          {t('jewels.tabDisband')}
        </div>
      </div>

      <div
        className="jewel-list"
        data-no-drag="true"
        style={{ left: LIST_X, top: LIST_Y, width: LIST_WIDTH, height: LIST_HEIGHT }}
      >
        {JewelBundle.tab === 'combine' &&
          JEWELS.map(kind => <CombineRow key={kind.wire} kind={kind} />)}
        {JewelBundle.tab === 'disband' &&
          (bundles.length > 0 ? (
            bundles.map(entry => <BundleRow key={entry.slot} entry={entry} />)
          ) : (
            <div className="jewel-hint">{t('jewels.noBundles')}</div>
          ))}
      </div>

      <div className="jewel-foot" style={{ left: LIST_X, top: FOOT_Y, width: LIST_WIDTH }}>
        <div>
          {JewelBundle.tab === 'combine'
            ? t('jewels.feeCombine', { zen: zen(COMBINE_FEE_PER_TEN) })
            : t('jewels.feeDisband', { zen: zen(DISBAND_FEE) })}
        </div>
        <div className="yours">{t('jewels.zen', { zen: zen(Store.playerData.money) })}</div>
      </div>
    </MuItemWindow>
  );
});
