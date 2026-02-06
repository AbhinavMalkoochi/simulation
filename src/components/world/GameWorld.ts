import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { TILE_COLORS, AGENT_COLORS } from "../../../convex/lib/constants";
import { generateMap } from "../../../convex/lib/mapgen";

interface AgentData {
  _id: string;
  name: string;
  position: { x: number; y: number };
  status: string;
  spriteSeed: number;
  energy: number;
}

interface AgentSprite {
  container: Container;
  body: Graphics;
  statusDot: Graphics;
  label: Text;
  targetX: number;
  targetY: number;
}

const LABEL_STYLE = new TextStyle({
  fontSize: 9,
  fill: 0xe2e8f0,
  fontFamily: "Inter, sans-serif",
  fontWeight: "500",
  dropShadow: {
    color: 0x000000,
    blur: 2,
    distance: 1,
    alpha: 0.8,
  },
});

const STATUS_COLORS: Record<string, number> = {
  idle: 0x94a3b8,
  moving: 0x4ade80,
  talking: 0x60a5fa,
  working: 0xfbbf24,
  sleeping: 0x818cf8,
  exploring: 0xf472b6,
};

export class GameWorld {
  private app!: Application;
  private worldContainer!: Container;
  private tileGraphics!: Graphics;
  private gridGraphics!: Graphics;
  private agentContainer!: Container;
  private agentSprites = new Map<string, AgentSprite>();

  private camera = { x: 0, y: 0, zoom: 1 };
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private cameraStart = { x: 0, y: 0 };

  private tileSize = 32;
  private mapWidth = 0;
  private mapHeight = 0;

  private onAgentSelect?: (agentId: string) => void;

  async init(container: HTMLDivElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x0a0a1a,
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    });
    container.appendChild(this.app.canvas);

    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    this.tileGraphics = new Graphics();
    this.worldContainer.addChild(this.tileGraphics);

    this.gridGraphics = new Graphics();
    this.worldContainer.addChild(this.gridGraphics);

    this.agentContainer = new Container();
    this.worldContainer.addChild(this.agentContainer);

    this.setupControls(this.app.canvas as HTMLCanvasElement);

    this.app.ticker.add(() => this.animateAgents());
  }

  setMap(seed: number, width: number, height: number, tileSize: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
    this.tileSize = tileSize;

    const mapTiles = generateMap(seed, width, height);
    this.renderTiles(mapTiles);
    this.renderGrid();
    this.centerCamera();
  }

  setOnAgentSelect(cb: (agentId: string) => void): void {
    this.onAgentSelect = cb;
  }

  updateAgents(agents: AgentData[]): void {
    const currentIds = new Set(agents.map((a) => a._id));

    for (const [id, sprite] of this.agentSprites) {
      if (!currentIds.has(id)) {
        this.agentContainer.removeChild(sprite.container);
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

      const statusColor = STATUS_COLORS[agent.status] ?? 0x94a3b8;
      sprite.statusDot.clear();
      sprite.statusDot.circle(0, 0, 3).fill(statusColor);
    }
  }

  destroy(): void {
    this.app?.destroy(true, { children: true });
  }

  private renderTiles(mapTiles: number[]): void {
    this.tileGraphics.clear();
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = mapTiles[y * this.mapWidth + x];
        const color = TILE_COLORS[tileType] ?? 0x000000;
        this.tileGraphics
          .rect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize)
          .fill(color);
      }
    }
  }

  private renderGrid(): void {
    this.gridGraphics.clear();
    const totalW = this.mapWidth * this.tileSize;
    const totalH = this.mapHeight * this.tileSize;

    for (let x = 0; x <= this.mapWidth; x++) {
      this.gridGraphics
        .moveTo(x * this.tileSize, 0)
        .lineTo(x * this.tileSize, totalH)
        .stroke({ color: 0x000000, width: 0.5, alpha: 0.15 });
    }
    for (let y = 0; y <= this.mapHeight; y++) {
      this.gridGraphics
        .moveTo(0, y * this.tileSize)
        .lineTo(totalW, y * this.tileSize)
        .stroke({ color: 0x000000, width: 0.5, alpha: 0.15 });
    }
  }

  private createAgentSprite(agent: AgentData): AgentSprite {
    const container = new Container();
    container.eventMode = "static";
    container.cursor = "pointer";
    container.on("pointertap", (e) => {
      e.stopPropagation();
      this.onAgentSelect?.(agent._id);
    });

    const radius = this.tileSize * 0.35;

    const body = new Graphics();
    const color = AGENT_COLORS[agent.spriteSeed % AGENT_COLORS.length];
    body
      .circle(0, 0, radius)
      .fill(color)
      .circle(0, 0, radius)
      .stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
    container.addChild(body);

    const statusDot = new Graphics();
    statusDot.circle(0, 0, 3).fill(0x94a3b8);
    statusDot.position.set(radius * 0.7, -radius * 0.7);
    container.addChild(statusDot);

    const label = new Text({ text: agent.name, style: LABEL_STYLE });
    label.anchor.set(0.5, 0);
    label.y = radius + 3;
    container.addChild(label);

    const px = agent.position.x * this.tileSize + this.tileSize / 2;
    const py = agent.position.y * this.tileSize + this.tileSize / 2;
    container.position.set(px, py);

    this.agentContainer.addChild(container);

    return { container, body, statusDot, label, targetX: px, targetY: py };
  }

  private animateAgents(): void {
    const lerp = 0.12;
    for (const sprite of this.agentSprites.values()) {
      sprite.container.x += (sprite.targetX - sprite.container.x) * lerp;
      sprite.container.y += (sprite.targetY - sprite.container.y) * lerp;
    }
  }

  private setupControls(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("pointerdown", (e) => {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.cameraStart = { ...this.camera };
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!this.isDragging) return;
      this.camera.x = this.cameraStart.x - (e.clientX - this.dragStart.x) / this.camera.zoom;
      this.camera.y = this.cameraStart.y - (e.clientY - this.dragStart.y) / this.camera.zoom;
      this.updateCamera();
    });

    canvas.addEventListener("pointerup", () => { this.isDragging = false; });
    canvas.addEventListener("pointerleave", () => { this.isDragging = false; });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.zoom = Math.max(0.3, Math.min(4, this.camera.zoom * factor));
      this.updateCamera();
    }, { passive: false });
  }

  private updateCamera(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.worldContainer.scale.set(this.camera.zoom);
    this.worldContainer.x = -this.camera.x * this.camera.zoom + w / 2;
    this.worldContainer.y = -this.camera.y * this.camera.zoom + h / 2;
  }

  private centerCamera(): void {
    this.camera.x = (this.mapWidth * this.tileSize) / 2;
    this.camera.y = (this.mapHeight * this.tileSize) / 2;
    this.camera.zoom = 1;
    this.updateCamera();
  }
}
