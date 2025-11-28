/* HackerCraft Engine v2.0 — MC-Inspired Portfolio */
(() => {
  const state = {
    achievements: JSON.parse(localStorage.getItem('hackerAchievements')) || new Set(),
    inventory: JSON.parse(localStorage.getItem('hackerInventory')) || [],
    xp: parseInt(localStorage.getItem('hackerXP')) || 60,
    health: 20, // 10 hearts
    sounds: {},
    keys: {}
  };

  const SOUNDS = {
    click: 'assets/click.ogg',
    xp: 'assets/xp.ogg',
    break: 'assets/break.ogg',
    portal: 'assets/portal.ogg',
    inventory: 'assets/inventory.ogg',
    achievement: 'assets/achievement.ogg'
  };

  // Sound Engine (Web Audio)
  const SoundEngine = {
    ctx: new (window.AudioContext || window.webkitAudioContext)(),
    async load() {
      for (let [name, url] of Object.entries(SOUNDS)) {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        this.sounds[name] = await this.ctx.decodeAudioData(buf);
      }
    },
    play(name, vol = 0.5) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.sounds[name];
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(gain).connect(this.ctx.destination);
      src.start();
    }
  };

  // GSAP Setup
  gsap.registerPlugin(ScrollTrigger, Flip, Observer, ScrollToPlugin, EasePack);
  window.HackerCraft = { gsap };

  // Init GSAP
  function initGSAP() {
    // Panorama Parallax
    gsap.to('.panorama-layer', { xPercent: -50, rotationY: 360, duration: 60, repeat: -1, ease: 'none' });

    // ScrollTrigger for Biomes
    gsap.utils.toArray('.biome').forEach((biome, i) => {
      ScrollTrigger.create({
        trigger: biome,
        start: 'top 80%',
        onEnter: () => gsap.from(biome, { y: 50, opacity: 0, duration: 1, ease: 'back.out' })
      });
    });

    // Hotbar Flip Anim
    const hotbar = document.getElementById('hotbar');
    [...hotbar.children].forEach((slot, i) => {
      slot.addEventListener('click', () => {
        const state = Flip.getState(slot);
        slot.classList.toggle('active');
        Flip.from(state, { duration: 0.3, ease: 'power2.out' });
        document.querySelector(`#${slot.dataset.section || 'spawn'}`).scrollIntoView({ behavior: 'smooth' });
        SoundEngine.play('click');
      });
    });

    // Title Transition
    document.getElementById('btnSingleplayer').addEventListener('click', () => {
      gsap.to('#titleScreen', { opacity: 0, scale: 0.9, duration: 1, onComplete: () => {
        document.getElementById('titleScreen').style.display = 'none';
        document.getElementById('gameShell').style.display = 'block';
        gsap.from('#gameShell', { opacity: 0, scale: 1.1, duration: 1, ease: 'back.out' });
        startGame();
      }});
    });
  }

  // Game Start
  async function startGame() {
    await SoundEngine.load();
    populateHotbar();
    updateHUD();
    setupMiniGames();
    setupInventory();
    setupAchievements();
    setupCrafting();
    Observer.create({ target: window, type: 'wheel,touch,pointer', onDown: () => document.getElementById('pauseMenu').style.display = 'flex' }); // ESC sim
    SoundEngine.play('portal');
  }

  // HUD Update
  function updateHUD() {
    document.getElementById('xpFill').style.width = (state.xp / 100 * 100) + '%';
    document.getElementById('xpLevel').textContent = Math.floor(state.xp / 10);
    const hearts = document.getElementById('hearts');
    hearts.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart ' + (state.health > i * 2 ? 'full' : state.health > i * 2 - 1 ? 'half' : 'empty');
      hearts.appendChild(heart);
    }
    localStorage.setItem('hackerXP', state.xp);
  }

  // Hotbar (9 Slots)
  function populateHotbar() {
    const hotbar = document.getElementById('hotbar');
    const sections = ['spawn', 'skills', 'projects', 'nether', 'contact', 'end', 'achievements', 'inventory', 'crafting'];
    hotbar.innerHTML = sections.map(sec => `<div class="slot ${sec === 'spawn' ? 'active' : ''}" data-section="${sec}">⛏️</div>`).join('');
  }

  // Block Breaker Mini-Game
  function setupBlockBreaker() {
    const grid = document.getElementById('blockBreaker');
    const facts = ['M.Sc Physics — Ultrasonic Research', 'Certified Pen Tester — RedTeam Hacker', 'AI Vuln Scanner Builder', 'OWASP Framework Dev', 'Purple Team Analytics', 'Full-Stack: Python/JS/Go'];
    for (let i = 0; i < 64; i++) { // 8x8 grid
      const block = document.createElement('div');
      block.className = 'block';
      block.textContent = '🪨';
      block.addEventListener('click', () => {
        if (block.classList.contains('broken')) return;
        block.classList.add('broken');
        gsap.to(block, { scale: 0.5, opacity: 0.5, duration: 0.3, yoyo: true, repeat: 1 });
        SoundEngine.play('break');
        setTimeout(() => {
          block.textContent = '💎';
          const fact = facts[Math.floor(Math.random() * facts.length)];
          HackerCraft.showToast('Fact Unlocked', fact);
          state.xp += 5; updateHUD();
          awardAchievement('miner', 'Stone Age', 'Broke your first block.');
        }, 300);
      });
      grid.appendChild(block);
    }
  }

  // Parkour Mini-Game (Physics)
  function setupParkour() {
    const arena = document.getElementById('parkourArena');
    arena.innerHTML = '<div id="player" class="player"></div>'; // Platforms via CSS positions
    const player = { x: 0, y: 280, vx: 0, vy: 0, speed: 3, jump: -8, gravity: 0.5 };
    const platforms = [{x: 100, y: 250, w: 80, h: 10}, {x: 200, y: 200, w: 80, h: 10}]; // Add more

    function loop() {
      if (state.keys['a']) player.vx = -player.speed;
      if (state.keys['d']) player.vx = player.speed;
      if ((state.keys['w'] || state.keys[' ']) && player.onGround) { player.vy = player.jump; player.onGround = false; }
      player.vy += player.gravity;
      player.x += player.vx;
      player.y += player.vy;
      player.vx *= 0.8; // Friction

      // Collisions
      player.onGround = platforms.some(p => player.y + 20 >= p.y && player.y <= p.y + p.h && player.x + 20 > p.x && player.x < p.x + p.w);
      if (player.onGround) player.vy = 0;

      document.getElementById('player').style.left = player.x + 'px';
      document.getElementById('player').style.top = player.y + 'px';

      if (player.x > 400) { state.xp += 15; updateHUD(); awardAchievement('parkour', 'Leap of Faith', 'Completed parkour.'); }
      requestAnimationFrame(loop);
    }
    window.addEventListener('keydown', e => state.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => state.keys[e.key.toLowerCase()] = false);
    loop();
  }

  // Crafting Simulator
  const RECIPES = {
    resume: { inputs: [['wood', 'wood', null], ['iron', 'paper', null], [null, null, null]], output: 'Resume.pdf' },
    project: { inputs: [['code', 'code', null], ['bug', 'fix', null], [null, null, null]], output: 'Project Card' },
    badge: { inputs: [['skill', 'xp', null], ['null', 'null', null], [null, null, null]], output: 'Skill Badge' }
  };

  function setupCrafting() {
    const grid = document.getElementById('craftingGrid');
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'craft-slot';
      slot.dataset.index = i;
      slot.addEventListener('click', () => placeItem(slot)); // Drag-drop sim via click
      grid.appendChild(slot);
    }
    // Check on place
    function checkCraft() {
      const slots = [...grid.children].map(s => s.dataset.item || null);
      for (let [name, recipe] of Object.entries(RECIPES)) {
        if (matchesRecipe(slots, recipe.inputs)) {
          document.getElementById('outputSlot').dataset.output = name;
          gsap.from('#outputSlot', { scale: 0, duration: 0.5 });
          SoundEngine.play('click');
          return;
        }
      }
    }
  }

  function matchesRecipe(slots, recipe) {
    // Flatten and compare logic
    return recipe.flat().every((r, i) => r === null || slots[i] === r);
  }

  // Inventory (MC Style)
  function setupInventory() {
    const grid = document.getElementById('invGrid');
    for (let i = 0; i < 36; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.addEventListener('mouseenter', () => showLore(slot.dataset.lore));
      grid.appendChild(slot);
    }
    // Populate with demo items
    state.inventory.forEach((item, i) => grid.children[i].dataset.item = item.name);
  }

  // Achievements
  function setupAchievements() {
    const tree = document.getElementById('achTree');
    const treeData = [
      { id: 'miner', title: 'Stone Age', desc: 'Break a block', unlocked: state.achievements.has('miner') },
      { id: 'parkour', title: 'Leap of Faith', desc: 'Complete parkour', unlocked: state.achievements.has('parkour') }
      // Add more branches
    ];
    tree.innerHTML = treeData.map(ach => `<div class="ach-node ${ach.unlocked ? 'unlocked' : ''}">${ach.title}: ${ach.desc}</div>`).join('');
  }

  function awardAchievement(id, title, desc) {
    if (state.achievements.has(id)) return;
    state.achievements.add(id);
    localStorage.setItem('hackerAchievements', JSON.stringify([...state.achievements]));
    showToast(title, desc);
    SoundEngine.play('achievement');
    setupAchievements(); // Refresh tree
  }

  function showToast(title, desc) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<strong>${title}</strong><br>${desc}`;
    document.getElementById('toastContainer').appendChild(toast);
    gsap.fromTo(toast, { x: 100 }, { x: 0, duration: 0.5, onComplete: () => gsap.to(toast, { x: 100, delay: 3, duration: 0.5, onComplete: () => toast.remove() }) });
  }

  // Utils
  window.HackerCraft = {
    openInventory: () => document.getElementById('inventoryModal').style.display = 'flex',
    openAchievements: () => document.getElementById('achievementsModal').style.display = 'flex',
    saveGame: () => localStorage.setItem('hackerInventory', JSON.stringify(state.inventory)),
    startParkour: setupParkour,
    showToast
  };

  // Init
  function init() {
    initGSAP();
    setupBlockBreaker();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('pauseMenu').style.display = 'flex'; });
    document.querySelectorAll('.mc-btn.close').forEach(btn => btn.addEventListener('click', () => btn.closest('.mc-pixel').style.display = 'none'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
