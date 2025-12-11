// app/components/paint.ts
import { Container, Graphics, Point, RenderTexture, Sprite, Assets, type IRenderer, Texture } from "pixi.js";
import { SprayCan } from "./SprayCan";

export interface GraffitiOptions {
  brushSize?: number;
  brushHardness?: number;
  pressureSensitivity?: number;
  maxPressure?: number;
  minPressure?: number;
  sprayDensity?: number;
  wallTexture?: string;
  graffitiTexture?: string;
  outlineTexture?: string;
  paintAlpha?: number;
}

export class GraffitiPainter extends Container {
  private renderer: IRenderer;
  private options: Required<GraffitiOptions>;

  private wallSprite!: Sprite;
  private outlineSprite!: Sprite;
  private graffitiSprite!: Sprite;
  private maskTexture!: RenderTexture;
  private maskSprite!: Sprite;
  private sprayCan!: SprayCan;

  private isDragging = false;
  private lastPoint: Point | null = null;
  private currentPressure = 1;
  private accumulatedPaint: RenderTexture;

  private soundCallbacks: {
    onSprayStart?: () => void;
    onSprayEnd?: () => void;
    onShake?: () => void;
  } = {};

  // Оптимизации
  private brushGraphics: Graphics;
  private clearGraphics: Graphics;

  // Для покраски при зажатой мыши
  private paintTimer: number = 0;
  private readonly PAINT_INTERVAL = 0.05;

  // Для оптимизации рендера
  private framesSinceLastRender: number = 0;
  private readonly RENDER_INTERVAL = 2;

  constructor(renderer: IRenderer, options: GraffitiOptions = {}) {
    super();

    this.renderer = renderer;
    this.options = {
      brushSize: 35,
      brushHardness: 0.7,
      pressureSensitivity: 0.3,
      maxPressure: 1.5,
      minPressure: 0.3,
      sprayDensity: 0.4,
      wallTexture: "/assets/preload/1024px-Red_brick_wall_texture.jpeg", // НОВЫЙ ПУТЬ
      graffitiTexture: "/assets/preload/gr1.png", // НОВЫЙ ПУТЬ
      outlineTexture: "/assets/preload/gr1_o.png", // НОВЫЙ ПУТЬ
      paintAlpha: 0.1,
      ...options,
    };

    this.accumulatedPaint = RenderTexture.create({
      width: this.renderer.screen.width,
      height: this.renderer.screen.height,
    });

    this.brushGraphics = new Graphics();
    this.clearGraphics = new Graphics();

    this.setupEventMode();
  }

  async initialize() {
    try {
      await this.loadTextures();
      this.setupMask();
      this.createLayers();
      this.setupSprayCan();
      this.setupInteractivity();

      this.clearAccumulatedPaint();
      this.clearMask();

      return this;
    } catch (error) {
      console.error("Failed to initialize GraffitiPainter:", error);
      throw error;
    }
  }

  setSoundCallbacks(callbacks: typeof this.soundCallbacks) {
    this.soundCallbacks = callbacks;
  }

  private setupEventMode() {
    this.eventMode = "static";
    this.hitArea = this.renderer.screen;
  }

  private async loadTextures() {
    const texturesToLoad = [this.options.wallTexture, this.options.graffitiTexture, this.options.outlineTexture, "/assets/preload/spray-can.png"];

    try {
      // Очищаем кэш для новых текстур
      if (Assets.cache.has(this.options.wallTexture)) {
        Assets.cache.delete(this.options.wallTexture);
      }
      if (Assets.cache.has(this.options.graffitiTexture)) {
        Assets.cache.delete(this.options.graffitiTexture);
      }
      if (Assets.cache.has(this.options.outlineTexture)) {
        Assets.cache.delete(this.options.outlineTexture);
      }

      await Assets.load(texturesToLoad);
    } catch (error) {
      console.error("Failed to load textures:", error);
      // Продолжаем работу даже если текстуры не загрузились
    }
  }

  private setupMask() {
    const { width, height } = this.renderer.screen;
    this.maskTexture = RenderTexture.create({ width, height });
    this.maskSprite = new Sprite(this.maskTexture);
  }

