# Knockouts - Party Game

A real-time multiplayer trivia game built with PartyKit, Next.js, and Tailwind CSS.

## Architecture

- **Frontend**: Next.js 16 with Tailwind CSS v4
- **Backend**: PartyKit (Cloudflare Workers / Durable Objects)
- **Database**: PostgreSQL (serverless on Supabase)

## Setup

### Prerequisites

- Node.js 18+
- Neon database account
- PartyKit account (for deployment)

### Installation

1. **Server Setup**:
```bash
cd game
npm install
cp .env.example .env
# Add your DATABASE_URL to .env
```

2. **Frontend Setup**:
```bash
cd web
npm install
cp .env.example .env.local
# Add NEXT_PUBLIC_PARTYKIT_HOST to .env.local
```

### Database Migration

Run the migration script against your Neon database:

```bash
cd game/migrations
./migrate.sh # applies all migrations in order
./migrate.sh one <name-of-migration> # applies a singular migration
```

### Development

**Start PartyKit server**:
```bash
cd game
npm run dev
```

**Start Next.js frontend**:
```bash
cd web
npm run dev
```

Visit `http://localhost:3000` to play.

### Deployment

**Deploy PartyKit server**:
```bash
cd game
npx partykit deploy
```

**Debug live after deployment**:
```bash
npx partykit tail
```

**Add environment variables**:
```bash
npx partykit env add API_KEY # will prompt for value
npx partykit deploy
```
See [docs](https://docs.partykit.io/guides/managing-environment-variables) for more details

**Deploy Next.js frontend**:
```bash
cd web
vercel deploy
```

## Project Structure

```
knockouts/
├── shared/            # Shared types used by web + game
│   └── types.ts
├── game/              # PartyKit server
│   ├── src/
│   │   ├── server.ts  # Game state machine
│   │   ├── db.ts      # Database queries
│   │   ├── validation.ts
│   └── migrations/
└── web/               # Next.js frontend
    ├── app/
    ├── components/
    ├── hooks/
    └── lib/
```

## Automation scripts

### Generate questions
```
python3.11 generate_questions.py <mode=all|test> <theme> <difficulty> [count]
```

### Backfill questions
```
python3.11 backfill_questions.py ../generate-questions/results/questions_HISTORY_None_1.json     
--dry-run
```

Optional flags:

`--replace-answers` to delete existing answers for matched questions and reinsert
`--dry-run` to validate JSON only
`--database-url` to override env
