// 60FPS Canvas Mini-Game in TypeScript: Starry Delivery Route
// Includes Stardust Ribbon Trail, Floating Combo Text, Screen Shake & Confetti

import confetti from 'canvas-confetti';
import type { NurseryAudioEngine } from './audio.js';
import type {
  GameItem,
  Particle,
  BackgroundStar,
  FloatingText,
  TrailPoint
} from './types.js';

export class StarryDeliveryGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sound: NurseryAudioEngine | null;

  public width: number;
  public height: number;
  public state: 'idle' | 'running' | 'paused' | 'gameover' = 'idle';
  public score: number = 0;
  public hearts: number = 3;
  public highScore: number = 0;
  public easterEggTriggered: boolean = false;
  public hasGoldenHalo: boolean = false;
  public onEasterEggTrigger?: () => void;
  private combo: number = 0;
  private shakeTimer: number = 0;

  private pipImg: HTMLImageElement;
  private player: {
    x: number;
    y: number;
    targetX: number;
    width: number;
    height: number;
    tilt: number;
  };

  private items: GameItem[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private trail: TrailPoint[] = [];
  private stars: BackgroundStar[] = [];
  private spawnTimer: number = 0;
  private lastTime: number = 0;
  private animId: number | null = null;

  constructor(canvasId: string, soundEngine: NurseryAudioEngine | null) {
    const el = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!el) throw new Error(`Canvas #${canvasId} not found`);
    this.canvas = el;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.sound = soundEngine;

    this.width = this.canvas.width = 720;
    this.height = this.canvas.height = 440;

    this.pipImg = new Image();
    this.pipImg.src = 'assets/pip_avatar_cloud.png';

    this.highScore = parseInt(localStorage.getItem('pip_game_highscore') || '0', 10);

    this.player = {
      x: this.width / 2,
      y: this.height - 82,
      targetX: this.width / 2,
      width: 78,
      height: 66,
      tilt: 0
    };

    this.initBackgroundStars();
    this.bindEvents();
    this.updateUI();
    this.render();
  }

  private initBackgroundStars(): void {
    this.stars = [];
    for (let i = 0; i < 48; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.45 + 0.2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  private bindEvents(): void {
    const handleMove = (clientX: number) => {
      if (this.state !== 'running') return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const x = (clientX - rect.left) * scaleX;
      this.player.targetX = Math.max(48, Math.min(this.width - 48, x));
    };

    this.canvas.addEventListener('mousemove', (e) => handleMove(e.clientX));
    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length > 0) {
          handleMove(e.touches[0].clientX);
          e.preventDefault();
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener('click', () => {
      if (this.state === 'idle' || this.state === 'gameover') {
        this.start();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.state !== 'running') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.player.targetX = Math.max(48, this.player.targetX - 44);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.player.targetX = Math.min(this.width - 48, this.player.targetX + 44);
      }
    });
  }

  public start(): void {
    this.state = 'running';
    this.score = 0;
    this.hearts = 3;
    this.combo = 0;
    this.shakeTimer = 0;
    this.easterEggTriggered = false;
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];
    this.trail = [];
    this.player.x = this.width / 2;
    this.player.targetX = this.width / 2;
    this.lastTime = performance.now();
    this.updateUI();
    if (this.sound) this.sound.playChime(659.25, 0.35);
    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  }

  public pause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
      if (this.animId) cancelAnimationFrame(this.animId);
      this.render();
      this.updateUI();
    } else if (this.state === 'paused') {
      this.state = 'running';
      this.lastTime = performance.now();
      this.loop();
      this.updateUI();
    }
  }

  public resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      this.lastTime = performance.now();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.loop();
      this.updateUI();
    }
  }

  public stop(): void {
    this.state = 'idle';
    if (this.animId) cancelAnimationFrame(this.animId);
    this.render();
    this.updateUI();
  }

  private spawnItem(): void {
    const r = Math.random();
    let type: GameItem['type'] = 'star';
    let speed = 2.1 + Math.random() * 1.4 + Math.min(1.5, this.score * 0.0025);
    let size = 17;

    if (r < 0.5) {
      type = 'star';
    } else if (r < 0.72) {
      type = 'parcel';
      size = 21;
      speed *= 0.92;
    } else if (r < 0.82) {
      type = 'moon';
      size = 23;
      speed *= 0.85;
    } else {
      type = 'raindrop';
      size = 16;
      speed *= 1.25;
    }

    this.items.push({
      x: Math.random() * (this.width - 96) + 48,
      y: -30,
      type,
      size,
      speed,
      rot: 0,
      rotSpeed: (Math.random() - 0.5) * 0.07
    });
  }

  private addSparkles(x: number, y: number, color = '#ffd166', count = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.6 + 1.1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        decay: Math.random() * 0.032 + 0.018
      });
    }
  }

  private addFloatingText(x: number, y: number, text: string, color = '#ffd166'): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -1.4,
      text,
      color,
      alpha: 1
    });
  }

  private loop(): void {
    if (this.state !== 'running') return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    const dx = this.player.targetX - this.player.x;
    this.player.x += dx * 0.18;
    this.player.tilt = Math.max(-0.28, Math.min(0.28, dx * 0.0035));

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    // Add stardust trail point
    this.trail.unshift({
      x: this.player.x,
      y: this.player.y + 18,
      alpha: 0.75,
      size: 9
    });
    if (this.trail.length > 16) {
      this.trail.pop();
    }
    for (const t of this.trail) {
      t.y += 0.9;
      t.alpha *= 0.88;
      t.size *= 0.94;
    }

    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.55, 1.15 - this.score * 0.0018);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnItem();
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speed;
      item.rot += item.rotSpeed;

      const dist = Math.hypot(item.x - this.player.x, item.y - (this.player.y + 6));
      if (dist < item.size + 30) {
        if (item.type === 'raindrop') {
          this.hearts -= 1;
          this.combo = 0;
          this.shakeTimer = 0.28;
          this.addSparkles(item.x, item.y, '#64dfdf', 14);
          this.addFloatingText(item.x, item.y - 10, '💧 Soggy Cloud!', '#64dfdf');
          if (this.sound) this.sound.playRainDropBonk();
          if (this.hearts <= 0) {
            this.items.splice(i, 1);
            this.gameOver();
            return;
          }
        } else {
          this.combo += 1;
          const bonus = this.combo >= 5 ? 2 : 1;
          let pts = 10 * bonus;
          let color = '#ffd166';

          if (item.type === 'star') {
            pts = 10 * bonus;
            color = '#ffd166';
            if (this.sound) this.sound.playStarPickup();
          } else if (item.type === 'parcel') {
            pts = 25 * bonus;
            color = '#f4978e';
            if (this.sound) this.sound.playChime(880, 0.35);
          } else if (item.type === 'moon') {
            pts = 50 * bonus;
            color = '#fffae0';
            if (this.sound) this.sound.playGiggle();
          }

          this.score += pts;
          this.addSparkles(item.x, item.y, color, 14);
          const label = bonus > 1 ? `+${pts} (2x★)` : `+${pts}`;
          this.addFloatingText(item.x, item.y - 12, label, color);

          if (this.score >= 500 && !this.easterEggTriggered) {
            this.items.splice(i, 1);
            this.updateUI();
            this.triggerEasterEgg();
            return;
          }
        }

        this.items.splice(i, 1);
        this.updateUI();
        continue;
      }

      if (item.y > this.height + 40) {
        this.items.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.022;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private gameOver(): void {
    this.state = 'gameover';
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pip_game_highscore', this.highScore.toString());
      try {
        confetti({
          particleCount: 55,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffd166', '#f4978e', '#b8b0e4', '#ffffff']
        });
      } catch {
        // Ignore confetti errors in headless environments
      }
    }
    this.render();
    this.updateUI();
  }

  public triggerEasterEgg(): void {
    this.easterEggTriggered = true;
    this.state = 'paused';
    if (this.animId) cancelAnimationFrame(this.animId);
    this.render();
    this.updateUI();

    if (this.onEasterEggTrigger) {
      this.onEasterEggTrigger();
    } else {
      window.dispatchEvent(
        new CustomEvent('pip:easter-egg-unlocked', { detail: { score: this.score } })
      );
    }
  }

  public addBonusReward(scoreBonus = 200, heartBonus = 1): void {
    this.score += scoreBonus;
    this.hearts = Math.min(4, this.hearts + heartBonus);
    this.hasGoldenHalo = true;
    this.addSparkles(this.player.x, this.player.y, '#ffd166', 24);
    this.addFloatingText(this.player.x, this.player.y - 28, `+${scoreBonus} STARDUST! ⭐`, '#ffd166');
    this.updateUI();
  }

  public updateUI(): void {
    const scoreEl = document.getElementById('game-score');
    const heartsEl = document.getElementById('game-hearts');
    const highEl = document.getElementById('game-highscore');
    const startBtn = document.getElementById('game-start-btn');

    if (scoreEl) scoreEl.innerText = this.score.toString();
    if (highEl) highEl.innerText = this.highScore.toString();
    if (heartsEl) {
      heartsEl.innerHTML =
        '❤️'.repeat(Math.max(0, this.hearts)) +
        '🖤'.repeat(Math.max(0, 3 - this.hearts));
    }
    if (startBtn) {
      if (this.state === 'running') startBtn.innerText = 'Pause ❚❚';
      else if (this.state === 'paused') startBtn.innerText = 'Resume ▶';
      else if (this.state === 'gameover') startBtn.innerText = 'Play Again ↺';
      else startBtn.innerText = 'Take Flight 🚀';
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.shakeTimer > 0) {
      const mag = this.shakeTimer * 18;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#0a0b1e');
    bgGrad.addColorStop(0.68, '#1a1538');
    bgGrad.addColorStop(1, '#2b214d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Twinkling background stars
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      s.y = (s.y + s.speed) % this.height;
      s.twinkle += 0.04;
      const alpha = 0.35 + Math.sin(s.twinkle) * 0.3;
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Distant nocturnal Victorian rooftops silhouette
    ctx.fillStyle = '#070815';
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, this.height - 38);
    ctx.lineTo(75, this.height - 72);
    ctx.lineTo(130, this.height - 46);
    ctx.lineTo(205, this.height - 88);
    ctx.lineTo(260, this.height - 54);
    ctx.lineTo(355, this.height - 104);
    ctx.lineTo(435, this.height - 58);
    ctx.lineTo(535, this.height - 84);
    ctx.lineTo(620, this.height - 44);
    ctx.lineTo(720, this.height - 68);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // Warm lit attic windows on silhouette
    ctx.fillStyle = 'rgba(255, 209, 102, 0.45)';
    ctx.fillRect(68, this.height - 54, 8, 10);
    ctx.fillRect(200, this.height - 68, 9, 11);
    ctx.fillRect(350, this.height - 82, 10, 12);
    ctx.fillRect(530, this.height - 64, 8, 10);

    // Render Stardust Ribbon Trail behind Pip
    for (const t of this.trail) {
      if (t.alpha <= 0.04) continue;
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.45;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render falling items
    for (const item of this.items) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot);

      if (item.type === 'star') {
        ctx.fillStyle = '#ffd166';
        ctx.shadowColor = '#ffe29a';
        ctx.shadowBlur = 12;
        this.drawStar(ctx, 0, 0, 5, item.size, item.size * 0.46);
        ctx.fill();
      } else if (item.type === 'parcel') {
        ctx.fillStyle = '#f4978e';
        ctx.shadowColor = '#fca299';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(-item.size / 2, -item.size / 2, item.size, item.size, 6);
        ctx.fill();
        ctx.strokeStyle = '#fff5e4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-item.size / 2, 0);
        ctx.lineTo(item.size / 2, 0);
        ctx.moveTo(0, -item.size / 2);
        ctx.lineTo(0, item.size / 2);
        ctx.stroke();
      } else if (item.type === 'moon') {
        ctx.fillStyle = '#fffae0';
        ctx.shadowColor = '#fff5be';
        ctx.shadowBlur = 14;
        ctx.font = `${item.size * 1.45}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌙', 0, 0);
      } else if (item.type === 'raindrop') {
        ctx.fillStyle = '#64dfdf';
        ctx.shadowColor = '#48cae4';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -item.size);
        ctx.bezierCurveTo(
          -item.size * 0.7,
          0,
          -item.size * 0.7,
          item.size,
          0,
          item.size
        );
        ctx.bezierCurveTo(
          item.size * 0.7,
          item.size,
          item.size * 0.7,
          0,
          0,
          -item.size
        );
        ctx.fill();
      }

      ctx.restore();
    }

    // Render particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render Player (Pip on Cloud)
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.tilt);

    if (this.pipImg.complete && this.pipImg.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(255, 209, 102, 0.45)';
      ctx.shadowBlur = 18;
      ctx.drawImage(
        this.pipImg,
        -this.player.width / 2,
        -this.player.height / 2,
        this.player.width,
        this.player.height
      );
    } else {
      ctx.fillStyle = '#fbf9f4';
      ctx.beginPath();
      ctx.ellipse(0, 10, 36, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -8, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Unlocked Easter Egg Celestial Halo
    if (this.hasGoldenHalo) {
      ctx.save();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#ffe29a';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.ellipse(0, -this.player.height / 2 - 9, 24, 7, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨', 0, -this.player.height / 2 - 14);
      ctx.restore();
    }

    ctx.restore();

    // Render Floating Combo / Score Popups
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = '700 15px Outfit, sans-serif';
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Overlays
    if (this.state === 'idle') {
      ctx.fillStyle = 'rgba(7, 8, 23, 0.76)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ffd166';
      ctx.font = '600 26px Fraunces, serif';
      ctx.textAlign = 'center';
      ctx.fillText('⭐ Starry Delivery Route', this.width / 2, this.height / 2 - 26);
      ctx.fillStyle = '#fbf9f4';
      ctx.font = '400 16px Outfit, sans-serif';
      ctx.fillText(
        'Guide Pip across the rooftops to catch stars (10), parcels (25) & moons (50)!',
        this.width / 2,
        this.height / 2 + 8
      );
      ctx.font = '600 14px Outfit, sans-serif';
      ctx.fillStyle = '#f4978e';
      ctx.fillText(
        'Click canvas or press "Take Flight" • Steer with Mouse, Touch or Arrow Keys',
        this.width / 2,
        this.height / 2 + 40
      );
    } else if (this.state === 'paused') {
      ctx.fillStyle = 'rgba(7, 8, 23, 0.68)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ffd166';
      ctx.font = '600 28px Fraunces, serif';
      ctx.textAlign = 'center';
      ctx.fillText('❚❚ Midnight Flight Paused', this.width / 2, this.height / 2);
    } else if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(7, 8, 23, 0.84)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#f4978e';
      ctx.font = '600 28px Fraunces, serif';
      ctx.textAlign = 'center';
      ctx.fillText('💤 Cozy Slumber Took Over!', this.width / 2, this.height / 2 - 26);
      ctx.fillStyle = '#ffd166';
      ctx.font = '600 20px Outfit, sans-serif';
      ctx.fillText(
        `Delivered: ${this.score} Stardust Points (Best: ${this.highScore})`,
        this.width / 2,
        this.height / 2 + 12
      );
      ctx.fillStyle = '#fbf9f4';
      ctx.font = '500 14px Outfit, sans-serif';
      ctx.fillText(
        'Click anywhere on the sky to fly again ↺',
        this.width / 2,
        this.height / 2 + 44
      );
    }

    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }
}
