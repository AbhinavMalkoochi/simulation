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
- **AI**: @convex-dev/agent for LLM-driven agent behavior
- **Validation**: Zod
