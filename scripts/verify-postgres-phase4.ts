// Runs the concurrency/transaction hardening suite against a real PostgreSQL URL.
// PGlite is intentionally rejected: this command is evidence for the external
// PostgreSQL path, not a substitute for it.
import { execFileSync } from 'child_process';

const connection = process.env.DATABASE_CONNECTION_STRING || '';
if (!/^postgres(?:ql)?:\/\//i.test(connection)) {
  console.error('DATABASE_CONNECTION_STRING must be a postgresql:// URL. External PostgreSQL verification was not run.');
  process.exit(2);
}
console.log('Running Phase 4 PostgreSQL transaction/concurrency verification…');
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vitest', 'run', 'tests/phase4-hardening.test.ts'], {
  cwd: process.cwd(), stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' },
});
