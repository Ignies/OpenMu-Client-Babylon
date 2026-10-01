import { describe, expect, it } from 'vitest';
import { stamp, withoutPostgresRole } from './backup';

describe('backup', () => {
  it('keeps every role but postgres', () => {
    const dump = ['CREATE ROLE account;', "ALTER ROLE account WITH LOGIN PASSWORD 'x';", 'CREATE ROLE postgres;', 'ALTER ROLE postgres WITH SUPERUSER;'].join('\n');
    expect(withoutPostgresRole(dump)).toBe("CREATE ROLE account;\nALTER ROLE account WITH LOGIN PASSWORD 'x';");
  });

  it('names folders so they sort by time', () => {
    expect(stamp(new Date('2026-10-01T13:05:09.123Z'))).toBe('2026-10-01T13-05-09');
  });
});
