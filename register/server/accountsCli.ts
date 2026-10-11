// Account chores the installer runs in the register container: `bun register/server/accountsCli.ts <command>`.
//   gm <login>           creates a Game Master account; the password is read from stdin, never argv
//   lock-test-accounts   bans OpenMU's seeded test accounts that still use their default password
import postgres from 'postgres';
import { AccountState, createAccount, lockDefaultTestAccounts, validate } from './accounts';

const sql = postgres(process.env.DATABASE_URL || 'postgres://postgres:admin@127.0.0.1:5432/openmu', { max: 1 });
const [command, login] = process.argv.slice(2);

try {
  if (command === 'gm') {
    const password = (await Bun.stdin.text()).trim();
    const problem = validate({ username: login, password }) ?? (await createAccount(sql, login, password, AccountState.GameMaster));
    if (problem) {
      console.error(problem);
      process.exitCode = 1;
    } else {
      console.log(`created ${login}`);
    }
  } else if (command === 'lock-test-accounts') {
    const locked = await lockDefaultTestAccounts(sql);
    console.log(locked.length ? `locked ${locked.join(', ')}` : 'no default test accounts left');
  } else {
    console.error('usage: accountsCli.ts gm <login> | lock-test-accounts');
    process.exitCode = 2;
  }
} finally {
  await sql.end();
}
