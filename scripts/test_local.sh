#!/usr/bin/env sh
set -e
npm ci
npm test
docker compose up --build -d
sleep 5
wget -qO- http://localhost:3000/health
echo "\nLocal test completed. Open http://localhost:3000"
