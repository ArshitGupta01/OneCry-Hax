// Master Application Controller for Pip's Midnight Folio
// Integrates Lenis, Spline 3D Runtime Bridge, 60fps Spring Lerp, Audio & All 5 Tabs

import Lenis from 'lenis';
import confetti from 'canvas-confetti';
import { sound } from './audio.js';
import { StarryDeliveryGame } from './game.js';
import type {
  MoodType,
  TabId,
  RelicId,
  MoodConfig,
  RelicConfig,
  Chapter,
  DreamWish,
  SpringVector
} from './types.js';

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. LENIS SMOOTH SCROLL & OPTIONAL SPLINE 3D RUNTIME BRIDGE
  // =========================================================================
  let lenisInstance: Lenis | null = null;
  try {
    lenisInstance = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
  } catch (err) {
    console.warn('Lenis smooth scroll fallback active:', err);
  }

  // Optional Spline 3D Scene Loader (Activates if data-spline-url is populated)
  const splineCanvas = document.getElementById('spline-canvas') as HTMLCanvasElement | null;
  const splineUrl = splineCanvas?.dataset.splineUrl?.trim();
  if (splineCanvas && splineUrl) {
    import('@splinetool/runtime')
      .then(({ Application }) => {
        const app = new Application(splineCanvas);
        return app.load(splineUrl);
      })
      .then(() => {
        splineCanvas.style.display = 'block';
      })
      .catch((err) => {
        console.warn('Spline 3D scene fallback to 2.5D Diorama:', err);
        splineCanvas.style.display = 'none';
      });
  }

  // =========================================================================
  // 2. 60FPS DAMPED SPRING PHYSICS ENGINE & STARDUST CURSOR TRAIL
  // =========================================================================
  interface StardustParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    rot: number;
    rotSpeed: number;
  }

  const sparkleCanvas = document.getElementById('sparkle-canvas') as HTMLCanvasElement | null;
  const sparkleCtx = sparkleCanvas?.getContext('2d');
  const stardustParticles: StardustParticle[] = [];
  const stardustColors = ['#ffd166', '#f4978e', '#a8dadc', '#ffffff', '#ffd773'];

  function resizeSparkleCanvas(): void {
    if (!sparkleCanvas) return;
    sparkleCanvas.width = window.innerWidth;
    sparkleCanvas.height = window.innerHeight;
  }
  resizeSparkleCanvas();
  window.addEventListener('resize', resizeSparkleCanvas);

  function spawnStardust(x: number, y: number, count = 1): void {
    for (let i = 0; i < count; i++) {
      if (stardustParticles.length > 55) {
        stardustParticles.shift();
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.5;
      stardustParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        size: 3 + Math.random() * 4,
        color: stardustColors[Math.floor(Math.random() * stardustColors.length)],
        alpha: 0.85 + Math.random() * 0.15,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.08
      });
    }
  }

  const spring: SpringVector = {
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0
  };

  window.addEventListener('mousemove', (e) => {
    const normX = (e.clientX / window.innerWidth - 0.5) * 2;
    const normY = (e.clientY / window.innerHeight - 0.5) * 2;
    spring.targetX = normX;
    spring.targetY = normY;

    document.documentElement.style.setProperty('--spot-x', `${(e.clientX / window.innerWidth) * 100}%`);
    document.documentElement.style.setProperty('--spot-y', `${(e.clientY / window.innerHeight) * 100}%`);
    spawnStardust(e.clientX, e.clientY, 1);
  });

  window.addEventListener('pointerdown', (e) => {
    spawnStardust(e.clientX, e.clientY, 6);
  });

  function masterAnimationFrame(time: number): void {
    lenisInstance?.raf(time);

    // Damped spring interpolation (Lerp factor = 0.08)
    spring.currentX += (spring.targetX - spring.currentX) * 0.08;
    spring.currentY += (spring.targetY - spring.currentY) * 0.08;

    const tiltX = (-spring.currentY * 8.5).toFixed(2);
    const tiltY = (spring.currentX * 10.5).toFixed(2);
    const px = (spring.currentX * 14).toFixed(1);
    const py = (spring.currentY * 14).toFixed(1);

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--tilt-x', `${tiltX}deg`);
    rootStyle.setProperty('--tilt-y', `${tiltY}deg`);
    rootStyle.setProperty('--px', `${px}px`);
    rootStyle.setProperty('--py', `${py}px`);

    // Render Stardust particles on sparkleCanvas
    if (sparkleCtx && sparkleCanvas && stardustParticles.length > 0) {
      sparkleCtx.clearRect(0, 0, sparkleCanvas.width, sparkleCanvas.height);
      for (let i = stardustParticles.length - 1; i >= 0; i--) {
        const p = stardustParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.94;
        p.size *= 0.97;
        p.rot += p.rotSpeed;

        if (p.alpha <= 0.03 || p.size <= 0.5) {
          stardustParticles.splice(i, 1);
          continue;
        }

        sparkleCtx.save();
        sparkleCtx.globalAlpha = p.alpha;
        sparkleCtx.translate(p.x, p.y);
        sparkleCtx.rotate(p.rot);
        sparkleCtx.fillStyle = p.color;

        const s = p.size;
        sparkleCtx.beginPath();
        sparkleCtx.moveTo(0, -s);
        sparkleCtx.quadraticCurveTo(0, 0, s, 0);
        sparkleCtx.quadraticCurveTo(0, 0, 0, s);
        sparkleCtx.quadraticCurveTo(0, 0, -s, 0);
        sparkleCtx.quadraticCurveTo(0, 0, 0, -s);
        sparkleCtx.fill();
        sparkleCtx.restore();
      }
    } else if (sparkleCtx && sparkleCanvas && stardustParticles.length === 0) {
      sparkleCtx.clearRect(0, 0, sparkleCanvas.width, sparkleCanvas.height);
    }

    requestAnimationFrame(masterAnimationFrame);
  }
  requestAnimationFrame(masterAnimationFrame);

  // =========================================================================
  // 3. TOP HEADER CONTROLS (SOUND & DIEGETIC NIGHT MODE DIMMER)
  // =========================================================================
  const soundToggleBtn = document.getElementById('sound-toggle') as HTMLButtonElement | null;
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');

  if (soundToggleBtn && soundIcon && soundLabel) {
    soundToggleBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      soundIcon.innerText = isMuted ? '🔇' : '🔔';
      soundLabel.innerText = isMuted ? 'muted' : 'sound on';
      soundToggleBtn.classList.toggle('active', !isMuted);
    });
  }

  const lanternToggleBtn = document.getElementById('lantern-toggle') as HTMLButtonElement | null;
  const dimmerIcon = document.getElementById('dimmer-icon');
  const dimmerLabel = document.getElementById('dimmer-label');

  function applyTheme(isNight: boolean): void {
    if (isNight) {
      document.body.classList.add('night-mode');
      document.body.classList.add('dim-mode');
      if (dimmerIcon) dimmerIcon.innerText = '☀️';
      if (dimmerLabel) dimmerLabel.innerText = 'day mode';
      if (lanternToggleBtn) {
        lanternToggleBtn.classList.add('active');
        lanternToggleBtn.setAttribute('aria-label', 'Switch to Creamy Peach Day Mode');
      }
    } else {
      document.body.classList.remove('night-mode');
      document.body.classList.remove('dim-mode');
      if (dimmerIcon) dimmerIcon.innerText = '🕯️';
      if (dimmerLabel) dimmerLabel.innerText = 'night mode';
      if (lanternToggleBtn) {
        lanternToggleBtn.classList.remove('active');
        lanternToggleBtn.setAttribute('aria-label', 'Switch to Celestial Night Mode');
      }
    }
  }

  function toggleNightMode(): void {
    sound.playLanternSwitch();
    const isNight = !(document.body.classList.contains('night-mode') || document.body.classList.contains('dim-mode'));
    applyTheme(isNight);
    try {
      localStorage.setItem('pip_theme', isNight ? 'night' : 'day');
    } catch {
      // ignore
    }
  }

  if (lanternToggleBtn) {
    lanternToggleBtn.addEventListener('click', toggleNightMode);
  }

  // Initialize theme from storage (default to Creamy Peach Day Mode)
  try {
    const savedTheme = localStorage.getItem('pip_theme');
    applyTheme(savedTheme === 'night');
  } catch {
    applyTheme(false);
  }

  // =========================================================================
  // 4. 5-TAB ROUTER & BOTTOM DOCK NAVIGATION
  // =========================================================================
  const tabOrder: TabId[] = ['nursery', 'attic', 'storybook', 'delivery', 'guestbook'];
  const dockLinks = document.querySelectorAll<HTMLAnchorElement>('.dock-item');
  const tabViews = document.querySelectorAll<HTMLElement>('.tab-view');
  let gameInstance: StarryDeliveryGame | null = null;

  function switchTab(tabId: TabId): void {
    const tabIdx = Math.max(0, tabOrder.indexOf(tabId));
    sound.playTabChime(tabIdx);

    dockLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.tab === tabId);
    });

    tabViews.forEach((view) => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    if (tabId === 'delivery') {
      if (!gameInstance) {
        try {
          gameInstance = new StarryDeliveryGame('game-canvas', sound);
          gameInstance.onEasterEggTrigger = () => showEasterEggModal();
          const startBtn = document.getElementById('game-start-btn');
          if (startBtn) {
            startBtn.addEventListener('click', () => {
              if (!gameInstance) return;
              if (gameInstance.state === 'running' || gameInstance.state === 'paused') {
                gameInstance.pause();
              } else {
                gameInstance.start();
              }
            });
          }
        } catch (err) {
          console.error('Failed to initialize StarryDeliveryGame:', err);
        }
      }
    } else if (gameInstance && gameInstance.state === 'running') {
      gameInstance.pause();
    }

    if (history.replaceState) {
      history.replaceState(null, '', `#${tabId}`);
    }
  }

  dockLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab as TabId | undefined;
      if (tab) switchTab(tab);
    });
  });

  const initialHash = window.location.hash.replace('#', '') as TabId;
  if (tabOrder.includes(initialHash)) {
    switchTab(initialHash);
  }

  const btnToAttic = document.getElementById('btn-to-attic');
  if (btnToAttic) {
    btnToAttic.addEventListener('click', () => switchTab('attic'));
  }

  // =========================================================================
  // 5. TAB 1: NURSERY MASCOT STATE MACHINE & MICRO-INTERACTIONS
  // =========================================================================
  const moodConfigs: Record<MoodType, MoodConfig> = {
    curious: {
      id: 'curious',
      label: 'curious',
      badge: '✨ Curious Watch',
      statusText: 'Guarding Dreams',
      dialogue: '"Ooh, shiny! A nighttime visitor! Welcome to Pip\'s cozy nursery."',
      imageSrc: 'assets/pip_avatar_cloud.png',
      auraColor: 'rgba(255, 209, 102, 0.26)'
    },
    cozy: {
      id: 'cozy',
      label: 'cozy',
      badge: '☁️ Velvet Cloud',
      statusText: 'Swaddled Warm',
      dialogue: '"Wrapped in starlight down, everything is warm, peaceful, and still."',
      imageSrc: 'assets/pip_storybook_plate.jpg',
      auraColor: 'rgba(244, 151, 142, 0.28)'
    },
    proud: {
      id: 'proud',
      label: 'proud',
      badge: '🏮 Chief Architect',
      statusText: 'Lantern Lit',
      dialogue: '"See my brass lantern & music box? Chief Architect of Slumber at your service!"',
      imageSrc: 'assets/pip_portrait.png',
      auraColor: 'rgba(255, 215, 115, 0.34)'
    },
    giggling: {
      id: 'giggling',
      label: 'giggling',
      badge: '🎀 Starry Giggles',
      statusText: 'Full of Giggles',
      dialogue: '"Tee-hee! That tickles like falling stardust down my pink ribbon!"',
      imageSrc: 'assets/pip_wave_hi.jpg',
      auraColor: 'rgba(168, 218, 220, 0.3)'
    },
    snoozing: {
      id: 'snoozing',
      label: 'snoozing',
      badge: '💤 Deep Slumber',
      statusText: 'Resting in Dreams',
      dialogue: '"Zzz... the clockwork hums soft. Nightlights keep all bad dreams away."',
      imageSrc: 'assets/pip_sleeping.jpg',
      auraColor: 'rgba(184, 176, 228, 0.25)'
    }
  };

  const moodChips = document.querySelectorAll<HTMLButtonElement>('.mood-chip');
  const pipDialogue = document.getElementById('pip-dialogue');
  const pipAvatarImg = document.getElementById('pip-avatar-img') as HTMLImageElement | null;
  const pipMoodBadge = document.getElementById('pip-mood-badge');
  const nurseryAura = document.getElementById('nursery-aura');
  const nurseryFx = document.getElementById('nursery-fx');
  const cookiesCountEl = document.getElementById('cookies-count');
  const nurseryStatusEl = document.getElementById('nursery-status');
  let cookiesMunched = 3;
  let typewriterTimer: number | null = null;

  function typewriteDialogue(text: string): void {
    if (!pipDialogue) return;
    if (typewriterTimer) window.clearInterval(typewriterTimer);
    pipDialogue.innerText = '';
    let idx = 0;
    typewriterTimer = window.setInterval(() => {
      if (!pipDialogue) return;
      idx += 1;
      pipDialogue.innerText = text.slice(0, idx);
      if (idx >= text.length && typewriterTimer) {
        window.clearInterval(typewriterTimer);
      }
    }, 16);
  }

  function triggerSquashBounce(el: HTMLElement | null): void {
    if (!el) return;
    el.classList.remove('squash-anim');
    void el.offsetWidth;
    el.classList.add('squash-anim');
  }

  function spawnFlyingFx(emoji: string, count = 1): void {
    if (!nurseryFx) return;
    for (let i = 0; i < count; i++) {
      const fx = document.createElement('div');
      fx.className = 'flying-item';
      fx.innerText = emoji;
      fx.style.left = `${28 + Math.random() * 44}%`;
      fx.style.bottom = `${18 + Math.random() * 24}%`;
      nurseryFx.appendChild(fx);
      setTimeout(() => fx.remove(), 1150);
    }
  }

  moodChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const mood = (chip.dataset.mood as MoodType) || 'curious';
      const cfg = moodConfigs[mood] || moodConfigs.curious;

      moodChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      sound.playMoodSound(mood);
      typewriteDialogue(cfg.dialogue);

      if (pipMoodBadge) pipMoodBadge.innerText = cfg.badge;
      if (nurseryStatusEl) nurseryStatusEl.innerText = cfg.statusText;
      if (nurseryAura) {
        nurseryAura.style.background = `radial-gradient(circle, ${cfg.auraColor} 0%, transparent 70%)`;
      }

      if (pipAvatarImg) {
        pipAvatarImg.src = cfg.imageSrc;
        triggerSquashBounce(pipAvatarImg);
      }

      if (mood === 'giggling') {
        spawnFlyingFx('✨', 2);
      } else if (mood === 'snoozing') {
        spawnFlyingFx('💤', 2);
      }
    });
  });

  function launchParabolicCookie(fromEl: HTMLElement, toEl: HTMLElement | null): void {
    const startRect = fromEl.getBoundingClientRect();
    const endRect = toEl ? toEl.getBoundingClientRect() : {
      left: window.innerWidth * 0.4,
      top: window.innerHeight * 0.45,
      width: 60,
      height: 60
    };

    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const targetX = endRect.left + endRect.width / 2;
    const targetY = endRect.top + endRect.height / 2;

    const cookie = document.createElement('div');
    cookie.className = 'flying-cookie-arc';
    cookie.innerText = '🍪';
    cookie.style.left = `${startX - 18}px`;
    cookie.style.top = `${startY - 18}px`;
    document.body.appendChild(cookie);

    const duration = 520;
    const startTime = performance.now();

    function animateFlight(currentTime: number): void {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const currentX = startX + (targetX - startX) * progress;
      const currentY = startY + (targetY - startY) * progress - Math.sin(progress * Math.PI) * 110;
      const rot = progress * 360;
      const scale = 1 + Math.sin(progress * Math.PI) * 0.35;

      cookie.style.transform = `translate(${currentX - startX}px, ${currentY - startY}px) rotate(${rot}deg) scale(${scale})`;

      if (progress < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        cookie.remove();
        sound.playCookieCrunch();
        triggerSquashBounce(pipAvatarImg);

        for (let i = 0; i < 10; i++) {
          const crumb = document.createElement('div');
          crumb.className = 'cookie-crumb';
          const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5);
          const dist = 28 + Math.random() * 45;
          crumb.style.left = `${targetX}px`;
          crumb.style.top = `${targetY}px`;
          crumb.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
          crumb.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
          document.body.appendChild(crumb);
          setTimeout(() => crumb.remove(), 600);
        }
        spawnFlyingFx('✨', 2);
        typewriteDialogue('"Crunch & yum! Vanilla stardust cookies are Pip\'s favorite midnight treat!"');
      }
    }

    requestAnimationFrame(animateFlight);
  }

  const btnFeedCookie = document.getElementById('btn-feed-cookie');
  if (btnFeedCookie) {
    btnFeedCookie.addEventListener('click', () => {
      cookiesMunched += 1;
      if (cookiesCountEl) cookiesCountEl.innerText = cookiesMunched.toString();
      launchParabolicCookie(btnFeedCookie, pipAvatarImg);
    });
  }

  const btnPetPip = document.getElementById('btn-pet-pip');
  if (btnPetPip) {
    btnPetPip.addEventListener('click', () => {
      sound.playPetPurr();
      spawnFlyingFx('💖', 3);
      triggerSquashBounce(pipAvatarImg);
      typewriteDialogue('"Aww! Warm nursery cuddles make Pip\'s cloud float even higher!"');
    });
  }

  if (pipAvatarImg) {
    pipAvatarImg.addEventListener('click', () => {
      sound.playPetPurr();
      spawnFlyingFx('✨', 2);
      triggerSquashBounce(pipAvatarImg);
    });
  }

  // =========================================================================
  // 6. TAB 2: ATTIC & LULLABY WORKSHOP (5 INTERACTIVE RELICS)
  // =========================================================================
  const relicConfigs: Record<RelicId, RelicConfig> = {
    musicbox: {
      id: 'musicbox',
      index: 0,
      title: 'The Golden Music Box',
      subtitle: 'Relic #1 • Lullaby Lab',
      description:
        'Wind the brass clockwork key to weave a 12-note silver lullaby melody across the attic.',
      actionLabel: 'Wind the Clockwork Key',
      actionIcon: '🎵'
    },
    lantern: {
      id: 'lantern',
      index: 1,
      title: 'The Brass Dream Lantern',
      subtitle: 'Relic #2 • Nightlight Vault',
      description:
        'Porcelain and brass housing a captured shooting star. Casts a warm amber bloom across the timber beams.',
      actionLabel: 'Pulse Starlight Bloom',
      actionIcon: '🏮'
    },
    bed: {
      id: 'bed',
      index: 2,
      title: "Pip's Cloud Cradle",
      subtitle: 'Relic #3 • Slumber Nest',
      description:
        'Feather-soft cloud crib where Pip tucks in under a patchwork star quilt after rooftop deliveries.',
      actionLabel: 'Tuck Pip Into Bed',
      actionIcon: '💤'
    },
    blocks: {
      id: 'blocks',
      index: 3,
      title: 'Pentatonic Rattle-Blocks',
      subtitle: 'Relic #4 • Chime Xylophone',
      description:
        'Tap any P-I-P-★ block in the room to play its resonant pentatonic chime (C5 • E5 • G5 • C6)!',
      actionLabel: 'Play Arpeggio Chime',
      actionIcon: '🎹'
    },
    ribbon: {
      id: 'ribbon',
      index: 4,
      title: 'Silk Ribbon Customizer',
      subtitle: 'Relic #5 • Starlight Bow',
      description:
        "Tied neatly upon Pip's nightcap. Pick a custom silk swatch below to tint Pip's aura and bow!",
      actionLabel: 'Sparkle Silk Bow',
      actionIcon: '🎀'
    }
  };

  const atticRoom = document.getElementById('attic-room');
  const relicsCountEl = document.getElementById('relics-count');
  const relicSubtitle = document.getElementById('relic-subtitle');
  const relicTitle = document.getElementById('relic-title');
  const relicDesc = document.getElementById('relic-desc');
  const relicBtnText = document.getElementById('relic-btn-text');
  const relicBtnIcon = document.getElementById('relic-btn-icon');
  const btnRelicAction = document.getElementById('btn-relic-action');
  const btnAtticLight = document.getElementById('btn-attic-light');
  const ribbonPickerWrap = document.getElementById('ribbon-picker-wrap');
  const musicboxKey = document.getElementById('musicbox-key');
  const atticBedImg = document.getElementById('attic-bed-img') as HTMLImageElement | null;

  const foundRelics = new Set<RelicId>(['musicbox']);
  let activeRelic: RelicId = 'musicbox';
  let bedSleepingState = false;

  function selectRelic(id: RelicId, el: HTMLElement | null): void {
    activeRelic = id;
    const cfg = relicConfigs[id];
    foundRelics.add(id);

    if (relicsCountEl) relicsCountEl.innerText = foundRelics.size.toString();
    const dot = document.getElementById(`dot-${cfg.index}`);
    if (dot) dot.classList.add('found');

    document.querySelectorAll('.attic-object').forEach((node) => {
      node.classList.remove('active-focus');
    });
    if (el) {
      el.classList.add('active-focus');
      triggerSquashBounce(el);
    }

    if (relicSubtitle) relicSubtitle.innerText = cfg.subtitle;
    if (relicTitle) relicTitle.innerText = cfg.title;
    if (relicDesc) relicDesc.innerText = cfg.description;
    if (relicBtnText) relicBtnText.innerText = cfg.actionLabel;
    if (relicBtnIcon) relicBtnIcon.innerText = cfg.actionIcon;
    if (ribbonPickerWrap) {
      ribbonPickerWrap.style.display = id === 'ribbon' ? 'block' : 'none';
    }
  }

  function spawnMusicNotes(count = 10): void {
    const atticNotesFx = document.getElementById('attic-notes-fx');
    if (!atticNotesFx) return;
    const notes = ['♪', '♫', '♬', '✨', '♩'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const note = document.createElement('div');
        note.className = 'music-note-float';
        note.innerText = notes[i % notes.length];
        note.style.left = `${36 + Math.random() * 28}%`;
        note.style.top = `${48 + Math.random() * 16}%`;
        atticNotesFx.appendChild(note);
        setTimeout(() => note.remove(), 1400);
      }, i * 210);
    }
  }

  function executeActiveRelicAction(): void {
    if (activeRelic === 'musicbox') {
      if (musicboxKey) {
        musicboxKey.classList.add('winding');
        setTimeout(() => musicboxKey.classList.remove('winding'), 700);
      }
      sound.playWindingTick();
      sound.playMusicBoxSequence();
      spawnMusicNotes(12);
    } else if (activeRelic === 'lantern') {
      if (atticRoom) atticRoom.classList.toggle('lantern-lit');
      sound.playLanternSwitch();
    } else if (activeRelic === 'bed') {
      bedSleepingState = !bedSleepingState;
      if (atticBedImg) {
        atticBedImg.src = bedSleepingState
          ? 'assets/pip_sleeping.jpg'
          : 'assets/pip_avatar_cloud.png';
        triggerSquashBounce(atticBedImg);
      }
      sound.playMoodSound('snoozing');
    } else if (activeRelic === 'blocks') {
      [0, 1, 2, 3].forEach((n, idx) => {
        setTimeout(() => sound.playBlockTone(n), idx * 140);
      });
    } else if (activeRelic === 'ribbon') {
      sound.playWishCelebration();
    }
  }

  const objMusicbox = document.getElementById('obj-musicbox');
  if (objMusicbox) {
    objMusicbox.addEventListener('click', () => {
      selectRelic('musicbox', objMusicbox);
      sound.playWindingTick();
      sound.playMusicBoxSequence();
      spawnMusicNotes(8);
    });
  }

  const objLantern = document.getElementById('obj-lantern');
  if (objLantern) {
    objLantern.addEventListener('click', () => {
      selectRelic('lantern', objLantern);
      if (atticRoom) atticRoom.classList.add('lantern-lit');
      sound.playLanternSwitch();
    });
  }

  const objBed = document.getElementById('obj-bed');
  if (objBed) {
    objBed.addEventListener('click', () => {
      selectRelic('bed', objBed);
      sound.playMoodSound('snoozing');
    });
  }

  const objBlocks = document.getElementById('obj-blocks');
  const rattleCubes = document.querySelectorAll<HTMLButtonElement>('.rattle-cube');
  rattleCubes.forEach((cube) => {
    cube.addEventListener('click', (e) => {
      e.stopPropagation();
      selectRelic('blocks', objBlocks);
      const noteIdx = parseInt(cube.dataset.note || '0', 10);
      sound.playBlockTone(noteIdx);
      triggerSquashBounce(cube);
    });
  });

  const objRibbon = document.getElementById('obj-ribbon');
  if (objRibbon) {
    objRibbon.addEventListener('click', () => {
      selectRelic('ribbon', objRibbon);
      sound.playChime(880, 0.45);
    });
  }

  if (btnRelicAction) {
    btnRelicAction.addEventListener('click', executeActiveRelicAction);
  }

  if (btnAtticLight) {
    btnAtticLight.addEventListener('click', () => {
      if (atticRoom) atticRoom.classList.toggle('lantern-lit');
      sound.playLanternSwitch();
    });
  }

  const swatchBtns = document.querySelectorAll<HTMLButtonElement>('.swatch-btn');
  swatchBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color || '#f4978e';
      swatchBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      sound.playChime(783.99, 0.4);
      document.documentElement.style.setProperty('--ribbon-hue', color);
      if (pipAvatarImg) {
        pipAvatarImg.style.filter = `drop-shadow(0 16px 24px ${color}99)`;
      }
    });
  });

  // =========================================================================
  // 7. TAB 4: 2-PAGE POP-UP STORYBOOK SPREAD
  // =========================================================================
  const chapters: Chapter[] = [
    {
      act: 'Act I: Prologue',
      title: 'Of Bone Most Bright & Slumber Soft',
      dropCap: 'H',
      bodyHtml: `ark! Softly tread where velvet clouds do rock,<br />
        Nor wake the tiniest watchman of the clock.<br />
        Behold young Pip: no spectre grim nor cold,<br />
        But ivory cherub cast in gentlest mold!<br /><br />
        Beneath a starry cap and ribbon pink,<br />
        This clumsy babe doth giggle, yawn, and blink.`,
      plateSrc: 'assets/pip_avatar_cloud.png',
      plateCaption: 'Plate I • The Ivory Cherub Upon the Velvet Cloud',
      accentColor: '#ffd166'
    },
    {
      act: 'Act II: The Origin',
      title: 'How Falling Star Did Crown the Crib',
      dropCap: 'E',
      bodyHtml: `re moonbeams learned to latch the nursery pane,<br />
        And little ghosts cried out in waking pain,<br />
        A shooting star slipped through the milky height<br />
        And tumbled laughing into swaddled white.<br /><br />
        With rattle-wrench and blueprint drawn in chalk,<br />
        The Midnight Nursery named the babe its own!`,
      plateSrc: 'assets/pip_storybook_plate.jpg',
      plateCaption: 'Plate II • Companion Spirit & The Lullaby Box',
      accentColor: '#f4978e'
    },
    {
      act: 'Act III: The Craft I',
      title: 'The Lullaby Engine & Lantern Vault',
      dropCap: 'C',
      bodyHtml: `ome wind the golden key within the hall,<br />
        Where pastel chimes in measured cadence fall!<br />
        First, The Lullaby Lab: a music-chest<br />
        That weaves harmonic threads of silver rest.<br /><br />
        Each brass-bound lantern holds a drowsy gleam<br />
        To light a monster's path into a dream.`,
      plateSrc: 'assets/pip_portrait.png',
      plateCaption: 'Plate III • Keeper of the Brass Starlight Lantern',
      accentColor: '#a8dadc'
    },
    {
      act: 'Act IV: The Craft II',
      title: 'Rooftop Voyages & Starry Parcels',
      dropCap: 'N',
      bodyHtml: `ow chart The Dream Delivery Route on high,<br />
        Where Pip upon a billowy cloud doth fly!<br />
        Across the gabled roofs and chimneys steep,<br />
        The clumsy courier drops parcels of sleep.<br /><br />
        Each golden pouch descends through quiet night,<br />
        To crown a pillow with celestial light.`,
      plateSrc: 'assets/pip_rooftop_flight.jpg',
      plateCaption: 'Plate IV • Midnight Flight Over Victorian Chimneys',
      accentColor: '#ffd166'
    },
    {
      act: 'Act V: Epilogue',
      title: 'The Cloud Cradle & Scroll of Wishes',
      dropCap: 'U',
      bodyHtml: `pon the Cloud Crib etched in nursery pine,<br />
        Young Pip now rests from slumber's sweet design.<br />
        Now ere the cockcrow breaks the eastern skies,<br />
        And amber pinpricks close their sleepy eyes,<br /><br />
        Inscribe a dream upon the Guestbook Wall,<br />
        And watch the Odometer of Slumber crawl!`,
      plateSrc: 'assets/pip_sleeping.jpg',
      plateCaption: 'Plate V • Chief Architect Asleep in the Cloud Cradle',
      accentColor: '#b8b0e4'
    }
  ];

  let currentChapter = 0;
  const storybookSpread = document.getElementById('storybook-spread');
  const storyPageIndicator = document.getElementById('story-page-indicator');
  const storyChapterTitle = document.getElementById('story-chapter-title');
  const storyDropCap = document.getElementById('story-dropcap');
  const storyBody = document.getElementById('story-body');
  const storyPlateImg = document.getElementById('story-plate-img') as HTMLImageElement | null;
  const storyPlateCaption = document.getElementById('story-plate-caption');
  const storyPrevBtn = document.getElementById('story-prev-btn');
  const storyNextBtn = document.getElementById('story-next-btn');
  const storyDots = document.querySelectorAll<HTMLButtonElement>('.chapter-dot');
  const storyExtraAction = document.getElementById('story-extra-action');
  const storyLanternBtn = document.getElementById('story-lantern-btn');

  function renderChapter(idx: number): void {
    currentChapter = Math.max(0, Math.min(chapters.length - 1, idx));
    const ch = chapters[currentChapter];

    if (storybookSpread) {
      storybookSpread.classList.remove('page-turning');
      void storybookSpread.offsetWidth;
      storybookSpread.classList.add('page-turning');
    }

    if (storyPageIndicator) {
      storyPageIndicator.innerText = `✦ Chapter ${currentChapter + 1} of ${chapters.length} ✦`;
    }
    if (storyChapterTitle) storyChapterTitle.innerText = ch.title;
    if (storyDropCap) storyDropCap.innerText = ch.dropCap;
    if (storyBody) storyBody.innerHTML = ch.bodyHtml;
    if (storyPlateImg) storyPlateImg.src = ch.plateSrc;
    if (storyPlateCaption) storyPlateCaption.innerText = ch.plateCaption;

    storyDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentChapter);
    });

    if (storyExtraAction) {
      storyExtraAction.style.display = currentChapter === chapters.length - 1 ? 'block' : 'none';
    }

    if (storyNextBtn) {
      storyNextBtn.innerText =
        currentChapter === chapters.length - 1 ? 'Sign Guestbook ›' : 'Next Page ›';
    }

    sound.playPageTurn();
  }

  if (storyPrevBtn) {
    storyPrevBtn.addEventListener('click', () => {
      if (currentChapter > 0) renderChapter(currentChapter - 1);
    });
  }

  if (storyNextBtn) {
    storyNextBtn.addEventListener('click', () => {
      if (currentChapter < chapters.length - 1) {
        renderChapter(currentChapter + 1);
      } else {
        switchTab('guestbook');
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (e.key === 'ArrowLeft') {
      if (currentChapter > 0) renderChapter(currentChapter - 1);
    } else if (e.key === 'ArrowRight') {
      if (currentChapter < chapters.length - 1) {
        renderChapter(currentChapter + 1);
      } else {
        switchTab('guestbook');
      }
    } else if (e.key >= '1' && e.key <= '5') {
      const idx = parseInt(e.key, 10) - 1;
      if (tabOrder[idx]) switchTab(tabOrder[idx]);
    } else if (e.key.toLowerCase() === 'm') {
      soundToggleBtn?.click();
    } else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'd') {
      lanternToggleBtn?.click();
    }
  });

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') as TabId;
    if (tabOrder.includes(hash)) {
      switchTab(hash);
    }
  });

  storyDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.chapter || '0', 10);
      renderChapter(idx);
    });
  });

  if (storyLanternBtn) {
    storyLanternBtn.addEventListener('click', () => {
      sound.playWishCelebration();
      storyLanternBtn.innerHTML = '<span>✨</span><span>Radiant Dawn Awoken!</span>';
      try {
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.65 },
          colors: ['#ffd166', '#f4978e', '#ffffff']
        });
      } catch {
        // Ignore confetti errors
      }
    });
  }

  // =========================================================================
  // 8. TAB 5: CELESTIAL GUESTBOOK & SLUMBER ODOMETER
  // =========================================================================
  const wishForm = document.getElementById('wish-form') as HTMLFormElement | null;
  const wishAuthor = document.getElementById('wish-author') as HTMLInputElement | null;
  const wishContent = document.getElementById('wish-content') as HTMLTextAreaElement | null;
  const wishesFeed = document.getElementById('wishes-feed');
  const wishesCountBadge = document.getElementById('wishes-count-badge');
  const slumberOdometer = document.getElementById('slumber-odometer');

  const defaultWishes: DreamWish[] = [
    {
      author: 'Nora & Little Bramble',
      time: '12m ago',
      content:
        "May all the sweet, gentle bedtime dreams find their way to tired little pillows tonight. Pip's lantern guided us!"
    },
    {
      author: 'Starlight Courier',
      time: '34m ago',
      content:
        'Wound the golden music box twice and heard the celestial chimes. The whole nursery is peaceful.'
    },
    {
      author: 'Caspian the Dreamer',
      time: '1h ago',
      content:
        'Wished for soft wings to fly over the gabled Victorian roofs just like Pip!'
    },
    {
      author: 'Midnight Watchman',
      time: '2h ago',
      content: 'Guarding the slumber realm with 0% silence and 100% cozy giggles.'
    }
  ];

  let storedWishes: DreamWish[] = [];
  try {
    storedWishes = JSON.parse(localStorage.getItem('pip_user_wishes') || '[]');
  } catch {
    storedWishes = [];
  }

  let allWishes: DreamWish[] = [...storedWishes, ...defaultWishes];
  let odometerCount = 1482 + storedWishes.length;

  function formatOdometer(val: number): string {
    const padded = val.toString().padStart(6, '0');
    const chars = padded.split('');
    return `${chars[0]} ${chars[1]} ${chars[2]} , ${chars[3]} ${chars[4]} ${chars[5]}`;
  }

  function escapeHtml(str: string): string {
    return str.replace(/[&<>'"]/g, (tag) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      };
      return map[tag] || tag;
    });
  }

  function renderWishes(): void {
    if (!wishesFeed) return;
    wishesFeed.innerHTML = '';
    allWishes.forEach((w) => {
      const card = document.createElement('div');
      card.className = 'wish-card';
      card.innerHTML = `
        <div class="wish-header">
          <span class="wish-author">✦ ${escapeHtml(w.author)}</span>
          <span class="wish-time">${escapeHtml(w.time)}</span>
        </div>
        <p class="wish-text">"${escapeHtml(w.content)}"</p>
      `;
      wishesFeed.appendChild(card);
    });

    if (wishesCountBadge) {
      wishesCountBadge.innerText = `${allWishes.length} wishes`;
    }
    if (slumberOdometer) {
      slumberOdometer.innerText = formatOdometer(odometerCount);
    }
  }

  if (wishForm && wishAuthor && wishContent) {
    wishForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const author = wishAuthor.value.trim();
      const content = wishContent.value.trim();
      if (!author || !content) return;

      const newWish: DreamWish = {
        author,
        time: 'Just now',
        content
      };

      storedWishes.unshift(newWish);
      localStorage.setItem('pip_user_wishes', JSON.stringify(storedWishes));
      allWishes = [newWish, ...allWishes];
      odometerCount += 1;

      renderWishes();
      wishAuthor.value = '';
      wishContent.value = '';

      sound.playWishCelebration();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#ffd166', '#f4978e', '#b8b0e4']
        });
      } catch {
        // Ignore confetti errors
      }
    });
  }

  // =========================================================================
  // 9. EASTER EGG (500 STARDUST MILESTONE SURPRISE & REWARD CARD)
  // =========================================================================
  const eggOverlay = document.getElementById('game-easter-egg-overlay');
  const eggPod = document.getElementById('easter-egg-pod');
  const eggElement = document.getElementById('easter-egg-element');
  const rewardCard = document.getElementById('easter-reward-card');
  const btnEggClose = document.getElementById('btn-egg-close');
  const btnEggResume = document.getElementById('btn-egg-resume');
  const btnEggRestart = document.getElementById('btn-egg-restart');
  const btnEggToNursery = document.getElementById('btn-egg-to-nursery');

  let isHatching = false;

  function showEasterEggModal(): void {
    if (!eggOverlay || !eggPod || !rewardCard || !eggElement) return;
    isHatching = false;
    sound.playEasterEggAppear();

    eggOverlay.style.display = 'flex';
    eggPod.style.display = 'flex';
    rewardCard.style.display = 'none';
    eggElement.classList.remove('cracking');

    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#ffd166', '#ffffff', '#f4978e']
      });
    } catch {
      // Ignore confetti error
    }
  }

  function hatchEasterEgg(): void {
    if (isHatching || !eggElement || !eggPod || !rewardCard) return;
    isHatching = true;
    sound.playEggTremor();
    eggElement.classList.add('cracking');

    window.setTimeout(() => {
      sound.playEggBurst();
      try {
        confetti({
          particleCount: 95,
          spread: 95,
          origin: { y: 0.5, x: 0.5 },
          colors: ['#ffd166', '#f4978e', '#a8dadc', '#ffffff', '#b8b0e4']
        });
      } catch {
        // Ignore confetti error
      }

      eggPod.style.display = 'none';
      rewardCard.style.display = 'flex';
    }, 380);
  }

  if (eggElement) {
    eggElement.addEventListener('click', hatchEasterEgg);
    eggElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hatchEasterEgg();
      }
    });
  }

  // Action: Close Cross Button
  if (btnEggClose) {
    btnEggClose.addEventListener('click', () => {
      sound.playClick(520);
      if (eggOverlay) eggOverlay.style.display = 'none';
      if (gameInstance) gameInstance.resume();
    });
  }

  // Action: Claim Rewards & Resume Flight
  if (btnEggResume) {
    btnEggResume.addEventListener('click', () => {
      sound.playStarPickup();
      cookiesMunched += 5;
      if (cookiesCountEl) cookiesCountEl.innerText = cookiesMunched.toString();

      if (gameInstance) {
        gameInstance.addBonusReward(200, 1);
        if (eggOverlay) eggOverlay.style.display = 'none';
        gameInstance.resume();
      } else if (eggOverlay) {
        eggOverlay.style.display = 'none';
      }
    });
  }

  // Action: Restart Fresh Game
  if (btnEggRestart) {
    btnEggRestart.addEventListener('click', () => {
      sound.playClick(660);
      cookiesMunched += 5;
      if (cookiesCountEl) cookiesCountEl.innerText = cookiesMunched.toString();

      if (eggOverlay) eggOverlay.style.display = 'none';
      if (gameInstance) {
        gameInstance.start();
      }
    });
  }

  // Action: Celebrate with Pip in Nursery
  if (btnEggToNursery) {
    btnEggToNursery.addEventListener('click', () => {
      sound.playGiggle();
      cookiesMunched += 5;
      if (cookiesCountEl) cookiesCountEl.innerText = cookiesMunched.toString();

      if (gameInstance) {
        gameInstance.addBonusReward(200, 1);
      }
      if (eggOverlay) eggOverlay.style.display = 'none';

      switchTab('nursery');
      typewriteDialogue('"Wowie! Congratulations, Co-Architect of Slumber! You gathered 500 stars and unlocked our Golden Blueprint!"');
      if (pipAvatarImg) {
        pipAvatarImg.style.filter = 'drop-shadow(0 0 28px #ffd166)';
        pipAvatarImg.style.animation = 'gentleBounce 0.45s 3 ease-in-out';
      }
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffd166', '#f4978e', '#ffffff']
        });
      } catch {}
    });
  }

  // Listen for custom event
  window.addEventListener('pip:easter-egg-unlocked', () => {
    showEasterEggModal();
  });

  // Global test & demo helpers
  (window as unknown as { triggerPipEasterEgg: () => void; getPipGame: () => StarryDeliveryGame | null }).triggerPipEasterEgg = () => {
    if (!gameInstance) {
      switchTab('delivery');
    }
    if (gameInstance) {
      if (gameInstance.state !== 'running') {
        gameInstance.start();
      }
      gameInstance.score = 500;
      gameInstance.triggerEasterEgg();
    } else {
      showEasterEggModal();
    }
  };

  (window as unknown as { getPipGame: () => StarryDeliveryGame | null }).getPipGame = () => gameInstance;

  renderWishes();
});
