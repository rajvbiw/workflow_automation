# Workflow Automation Engine (Zapier Lite)

## Run with Docker Compose

1. Clone the repository.
2. Run `docker-compose up --build`
3. Access frontend at http://localhost
4. Login with `admin@example.com` / `admin` (or register a new user via API)

## Features
- Webhook triggers (POST to `/api/webhook/{path}`)
- Schedule triggers (cron)
- Actions: HTTP request, Create Task (mock)
- Execution history

## Without Docker (dev)
See individual backend/frontend READMEs.