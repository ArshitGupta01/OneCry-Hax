// Procedural Web Audio API Sound Engine (TypeScript)
// Zero external audio latency, automatic seamless unlock on first user gesture
// Complete method coverage for Nursery, Attic Relics, Mini-Game, Storybook & Guestbook

import type { MoodType } from './types.js';

export class NurseryAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private isUnlocked: boolean = false;

  constructor() {
    const unlock = () => {
      if (!this.isUnlocked) {
        this.initContext();
        this.isUnlocked = true;
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  public initContext(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {
        // Ignore autoplay restrictions prior to gesture
      });
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.isMuted) {
      this.ctx.suspend().catch(() => {});
    } else if (this.ctx && !this.isMuted) {
      this.ctx.resume().catch(() => {});
      this.playTabChime(0);
    }
    return this.isMuted;
  }

  // 1. Tab Navigation: Pentatonic harp chime for each tab (0 to 4)
  public playTabChime(tabIndex: number): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const pitches = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5, D5, E5, G5, A5
    const freq = pitches[Math.abs(tabIndex) % pitches.length];
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2.005, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.55);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.56);
    osc2.stop(now + 0.56);
  }

  // 2. Mood Switcher Sounds: Distinct harmonic character for each mood
  public playMoodSound(mood: MoodType | string): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (mood === 'curious') {
      [587.33, 880.0].forEach((f, i) => {
        setTimeout(() => this.playSoftTone(f, 0.24, 'sine', 0.11), i * 80);
      });
    } else if (mood === 'cozy') {
      [392.0, 493.88, 587.33].forEach((f) => {
        this.playSoftTone(f, 0.65, 'sine', 0.08);
      });
    } else if (mood === 'proud') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => this.playSoftTone(f, 0.35, 'triangle', 0.11), i * 65);
      });
    } else if (mood === 'giggling') {
      this.playGiggle();
    } else if (mood === 'snoozing') {
      [261.63, 329.63, 392.0].forEach((f) => {
        this.playSoftTone(f, 1.25, 'sine', 0.07);
      });
    }
  }

  // 3. Feeding Star-Cookies: Crunchy sugar chimes
  public playCookieCrunch(): void {
    if (this.isMuted) return;
    this.initContext();
    [440, 587.33, 739.99, 880].forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.065);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      }, idx * 55);
    });
  }

  // 4. Petting / Cuddling Pip: Sweet purr & rising harmonic chimes
  public playPetPurr(): void {
    if (this.isMuted) return;
    this.initContext();
    [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
      setTimeout(() => this.playSoftTone(f, 0.42, 'sine', 0.1), i * 65);
    });
  }

  // 5. Attic Lullaby Music Box Winding & Sequence
  public playWindingTick(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    [0, 70, 140].forEach((delay) => {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(760 + Math.random() * 180, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.035);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }, delay);
    });
  }

  public playMusicBoxSequence(onComplete?: () => void): void {
    if (this.isMuted) {
      if (onComplete) onComplete();
      return;
    }
    const melody = [
      523.25, 523.25, 783.99, 783.99, 880.0, 880.0, 783.99,
      659.25, 659.25, 587.33, 587.33, 523.25
    ];
    melody.forEach((note, idx) => {
      setTimeout(() => {
        this.playSoftTone(note, 0.85, 'sine', 0.11);
        this.playSoftTone(note * 2, 0.45, 'triangle', 0.04);
        if (idx === melody.length - 1 && onComplete) {
          onComplete();
        }
      }, idx * 230);
    });
  }

  // 6. Rattle Blocks Pentatonic Tones (P - I - P - ★)
  public playBlockTone(index: number): void {
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const freq = notes[Math.abs(index) % notes.length];
    this.playSoftTone(freq, 0.55, 'triangle', 0.14);
    this.playSoftTone(freq * 1.5, 0.25, 'sine', 0.05);
  }

  // 7. Page Turn Shimmer for 2-Page Pop-Up Storybook
  public playPageTurn(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 8. Wish Sent Magical Fanfare
  public playWishCelebration(): void {
    if (this.isMuted) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      setTimeout(() => this.playSoftTone(f, 0.48, 'triangle', 0.12), i * 80);
    });
  }

  // 9. Lantern / Night Mode Dimmer Toggle
  public playLanternSwitch(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.11);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // 10. Mini-Game Pickups & Hazards
  public playStarPickup(): void {
    if (this.isMuted) return;
    this.playSoftTone(987.77, 0.16, 'sine', 0.13);
  }

  public playRainDropBonk(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.16);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // 11. Universal Compatibility Helpers (Used across UI & Game)
  public playClick(freq: number = 520): void {
    if (this.isMuted) return;
    this.playSoftTone(freq, 0.09, 'sine', 0.08);
  }

  public playChime(freq: number = 659.25, duration: number = 0.5): void {
    if (this.isMuted) return;
    this.playSoftTone(freq, duration, 'triangle', 0.11);
  }

  public playGiggle(): void {
    if (this.isMuted) return;
    [659.25, 783.99, 987.77, 1046.5].forEach((f, i) => {
      setTimeout(() => this.playSoftTone(f, 0.18, 'sine', 0.11), i * 60);
    });
  }

  public playPluckString(noteIndex: number): void {
    this.playBlockTone(noteIndex);
  }

  // 11. Easter Egg (500 Score Surprise): Appear, Tremor, Burst & Secret Lullaby
  public playEasterEggAppear(): void {
    if (this.isMuted) return;
    this.initContext();
    const chord = [369.99, 466.16, 554.37, 698.46, 830.61]; // F#4, A#4, C#5, F5, G#5
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playSoftTone(freq, 1.1, 'sine', 0.09);
        this.playSoftTone(freq * 1.5, 0.7, 'triangle', 0.04);
      }, idx * 75);
    });
  }

  public playEggTremor(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    [0, 50, 110, 180, 240].forEach((delay, i) => {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420 + i * 85, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.03);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      }, delay);
    });
  }

  public playEggBurst(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const oscPop = this.ctx.createOscillator();
    const gainPop = this.ctx.createGain();
    oscPop.type = 'sine';
    oscPop.frequency.setValueAtTime(900, now);
    oscPop.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    gainPop.gain.setValueAtTime(0.18, now);
    gainPop.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    oscPop.connect(gainPop);
    gainPop.connect(this.ctx.destination);
    oscPop.start(now);
    oscPop.stop(now + 0.14);

    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    fanfare.forEach((freq, idx) => {
      setTimeout(() => {
        this.playSoftTone(freq, 0.75, 'triangle', 0.13);
        this.playSoftTone(freq * 2, 0.4, 'sine', 0.05);
      }, 40 + idx * 60);
    });
  }

  public playSecretLullaby(onComplete?: () => void): void {
    if (this.isMuted) {
      if (onComplete) onComplete();
      return;
    }
    const anthem = [
      659.25, 783.99, 987.77, 1046.5, 987.77, 783.99,
      659.25, 587.33, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98
    ];
    anthem.forEach((note, idx) => {
      setTimeout(() => {
        this.playSoftTone(note, 0.95, 'sine', 0.12);
        this.playSoftTone(note * 2, 0.45, 'triangle', 0.05);
        if (idx === anthem.length - 1 && onComplete) {
          onComplete();
        }
      }, idx * 190);
    });
  }

  private playSoftTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.12
  ): void {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.015);
  }
}

export const sound = new NurseryAudioEngine();
