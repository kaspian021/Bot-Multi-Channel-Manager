#!/usr/bin/env bash
set -e

echo "Seeding database with FutureStack AI channel, topics, and drafts..."
npx tsx src/infrastructure/database/seed-runner.ts
