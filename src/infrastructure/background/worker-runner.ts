// ==============================================================
// Standalone Worker Process Runner
// ==============================================================

import { runMigrations } from '../database/migrations';
import { seedDatabase } from '../database/seed';
import { getBackgroundJobOrchestrator } from './job-orchestrator';

async function runWorker() {
  console.log('--- AI Multi-Channel Manager Worker Starting ---');
  await runMigrations();
  await seedDatabase(false);

  const orchestrator = getBackgroundJobOrchestrator();
  orchestrator.startPeriodicWorker(15000);

  console.log('Worker is active and polling for background jobs.');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    orchestrator.stopWorker();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    orchestrator.stopWorker();
    process.exit(0);
  });
}

runWorker().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
