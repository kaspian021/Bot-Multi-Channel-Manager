#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting AI Channel Manager in DEMO_MODE"
echo "=========================================================="

export DEMO_MODE=true
export PORT=3000

echo "[1/3] Running database migrations and seeding demo data..."
npm run seed

echo "[2/3] Running automated acceptance test suite..."
npm run test:acceptance

echo "[3/3] Starting web dashboard and API server..."
npm run start
