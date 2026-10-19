// Master Application Logic for Pip's Midnight Folio
import { sound } from './audio.js';
import { StarryDeliveryGame } from './game.js';

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. LENIS SMOOTH SCROLL INITIALIZATION
  // =========================================================================
  let lenisInstance = null;
  if (window.Lenis) {
    try {
      lenisInstance = new window.Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false
      });

      function raf(time) {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    } catch (err) {
      console.warn('Lenis scroll fallback active:', err);
    }
  }

  // =========================================================================
  // 2. AUDIO & HEADER CONTROLS
  // =========================================================================
  const soundToggleBtn = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const soundLabel = document.getElementById('sound-label');

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      soundIcon.innerText = isMuted ? '🔇' : '🔔';
      soundLabel.innerText = isMuted ? 'muted' : 'sound on';
      soundToggleBtn.classList.toggle('active', !isMuted);
    });
  }

  const lanternToggleBtn = document.getElementById('lantern-toggle');
  const dimmerIcon = document.getElementById('dimmer-icon');
  const dimmerLabel = document.getElementById('dimmer-label');

  function applyTheme(isNight) {
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

  if (lanternToggleBtn) {
    lanternToggleBtn.addEventListener('click', () => {
      sound.playLanternSwitch ? sound.playLanternSwitch() : sound.playClick(440);
      const isNight = !(document.body.classList.contains('night-mode') || document.body.classList.contains('dim-mode'));
      applyTheme(isNight);
      try {
        localStorage.setItem('pip_theme', isNight ? 'night' : 'day');
      } catch (e) {}
    });
  }

  try {
    const savedTheme = localStorage.getItem('pip_theme');
    applyTheme(savedTheme === 'night');
  } catch (e) {
    applyTheme(false);
  }

  // =========================================================================
  // 3. TAB ROUTER & DOCK NAVIGATION
  // =========================================================================
  const dockLinks = document.querySelectorAll('.dock-item');
  const tabViews = document.querySelectorAll('.tab-view');
  let gameInstance = null;

  function switchTab(tabId) {
    sound.playClick(580);

    // Update dock
    dockLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tabId);
    });

    // Update views
    tabViews.forEach(view => {
      const match = view.id === `view-${tabId}`;
      view.classList.toggle('active', match);
    });

    // Game lifecycle
    if (tabId === 'delivery') {
      if (!gameInstance) {
        gameInstance = new StarryDeliveryGame('game-canvas', sound);
        gameInstance.onEasterEggTrigger = () => showEasterEggModal();
        const startBtn = document.getElementById('game-start-btn');
        if (startBtn) {
          startBtn.addEventListener('click', () => {
            if (gameInstance.state === 'running') gameInstance.pause();
            else if (gameInstance.state === 'paused') gameInstance.pause();
            else gameInstance.start();
          });
        }
      }
    } else if (gameInstance && gameInstance.state === 'running') {
      gameInstance.pause();
    }

    // Update URL hash without abrupt jump
    if (history.pushState) {
      history.pushState(null, null, `#${tabId}`);
    } else {
      window.location.hash = `#${tabId}`;
    }
  }

  dockLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  // Check URL hash on initial load
  const initialHash = window.location.hash.replace('#', '');
  if (['nursery', 'attic', 'storybook', 'delivery', 'guestbook'].includes(initialHash)) {
    switchTab(initialHash);
  }

  // Quick jump button from nursery to attic
  const btnToAttic = document.getElementById('btn-to-attic');
  if (btnToAttic) {
    btnToAttic.addEventListener('click', () => switchTab('attic'));
  }

  // =========================================================================
  // 4. TAB 1: NURSERY MASCOT STATE MACHINE
  // =========================================================================
  const moodChips = document.querySelectorAll('.mood-chip');
  const pipDialogue = document.getElementById('pip-dialogue');
  const pipAvatarImg = document.getElementById('pip-avatar-img');
  const nurseryFx = document.getElementById('nursery-fx');
  const cookiesCountEl = document.getElementById('cookies-count');
  const nurseryStatusEl = document.getElementById('nursery-status');
  let cookiesMunched = 3;

  const moodDialogues = {
    curious: '"Ooh, shiny! A nighttime visitor! Welcome to Pip\'s nursery."',
    cozy: '"Wrapped in starlight down, everything is warm, peaceful, and still."',
    proud: '"See my brass compass? Chief Architect of Slumber at your service!"',
    giggling: '"Tee-hee! That tickles like falling stardust down my ribbon!"',
    snoozing: '"Zzz... the clockwork hums soft. Nightlights keep all bad dreams away."'
  };

  moodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sound.playClick(620);
      moodChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const mood = chip.dataset.mood;
      if (pipDialogue) pipDialogue.innerText = moodDialogues[mood] || moodDialogues.curious;

      if (mood === 'giggling') {
        sound.playGiggle();
        pipAvatarImg.style.animation = 'gentleBounce 0.45s 3 ease-in-out';
        setTimeout(() => pipAvatarImg.style.animation = 'floatCloud 4.5s ease-in-out infinite alternate', 1400);
      } else if (mood === 'snoozing') {
        sound.playChime(392, 1.2);
        if (nurseryStatusEl) nurseryStatusEl.innerText = 'Resting in Dreams';
      } else {
        if (nurseryStatusEl) nurseryStatusEl.innerText = 'Guarding Dreams';
      }
    });
  });

  // Feed Cookie
  const btnFeedCookie = document.getElementById('btn-feed-cookie');
  if (btnFeedCookie) {
    btnFeedCookie.addEventListener('click', () => {
      cookiesMunched++;
      if (cookiesCountEl) cookiesCountEl.innerText = cookiesMunched.toString();
      sound.playCookieCrunch();

      // Spawn flying cookie
      spawnFlyingFx('🍪');

      if (pipDialogue) {
        pipDialogue.innerText = '"Crunch & yum! Stardust cookies taste like vanilla sugar!"';
      }
    });
  }

  // Cuddle / Pet Pip
  const btnPetPip = document.getElementById('btn-pet-pip');
  if (btnPetPip) {
    btnPetPip.addEventListener('click', () => {
      sound.playGiggle();
      spawnFlyingFx('💖');
      spawnFlyingFx('✨');

      if (pipDialogue) {
        pipDialogue.innerText = '"Aww! Pip loves gentle nursery cuddles!"';
      }
    });
  }

  if (pipAvatarImg) {
    pipAvatarImg.addEventListener('click', () => {
      sound.playGiggle();
      spawnFlyingFx('✨');
    });
  }

  function spawnFlyingFx(emoji) {
    if (!nurseryFx) return;
    const fx = document.createElement('div');
    fx.className = 'flying-item';
    fx.innerText = emoji;
    fx.style.left = `${30 + Math.random() * 40}%`;
    fx.style.bottom = `${20 + Math.random() * 20}%`;
    nurseryFx.appendChild(fx);
    setTimeout(() => fx.remove(), 1200);
  }

  // =========================================================================
  // 5. TAB 2: ATTIC & LULLABY WORKSHOP (2.5D Tilt Diorama)
  // =========================================================================
  const atticRoom = document.getElementById('attic-room');
  const relicsCountEl = document.getElementById('relics-count');
  const relicTitle = document.getElementById('relic-title');
  const relicDesc = document.getElementById('relic-desc');
  const relicBtnText = document.getElementById('relic-btn-text');
  const btnRelicAction = document.getElementById('btn-relic-action');
  const ribbonPickerWrap = document.getElementById('ribbon-picker-wrap');
  const foundRelics = new Set(['musicbox']); // Start with 1 found

  // 2.5D Room Tilt on Mouse Movement
  if (atticRoom) {
    const handleTilt = (clientX, clientY) => {
      const rect = atticRoom.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / centerY) * 11;
      const rotateY = ((x - centerX) / centerX) * 13;

      atticRoom.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    atticRoom.addEventListener('mousemove', (e) => handleTilt(e.clientX, e.clientY));
    atticRoom.addEventListener('mouseleave', () => {
      atticRoom.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    });
  }

  function markRelicFound(key, dotIndex) {
    foundRelics.add(key);
    if (relicsCountEl) relicsCountEl.innerText = foundRelics.size.toString();
    const dot = document.getElementById(`dot-${dotIndex}`);
    if (dot) dot.classList.add('found');
  }

  // Object 1: Music Box
  const objMusicbox = document.getElementById('obj-musicbox');
  if (objMusicbox) {
    objMusicbox.addEventListener('click', () => {
      markRelicFound('musicbox', 0);
      relicTitle.innerText = 'The Golden Music Box';
      relicDesc.innerText = 'Wind the clockwork key to weave harmonious silver lullabies for tired little cherubs.';
      relicBtnText.innerText = 'Wind the Key';
      ribbonPickerWrap.style.display = 'none';
      sound.playWindingTick();
    });
  }

  // Object 2: Dream Lantern
  const objLantern = document.getElementById('obj-lantern');
  if (objLantern) {
    objLantern.addEventListener('click', () => {
      markRelicFound('lantern', 1);
      relicTitle.innerText = 'The Brass Dream Lantern';
      relicDesc.innerText = 'Six lamps for six kinds of peaceful dreams. Casts a warm amber aura against the deep night.';
      relicBtnText.innerText = 'Turn Lantern Glow On';
      ribbonPickerWrap.style.display = 'none';
      sound.playChime(659, 1.0);
    });
  }

  // Object 3: Cloud Cradle Bed
  const objBed = document.getElementById('obj-bed');
  if (objBed) {
    objBed.addEventListener('click', () => {
      markRelicFound('bed', 2);
      relicTitle.innerText = 'Pip\'s Cloud Cradle';
      relicDesc.innerText = 'A feather-soft nest where Pip tucks in when the stars finish their rounds.';
      relicBtnText.innerText = 'Tuck Pip In';
      ribbonPickerWrap.style.display = 'none';
      sound.playChime(523, 1.2);
    });
  }

  // Object 4: Rattle Blocks
  const rattleCubes = document.querySelectorAll('.rattle-cube');
  rattleCubes.forEach(cube => {
    cube.addEventListener('click', (e) => {
      e.stopPropagation();
      markRelicFound('blocks', 3);
      const noteIdx = parseInt(cube.dataset.note, 10);
      sound.playPluckString(noteIdx);
      relicTitle.innerText = 'Playable Rattle-Blocks';
      relicDesc.innerText = 'Strike each block to hear its merry pentatonic chime! Perfect for crafting midnight melodies.';
      relicBtnText.innerText = 'Play Chime Melody';
      ribbonPickerWrap.style.display = 'none';
    });
  });

  // Object 5: Ribbon Dress-Up Bench
  const objRibbon = document.getElementById('obj-ribbon');
  if (objRibbon) {
    objRibbon.addEventListener('click', () => {
      markRelicFound('ribbon', 4);
      relicTitle.innerText = 'Ribbon Dress-Up Bench';
      relicDesc.innerText = 'Tied with a rosy bow upon Pip\'s crown. Pick your favorite starlight silk hue below!';
      relicBtnText.innerText = 'Sparkle Bow';
      ribbonPickerWrap.style.display = 'block';
      sound.playChime(880, 0.6);
    });
  }

  // Action Button in Attic Detail Card
  if (btnRelicAction) {
    btnRelicAction.addEventListener('click', () => {
      sound.playWindingTick();
      sound.playMusicBoxSequence(() => {
        sound.playChime(1046, 1.5);
      });
    });
  }

  // Swatch Buttons for Bow Color
  const swatchBtns = document.querySelectorAll('.swatch-btn');
  swatchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      sound.playChime(784, 0.5);
      if (objRibbon) objRibbon.style.filter = `drop-shadow(0 0 14px ${color})`;
      if (pipAvatarImg) pipAvatarImg.style.filter = `drop-shadow(0 18px 24px ${color}88)`;
    });
  });

  // =========================================================================
  // 6. TAB 4: POP-UP STORYBOOK CHAPTERS
  // =========================================================================
  const chapters = [
    {
      act: 'Act I: Prologue',
      title: 'Of Bone Most Bright & Slumber Soft',
      body: `Hark! Softly tread where velvet clouds do rock,<br>
             Nor wake the tiniest watchman of the clock.<br>
             Behold young Pip: no spectre grim nor cold,<br>
             But ivory cherub cast in gentlest mold!<br><br>
             Beneath a starry cap and ribbon pink,<br>
             This clumsy babe doth giggle, yawn, and blink.<br>
             The Junior Engineer of Midnight's art,<br>
             Who builds the dreams where weary minds depart.`
    },
    {
      act: 'Act II: The Origin',
      title: 'How Falling Star Did Crown the Crib',
      body: `Ere moonbeams learned to latch the nursery pane,<br>
             And little ghosts cried out in waking pain,<br>
             A shooting star slipped through the milky height<br>
             And tumbled laughing into swaddled white.<br><br>
             With rattle-wrench and blueprint drawn in chalk,<br>
             Long ere those tiny bone-white feet could walk,<br>
             The Midnight Nursery named the babe its own—<br>
             Chief Architect of Slumber's Cozy Throne.`
    },
    {
      act: 'Act III: The Craft I',
      title: 'The Lullaby Engine & Lantern Vault',
      body: `Come wind the golden key within the hall,<br>
             Where pastel chimes in measured cadence fall!<br>
             First, The Lullaby Lab: a music-chest<br>
             That weaves harmonic threads of silver rest.<br><br>
             Next, mark The Nightlight Vault, where porcelain moons<br>
             Outshine the gloom of midnight's heavy noons;<br>
             Each brass-bound lantern holds a drowsy gleam<br>
             To light a monster's path into a dream.`
    },
    {
      act: 'Act IV: The Craft II',
      title: 'Rooftop Voyages & Rattle-Blocks',
      body: `Now chart The Dream Delivery Route on high,<br>
             Where Pip upon a billowy cloud doth fly!<br>
             Across the gabled roofs and chimneys steep,<br>
             The clumsy courier drops parcels of sleep.<br><br>
             And strewn beside the cloud-bank, bright and bold,<br>
             Lie Rattle-Blocks of berry, cream, and gold:<br>
             Strike any cube to hear its merry clack,<br>
             Or pile the tumbling alphabet a-stack!`
    },
    {
      act: 'Act V: Epilogue',
      title: 'The Nursery Wall & Scroll of Wishes',
      body: `Upon Pip's Growth Chart etched in nursery pine,<br>
             Each inch marks craft in slumber's sweet design:<br>
             From 'Drops the Wrench' at twenty inches tall,<br>
             To 'Master Weaver of the Starry Hall!'<br><br>
             Now ere the cockcrow breaks the eastern skies,<br>
             And amber pinpricks close their sleepy eyes,<br>
             Inscribe a dream upon the Guestbook Wall,<br>
             And watch the Odometer of Slumber crawl.`
    }
  ];

  let currentChapter = 0;
  const storyActTag = document.getElementById('story-act-tag');
  const storyChapterTitle = document.getElementById('story-chapter-title');
  const storyBody = document.getElementById('story-body');
  const storyPrevBtn = document.getElementById('story-prev-btn');
  const storyNextBtn = document.getElementById('story-next-btn');
  const storyDots = document.querySelectorAll('.chapter-dot');
  const storyExtraAction = document.getElementById('story-extra-action');
  const storyLanternBtn = document.getElementById('story-lantern-btn');

  function renderChapter(idx) {
    currentChapter = Math.max(0, Math.min(chapters.length - 1, idx));
    const ch = chapters[currentChapter];

    if (storyActTag) storyActTag.innerText = ch.act;
    if (storyChapterTitle) storyChapterTitle.innerText = ch.title;
    if (storyBody) storyBody.innerHTML = ch.body;

    storyDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentChapter);
    });

    if (storyExtraAction) {
      storyExtraAction.style.display = currentChapter === 4 ? 'block' : 'none';
    }

    sound.playChime(523 + currentChapter * 65, 0.4);
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

  storyDots.forEach(dot => {
    dot.addEventListener('click', () => {
      renderChapter(parseInt(dot.dataset.chapter, 10));
    });
  });

  if (storyLanternBtn) {
    storyLanternBtn.addEventListener('click', () => {
      sound.playChime(1046, 2.0);
      document.body.style.background = 'radial-gradient(circle at 50% 50%, #ffeaa7 0%, #fab1a0 45%, #2d3436 100%)';
      storyLanternBtn.innerText = '✨ Radiant Dawn Awoken!';
      setTimeout(() => {
        document.body.style.background = '';
      }, 4000);
    });
  }

  // =========================================================================
  // 7. TAB 5: CELESTIAL GUESTBOOK & WISHES
  // =========================================================================
  const wishForm = document.getElementById('wish-form');
  const wishAuthor = document.getElementById('wish-author');
  const wishContent = document.getElementById('wish-content');
  const wishesFeed = document.getElementById('wishes-feed');
  const wishesCountBadge = document.getElementById('wishes-count-badge');
  const slumberOdometer = document.getElementById('slumber-odometer');

  const defaultWishes = [
    {
      author: 'Nora & Little Bramble',
      time: '12m ago',
      content: 'May all the sweet, gentle bedtime dreams find their way to tired little pillows tonight. Pip\'s lantern guided us!'
    },
    {
      author: 'Starlight Courier',
      time: '34m ago',
      content: 'Wound the golden music box twice and heard the celestial chimes. The whole nursery is peaceful.'
    },
    {
      author: 'Caspian the Dreamer',
      time: '1h ago',
      content: 'Wished for soft wings to fly over the gabled Victorian roofs just like Pip!'
    },
    {
      author: 'Midnight Watchman',
      time: '2h ago',
      content: 'Guarding the slumber realm with 0% silence and 100% cozy giggles.'
    }
  ];

  let storedWishes = JSON.parse(localStorage.getItem('pip_user_wishes') || '[]');
  let allWishes = [...storedWishes, ...defaultWishes];

  function renderWishes() {
    if (!wishesFeed) return;
    wishesFeed.innerHTML = '';
    allWishes.forEach(w => {
      const card = document.createElement('div');
      card.className = 'wish-card';
      card.innerHTML = `
        <div class="wish-header">
          <span class="wish-author">✦ ${escapeHtml(w.author)}</span>
          <span class="wish-time">${w.time}</span>
        </div>
        <p class="wish-text">"${escapeHtml(w.content)}"</p>
      `;
      wishesFeed.appendChild(card);
    });

    if (wishesCountBadge) wishesCountBadge.innerText = `${allWishes.length} wishes`;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  if (wishForm) {
    wishForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const author = wishAuthor.value.trim();
      const content = wishContent.value.trim();
      if (!author || !content) return;

      const newWish = {
        author: author,
        time: 'Just now',
        content: content
      };

      storedWishes.unshift(newWish);
      localStorage.setItem('pip_user_wishes', JSON.stringify(storedWishes));
      allWishes = [newWish, ...allWishes];

      renderWishes();
      wishAuthor.value = '';
      wishContent.value = '';

      sound.playChime(880, 0.8);
      sound.playStarPickup();

      // Bump odometer
      if (slumberOdometer) {
        slumberOdometer.innerText = '0 0 1 , 4 8 3';
      }
    });
  }

  // =========================================================================
  // EASTER EGG (500 STARDUST MILESTONE SURPRISE & REWARD CARD)
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

  function showEasterEggModal() {
    if (!eggOverlay || !eggPod || !rewardCard || !eggElement) return;
    isHatching = false;
    sound.playEasterEggAppear();

    eggOverlay.style.display = 'flex';
    eggPod.style.display = 'flex';
    rewardCard.style.display = 'none';
    eggElement.classList.remove('cracking');
  }

  function hatchEasterEgg() {
    if (isHatching || !eggElement || !eggPod || !rewardCard) return;
    isHatching = true;
    sound.playEggTremor();
    eggElement.classList.add('cracking');

    setTimeout(() => {
      sound.playEggBurst();
      eggPod.style.display = 'none';
      rewardCard.style.display = 'flex';
    }, 380);
  }

  if (eggElement) {
    eggElement.addEventListener('click', hatchEasterEgg);
  }

  if (btnEggClose) {
    btnEggClose.addEventListener('click', () => {
      sound.playClick(520);
      if (eggOverlay) eggOverlay.style.display = 'none';
      if (gameInstance) gameInstance.resume();
    });
  }

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
      if (pipDialogue) {
        pipDialogue.innerText = '"Wowie! Congratulations, Co-Architect of Slumber! You gathered 500 stars and unlocked our Golden Blueprint!"';
      }
    });
  }

  if (btnEggLullaby) {
    btnEggLullaby.addEventListener('click', () => {
      sound.playSecretLullaby();
    });
  }

  window.addEventListener('pip:easter-egg-unlocked', () => {
    showEasterEggModal();
  });

  window.triggerPipEasterEgg = () => {
    if (!gameInstance) switchTab('delivery');
    if (gameInstance) {
      if (gameInstance.state !== 'running') gameInstance.start();
      gameInstance.score = 500;
      gameInstance.triggerEasterEgg();
    } else {
      showEasterEggModal();
    }
  };

  renderWishes();

});
