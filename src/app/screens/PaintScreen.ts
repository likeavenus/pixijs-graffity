// app/screens/graffiti/GraffitiScreen.ts
import { Container } from "pixi.js";
import { GraffitiPainter } from "../../components/paint";
import { engine as _engine } from "../getEngine";
import { sound } from "@pixi/sound";
import { AudioPermissionScreen } from "./AudioPermissionScreen";

export class GraffitiScreen extends Container {
  private graffitiPainter!: GraffitiPainter;
  private audioUnlocked: boolean = false;
  private isSpraySoundPlaying: boolean = false;
  private controlsCollapsed: boolean = false;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    const engine = _engine();

    // Сначала показываем экран разблокировки аудио
    this.showAudioPermissionScreen(engine);

    // Инициализируем граффити с новыми путями к текстурам
    this.graffitiPainter = new GraffitiPainter(engine.renderer, {
      brushHardness: 0.6,
      wallTexture: "/assets/preload/1024px-Red_brick_wall_texture.jpeg",
      graffitiTexture: "/assets/preload/gr1.png",
      outlineTexture: "/assets/preload/gr1_o.png",
      brushSize: 30,
      paintAlpha: 0.08,
      pressureSensitivity: 0.5,
    });

    await this.graffitiPainter.initialize();

    // Передаем колбэки для звуков в GraffitiPainter
    this.graffitiPainter.setSoundCallbacks({
      onSprayStart: () => this.playSpraySound(),
      onSprayEnd: () => this.stopSpraySound(),
      onShake: () => this.playShakeSound(),
    });
  }

  private injectStyles() {
    const styleId = "music-player-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
        .music-player {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: "Courier New", monospace;
        }
        
        /* Эквалайзер */
        .equalizer {
            display: flex;
            gap: 2px;
            height: 20px;
            align-items: flex-end;
        }
        .bar {
            width: 4px;
            background: #4ade80; /* Зеленый цвет */
            animation: bounce 0.5s infinite ease-in-out;
        }
        .bar:nth-child(1) { animation-duration: 0.4s; height: 40%; }
        .bar:nth-child(2) { animation-duration: 0.55s; height: 100%; }
        .bar:nth-child(3) { animation-duration: 0.45s; height: 60%; }
        .bar:nth-child(4) { animation-duration: 0.5s; height: 80%; }

        @keyframes bounce {
            0%, 100% { height: 20%; opacity: 0.5; }
            50% { height: 100%; opacity: 1; }
        }

        /* Бегущая строка */
        .track-wrapper {
            overflow: hidden;
            width: 180px;
            mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
            -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
        }
        .track-text {
            white-space: nowrap;
            display: inline-block;
            animation: scroll-text 8s linear infinite;
            font-size: 14px;
            color: #ecfccb;
        }
        @keyframes scroll-text {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
        }
    `;
    document.head.appendChild(style);
  }
  private showAudioPermissionScreen(engine: any) {
    const audioScreen = new AudioPermissionScreen(() => {
      // Аудио разблокировано

      // 1. Убираем слушатель ресайза, чтобы не тратить ресурсы
      window.removeEventListener("resize", resizeHandler);

      engine.stage.removeChild(audioScreen);
      this.addChild(this.graffitiPainter);
      this.audioUnlocked = true;
      this.loadSounds();
      engine.ticker.add(this.update, this);
      this.createControls();
    });

    engine.stage.addChild(audioScreen);

    // 2. Создаем функцию для обновления размеров
    const resizeHandler = () => {
      // Берем реальные размеры окна браузера или канваса
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Обновляем размеры экрана приветствия
      audioScreen.resize(width, height);

      // Также обновляем размер рендерера, если он не на весь экран (опционально, но полезно)
      if (engine.renderer) {
        engine.renderer.resize(width, height);
      }
    };

    // 3. Подписываемся на событие изменения размера окна
    window.addEventListener("resize", resizeHandler);

    // 4. Вызываем один раз сразу, чтобы инициализировать правильные размеры
    resizeHandler();
  }

  private async loadSounds() {
    if (!this.audioUnlocked) return;

    try {
      // Явно загружаем звуки с обработкой ошибок
      await this.loadSound("shake", "/assets/sounds/shake.mp3");
      await this.loadSound("spray", "/assets/sounds/spray.mp3");
      await this.loadSound("background", "/assets/sounds/b.mp3");

      sound.play("background", {
        loop: true,
        volume: 0.3, // Фоновая музыка не должна быть громкой
      });
    } catch (error) {
      console.warn("Could not load sounds:", error);
    }
  }

  private async loadSound(name: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Проверяем, не загружен ли уже звук
      if (sound.exists(name)) {
        console.log(`Sound ${name} already loaded`);
        resolve();
        return;
      }

      // Добавляем звук
      sound.add(name, {
        url: url,
        preload: true,
        loaded: (err) => {
          if (err) {
            console.warn(`Failed to load sound ${name}:`, err);
            reject(err);
          } else {
            console.log(`Sound ${name} loaded successfully`);
            resolve();
          }
        },
      });
    });
  }

  private playSpraySound() {
    if (!this.audioUnlocked || this.isSpraySoundPlaying) return;

    try {
      const instance = sound.play("spray", {
        loop: true,
        volume: 0.4,
      });

      if (instance) {
        this.isSpraySoundPlaying = true;
        instance.on("end", () => {
          this.isSpraySoundPlaying = false;
        });
      }
    } catch (error) {
      console.warn("Failed to play spray sound:", error);
    }
  }

  private stopSpraySound() {
    if (!this.audioUnlocked || !this.isSpraySoundPlaying) return;

    try {
      sound.stop("spray");
      this.isSpraySoundPlaying = false;
    } catch (error) {
      console.warn("Failed to stop spray sound:", error);
    }
  }

  private playShakeSound() {
    if (!this.audioUnlocked) return;

    try {
      sound.play("shake", { volume: 0.6 });
    } catch (error) {
      console.warn("Failed to play shake sound:", error);
    }
  }

  private update = (delta: number) => {
    if (this.graffitiPainter) {
      const deltaInSeconds = delta / 60;
      this.graffitiPainter.update(deltaInSeconds);
    }
  };

  // Внутри класса GraffitiScreen в PaintScreen.ts

  private createControls() {
    this.injectStyles();

    const controls = document.createElement("div");
    controls.id = "controlsPanel";
    controls.style.position = "absolute";
    controls.style.top = "20px";
    controls.style.left = "20px";
    controls.style.width = "280px";
    controls.style.background = "rgba(10, 10, 10, 0.85)";
    controls.style.color = "#ececec";
    controls.style.padding = "20px";
    controls.style.borderRadius = "12px";
    controls.style.zIndex = "1000";
    controls.style.backdropFilter = "blur(10px)";
    controls.style.border = "1px solid rgba(255,255,255,0.1)";
    controls.style.boxShadow = "0 8px 32px 0 rgba(0, 0, 0, 0.37)";
    controls.style.fontFamily = "Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    controls.style.transition = "all 0.3s ease";

    controls.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e72264;">
            <div style="font-weight: 800; font-size: 18px; letter-spacing: 1px; text-transform: uppercase;">
                STREET PAINTER <span style="font-size: 10px; background: #e72264; padding: 2px 4px; border-radius: 4px; vertical-align: middle;">DEMO</span>
            </div>
            <button id="toggleBtn" style="background: transparent; border: none; color: white; cursor: pointer; font-size: 20px; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 5px; transition: background 0.2s;">
                ▼
            </button>
        </div>

        <div id="controlsContent">
            <div style="font-size: 13px; line-height: 1.6; color: #aaa; margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
                <div style="display:flex; justify-content:space-between;"><span>🖌 <b>ЛКМ</b></span> <span>Рисовать</span></div>
                <div style="display:flex; justify-content:space-between;"><span>🔄 <b>SPACE</b></span> <span>Встряхнуть баллон</span></div>
            </div>

            <div style="margin: 15px 0;">
                <label style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                    <span>Размер кисти</span>
                    <span id="brushSizeVal">30px</span>
                </label>
                <input type="range" id="brushSize" min="5" max="100" value="30" style="width: 100%; cursor: pointer; accent-color: #e72264;">
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                    <span>Давление</span>
                    <span id="alphaValue">0.08</span>
                </label>
                <input type="range" id="paintAlpha" min="0.01" max="0.5" step="0.01" value="0.08" style="width: 100%; cursor: pointer; accent-color: #e72264;">
            </div>

            <button id="clearBtn" style="width: 100%; margin: 10px 0 20px; padding: 10px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer; transition: background 0.2s; font-weight: 600;">
                ОЧИСТИТЬ СТЕНУ
            </button>
            
            <!-- АНИМИРОВАННЫЙ ПЛЕЕР -->
            <div class="music-player">
                <div class="equalizer">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>
                <div class="track-wrapper">
                    <div class="track-text">
                        🎵 Del The Funky Homosapien - Catch a Bad One 🎵
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 15px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                 AUDIO STATUS: ${this.audioUnlocked ? "<span style='color:#4ade80; font-weight:bold'>● ONLINE</span>" : "<span style='color:#ef4444; font-weight:bold'>● OFFLINE</span>"}
            </div>
        </div>
    `;

    document.body.appendChild(controls);

    // Кнопка сворачивания/разворачивания
    const toggleBtn = document.getElementById("toggleBtn");
    const controlsContent = document.getElementById("controlsContent");

    toggleBtn?.addEventListener("click", () => {
      this.controlsCollapsed = !this.controlsCollapsed;

      if (this.controlsCollapsed) {
        // Сворачиваем
        if (controlsContent) controlsContent.style.display = "none";
        if (toggleBtn) toggleBtn.innerHTML = "▲";
        controls.style.width = "280px"; // Сохраняем ширину для красоты
        controls.style.padding = "15px 20px";
      } else {
        // Разворачиваем
        if (controlsContent) controlsContent.style.display = "block";
        if (toggleBtn) toggleBtn.innerHTML = "▼";
        controls.style.padding = "20px";
      }
    });

    // Hover эффект для кнопки toggle
    if (toggleBtn) {
      toggleBtn.onmouseover = () => (toggleBtn.style.background = "rgba(255,255,255,0.1)");
      toggleBtn.onmouseout = () => (toggleBtn.style.background = "transparent");
    }

    // Hover эффект для кнопки очистки
    const btn = document.getElementById("clearBtn");
    if (btn) {
      btn.onmouseover = () => (btn.style.background = "#444");
      btn.onmouseout = () => (btn.style.background = "#333");
    }

    // Слушатели событий (твой код без изменений)
    document.getElementById("brushSize")?.addEventListener("input", (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.graffitiPainter.setBrushSize(val);
      const label = document.getElementById("brushSizeVal");
      if (label) label.textContent = val + "px";
    });

    const alphaInput = document.getElementById("paintAlpha") as HTMLInputElement;
    const alphaValue = document.getElementById("alphaValue") as HTMLSpanElement;

    alphaInput?.addEventListener("input", (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.graffitiPainter.setPaintAlpha(value);
      if (alphaValue) alphaValue.textContent = value.toFixed(2);
    });

    document.getElementById("clearBtn")?.addEventListener("click", () => {
      this.graffitiPainter.clear();
    });
  }
  private testSounds() {
    if (!this.audioUnlocked) {
      console.log("Audio not unlocked yet");
      alert("Аудио не разблокировано! Сначала кликните на экране для разблокировки звука.");
      return;
    }

    console.log("Testing sounds...");

    // Тестируем звук встряхивания
    this.playShakeSound();

    // Тестируем звук распыления
    this.playSpraySound();
    setTimeout(() => {
      this.stopSpraySound();
    }, 2000);
  }

  onShow() {
    console.log("GraffitiScreen показан");
    document.body.style.cursor = "none";
  }

  onHide() {
    console.log("GraffitiScreen скрыт");
    document.body.style.cursor = "default";

    // Останавливаем все звуки
    this.stopSpraySound();
    sound.stopAll();

    // Удаляем элементы управления
    const controls = document.querySelector('div[style*="position: absolute"]');
    if (controls) {
      controls.remove();
    }
  }
}
