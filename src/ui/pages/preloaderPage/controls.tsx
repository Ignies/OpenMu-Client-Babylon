import { useEffect, useRef, useState, type ReactNode } from 'react';
import { uiClick } from '../../../libs/sfx';

/**
 * The web panel's controls, drawn the way the Babylon site draws them: flat
 * grey surfaces, one near-white accent, stroke icons that animate on hover.
 * Only this page uses them; the game's own windows keep MU's sprite chrome.
 */

const ICONS = {
  search: (
    <>
      <circle className="draw" cx="10.5" cy="10.5" r="6" />
      <path className="draw d2" d="m15.2 15.2 5 5" />
    </>
  ),
  refresh: (
    <g className="rotor">
      <path d="M19 12a7 7 0 1 1-2.05-4.95" />
      <path d="M19 4.5v4h-4" />
    </g>
  ),
  chevron: <path d="m8.5 5.5 7 6.5-7 6.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path className="draw" d="m5 12.5 4.5 4.5L19 7.5" />,
  gear: (
    <g className="rotor">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
    </g>
  ),
  play: <path className="draw" d="M8 5.5v13l10-6.5-10-6.5Z" />,
  world: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path className="draw" d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" />
    </>
  ),
  server: (
    <>
      <rect x="4" y="4" width="16" height="7" rx="2" />
      <rect x="4" y="13" width="16" height="7" rx="2" />
      <circle className="status-dot" cx="8" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle className="status-dot d2" cx="8" cy="16.5" r="1" fill="currentColor" stroke="none" />
      <path d="M13 7.5h4M13 16.5h4" />
    </>
  ),
  download: (
    <>
      <path className="draw" d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.8 3.6-5.8 7-5.8s6.2 2 7 5.8" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z" />
      <path d="M4.5 4.5l15 15" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export const Icon = ({ name, className }: { name: IconName; className?: string }) => (
  <svg className={`ws-icon${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden>
    {ICONS[name]}
  </svg>
);

export const Button = ({
  children,
  icon,
  variant = 'default',
  small = false,
  disabled = false,
  title,
  className,
  onClick,
}: {
  children?: ReactNode;
  icon?: IconName;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  small?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    className={`ws-btn ws-btn-${variant}${small ? ' ws-btn-sm' : ''}${icon ? ' anim-host' : ''}${
      children ? '' : ' ws-btn-icon'
    }${className ? ` ${className}` : ''}`}
    disabled={disabled}
    title={title}
    onClick={uiClick(onClick)}
  >
    {icon && <Icon name={icon} />}
    {children}
  </button>
);

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  password = false,
  numeric = false,
  mono = false,
  maxLength,
  revealLabels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  password?: boolean;
  numeric?: boolean;
  mono?: boolean;
  maxLength?: number;
  /** Tooltips for the show / hide button a password field carries. */
  revealLabels?: { show: string; hide: string };
}) => {
  const [shown, setShown] = useState(false);

  return (
    <label className={`ws-field${disabled ? ' is-disabled' : ''}`}>
      <span className="ws-field-label">{label}</span>
      <span className="ws-input-wrap">
        <input
          className={`ws-input${mono ? ' ws-mono' : ''}${password ? ' has-reveal' : ''}`}
          type={password && !shown ? 'password' : 'text'}
          inputMode={numeric ? 'numeric' : undefined}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          spellCheck={false}
          autoComplete="off"
          onChange={e =>
            onChange(numeric ? e.target.value.replace(/\D/g, '') : e.target.value)
          }
        />
        {password && (
          <button
            type="button"
            className="ws-reveal"
            tabIndex={-1}
            disabled={disabled}
            title={revealLabels ? (shown ? revealLabels.hide : revealLabels.show) : undefined}
            onClick={() => setShown(v => !v)}
          >
            <Icon name={shown ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </span>
    </label>
  );
};

export const Toggle = ({
  checked,
  label,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    className={`ws-toggle${checked ? ' is-on' : ''}`}
    disabled={disabled}
    onClick={uiClick(() => onChange(!checked))}
  >
    <span className="ws-toggle-track">
      <span className="ws-toggle-knob" />
    </span>
    <span className="ws-toggle-label">{label}</span>
  </button>
);

export type SelectOption = { value: string; label: string; lead?: ReactNode; hint?: string };

/**
 * A dropdown in the page's own grey, since a native `<select>` opens the
 * system's list chrome over the art.
 */
export const Select = ({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);

    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={root} className={`ws-select${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}>
      {label && <span className="ws-field-label">{label}</span>}
      <button type="button" className="ws-select-plate" onClick={uiClick(() => setOpen(v => !v))}>
        {current?.lead}
        <span className="ws-select-value">{current?.label}</span>
        <Icon name="chevron" className="ws-select-arrow" />
      </button>
      {open && (
        <div className="ws-select-list">
          {options.map(option => (
            <button
              type="button"
              key={option.value}
              className={`ws-select-row${option.value === value ? ' is-on' : ''}`}
              onClick={uiClick(() => {
                setOpen(false);
                onChange(option.value);
              })}
            >
              {option.lead}
              <span className="ws-select-value">{option.label}</span>
              {option.hint && <span className="ws-select-hint">{option.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** A bar that fills with `progress` (0..1). */
export const Progress = ({ progress }: { progress: number }) => (
  <div className="ws-progress">
    <div
      className="ws-progress-fill"
      style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }}
    />
  </div>
);
