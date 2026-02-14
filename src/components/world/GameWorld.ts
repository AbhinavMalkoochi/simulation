import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { TILE_COLORS, AGENT_COLORS, TILE } from "../../../convex/lib/constants";
import { generateMap } from "../../../convex/lib/mapgen";
import { SKIN_COLORS, HAIR_COLORS } from "../../constants";
import type {
  AgentSpriteData,
  ResourceData,
  BuildingData,
  WorldEvent,
  AllianceData,
} from "../../types";

// --- Types ---

interface AgentSprite {
  container: Container;
  body: Graphics;
  shadow: Graphics;
  statusIcon: Graphics;
  label: Text;
  actionLabel: Text;
  targetX: number;
  targetY: number;
  lastStatus: string;
  animFrame: number;
  animTimer: number;
}

interface SpeechBubble {
  container: Container;
  createdAt: number;
  duration: number;
  agentId: string;
}

interface TransferAnimation {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
}

interface Particle {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

// --- Constants ---

const LABEL_STYLE = new TextStyle({
  fontSize: 9,
  fill: 0xe2e8f0,
  fontFamily: "Inter, sans-serif",
  fontWeight: "600",
  dropShadow: {
    color: 0x000000,
    blur: 3,
    distance: 1,
    alpha: 0.9,
  },
});

const ACTION_LABEL_STYLE = new TextStyle({
  fontSize: 9,
  fill: 0xffffff,
  fontFamily: "Inter, sans-serif",
  fontWeight: "700",
  dropShadow: {
    color: 0x000000,
    blur: 4,
    distance: 1,
    alpha: 0.95,
  },
});

const STATUS_ICONS: Record<string, { symbol: string; color: number }> = {
  idle: { symbol: "·", color: 0x94a3b8 },
  moving: { symbol: "→", color: 0x4ade80 },
  talking: { symbol: "T", color: 0x60a5fa },
  working: { symbol: "W", color: 0xfbbf24 },
  sleeping: { symbol: "z", color: 0x818cf8 },
  exploring: { symbol: "?", color: 0xf472b6 },
};

const RESOURCE_COLORS: Record<string, number> = {
  wood: 0x8b5e3c,
  stone: 0x9ca3af,
  food: 0xf97316,
  metal: 0x6b7280,
  herbs: 0x22c55e,
};

const BUILDING_COLORS: Record<string, number> = {
  shelter: 0xca8a04,
  workshop: 0xa16207,
  market: 0x0891b2,
  meetingHall: 0x7c3aed,
  farm: 0x65a30d,
  storehouse: 0x78716c,
};

// --- Seeded random for deterministic tile details ---
function seededHash(x: number, y: number, seed: number): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967296;
}

// --- Main class ---

export class GameWorld {
  private app: Application | null = null;
  private worldContainer: Container | null = null;
  private tileGraphics: Graphics | null = null;
  private tileDetailLayer: Container | null = null;
  private gridGraphics: Graphics | null = null;
  private resourceLayer: Container | null = null;
  private buildingLayer: Container | null = null;
  private agentContainer: Container | null = null;
  private speechBubbleLayer: Container | null = null;
  private animationLayer: Container | null = null;
  private particleLayer: Container | null = null;
  private territoryLayer: Graphics | null = null;
  private dayNightOverlay: Graphics | null = null;
  private starLayer: Graphics | null = null;

  private agentSprites = new Map<string, AgentSprite>();
  private speechBubbles = new Map<string, SpeechBubble>();
  private transferAnimations: TransferAnimation[] = [];
  private particles: Particle[] = [];

  private camera = { x: 0, y: 0, zoom: 1 };
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private cameraStart = { x: 0, y: 0 };

  private tileSize = 32;
  private mapWidth = 0;
  private mapHeight = 0;
  private mapSeed = 0;
  private mapTiles: number[] = [];
  private frameCount = 0;

  private onAgentSelect?: (agentId: string) => void;
  private _initialized = false;
  private _destroyed = false;
  private _abortController = new AbortController();

