// app/screens/AudioPermissionScreen.ts

import { Container, Graphics, Text, TextStyle, Ticker } from "pixi.js";
import { sound } from "@pixi/sound";

export class AudioPermissionScreen extends Container {
  private onUnlock: () => void;
  private background: Graphics;
  private startButton: Container;
  private buttonBg: Graphics;
  private titleText: Text;
  private instructionText: Text;
  private pulseTime: number = 0;

  constructor(onUnlock: () => void) {
    super();
    this.onUnlock = onUnlock;

    // 1. Создаем фон
    this.background = new Graphics();
    this.addChild(this.background);

    // 2. Заголовок
    const titleStyle = new TextStyle({
      fontFamily: "Arial Black, Gadget, sans-serif",
      fontSize: 42,
      fontStyle: "italic",
      fontWeight: "bold",
      fill: "#ffffff",
      stroke: { color: "#e72264", width: 6 }, // Стиль Pixi v8
      dropShadow: {
        alpha: 0.8,
        angle: Math.PI / 6,
        blur: 4,
        color: "#000000",
        distance: 6,
      },
      letterSpacing: 2,
    });

    this.titleText = new Text({ text: "STREET PAINTER", style: titleStyle });
    this.titleText.anchor.set(0.5);
    this.addChild(this.titleText);

    // 3. Инструкция
    const instructionStyle = new TextStyle({
      fontFamily: "Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      fontSize: 16,
      fill: "#aaaaaa",
      align: "center",
    });

    this.instructionText = new Text({ text: "ENABLE AUDIO & START", style: instructionStyle });
    this.instructionText.anchor.set(0.5);
    this.addChild(this.instructionText);

    // 4. Кнопка "START"
    this.startButton = new Container();
    this.addChild(this.startButton);

    this.buttonBg = new Graphics();
    this.startButton.addChild(this.buttonBg);

    const btnTextStyle = new TextStyle({
      fontFamily: "Arial Black, sans-serif",
      fontSize: 24,
      fill: "#ffffff",
    });
    const btnText = new Text({ text: "START", style: btnTextStyle });
    btnText.anchor.set(0.5);
    this.startButton.addChild(btnText);

    // Интерактивность кнопки
    this.startButton.eventMode = "static";
    this.startButton.cursor = "pointer";

    this.startButton.on("pointerover", () => {
      this.startButton.scale.set(1.05);
      this.drawButton(true);
    });
    this.startButton.on("pointerout", () => {
      this.startButton.scale.set(1);
      this.drawButton(false);
    });
    this.startButton.on("pointerdown", this.handleClick.bind(this));

    // Рисуем начальное состояние кнопки
    this.drawButton(false);

    // 5. Анимация пульсации
    Ticker.shared.add(this.update, this);

    // Вызываем resize один раз при создании, чтобы все встало на места
    this.resize(window.innerWidth, window.innerHeight);
  }

  private drawButton(isHover: boolean) {
    this.buttonBg.clear();
    this.buttonBg.roundRect(-80, -30, 160, 60, 30);
    this.buttonBg.fill({ color: isHover ? 0xff0055 : 0xe72264 }); // Ярко-розовый
    this.buttonBg.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
  }

  private update = (ticker: Ticker) => {
    this.pulseTime += ticker.deltaTime * 0.05;
    // Легкая пульсация кнопки
    const scale = 1 + Math.sin(this.pulseTime) * 0.03;
    if (this.startButton.eventMode === "static") {
      // Если кнопка еще активна
      // Применяем пульсацию только если не наведен курсор (можно усложнить логику, но так проще)
    }
  };

  // Метод resize обязателен, чтобы фон перекрывал всё окно
  public resize(width: number, height: number) {
    // Перерисовываем фон на весь экран
    this.background.clear();
    this.background.rect(0, 0, width, height);
    this.background.fill({ color: 0x1a1a1a, alpha: 0.95 });

    // Центрируем элементы
    const cx = width * 0.5;
    const cy = height * 0.5;

    this.titleText.position.set(cx, cy - 80);
    this.instructionText.position.set(cx, cy - 20);
    this.startButton.position.set(cx, cy + 60);
  }

  private async handleClick() {
    // Блокируем повторные клики
    this.startButton.eventMode = "none";

    await this.unlockAudio();

    // Анимация исчезновения (опционально)
    Ticker.shared.remove(this.update, this);
    this.onUnlock();
  }

  private async unlockAudio(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Разблокируем PixiJS sound (это главное для v8)
        if (sound.context && sound.context.audioContext) {
          if (sound.context.audioContext.state === "suspended") {
            sound.context.audioContext.resume().then(() => {
              console.log("PixiJS Sound unlocked via resume");
              resolve();
            });
          } else {
            resolve();
          }
        } else {
          // Fallback для старых методов или если контекста нет
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            ctx.resume().then(resolve);
          } else {
            resolve();
          }
        }
      } catch (error) {
        console.warn("Audio unlock failed, continuing without sound:", error);
        resolve();
      }
    });
  }
}
