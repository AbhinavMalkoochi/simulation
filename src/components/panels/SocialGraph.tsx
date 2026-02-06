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
    ctx.scale(2, 2);

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
        const alpha = Math.min(0.6, 0.1 + rel.interactionCount * 0.05);
        ctx.strokeStyle = rel.trust > 0.2 ? `rgba(74,222,128,${alpha})` : rel.trust < -0.2 ? `rgba(239,68,68,${alpha})` : `rgba(148,163,184,${alpha})`;
        ctx.lineWidth = Math.min(3, 0.5 + rel.interactionCount * 0.3);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = "9px Inter, sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.x, node.y + 18);
      }
    }

    function tick() {
      simulate();
      draw();
      frameRef.current = requestAnimationFrame(tick);
    }
    tick();

    return () => cancelAnimationFrame(frameRef.current);
  }, [agents, relationships]);

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={canvasRef} className="w-full h-48 bg-slate-900/50 rounded" />
      {alliances.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Alliances</h4>
          <div className="flex flex-col gap-1">
            {alliances.map((a) => (
              <div key={a._id} className="px-2 py-1 bg-slate-800/40 rounded text-xs">
                <span className="text-purple-400 font-medium">{a.name}</span>
                <span className="text-slate-500 ml-1">({a.memberIds.length} members)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
