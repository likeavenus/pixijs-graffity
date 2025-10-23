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
  private brushPoints: Array<{ point: Point; pressure: number; timestamp: number }> = [];
  private accumulatedPaint: RenderTexture;
  private isMouseDown: boolean = false;

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
      //   wallTexture: "https://pixijs.com/assets/bg_grass.jpg",
      wallTexture: "assets/preload/1024px-Red_brick_wall_texture.jpeg",

      graffitiTexture: "https://pixijs.com/assets/bg_rotate.jpg",

      paintAlpha: 0.1,
      ...options,
    };

    // Создаем текстуру для накопления краски
    this.accumulatedPaint = RenderTexture.create({
      width: this.renderer.screen.width,
      height: this.renderer.screen.height,
    });

    this.setupEventMode();
  }

  async initialize() {
    try {
      await this.loadTextures();
      this.setupMask(); // Сначала настраиваем маску
      this.createLayers(); // Потом создаем слои
      this.setupSprayCan();
      this.setupInteractivity();

      this.clearAccumulatedPaint();
      this.clearMask();

      console.log("GraffitiPainter initialized successfully");
      return this;
    } catch (error) {
      console.error("Failed to initialize GraffitiPainter:", error);
      throw error;
    }
  }

  private setupEventMode() {
    this.eventMode = "static";
    this.hitArea = this.renderer.screen;
  }

  //   private async loadTextures() {
  //     await Assets.load([this.options.wallTexture, this.options.graffitiTexture]);
  //   }
  private async loadTextures() {
    // Загружаем все текстуры, включая спрей
    const texturesToLoad = [this.options.wallTexture, this.options.graffitiTexture, this.options.outlineTexture];

    // Если есть кастомная текстура спрея, добавляем её
    const sprayCanPath = "/assets/preload/spray-can.png";
    texturesToLoad.push(sprayCanPath);

    await Assets.load(texturesToLoad);
  }

  private setupMask() {
    const { width, height } = this.renderer.screen;

    // Создаем маску ДО создания слоев
    this.maskTexture = RenderTexture.create({ width, height });
    this.maskSprite = new Sprite(this.maskTexture);
  }

  private createLayers() {
    const { width, height } = this.renderer.screen;

    // Фоновый слой - стена
    this.wallSprite = Sprite.from(this.options.wallTexture);
    this.wallSprite.width = width;
    this.wallSprite.height = height;

    // Слой подсветки контура (полупрозрачный белый)
    this.outlineSprite = Sprite.from(this.options.outlineTexture);
    this.outlineSprite.width = width;
    this.outlineSprite.height = height;
    this.outlineSprite.alpha = 1;
    this.outlineSprite.tint = 0xffffff;

    // Слой с граффити (изначально скрыт)
    this.graffitiSprite = Sprite.from(this.options.graffitiTexture);
    this.graffitiSprite.width = width;
    this.graffitiSprite.height = height;

    // Применяем маску к граффити
    this.graffitiSprite.mask = this.maskSprite;

    // Добавляем все спрайты в правильном порядке
    this.addChild(this.wallSprite, this.outlineSprite, this.graffitiSprite, this.maskSprite);
  }

  private setupSprayCan() {
    try {
      // Пытаемся загрузить текстуру спрея
      let canTexture;
      try {
        canTexture = Texture.from("/assets/preload/spray-can.png");
        console.log("Spray can texture loaded from file");
      } catch (error) {
        // Если файл не найден, создаем временную текстуру
        console.warn("Spray can image not found, using fallback graphics");
        const canGraphics = new Graphics();
        canGraphics.rect(-15, -40, 30, 60).fill(0x333333).rect(-10, 20, 20, 25).fill(0x666666).circle(0, -45, 8).fill(0xff0000);

        canTexture = this.renderer.generateTexture(canGraphics);
      }

      this.sprayCan = new SprayCan(canTexture);
      this.sprayCan.visible = false;
      this.sprayCan.scale.set(0.5);

      this.sprayCan.zIndex = 1000;
      this.addChild(this.sprayCan);

      console.log("SprayCan setup completed");
    } catch (error) {
      console.error("Failed to setup spray can:", error);
    }
  }
  //   private setupSprayCan() {
  //     // Временно создадим простую текстуру баллончика через Graphics
  //     const canGraphics = new Graphics();

  //     // Рисуем простой баллончик (силуэт)
  //     canGraphics
  //       .rect(-15, -40, 30, 60) // Основная часть
  //       .fill(0x333333)
  //       .rect(-10, 20, 20, 25) // Нижняя часть
  //       .fill(0x666666)
  //       .circle(0, -45, 8) // Кнопка распыления
  //       .fill(0xff0000);

  //     // Конвертируем Graphics в текстуру
  //     const canTexture = this.renderer.generateTexture(canGraphics);

  //     this.sprayCan = new SprayCan(canTexture);
  //     this.sprayCan.visible = false;

  //     // Убедимся что баллончик поверх всего
  //     this.sprayCan.zIndex = 1000;
  //     this.addChild(this.sprayCan);

  //     console.log("SprayCan setup completed");
  //   }

  private setupInteractivity() {
    this.on("pointerdown", this.handlePointerDown, this);
    this.on("pointerup", this.handlePointerUp, this);
    this.on("pointerupoutside", this.handlePointerUp, this);
    this.on("pointermove", this.handlePointerMove, this);

    // Обработка клавиш для встряхивания
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.code === "Space") {
      this.sprayCan.startShaking();
      event.preventDefault();
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (event.code === "Space") {
      this.sprayCan.stopShaking();
    }
  }

  private handlePointerDown(event: PointerEvent) {
    this.isMouseDown = true;

    if (this.sprayCan.canPaint()) {
      this.sprayCan.startSpraying();
      this.brushPoints = [];
      this.lastPoint = null;
      this.handlePointerMove(event);
    }
  }

  private handlePointerUp() {
    this.isMouseDown = false;
    this.sprayCan.stopSpraying();
    this.lastPoint = null;
    this.brushPoints = [];
  }

  private handlePointerMove(event: PointerEvent) {
    // Обновляем позицию баллончика
    if (this.sprayCan) {
      this.sprayCan.setPosition(event.global.x - 20, event.global.y + this.sprayCan.height / 2 - 20);
      this.sprayCan.visible = true;
    }

    if (this.isMouseDown && this.sprayCan.canPaint()) {
      const globalPoint = new Point(event.global.x, event.global.y);
      this.calculatePressure(globalPoint);

      if (this.lastPoint) {
        this.drawSmoothLine(this.lastPoint, globalPoint);
      } else {
        this.drawBrushStamp(globalPoint);
      }

      this.lastPoint = globalPoint;
      this.brushPoints.push({
        point: globalPoint.clone(),
        pressure: this.currentPressure,
        timestamp: Date.now(),
      });

      if (this.brushPoints.length > 50) {
        this.brushPoints.shift();
      }

      this.updateMaskFromAccumulatedPaint();
    }
  }

  private calculatePressure(currentPoint: Point) {
    if (!this.lastPoint) {
      this.currentPressure = 1;
      return;
    }

    const distance = Math.sqrt(Math.pow(currentPoint.x - this.lastPoint.x, 2) + Math.pow(currentPoint.y - this.lastPoint.y, 2));

    const lastBrushPoint = this.brushPoints[this.brushPoints.length - 1];
    const timeDiff = lastBrushPoint ? Date.now() - lastBrushPoint.timestamp : 16;
    const speed = distance / Math.max(timeDiff, 1);

    let targetPressure = Math.max(this.options.minPressure, this.options.maxPressure - speed * this.options.pressureSensitivity);

    this.currentPressure = this.currentPressure * 0.7 + targetPressure * 0.3;
  }

  private drawSmoothLine(pointA: Point, pointB: Point) {
    const distance = Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2));

    const steps = Math.max(5, Math.floor(distance / 2));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = pointA.x + (pointB.x - pointA.x) * t;
      const y = pointA.y + (pointB.y - pointA.y) * t;

      this.drawBrushStamp(new Point(x, y), this.currentPressure);
    }
  }

  private drawBrushStamp(point: Point, pressure: number = this.currentPressure) {
    if (!this.sprayCan.canPaint()) return;

    const brush = new Graphics();
    const canPressure = this.sprayCan.getPressure();
    const size = this.options.brushSize * pressure * canPressure;
    const alpha = this.options.paintAlpha * pressure * canPressure * 0.5;

    this.createSprayBrush(brush, size, alpha);
    brush.position.set(point.x, point.y);

    this.renderer.render({
      container: brush,
      target: this.accumulatedPaint,
      clear: false,
    });
  }

  private createSprayBrush(graphics: Graphics, size: number, alpha: number) {
    graphics.clear();

    graphics.circle(0, 0, size / 2).fill({ color: 0xffffff, alpha: alpha * 0.7 });

    const pointCount = Math.floor(size * 0.3);
    for (let i = 0; i < pointCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size * 0.4;
      const pointSize = Math.random() * size * 0.1 + 1;
      const pointAlpha = alpha * (0.3 + Math.random() * 0.7);

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      graphics.circle(x, y, pointSize / 2).fill({ color: 0xffffff, alpha: pointAlpha });
    }
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
    const clearGraphics = new Graphics();
    clearGraphics.rect(0, 0, this.renderer.screen.width, this.renderer.screen.height).fill(0x000000);

    this.renderer.render({
      container: clearGraphics,
      target: this.accumulatedPaint,
      clear: true,
    });
  }

  private clearMask() {
    const clearGraphics = new Graphics();
    clearGraphics.rect(0, 0, this.renderer.screen.width, this.renderer.screen.height).fill(0x000000);

    this.renderer.render({
      container: clearGraphics,
      target: this.maskTexture,
      clear: true,
    });
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
  }

  update(delta: number) {
    if (this.sprayCan) {
      this.sprayCan.update(delta);
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
