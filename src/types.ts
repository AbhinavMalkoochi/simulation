import type { Doc } from "../convex/_generated/dataModel";
import { AGENT_COLORS } from "../convex/lib/constants";

export type AgentDoc = Doc<"agents">;
export type WorldStateDoc = Doc<"worldState">;
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
  readonly currentAction?: string;
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

export function agentColorHex(spriteSeed: number): string {
  return `#${AGENT_COLORS[spriteSeed % AGENT_COLORS.length].toString(16).padStart(6, "0")}`;
}
