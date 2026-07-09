# RideGo — Ride Booking System

A C270 DevOps project: a ride booking web app with a **time-based price calculator** ($/hour, billed per hour, rounded up — minimum 1 hour).

## Problem Statement
Built for the LaunchLab brief: a "Services" category startup product (booking platform) demonstrating a full DevOps lifecycle — app development, version control, CI/CD, containerisation, and IaC.

## Features
- Browse vehicles, each with its own hourly rate (Compact Car $1/hr, SUV $2/hr, Motorbike $0.5/hr, Van $3/hr)
- Pick a start time and end time — price is calculated live via AJAX as you fill the form
- Submit a booking and see a confirmation page with total cost
- View / cancel bookings on a dashboard
- `/health` endpoint for monitoring and container health checks

## Tech Stack
- Node.js + Express (backend/routing)
- EJS (server-rendered views)
- In-memory data store (no DB setup needed to demo — easy to swap for SQLite/MySQL later)
- Docker (containerisation)
- GitHub Actions (CI/CD)
- Ansible (Infrastructure as Code)

## Running Locally
```bash
npm install
npm start
# visit http://localhost:3000
```

## Running Tests
```bash
npm test
```
Tests cover the core pricing logic: whole-hour billing, partial-hour rounding, minimum charge, different rates, and invalid input handling.

## Running with Docker
```bash
docker build -t ride-booking .
docker run -p 3000:3000 ride-booking
```
Or with Docker Compose:
```bash
docker compose up --build
```

## CI/CD Pipeline
`.github/workflows/ci-cd.yml` runs on every push/PR to `main`:
1. **Build & Test job** — installs dependencies, runs the automated test suite (validation gate — pipeline fails if tests fail)
2. **Docker Build job** — only runs if tests pass; builds the Docker image and verifies the container starts and responds on `/health`

This satisfies: automatic trigger on code changes → testing/validation → only successful builds proceed.

## Infrastructure as Code
`ansible/setup.yml` automates provisioning a server: installs Docker, Git, clones the repo, and brings the app up with Docker Compose — so deployment is repeatable and consistent across environments.
```bash
cd ansible
ansible-playbook -i inventory.ini setup.yml
```

## Pricing Logic
Price = `ceil(duration_in_hours) × ratePerHour`, with a 1-hour minimum charge — same logic as typical car rental pricing. Implemented in `app.js` as `calculatePrice()` and unit-tested in `tests/price.test.js`.

## Project Structure
```
ride-booking/
├── app.js                  # Express app + routes + pricing logic
├── views/                  # EJS templates
├── public/css/             # Styling
├── tests/                  # Automated tests (CI validation gate)
├── Dockerfile               # Container build
├── docker-compose.yml       # Local container orchestration
├── .github/workflows/       # CI/CD pipeline
└── ansible/                 # IaC: server provisioning
```

## Next Steps / Bonus Enhancements (not yet done)
- Swap in-memory storage for SQLite/MySQL for persistence
- Add user authentication
- Deploy to a cloud host (Render/Railway/EC2) and update the Ansible inventory with the real server IP
- Add Kubernetes manifests for orchestration
- Add a dependency vulnerability scan step to the pipeline (DevSecOps)
