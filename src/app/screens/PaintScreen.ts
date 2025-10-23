// app/screens/graffiti/GraffitiScreen.ts
import { Container } from "pixi.js";
import { GraffitiPainter } from "../../components/paint";
import { engine as _engine } from "../getEngine";

export class GraffitiScreen extends Container {
  private graffitiPainter!: GraffitiPainter;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    const engine = _engine();

    this.graffitiPainter = new GraffitiPainter(engine.renderer, {
      brushHardness: 0.6,
      wallTexture: "https://pixijs.com/assets/bg_grass.jpg",
      //   graffitiTexture: "https://pixijs.com/assets/bg_rotate.jpg",
      graffitiTexture: "/assets/preload/gr1.png",
      outlineTexture: "/assets/preload/gr1_o.png",
      brushSize: 30,
      paintAlpha: 0.05, // Еще более низкая ал
      pressureSensitivity: 0.5, // Увеличиваем чувствительность к скорости
    });

    await this.graffitiPainter.initialize();
    this.addChild(this.graffitiPainter);

    this.createControls();
  }

  private createControls() {
    const controls = document.createElement("div");
    controls.style.position = "absolute";
    controls.style.top = "10px";
    controls.style.left = "10px";
    controls.style.background = "rgba(0,0,0,0.7)";
    controls.style.color = "white";
    controls.style.padding = "10px";
    controls.style.borderRadius = "5px";
    controls.style.zIndex = "1000";

    controls.innerHTML = `
      <div>
        <label>Размер кисти: </label>
        <input type="range" id="brushSize" min="10" max="100" value="40">
      </div>
      <div>
        <label>Жесткость: </label>
        <input type="range" id="brushHardness" min="0.1" max="0.9" step="0.1" value="0.6">
      </div>
      <div>
        <label>Прозрачность: </label>
        <input type="range" id="paintAlpha" min="0.01" max="0.3" step="0.01" value="0.08">
        <span id="alphaValue">0.08</span>
      </div>
      <button id="clearBtn">Очистить</button>
    `;

    document.body.appendChild(controls);

    document.getElementById("brushSize")?.addEventListener("input", (e) => {
      this.graffitiPainter.setBrushSize(parseInt((e.target as HTMLInputElement).value));
    });

    document.getElementById("brushHardness")?.addEventListener("input", (e) => {
      this.graffitiPainter.setBrushHardness(parseFloat((e.target as HTMLInputElement).value));
    });

    const alphaInput = document.getElementById("paintAlpha") as HTMLInputElement;
    const alphaValue = document.getElementById("alphaValue") as HTMLSpanElement;

    alphaInput?.addEventListener("input", (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.graffitiPainter.setPaintAlpha(value);
      alphaValue.textContent = value.toFixed(2);
    });

    document.getElementById("clearBtn")?.addEventListener("click", () => {
      this.graffitiPainter.clear();
    });
  }

  onShow() {
    console.log("GraffitiScreen показан");
  }

  onHide() {
    console.log("GraffitiScreen скрыт");
    const controls = document.querySelector('div[style*="position: absolute"]');
    if (controls) {
      controls.remove();
    }
  }
}
