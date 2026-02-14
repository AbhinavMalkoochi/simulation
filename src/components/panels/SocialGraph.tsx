import { useRef, useEffect } from "react";

interface Agent {
  _id: string;
  name: string;
  spriteSeed: number;
}

interface Relationship {
  agentId: string;
  targetAgentId: string;
  trust: number;
  affinity: number;
  interactionCount: number;
}

interface Alliance {
  _id: string;
  name: string;
  memberIds: string[];
}

interface SocialGraphProps {
  agents: Agent[];
  relationships: Relationship[];
  alliances: Alliance[];
}

const COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#f1c40f", "#00bcd4", "#ff6b81",
];

interface Node {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function SocialGraph({ agents, relationships, alliances }: SocialGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * 2;
    canvas.height = h * 2;

    const nodes: Node[] = agents.map((a) => ({
      id: a._id,
      name: a.name,
      color: COLORS[a.spriteSeed % COLORS.length],
      x: w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      vx: 0,
      vy: 0,
    }));

    if (nodesRef.current.length === nodes.length) {
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].x = nodesRef.current[i].x;
        nodes[i].y = nodesRef.current[i].y;
        nodes[i].vx = nodesRef.current[i].vx;
        nodes[i].vy = nodesRef.current[i].vy;
      }
    }
    nodesRef.current = nodes;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(2, 0, 0, 2, 0, 0);

    function simulate() {
      const damping = 0.85;
      const repulsion = 800;
      const attraction = 0.02;
      const centerPull = 0.005;

      for (const node of nodes) {
        node.vx += (w / 2 - node.x) * centerPull;
        node.vy += (h / 2 - node.y) * centerPull;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(10, Math.sqrt(dx * dx + dy * dy));
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      for (const rel of relationships) {
        const a = nodeMap.get(rel.agentId);
        const b = nodeMap.get(rel.targetAgentId);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const strength = attraction * (1 + rel.interactionCount * 0.1);
        a.vx += dx * strength;
        a.vy += dy * strength;
        b.vx -= dx * strength;
        b.vy -= dy * strength;
      }

      for (const node of nodes) {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(20, Math.min(w - 20, node.x));
        node.y = Math.max(20, Math.min(h - 20, node.y));
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (const rel of relationships) {
        const a = nodeMap.get(rel.agentId);
        const b = nodeMap.get(rel.targetAgentId);
        if (!a || !b) continue;
        const alpha = Math.min(0.5, 0.08 + rel.interactionCount * 0.04);
        ctx.strokeStyle = rel.trust > 0.2 ? `rgba(34,197,94,${alpha})` : rel.trust < -0.2 ? `rgba(239,68,68,${alpha})` : `rgba(163,163,163,${alpha})`;
        ctx.lineWidth = Math.min(2.5, 0.5 + rel.interactionCount * 0.25);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.font = "500 9px Inter, sans-serif";
        ctx.fillStyle = "#737373";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.x, node.y + 16);
      }
    }

    function tick() {
      simulate();
      draw();
      frameRef.current = requestAnimationFrame(tick);
    }
    tick();

    return () => cancelAnimationFrame(frameRef.current);
  }, [agents, relationships, alliances]);

  return (
    <div className="flex flex-col gap-3">
      <canvas ref={canvasRef} className="w-full h-48 bg-neutral-50 rounded-lg border border-neutral-100" />
      {alliances.length > 0 && (
        <div>
          <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Alliances</h4>
          <div className="flex flex-col gap-1">
            {alliances.map((a) => (
              <div key={a._id} className="px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-100">
                <span className="text-neutral-800 font-medium">{a.name}</span>
                <span className="text-neutral-400 ml-1.5">{a.memberIds.length} members</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
