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
- [x] Fix TypeScript error in interview.ts (missing settlements arg)
- [x] Fix CSS @import order error (remove redundant Google Fonts import)
- [x] Fix storehouse-alliance linkage (storehouses now get allianceId on build)
- [x] Fix ticksAgo operator precedence bug in seekAgentAction
- [x] Fix resetWorld to clear buildingInventory and reputation tables
- [x] Fix pendingProposals missing allianceName resolution
- [x] Fix getDayEvents truncation (proper tick range query)
- [x] Deduplicate constants (STATUS_LABEL, SKIN/HAIR_COLORS, EVENT_TYPE icons/colors, formatTime)
- [x] Remove dead updateWeather no-op, add useMemo to App.tsx
- [x] Add beliefs/values system (beliefs table, storeBelief mutation, reflection integration)
- [x] Deepen relationship system (sharedExperiences, lastTopics, opinion, role)
- [x] Auto-extract conversation topics and shared experiences on conv close
- [x] Add shareBelief and proposeIdea conversation tools
- [x] Increase conversation cap for extraverted agents
- [x] Add conversation quality heuristic for relationship boosts
- [x] Add event-driven emotions (personality-modulated responses)
- [x] Add skill progression through use (gathering, crafting, building)
- [x] Add emergent interests, habits, longTermGoal from reflections
- [x] Expand organizations: alliance/company/religion/club/cult with ideology
- [x] Rework AgentInspector: beliefs, relationships, archetype, mood, habits, skills/10

## Backlog

- [ ] Add agent professions/specializations (builder, healer, trader, farmer, explorer)
- [ ] Town naming: agents vote on settlement names
- [ ] Shops: markets generate income for owners
- [ ] Relationship events: friendships, rivalries, mentorship
- [ ] Community projects: agents collaborate on large builds
- [ ] More building types: tavern, library, watchtower
- [ ] Weather effects on agent mood and behavior
- [ ] Night behavior: agents sleep, reduced visibility
- [ ] Agent death/respawn mechanics
- [ ] Gossip system: agents share observations about others
- [ ] Ritual system: organizations have regular practices
- [ ] Personality-weighted tool selection
