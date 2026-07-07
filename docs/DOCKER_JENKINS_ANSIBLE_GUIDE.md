# Docker, Jenkins and Ansible Guide

This folder follows the same idea as Lesson 11, but it is adapted for the team's Node.js Bike Rental Wallet app.

## Run with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Login test email:

```text
alice@example.com
```

## Important Routes

- `/health` checks whether the container is running.
- `/login` logs in using the sample JSON user.
- `/wallet` shows credits and recent transactions.
- `/wallet/topup` lets the user add credits.
- `/wallet/pass` lets the user spend credits.
- `/wallet/history` shows transaction history.

## Jenkins Pipeline

The `Jenkinsfile` does this flow:

1. Checkout code from GitHub.
2. Install Node.js dependencies.
3. Run basic validation tests.
4. Build a Docker image.
5. Start the container and test `/health`.
6. Optionally deploy using Ansible on the `main` branch.

## Ansible

The Ansible playbook is in `ansible/deploy.yml`. It builds the Docker image and runs the app locally.

```bash
ansible-playbook -i ansible/hosts ansible/deploy.yml
```
