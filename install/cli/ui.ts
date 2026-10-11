// The look of the installer: one place, so every command reads the same. Built on @clack/prompts.
import * as p from '@clack/prompts';
import pc from 'picocolors';

export { pc };

/** Ctrl+C at any question leaves cleanly, changing nothing that was not already saved. */
function answered<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Stopped. Nothing else was changed.');
    process.exit(130);
  }
  return value as T;
}

export const ui = {
  intro: (title: string) => p.intro(pc.bgCyan(pc.black(` ${title} `))),
  outro: (text: string) => p.outro(text),
  note: (text: string, title?: string) => p.note(text, title),
  info: (text: string) => p.log.info(text),
  ok: (text: string) => p.log.success(text),
  warn: (text: string) => p.log.warn(text),
  error: (text: string) => p.log.error(text),
  step: (text: string) => p.log.step(text),

  async text(message: string, opts: { initial?: string; placeholder?: string; validate?: (v: string) => string | undefined } = {}) {
    return answered<string>(await p.text({ message, initialValue: opts.initial, placeholder: opts.placeholder, validate: v => opts.validate?.(v ?? '') }));
  },

  /** Asks twice; the second must match. */
  async password(message: string, validate: (v: string) => string | undefined): Promise<string> {
    for (;;) {
      const first = answered<string>(await p.password({ message, validate: v => validate(v ?? '') }));
      const again = answered<string>(await p.password({ message: 'Type it again' }));
      if (first === again) return first;
      p.log.warn('The two did not match. Once more.');
    }
  },

  async confirm(message: string, initial = true) {
    return answered<boolean>(await p.confirm({ message, initialValue: initial }));
  },

  async select<T extends string>(message: string, options: { value: T; label: string; hint?: string }[], initial?: T) {
    return answered(await p.select({ message, options: options as never, initialValue: initial })) as T;
  },

  /** Runs `job` under a spinner whose message follows the job's progress. */
  async task<T>(title: string, job: (progress: (line: string) => void) => Promise<T>): Promise<T> {
    const s = p.spinner();
    s.start(title);
    try {
      const result = await job(line => s.message(`${title} ${pc.dim(line.slice(0, 60))}`));
      s.stop(`${title} ${pc.green('done')}`);
      return result;
    } catch (e) {
      s.error(`${title} ${pc.red('failed')}`);
      throw e;
    }
  },
};
