# RL 6Mans West — Scrim Scheduler

A dark-themed Next.js 14 scrim scheduler for the RL 6Mans West Discord server.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# fill in TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
```

Get a free database at [turso.tech](https://turso.tech).

### 3. Create the database table

```bash
npm run db:setup
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How it works

| First visit | A modal asks you to pick **Dogs** or **Cats**. The choice is saved in `localStorage`. |
|---|---|
| **Scrim Board** (`/`) | Browse open scrims and **Accept** one, or click **+ Post Scrim** to create your own. |
| **My Scrims** (`/my-scrims`) | See your **Pending** scrims (home team can Confirm or Cancel) and **Confirmed** scrims. |

### Scrim lifecycle

```
open → (away team accepts) → pending → (home team confirms) → confirmed
```

## API

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/scrims?status=open` | List open scrims |
| `GET` | `/api/scrims?team=Dogs` | List all scrims for a team |
| `POST` | `/api/scrims` | Post a new scrim |
| `POST` | `/api/scrims/[id]/accept` | Accept an open scrim |
| `POST` | `/api/scrims/[id]/confirm` | Confirm a pending scrim |
| `DELETE` | `/api/scrims/[id]` | Cancel/delete a scrim |

## Stack

- **Next.js 14** — App Router, Server Components, Route Handlers
- **Turso** (`@libsql/client`) — edge SQLite database
- **Tailwind CSS** — dark theme utility classes
