// // app/utils/SoundManager.ts
// export class SoundManager {
//   private audioContext: AudioContext | null = null;
//   private sounds: Map<string, AudioBuffer> = new Map();
//   private playingSounds: Map<string, AudioBufferSourceNode> = new Map();

//   async init() {
//     try {
//       // Создаем AudioContext только когда пользователь взаимодействует с страницей
//       this.audioContext = new AudioContext();

//       // Ждем пока пользователь взаимодействует со страницей
//       const unlockAudio = () => {
//         if (this.audioContext && this.audioContext.state === "suspended") {
//           this.audioContext.resume();
//         }
//         document.removeEventListener("click", unlockAudio);
//         document.removeEventListener("keydown", unlockAudio);
//       };

//       document.addEventListener("click", unlockAudio);
//       document.addEventListener("keydown", unlockAudio);

//       console.log("SoundManager initialized");
//     } catch (error) {
//       console.warn("AudioContext not supported, sounds disabled:", error);
//     }
//   }

//   async loadSound(name: string, url: string): Promise<boolean> {
//     if (!this.audioContext) return false;

//     try {
//       const response = await fetch(url);
//       const arrayBuffer = await response.arrayBuffer();
//       const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
//       this.sounds.set(name, audioBuffer);
//       console.log(`Sound loaded: ${name}`);
//       return true;
//     } catch (error) {
//       console.warn(`Failed to load sound ${name}:`, error);
//       return false;
//     }
//   }

//   playSound(name: string, loop: boolean = false): boolean {
//     if (!this.audioContext || !this.sounds.has(name)) return false;

//     try {
//       // Останавливаем предыдущий звук с тем же именем
//       this.stopSound(name);

//       const source = this.audioContext.createBufferSource();
//       source.buffer = this.sounds.get(name)!;
//       source.loop = loop;
//       source.connect(this.audioContext.destination);
//       source.start();

//       this.playingSounds.set(name, source);
//       return true;
//     } catch (error) {
//       console.warn(`Failed to play sound ${name}:`, error);
//       return false;
//     }
//   }

//   stopSound(name: string): boolean {
//     if (!this.playingSounds.has(name)) return false;

//     try {
//       const source = this.playingSounds.get(name)!;
//       source.stop();
//       this.playingSounds.delete(name);
//       return true;
//     } catch (error) {
//       console.warn(`Failed to stop sound ${name}:`, error);
//       return false;
//     }
//   }

//   stopAllSounds() {
//     this.playingSounds.forEach((source, name) => {
//       try {
//         source.stop();
//       } catch (error) {
//         console.warn(`Error stopping sound ${name}:`, error);
//       }
//     });
//     this.playingSounds.clear();
//   }
// }
// app/utils/SoundManager.ts
export class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();

  async loadSound(name: string, url: string): Promise<boolean> {
    try {
      const audio = new Audio();
      audio.src = url;
      audio.preload = "auto";

      // Ждем загрузки звука
      await new Promise((resolve, reject) => {
        audio.addEventListener("canplaythrough", resolve);
        audio.addEventListener("error", reject);
      });

      this.sounds.set(name, audio);
      console.log(`Sound loaded: ${name}`);
      return true;
    } catch (error) {
      console.warn(`Failed to load sound ${name}:`, error);
      return false;
    }
  }

  playSound(name: string, loop: boolean = false): boolean {
    const sound = this.sounds.get(name);
    if (!sound) return false;

    try {
      sound.currentTime = 0;
      sound.loop = loop;

      // Пытаемся воспроизвести
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn(`Failed to play sound ${name}:`, error);
        });
      }
      return true;
    } catch (error) {
      console.warn(`Failed to play sound ${name}:`, error);
      return false;
    }
  }

  stopSound(name: string): boolean {
    const sound = this.sounds.get(name);
    if (!sound) return false;

    try {
      sound.pause();
      sound.currentTime = 0;
      return true;
    } catch (error) {
      console.warn(`Failed to stop sound ${name}:`, error);
      return false;
    }
  }

  stopAllSounds() {
    this.sounds.forEach((sound) => {
      try {
        sound.pause();
        sound.currentTime = 0;
      } catch (error) {
        // Игнорируем ошибки при остановке
      }
    });
  }
}
