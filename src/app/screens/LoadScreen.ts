import { Container, Text, Graphics, TextStyle, Ticker } from "pixi.js";
import { animate } from "motion";

/** Экран загрузки с андеграунд стилем */
export class LoadScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["preload"];

  private loadingText: Text;
  private progressContainer: Container;
  private progressFill: Graphics;
  private progressBorder: Graphics;

  // Эффект мигания текста
  private blinkTimer: number = 0;

  constructor() {
    super();

    // 1. Создаем контейнер для полоски загрузки
    this.progressContainer = new Container();
    this.addChild(this.progressContainer);

    // 2. Создаем рамку (бордюр) в стиле "нарисовано от руки"
    this.progressBorder = new Graphics();
    this.progressContainer.addChild(this.progressBorder);

    // 3. Создаем заливку (сам прогресс)
    this.progressFill = new Graphics();
    this.progressContainer.addChild(this.progressFill);

    // 4. Текст "LOADING" в стиле граффити/тэга
    const textStyle = new TextStyle({
      fontFamily: "Arial Black, Gadget, sans-serif",
      fontSize: 48,
      fontStyle: "italic",
      fontWeight: "bold",
      fill: "#ffffff", // ИСПРАВЛЕНО: один цвет вместо массива
      stroke: { color: "#e72264", width: 6 }, // ИСПРАВЛЕНО: объект вместо отдельных свойств
      dropShadow: {
        alpha: 0.8,
        angle: Math.PI / 6,
        blur: 4,
        color: "#000000",
        distance: 6,
      },
      letterSpacing: 4,
    });

    this.loadingText = new Text({ text: "LOADING...", style: textStyle });
    this.loadingText.anchor.set(0.5);
    this.addChild(this.loadingText);

    // Подписываемся на тикер для анимации
    Ticker.shared.add(this.update, this);
  }

  private update = (ticker: Ticker) => {
    // Простая анимация "дрожания" текста
    this.blinkTimer += ticker.deltaTime;
    if (this.blinkTimer > 10) {
      this.loadingText.alpha = 0.8 + Math.random() * 0.2; // Мерцание
      // Легкое дрожание
      this.loadingText.rotation = (Math.random() - 0.5) * 0.05;
      this.blinkTimer = 0;
    }
  };

  /** Вызывается при обновлении прогресса загрузки (0.0 - 1.0) */
  public onLoad(progress: number) {
    // Обновляем ширину полоски
    const width = 300;
    const height = 20;

    // Рисуем рамку
    this.progressBorder.clear();
    this.progressBorder.rect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10);
    this.progressBorder.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });

    // Рисуем заливку
    this.progressFill.clear();
    this.progressFill.rect(-width / 2, -height / 2, width * progress, height);
    this.progressFill.fill({ color: 0xe72264 }); // Ярко-розовый цвет
  }

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    const cx = width * 0.5;
    const cy = height * 0.5;

    this.loadingText.position.set(cx, cy - 50);
    this.progressContainer.position.set(cx, cy + 20);
  }

  /** Show screen with animations */
  public async show() {
    this.alpha = 1;
  }

  /** Hide screen with animations */
  public async hide() {
    Ticker.shared.remove(this.update, this);

    await animate(
      this,
      { alpha: 0 },
      {
        duration: 0.5,
        ease: "ease-out",
      }
    );
  }
}
