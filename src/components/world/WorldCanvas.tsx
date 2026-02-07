import { useEffect, useRef } from "react";
import { GameWorld } from "./GameWorld";
import type { AgentSpriteData, ResourceData, BuildingData, WorldEvent, AllianceData } from "../../types";

interface WorldCanvasProps {
  agents: AgentSpriteData[];
  resources: ResourceData[];
  buildings: BuildingData[];
  events: WorldEvent[];
  alliances: AllianceData[];
  mapSeed: number;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  timeOfDay: number;
  weather: string;
  onAgentSelect: (agentId: string) => void;
}

const ALLIANCE_COLORS = [0x3b82f6, 0xef4444, 0x22c55e, 0xeab308, 0xa855f7, 0xf97316, 0x06b6d4, 0xec4899];

export function WorldCanvas({
  agents,
  resources,
  buildings,
  events,
  alliances,
  mapSeed,
  mapWidth,
  mapHeight,
  tileSize,
  timeOfDay,
  weather,
  onAgentSelect,
}: WorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const onAgentSelectRef = useRef(onAgentSelect);
  const processedEventIds = useRef(new Set<string>());

  useEffect(() => {
    onAgentSelectRef.current = onAgentSelect;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const world = new GameWorld();
    worldRef.current = world;

    world.init(el).then(() => {
      if (cancelled) return;
      world.setMap(mapSeed, mapWidth, mapHeight, tileSize);
      world.setOnAgentSelect((id: string) => onAgentSelectRef.current(id));
    });

    return () => {
      cancelled = true;
      world.destroy();
      worldRef.current = null;
    };
  }, [mapSeed, mapWidth, mapHeight, tileSize]);

  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;
    w.updateAgents(agents);
    w.updateResources(resources);
    w.updateBuildings(buildings);
    w.updateTimeOfDay(timeOfDay);
    w.updateWeather(weather);
  }, [agents, resources, buildings, timeOfDay, weather]);

  // Process new world events for speech bubbles and trade animations
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;

    for (const event of events) {
      if (processedEventIds.current.has(event._id)) continue;
      processedEventIds.current.add(event._id);

      if (event.type === "conversation" && event.involvedAgentIds.length >= 1) {
        const match = event.description.match(/said to .+?: "(.+?)"/);
        if (match) {
          w.showSpeechBubble(event.involvedAgentIds[0], match[1]);
        }
      }

      if ((event.type === "trade" || event.type === "gift") && event.involvedAgentIds.length >= 2) {
        w.showTransferAnimation(event.involvedAgentIds[0], event.involvedAgentIds[1]);
        w.spawnParticles(event.involvedAgentIds[0], 0xfbbf24, 6);
      }

      if (event.type === "gather" && event.involvedAgentIds.length >= 1) {
        w.spawnParticles(event.involvedAgentIds[0], 0x22c55e, 4);
      }

      if (event.type === "craft" && event.involvedAgentIds.length >= 1) {
        w.spawnParticles(event.involvedAgentIds[0], 0xfbbf24, 5);
      }

      if (event.type === "build" && event.involvedAgentIds.length >= 1) {
        w.spawnParticles(event.involvedAgentIds[0], 0x9ca3af, 8);
      }
    }

    // Cap processed IDs to prevent memory growth
    if (processedEventIds.current.size > 500) {
      const ids = Array.from(processedEventIds.current);
      processedEventIds.current = new Set(ids.slice(-200));
    }
  }, [events]);

  // Territory shading based on alliances
  useEffect(() => {
    const w = worldRef.current;
    if (!w || alliances.length === 0) return;

    const agentMap = new Map(agents.map((a) => [a._id, a.position]));
    const buildingPositions = buildings.map((b) => ({ x: b.posX, y: b.posY, allianceId: b.allianceId }));

    const territories = alliances.map((alliance, idx) => {
      const positions: Array<{ x: number; y: number }> = [];
      // Member positions
      for (const memberId of alliance.memberIds) {
        const pos = agentMap.get(memberId);
        if (pos) positions.push(pos);
      }
      // Alliance building positions
      for (const bp of buildingPositions) {
        if (bp.allianceId === alliance._id) positions.push({ x: bp.x, y: bp.y });
      }
      return { positions, color: ALLIANCE_COLORS[idx % ALLIANCE_COLORS.length] };
    });

    w.updateTerritoryOverlay(territories);
  }, [agents, buildings, alliances]);

  return <div ref={containerRef} className="flex-1 relative" />;
}
