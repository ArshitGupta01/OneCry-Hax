// Procedural Web Audio API Sound Engine for Pip's Midnight Folio
// Zero external audio latency, zero network dependency, instant polyphony

export class NurseryAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.isMuted) {
      this.ctx.suspend();
    } else if (this.ctx && !this.isMuted) {
      this.ctx.resume();
      this.playClick(660);
    }
    return this.isMuted;
  }

  // Soft tactile UI click
  playClick(freq = 520) {
    if (this.isMuted) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  // Polyphonic celestial chime for stars, rewards, and tabs
  playChime(freq = 523.25, duration = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const shimmer = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    shimmer.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    shimmer.frequency.setValueAtTime(freq * 2.01, now); // slight detune for crystalline sparkle

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    shimmer.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    shimmer.start(now);
    osc.stop(now + duration);
    shimmer.stop(now + duration);
  }

  // Mechanical winding tick for the music box key
  playWindingTick() {
    if (this.isMuted) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.038);
  }

  // Pip's happy giggle arpeggio
  playGiggle() {
    if (this.isMuted) return;
    const notes = [659.25, 783.99, 987.77, 1046.5]; // E5, G5, B5, C6
    notes.forEach((n, i) => {
      setTimeout(() => this.playChime(n, 0.3), i * 75);
    });
  }

  // Crunch / Munch sound for feeding star cookies
  playCookieCrunch() {
    if (this.isMuted) return;
    this.initContext();
    const notes = [440, 587.33, 739.99, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.065);
      }, idx * 60);
    });
  }

  // Pluck one string (like the competitor's guitar / chime)
  playPluckString(semitoneIndex = 0) {
    if (this.isMuted) return;
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C D E G A C
    const note = scale[semitoneIndex % scale.length];
    this.playChime(note, 1.4);
  }

  // Generative soothing 9-note music box sequence ("Twinkle Slumber")
  playMusicBoxSequence(onComplete) {
    if (this.isMuted) {
      if (onComplete) onComplete();
      return;
    }
    const melody = [
      523.25, 523.25, 783.99, 783.99,
      880.00, 880.00, 783.99, 659.25,
      659.25, 587.33, 587.33, 523.25
    ]; // C C G G A A G E E D D C
    melody.forEach((note, idx) => {
      setTimeout(() => {
        this.playChime(note, 1.1);
        if (idx === melody.length - 1 && onComplete) {
          onComplete();
        }
      }, idx * 260);
    });
  }

  // Game Star Collect Sound
  playStarPickup() {
    if (this.isMuted) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Game Raindrop / Hurt Sound (gentle soft bonk)
  playRainDropBonk() {
    if (this.isMuted) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.18);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Easter Egg (500 Score Surprise): Appear, Tremor, Burst & Secret Lullaby
  playEasterEggAppear() {
    if (this.isMuted) return;
    this.initContext();
    const chord = [369.99, 466.16, 554.37, 698.46, 830.61];
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playChime(freq, 1.1);
      }, idx * 75);
    });
  }

  playEggTremor() {
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

  playEggBurst() {
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
        this.playChime(freq, 0.75);
      }, 40 + idx * 60);
    });
  }

  playSecretLullaby(onComplete) {
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
        this.playChime(note, 0.95);
        if (idx === anthem.length - 1 && onComplete) {
          onComplete();
        }
      }, idx * 190);
    });
  }
}

export const sound = new NurseryAudioEngine();
