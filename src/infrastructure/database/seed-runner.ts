// ==============================================================
// Database Seed Script Runner
// ==============================================================

import { seedDatabase } from './seed';
import { getDatabaseClient } from './db-client';

async function main() {
  console.log('Running database migrations and seed...');
  try {
    await seedDatabase(false);
    console.log('Database successfully migrated and seeded!');
    await getDatabaseClient().close();
    process.exit(0);
  } catch (err) {
    console.error('Database migration/seed error:', err);
    process.exit(1);
  }
}

main();
