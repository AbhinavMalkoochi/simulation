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

export function WorldCanvas({
  agents, resources, buildings, events, alliances,
  mapSeed, mapWidth, mapHeight, tileSize,
  timeOfDay, weather, onAgentSelect,
}: WorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const callbackRef = useRef(onAgentSelect);

  useEffect(() => {
    callbackRef.current = onAgentSelect;
  });

  // Initialize/teardown GameWorld (only when map config changes)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const world = new GameWorld();
    worldRef.current = world;

    world.init(el).then(() => {
      if (cancelled) return;
      world.setMap(mapSeed, mapWidth, mapHeight, tileSize);
      world.setOnAgentSelect((id: string) => callbackRef.current(id));
    });

    return () => {
      cancelled = true;
      world.destroy();
      worldRef.current = null;
    };
  }, [mapSeed, mapWidth, mapHeight, tileSize]);

  // Observe container resizes (sidebar toggle, window resize) and force PixiJS to follow
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      worldRef.current?.resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Push all data updates to GameWorld in a single effect
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;

    w.updateAgents(agents);
    w.updateResources(resources);
    w.updateBuildings(buildings);
    w.updateTimeOfDay(timeOfDay);
    w.processEvents(events);
    w.updateTerritories(agents, buildings, alliances);
  }, [agents, resources, buildings, events, alliances, timeOfDay, weather]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
