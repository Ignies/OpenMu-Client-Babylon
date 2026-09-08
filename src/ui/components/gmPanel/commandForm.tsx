import { observer } from 'mobx-react-lite';
import { GmPanel } from '../../../gmPanel';
import { uiClick } from '../../../libs/sfx';
import type { GmCommand, GmParam } from '../../../common/gmCommands';

/**
 * The pieces every screen builds its forms out of.
 *
 * A screen never restates a command's parameters - it names the command and
 * these read its shape from the catalogue, so the order and the required flags
 * stay the ones checked against the server's argument classes.
 *
 * `overrides` is how a purpose-built screen supplies a value the operator
 * should not have to type: the map number a picker chose, the character a row
 * in Nearby names, your own coordinates. An overridden parameter is not drawn.
 */

export type Overrides = Record<string, string>;

const Field = observer(
  ({ command, param, bare }: { command: GmCommand; param: GmParam; bare?: boolean }) => {
    const own = GmPanel.valueFor(command, param.name);
    // A blank character field means the shared target, so say whose name is
    // about to be used rather than sending it somewhere the operator has to
    // guess at.
    const standIn =
      param.name === 'characterName' && !own && GmPanel.target ? GmPanel.target : null;

    return (
      <label className="gm-field">
        {/* A row that already names the value (the read/write pairs) passes
            `bare`, so the label is not printed twice on one line. */}
        {bare ? null : (
          <span className="gm-field-label">
            {param.label}
            {param.required ? <b className="gm-required">*</b> : null}
            {standIn ? <em className="gm-standin">using {standIn}</em> : null}
          </span>
        )}

        {param.validValues ? (
          <div className="gm-choice">
            {param.validValues.map(option => (
              <button
                key={option}
                type="button"
                className={`gm-choice-option${own === option ? ' is-active' : ''}`}
                onClick={uiClick(() =>
                  GmPanel.setValue(command, param.name, own === option ? '' : option)
                )}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            className="gm-input"
            type="text"
            // Not type="number": these same fields hold character names and map
            // names, and spinners on a level make no sense. `inputMode` only
            // picks which keyboard a phone offers.
            inputMode={param.type === 'number' ? 'numeric' : 'text'}
            value={own}
            placeholder={standIn ?? param.hint ?? ''}
            spellCheck={false}
            autoComplete="off"
            onChange={e => GmPanel.setValue(command, param.name, e.target.value)}
            onKeyDown={e => {
              // Enter runs it, the way every form works. Stopped from bubbling
              // so the chat box does not also open behind the panel.
              if (e.key !== 'Enter') return;
              e.preventDefault();
              e.stopPropagation();
              GmPanel.run(command);
            }}
          />
        )}
      </label>
    );
  }
);

export const CommandFields = observer(
  ({
    command,
    hide,
    bare,
  }: {
    command: GmCommand;
    hide?: readonly string[];
    bare?: boolean;
  }) => (
    <>
      {(command.params ?? [])
        .filter(param => !hide?.includes(param.name))
        .map(param => (
          <Field key={param.name} command={command} param={param} bare={bare} />
        ))}
    </>
  )
);

/** The line as it will be sent, so nothing is a surprise. */
export const CommandPreview = observer(
  ({ command, overrides }: { command: GmCommand; overrides?: Overrides }) => (
    <output className="gm-preview">{GmPanel.preview(command, overrides)}</output>
  )
);

/**
 * Run, or Confirm when the command takes something away. Arming remembers the
 * whole line, so changing any field disarms it - a confirm always answers the
 * line that is on screen.
 */
export const RunButton = observer(
  ({
    command,
    overrides,
    label,
    compact,
  }: {
    command: GmCommand;
    overrides?: Overrides;
    label?: string;
    compact?: boolean;
  }) => {
    const armed = GmPanel.isArmed(command, overrides);

    return (
      <button
        type="button"
        className={`gm-btn${compact ? ' gm-btn-compact' : ''}${
          command.confirm ? ' gm-btn-heavy' : ''
        }${armed ? ' is-armed' : ''}`}
        title={command.help}
        onClick={uiClick(() => GmPanel.run(command, overrides))}
      >
        {armed ? 'Confirm' : (label ?? 'Run')}
      </button>
    );
  }
);

/** A whole command as one block: title, help, fields, preview, run. */
export const CommandCard = observer(
  ({
    command,
    overrides,
    hide,
    label,
  }: {
    command: GmCommand;
    overrides?: Overrides;
    hide?: readonly string[];
    label?: string;
  }) => (
    <section className="gm-card">
      <header className="gm-card-head">
        <h4>{label ?? command.label}</h4>
        <code>{command.command}</code>
      </header>
      <p className="gm-help">{command.help}</p>
      <CommandFields command={command} hide={hide} />
      <CommandPreview command={command} overrides={overrides} />
      <div className="gm-card-actions">
        <RunButton command={command} overrides={overrides} />
      </div>
    </section>
  )
);

/** The one-press commands: no fields, just a labelled button. */
export const QuickButton = observer(
  ({ command, overrides }: { command: GmCommand; overrides?: Overrides }) => (
    <RunButton command={command} overrides={overrides} label={command.label} compact />
  )
);
