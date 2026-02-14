import { AGENT_COLORS } from "../../../convex/lib/constants";
import { SKIN_COLORS, HAIR_COLORS } from "../../constants";

function hexToRgb(hex: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgb(${r}, ${g}, ${b})`;
}

interface AgentAvatarProps {
  spriteSeed: number;
  size?: number;
  className?: string;
}

export function AgentAvatar({ spriteSeed, size = 32, className }: AgentAvatarProps) {
  const agentColor = AGENT_COLORS[spriteSeed % AGENT_COLORS.length];
  const skinColor = SKIN_COLORS[spriteSeed % SKIN_COLORS.length];
  const hairColor = HAIR_COLORS[spriteSeed % HAIR_COLORS.length];
  const s = size * 0.12; // pixel size (same ratio as GameWorld)

  const hairStyle = spriteSeed % 4;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-size * 0.5} ${-size * 0.5} ${size} ${size}`}
      className={className}
      style={{ display: "block" }}
    >
      {/* Body/shirt (4x3 pixels centered) */}
      <rect x={-s * 2} y={-s * 0.5} width={s * 4} height={s * 3} fill={hexToRgb(agentColor)} />

      {/* Head (3x3 pixels) */}
      <rect x={-s * 1.5} y={-s * 3.5} width={s * 3} height={s * 3} fill={hexToRgb(skinColor)} />

      {/* Hair */}
      {hairStyle === 0 && (
        <>
          {/* Full top hair */}
          <rect x={-s * 1.8} y={-s * 4} width={s * 3.6} height={s * 1.2} fill={hexToRgb(hairColor)} />
        </>
      )}
      {hairStyle === 1 && (
        <>
          {/* Side part */}
          <rect x={-s * 1.8} y={-s * 4} width={s * 3.6} height={s * 0.8} fill={hexToRgb(hairColor)} />
          <rect x={-s * 1.8} y={-s * 3.5} width={s * 0.8} height={s * 1.5} fill={hexToRgb(hairColor)} />
        </>
      )}
      {hairStyle === 2 && (
        <>
          {/* Spiky */}
          <rect x={-s * 1.5} y={-s * 4.2} width={s * 1} height={s * 1.5} fill={hexToRgb(hairColor)} />
          <rect x={-s * 0.25} y={-s * 4.4} width={s * 1} height={s * 1.5} fill={hexToRgb(hairColor)} />
          <rect x={s * 0.8} y={-s * 4} width={s * 1} height={s * 1.2} fill={hexToRgb(hairColor)} />
        </>
      )}
      {hairStyle === 3 && (
        <>
          {/* Bun/long */}
          <rect x={-s * 1.8} y={-s * 4} width={s * 3.6} height={s * 0.8} fill={hexToRgb(hairColor)} />
          <rect x={s * 1.2} y={-s * 3.8} width={s * 1} height={s * 2} fill={hexToRgb(hairColor)} />
        </>
      )}

      {/* Eyes */}
      <rect x={-s * 0.8} y={-s * 2.2} width={s * 0.5} height={s * 0.5} fill="rgb(26, 26, 46)" />
      <rect x={s * 0.3} y={-s * 2.2} width={s * 0.5} height={s * 0.5} fill="rgb(26, 26, 46)" />

      {/* Legs */}
      <rect x={-s * 1.2} y={s * 2.5} width={s * 1.2} height={s * 1.2} fill="rgb(55, 65, 81)" opacity="0.9" />
      <rect x={s * 0} y={s * 2.5} width={s * 1.2} height={s * 1.2} fill="rgb(55, 65, 81)" opacity="0.9" />

      {/* White outline for visibility */}
      <rect
        x={-s * 2.2}
        y={-s * 4.6}
        width={s * 4.4}
        height={s * 7.5}
        fill="none"
        stroke="white"
        strokeWidth="0.8"
        opacity="0.3"
        rx="1"
      />
    </svg>
  );
}
