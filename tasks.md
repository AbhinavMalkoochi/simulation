# AgentWorld Tasks

## Completed

- [x] Fix decimal precision across backend and frontend (energy, emotions, resources, inventory)
- [x] Add 16 named map regions with spatial helper functions
- [x] Rewrite agent prompts to remove raw coordinates, use region names and relative directions
- [x] Replace moveTo(x,y) with semantic movement tools (goToResource, goToPerson, goToArea, goToBuilding)
- [x] Rewrite system prompt: balanced life model, inner life guidance, encourage conversation
- [x] Expand conversation system: 2-4 sentences, 8 exchange cap, setPlan/proposeTrade tools
- [x] Enrich agent backstories with personal dreams and goals
- [x] Add settlement detection (clustered buildings form named settlements)
- [x] Reduce map from 80x80 to 50x50, add social-seeking idle behavior (40%)
- [x] Restructure UI: Chronicle tab for daily summaries, Events tab for raw logs
- [x] Code quality audit: fix hook deps, remove dead code, improve typing

## Backlog

- [ ] Add agent professions/specializations (builder, healer, trader, farmer, explorer)
- [ ] Town naming: agents vote on settlement names
- [ ] Shops: markets generate income for owners
- [ ] Skill progression: agents improve skills through practice
- [ ] Relationship events: friendships, rivalries, mentorship
- [ ] Community projects: agents collaborate on large builds
- [ ] More building types: tavern, library, watchtower
- [ ] Weather effects on agent mood and behavior
- [ ] Night behavior: agents sleep, reduced visibility
- [ ] Agent death/respawn mechanics
