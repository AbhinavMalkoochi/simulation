# AgentWorld

A browser-based AI agent simulation where autonomous agents develop beliefs, form philosophies, build companies/religions/cults, forge deep relationships, and evolve emergent personalities in a procedurally generated world.

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
- Big Five (OCEAN) personality model with derived archetypes (Socialite, Philosopher, Builder, etc.)
- Memory system with importance scoring and exponential decay
- Periodic reflection synthesizes memories into insights, beliefs, and emergent traits
- Agents develop interests, habits, and long-term ambitions through experience
- Day summaries capture each agent's perspective

### Beliefs & Inner Life

- Agents form beliefs (values, opinions, philosophies, goals) through reflection
- Beliefs shape behavior and are shared in conversations to persuade others
- Confidence scores evolve over time; weak beliefs get replaced by stronger ones
- Emergent interests and habits form from experiences (e.g., "enjoys gathering herbs")
- Long-term life ambitions evolve through reflection

### Emotions

- Event-driven emotion system (build success, gift received, confrontation, loneliness, etc.)
- Personality modulates emotional intensity (neuroticism amplifies, agreeableness boosts social gains)
- Mood displayed as descriptive labels (Excited, Content, Anxious, Sad, Calm, Alert)
- Extraversion-scaled loneliness detection when agents are alone

### Spatial System

- Named map regions (Northshore Beach, Pine Hollow, etc.) instead of raw coordinates
- Agents perceive surroundings as relative directions ("nearby to the east")
- Semantic movement tools: `goToResource`, `goToPerson`, `goToArea`, `goToBuilding`
- Settlement detection: clustered buildings form named settlements

### Social Systems

- Trust/affinity relationship model with shared experiences, conversation topics, roles, and opinions
- Multi-turn conversations (8-12 exchanges, extraversion-scaled)
- `shareBelief` tool: agents discuss philosophies and try to convert each other
- `proposeIdea` tool: agents propose founding organizations in conversation
- Conversation quality heuristic: substantive messages build more trust
- Auto-extracted topics and shared experience logging when conversations close

### Organizations

- Five organization types: alliance, company, religion, club, cult
- Each has ideology, rituals, rules, and governance via voting
- Agents can propose rules and vote (meeting hall building gives vote weight bonus)
- Storehouses linked to organizations for shared inventory
- Leadership skill progression for founders

### Skill Progression

- Five skills: gathering, crafting, building, trading, leadership
- Skills improve through use (gathering herbs improves gathering skill, etc.)
- Skill levels displayed as /10 in agent inspector
- Higher skills will unlock better outcomes in future updates

### Frontend

- Sidebar tabs: World, Agents, Social, Economy, Chronicle, Events, Control
- Chronicle: narrative daily summaries of world events
- Events: filterable raw event log
- Agent Inspector: personality archetype, beliefs, mood, relationships, interests/habits, skills, memories, interview chat
- PixiJS WebGL rendering with smooth animations

## Key Files

- `convex/schema.ts` — Full data model (agents, beliefs, relationships, alliances, etc.)
- `convex/agents/prompts.ts` — System prompt construction (personality, beliefs, spatial, social)
- `convex/agents/brain.ts` — LLM think/reflect/converse with tool calling
- `convex/agents/actions.ts` — All agent mutations (movement, gathering, crafting, social, emotions, skills)
- `convex/engine/tick.ts` — Main game loop (movement, energy, social-seeking, weather)
- `convex/lib/constants.ts` — Map regions, energy costs, perception ranges
- `convex/social/alliances.ts` — Organization creation, invites, governance, voting
- `convex/social/relationships.ts` — Trust/affinity, shared experiences, conversation topics
- `convex/world/systems.ts` — Weather, resources, building effects, settlement detection
- `convex/init.ts` — Agent backstories and world seeding
- `src/constants.ts` — Shared frontend constants (STATUS_LABEL, event types, colors)
- `src/types.ts` — Shared TypeScript types
- `src/components/panels/AgentInspector.tsx` — Rich agent detail view
