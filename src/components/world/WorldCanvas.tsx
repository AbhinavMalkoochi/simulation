import { useEffect, useRef } from "react";
import { GameWorld } from "./GameWorld";
import type { AgentSpriteData, ResourceData, BuildingData } from "../../types";

interface WorldCanvasProps {
  agents: AgentSpriteData[];
  resources: ResourceData[];
  buildings: BuildingData[];
  mapSeed: number;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  timeOfDay: number;
  weather: string;
  onAgentSelect: (agentId: string) => void;
}

export function WorldCanvas({
  agents,
  resources,
  buildings,
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
  onAgentSelectRef.current = onAgentSelect;

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

  return <div ref={containerRef} className="flex-1 relative" />;
}
