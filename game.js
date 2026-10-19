// 60FPS Canvas Mini-Game: Starry Delivery Route
// Fly Pip on his cloud across nocturnal skies, catch stardust & dream parcels, avoid storm drops

export class StarryDeliveryGame {
  constructor(canvasId, soundEngine) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.sound = soundEngine;

    this.width = this.canvas.width = 720;
    this.height = this.canvas.height = 480;

    this.pipImg = new Image();
    this.pipImg.src = 'assets/pip_avatar_cloud.png';

    this.state = 'idle'; // 'idle', 'running', 'paused', 'gameover'
    this.score = 0;
    this.hearts = 3;
    this.highScore = parseInt(localStorage.getItem('pip_game_highscore') || '0', 10);
    this.easterEggTriggered = false;
    this.hasGoldenHalo = false;
    this.onEasterEggTrigger = null;

    // Player position
    this.player = {
      x: this.width / 2,
      y: this.height - 90,
      targetX: this.width / 2,
      width: 76,
      height: 64,
      speed: 0.16,
      tilt: 0
    };

    this.items = [];
    this.particles = [];
    this.stars = [];
    this.spawnTimer = 0;
    this.lastTime = 0;
    this.animId = null;

    this.initBackgroundStars();
    this.bindEvents();
    this.render();
  }

  initBackgroundStars() {
    this.stars = [];
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.4 + 0.2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  bindEvents() {
    const handleMove = (clientX) => {
      if (this.state !== 'running') return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const x = (clientX - rect.left) * scaleX;
      this.player.targetX = Math.max(45, Math.min(this.width - 45, x));
    };

    this.canvas.addEventListener('mousemove', (e) => handleMove(e.clientX));
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (this.state !== 'running') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        this.player.targetX = Math.max(45, this.player.targetX - 40);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        this.player.targetX = Math.min(this.width - 45, this.player.targetX + 40);
      }
    });
  }

  start() {
    this.state = 'running';
    this.score = 0;
    this.hearts = 3;
    this.easterEggTriggered = false;
    this.items = [];
    this.particles = [];
    this.player.x = this.width / 2;
    this.player.targetX = this.width / 2;
    this.lastTime = performance.now();
    this.updateUI();
    if (this.sound) this.sound.playChime(660, 0.4);
    this.loop();
  }

  pause() {
    if (this.state === 'running') {
      this.state = 'paused';
      cancelAnimationFrame(this.animId);
      this.render();
      this.updateUI();
    } else if (this.state === 'paused') {
      this.state = 'running';
      this.lastTime = performance.now();
      this.loop();
      this.updateUI();
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.lastTime = performance.now();
      cancelAnimationFrame(this.animId);
      this.loop();
      this.updateUI();
    }
  }

  stop() {
    this.state = 'idle';
    cancelAnimationFrame(this.animId);
    this.render();
    this.updateUI();
  }

  spawnItem() {
    const r = Math.random();
    let type = 'star';
    let speed = 2.2 + Math.random() * 1.5;
    let size = 18;

    if (r < 0.52) {
      type = 'star'; // +10
    } else if (r < 0.72) {
      type = 'parcel'; // +25
      size = 22;
      speed = 2.0 + Math.random() * 1.0;
    } else if (r < 0.82) {
      type = 'moon'; // +50
      size = 24;
      speed = 1.8 + Math.random() * 0.8;
    } else {
      type = 'raindrop'; // -1 heart
      size = 16;
      speed = 3.0 + Math.random() * 1.6;
    }

    this.items.push({
      x: Math.random() * (this.width - 80) + 40,
      y: -30,
      type: type,
      size: size,
      speed: speed,
      rot: 0,
      rotSpeed: (Math.random() - 0.5) * 0.08
    });
  }

  addSparkles(x, y, color = '#ffd166', count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color,
        alpha: 1,
        decay: Math.random() * 0.035 + 0.02
      });
    }
  }

  loop() {
    if (this.state !== 'running') return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animId = requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    // Player smooth follow
    const dx = this.player.targetX - this.player.x;
    this.player.x += dx * 0.18;
    this.player.tilt = dx * 0.003;

    // Spawn items
    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.65, 1.2 - this.score * 0.002);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnItem();
    }

    // Update items & collision
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speed;
      item.rot += item.rotSpeed;

      // Hit player check
      const dist = Math.hypot(item.x - this.player.x, item.y - (this.player.y + 10));
      if (dist < item.size + 28) {
        if (item.type === 'star') {
          this.score += 10;
          this.addSparkles(item.x, item.y, '#ffd166', 10);
          if (this.sound) this.sound.playStarPickup();
        } else if (item.type === 'parcel') {
          this.score += 25;
          this.addSparkles(item.x, item.y, '#f4978e', 14);
          if (this.sound) this.sound.playChime(880, 0.4);
        } else if (item.type === 'moon') {
          this.score += 50;
          this.addSparkles(item.x, item.y, '#ffffff', 18);
          if (this.sound) this.sound.playGiggle();
        } else if (item.type === 'raindrop') {
          this.hearts -= 1;
          this.addSparkles(item.x, item.y, '#8ecae6', 12);
          if (this.sound) this.sound.playRainDropBonk();
          if (this.hearts <= 0) {
            this.gameOver();
            return;
          }
        }
        this.items.splice(i, 1);
        this.updateUI();

        if (this.score >= 500 && !this.easterEggTriggered) {
          this.triggerEasterEgg();
          return;
        }
        continue;
      }

      // Offscreen
      if (item.y > this.height + 40) {
        this.items.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  gameOver() {
    this.state = 'gameover';
    cancelAnimationFrame(this.animId);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pip_game_highscore', this.highScore.toString());
    }
    this.render();
    this.updateUI();
  }

  triggerEasterEgg() {
    this.easterEggTriggered = true;
    this.state = 'paused';
    cancelAnimationFrame(this.animId);
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

  addBonusReward(scoreBonus = 200, heartBonus = 1) {
    this.score += scoreBonus;
    this.hearts = Math.min(4, this.hearts + heartBonus);
    this.hasGoldenHalo = true;
    this.addSparkles(this.player.x, this.player.y, '#ffd166', 24);
    this.updateUI();
  }

  updateUI() {
    const scoreEl = document.getElementById('game-score');
    const heartsEl = document.getElementById('game-hearts');
    const highEl = document.getElementById('game-highscore');
    const startBtn = document.getElementById('game-start-btn');

    if (scoreEl) scoreEl.innerText = this.score.toString();
    if (highEl) highEl.innerText = this.highScore.toString();
    if (heartsEl) {
      heartsEl.innerHTML = '❤️'.repeat(Math.max(0, this.hearts)) + '🖤'.repeat(Math.max(0, 3 - this.hearts));
    }
    if (startBtn) {
      if (this.state === 'running') startBtn.innerText = 'Pause ❚❚';
      else if (this.state === 'paused') startBtn.innerText = 'Resume ▶';
      else if (this.state === 'gameover') startBtn.innerText = 'Play Again ↺';
      else startBtn.innerText = 'Take Flight 🚀';
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Deep midnight gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#0c0d22');
    bgGrad.addColorStop(0.7, '#1b1738');
    bgGrad.addColorStop(1, '#2c224f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Background twinkling stars
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

    // Distant nocturnal rooftops silhouette
    ctx.fillStyle = '#080816';
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, this.height - 40);
    ctx.lineTo(80, this.height - 75);
    ctx.lineTo(130, this.height - 50);
    ctx.lineTo(210, this.height - 90);
    ctx.lineTo(260, this.height - 60);
    ctx.lineTo(360, this.height - 110);
    ctx.lineTo(440, this.height - 65);
    ctx.lineTo(540, this.height - 85);
    ctx.lineTo(620, this.height - 45);
    ctx.lineTo(720, this.height - 70);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // Render items
    for (const item of this.items) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot);

      if (item.type === 'star') {
        ctx.fillStyle = '#ffd166';
        ctx.shadowColor = '#ffe29a';
        ctx.shadowBlur = 12;
        this.drawStar(ctx, 0, 0, 5, item.size, item.size * 0.45);
        ctx.fill();
      } else if (item.type === 'parcel') {
        ctx.fillStyle = '#f4978e';
        ctx.shadowColor = '#fca299';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(-item.size / 2, -item.size / 2, item.size, item.size, 5);
        ctx.fill();
        // ribbon
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-item.size / 2, -item.size / 2, item.size, item.size);
      } else if (item.type === 'moon') {
        ctx.fillStyle = '#fffae0';
        ctx.shadowColor = '#fff5be';
        ctx.shadowBlur = 14;
        ctx.font = `${item.size * 1.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌙', 0, 0);
      } else if (item.type === 'raindrop') {
        ctx.fillStyle = '#64dfdf';
        ctx.shadowColor = '#48cae4';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -item.size);
        ctx.bezierCurveTo(-item.size * 0.7, 0, -item.size * 0.7, item.size, 0, item.size);
        ctx.bezierCurveTo(item.size * 0.7, item.size, item.size * 0.7, 0, 0, -item.size);
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

    // Render Player (Pip on cloud)
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.tilt);

    if (this.pipImg.complete && this.pipImg.naturalWidth > 0) {
      ctx.shadowColor = 'rgba(255, 209, 102, 0.35)';
      ctx.shadowBlur = 16;
      ctx.drawImage(
        this.pipImg,
        -this.player.width / 2,
        -this.player.height / 2,
        this.player.width,
        this.player.height
      );
    } else {
      // Vector fallback cherub
      ctx.fillStyle = '#f8f9fa';
      ctx.beginPath();
      ctx.ellipse(0, 10, 36, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -8, 20, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // Overlay for idle / paused / gameover states
    if (this.state === 'idle') {
      ctx.fillStyle = 'rgba(8, 9, 26, 0.75)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 26px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⭐ Starry Delivery Route', this.width / 2, this.height / 2 - 20);
      ctx.fillStyle = '#fdfbf7';
      ctx.font = '16px Outfit, sans-serif';
      ctx.fillText('Guide Pip to catch stardust & parcels! Avoid stormy drops.', this.width / 2, this.height / 2 + 15);
      ctx.font = '14px Outfit, sans-serif';
      ctx.fillStyle = '#f4978e';
      ctx.fillText('Move mouse or touch to steer', this.width / 2, this.height / 2 + 45);
    } else if (this.state === 'paused') {
      ctx.fillStyle = 'rgba(8, 9, 26, 0.65)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❚❚ Flight Paused', this.width / 2, this.height / 2);
    } else if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(8, 9, 26, 0.85)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#f4978e';
      ctx.font = 'bold 28px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💤 Slumber Took Over!', this.width / 2, this.height / 2 - 25);
      ctx.fillStyle = '#ffd166';
      ctx.font = '20px Outfit, sans-serif';
      ctx.fillText(`Delivered: ${this.score} Stardust Points`, this.width / 2, this.height / 2 + 15);
    }
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
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