  async init(container: HTMLDivElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x2d6b3f,
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });

    if (this._destroyed) {
      try {
        this.app.destroy(true, { children: true });
      } catch {
        /* noop */
      }
      return;
    }

    container.appendChild(this.app.canvas);
    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    this.tileGraphics = new Graphics();
    this.worldContainer.addChild(this.tileGraphics);

    this.tileDetailLayer = new Container();
    this.worldContainer.addChild(this.tileDetailLayer);

    this.gridGraphics = new Graphics();
    this.worldContainer.addChild(this.gridGraphics);

    this.resourceLayer = new Container();
    this.worldContainer.addChild(this.resourceLayer);

    this.buildingLayer = new Container();
    this.worldContainer.addChild(this.buildingLayer);

    this.territoryLayer = new Graphics();
    this.worldContainer.addChild(this.territoryLayer);

    this.agentContainer = new Container();
    this.worldContainer.addChild(this.agentContainer);

    this.speechBubbleLayer = new Container();
    this.worldContainer.addChild(this.speechBubbleLayer);

    this.animationLayer = new Container();
    this.worldContainer.addChild(this.animationLayer);

    this.particleLayer = new Container();
    this.worldContainer.addChild(this.particleLayer);

    this.starLayer = new Graphics();
    this.worldContainer.addChild(this.starLayer);

    this.dayNightOverlay = new Graphics();
    this.worldContainer.addChild(this.dayNightOverlay);

    this.setupControls(this.app.canvas as HTMLCanvasElement);

    this.app.ticker.add(() => {
      this.frameCount++;
      this.animateAgents();
      this.animateSpeechBubbles();
      this.animateTransfers();
      this.animateParticles();
    });
    this._initialized = true;
  }

  setMap(seed: number, width: number, height: number, tileSize: number): void {
    if (!this._initialized) return;
    this.mapWidth = width;
    this.mapHeight = height;
    this.tileSize = tileSize;
    this.mapSeed = seed;

    this.mapTiles = generateMap(seed, width, height);
    this.renderTiles(this.mapTiles);
    this.renderTileDetails(this.mapTiles, seed);
    this.renderGrid();
    this.generateStars(seed);
    this.centerCamera();
  }

  setOnAgentSelect(cb: (agentId: string) => void): void {
    this.onAgentSelect = cb;
  }

  updateAgents(agents: AgentSpriteData[]): void {
    if (!this._initialized) return;
    const currentIds = new Set(agents.map((a) => a._id));

    for (const [id, sprite] of this.agentSprites) {
      if (!currentIds.has(id)) {
        this.agentContainer!.removeChild(sprite.container);
        sprite.container.destroy({ children: true });
        this.agentSprites.delete(id);
      }
    }

    for (const agent of agents) {
      let sprite = this.agentSprites.get(agent._id);
      if (!sprite) {
        sprite = this.createAgentSprite(agent);
        this.agentSprites.set(agent._id, sprite);
      }

      sprite.targetX = agent.position.x * this.tileSize + this.tileSize / 2;
      sprite.targetY = agent.position.y * this.tileSize + this.tileSize / 2;

      // Update status icon and action label
      if (sprite.lastStatus !== agent.status) {
        sprite.lastStatus = agent.status;
        this.updateStatusIcon(sprite, agent.status);
        this.updateActionLabel(sprite, agent.status, agent.currentAction);
      }
    }
  }

  updateResources(resources: ResourceData[]): void {
    if (!this._initialized) return;
    const layer = this.resourceLayer!;

    // Clear existing children
    while (layer.children.length > 0) {
      const child = layer.children[0];
      layer.removeChild(child);
      child.destroy();
    }

    const ts = this.tileSize;
    const half = ts / 2;

    for (const res of resources) {
      if (res.quantity <= 0) continue;
      const gfx = new Graphics();
      const cx = res.tileX * ts + half;
      const cy = res.tileY * ts + half;

      this.drawResourceIcon(gfx, res.type, cx, cy, ts);
      layer.addChild(gfx);
    }
  }

  updateBuildings(buildings: BuildingData[]): void {
    if (!this._initialized) return;
    const layer = this.buildingLayer!;

    while (layer.children.length > 0) {
      const child = layer.children[0];
      layer.removeChild(child);
      child.destroy();
    }

    const ts = this.tileSize;

    for (const bld of buildings) {
      const gfx = new Graphics();
      this.drawBuildingIcon(gfx, bld.type, bld.posX * ts, bld.posY * ts, ts);
      layer.addChild(gfx);
    }
  }

  updateTimeOfDay(timeOfDay: number): void {
    if (!this._initialized) return;
    const totalW = this.mapWidth * this.tileSize;
    const totalH = this.mapHeight * this.tileSize;

    // Day/night overlay with color tints
    const overlay = this.dayNightOverlay!;
    overlay.clear();

    const darkness = this.getDarkness(timeOfDay);
    if (darkness > 0) {
      // Night: deep blue. Dawn/dusk: warm orange tint
      const isDawnDusk =
        (timeOfDay > 5 && timeOfDay < 7) || (timeOfDay > 18 && timeOfDay < 21);
      const tintColor = isDawnDusk ? 0x1a0500 : 0x000022;
      overlay
        .rect(0, 0, totalW, totalH)
        .fill({ color: tintColor, alpha: darkness });
    }

    // Stars visibility
    if (this.starLayer) {
      const starAlpha =
        timeOfDay >= 21 || timeOfDay <= 5
          ? 0.7
          : timeOfDay > 19
            ? ((timeOfDay - 19) / 2) * 0.7
            : timeOfDay < 6
              ? (6 - timeOfDay) * 0.7
              : 0;
      this.starLayer.alpha = starAlpha;
    }
  }


  private processedEventIds = new Set<string>();

  /** Process new world events — call on every render with the latest events array */
  processEvents(events: readonly WorldEvent[]): void {
    if (!this._initialized) return;

    for (const event of events) {
      if (this.processedEventIds.has(event._id)) continue;
      this.processedEventIds.add(event._id);

      if (event.type === "conversation" && event.involvedAgentIds.length >= 1) {
        const match = event.description.match(/said to .+?: "(.+?)"/);
        if (match) {
          this.showSpeechBubble(event.involvedAgentIds[0], match[1], 7000);
        }
      }

      if (
        (event.type === "trade" || event.type === "gift") &&
        event.involvedAgentIds.length >= 2
      ) {
        this.showTransferAnimation(
          event.involvedAgentIds[0],
          event.involvedAgentIds[1],
        );
        this.spawnParticles(event.involvedAgentIds[0], 0xfbbf24, 6);
      }

      if (event.type === "gather" && event.involvedAgentIds.length >= 1) {
        this.spawnParticles(event.involvedAgentIds[0], 0x22c55e, 4);
      }

      if (event.type === "craft" && event.involvedAgentIds.length >= 1) {
        this.spawnParticles(event.involvedAgentIds[0], 0xfbbf24, 5);
      }

      if (event.type === "build" && event.involvedAgentIds.length >= 1) {
        this.spawnParticles(event.involvedAgentIds[0], 0x9ca3af, 8);
      }
    }

    // Cap processed IDs to prevent memory growth
    if (this.processedEventIds.size > 500) {
      const ids = Array.from(this.processedEventIds);
      this.processedEventIds = new Set(ids.slice(-200));
    }
  }

  private static readonly ALLIANCE_COLORS = [
    0x3b82f6, 0xef4444, 0x22c55e, 0xeab308, 0xa855f7, 0xf97316, 0x06b6d4,
    0xec4899,
  ];

  /** Update territory overlay from alliance data */
  updateTerritories(
    agents: readonly AgentSpriteData[],
    buildings: readonly BuildingData[],
    alliances: readonly AllianceData[],
  ): void {
    if (!this._initialized || alliances.length === 0) {
      this.territoryLayer?.clear();
      return;
    }

    const agentMap = new Map(agents.map((a) => [a._id, a.position]));
    const buildingPositions = buildings.map((b) => ({
      x: b.posX,
      y: b.posY,
      allianceId: b.allianceId,
    }));

    const territories = alliances.map((alliance, idx) => {
      const positions: Array<{ x: number; y: number }> = [];
      for (const memberId of alliance.memberIds) {
        const pos = agentMap.get(memberId);
        if (pos) positions.push({ x: pos.x, y: pos.y });
      }
      for (const bp of buildingPositions) {
        if (bp.allianceId === alliance._id)
          positions.push({ x: bp.x, y: bp.y });
      }
      return {
        positions,
        color:
          GameWorld.ALLIANCE_COLORS[idx % GameWorld.ALLIANCE_COLORS.length],
      };
    });

    this.updateTerritoryOverlay(territories);
  }

  showSpeechBubble(agentId: string, message: string, durationMs = 4000): void {
    if (!this._initialized || !this.speechBubbleLayer) return;

    const existing = this.speechBubbles.get(agentId);
    if (existing) {
      this.speechBubbleLayer.removeChild(existing.container);
      existing.container.destroy({ children: true });
    }

    const sprite = this.agentSprites.get(agentId);
    if (!sprite) return;

    const bubbleContainer = new Container();
    const truncated =
      message.length > 100 ? message.slice(0, 97) + "..." : message;

    const bubbleText = new Text({
      text: truncated,
      style: new TextStyle({
        fontSize: 10,
        fill: 0x1e293b,
        fontFamily: "Inter, sans-serif",
        fontWeight: "500",
        wordWrap: true,
        wordWrapWidth: 180,
        lineHeight: 14,
        letterSpacing: 0.2,
      }),
    });
    bubbleText.x = 10;
    bubbleText.y = 8;

    const bgWidth = Math.min(200, Math.max(120, bubbleText.width + 20));
    const bgHeight = bubbleText.height + 16;

    const bg = new Graphics();
    bg.roundRect(0, 0, bgWidth, bgHeight, 6).fill({
      color: 0xf8fafc,
      alpha: 0.95,
    });
    bg.roundRect(0, 0, bgWidth, bgHeight, 6).stroke({
      color: 0xe2e8f0,
      width: 0.5,
      alpha: 0.5,
    });
    // Triangle tail pointing down
    bg.moveTo(bgWidth / 2 - 4, bgHeight)
      .lineTo(bgWidth / 2, bgHeight + 5)
      .lineTo(bgWidth / 2 + 4, bgHeight)
      .fill({ color: 0xf8fafc, alpha: 0.95 });

    bubbleContainer.addChild(bg);
    bubbleContainer.addChild(bubbleText);

    // Position and clamp within map bounds
    const maxX = this.mapWidth * this.tileSize;
    const maxY = this.mapHeight * this.tileSize;
    bubbleContainer.x = Math.max(2, Math.min(maxX - bgWidth - 2, sprite.container.x - bgWidth / 2));
    bubbleContainer.y = Math.max(2, Math.min(maxY - bgHeight - 2, sprite.container.y - this.tileSize * 1.2 - bgHeight - 6));

    this.speechBubbleLayer.addChild(bubbleContainer);
    this.speechBubbles.set(agentId, {
      container: bubbleContainer,
      createdAt: performance.now(),
      duration: durationMs,
      agentId,
    });
  }

  showTransferAnimation(
    fromAgentId: string,
    toAgentId: string,
    itemColor = 0xfbbf24,
  ): void {
    if (!this._initialized || !this.animationLayer) return;
    const fromSprite = this.agentSprites.get(fromAgentId);
    const toSprite = this.agentSprites.get(toAgentId);
    if (!fromSprite || !toSprite) return;

    const gfx = new Graphics();
    gfx.circle(0, 0, 4).fill({ color: itemColor, alpha: 0.9 });
    gfx.position.set(fromSprite.container.x, fromSprite.container.y);
    this.animationLayer.addChild(gfx);

    this.transferAnimations.push({
      gfx,
      fromX: fromSprite.container.x,
      fromY: fromSprite.container.y,
      toX: toSprite.container.x,
      toY: toSprite.container.y,
      progress: 0,
      speed: 0.02,
    });
  }

  /** Spawn particles at an agent's position */
  spawnParticles(agentId: string, color: number, count: number): void {
    if (!this._initialized || !this.particleLayer) return;
    const sprite = this.agentSprites.get(agentId);
    if (!sprite) return;

    for (let i = 0; i < count; i++) {
      const gfx = new Graphics();
      const size = 1.5 + Math.random() * 2;
      gfx.circle(0, 0, size).fill({ color, alpha: 0.8 });
      gfx.position.set(sprite.container.x, sprite.container.y - 8);
      this.particleLayer.addChild(gfx);

      this.particles.push({
        gfx,
        x: sprite.container.x,
        y: sprite.container.y - 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.5 - 0.5,
        life: 60 + Math.random() * 40,
        maxLife: 60 + Math.random() * 40,
      });
    }
  }

  updateTerritoryOverlay(
    territories: Array<{
      positions: Array<{ x: number; y: number }>;
      color: number;
    }>,
  ): void {
    if (!this._initialized || !this.territoryLayer) return;
    this.territoryLayer.clear();

    for (const territory of territories) {
      for (const pos of territory.positions) {
        const radius = 3;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const tx = pos.x + dx;
            const ty = pos.y + dy;
            if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight)
              continue;
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist > radius) continue;
            const alpha = 0.06 * (1 - dist / (radius + 1));
            this.territoryLayer
              .rect(
                tx * this.tileSize,
                ty * this.tileSize,
                this.tileSize,
                this.tileSize,
              )
              .fill({ color: territory.color, alpha });
          }
        }
      }
    }
  }

  destroy(): void {
    this._destroyed = true;
    this._abortController.abort();
    if (this._initialized) {
      try {
        this.app!.destroy(true, { children: true });
      } catch {
        /* noop */
      }
    }
  }

  // --- Private rendering ---

  private renderTiles(mapTiles: number[]): void {
    const gfx = this.tileGraphics!;
    gfx.clear();
    const ts = this.tileSize;

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = mapTiles[y * this.mapWidth + x];
        const baseColor = TILE_COLORS[tileType] ?? 0x000000;
        // Add subtle variation based on position
        const variation = seededHash(x, y, this.mapSeed) * 0.08 - 0.04;
        const color = this.adjustBrightness(baseColor, variation);
        gfx.rect(x * ts, y * ts, ts, ts).fill(color);
      }
    }
  }

  private renderTileDetails(mapTiles: number[], seed: number): void {
    const layer = this.tileDetailLayer!;
    while (layer.children.length > 0) {
      const child = layer.children[0];
      layer.removeChild(child);
      child.destroy();
    }

    const ts = this.tileSize;
    const detailGfx = new Graphics();

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = mapTiles[y * this.mapWidth + x];
        const hash = seededHash(x, y, seed + 1);
        const bx = x * ts;
        const by = y * ts;

        if (tileType === TILE.GRASS) {
          // Grass blades and flowers
          if (hash < 0.3) {
            const gx = bx + hash * ts * 0.6 + ts * 0.2;
            const gy = by + seededHash(x, y, seed + 2) * ts * 0.6 + ts * 0.2;
            detailGfx.circle(gx, gy, 1.2).fill({ color: 0x2db84b, alpha: 0.5 });
          }
          if (hash > 0.85) {
            // Small flowers
            const fx = bx + hash * ts * 0.5 + ts * 0.25;
            const fy = by + seededHash(x, y, seed + 3) * ts * 0.5 + ts * 0.25;
            const flowerColors = [0xff6b9d, 0xffd93d, 0xc084fc, 0xffffff];
            const fcolor =
              flowerColors[
                Math.floor(seededHash(x, y, seed + 4) * flowerColors.length)
              ];
            detailGfx.circle(fx, fy, 1.5).fill({ color: fcolor, alpha: 0.7 });
          }
        } else if (tileType === TILE.FOREST) {
          // Draw trees as small triangles
          const cx = bx + ts / 2 + (hash - 0.5) * 6;
          const cy = by + ts / 2 + (seededHash(x, y, seed + 5) - 0.5) * 4;
          const treeSize = 5 + hash * 4;

          // Tree trunk
          detailGfx
            .rect(cx - 1, cy + treeSize * 0.3, 2, treeSize * 0.4)
            .fill({ color: 0x4a3728, alpha: 0.8 });
          // Tree canopy (triangle)
          detailGfx
            .moveTo(cx, cy - treeSize * 0.5)
            .lineTo(cx - treeSize * 0.5, cy + treeSize * 0.3)
            .lineTo(cx + treeSize * 0.5, cy + treeSize * 0.3)
            .closePath()
            .fill({ color: 0x1a7a2e, alpha: 0.85 });

          // Second tree if hash is high
          if (hash > 0.5) {
            const cx2 = bx + ts * 0.3 + seededHash(x, y, seed + 6) * ts * 0.15;
            const cy2 = by + ts * 0.6;
            const size2 = 3 + seededHash(x, y, seed + 7) * 3;
            detailGfx
              .rect(cx2 - 0.8, cy2 + size2 * 0.3, 1.6, size2 * 0.3)
              .fill({ color: 0x4a3728, alpha: 0.7 });
            detailGfx
              .moveTo(cx2, cy2 - size2 * 0.4)
              .lineTo(cx2 - size2 * 0.4, cy2 + size2 * 0.3)
              .lineTo(cx2 + size2 * 0.4, cy2 + size2 * 0.3)
              .closePath()
              .fill({ color: 0x0f5e1e, alpha: 0.8 });
          }
        } else if (tileType === TILE.WATER) {
          // Water highlights
          if (hash < 0.15) {
            const wx = bx + hash * ts;
            const wy = by + seededHash(x, y, seed + 8) * ts;
            detailGfx
              .moveTo(wx, wy)
              .lineTo(wx + 4, wy)
              .stroke({ color: 0x60a5fa, width: 0.5, alpha: 0.3 });
          }
        } else if (tileType === TILE.STONE) {
          // Rock specks
          if (hash < 0.25) {
            const rx = bx + hash * ts * 0.6 + ts * 0.2;
            const ry = by + seededHash(x, y, seed + 9) * ts * 0.6 + ts * 0.2;
            detailGfx.circle(rx, ry, 1).fill({ color: 0x9ca3af, alpha: 0.3 });
          }
        }
      }
    }

    layer.addChild(detailGfx);
  }

  private renderGrid(): void {
    const gfx = this.gridGraphics!;
    gfx.clear();
    const totalW = this.mapWidth * this.tileSize;
    const totalH = this.mapHeight * this.tileSize;

    for (let x = 0; x <= this.mapWidth; x++) {
      gfx
        .moveTo(x * this.tileSize, 0)
        .lineTo(x * this.tileSize, totalH)
        .stroke({ color: 0x000000, width: 0.5, alpha: 0.1 });
    }
    for (let y = 0; y <= this.mapHeight; y++) {
      gfx
        .moveTo(0, y * this.tileSize)
        .lineTo(totalW, y * this.tileSize)
        .stroke({ color: 0x000000, width: 0.5, alpha: 0.1 });
    }
  }

  private generateStars(seed: number): void {
    if (!this.starLayer) return;
    this.starLayer.clear();
    const totalW = this.mapWidth * this.tileSize;
    const totalH = this.mapHeight * this.tileSize;

    for (let i = 0; i < 120; i++) {
      const sx = seededHash(i, 0, seed + 100) * totalW;
      const sy = seededHash(0, i, seed + 200) * totalH;
      const size = 0.5 + seededHash(i, i, seed + 300) * 1.5;
      const alpha = 0.3 + seededHash(i, 1, seed + 400) * 0.5;
      this.starLayer.circle(sx, sy, size).fill({ color: 0xffffff, alpha });
    }
    this.starLayer.alpha = 0;
  }

  private drawResourceIcon(
    gfx: Graphics,
    type: string,
    cx: number,
    cy: number,
    ts: number,
  ): void {
    const s = ts * 0.18;
    const color = RESOURCE_COLORS[type] ?? 0xffffff;

    if (type === "wood") {
      // Tree stump
      gfx
        .rect(cx - s * 0.6, cy - s * 0.3, s * 1.2, s * 1.2)
        .fill({ color: 0x6b3e1a, alpha: 0.8 });
      gfx
        .ellipse(cx, cy - s * 0.3, s * 0.7, s * 0.3)
        .fill({ color: 0x8b5e3c, alpha: 0.9 });
    } else if (type === "stone") {
      // Rock pile
      gfx
        .ellipse(cx, cy + s * 0.2, s * 0.9, s * 0.5)
        .fill({ color: 0x6b7280, alpha: 0.8 });
      gfx
        .ellipse(cx - s * 0.3, cy - s * 0.1, s * 0.5, s * 0.4)
        .fill({ color: 0x9ca3af, alpha: 0.7 });
    } else if (type === "food") {
      // Berry bush
      gfx.circle(cx, cy, s * 0.6).fill({ color: 0x22c55e, alpha: 0.6 });
      gfx
        .circle(cx - s * 0.2, cy - s * 0.15, s * 0.2)
        .fill({ color: 0xef4444, alpha: 0.8 });
      gfx
        .circle(cx + s * 0.2, cy + s * 0.1, s * 0.2)
        .fill({ color: 0xef4444, alpha: 0.8 });
    } else if (type === "herbs") {
      // Herb sprout
      gfx
        .moveTo(cx, cy + s * 0.4)
        .lineTo(cx, cy - s * 0.4)
        .stroke({ color: 0x16a34a, width: 1.5, alpha: 0.8 });
      gfx
        .ellipse(cx - s * 0.2, cy - s * 0.2, s * 0.3, s * 0.15)
        .fill({ color: 0x22c55e, alpha: 0.7 });
      gfx
        .ellipse(cx + s * 0.2, cy - s * 0.35, s * 0.3, s * 0.15)
        .fill({ color: 0x22c55e, alpha: 0.7 });
    } else if (type === "metal") {
      // Metal ore
      gfx
        .moveTo(cx - s * 0.5, cy + s * 0.3)
        .lineTo(cx - s * 0.3, cy - s * 0.4)
        .lineTo(cx + s * 0.3, cy - s * 0.4)
        .lineTo(cx + s * 0.5, cy + s * 0.3)
        .closePath()
        .fill({ color: 0x94a3b8, alpha: 0.7 });
      gfx
        .circle(cx, cy - s * 0.1, s * 0.2)
        .fill({ color: 0xd4d4d8, alpha: 0.6 });
    } else {
      gfx.circle(cx, cy, s).fill({ color, alpha: 0.7 });
    }
  }

  private drawBuildingIcon(
    gfx: Graphics,
    type: string,
    bx: number,
    by: number,
    ts: number,
  ): void {
    const color = BUILDING_COLORS[type] ?? 0xaaaaaa;
    const pad = ts * 0.08;
    const size = ts - pad * 2;
    const cx = bx + ts / 2;

    // Base
    gfx
      .roundRect(bx + pad, by + pad, size, size, 3)
      .fill({ color, alpha: 0.7 });
    gfx
      .roundRect(bx + pad, by + pad, size, size, 3)
      .stroke({ color: 0xffffff, width: 1, alpha: 0.25 });

    // Roof / icon detail
    if (type === "shelter") {
      // Triangular roof
      gfx
        .moveTo(cx, by + pad - 3)
        .lineTo(bx + pad - 1, by + pad + size * 0.35)
        .lineTo(bx + pad + size + 1, by + pad + size * 0.35)
        .closePath()
        .fill({ color: 0xa16207, alpha: 0.8 });
    } else if (type === "farm") {
      // Crop rows
      for (let i = 0; i < 3; i++) {
        const ry = by + pad + size * 0.3 + i * size * 0.22;
        gfx
          .moveTo(bx + pad + 3, ry)
          .lineTo(bx + pad + size - 3, ry)
          .stroke({ color: 0x84cc16, width: 1.5, alpha: 0.6 });
      }
    } else if (type === "market") {
      // Market stall top
      gfx
        .rect(bx + pad - 1, by + pad, size + 2, size * 0.15)
        .fill({ color: 0x0ea5e9, alpha: 0.6 });
    }
  }

  private createAgentSprite(agent: AgentSpriteData): AgentSprite {
    const container = new Container();
    container.eventMode = "static";
    container.cursor = "pointer";
    container.on("pointertap", (e) => {
      e.stopPropagation();
      this.onAgentSelect?.(agent._id);
    });

    const ts = this.tileSize;
    const seed = agent.spriteSeed;

    // Shadow
    const shadow = new Graphics();
    shadow
      .ellipse(0, ts * 0.22, ts * 0.2, ts * 0.07)
      .fill({ color: 0x000000, alpha: 0.2 });
    container.addChild(shadow);

    // Body (pixel-art-ish character)
    const body = new Graphics();
    this.drawCharacter(body, seed, ts);
    container.addChild(body);

    // Status icon
    const statusIcon = new Graphics();
    statusIcon.position.set(ts * 0.25, -ts * 0.35);
    container.addChild(statusIcon);

    // Name label
    const label = new Text({ text: agent.name, style: LABEL_STYLE });
    label.anchor.set(0.5, 0);
    label.y = ts * 0.26;
    container.addChild(label);

    // Action label (shows current activity)
    const actionLabel = new Text({ text: "", style: ACTION_LABEL_STYLE });
    actionLabel.anchor.set(0.5, 1);
    actionLabel.y = -ts * 0.4;
    actionLabel.alpha = 0;
    container.addChild(actionLabel);

    const px = agent.position.x * ts + ts / 2;
    const py = agent.position.y * ts + ts / 2;
    container.position.set(px, py);

    this.agentContainer!.addChild(container);

    return {
      container,
      body,
      shadow,
      statusIcon,
      label,
      actionLabel,
      targetX: px,
      targetY: py,
      lastStatus: agent.status,
      animFrame: 0,
      animTimer: 0,
    };
  }

  /** Draw a pixel-art-style character using seed for variation */
  private drawCharacter(gfx: Graphics, seed: number, ts: number): void {
    const agentColor = AGENT_COLORS[seed % AGENT_COLORS.length];
    const skinColor = SKIN_COLORS[seed % SKIN_COLORS.length];
    const hairColor = HAIR_COLORS[seed % HAIR_COLORS.length];
    const s = ts * 0.12; // pixel size

    // Body/shirt (4x3 pixels centered)
    gfx.rect(-s * 2, -s * 0.5, s * 4, s * 3).fill(agentColor);

    // Head (3x3 pixels)
    gfx.rect(-s * 1.5, -s * 3.5, s * 3, s * 3).fill(skinColor);

    // Hair (varies by seed)
    const hairStyle = seed % 4;
    if (hairStyle === 0) {
      // Full top hair
      gfx.rect(-s * 1.8, -s * 4, s * 3.6, s * 1.2).fill(hairColor);
    } else if (hairStyle === 1) {
      // Side part
      gfx.rect(-s * 1.8, -s * 4, s * 3.6, s * 0.8).fill(hairColor);
      gfx.rect(-s * 1.8, -s * 3.5, s * 0.8, s * 1.5).fill(hairColor);
    } else if (hairStyle === 2) {
      // Spiky
      gfx.rect(-s * 1.5, -s * 4.2, s * 1, s * 1.5).fill(hairColor);
      gfx.rect(-s * 0.25, -s * 4.4, s * 1, s * 1.5).fill(hairColor);
      gfx.rect(s * 0.8, -s * 4, s * 1, s * 1.2).fill(hairColor);
    } else {
      // Bun/long
      gfx.rect(-s * 1.8, -s * 4, s * 3.6, s * 0.8).fill(hairColor);
      gfx.rect(s * 1.2, -s * 3.8, s * 1, s * 2).fill(hairColor);
    }

    // Eyes
    gfx.rect(-s * 0.8, -s * 2.2, s * 0.5, s * 0.5).fill(0x1a1a2e);
    gfx.rect(s * 0.3, -s * 2.2, s * 0.5, s * 0.5).fill(0x1a1a2e);

    // Legs (2 pixels)
    gfx
      .rect(-s * 1.2, s * 2.5, s * 1.2, s * 1.2)
      .fill({ color: 0x374151, alpha: 0.9 });
    gfx
      .rect(s * 0, s * 2.5, s * 1.2, s * 1.2)
      .fill({ color: 0x374151, alpha: 0.9 });

    // White outline for visibility
    gfx
      .roundRect(-s * 2.2, -s * 4.6, s * 4.4, s * 7.5, 1)
      .stroke({ color: 0xffffff, width: 0.8, alpha: 0.3 });
  }

  private updateStatusIcon(sprite: AgentSprite, status: string): void {
    sprite.statusIcon.clear();
    const info = STATUS_ICONS[status] ?? STATUS_ICONS["idle"];
    const s = 5;
    // Draw a colored indicator dot with white border
    sprite.statusIcon.circle(0, 0, s).fill({ color: info.color, alpha: 0.95 });
    sprite.statusIcon
      .circle(0, 0, s)
      .stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
  }

  private updateActionLabel(sprite: AgentSprite, status: string, currentAction?: string): void {
    const labels: Record<string, string> = {
      moving: "🚶 walking",
      talking: "💬 chatting",
      working: "⚒️ working",
      sleeping: "💤 sleeping",
      exploring: "🔍 exploring",
      idle: "",
    };
    // Use currentAction if provided and agent is working (more specific)
    const text = (status === "working" && currentAction)
      ? `⚒️ ${currentAction}`
      : (labels[status] ?? "");
    sprite.actionLabel.text = text;
    sprite.actionLabel.alpha = text ? 0.9 : 0;
  }

  // --- Animation loops ---

  private animateAgents(): void {
    const lerp = 0.12;
    for (const sprite of this.agentSprites.values()) {
      sprite.container.x += (sprite.targetX - sprite.container.x) * lerp;
      sprite.container.y += (sprite.targetY - sprite.container.y) * lerp;

      // Gentle idle bob for non-moving agents
      sprite.animTimer++;
      if (sprite.lastStatus === "idle" || sprite.lastStatus === "talking") {
        const bob = Math.sin(sprite.animTimer * 0.05) * 0.5;
        sprite.body.y = bob;
      } else if (sprite.lastStatus === "sleeping") {
        sprite.body.y = 1;
      } else {
        // Walking bounce
        const bounce = Math.abs(Math.sin(sprite.animTimer * 0.15)) * 1.5;
        sprite.body.y = -bounce;
      }

      // Fade action label over time
      if (sprite.actionLabel.alpha > 0 && sprite.lastStatus === "idle") {
        sprite.actionLabel.alpha = Math.max(0, sprite.actionLabel.alpha - 0.01);
      }
    }
  }

  private animateSpeechBubbles(): void {
    const now = performance.now();
    const maxX = this.mapWidth * this.tileSize;
    const maxY = this.mapHeight * this.tileSize;
    for (const [agentId, bubble] of this.speechBubbles) {
      const elapsed = now - bubble.createdAt;
      const sprite = this.agentSprites.get(agentId);
      if (sprite) {
        const bgWidth = bubble.container.width;
        const bgHeight = bubble.container.height;
        bubble.container.x = Math.max(2, Math.min(maxX - bgWidth - 2, sprite.container.x - bgWidth / 2));
        bubble.container.y = Math.max(2, Math.min(maxY - bgHeight - 2,
          sprite.container.y - this.tileSize * 1.2 - bgHeight - 6));
      }

      if (elapsed > bubble.duration - 500) {
        bubble.container.alpha = Math.max(0, (bubble.duration - elapsed) / 500);
      }

      if (elapsed >= bubble.duration) {
        this.speechBubbleLayer?.removeChild(bubble.container);
        bubble.container.destroy({ children: true });
        this.speechBubbles.delete(agentId);
      }
    }
  }

  private animateTransfers(): void {
    for (let i = this.transferAnimations.length - 1; i >= 0; i--) {
      const anim = this.transferAnimations[i];
      anim.progress += anim.speed;
      if (anim.progress >= 1) {
        this.animationLayer?.removeChild(anim.gfx);
        anim.gfx.destroy();
        this.transferAnimations.splice(i, 1);
        continue;
      }
      const t =
        anim.progress < 0.5
          ? 2 * anim.progress * anim.progress
          : 1 - Math.pow(-2 * anim.progress + 2, 2) / 2;
      anim.gfx.x = anim.fromX + (anim.toX - anim.fromX) * t;
      anim.gfx.y = anim.fromY + (anim.toY - anim.fromY) * t;
      anim.gfx.y -= Math.sin(t * Math.PI) * 15;
    }
  }

  private animateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02; // slight upward drift
      p.gfx.position.set(p.x, p.y);
      p.gfx.alpha = p.life / p.maxLife;

      if (p.life <= 0) {
        this.particleLayer?.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Controls ---

  private setupControls(canvas: HTMLCanvasElement): void {
    const signal = this._abortController.signal;

    canvas.addEventListener(
      "pointerdown",
      (e) => {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.cameraStart = { ...this.camera };
      },
      { signal },
    );

    canvas.addEventListener(
      "pointermove",
      (e) => {
        if (!this.isDragging) return;
        this.camera.x =
          this.cameraStart.x -
          (e.clientX - this.dragStart.x) / this.camera.zoom;
        this.camera.y =
          this.cameraStart.y -
          (e.clientY - this.dragStart.y) / this.camera.zoom;
        this.updateCamera();
      },
      { signal },
    );

    canvas.addEventListener(
      "pointerup",
      () => {
        this.isDragging = false;
      },
      { signal },
    );
    canvas.addEventListener(
      "pointerleave",
      () => {
        this.isDragging = false;
      },
      { signal },
    );

    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = Math.max(
          0.3,
          Math.min(4, this.camera.zoom * factor),
        );
        this.updateCamera();
      },
      { passive: false, signal },
    );
  }

  private updateCamera(): void {
    const { width: w, height: h } = this.app!.screen;
    const zoom = this.camera.zoom;
    const worldW = this.mapWidth * this.tileSize;
    const worldH = this.mapHeight * this.tileSize;

    // Clamp camera so map edges never reveal the void
    const viewW = w / zoom;
    const viewH = h / zoom;
    const halfViewW = viewW / 2;
    const halfViewH = viewH / 2;

    if (viewW < worldW) {
      this.camera.x = Math.max(
        halfViewW,
        Math.min(worldW - halfViewW, this.camera.x),
      );
    } else {
      this.camera.x = worldW / 2;
    }
    if (viewH < worldH) {
      this.camera.y = Math.max(
        halfViewH,
        Math.min(worldH - halfViewH, this.camera.y),
      );
    } else {
      this.camera.y = worldH / 2;
    }

    const wc = this.worldContainer!;
    wc.scale.set(zoom);
    wc.x = -this.camera.x * zoom + w / 2;
    wc.y = -this.camera.y * zoom + h / 2;
  }

  private getDarkness(timeOfDay: number): number {
    // Smooth easing for darkness transitions
    if (timeOfDay >= 7 && timeOfDay <= 18) return 0;
    if (timeOfDay >= 21 || timeOfDay <= 5) return 0.4;
    if (timeOfDay > 18 && timeOfDay < 21) {
      const t = (timeOfDay - 18) / 3;
      return t * t * 0.4; // ease-in
    }
    // Dawn (5-7)
    const t = (7 - timeOfDay) / 2;
    return t * t * 0.4; // ease-in
  }

  /** Force PixiJS to re-measure its container and update the camera. */
  public resize(): void {
    if (!this._initialized || !this.app) return;
    this.app.resize();
    this.updateCamera();
  }

  private centerCamera(): void {
    this.camera.x = (this.mapWidth * this.tileSize) / 2;
    this.camera.y = (this.mapHeight * this.tileSize) / 2;
    this.camera.zoom = 1;
    this.updateCamera();
  }

  private adjustBrightness(color: number, amount: number): number {
    const r = Math.min(
      255,
      Math.max(0, ((color >> 16) & 0xff) + Math.round(amount * 255)),
    );
    const g = Math.min(
      255,
      Math.max(0, ((color >> 8) & 0xff) + Math.round(amount * 255)),
    );
    const b = Math.min(
      255,
      Math.max(0, (color & 0xff) + Math.round(amount * 255)),
    );
    return (r << 16) | (g << 8) | b;
  }
}
