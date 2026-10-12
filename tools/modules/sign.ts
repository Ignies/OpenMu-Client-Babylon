// Signs a streamed module as first party (docs/module_streaming.md, "Signing"). The private key stays in
// a file outside the repository, passed on the command line each time; nothing here stores it.
//
//   bun tools/modules/sign.ts keygen <key.pem>       make a key pair; prints the public key for VITE_MODULE_SIGNING_KEY
//   bun tools/modules/sign.ts pubkey <key.pem>       print the public key again
//   bun tools/modules/sign.ts sign <key.pem> <module.js> --id <id> --version <x.y.z> --api <range>
//                                                    write <module>.json (what the installer reads) beside the module
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, isAbsolute } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');
const ID = /^[a-z][a-z0-9_]{0,39}$/;
const SEMVER = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;

/** Whether `path` is inside this repository, where a private key must never be. */
export function insideRepo(path: string): boolean {
  const rel = relative(REPO, resolve(path));
  return !rel.startsWith('..') && !isAbsolute(rel);
}

function privateKey(pem: string) {
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('the key is not an ed25519 private key');
  return key;
}

/** The public half as the client's build takes it: 32 raw bytes in base64url. */
export function publicKeyOf(pem: string): string {
  const jwk = createPublicKey(privateKey(pem)).export({ format: 'jwk' });
  return String(jwk.x);
}

/** The file's hash and the owner's signature over `id|version|sha256` (`_api/signature.ts` `signedText`). */
export function signModule(pem: string, { id, version }: { id: string; version: string }, bytes: Uint8Array) {
  const key = privateKey(pem);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const signature = sign(null, new TextEncoder().encode(`${id}|${version}|${sha256}`), key).toString('base64url');
  return { sha256, signature };
}

/** The `<name>.json` the installer lists the module from (`install/cli/render/manifest.ts`). */
export function describeModule(pem: string, meta: { id: string; version: string; api: string }, bytes: Uint8Array) {
  if (!ID.test(meta.id)) throw new Error('id: lower case letters, digits and _, at most 40');
  if (!SEMVER.test(meta.version)) throw new Error('version: like 1.0.0');
  if (!meta.api) throw new Error('api: the module API range, like ^1.1');
  return { id: meta.id, version: meta.version, api: meta.api, signature: signModule(pem, meta, bytes).signature };
}

function readKey(path: string): string {
  if (insideRepo(path)) throw new Error(`${path} is inside the repository: keep the private key elsewhere`);
  return readFileSync(path, 'utf8');
}

function flag(args: string[], name: string): string {
  const at = args.indexOf(`--${name}`);
  if (at < 0 || !args[at + 1]) throw new Error(`missing --${name}`);
  return args[at + 1];
}

function main(args: string[]): void {
  const [command, keyPath, modulePath] = args;
  if (command === 'keygen' && keyPath) {
    if (insideRepo(keyPath)) throw new Error(`${keyPath} is inside the repository: keep the private key elsewhere`);
    if (existsSync(keyPath)) throw new Error(`${keyPath} exists: not overwriting a key`);
    const pem = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    writeFileSync(keyPath, pem, { mode: 0o600 });
    console.info(`Private key: ${keyPath} (keep it offline, never in the repository or CI)`);
    console.info(`VITE_MODULE_SIGNING_KEY=${publicKeyOf(pem)}`);
  } else if (command === 'pubkey' && keyPath) {
    console.info(`VITE_MODULE_SIGNING_KEY=${publicKeyOf(readKey(keyPath))}`);
  } else if (command === 'sign' && keyPath && modulePath?.endsWith('.js')) {
    const meta = { id: flag(args, 'id'), version: flag(args, 'version'), api: flag(args, 'api') };
    const description = describeModule(readKey(keyPath), meta, new Uint8Array(readFileSync(modulePath)));
    const out = `${modulePath.slice(0, -3)}.json`;
    writeFileSync(out, `${JSON.stringify(description, null, 2)}\n`);
    console.info(`Wrote ${out}`);
  } else {
    console.info(readFileSync(import.meta.filename, 'utf8').split('\n').slice(0, 7).join('\n'));
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  }
}
