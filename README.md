# InboxPilot

Lightweight outbound email CRM with AI-assisted copy for small teams.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + shadcn/ui
- **Backend:** FastAPI (Python) + SQLAlchemy
- **Database:** PostgreSQL 15
- **Auth:** Clerk
- **AI:** OpenAI API
- **Email:** MailHog (dev) / SMTP (prod)

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Poetry (Python package manager)

## Quick Start

### 1. Clone and setup environment

```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit the `.env` files with your actual values (see Environment Variables section below).

### 2. Start infrastructure

```bash
# Start PostgreSQL and MailHog
docker-compose up -d
```

### 3. Setup backend

```bash
cd backend

# Create virtual environment and install dependencies
poetry install

# Run database migrations
poetry run alembic upgrade head

# Start the API server
poetry run uvicorn app.main:app --reload --port 8000
```

### 4. Setup frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Access the app

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **MailHog UI:** http://localhost:8025

## Environment Variables

### Root `.env`

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=inboxpilot
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inboxpilot
```

### Backend `backend/.env`

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inboxpilot
OPENAI_API_KEY=sk-...
CLERK_JWKS_URL=https://your-clerk.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://your-clerk.clerk.accounts.dev
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
FROM_EMAIL=noreply@inboxpilot.local
```

### Frontend `frontend/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

## Project Structure

```
autodock-demo-app/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Config, DB, auth, email
│   │   ├── services/       # Business logic
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── migrations/         # Alembic migrations
│   └── pyproject.toml
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities, API client
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Features

- **Contacts:** Create and manage outbound contacts
- **Sequences:** Build multi-step email sequences with delays
- **AI Rewrite:** Use OpenAI to improve email copy
- **Activity Feed:** Track all actions in your workspace
- **Test Emails:** Send test emails via MailHog

## License

MIT
