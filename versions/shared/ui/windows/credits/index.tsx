import './style.less';
import { useEffect, useMemo, useState } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { MuWindows } from '@/controllers/interface';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { useWindowStackEntry } from '@/controllers/interface/components/mu_window';
import { UI_STAGE_HEIGHT, UI_STAGE_WIDTH, useUiViewport } from '@/controllers/interface/components/ui_stage';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { creditLines, type CreditLine } from '@/controllers/assets';
import { playMusic, playUiSound } from '@/controllers/sound';
import { Servers } from '@/modules/servers';

/**
 * `CCreditWin` (CreditWin.cpp): the server list's Credit button. A black screen with an illustration
 * pair fading in and out (2 s fades, 22 s shown, eight pairs), the staff roll of `Local/credit.bmd` a
 * department, team and names at a time behind fading masks, the logo, and the deco with its close
 * button. Opened by `openCredits`; drawn by `src/app/App.tsx`.
 */

export const CREDITS = 'credits';

/** The original lays the window out on an 800x600 screen: this stage is 640x480. */
const S = UI_STAGE_WIDTH / 800;
const ILLUSTRATIONS = 8;
/** `kIllustFadeDuration`, `kIllustShowDuration`, `kTextFadeDuration`, `kNameShowDuration`. */
const ILLUST_FADE_MS = 2000;
const ILLUST_SHOW_MS = 22000;
const TEXT_FADE_MS = 1000;
const NAME_SHOW_MS = 2300;
/** `RenderControls`: the three text rows (y 20, 46, 72) and the 42-tall masks over them, in 640 / 800 space. */
const ROW_Y = [20, 46, 72];
const MASK_HEIGHT = 42 * S;

/** What the roll shows: the department and team lines, the names, and where the roll goes on. */
export type CreditBlock = { dept: number; team: number; names: number[]; next: number };

/** `SetTextIndex` (CreditWin.cpp:402-433); null at a class-0 line, where the window closes. */
export function creditBlock(lines: readonly CreditLine[], at: number, previous: Pick<CreditBlock, 'dept' | 'team'>): CreditBlock | null {
  if (lines[at]?.kind === 0) return null;
  let next = at;
  let { dept, team } = previous;
  if (lines[next]?.kind === 1) dept = next++;
  if (lines[next]?.kind === 2) team = next++;
  // `iNameCnt = i` before each test: four names in a row count as three, the fourth unshown.
  let count = 0;
  const names: number[] = [];
  for (let i = 0; i < 4; i++) {
    count = i;
    if (lines[next]?.kind !== 3) break;
    names.push(next++);
  }
  return { dept, team, names: names.slice(0, count), next };
}

/** `CloseWin`: the server list is asked for again and the main theme comes back. */
function closeCredits(): void {
  runInAction(() => MuWindows.setOpen(CREDITS, false));
  Servers.updateServerListRequest();
  playMusic('Music/main_theme');
}

/** `LMW_BTN_CREDIT` (LoginMainWin.cpp:90-97). */
export function openCredits(): void {
  Servers.updateServerListRequest();
  runInAction(() => MuWindows.setOpen(CREDITS, true));
  playMusic('Music/MuTheme');
}

type TextPhase = { phase: 'in' | 'show' | 'out'; rows: readonly boolean[] };

/** `AnimationText`: the masks fade off, the names stay 2.3 s, then the rows whose line changes fade back. */
function useRoll(lines: readonly CreditLine[] | null): { block: CreditBlock | null; text: TextPhase } {
  const [later, setBlock] = useState<CreditBlock | null>(null);
  const [text, setText] = useState<TextPhase>({ phase: 'in', rows: [true, true, true] });
  const first = useMemo(() => (lines ? creditBlock(lines, 0, { dept: 0, team: 0 }) : null), [lines]);
  const block = later ?? first;

  useEffect(() => {
    if (!lines || !block) return;
    const wait = text.phase === 'show' ? NAME_SHOW_MS : TEXT_FADE_MS;
    const timer = setTimeout(() => {
      if (text.phase === 'in') return setText({ phase: 'show', rows: text.rows });
      if (text.phase === 'show') {
        const kind = lines[block.next]?.kind;
        return setText({ phase: 'out', rows: [kind !== 3 && kind !== 2, kind !== 3, true] });
      }
      const next = creditBlock(lines, block.next, block);
      if (!next) {
        playUiSound('click');
        closeCredits();
        return;
      }
      setBlock(next);
      setText({ phase: 'in', rows: text.rows });
    }, wait);
    return () => clearTimeout(timer);
  }, [lines, block, text]);

  return { block, text };
}

