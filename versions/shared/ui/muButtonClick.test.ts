import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// MuButton plays the click itself (`uiClick` around its own onClick), so a handler handed to it
// must not play another one. Read off the sources: rendering every window needs a DOM.
const dir = 'versions/shared/ui';
const files = (readdirSync(dir, { recursive: true }) as string[]).filter(f => f.endsWith('.tsx'));

/** Each `<MuButton ...>` opening tag in `source` (braces counted, so `=>` inside a prop is kept). */
function muButtonTags(source: string): string[] {
  const tags: string[] = [];
  for (let at = source.indexOf('<MuButton'); at >= 0; at = source.indexOf('<MuButton', at + 1)) {
    let depth = 0;
    let end = at;
    while (end < source.length && !(source[end] === '>' && depth === 0)) {
      if (source[end] === '{') depth++;
      else if (source[end] === '}') depth--;
      end++;
    }
    tags.push(source.slice(at, end));
  }
  return tags;
}

describe('a MuButton handler', () => {
  it('plays no click of its own', () => {
    const doubled = files.flatMap(file => {
      const source = readFileSync(`${dir}/${file}`, 'utf8');
      const wrapped = [...source.matchAll(/const (\w+) = uiClick\(/g)].map(m => m[1]);
      return muButtonTags(source)
        .filter(tag => /onClick=\{\s*uiClick\(/.test(tag) || wrapped.some(name => new RegExp(`onClick=\\{${name}\\}`).test(tag)))
        .map(() => file);
    });
    expect(doubled).toEqual([]);
  });
});
