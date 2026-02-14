import {
  MessageSquare,
  Sprout,
  Hammer,
  Building2,
  Handshake,
  Gift,
  Sword,
  Vote,
  Zap,
  Globe,
  AlertCircle,
  Flag,
} from "lucide-react";

export const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  moving: "Moving",
  talking: "Talking",
  working: "Working",
  sleeping: "Sleeping",
  exploring: "Exploring",
};

export const EVENT_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  conversation: MessageSquare,
  gather: Sprout,
  craft: Hammer,
  build: Building2,
  trade: Handshake,
  gift: Gift,
  alliance: Sword,
  governance: Vote,
  god_action: Zap,
  world_created: Globe,
  conflict: AlertCircle,
  territory: Flag,
};

export const EVENT_TYPE_COLOR: Record<string, string> = {
  conversation: "bg-blue-500",
  gather: "bg-emerald-500",
  craft: "bg-amber-500",
  build: "bg-orange-500",
  trade: "bg-yellow-500",
  gift: "bg-rose-500",
  alliance: "bg-purple-500",
  governance: "bg-violet-500",
  god_action: "bg-neutral-500",
  world_created: "bg-emerald-500",
  conflict: "bg-red-500",
  territory: "bg-cyan-500",
};

export const SKIN_COLORS = [
  0xf5d0a9, 0xd4a76a, 0xc68642, 0x8d5524, 0xffdbb4, 0xe8b88a,
];

export const HAIR_COLORS = [
  0x2c1b0e, 0x5c3317, 0xa0522d, 0xffd700, 0xc04000, 0x1a1a2e, 0xe8e8e8,
  0x4a2c2a,
];

export function formatTime12h(timeOfDay: number): string {
  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay - hours) * 60);
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}