/** `AnimationIllust`: fade in, 22 s, fade out, the next pair. */
function useIllustration(): { pair: number; phase: 'in' | 'show' | 'out' } {
  const [state, setState] = useState<{ pair: number; phase: 'in' | 'show' | 'out' }>({ pair: 0, phase: 'in' });
  useEffect(() => {
    const wait = state.phase === 'show' ? ILLUST_SHOW_MS : ILLUST_FADE_MS;
    const timer = setTimeout(() => {
      if (state.phase === 'in') setState({ pair: state.pair, phase: 'show' });
      else if (state.phase === 'show') setState({ pair: state.pair, phase: 'out' });
      else setState({ pair: (state.pair + 1) % ILLUSTRATIONS, phase: 'in' });
    }, wait);
    return () => clearTimeout(timer);
  }, [state]);
  return state;
}

const NAME_BOXES: Record<number, readonly (readonly [number, number])[]> = {
  1: [[0, 640]],
  2: [[160, 160], [320, 160]],
  3: [[0, 213], [213, 213], [426, 213]],
};

const Roll = observer(() => {
  const lines = creditLines();
  const { block, text } = useRoll(lines);
  const illust = useIllustration();
  const { width, height, scale } = useUiViewport();
  const stage = {
    left: (width - UI_STAGE_WIDTH * scale) / 2,
    top: (height - UI_STAGE_HEIGHT * scale) / 2,
    transform: `scale(${scale})`,
  };
  const line = (index: number | undefined) => (index === undefined ? '' : (lines?.[index]?.name ?? ''));
  const mask = (row: number) => {
    const fading = text.rows[row];
    if (!fading || text.phase === 'show') return 'credits-mask clear';
    return `credits-mask ${text.phase === 'in' ? 'fade-off' : 'fade-on'}`;
  };
  const names = block?.names ?? [];

  return (
    <div className="credits-window">
      <div className="credits-stage" style={stage}>
        {[1, 2].map(side => (
          <MuSpriteFrame
            key={`${illust.pair}-${side}`}
            file={`im${illust.pair + 1}_${side}.OZJ`}
            width={400 * S}
            height={400 * S}
            className={`credits-illustration ${illust.phase}`}
            style={{ left: side === 1 ? 0 : 400 * S, top: 126 * S, backgroundSize: '100% 100%' }}
          />
        ))}
        <MuSpriteFrame file="cr_mu_lo.OZT" width={290 * S} height={41 * S} className="credits-art" style={{ left: 241 * S, top: 549 * S, backgroundSize: '100% 100%' }} />
        <div className="credits-line" style={{ top: ROW_Y[0] }}>{line(block?.dept)}</div>
        <div className="credits-line" style={{ top: ROW_Y[1] }}>{line(block?.team)}</div>
        {(NAME_BOXES[names.length] ?? []).map(([x, w], i) => (
          <div key={i} className="credits-line credits-name" style={{ top: ROW_Y[2], left: x, width: w }}>
            {line(names[i])}
          </div>
        ))}
        {ROW_Y.map((_, row) => (
          <div key={`${row}-${block?.next}-${text.phase}`} className={mask(row)} style={{ top: row * MASK_HEIGHT, height: MASK_HEIGHT }} />
        ))}
      </div>
      <div className="credits-deco">
        <MuSpriteFrame file="deco.OZT" width={189} height={103} className="credits-art" />
        <MuButton
          file="message_close_b_all.OZT"
          width={54}
          height={30}
          frames={{ up: 0, active: 1, down: 2 }}
          onClick={closeCredits}
          style={{ position: 'absolute', left: 122, top: 63 }}
        />
      </div>
    </div>
  );
});

export const CreditsWindow = observer(() => {
  const open = MuWindows.isOpen(CREDITS) && AppState.uiState === UIState.Servers;
  // Escape closes it with a click (CreditWin.cpp:211-216).
  useWindowStackEntry(CREDITS, open, () => {
    playUiSound('click');
    closeCredits();
  });
  return open ? <Roll /> : null;
});