  private createLayers() {
    const { width, height } = this.renderer.screen;

    // Фоновый слой - стена (принудительно обновляем текстуру)
    try {
      // Явно создаем текстуру и спрайт
      const wallTexture = Texture.from(this.options.wallTexture);
      this.wallSprite = new Sprite(wallTexture);
    } catch (error) {
      console.warn("Failed to load wall texture, using fallback:", error);
      this.wallSprite = new Sprite();
      this.wallSprite.width = width;
      this.wallSprite.height = height;
      this.wallSprite.tint = 0x888888; // Серый фон как запасной вариант
    }

    this.wallSprite.width = width;
    this.wallSprite.height = height;

    // Слой подсветки контура
    try {
      const outlineTexture = Texture.from(this.options.outlineTexture);
      this.outlineSprite = new Sprite(outlineTexture);
    } catch (error) {
      console.warn("Failed to load outline texture:", error);
      this.outlineSprite = new Sprite();
    }

    this.outlineSprite.width = width;
    this.outlineSprite.height = height;
    this.outlineSprite.alpha = 0.7; // Полупрозрачный контур
    this.outlineSprite.tint = 0xffffff;

    // Слой с граффити
    try {
      const graffitiTexture = Texture.from(this.options.graffitiTexture);
      this.graffitiSprite = new Sprite(graffitiTexture);
    } catch (error) {
      console.warn("Failed to load graffiti texture:", error);
      this.graffitiSprite = new Sprite();
    }

    this.graffitiSprite.width = width;
    this.graffitiSprite.height = height;

    this.graffitiSprite.mask = this.maskSprite;

    this.addChild(this.wallSprite, this.outlineSprite, this.graffitiSprite, this.maskSprite);
  }

  private setupSprayCan() {
    try {
      const canTexture = Texture.from("/assets/preload/spray-can.png");
      this.sprayCan = new SprayCan(canTexture);
      this.sprayCan.visible = false;
      this.sprayCan.scale.set(0.5);
      this.sprayCan.zIndex = 1000;
      this.addChild(this.sprayCan);
    } catch (error) {
      console.error("Failed to setup spray can:", error);
      // Fallback
      const graphics = new Graphics();
      graphics.rect(-20, -50, 40, 100).fill(0xff0000);
      const texture = this.renderer.generateTexture(graphics);
      this.sprayCan = new SprayCan(texture);
      this.sprayCan.visible = false;
      this.addChild(this.sprayCan);
    }
  }

  private setupInteractivity() {
    this.on("pointerdown", this.handlePointerDown, this);
    this.on("pointerup", this.handlePointerUp, this);
    this.on("pointerupoutside", this.handlePointerUp, this);
    this.on("pointermove", this.handlePointerMove, this);

    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
  }
  private handleKeyDown(event: KeyboardEvent) {
    if (event.code === "Space") {
      event.preventDefault();
      if (this.sprayCan) {
        this.sprayCan.startShaking();
        // Воспроизводим звук встряхивания
        if (this.soundCallbacks.onShake) {
          this.soundCallbacks.onShake();
        }
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (event.code === "Space") {
      if (this.sprayCan) {
        this.sprayCan.stopShaking();
      }
    }
  }

  private handlePointerDown(event: PointerEvent) {
    this.isDragging = true;

    if (this.sprayCan && this.sprayCan.canPaint()) {
      this.sprayCan.startSpraying();
      this.lastPoint = new Point(event.global.x, event.global.y);

      // Немедленно рисуем первую точку
      this.drawBrushStamp(this.lastPoint);
      this.requestMaskUpdate();

      // Воспроизводим звук распыления
      if (this.soundCallbacks.onSprayStart) {
        this.soundCallbacks.onSprayStart();
      }
    }
  }

  private handlePointerUp() {
    this.isDragging = false;
    if (this.sprayCan) {
      this.sprayCan.stopSpraying();
    }
    this.lastPoint = null;
    this.paintTimer = 0;

    // Останавливаем звук распыления
    if (this.soundCallbacks.onSprayEnd) {
      this.soundCallbacks.onSprayEnd();
    }
  }

  private handlePointerMove(event: PointerEvent) {
    // Всегда обновляем позицию баллончика
    if (this.sprayCan) {
      this.sprayCan.setPosition(event.global.x - 20, event.global.y + 40);
      this.sprayCan.visible = true;
    }

    if (this.isDragging && this.sprayCan && this.sprayCan.canPaint()) {
      const globalPoint = new Point(event.global.x, event.global.y);

      if (!this.lastPoint || this.distanceBetween(this.lastPoint, globalPoint) > 2) {
        this.calculatePressure(globalPoint);

        if (this.lastPoint) {
          this.drawSmoothLine(this.lastPoint, globalPoint);
        }

        this.lastPoint = globalPoint.clone();
        this.requestMaskUpdate();
      }
    }
  }

  private distanceBetween(pointA: Point, pointB: Point): number {
    return Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2));
  }

  private calculatePressure(currentPoint: Point) {
    if (!this.lastPoint) {
      this.currentPressure = 1;
      return;
    }

    const distance = this.distanceBetween(this.lastPoint, currentPoint);
    const timeDiff = 16;
    const speed = distance / Math.max(timeDiff, 1);

    let targetPressure = Math.max(this.options.minPressure, this.options.maxPressure - speed * this.options.pressureSensitivity);

    if (isNaN(targetPressure)) {
      targetPressure = 1;
    }

    this.currentPressure = this.currentPressure * 0.7 + targetPressure * 0.3;

    if (isNaN(this.currentPressure)) {
      this.currentPressure = 1;
    }
  }

