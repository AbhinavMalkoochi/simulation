# AgentWorld: Living AI Society Simulation — Complete Project Context

> **Purpose of this document:** This file provides an exhaustive reference for any LLM or developer picking up this project. It covers every file, every function, every data model, every data flow, every design decision, and every known issue in granular detail. Read this before touching any code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Repository Structure](#3-repository-structure)
4. [Configuration Files](#4-configuration-files)
5. [Database Schema (Convex)](#5-database-schema-convex)
6. [Backend: Convex Functions](#6-backend-convex-functions)
   - 6.1 [World Management](#61-world-management)
   - 6.2 [Initialization](#62-initialization)
   - 6.3 [Agent Public Queries](#63-agent-public-queries)
   - 6.4 [Events](#64-events)
   - 6.5 [God Mode](#65-god-mode)
   - 6.6 [Interview System](#66-interview-system)
   - 6.7 [Cron Jobs](#67-cron-jobs)
   - 6.8 [Analytics](#68-analytics)
7. [Engine Layer](#7-engine-layer)
   - 7.1 [Game Loop (Tick System)](#71-game-loop-tick-system)
   - 7.2 [Pathfinding](#72-pathfinding)
8. [Agent Cognitive Architecture](#8-agent-cognitive-architecture)
   - 8.1 [Brain (Think & Reflect)](#81-brain-think--reflect)
   - 8.2 [Agent Tools](#82-agent-tools)
   - 8.3 [Agent Actions (Mutations)](#83-agent-actions-mutations)
   - 8.4 [Memory System](#84-memory-system)
   - 8.5 [Prompt Engineering](#85-prompt-engineering)
   - 8.6 [Agent Context Queries](#86-agent-context-queries)
9. [World Systems](#9-world-systems)
   - 9.1 [Inventory Management](#91-inventory-management)
   - 9.2 [Crafting & Building Recipes](#92-crafting--building-recipes)
   - 9.3 [Weather, Regen, Building Effects](#93-weather-regen-building-effects)
10. [Social Systems](#10-social-systems)
    - 10.1 [Relationships](#101-relationships)
    - 10.2 [Alliances & Governance](#102-alliances--governance)
    - 10.3 [Trading](#103-trading)
11. [Shared Libraries](#11-shared-libraries)
    - 11.1 [Constants](#111-constants)
    - 11.2 [Map Generation](#112-map-generation)
12. [Frontend Architecture](#12-frontend-architecture)
    - 12.1 [Entry Point & App Shell](#121-entry-point--app-shell)
    - 12.2 [PixiJS World Renderer](#122-pixijs-world-renderer)
    - 12.3 [Toolbar](#123-toolbar)
    - 12.4 [Sidebar & Tabs](#124-sidebar--tabs)
    - 12.5 [Agent Inspector](#125-agent-inspector)
    - 12.6 [Event Feed](#126-event-feed)
    - 12.7 [Social Graph](#127-social-graph)
    - 12.8 [Economy Dashboard](#128-economy-dashboard)
    - 12.9 [Newspaper](#129-newspaper)
    - 12.10 [God Mode Panel](#1210-god-mode-panel)
    - 12.11 [Interview Chat](#1211-interview-chat)
13. [Complete API Reference](#13-complete-api-reference)
14. [Data Flow Diagrams](#14-data-flow-diagrams)
15. [Agent Personalities & Seed Data](#15-agent-personalities--seed-data)
16. [Known Issues & Technical Debt](#16-known-issues--technical-debt)
17. [Design Decisions & Rationale](#17-design-decisions--rationale)

---

## 1. Project Overview

AgentWorld is a browser-based, real-time AI agent simulation where 10 autonomous agents powered by GPT-4o-mini inhabit a procedurally generated 2D tile-based world. Agents perceive their surroundings, form memories, reflect on experiences, develop relationships, create alliances with governance systems, trade resources, craft items, build structures, and exhibit emergent social behavior. The entire simulation runs server-side on Convex with a PixiJS-rendered frontend observatory UI.

**Core loop:**
1. A cron job fires every 3 seconds, advancing the world tick
2. The tick handler moves agents along paths, manages energy, and schedules LLM calls for idle agents
3. Scheduled LLM actions (`think` and `reflect`) give agents their full context as a system prompt and let GPT-4o-mini choose from 17 tools
4. Tool calls execute as Convex internal mutations, modifying world state in real-time
5. The React frontend subscribes to Convex queries and reactively renders all changes

**Git remote:** `https://github.com/AbhinavMalkoochi/simulation.git`

---

## 2. Tech Stack & Dependencies

### Runtime Dependencies (`package.json`)
| Package | Version | Purpose |
|---------|---------|---------|
| `convex` | ^1.31.7 | Backend-as-a-service: real-time database, mutations, queries, actions, cron jobs, scheduler |
| `@convex-dev/agent` | ^0.3.2 | Convex agent component (registered in `convex.config.ts`, provides infrastructure) |
| `ai` | ^6.0.73 | Vercel AI SDK — `generateText` function for LLM calls |
| `@ai-sdk/openai` | ^3.0.25 | OpenAI provider for AI SDK — exposes `openai("gpt-4o-mini")` |
| `react` | ^19.2.0 | UI framework |
| `react-dom` | ^19.2.0 | React DOM renderer |
| `pixi.js` | ^8.16.0 | WebGL 2D rendering for the tile world, agents, resources, buildings |
| `tailwindcss` | ^4.1.18 | Utility-first CSS (v4, uses `@tailwindcss/vite` plugin) |
| `@tailwindcss/vite` | ^4.1.18 | Tailwind Vite integration |
| `zod` | ^4.3.6 | Schema validation (used in AI SDK tool parameter definitions) |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^7.2.4 | Frontend build tool & dev server |
| `@vitejs/plugin-react` | ^5.1.1 | React Fast Refresh for Vite |
| `typescript` | ~5.9.3 | TypeScript compiler |
| `eslint` | ^9.39.1 | Linting |
| `typescript-eslint` | ^8.46.4 | TypeScript ESLint rules |
| `eslint-plugin-react-hooks` | ^7.0.1 | React hooks linting |
| `eslint-plugin-react-refresh` | ^0.4.24 | React Refresh linting |
| `globals` | ^16.5.0 | Global variable definitions for ESLint |
| `@types/react` | ^19.2.5 | React type definitions |
| `@types/react-dom` | ^19.2.3 | React DOM type definitions |
| `@types/node` | ^24.10.1 | Node.js type definitions |

### Scripts
```
npm run dev          # Start Vite dev server (frontend only)
npm run dev:convex   # Start Convex dev server (backend, connects to cloud)
npm run build        # TypeScript check + Vite production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Environment Variables
- `VITE_CONVEX_URL` — Convex deployment URL (set in `.env.local`, template in `.env.example`)
- `OPENAI_API_KEY` — Must be set in Convex dashboard environment variables (used by `@ai-sdk/openai` in Convex actions)

---

## 3. Repository Structure

```
agent-world/
├── convex/                          # Convex backend
│   ├── _generated/                  # Auto-generated (gitignored)
│   ├── agents/                      # Agent cognitive system
│   │   ├── actions.ts               # 12 internal mutations for agent behaviors
│   │   ├── brain.ts                 # LLM think/reflect actions + tool definitions
│   │   ├── memory.ts                # Memory storage, scoring, retrieval
│   │   ├── prompts.ts               # System prompt construction
│   │   └── queries.ts               # Internal queries for agent context
│   ├── analytics/                   # Dashboard data
│   │   ├── newspaper.ts             # News headline generation
│   │   └── stats.ts                 # Economy and social statistics
│   ├── engine/                      # Core simulation engine
│   │   ├── pathfinding.ts           # A* pathfinding implementation
│   │   └── tick.ts                  # Main game loop (runs every 3s)
│   ├── lib/                         # Shared utilities (used by both backend & frontend)
│   │   ├── constants.ts             # Map dimensions, tile types, colors
│   │   └── mapgen.ts                # Procedural terrain generation (value noise)
│   ├── social/                      # Social systems
│   │   ├── alliances.ts             # Alliance creation, invitations, proposals, voting
│   │   ├── relationships.ts         # Trust/affinity relationship management
│   │   └── trading.ts               # Trade proposal and response system
│   ├── world/                       # World systems
│   │   ├── inventory.ts             # Item add/remove/check/get helpers
│   │   ├── recipes.ts               # Crafting recipes and building costs
│   │   └── systems.ts               # Weather transitions, resource regen, building effects
│   ├── agents.ts                    # Public agent queries (list, getById, etc.)
│   ├── convex.config.ts             # Convex app definition + agent component
│   ├── crons.ts                     # Cron job: game tick every 3 seconds
│   ├── events.ts                    # Public event query (recent 50)
│   ├── god.ts                       # God mode mutations (weather, spawn, reset)
│   ├── init.ts                      # World seeding mutation
│   ├── interview.ts                 # Interview action (chat with agents)
│   ├── schema.ts                    # Full database schema (12 tables)
│   ├── tsconfig.json                # Convex TypeScript config
│   └── world.ts                     # Public world queries + togglePause
├── src/                             # Frontend (React + PixiJS)
│   ├── components/
│   │   ├── panels/                  # Sidebar panels
│   │   │   ├── AgentInspector.tsx   # Detailed agent view
│   │   │   ├── EconomyDashboard.tsx # Resource & wealth display
│   │   │   ├── EventFeed.tsx        # Filterable event log
│   │   │   ├── GodMode.tsx          # Dev tools panel
│   │   │   ├── InterviewChat.tsx    # Chat with agents
│   │   │   ├── Newspaper.tsx        # News summary display
│   │   │   ├── Sidebar.tsx          # Main sidebar with tabs
│   │   │   └── SocialGraph.tsx      # Force-directed relationship graph
│   │   ├── ui/
│   │   │   └── Toolbar.tsx          # Top bar with controls & stats
│   │   └── world/
│   │       ├── GameWorld.ts         # PixiJS rendering class
│   │       └── WorldCanvas.tsx      # React wrapper for PixiJS
│   ├── App.tsx                      # Root application component
│   ├── index.css                    # Tailwind imports + base styles
│   └── main.tsx                     # React entry point with ConvexProvider
├── index.html                       # HTML shell
├── package.json                     # Dependencies & scripts
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # Root TypeScript config (references)
├── tsconfig.app.json                # App TypeScript config (includes src + convex/lib)
├── tsconfig.node.json               # Node TypeScript config (vite.config.ts)
├── eslint.config.js                 # ESLint configuration
├── .env.example                     # Environment template
├── .gitignore                       # Git exclusions
└── README.md                        # Setup instructions
```

---

## 4. Configuration Files

### `vite.config.ts`
Uses `@vitejs/plugin-react` for React Fast Refresh and `@tailwindcss/vite` for Tailwind CSS 4 integration. No special aliases or proxy settings.

### `tsconfig.app.json`
**Critical:** The `include` array contains both `"src"` and `"convex/lib"`. This allows the frontend to directly import shared utilities from `convex/lib/constants.ts` and `convex/lib/mapgen.ts` for client-side map rendering without duplicating code.

### `convex/convex.config.ts`
Registers the `@convex-dev/agent` component via `app.use(agent)`. This component provides infrastructure but the project uses direct AI SDK calls (`generateText`) rather than the agent abstraction's thread system, to maintain granular control over memory and prompts.

---

## 5. Database Schema (Convex)

File: `convex/schema.ts` — 12 tables total.

### 5.1 `worldState` — Singleton world configuration
| Field | Type | Description |
|-------|------|-------------|
| `tick` | `number` | Current simulation tick (increments by 1 each game loop) |
| `timeOfDay` | `number` | 0–24 float; increments by 0.5 each tick (so 48 ticks = full day) |
| `weather` | `"clear" \| "rain" \| "storm" \| "fog"` | Current weather state |
| `season` | `"spring" \| "summer" \| "autumn" \| "winter"` | Current season (set to "spring" on init, never changes currently) |
| `mapWidth` | `number` | Map width in tiles (50) |
| `mapHeight` | `number` | Map height in tiles (50) |
| `mapSeed` | `number` | Seed for procedural generation (42) |
| `tileSize` | `number` | Pixel size per tile (32) |
| `paused` | `boolean` | Whether simulation is paused (starts `true`) |

### 5.2 `agents` — Agent entities
**Index:** `by_status` on `["status"]`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name (e.g., "Luna", "Kai") |
| `backstory` | `string` | 1-sentence backstory injected into LLM prompt |
| `personality` | `object` | Big Five (OCEAN): `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism` — each 0.0–1.0 |
| `position` | `{x, y}` | Current tile coordinates |
| `targetPosition` | `{x, y}?` | Destination coordinates (set when pathing) |
| `path` | `{x, y}[]?` | Remaining path steps (consumed one per tick) |
| `energy` | `number` | 0–100; depleted by movement (0.3/tick), actions (3–10); recovered by sleeping (5/tick) or eating (10–25) |
| `emotion` | `{valence, arousal}` | Valence: -1 to 1 (sad↔happy); Arousal: 0 to 1 (calm↔excited). Updated slightly after each think cycle |
| `currentPlan` | `string?` | LLM-set plan text, persists across ticks |
| `currentAction` | `string?` | Short-term action label |
| `status` | `"idle" \| "moving" \| "talking" \| "working" \| "sleeping" \| "exploring"` | Current behavioral state |
| `skills` | `object` | `gathering`, `crafting`, `building`, `trading`, `leadership` — each 0–5 |
| `spriteSeed` | `number` | 0–9 index for deterministic color assignment |

### 5.3 `memories` — Agent memory stream
**Indexes:** `by_agent` on `["agentId"]`, `by_agent_type` on `["agentId", "type"]`
**Vector Index:** `by_embedding` — 1536 dimensions, filtered by `agentId` (defined but not actively used for retrieval)

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | `Id<"agents">` | Owner agent |
| `type` | `"observation" \| "reflection" \| "plan" \| "conversation"` | Memory category |
| `content` | `string` | Human-readable memory text |
| `importance` | `number` | 1–10 scale; observations=3, plans=4, conversations=5, gifts=6, reflections=8 |
| `embedding` | `float64[]?` | Optional 1536-dim vector (schema supports it, not currently populated) |
| `tick` | `number` | Tick when memory was created |

### 5.4 `relationships` — Directed agent-to-agent relationships
**Indexes:** `by_agent` on `["agentId"]`, `by_pair` on `["agentId", "targetAgentId"]`

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | `Id<"agents">` | Source agent |
| `targetAgentId` | `Id<"agents">` | Target agent |
| `trust` | `number` | -1 to 1; modified by interactions (+0.05 to +0.15 for positive, -0.05 for negative) |
| `affinity` | `number` | -1 to 1; how much source likes target |
| `interactionCount` | `number` | Total interactions between pair |
| `lastInteractionTick` | `number` | Tick of most recent interaction |

### 5.5 `resources` — World resource nodes
**Indexes:** `by_position` on `["tileX", "tileY"]`, `by_type` on `["type"]`

| Field | Type | Description |
|-------|------|-------------|
| `tileX`, `tileY` | `number` | Tile coordinates |
| `type` | `"wood" \| "stone" \| "food" \| "metal" \| "herbs"` | Resource type |
| `quantity` | `number` | Current available amount |
| `maxQuantity` | `number` | Maximum regeneration cap |
| `regenRate` | `number` | Amount regenerated per cycle (defined but `regenerateResources` not called in tick) |

### 5.6 `inventory` — Agent item storage
**Indexes:** `by_agent` on `["agentId"]`, `by_agent_item` on `["agentId", "itemType"]`

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | `Id<"agents">` | Owner agent |
| `itemType` | `string` | Item name (e.g., "wood", "stone_tools", "meal") |
| `quantity` | `number` | Stack count |

### 5.7 `buildings` — Constructed structures
**Indexes:** `by_position` on `["posX", "posY"]`, `by_owner` on `["ownerId"]`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"shelter" \| "workshop" \| "market" \| "meetingHall" \| "farm" \| "storehouse"` | Building type |
| `posX`, `posY` | `number` | Tile position |
| `ownerId` | `Id<"agents">?` | Builder/owner |
| `allianceId` | `Id<"alliances">?` | Alliance ownership |
| `condition` | `number` | Building health (starts at 100) |
| `level` | `number` | Upgrade level (starts at 1) |

### 5.8 `alliances` — Player-formed groups
**Index:** `by_founder` on `["founderId"]`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Alliance name |
| `founderId` | `Id<"agents">` | Founding agent |
| `memberIds` | `Id<"agents">[]` | All member IDs |
| `rules` | `string[]` | Passed governance rules (added via voting) |
| `description` | `string?` | Auto-generated description |

### 5.9 `proposals` — Alliance governance proposals
**Indexes:** `by_alliance` on `["allianceId"]`, `by_status` on `["status"]`

| Field | Type | Description |
|-------|------|-------------|
| `allianceId` | `Id<"alliances">` | Parent alliance |
| `proposerId` | `Id<"agents">` | Agent who proposed |
| `content` | `string` | Rule text being proposed |
| `votes` | `{agentId, vote: boolean}[]` | Recorded votes |
| `status` | `"pending" \| "passed" \| "rejected"` | Resolution state |
| `tick` | `number` | Creation tick |

**Voting mechanism:** Majority of `alliance.memberIds.length` required. Proposer auto-votes yes. Status resolves immediately when majority threshold is met.

### 5.10 `trades` — Resource exchange offers
**Indexes:** `by_initiator` on `["initiatorId"]`, `by_responder` on `["responderId"]`

| Field | Type | Description |
|-------|------|-------------|
| `initiatorId` | `Id<"agents">` | Offering agent |
| `responderId` | `Id<"agents">` | Target agent |
| `offer` | `{itemType, quantity}[]` | Items being offered |
| `request` | `{itemType, quantity}[]` | Items being requested |
| `status` | `"pending" \| "accepted" \| "rejected" \| "expired"` | Trade state |
| `tick` | `number` | Creation tick |

### 5.11 `conversations` — Multi-message dialogues
**Index:** `by_start` on `["startTick"]`

| Field | Type | Description |
|-------|------|-------------|
| `participantIds` | `Id<"agents">[]` | Agents involved |
| `messages` | `{speakerId, content, tick}[]` | Ordered message list |
| `startTick` | `number` | When conversation began |
| `endTick` | `number?` | When conversation ended (null = active) |

### 5.12 `worldEvents` — Global event log
**Indexes:** `by_tick` on `["tick"]`, `by_type` on `["type"]`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Event category: `world_created`, `tick_summary`, `conversation`, `trade`, `alliance`, `governance`, `build`, `gather`, `craft`, `gift`, `god_action` |
| `description` | `string` | Human-readable event text |
| `involvedAgentIds` | `Id<"agents">[]` | Agents involved |
| `tick` | `number` | Event tick |

---

## 6. Backend: Convex Functions

### 6.1 World Management (`convex/world.ts`)

| Function | Type | Args | Returns | Description |
|----------|------|------|---------|-------------|
| `getState` | `query` | none | `worldState \| null` | Returns singleton world state for frontend |
| `getStateInternal` | `internalQuery` | none | `worldState \| null` | Same but for internal use by actions |
| `togglePause` | `mutation` | none | void | Flips `paused` boolean on worldState |
| `getResources` | `query` | none | `resources[]` | All resource nodes |
| `getBuildings` | `query` | none | `buildings[]` | All buildings |
| `getInventory` | `query` | `{agentId}` | `inventory[]` | Agent's inventory items |
| `getAlliances` | `query` | none | `alliances[]` | All alliances |
| `getRelationships` | `query` | none | `relationships[]` | All relationships (used by social graph) |

### 6.2 Initialization (`convex/init.ts`)

**`seedWorld`** (mutation, no args):
- Checks if `worldState` already exists; if so, returns existing ID (idempotent)
- Creates `worldState` with tick=0, timeOfDay=8, weather="clear", season="spring", paused=true
- Generates map using `generateMap(42, 50, 50)`
- Spawns 10 agents at random walkable positions using seeded PRNG
- Seeds resources: 15% chance of wood/stone on forest/stone tiles; 5% chance of food/herbs on grass; 3% chance of metal on stone
- Creates initial "world_created" event

### 6.3 Agent Public Queries (`convex/agents.ts`)

| Function | Type | Args | Returns |
|----------|------|------|---------|
| `list` | `query` | none | All agents |
| `getById` | `query` | `{agentId}` | Single agent |
| `getConversations` | `query` | `{agentId}` | Last 20 conversations involving agent |
| `getMemories` | `query` | `{agentId, limit?}` | Last N memories for agent (default 20) |

### 6.4 Events (`convex/events.ts`)

**`recent`** (query): Returns last 50 world events ordered by tick descending.

### 6.5 God Mode (`convex/god.ts`)

| Function | Type | Args | Description |
|----------|------|------|-------------|
| `changeWeather` | `mutation` | `{weather}` | Sets weather + creates god_action event |
| `spawnResource` | `mutation` | `{tileX, tileY, type, quantity}` | Inserts new resource node |
| `setSpeed` | `mutation` | `{paused}` | Directly sets pause state |
| `resetWorld` | `mutation` | none | Deletes ALL documents from ALL 12 tables |

### 6.6 Interview System (`convex/interview.ts`)

**`ask`** (public action, `{agentId, question}`):
1. Fetches full thinking context via `getThinkingContext`
2. Scores memories using `scoreMemories`
3. Builds system prompt using `buildSystemPrompt` (with relationships/alliances/trades/proposals set to empty arrays)
4. Appends interview instructions: "A human observer is interviewing you. Respond in character..."
5. Calls `generateText` with GPT-4o-mini, maxSteps=1
6. Returns the text response (or fallback error message)

### 6.7 Cron Jobs (`convex/crons.ts`)

Single cron: `"game tick"` fires every 3 seconds, calls `internal.engine.tick.run`.

### 6.8 Analytics

**`convex/analytics/stats.ts`:**
- `getEconomyStats` (query): Aggregates resource totals from `resources` table, calculates per-agent wealth from `inventory`, counts trades by status
- `getSocialStats` (query): Counts relationships, average trust, alliance count, conversation count

**`convex/analytics/newspaper.ts`:**
- `getLatestSummary` (query): Takes last 30 events, filters out `tick_summary`, derives a headline using rule-based `deriveHeadline()` function (checks for alliance → trade → build → conversation → gift events), formats body as bullet list of event descriptions

---

## 7. Engine Layer

### 7.1 Game Loop (Tick System)

File: `convex/engine/tick.ts` — `run` (internalMutation)

**Execution flow per tick:**

1. **Guard:** If no worldState or paused, return immediately
2. **Advance clock:** `tick += 1`, `timeOfDay = (timeOfDay + 0.5) % 24`
3. **Regenerate map** from seed (deterministic, needed for walkability checks)
4. **Create seeded PRNG** from `tick + seed` for reproducible randomness
5. **For each agent:**
   - **If has path:** Pop first step, update position, consume 0.3 energy, set status to "moving" or "idle" if path exhausted
   - **If sleeping:** Recover 5 energy per tick, wake up (status → "idle") when energy ≥ 90
   - **If should think** (`tick % 5 === abs(spriteSeed) % 5` — staggered per agent) **and idle:**
     - Schedule `internal.agents.brain.think` with random 0–3000ms jitter
     - Every 20 ticks, also schedule `internal.agents.brain.reflect` with jitter + 2000ms
   - **If talking:** Reset to idle (conversations complete in one tick)
   - **If idle and not thinking:** 40% chance to wander — pick random point within radius 3–7, A* pathfind, start moving
6. **Every 20 ticks:** Insert `tick_summary` world event

**Key timing details:**
- Think frequency: Every 5 ticks per agent (staggered by `spriteSeed`), so roughly every 15 seconds per agent
- Reflect frequency: Every 20 ticks (60 seconds), only if accumulated importance ≥ 80
- Random jitter on scheduled actions prevents simultaneous LLM calls

### 7.2 Pathfinding

File: `convex/engine/pathfinding.ts` — `findPath(start, goal, mapTiles, mapWidth, mapHeight, maxIterations=500)`

**Algorithm:** A* with Manhattan distance heuristic

- Uses `Map<string, {...}>` for open set (not a priority queue — linear scan for best F score)
- 4-directional movement (no diagonals)
- Checks `isWalkable` for each neighbor
- Returns `Position[]` from start to goal inclusive, or empty array if no path
- Max 500 iterations to prevent runaway computation

---

## 8. Agent Cognitive Architecture

### 8.1 Brain (Think & Reflect)

File: `convex/agents/brain.ts`

#### `think` (internalAction, `{agentId}`)

1. Fetch comprehensive context via `getThinkingContext` internal query
2. Destructure: agent, world, memories, nearbyAgents, pendingConversations, nearbyResources, inventory, nearbyBuildings, relationships, myAlliances, myPendingProposals, pendingTrades
3. Resolve relationship target names by querying each target agent
4. Score memories using `scoreMemories(memories, tick)` — top 12 by score
5. Build system prompt via `buildSystemPrompt` (see §8.5)
6. Build 17 tools via `buildTools` (see §8.2)
7. Call `generateText({ model: openai("gpt-4o-mini"), system: systemPrompt, prompt: "What do you want to do right now? Think briefly, then act.", tools, maxSteps: 3 })`
8. If result has text, store it as an observation memory (importance 3)
9. Slightly jitter emotion (valence ± 0.05, arousal ± 0.05)

#### `reflect` (internalAction, `{agentId}`)

1. Fetch agent, world state, last reflection tick
2. Calculate accumulated importance of unreflected memories
3. **Gate:** If importance < 80, skip reflection (saves LLM costs)
4. Get recent non-reflection memories since last reflection (up to 15)
5. **Gate:** If < 3 memories, skip
6. Call `generateText` with `buildReflectionPrompt` (maxSteps=1)
7. Parse response into individual reflection lines (split by newline, strip bullets)
8. Store up to 3 reflections as memories (importance 8)

### 8.2 Agent Tools

Defined in `buildTools()` inside `brain.ts`. Each tool uses Zod for parameter validation and executes a Convex internal mutation.

| # | Tool Name | Parameters | Mutation Called | Description |
|---|-----------|------------|----------------|-------------|
| 1 | `moveTo` | `x: number, y: number` | `actions.moveAgent` | A* pathfind and start walking |
| 2 | `speak` | `targetName: string, message: string` | `actions.speakTo` | Say something to a nearby agent (within 6 tiles) |
| 3 | `rest` | (none) | `actions.restAgent` | Set status to sleeping, gain 15 energy immediately |
| 4 | `think` | `thought: string` | `actions.recordThought` | Store a private observation in memory |
| 5 | `setPlan` | `plan: string` | `actions.updatePlan` | Set persistent plan text + store as plan memory |
| 6 | `gatherResource` | `resourceType: string` | `actions.gatherResource` | Collect from nearby resource node (within 2 tiles) |
| 7 | `craft` | `recipeName: string` | `actions.craftItem` | Craft item using inventory materials |
| 8 | `buildStructure` | `buildingType: string` | `actions.buildStructure` | Build structure at current position |
| 9 | `giveItem` | `targetName, itemType, quantity` | `actions.giveItem` | Transfer items to nearby agent (within 3 tiles) |
| 10 | `eat` | (none) | `actions.eatFood` | Consume meal (+25 energy) or food (+10 energy) |
| 11 | `checkInventory` | (none) | `actions.checkInventory` | Returns inventory summary string |
| 12 | `explore` | `direction: north\|south\|east\|west` | `actions.moveAgent` | Move 8 tiles in direction (clamped to map bounds) |
| 13 | `formAlliance` | `name: string` | `social.alliances.create` | Found new alliance |
| 14 | `inviteToAlliance` | `targetName, allianceName` | `social.alliances.invite` | Add agent to alliance |
| 15 | `proposeRule` | `allianceName, rule` | `social.alliances.proposeRule` | Propose governance rule for voting |
| 16 | `proposeTrade` | `targetName, offerType, offerQuantity, requestType, requestQuantity` | `social.trading.propose` | Propose item trade |
| 17 | `respondToTrade` | `accept: boolean` | `social.trading.respond` | Accept/reject most recent pending trade |

### 8.3 Agent Actions (Mutations)

File: `convex/agents/actions.ts` — All are `internalMutation`.

#### `moveAgent({agentId, targetX, targetY})`
- Validates target is walkable
- Runs A* pathfinding
- Sets path, targetPosition, status="moving"
- Returns descriptive string

#### `speakTo({speakerId, targetName, message})`
- Finds target by name within 6 tiles
- Creates new conversation or appends to active one (checks last 10 conversations for an active one between the pair)
- Sets speaker status to "talking"
- Creates memory for target agent (type "conversation", importance 5)
- Creates "conversation" world event

#### `restAgent({agentId})`
- Adds 15 energy immediately
- Sets status to "sleeping" (tick handler continues recovery at 5/tick)

#### `recordThought({agentId, thought, tick})`
- Inserts observation memory (importance 3)

#### `updatePlan({agentId, plan, tick})`
- Patches agent's `currentPlan`
- Inserts plan memory (importance 4)

#### `storeReflections({agentId, reflections, tick})`
- Inserts each reflection as a memory (type "reflection", importance 8)

#### `updateEmotion({agentId, valence, arousal})`
- Patches emotion, clamping valence to [-1,1] and arousal to [0,1]

#### `gatherResource({agentId, resourceType})`
- Finds nearest matching resource within 2 tiles with quantity > 0
- Gathers `1 + floor(gathering_skill / 2)` units (skill bonus)
- Decrements resource quantity, adds to inventory
- Sets status "working", costs 3 energy
- Creates "gather" world event

#### `craftItem({agentId, recipeName})`
- Looks up recipe, checks skill requirement
- Checks and consumes input materials from inventory
- Adds output item to inventory
- Sets status "working", costs 5 energy
- Creates "craft" world event

#### `buildStructure({agentId, buildingType})`
- Looks up building cost, checks skill requirement
- Checks no existing building at position
- Consumes resources, inserts building (condition 100, level 1)
- Sets status "working", costs 10 energy
- Creates "build" world event

#### `giveItem({agentId, targetName, itemType, quantity})`
- Finds target within 3 tiles
- Removes from giver, adds to receiver
- Updates bidirectional relationships (giver→target: trust+0.1, affinity+0.12; target→giver: trust+0.15, affinity+0.1)
- Creates memory for receiver (importance 6)
- Creates "gift" world event

#### `eatFood({agentId})`
- Tries to consume 1 meal first (+25 energy), falls back to 1 food (+10 energy)
- Caps energy at 100

#### `checkInventory({agentId})`
- Returns formatted string of inventory contents

### 8.4 Memory System

File: `convex/agents/memory.ts`

#### `store` (internalMutation)
Simple insert into `memories` table with all fields.

#### `getUnreflectedImportance({agentId, sinceTick})` (internalQuery)
Sums importance of non-reflection memories since `sinceTick` (last 100 memories checked).

#### `getLastReflectionTick({agentId})` (internalQuery)
Returns tick of most recent reflection memory, or 0 if none.

#### `scoreMemories(memories, currentTick)` (pure function)
Scoring formula: `score = recency * 0.35 + (importance/10) * 0.5 + typeBonus`
- `recency = exp(-age / 50)` — exponential decay with half-life ~35 ticks
- `importanceNorm = importance / 10` — normalized to 0–1
- `typeBonus = 0.15` for reflections, 0 otherwise
- Returns sorted descending by score

### 8.5 Prompt Engineering

File: `convex/agents/prompts.ts`

#### `buildSystemPrompt(args: BuildPromptArgs) → string`

Constructs a detailed system prompt with these sections:

1. **Identity:** "You are {name}. You live in a wilderness world..."
2. **ABOUT YOU:** Agent backstory
3. **YOUR PERSONALITY:** Generated from Big Five scores using `describePersonality()`:
   - Each trait has a "high" (>0.6) and "low" (<0.4) description
   - Scores 0.4–0.6 are neutral (omitted)
   - Example high openness: "You are deeply curious, imaginative, and drawn to new experiences."
4. **CURRENT STATE:** Position, energy%, mood (derived from valence+arousal), time, status, current plan
5. **NEARBY PEOPLE:** List of agents within 6 tiles with name, position, status
6. **NEARBY RESOURCES:** List within 4 tiles with type, position, quantity
7. **NEARBY BUILDINGS:** List within 5 tiles with type and position
8. **YOUR INVENTORY:** Item counts
9. **WEATHER:** Current weather string
10. **YOUR RELATIONSHIPS:** Trust and affinity values for each known agent
11. **YOUR ALLIANCES:** Alliance names, member counts, rules
12. **PENDING PROPOSALS:** Unvoted governance proposals in agent's alliances
13. **PENDING TRADE OFFERS:** Incoming trades not yet responded to
14. **SOMEONE SPOKE TO YOU:** (conditional) Recent messages from active conversations
15. **YOUR MEMORIES:** Top 12 scored memories with tick, type, and content
16. **Instruction:** "Decide what to do next. Consider your personality, relationships, alliances..."

#### `buildReflectionPrompt(agentName, memories) → string`

Instructs the agent to write 2-3 high-level reflections synthesizing recent experiences. Format: "I notice...", "I think..."

#### Mood Description (`describeMood`)
| Valence | Arousal | Mood |
|---------|---------|------|
| > 0.3 | > 0.5 | "excited and happy" |
| > 0.3 | ≤ 0.5 | "content and peaceful" |
| < -0.3 | > 0.5 | "anxious and upset" |
| < -0.3 | ≤ 0.5 | "sad and withdrawn" |
| any | > 0.7 | "alert and energized" |
| else | else | "calm and neutral" |

### 8.6 Agent Context Queries

File: `convex/agents/queries.ts`

#### `getThinkingContext({agentId})` (internalQuery)

Returns a comprehensive context object:

| Field | Source | Filter |
|-------|--------|--------|
| `agent` | `db.get(agentId)` | — |
| `world` | `worldState.first()` | — |
| `memories` | `memories.by_agent` | Last 30, desc order |
| `nearbyAgents` | all agents | Within 6 tiles (Manhattan) |
| `pendingConversations` | last 20 conversations | Includes agent, no endTick |
| `nearbyResources` | all resources | Within 4 tiles, quantity > 0 |
| `inventory` | `inventory.by_agent` | Agent's items |
| `nearbyBuildings` | all buildings | Within 5 tiles |
| `relationships` | `relationships.by_agent` | Agent's outgoing relationships |
| `myAlliances` | all alliances | Agent in memberIds |
| `myPendingProposals` | pending proposals | In agent's alliances, not yet voted |
| `pendingTrades` | `trades.by_responder` | Status "pending" |

#### `getById({agentId})` (internalQuery)
Direct `db.get(agentId)`.

---

## 9. World Systems

### 9.1 Inventory Management

File: `convex/world/inventory.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `addItem` | `(ctx, agentId, itemType, quantity)` | Upserts inventory row (increments if exists) |
| `removeItem` | `(ctx, agentId, itemType, quantity) → boolean` | Decrements or deletes row; returns false if insufficient |
| `hasItems` | `(ctx, agentId, items[]) → boolean` | Checks all items have sufficient quantity |
| `getInventory` | `(ctx, agentId) → {itemType, quantity}[]` | Lists all items |
| `getAgentInventory` | internalQuery wrapper | Exposes `getInventory` as a query |

### 9.2 Crafting & Building Recipes

File: `convex/world/recipes.ts`

#### Crafting Recipes

| Recipe | Inputs | Output | Skill Required | Min Level |
|--------|--------|--------|---------------|-----------|
| `wooden_plank` | 3 wood | 2 wooden_plank | crafting | 0 |
| `stone_tools` | 2 stone + 1 wood | 1 stone_tools | crafting | 1 |
| `meal` | 2 food | 1 meal | gathering | 0 |
| `medicine` | 3 herbs | 1 medicine | gathering | 2 |
| `metal_tools` | 2 metal + 1 wood | 1 metal_tools | crafting | 2 |
| `rope` | 2 herbs + 1 wood | 1 rope | crafting | 1 |

#### Building Costs

| Building | Resources | Skill Required | Min Level |
|----------|-----------|---------------|-----------|
| `shelter` | 5 wood + 3 stone | building | 1 |
| `workshop` | 8 wood + 5 stone + 2 metal | building | 3 |
| `market` | 10 wood + 8 stone | building | 2 |
| `farm` | 4 wood + 2 stone | building | 1 |
| `storehouse` | 6 wood + 4 stone | building | 2 |

### 9.3 Weather, Regen, Building Effects

File: `convex/world/systems.ts`

#### `nextWeather(current, rand) → string`
Markov chain weather transitions:
- clear → clear(70%), rain(20%), fog(10%)
- rain → rain(50%), clear(30%), storm(20%)
- storm → storm(30%), rain(50%), clear(20%)
- fog → fog(40%), clear(50%), rain(10%)

**Called** in `tick.ts` every 10 ticks. Transitions weather automatically via Markov chain.

#### `regenerateResources(ctx)`
Increments all resource quantities by their `regenRate`, capped at `maxQuantity`.

**Called** in `tick.ts` every 5 ticks.

#### `applyBuildingEffects(ctx)`
Farms with condition > 0 produce food: either increment existing food resource at farm position, or create new food resource (quantity 1, maxQuantity 10, regenRate 0.5).

**Called** in `tick.ts` every 10 ticks.

---

## 10. Social Systems

### 10.1 Relationships

File: `convex/social/relationships.ts`

#### `updateRelationship(ctx, agentId, targetId, trustDelta, affinityDelta, tick)`
- If relationship exists: increment trust/affinity (clamped to [-1, 1]), increment interactionCount
- If new: create with initial trust=0.1+trustDelta, affinity=affinityDelta, interactionCount=1

**Relationship modification triggers:**
| Action | Giver Trust | Giver Affinity | Receiver Trust | Receiver Affinity |
|--------|-------------|----------------|----------------|-------------------|
| `giveItem` | +0.10 | +0.12 | +0.15 | +0.10 |
| `speakTo` | (not updated) | (not updated) | (not updated) | (not updated) |
| Trade accepted | +0.10 | +0.10 | +0.10 | +0.10 |
| Trade rejected | -0.05 | -0.02 | (none) | (none) |

**Note:** `speakTo` does NOT update relationships. Only gifts and trades modify trust/affinity.

#### `getRelationshipsFor(ctx, agentId)`
Returns all outgoing relationships for an agent.

#### `getReputation(ctx, agentId)`
Calculates average trust from all incoming relationships. Not currently used in the codebase.

### 10.2 Alliances & Governance

File: `convex/social/alliances.ts`

#### `create({founderId, name})`
- Checks name uniqueness (case-insensitive)
- Creates alliance with founder as sole member
- Creates "alliance" world event

#### `invite({inviterId, targetName, allianceName})`
- Validates inviter is a member
- Finds target by name (case-insensitive)
- Adds target to `memberIds`
- Creates memory for target (importance 7)
- Creates "alliance" world event

#### `proposeRule({proposerId, allianceName, content})`
- Validates proposer is a member
- Creates pending proposal with proposer's auto-yes vote
- Creates "governance" world event

#### `vote({voterId, proposalId, voteValue})`
- Validates voter is alliance member and hasn't voted
- Adds vote; checks if yes or no count ≥ `ceil(memberCount / 2)`
- If passed: adds rule to alliance's rules array, creates "governance" world event
- Returns vote result and status

### 10.3 Trading

File: `convex/social/trading.ts`

#### `propose({initiatorId, targetName, offerType, offerQty, requestType, requestQty})`
- Validates target is nearby (within 6 tiles)
- Validates initiator has offered items
- Creates pending trade
- Creates memory for responder (importance 6)
- Creates "trade" world event

#### `respond({responderId, accept})`
- Finds most recent pending trade where agent is responder
- **If reject:** Status → "rejected", slight trust penalty (-0.05)
- **If accept:** Validates both parties still have items, transfers items bidirectionally, status → "accepted", mutual trust/affinity +0.10
- Creates "trade" world event on acceptance

---

## 11. Shared Libraries

### 11.1 Constants

File: `convex/lib/constants.ts`

```
MAP_WIDTH = 50          (tiles)
MAP_HEIGHT = 50         (tiles)
MAP_SEED = 42
TILE_SIZE = 32          (pixels per tile)

TILE = { WATER: 0, SAND: 1, GRASS: 2, FOREST: 3, STONE: 4 }

TILE_WALKABLE = { WATER: false, SAND: true, GRASS: true, FOREST: false, STONE: true }

TILE_COLORS = {
  WATER:  0x2563eb (blue)
  SAND:   0xd4a574 (tan)
  GRASS:  0x4ade80 (green)
  FOREST: 0x166534 (dark green)
  STONE:  0x78716c (gray)
}

AGENT_COLORS = [
  0xe74c3c (red), 0x3498db (blue), 0x2ecc71 (green), 0xf39c12 (gold), 0x9b59b6 (purple),
  0x1abc9c (teal), 0xe67e22 (orange), 0xf1c40f (yellow), 0x00bcd4 (cyan), 0xff6b81 (pink)
]
```

### 11.2 Map Generation

File: `convex/lib/mapgen.ts`

**Algorithm:** Seeded value noise (smooth 2D pseudorandom interpolation)

`generateMap(seed, width, height) → TileType[]`:
1. For each tile, calculate `elevation` using 3 octaves of value noise:
   - Scale 10 (50% weight) — large features
   - Scale 5 (35% weight) — medium detail
   - Scale 2 (15% weight) — fine detail
2. Calculate `moisture` using single octave at scale 8 with different seed offset (+5000)
3. Classify tiles:
   - elevation < 0.3 → WATER
   - elevation < 0.36 → SAND
   - elevation < 0.72 → GRASS (if moisture ≤ 0.55) or FOREST (if moisture > 0.55)
   - elevation ≥ 0.72 → STONE

`isWalkable(x, y, mapTiles, width, height) → boolean`:
- Returns false for out-of-bounds coordinates
- Uses `TILE_WALKABLE` lookup

**Noise functions:**
- `hash(ix, iy, seed)`: Integer hash producing 0–1 float (FNV-like multiplicative hash)
- `valueNoise(x, y, seed, scale)`: Bilinear interpolation of corner hashes with smoothstep

---

## 12. Frontend Architecture

### 12.1 Entry Point & App Shell

**`src/main.tsx`**: Creates `ConvexReactClient` from `VITE_CONVEX_URL` env var, wraps `<App>` in `<ConvexProvider>`.

**`src/App.tsx`**: Root component.
- **Queries:** `worldState`, `agents`, `events`, `resources`, `buildings`
- **Mutations:** `seedWorld`, `togglePause`
- **State:** `selectedAgentId` (string | null), `directorMode` (boolean), `lastDirectorTick` (ref)

**Render states:**
1. `worldState === undefined` → "Connecting..." loading screen
2. `worldState === null` → "Create World" splash with seed button
3. Otherwise → Full simulation UI: Toolbar + WorldCanvas + Sidebar

**Director Mode logic:** When enabled, on each new tick, randomly selects an active (non-idle, non-sleeping) agent, or any agent if none active. Updates `selectedAgentId`.

### 12.2 PixiJS World Renderer

**`src/components/world/WorldCanvas.tsx`**: React wrapper.
- `useEffect` #1: Initializes `GameWorld`, calls `setMap` and `setOnAgentSelect` on mount. Cleans up on unmount.
- `useEffect` #2: On data changes, calls `updateAgents`, `updateResources`, `updateBuildings`, `updateTimeOfDay`, `updateWeather`.
- Renders a single `<div ref={containerRef}>` that PixiJS renders into.

**`src/components/world/GameWorld.ts`**: Pure PixiJS class (no React).

**Layer hierarchy** (bottom to top):
1. `tileGraphics` — filled rectangles for each tile
2. `gridGraphics` — grid lines (black, 0.15 alpha)
3. `agentContainer` — agent sprites

**Note:** `resourceLayer`, `buildingLayer`, `dayNightOverlay`, `weatherOverlay` are referenced in `WorldCanvas.tsx` calls (`updateResources`, `updateBuildings`, `updateTimeOfDay`, `updateWeather`) but their implementations are incomplete or missing in `GameWorld.ts`. The class only has `tileGraphics`, `gridGraphics`, and `agentContainer` fully set up.

**Agent sprites:** Each agent is a `Container` with:
- `body`: Colored circle (radius = tileSize * 0.35) with white stroke
- `statusDot`: Small 3px circle positioned at top-right, colored by status
- `label`: Name text below (9px Inter, drop shadow)

**Animation:** PixiJS ticker runs `animateAgents()` every frame:
- Smooth position lerp (factor 0.12) toward target coordinates
- **Bug:** References `sprite.statusLabel` which doesn't exist in the `AgentSprite` interface (should be `statusLabel` but interface only has `label`)

**Camera controls:**
- Drag to pan (pointer events)
- Scroll wheel to zoom (0.3x to 4x range)
- Initial camera centered on map

**Status colors:**
| Status | Color |
|--------|-------|
| idle | 0x94a3b8 (gray) |
| moving | 0x4ade80 (green) |
| talking | 0x60a5fa (blue) |
| working | 0xfbbf24 (amber) |
| sleeping | 0x818cf8 (indigo) |
| exploring | 0xf472b6 (pink) |

### 12.3 Toolbar

File: `src/components/ui/Toolbar.tsx`

Sticky header bar displaying:
- "AGENTWORLD" title in emerald
- Play/Pause button
- Director Mode toggle button (highlights green when active)
- Weather icon + name
- Formatted time (HH:MM)
- Current tick
- Agent count

Weather icons: ☀ (clear), 🌧 (rain), ⛈ (storm), 🌫 (fog)

### 12.4 Sidebar & Tabs

File: `src/components/panels/Sidebar.tsx`

Fixed-width 320px sidebar with two modes:

**Mode 1: Agent Selected** — Shows `AgentInspector` with EventFeed below (30% max height).

**Mode 2: No Selection** — Tab bar with 4 tabs:
- **Agents** — List of all agents with color dot, name, energy%, status badge
- **Social** — `SocialGraph` component
- **Econ** — `EconomyDashboard` component
- **News** — `Newspaper` component

Plus EventFeed always at the bottom.

**Note:** The code references a "god" tab (`activeTab === "god"` rendering `<GodMode />`) but "god" is not in the `TABS` array and `GodMode` is not imported. This tab is unreachable in the current code.

### 12.5 Agent Inspector

File: `src/components/panels/AgentInspector.tsx`

Displays for a selected agent:
1. **Header:** Color circle, name, status badge, close button
2. **Backstory:** Full text
3. **Current Plan:** (if set) Italic plan text
4. **Personality:** 5 horizontal bars (OPN, CON, EXT, AGR, NEU) scaled 0–100%
5. **Vitals:** Energy bar (amber) and Mood bar (blue, mapped from valence [-1,1] to [0,100])
6. **Skills:** 5 horizontal bars (GAT, CRA, BUI, TRA, LEA) scaled 0–100% (value/5)
7. **Inventory:** Pill tags showing quantity + itemType
8. **Recent Memories:** Last 10, with tick, type coloring (reflections in purple italic)
9. **Recent Conversations:** Last 3 conversations, 3 most recent messages each
10. **Position:** Monospace coordinates

**Queries used:** `api.agents.getMemories`, `api.world.getInventory`, `api.agents.getConversations`

### 12.6 Event Feed

File: `src/components/panels/EventFeed.tsx`

Filterable event log. Filter buttons: All, Chat, Trade, Alliance, Build, Gather. "All" filter excludes `tick_summary` events. Events display as `[tick] description` with color-coded tick numbers by event type.

**Type colors:**
| Type | Color Class |
|------|------------|
| world_created | text-emerald-400 |
| tick_summary | text-slate-600 |
| conversation | text-purple-400 |
| trade | text-amber-400 |
| alliance | text-pink-400 |
| governance | text-violet-400 |
| build | text-orange-400 |
| gather | text-green-400 |
| craft | text-cyan-400 |
| gift | text-rose-400 |
| god_action | text-yellow-300 |

### 12.7 Social Graph

File: `src/components/panels/SocialGraph.tsx`

Canvas-based force-directed graph (192px height). Uses `requestAnimationFrame` loop.

**Physics simulation:**
- Center pull: 0.005 force toward canvas center
- Repulsion: 800 / distance² between all node pairs
- Attraction: 0.02 * (1 + interactionCount * 0.1) along relationship edges
- Damping: 0.85 per frame
- Boundary clamping: 20px margin

**Edge rendering:**
- Green (rgba(74,222,128)) for trust > 0.2
- Red (rgba(239,68,68)) for trust < -0.2
- Gray otherwise
- Width: min(3, 0.5 + interactionCount * 0.3)
- Alpha: min(0.6, 0.1 + interactionCount * 0.05)

Below the graph, displays alliances list with name and member count.

### 12.8 Economy Dashboard

File: `src/components/panels/EconomyDashboard.tsx`

Three sections:
1. **World Resources:** Horizontal bars per resource type (wood=amber, stone=gray, food=orange, metal=gray, herbs=green)
2. **Agent Wealth:** Ranked list (top 8) with yellow bars showing total item count
3. **Trade Stats:** 3 cards showing completed, pending, and total trade counts

### 12.9 Newspaper

File: `src/components/panels/Newspaper.tsx`

Displays "The AgentWorld Chronicle" with:
- Headline (derived from event types)
- Tick number
- Body (bullet list of recent events)

### 12.10 God Mode Panel

File: `src/components/panels/GodMode.tsx`

Three sections:
1. **Weather Control:** 4 buttons (clear, rain, storm, fog) calling `god.changeWeather`
2. **Spawn Resource:** 5 buttons spawning resources at (25, 25) with quantity 5
3. **Danger Zone:** Reset World button (with confirm dialog) that calls `resetWorld` then `seedWorld`

### 12.11 Interview Chat

File: `src/components/panels/InterviewChat.tsx`

Chat interface with message history. Uses `useAction(api.interview.ask)`. Shows loading state while agent "thinks." Messages styled differently for user (emerald, right-aligned) and agent (slate, left-aligned).

**Note:** This component is defined but not currently rendered anywhere in the component tree. It was intended to be shown inside the AgentInspector when an agent is selected, but the integration was not completed.

---

## 13. Complete API Reference

### Public Queries (frontend can call directly)
```
api.world.getState            → worldState | null
api.world.getResources        → resources[]
api.world.getBuildings        → buildings[]
api.world.getInventory        → {agentId} → inventory[]
api.world.getAlliances         → alliances[]
api.world.getRelationships    → relationships[]
api.agents.list               → agents[]
api.agents.getById            → {agentId} → agent | null
api.agents.getConversations   → {agentId} → conversations[]
api.agents.getMemories        → {agentId, limit?} → memories[]
api.events.recent             → worldEvents[] (last 50)
api.analytics.stats.getEconomyStats    → {resourceTotals, agentWealth, completedTrades, pendingTrades, totalTrades}
api.analytics.stats.getSocialStats     → {relationshipCount, avgTrust, allianceCount, conversationCount}
api.analytics.newspaper.getLatestSummary → {headline, body, tick} | null
```

### Public Mutations
```
api.init.seedWorld            → Id<"worldState">
api.world.togglePause         → void
api.god.changeWeather         → {weather} → void
api.god.spawnResource         → {tileX, tileY, type, quantity} → void
api.god.setSpeed              → {paused} → void
api.god.resetWorld            → void
```

### Public Actions
```
api.interview.ask             → {agentId, question} → string
```

### Internal (server-to-server only)
```
internal.engine.tick.run                        (internalMutation — game loop)
internal.agents.brain.think                     (internalAction — LLM decision)
internal.agents.brain.reflect                   (internalAction — LLM reflection)
internal.agents.queries.getThinkingContext       (internalQuery)
internal.agents.queries.getById                  (internalQuery)
internal.agents.memory.store                     (internalMutation)
internal.agents.memory.getUnreflectedImportance  (internalQuery)
internal.agents.memory.getLastReflectionTick     (internalQuery)
internal.agents.actions.moveAgent                (internalMutation)
internal.agents.actions.speakTo                  (internalMutation)
internal.agents.actions.restAgent                (internalMutation)
internal.agents.actions.recordThought            (internalMutation)
internal.agents.actions.updatePlan               (internalMutation)
internal.agents.actions.storeReflections         (internalMutation)
internal.agents.actions.updateEmotion            (internalMutation)
internal.agents.actions.gatherResource           (internalMutation)
internal.agents.actions.craftItem                (internalMutation)
internal.agents.actions.buildStructure           (internalMutation)
internal.agents.actions.giveItem                 (internalMutation)
internal.agents.actions.eatFood                  (internalMutation)
internal.agents.actions.checkInventory           (internalMutation)
internal.social.alliances.create                 (internalMutation)
internal.social.alliances.invite                 (internalMutation)
internal.social.alliances.proposeRule            (internalMutation)
internal.social.alliances.vote                   (internalMutation)
internal.social.trading.propose                  (internalMutation)
internal.social.trading.respond                  (internalMutation)
internal.world.getStateInternal                  (internalQuery)
internal.world.inventory.getAgentInventory       (internalQuery)
```

---

## 14. Data Flow Diagrams

### Simulation Tick Flow
```
[Cron: every 3s]
       │
       ▼
engine/tick.run (internalMutation)
       │
       ├── Increment tick, advance timeOfDay
       ├── Generate map from seed (for walkability)
       │
       ├── For each agent:
       │   ├── Has path? → Move one step, consume 0.3 energy
       │   ├── Sleeping? → +5 energy, wake at 90%
       │   ├── Should think? (tick%5 == spriteSeed%5, idle)
       │   │   ├── Schedule brain.think (0-3s jitter)
       │   │   └── Every 20 ticks: Schedule brain.reflect (+2s)
       │   ├── Talking? → Reset to idle
       │   └── Idle & !thinking? → 40% chance wander (A* pathfind)
       │
       └── Every 20 ticks: Insert tick_summary event
```

### Agent Think Flow
```
brain.think (internalAction)
       │
       ├── queries.getThinkingContext → full context object
       │   (agent, world, memories, nearbyAgents, nearbyResources,
       │    inventory, nearbyBuildings, relationships, alliances,
       │    proposals, trades, conversations)
       │
       ├── scoreMemories → top 12 by recency+importance+type
       │
       ├── buildSystemPrompt → detailed character prompt
       │
       ├── generateText(GPT-4o-mini, system, tools, maxSteps=3)
       │   │
       │   └── Tool calls execute mutations:
       │       ├── moveAgent, speakTo, restAgent, recordThought
       │       ├── updatePlan, gatherResource, craftItem
       │       ├── buildStructure, giveItem, eatFood, checkInventory
       │       ├── alliances.create/invite/proposeRule
       │       └── trading.propose/respond
       │
       ├── Store decision as observation memory
       └── Slightly jitter emotion
```

### Frontend Data Flow
```
Convex Cloud ──real-time subscriptions──▶ React Hooks (useQuery)
       │                                        │
       │    worldState ────────────────────────▶ App.tsx
       │    agents[] ──────────────────────────▶ App.tsx, Sidebar, WorldCanvas
       │    events[] ──────────────────────────▶ EventFeed
       │    resources[] ───────────────────────▶ WorldCanvas
       │    buildings[] ───────────────────────▶ WorldCanvas
       │    relationships[] ───────────────────▶ SocialGraph
       │    alliances[] ───────────────────────▶ SocialGraph
       │    economyStats ──────────────────────▶ EconomyDashboard
       │    newspaper ─────────────────────────▶ Newspaper
       │    memories (per agent) ──────────────▶ AgentInspector
       │    inventory (per agent) ─────────────▶ AgentInspector
       │    conversations (per agent) ─────────▶ AgentInspector
       │
       │    User interactions:
       │    ├── seedWorld (mutation) ◀── Create World button
       │    ├── togglePause (mutation) ◀── Play/Pause button
       │    ├── god.changeWeather (mutation) ◀── GodMode
       │    ├── god.spawnResource (mutation) ◀── GodMode
       │    ├── god.resetWorld (mutation) ◀── GodMode
       │    └── interview.ask (action) ◀── InterviewChat
       │
       └──▶ GameWorld.ts (PixiJS) ── WebGL canvas rendering
                ├── Tile map
                ├── Grid overlay
                └── Agent sprites (lerp animation, status dots, labels)
```

---

## 15. Agent Personalities & Seed Data

| # | Name | Backstory | O | C | E | A | N | Top Skill |
|---|------|-----------|---|---|---|---|---|-----------|
| 0 | Luna | Restless wanderer, catalogs plants | 0.95 | 0.40 | 0.60 | 0.70 | 0.30 | Gathering 3 |
| 1 | Kai | Meticulous builder, dreams of a great hall | 0.50 | 0.95 | 0.40 | 0.60 | 0.20 | Building 4 |
| 2 | Ember | Life of the party, believes in conversation | 0.70 | 0.30 | 0.95 | 0.80 | 0.40 | Leadership 3, Trading 3 |
| 3 | Sage | Quiet healer, collects herbs | 0.60 | 0.70 | 0.20 | 0.95 | 0.50 | Gathering 4 |
| 4 | Rex | Ambitious, strategic, natural leader | 0.60 | 0.80 | 0.80 | 0.30 | 0.70 | Leadership 4 |
| 5 | Ivy | Nature-loving gatherer, finds hidden resources | 0.80 | 0.60 | 0.30 | 0.70 | 0.20 | Gathering 4 |
| 6 | Flint | Stoic craftsman, judges by work quality | 0.30 | 0.90 | 0.20 | 0.40 | 0.30 | Crafting 4 |
| 7 | Nova | Energetic trader, sees everything as a deal | 0.70 | 0.50 | 0.90 | 0.50 | 0.40 | Trading 4 |
| 8 | Ash | Quiet observer, watches patterns others miss | 0.90 | 0.70 | 0.10 | 0.60 | 0.60 | All 2 (balanced) |
| 9 | Coral | Community organizer, mediates disputes | 0.60 | 0.70 | 0.70 | 0.90 | 0.30 | Leadership 4 |

**O**=Openness, **C**=Conscientiousness, **E**=Extraversion, **A**=Agreeableness, **N**=Neuroticism

All agents start with: energy=100, emotion={valence: 0.5, arousal: 0.3}, status="idle"

---

## 16. Known Issues & Technical Debt

### Bugs

1. ~~**`GameWorld.ts` animateAgents — `sprite.statusLabel` undefined** (FIXED)~~

2. ~~**`Sidebar.tsx` — GodMode tab unreachable** (FIXED)~~ — God tab now included in TABS array, GodMode imported

3. ~~**`InterviewChat.tsx` — not rendered anywhere** (FIXED)~~ — Now rendered inside AgentInspector

4. **`GameWorld.ts` — Race condition: `agentContainer is undefined` (FIXED):**
   - Public update methods could be called before async `init()` completed
   - Root cause: `worldRef` set before init resolves; data-driven effect fires early
   - **Fix applied:** Added `_initialized` guard to all public methods, replaced `!` assertions with explicit `| null = null`

5. **`GameWorld.ts` — `_cancelResize is not a function` (FIXED):**
   - PixiJS 8 internal resize observer cleanup failed during React StrictMode double-mount
   - **Fix applied:** Wrapped `app.destroy()` calls in try-catch

### Resolved Implementations (previously listed as missing)

- ~~**Weather transitions**~~ — Now called in `tick.ts` every 10 ticks via `nextWeather()`
- ~~**Resource regeneration**~~ — Now called in `tick.ts` every 5 ticks via `regenerateResources()`
- ~~**Building effects**~~ — Now called in `tick.ts` every 10 ticks via `applyBuildingEffects()`
- ~~**Season transitions**~~ — Now transitions every 192 ticks in `tick.ts`
- ~~**`updateResources`, `updateBuildings`, `updateTimeOfDay` incomplete**~~ — All now fully implemented in `GameWorld.ts` with resourceLayer, buildingLayer, and dayNightOverlay

### Remaining Technical Debt

6. **Vector embeddings unused:**
   - Memory schema supports 1536-dim embeddings + vector index
   - No code generates or queries embeddings
   - Memories are retrieved by agent index + time-based scoring only
   - **Potential enhancement:** Use OpenAI embeddings API to enable semantic memory search

### Performance Considerations

10. **Full table scans:** Several queries use `.collect()` on entire tables (all agents, all resources, all buildings) which will degrade with scale. For 10 agents this is fine.

11. **Map regeneration per tick:** `generateMap()` is called every tick in `tick.ts` to check walkability. The map is deterministic from seed so this is technically cacheable.

12. **Relationship name resolution:** In `brain.ts`, each relationship's target agent name is fetched individually via separate queries inside a loop. Could be batched.

---

## 17. Design Decisions & Rationale

1. **Why Convex instead of a traditional backend?**
   - Real-time subscriptions (no polling needed for UI updates)
   - Built-in scheduler for delayed actions (jittered LLM calls)
   - Cron jobs for game loop
   - Transactional mutations (no race conditions on agent state)
   - Automatic type safety between backend and frontend

2. **Why direct AI SDK instead of @convex-dev/agent's thread system?**
   - Need fine-grained control over memory management (custom scoring, importance levels)
   - Custom prompt construction with rich context injection
   - Simpler mental model: one `generateText` call per think cycle

3. **Why PixiJS instead of HTML Canvas or SVG?**
   - WebGL rendering for smooth 50x50 tile grid + 10 animated agents
   - PixiJS 8 has modern Graphics API, container hierarchy, and built-in ticker
   - Smooth lerp animation for agent movement

4. **Why seeded PRNG?**
   - Deterministic map generation from a single seed number
   - Same map renders identically on backend (for pathfinding) and frontend (for display)
   - Reproducible resource placement on world creation

5. **Why tick-based instead of real-time?**
   - Server-authoritative state prevents desync
   - Discrete ticks simplify scheduling (think every N ticks, reflect every M ticks)
   - 3-second intervals balance responsiveness with LLM API cost

6. **Why stagger agent thinking?**
   - `tick % 5 === spriteSeed % 5` ensures at most ~2 agents think per tick
   - Random jitter (0-3s) further distributes LLM API calls
   - Prevents OpenAI rate limiting and reduces peak cost

7. **Why shared `convex/lib` between frontend and backend?**
   - Map generation must be identical on both sides
   - Frontend needs tile colors and constants for rendering
   - `tsconfig.app.json` includes `convex/lib` to enable this sharing

8. **Why Big Five personality model?**
   - Well-established psychological framework with clear behavioral implications
   - Maps naturally to LLM prompt descriptions (e.g., high extraversion → "energized by social interaction")
   - 5 continuous dimensions create diverse personality combinations

---

---

## 15. Feature Tiers (Added February 2026)

### Tier 1: Agent Vitality

**T1.1 Conversation Trust** — Already implemented. `speakTo` in `convex/agents/actions.ts` updates trust (+0.03) and affinity (+0.05) bidirectionally.

**T1.2 Multi-Step Plan Lock** — Agents can commit to structured multi-step plans that persist across think cycles.
- Schema: `agents.planSteps` (array), `agents.planStep` (index), `agents.planStartTick`
- Mutations: `commitToPlan`, `advancePlanStep`, `abandonPlan` in `convex/agents/actions.ts`
- Tools: `commitToPlan`, `advancePlanStep`, `abandonPlan` in `convex/agents/brain.ts`
- Prompt: ACTIVE PLAN section shows step progress with [done]/[CURRENT]/[ ] markers
- Tick: Agents with locked plans don't wander randomly

**T1.3 Seek Agent Tool** — Agents can deliberately move toward a specific person.
- Uses target's current position if within perception range (6 tiles)
- Falls back to `lastSeenPosition` from relationship record
- Mutation: `seekAgentAction` in `convex/agents/actions.ts`

**T1.4 Last Seen Location Memory** — Agents remember where they last saw other agents.
- Schema: `relationships.lastSeenPosition`, `relationships.lastSeenTick`
- Mutation: `updateSightings` called at start of every `think()` cycle
- Prompt: PEOPLE YOU REMEMBER SEEING section (filtered to <200 ticks ago)

### Tier 2: Scarcity & Incentives

**T2.1 Energy Drain & Mandatory Food**
- Passive drain: 0.4 energy/tick for all non-sleeping agents
- Increased action costs: gather (5), craft (7), build (12), movement (0.5/tick)
- Starvation: mood deterioration below 15 energy, auto-rest at 5 energy
- Prompt: urgency warnings at <30% and <15% energy
- All constants in `ENERGY` object in `convex/lib/constants.ts`

**T2.2 Resource Scarcity**
- Reduced initial spawn rates via `RESOURCES.SPAWN_CHANCE` constants
- Season-affected regen: `RESOURCES.SEASON_MULTIPLIER` (winter food at 0.2x, summer food at 1.5x)
- `regenerateResources()` in `convex/world/systems.ts` reads current season

**T2.3 Item Degradation**
- Tool durability: `stone_tools` (10 uses), `metal_tools` (25 uses)
- Schema: `inventory.durability` (optional)
- Crafting with tools: +1 output bonus, costs 1 durability
- Crafted tools get durability assigned automatically
- Building decay: -1 condition every 20 ticks; `decayBuildings()` in `convex/world/systems.ts`
- Repair tool: `repairBuilding` (2 wood + 1 stone = +20 condition)

**T2.4 Building Bonuses**
- Shelter: +3 energy/tick sleep bonus within 2 tiles
- Workshop: +1 crafting output, -2 energy cost within 2 tiles
- Market: trade range extends from 6 to 12 tiles within 4 tiles
- MeetingHall: +1 vote weight within 3 tiles
- Farm: food production (existing)
- Utility: `hasBuildingBonus()` in `convex/world/systems.ts`

### Tier 3: Social Depth

**T3.1 Multi-Turn Conversations**
- `respondToConversation` internalAction: lightweight LLM call for conversation replies
- `speakTo` schedules target response (500-1500ms jitter)
- Only triggers for idle/talking agents
- Capped at 3 exchanges per conversation (prevent runaway LLM costs)
- `buildConversationPrompt()` in `convex/agents/prompts.ts`

**T3.2 Conflict Mechanics**
- `confront` tool: grievance-based confrontation (-0.1 trust, -0.08 affinity both parties)
- `claimTerritory` tool: claim 3x3 area, creates disputes if near others' buildings
- Both create world events (`conflict`/`territory` types) and memories
- Leadership skill influences confrontation outcomes

**T3.3 Alliance Shared Storage**
- Schema: `buildingInventory` table (by_building, by_building_item indexes)
- `depositToStorehouse`, `withdrawFromStorehouse` mutations
- Only works within 2 tiles of an alliance storehouse in working condition
- Storehouse contents shown in agent prompt and thinking context

**T3.4 Reputation System**
- Schema: `reputation` table (agentId, score, lastUpdated)
- Recalculated on every `updateRelationship()` call (average incoming trust)
- `recalculateReputation()` in `convex/social/relationships.ts`
- COMMUNITY REPUTATION section in agent prompt
- Reputation badge in AgentInspector (color-coded)
- `getReputations` public query in `convex/world.ts`

### Tier 4: Frontend Storytelling

**T4.1 Speech Bubbles** — `speechBubbleLayer` in GameWorld
- Auto-triggered on conversation events from WorldCanvas
- White rounded rect with text, triangle tail, follows agent
- Auto-fades after 3.5 seconds; max 1 bubble per agent

**T4.2 Trade/Gift Animations** — `animationLayer` in GameWorld
- Colored circle lerps from sender to receiver over ~1 second
- Ease-in-out timing with upward arc for visual appeal
- Triggered on `trade` and `gift` world events

**T4.3 Alliance Territory Shading** — `territoryLayer` in GameWorld
- Translucent overlay around member positions and alliance buildings
- 3-tile radius with alpha falloff
- Color-coded per alliance

**T4.4 Story Mode Narrator** — Rule-based event-to-prose conversion
- Server: `convex/analytics/narrator.ts` — template-based narration per event type
- Grouped by in-game time periods (dawn, morning, midday, afternoon, evening, night)
- Frontend: `src/components/panels/StoryNarrator.tsx` — serif font, warm amber headers
- "Story" tab in Sidebar

### New Constants (`convex/lib/constants.ts`)

- `ENERGY` — passive drain, action costs, thresholds, regen rates
- `RESOURCES` — spawn chances, season multipliers
- `DURABILITY` — tool durability values
- `BUILDING_BONUS` — range and bonus values per building type
- `BUILDING_DECAY_RATE`, `BUILDING_DECAY_INTERVAL`
- `PERCEPTION` — range values for agent/resource/building/speak/give/gather

---

*Last updated: February 6, 2026*
*Git remote: https://github.com/AbhinavMalkoochi/simulation.git*
