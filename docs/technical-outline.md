# Party Game Technical Outline

**Platform:** Web (Mobile usable too)

# Technical Outline

## 1. High-Level Architecture

**Goal:** A low-latency, real-time multiplayer game that scales to zero when not in use (Cost = $0 idle).

- **Frontend:** **Next.js** (React)
    - *Hosting:* Vercel
    - *Role:* UI rendering, client-side state, game lobby management.
- **Real-Time Backend:** **PartyKit** (Cloudflare Workers / Durable Objects)
    - *Hosting:* PartyKit Cloud (Edge)
    - *Role:* Authoritative game server. Manages rooms, timers, player states, and bot injection. Persists only while the room is active.
- **Database:** **Neon** (Serverless PostgreSQL)
    - *Role:* Persistent storage for Questions, Answers, Themes, and Bot Data.
    - *Connection:* Accessed via HTTP/WebSockets (Serverless Driver) from PartyKit.

## 2. Database Schema

### `Themes`

Possible question themes

- `id`: UUID
- `slug`: unique enum value
- `display_name`: Display in game

### `Questions`

The prompts that appear on screen.

- `id`: UUID
- `prompt`: Text ("Name a country with J in its name")
- `theme_slug`: String ("geography", "pop-culture") - *Indexing this makes filtering themes fast.*
- `difficulty`: Integer (1-5) - *Helps with your "Question Selection Algorithm".*
- `answer_count`: Precalcualted no. valid answers

### `Answers`

Stores answers to questions

- `id`: UUID
- `question_id`: Foreign Key
- `display_text`: Text ("Japan") - *What shows up on the scoreboard.*
- `accepted_variants`: **JSONB** `["japan", "nippon", "jp"]`
    - *Why:* Neon/Postgres supports `JSONB`. This allows you to check if the user's input matches *any* of these strings instantly without complex joins.
    - We can have a fuzzy match run on answer validation on server too to account for typos and letter case
- `popularity_rank`: Integer (1 = Most common, 100 = Obscure)
    - *Why:* **This is for your Bot.**
    - *Logic:* If the bot is set to "Easy", it queries: `SELECT * FROM answers WHERE rank > 50`. If "Hard", it queries `WHERE rank < 5`.

```sql
-- 1. Themes (Geography, Pop Culture, etc.)
CREATE TABLE themes (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL, -- e.g. "geography"
    display_name TEXT NOT NULL
);

-- 2. Questions
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_slug TEXT REFERENCES themes(slug),
    prompt TEXT NOT NULL, -- "Name a country starting with J"
    difficulty INT DEFAULT 1, -- 1=Easy, 5=Hard
    answer_count_cache INT DEFAULT 0 -- Pre-calculated number of valid answers
);

-- 3. Answers (The Brains)
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id),
    display_text TEXT NOT NULL, -- "Japan"
    
    -- STORES VARIATIONS: ["japan", "jp", "nippon", "japon"]
    variants JSONB DEFAULT '[]', 
    
    -- BOT LOGIC: 1 = Most Common (USA), 100 = Obscure (Liechtenstein)
    popularity_rank INT DEFAULT 99 
);
```

## 3. PartyKit Server Logic (The "Room")

Each game room runs an isolated instance of a class.

### A. Game State Machine

The server holds a `gameState` variable that transitions as follows:

1. **`LOBBY`**:
    - Waiting for players.
    - Host settings (Bot: ON/OFF, Speed: 1x).
    - *Event:* `PLAYER_JOIN`, `UPDATE_SETTINGS`.
2. **`FETCH_ROUND`**:
    - Host clicks Start. Server queries Neon for a question + all its answers.
    - *Optimization:* Cache `answers` in RAM `this.currentRoundAnswers`. Do not hit DB again this round.
3. **`COUNTDOWN`**:
    - 3... 2... 1... (Synced via server ticks).
4. **`PLAYING`**:
    - Timer counts down (e.g., 30s).
    - Accepts `SUBMIT_ANSWER` events from clients.
    - *Bot Behavior:* Bot does nothing yet.
5. **`PROCESSING`**:
    - Timer hits 0. Inputs locked.
    - **Bot Injection:** Server picks an answer from `this.currentRoundAnswers` based on difficulty and injects it as a player.
    - **Validation:** Server normalizes user inputs and checks against `variants`.
    - **Duplicate Check:** If User A and User B submitted the same valid answer → Both get 0 points.
