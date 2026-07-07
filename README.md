# C270 Bike Rental Wallet App — Version 4 DevOps

This is a clean Docker-ready version of the Bike Rental Wallet feature for CA2.
It is based on the team's second version and adapted using the Lesson 11 Docker/Jenkins/Ansible structure.

## Wallet Feature

Users can:

- View available wallet credits
- Top up credits
- Spend credits by buying a Single Trip or Day Pass
- View wallet transaction history

## Tech Stack

- Node.js
- Express.js
- EJS
- JSON file storage
- Docker
- Docker Compose
- Jenkins
- Ansible

## Run Locally Without Docker

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Run With Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Login with:

```text
alice@example.com
```

## Run Tests

```bash
npm test
```

## DevOps Files

- `Dockerfile` packages the Node.js app into a container.
- `docker-compose.yml` runs the app on port 3000 and keeps JSON data persistent.
- `Jenkinsfile` automates install, test, Docker build and smoke testing.
- `ansible/deploy.yml` automates local Docker deployment.
- `docs/DOCKER_JENKINS_ANSIBLE_GUIDE.md` explains how to present the DevOps part.

## Health Check

```text
http://localhost:3000/health
```

Expected result:

```json
{"status":"ok","service":"bike-rental-wallet"}
```