  private drawSmoothLine(pointA: Point, pointB: Point) {
    const distance = this.distanceBetween(pointA, pointB);
    const steps = Math.max(2, Math.floor(distance / 3));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = pointA.x + (pointB.x - pointA.x) * t;
      const y = pointA.y + (pointB.y - pointA.y) * t;
      this.drawBrushStamp(new Point(x, y), this.currentPressure);
    }
  }

  private drawBrushStamp(point: Point, pressure: number = this.currentPressure) {
    if (!this.sprayCan || !this.sprayCan.canPaint()) return;

    const canPressure = this.sprayCan.getPressure();

    if (isNaN(pressure)) pressure = 1;
    if (isNaN(canPressure)) return;

    const size = this.options.brushSize * pressure * canPressure;
    const alpha = this.options.paintAlpha * pressure * canPressure * 0.3;

    this.brushGraphics.clear();
    this.createSprayBrush(this.brushGraphics, size, alpha);
    this.brushGraphics.position.set(point.x, point.y);

    this.renderer.render({
      container: this.brushGraphics,
      target: this.accumulatedPaint,
      clear: false,
    });
  }

  private createSprayBrush(graphics: Graphics, size: number, alpha: number) {
    graphics.circle(0, 0, size / 2).fill({ color: 0xffffff, alpha: alpha * 0.8 });

    const pointCount = Math.floor(size * 0.2);
    for (let i = 0; i < pointCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size * 0.3;
      const pointSize = Math.random() * size * 0.08 + 1;
      const pointAlpha = alpha * (0.4 + Math.random() * 0.6);

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      graphics.circle(x, y, pointSize / 2).fill({ color: 0xffffff, alpha: pointAlpha });
    }
  }

  private requestMaskUpdate() {
    this.framesSinceLastRender = 0;
  }

  private updateMaskFromAccumulatedPaint() {
    const copySprite = new Sprite(this.accumulatedPaint);
    const container = new Container();
    container.addChild(copySprite);

    this.renderer.render({
      container: container,
      target: this.maskTexture,
      clear: true,
    });
  }

  private clearAccumulatedPaint() {
    this.clearGraphics.clear();
    this.clearGraphics.rect(0, 0, this.renderer.screen.width, this.renderer.screen.height).fill(0x000000);

    this.renderer.render({
      container: this.clearGraphics,
      target: this.accumulatedPaint,
      clear: true,
    });
  }

  private clearMask() {
    this.clearGraphics.clear();
    this.clearGraphics.rect(0, 0, this.renderer.screen.width, this.renderer.screen.height).fill(0x000000);

    this.renderer.render({
      container: this.clearGraphics,
      target: this.maskTexture,
      clear: true,
    });
  }

  update(delta: number) {
    if (isNaN(delta) || delta <= 0) {
      delta = 0.016;
    }

    if (this.sprayCan) {
      this.sprayCan.update(delta);
    }

    // Покраска при зажатой мыши
    if (this.isDragging && this.sprayCan && this.sprayCan.canPaint() && this.lastPoint) {
      this.paintTimer += delta;
      if (this.paintTimer >= this.PAINT_INTERVAL) {
        this.paintTimer = 0;
        this.drawBrushStamp(this.lastPoint, this.currentPressure);
        this.requestMaskUpdate();
      }
      this.updateMaskFromAccumulatedPaint();
    }

    // Оптимизированное обновление маски
    // this.framesSinceLastRender++;
    // if (this.framesSinceLastRender >= this.RENDER_INTERVAL) {
    //   this.updateMaskFromAccumulatedPaint();
    //   this.framesSinceLastRender = 0;
    // }
  }

  // Public API
  setBrushSize(size: number) {
    this.options.brushSize = size;
  }

  setBrushHardness(hardness: number) {
    this.options.brushHardness = hardness;
  }

  setPaintAlpha(alpha: number) {
    this.options.paintAlpha = alpha;
  }

  clear() {
    this.clearAccumulatedPaint();
    this.clearMask();
    if (this.sprayCan) {
      this.sprayCan.refill();
    }
  }

  resize(width: number, height: number) {
    this.wallSprite.width = width;
    this.wallSprite.height = height;
    this.graffitiSprite.width = width;
    this.graffitiSprite.height = height;
    this.outlineSprite.width = width;
    this.outlineSprite.height = height;
    this.hitArea = this.renderer.screen;
  }
}
