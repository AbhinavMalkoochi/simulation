# AgentWorld

A browser-based AI agent simulation where autonomous agents build societies, trade resources, form alliances, and develop unique personalities in a procedurally generated world.

## Setup

```bash
npm install
```

Create a `.env.local` with your Convex deployment URL:

```
VITE_CONVEX_URL=<your convex deployment url>
```

## Development

Run the Convex backend and Vite dev server in separate terminals:

```bash
npx convex dev          # Terminal 1
npm run dev             # Terminal 2
```

On first launch, click **Create World** to seed the simulation.

## Tech Stack

- **Frontend**: Vite + React + PixiJS 8 + Tailwind CSS
- **Backend**: Convex (real-time database, scheduled functions, vector search)
- **AI**: GPT-4o-mini via Vercel AI SDK for agent cognition
- **Validation**: Zod

## Architecture

### World

- 50x50 procedurally generated tile map with 16 named regions
- Terrain types: water, sand, grass, forest, stone
- Tick-based simulation (3-second intervals, 192 ticks per day)
- Seasons, weather, day/night cycles

### Agent Cognition

- Agents think using GPT-4o-mini with personality-driven system prompts
- Big Five (OCEAN) personality model converted to natural language
- Memory system with importance scoring and exponential decay
- Periodic reflection synthesizes memories into insights
- Day summaries capture each agent's perspective

### Spatial System

- Named map regions (Northshore Beach, Pine Hollow, etc.) instead of raw coordinates
- Agents perceive surroundings as relative directions ("nearby to the east")
- Semantic movement tools: `goToResource`, `goToPerson`, `goToArea`, `goToBuilding`
- Settlement detection: clustered buildings form named settlements

### Social Systems

- Trust/affinity relationship model with descriptive labels
- Multi-turn conversations (up to 8 exchanges)
- Alliances with governance rules and voting
- Trading with market building bonuses
- Confrontation and territory mechanics

### Frontend

- Sidebar tabs: World, Agents, Social, Economy, Chronicle, Events, Control
- Chronicle: narrative daily summaries of world events
- Events: filterable raw event log
- Agent Inspector with personality bars, memories, conversations, interview chat
- PixiJS WebGL rendering with smooth animations

## Key Files

- `convex/agents/prompts.ts` — System prompt construction (personality, spatial, social)
- `convex/agents/brain.ts` — LLM think/reflect/converse with semantic tool calling
- `convex/agents/actions.ts` — All agent mutations (movement, gathering, crafting, social)
- `convex/engine/tick.ts` — Main game loop (movement, energy, social-seeking, weather)
- `convex/lib/constants.ts` — Map regions, energy costs, perception ranges
- `convex/world/systems.ts` — Weather, resources, building effects, settlement detection
- `convex/init.ts` — Agent backstories and world seeding
