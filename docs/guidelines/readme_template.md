# Folder readme template

Every module folder has a `readme.md` in this shape. Keep it under about 80 lines; cut anything a
reader can see in the code.

```markdown
# <folder name>

<One or two sentences: what this folder is for.>

## Public API
- `name(args)`: what it does. (Only what other folders use.)

## How it works
<A few lines: the flow, the data it keeps, what calls it. Original source refs here.>

## Depends on / used by
- uses: <controllers, modules>
- used by: <who imports it>

## Change it
- add a <thing>: <steps / which file>
- remove a <thing>: <steps>

## Tests
- `<file>.test.ts`: what it covers.
```
