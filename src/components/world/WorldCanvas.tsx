import { useEffect, useRef } from "react";
import { GameWorld } from "./GameWorld";

interface Agent {
  _id: string;
  name: string;
  position: { x: number; y: number };
  status: string;
  spriteSeed: number;
  energy: number;
}

interface WorldCanvasProps {
  agents: Agent[];
  mapSeed: number;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  onAgentSelect: (agentId: string) => void;
}

export function WorldCanvas({
  agents,
  mapSeed,
  mapWidth,
  mapHeight,
  tileSize,
  onAgentSelect,
}: WorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<GameWorld | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const world = new GameWorld();
    worldRef.current = world;
    world.init(el).then(() => {
      world.setMap(mapSeed, mapWidth, mapHeight, tileSize);
      world.setOnAgentSelect(onAgentSelect);
    });

    return () => {
      world.destroy();
      worldRef.current = null;
    };
  }, [mapSeed, mapWidth, mapHeight, tileSize, onAgentSelect]);

  useEffect(() => {
    worldRef.current?.updateAgents(agents);
  }, [agents]);

  return <div ref={containerRef} className="flex-1 relative" />;
}
