// Running other programs: captured, streamed to the terminal, or logged to a file while a spinner runs.
import { appendFileSync } from 'node:fs';

export type Result = { code: number; out: string; err: string };

/** Runs and captures. `input` goes to stdin (passwords travel this way, never in argv). */
export async function run(cmd: string, args: string[], opts: { input?: string; cwd?: string } = {}): Promise<Result> {
  const proc = Bun.spawn([cmd, ...args], {
    cwd: opts.cwd,
    stdin: opts.input === undefined ? 'ignore' : new TextEncoder().encode(opts.input),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, out: out.trim(), err: err.trim() };
}

/** Runs with the terminal attached (logs -f, an interactive shell). */
export async function attach(cmd: string, args: string[], cwd?: string): Promise<number> {
  return Bun.spawn([cmd, ...args], { cwd, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' }).exited;
}

/** Runs a long job, appending its output to `log` and reporting each line (for a spinner). */
export async function runLogged(cmd: string, args: string[], log: string, onLine?: (line: string) => void, cwd?: string): Promise<number> {
  const proc = Bun.spawn([cmd, ...args], { cwd, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' });
  const pump = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    let rest = '';
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = rest + decoder.decode(value, { stream: true });
      const lines = text.split(/\r?\n/);
      rest = lines.pop() ?? '';
      appendFileSync(log, lines.map(l => l + '\n').join(''));
      const last = lines.filter(l => l.trim()).pop();
      if (last) onLine?.(last);
    }
    if (rest) appendFileSync(log, rest + '\n');
  };
  await Promise.all([pump(proc.stdout), pump(proc.stderr)]);
  return proc.exited;
}

/** Runs, and throws with the program's own message when it fails. */
export async function must(cmd: string, args: string[], opts: { input?: string; cwd?: string } = {}): Promise<string> {
  const r = await run(cmd, args, opts);
  if (r.code !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(' ')} failed: ${r.err || r.out}`);
  return r.out;
}
