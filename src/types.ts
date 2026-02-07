import type { Doc } from "../convex/_generated/dataModel";
import { AGENT_COLORS } from "../convex/lib/constants";

export type AgentDoc = Doc<"agents">;
export type AgentStatus = "idle" | "moving" | "talking" | "working" | "sleeping" | "exploring";
export type ResourceType = "wood" | "stone" | "food" | "metal" | "herbs";
export type BuildingType = "shelter" | "workshop" | "market" | "meetingHall" | "farm" | "storehouse";
export type WeatherType = "clear" | "rain" | "storm" | "fog";
export type SeasonType = "spring" | "summer" | "autumn" | "winter";

export type WorldEvent = Pick<Doc<"worldEvents">, "_id" | "type" | "description" | "tick" | "involvedAgentIds">;

export interface AgentSpriteData {
  readonly _id: string;
  readonly name: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly status: AgentStatus;
  readonly spriteSeed: number;
  readonly energy: number;
}

export interface ResourceData {
  readonly _id: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly type: ResourceType;
  readonly quantity: number;
}

export interface BuildingData {
  readonly _id: string;
  readonly type: BuildingType;
  readonly posX: number;
  readonly posY: number;
  readonly level: number;
  readonly allianceId?: string;
}

export interface AllianceData {
  readonly _id: string;
  readonly name: string;
  readonly memberIds: readonly string[];
}

export const STATUS_BADGE: Readonly<Record<AgentStatus, string>> = {
  idle: "bg-slate-600",
  moving: "bg-emerald-600",
  talking: "bg-blue-600",
  working: "bg-amber-600",
  sleeping: "bg-indigo-600",
  exploring: "bg-pink-600",
} as const;

export function agentColorHex(spriteSeed: number): string {
  return `#${AGENT_COLORS[spriteSeed % AGENT_COLORS.length].toString(16).padStart(6, "0")}`;
}
