// app/components/SprayCan.ts
import { Container, Graphics, Sprite, Text, TextStyle, type Texture } from "pixi.js";

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
  private readonly PRESSURE_DRAIN_RATE = 0.02; // УМЕНЬШИЛ в 5 раз (было 0.15)
  private readonly PRESSURE_REFILL_RATE = 0.8; // УМЕНЬШИЛ для баланса (было 0.8)

  constructor(texture: Texture) {
    super();

    // Инициализируем состояние с гарантированно корректными значениями
    this.state = {
      pressure: 1.0,
      isShaking: false,
      isSpraying: false,
      shakeProgress: 0,
    };

    this.canSprite = new Sprite(texture);
    this.canSprite.anchor.set(0.5, 0.35);
    this.canSprite.scale.set(0.3);

    this.pressureIndicator = new Graphics();

    const textStyle = new TextStyle({
      fontSize: 32,
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    });
    this.pressureText = new Text("100%", textStyle);
    this.pressureText.anchor.set(0.5);
    this.pressureText.position.set(0, -60);

    this.addChild(this.canSprite, this.pressureIndicator, this.pressureText);
    this.updatePressureIndicator();

    this.visible = true;
  }

  update(delta: number) {
    // Гарантируем корректность delta
    if (isNaN(delta) || delta <= 0 || !isFinite(delta)) {
      delta = 0.016;
    }

    const safeDelta = Math.min(delta, 0.1);

    // Расходуем краску при распылении
    if (this.state.isSpraying && this.state.pressure > 0) {
      const newPressure = this.state.pressure - this.PRESSURE_DRAIN_RATE * safeDelta;
      this.state.pressure = Math.max(0, newPressure);

      if (this.state.pressure <= 0) {
        this.stopSpraying();
      }
    }

    // Пополняем краску при встряхивании
    if (this.state.isShaking) {
      this.state.shakeProgress += safeDelta;
      this.canSprite.rotation = Math.sin(this.state.shakeProgress * 20) * 0.3;

      const newPressure = this.state.pressure + this.PRESSURE_REFILL_RATE * safeDelta;
      this.state.pressure = Math.min(1, newPressure);

      if (this.state.shakeProgress >= this.SHAKE_TIME) {
        this.stopShaking();
      }
    }

    this.updatePressureIndicator();
  }

  startSpraying() {
    if (this.state.pressure > 0) {
      this.state.isSpraying = true;
    }
  }

  stopSpraying() {
    this.state.isSpraying = false;
  }

  startShaking() {
    if (!this.state.isShaking) {
      this.state.isShaking = true;
      this.state.shakeProgress = 0;
    }
  }

  stopShaking() {
    this.state.isShaking = false;
    this.canSprite.rotation = 0;
  }

  private updatePressureIndicator() {
    this.pressureIndicator.clear();

    // Гарантируем корректность давления
    let pressure = this.state.pressure;
    if (isNaN(pressure) || !isFinite(pressure)) {
      pressure = 1.0;
      this.state.pressure = 1.0;
    }
    pressure = Math.max(0, Math.min(1, pressure));

    const radius = 45;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * pressure;

    let color = 0x00ff00;
    if (pressure < 0.3) color = 0xff0000;
    else if (pressure < 0.6) color = 0xffff00;

    this.pressureIndicator.lineStyle(4, color, 1);
    this.pressureIndicator.arc(0, 0, radius, startAngle, endAngle);

    const pressurePercent = Math.round(pressure * 100);
    this.pressureText.text = `${pressurePercent}%`;
    this.pressureText.style.fill = color;
  }

  canPaint(): boolean {
    const pressure = isNaN(this.state.pressure) ? 0 : this.state.pressure;
    return pressure > 0 && !this.state.isShaking;
  }

  getPressure(): number {
    const pressure = isNaN(this.state.pressure) ? 0 : this.state.pressure;
    return Math.max(0, Math.min(1, pressure));
  }

  refill() {
    this.state.pressure = 1.0;
  }

  setPosition(x: number, y: number) {
    this.position.set(x, y);
  }
}
