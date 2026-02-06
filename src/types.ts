import type { Id } from "../convex/_generated/dataModel";

export interface AgentDoc {
  _id: Id<"agents">;
  name: string;
  backstory: string;
  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  path?: { x: number; y: number }[];
  energy: number;
  emotion: { valence: number; arousal: number };
  status: string;
  currentPlan?: string;
  currentAction?: string;
  skills: Record<string, number>;
  spriteSeed: number;
}

export interface WorldEvent {
  _id: string;
  type: string;
  description: string;
  tick: number;
}

export interface AgentSpriteData {
  _id: string;
  name: string;
  position: { x: number; y: number };
  status: string;
  spriteSeed: number;
  energy: number;
}

export interface ResourceData {
  _id: string;
  tileX: number;
  tileY: number;
  type: string;
  quantity: number;
}

export interface BuildingData {
  _id: string;
  type: string;
  posX: number;
  posY: number;
  level: number;
}

export const STATUS_BADGE: Record<string, string> = {
  idle: "bg-slate-600",
  moving: "bg-emerald-600",
  talking: "bg-blue-600",
  working: "bg-amber-600",
  sleeping: "bg-indigo-600",
  exploring: "bg-pink-600",
};

export function agentColorHex(spriteSeed: number, colors: number[]): string {
  return `#${colors[spriteSeed % colors.length].toString(16).padStart(6, "0")}`;
}
