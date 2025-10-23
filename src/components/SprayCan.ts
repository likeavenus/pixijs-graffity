// app/components/SprayCan.ts
import { Container, Graphics, Sprite, Text, TextStyle, type Texture } from "pixi.js";
import { sound } from "@pixi/sound"; // Пока закомментируем звуки

export interface SprayCanState {
  pressure: number;
  isShaking: boolean;
  isSpraying: boolean;
  shakeProgress: number;
}

export class SprayCan extends Container {
  private canSprite: Sprite;
  private pressureIndicator: Graphics;
  private pressureText: Text;
  private state: SprayCanState;

  private readonly SHAKE_TIME = 2.0;
  private readonly PRESSURE_DRAIN_RATE = 0.3;
  private readonly PRESSURE_REFILL_RATE = 0.5;

  constructor(texture: Texture) {
    super();

    this.state = {
      pressure: 1.0,
      isShaking: false,
      isSpraying: false,
      shakeProgress: 0,
    };

    // Спрайт баллончика
    this.canSprite = new Sprite(texture);
    this.canSprite.anchor.set(0.5, 0.5); // Изменил якорь на центр для лучшего позиционирования
    this.canSprite.scale.set(0.3); // Увеличил масштаб
    console.log("SprayCan created with texture:", texture);

    // Индикатор давления
    this.pressureIndicator = new Graphics();

    // Текст давления
    const textStyle = new TextStyle({
      fontSize: 14,
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    });
    this.pressureText = new Text("100%", textStyle);
    this.pressureText.anchor.set(0.5);
    this.pressureText.position.set(0, -60); // Поднял текст выше

    this.addChild(this.canSprite, this.pressureIndicator, this.pressureText);
    this.updatePressureIndicator();

    // Сделаем видимым сразу для дебага
    this.visible = true;
  }

  update(delta: number) {
    if (this.state.isSpraying && this.state.pressure > 0) {
      this.state.pressure = Math.max(0, this.state.pressure - this.PRESSURE_DRAIN_RATE * delta);

      // Закомментировал звуки пока нет файлов
      // if (!sound.find("spray")?.isPlaying) {
      //   sound.play("spray", { loop: true, volume: 0.3 });
      // }
    } else {
      // sound.stop("spray");
    }

    if (this.state.isShaking) {
      this.state.shakeProgress += delta;
      this.canSprite.rotation = Math.sin(this.state.shakeProgress * 20) * 0.3;
      this.state.pressure = Math.min(1, this.state.pressure + this.PRESSURE_REFILL_RATE * delta);

      // if (!sound.find("shake")?.isPlaying && this.state.shakeProgress < 0.1) {
      //   sound.play("shake", { volume: 0.5 });
      // }

      if (this.state.shakeProgress >= this.SHAKE_TIME) {
        this.stopShaking();
      }
    }

    this.updatePressureIndicator();
  }

  startSpraying() {
    if (this.state.pressure > 0) {
      this.state.isSpraying = true;
      console.log("Spraying started, pressure:", this.state.pressure);
    }
  }

  stopSpraying() {
    this.state.isSpraying = false;
    // sound.stop("spray");
  }

  startShaking() {
    if (!this.state.isShaking) {
      this.state.isShaking = true;
      this.state.shakeProgress = 0;
      console.log("Shaking started");
    }
  }

  stopShaking() {
    this.state.isShaking = false;
    this.canSprite.rotation = 0;
    // sound.stop("shake");
  }

  private updatePressureIndicator() {
    this.pressureIndicator.clear();

    const pressure = this.state.pressure;
    const radius = 45;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * pressure;

    let color = 0x00ff00;
    if (pressure < 0.3) color = 0xff0000;
    else if (pressure < 0.6) color = 0xffff00;

    // Рисуем дугу
    this.pressureIndicator.lineStyle(4, color, 1);
    this.pressureIndicator.arc(0, 0, radius, startAngle, endAngle);

    // Обновляем текст
    this.pressureText.text = `${Math.round(pressure * 100)}%`;
    this.pressureText.style.fill = color;
  }

  canPaint(): boolean {
    return this.state.pressure > 0 && !this.state.isShaking;
  }

  getPressure(): number {
    return this.state.pressure;
  }

  setPosition(x: number, y: number) {
    this.position.set(x, y);
  }
}
