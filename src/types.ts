import type { Doc } from "../convex/_generated/dataModel";
import { AGENT_COLORS } from "../convex/lib/constants";

export type AgentDoc = Doc<"agents">;

export type WorldEvent = Pick<Doc<"worldEvents">, "_id" | "type" | "description" | "tick">;

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

export function agentColorHex(spriteSeed: number): string {
  return `#${AGENT_COLORS[spriteSeed % AGENT_COLORS.length].toString(16).padStart(6, "0")}`;
}