6. **`SCOREBOARD`**:
    - Broadcast results. Wait for Host to click "Next Round".

### B. The "Fuzzy Matching" Algorithm

Running inside PartyKit during the `PROCESSING` state:

TypeScript

`function normalize(input: string): string {
  // Remove punctuation, extra spaces, lowercase
  return input.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function checkAnswer(userInput, validAnswersDB) {
  const normalizedInput = normalize(userInput);
  
  // Find matching answer object from DB cache
  return validAnswersDB.find(answer => 
    answer.variants.some(v => normalize(v) === normalizedInput)
  );
}`

---

## 4. API & Event Protocol (WebSockets)

Communication between Client (Next.js) and Server (PartyKit).

### Client -> Server (JSON Payloads)

| Type | Payload | Description |
| --- | --- | --- |
| `JOIN_ROOM` | `{ name: "Alice", avatar: "img1" }` | User enters lobby. |
| `START_GAME` | `{ settings: { bot: true, theme: "geo" } }` | Host starts the game. |
| `SUBMIT` | `{ answer: "Japan" }` | User submits guess. |
| `HEARTBEAT` | `{}` | Keep connection alive (optional, PK handles mostly). |

### Server -> Client (Broadcasts)

| Type | Payload | Description |
| --- | --- | --- |
| `SYNC` | `{ state, players, timer }` | Full state dump (sent on reconnect). |
| `PLAYER_UPDATE` | `{ players: [...] }` | Someone joined/left. |
| `TICK` | `{ time: 29 }` | Server authoritative timer (1/sec). |
| `ROUND_END` | `{ results: [...], correct_answers: [...] }` | Reveal phase. |

## 5. The Bot Implementation

**Logic:** The bot does not "play" in real-time. It waits until the round is over (0:00) and injects an answer instantaneously before scoring calculation.

**Difficulty Algorithm:**

- **Easy Bot:** Select random answer where `popularity_rank` is between 20 and 50.
- **Medium Bot:** Select random answer where `popularity_rank` is between 5 and 20.
- **Chaos Bot:** Select random answer where `popularity_rank` is 1 (The most common answer).
    - *Effect:* This maximizes collisions. If the question is "Countries in North America" and Bot picks "USA", anyone who picked "USA" gets disqualified.

---

## 6. Frontend (Next.js) Flow

1. **Landing Page:**
    - Toggle tabs: Public/Private
    - Public tab:
        - Input nickname
        - Play button (random public lobby)
    - Private tab:
        - Input nickanme
        - Create → Creates new public lobby, user joins in
        - Code → Users can enter a code to join
2. **Lobby:**
    - WebSocket connects to `partykit.host/party/[roomCode]`.
    - List of players renders from `PLAYER_UPDATE` events.
    - Can copy link/code
3. **Game View:**
    - **Countdown Component:** Driven by `TICK` events.
    - **Input Field:** Controlled input. Local state for what the user is typing.
    - **Submission State:** When user presses Enter, show "Answer Submitted!" and disable input.
4. **Scoreboard:**
    - Table displaying: Player | Answer | Status (Unique/Duplicate/Wrong) | Points.
    - "Bot" is listed just like a human player.

---

## 7. Deployment Strategy (MVP)

1. **Database:**
    - Create **Neon** project (Free Tier).
    - Run SQL migration script to seed ~50 questions.
2. **Backend:**
    - `npx partykit deploy`.
    - Set Environment Variable: `DATABASE_URL` (Neon connection string).
3. **Frontend:**
    - `vercel deploy`.
    - Set Environment Variable: `NEXT_PUBLIC_PARTYKIT_HOST`.

## 8. Development Roadmap

1. **Day 1 (Core):** Setup PartyKit + Next.js. Get a counter syncing between two tabs.
2. **Day 2 (Data):** Setup Neon. Seed questions. Write the "Fetch Question" logic.
3. **Day 3 (Game Loop):** Implement the Timer, Input submission, and basic scoring (exact match only).
4. **Day 4 (Polish):** Implement "Fuzzy Matching" and the Bot logic. Add CSS/UI polish.