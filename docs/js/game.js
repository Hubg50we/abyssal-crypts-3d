/**
 * The Abyssal Crypts 3D - Core Game Engine (2026 Modernized)
 * Smooth continuous 3D physics & wall sliding, real-time action combat,
 * intelligent monster AI, floating 3D combat popups, abilities, inventory, and HUD.
 */

class GameEngine {
  constructor() {
    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.gameState = 'TITLE'; // TITLE, PLAYING, GAMEOVER, VICTORY
    this.turn = 1;
    this.kills = 0;
    this.score = 0;

    this.player = null;
    this.combatLog = [];

    // Real-Time Keyboard Input State
    this.keysDown = new Set();

    // Step audio throttle timer
    this.stepAudioTimer = 0;

    // Control mode: 'STRAFE' (A/D strafes) or 'TURN' (A/D turns)
    this.controlMode = 'STRAFE';

    this.initEventListeners();
  }

  // --- Hero Class Setup ---

  selectClass(heroClass) {
    const baseStats = {
      Warrior: {
        hp: 120, max_hp: 120, mana: 60, max_mana: 60, atk: 15, def: 5, crit: 10, dodge: 6, speed: 4.8,
        weapon: { name: 'Tempered Broadsword', atk_bonus: 5, icon: 'sword', desc: 'Heavy razor-edged blade' },
        armor: { name: 'Chainmail Coat', def_bonus: 4, icon: 'armor', desc: 'Riveted iron rings' },
        relic: null,
        abilities: [
          { id: 'cleave', name: 'Whirlwind [Q]', cost: 18, desc: '360° cleave hitting all adjacent foes for 150% ATK' },
          { id: 'bash', name: 'Shield Bash [E]', cost: 14, desc: 'Stuns target in front, deals 140% ATK with heavy knockback' }
        ]
      },
      Mage: {
        hp: 85, max_hp: 85, mana: 120, max_mana: 120, atk: 12, def: 2, crit: 14, dodge: 8, speed: 4.6,
        weapon: { name: 'Arcane Focus Staff', atk_bonus: 6, mana_bonus: 20, icon: 'staff', desc: 'Quartz-topped hardwood' },
        armor: { name: 'Runic Robe', def_bonus: 2, icon: 'cloak', desc: 'Woven with warding runes' },
        relic: null,
        abilities: [
          { id: 'missile', name: 'Arcane Bolt [Q]', cost: 12, desc: 'Launches glowing homing projectile seeking nearest enemy' },
          { id: 'meteor', name: 'Meteor Blast [E]', cost: 30, desc: 'Calls down fiery explosion dealing 220% AoE damage' },
          { id: 'blink', name: 'Astral Shift [R]', cost: 18, desc: 'Instantly teleports forward 5 units through obstacles' }
        ]
      },
      Rogue: {
        hp: 95, max_hp: 95, mana: 80, max_mana: 80, atk: 13, def: 3, crit: 28, dodge: 22, speed: 5.4,
        weapon: { name: 'Daggers of Night', atk_bonus: 5, crit_bonus: 14, icon: 'dagger', desc: 'Twin stealth blades' },
        armor: { name: 'Shadow Brigandine', def_bonus: 3, dodge_bonus: 10, icon: 'cloak', desc: 'Silent leather armor' },
        relic: null,
        abilities: [
          { id: 'shadow_strike', name: 'Shadow Dash [Q]', cost: 18, desc: 'Rapid forward strike with 200% lethal Critical strike' },
          { id: 'poison_dart', name: 'Poison Dart [E]', cost: 15, desc: 'Throws toxic dart dealing immediate and lingering poison' }
        ]
      }
    };

    const cfg = baseStats[heroClass] || baseStats.Warrior;

    this.player = {
      name: heroClass,
      classType: heroClass,
      level: 1,
      xp: 0,
      next_xp: 50,
      hp: cfg.hp,
      max_hp: cfg.max_hp,
      mana: cfg.mana,
      max_mana: cfg.max_mana,
      base_atk: cfg.atk,
      base_def: cfg.def,
      crit: cfg.crit,
      dodge: cfg.dodge,
      speed: cfg.speed,
      gold: 50,
      keys: 1,
      weapon: cfg.weapon,
      armor: cfg.armor,
      relic: cfg.relic,
      abilities: cfg.abilities,
      inventory: [
        { id: 'pot_1', type: 'potion_health', name: 'Health Potion', heal: 45, icon: 'potion_red', desc: 'Restores 45 HP' },
        { id: 'pot_2', type: 'potion_mana', name: 'Mana Draught', mana: 40, icon: 'potion_blue', desc: 'Restores 40 Mana' },
        { id: 'scr_1', type: 'scroll_fireball', name: 'Scroll of Hellfire', damage: 60, icon: 'scroll_fire', desc: 'Incinerates foes in fiery blast' }
      ],
      // Continuous 3D world position
      worldX: 0,
      worldZ: 0,
      x: 0,
      y: 0,
      angle: 0, // facing in radians
      radius: 0.42, // collision sphere radius
      attackCooldown: 0
    };

    if (window.engine3D) {
      window.engine3D.updateHeroClassStyle(heroClass);
    }

    this.startGame();
  }

  async startGame() {
    this.gameState = 'PLAYING';
    this.turn = 1;
    this.kills = 0;
    this.score = 0;
    this.combatLog = [];

    const titleOverlay = document.getElementById('titleModal');
    if (titleOverlay) titleOverlay.close();

    this.addLog(`Welcome, ${this.player.classType}! Delving into the 3D Abyssal Crypts...`, 'gold');

    await this.loadFloor(1);

    if (window.gameAudio) {
      window.gameAudio.init();
      window.gameAudio.startAmbientBGM();
    }
  }

  async loadFloor(floorNum) {
    this.addLog(`=== Descended to 3D Floor ${floorNum} ===`, 'cyan');
    this.stairsModalOpen = false;

    const dungeonData = await window.dungeonManager.loadFloor(floorNum);

    if (window.engine3D) {
      window.engine3D.buildDungeon(dungeonData);
    }

    if (this.player) {
      const u = window.engine3D ? window.engine3D.unitSize : 2.0;
      this.player.x = window.dungeonManager.spawn.x;
      this.player.y = window.dungeonManager.spawn.y;
      this.player.worldX = this.player.x * u;
      this.player.worldZ = this.player.y * u;
      this.player.angle = 0; // Face North (negative Z)

      window.dungeonManager.computeFOV(this.player.x, this.player.y);

      if (window.engine3D) {
        window.engine3D.playerPos.set(this.player.worldX, 0, this.player.worldZ);
        window.engine3D.playerAngle = this.player.angle;
        window.engine3D.syncEntities(window.dungeonManager.monsters, window.dungeonManager.items);
      }
    }

    // Initialize real-time monster positions
    const u = window.engine3D ? window.engine3D.unitSize : 2.0;
    for (let idx = 0; idx < window.dungeonManager.monsters.length; idx++) {
      const m = window.dungeonManager.monsters[idx];
      if (!m.id) m.id = `m_${idx}_${Date.now()}`;
      if (typeof m.max_hp !== 'number' || m.max_hp <= 0) m.max_hp = m.hp || 20;
      m.worldX = m.x * u;
      m.worldZ = m.y * u;
      m.speed = m.boss ? 1.6 : (1.8 + Math.random() * 0.4);
      m.attackCooldown = Math.random() * 1.0;
      m.state = 'IDLE';
    }

    this.updateHUD();
    this.renderMinimap();
    if (window.modernMap) window.modernMap.updateStats();
  }

  // --- Real-Time Game Loop (Called every frame from engine3d.render) ---

  update(dt) {
    if (this.gameState !== 'PLAYING' || !this.player) return;

    const u = window.engine3D ? window.engine3D.unitSize : 2.0;

    // 1. Process Continuous WASD Movement with Wall Sliding Physics
    this.handlePlayerMovement(dt, u);

    // 2. Decrement Player Attack Cooldown
    if (this.player.attackCooldown > 0) {
      this.player.attackCooldown -= dt;
    }

    // 3. Passive Mana Regen (2 MP/sec)
    if (this.player.mana < this.player.max_mana) {
      this.player.mana = Math.min(this.player.max_mana, this.player.mana + dt * 2.5);
      const manaBar = document.getElementById('manaFill');
      const manaText = document.getElementById('manaText');
      if (manaBar) manaBar.style.width = `${(this.player.mana / this.player.max_mana) * 100}%`;
      if (manaText) manaText.textContent = `${Math.round(this.player.mana)} / ${this.player.max_mana}`;
    }

    // 4. Update Real-Time Monster AI
    this.updateMonsters(dt, u);

    // 5. Check Ground Items & Stairs Triggers
    this.checkCollisionsAndPickups(u);

    // 6. Update Modern Radar & Minimap
    this.renderMinimap();
    if (window.modernMap) window.modernMap.update(dt);
  }

  handlePlayerMovement(dt, u) {
    let inputX = 0;
    let inputZ = 0;

    const isTurnMode = (this.controlMode === 'TURN');
    const viewMode = window.engine3D ? window.engine3D.viewMode : 'ACTION_RPG';

    // Forward / Back (W / S / Up / Down)
    if (this.keysDown.has('w') || this.keysDown.has('W') || this.keysDown.has('ArrowUp')) {
      inputZ -= 1;
    }
    if (this.keysDown.has('s') || this.keysDown.has('S') || this.keysDown.has('ArrowDown')) {
      inputZ += 1;
    }

    if (viewMode === 'ACTION_RPG') {
      // In Isometric Action RPG View:
      // A / Left -> Move Left (-X)
      // D / Right -> Move Right (+X)
      if (this.keysDown.has('a') || this.keysDown.has('A') || this.keysDown.has('ArrowLeft')) {
        inputX -= 1;
      }
      if (this.keysDown.has('d') || this.keysDown.has('D') || this.keysDown.has('ArrowRight')) {
        inputX += 1;
      }
    } else {
      // In Over-Shoulder or First-Person View:
      if (isTurnMode) {
        // TURN MODE:
        // A / ArrowLeft -> Turn Left smoothly (increasing angle)
        // D / ArrowRight -> Turn Right smoothly (decreasing angle)
        // Q -> Strafe Left
        // E -> Strafe Right
        if (this.keysDown.has('a') || this.keysDown.has('A') || this.keysDown.has('ArrowLeft')) {
          this.player.angle += dt * 3.2;
        }
        if (this.keysDown.has('d') || this.keysDown.has('D') || this.keysDown.has('ArrowRight')) {
          this.player.angle -= dt * 3.2;
        }
        if (this.keysDown.has('q') || this.keysDown.has('Q')) {
          inputX -= 1;
        }
        if (this.keysDown.has('e') || this.keysDown.has('E')) {
          inputX += 1;
        }
      } else {
        // STRAFE MODE (Standard modern FPS / Action):
        // A -> Strafe Left
        // D -> Strafe Right
        // Q / ArrowLeft -> Turn Left smoothly
        // E / ArrowRight -> Turn Right smoothly
        if (this.keysDown.has('a') || this.keysDown.has('A')) {
          inputX -= 1;
        }
        if (this.keysDown.has('d') || this.keysDown.has('D')) {
          inputX += 1;
        }
        if (this.keysDown.has('q') || this.keysDown.has('Q') || this.keysDown.has('ArrowLeft')) {
          this.player.angle += dt * 3.2;
        }
        if (this.keysDown.has('e') || this.keysDown.has('E') || this.keysDown.has('ArrowRight')) {
          this.player.angle -= dt * 3.2;
        }
      }
    }

    const isMoving = (inputX !== 0 || inputZ !== 0);

    if (isMoving) {
      // Normalize input vector
      const len = Math.hypot(inputX, inputZ);
      const normX = inputX / len;
      const normZ = inputZ / len;

      let moveDx = 0;
      let moveDz = 0;

      if (viewMode === 'ACTION_RPG') {
        // Intuitive Isometric Movement:
        // W = moves forward/up (-Z), S = back/down (+Z), A = left (-X), D = right (+X)
        moveDx = normX * this.player.speed * dt;
        moveDz = normZ * this.player.speed * dt;

        // Smoothly rotate hero to face movement direction
        // When moving right (+X): targetAngle = -PI/2 (turns hero right)
        // When moving left (-X): targetAngle = +PI/2 (turns hero left)
        // When moving up (-Z): targetAngle = 0 (faces North)
        // When moving down (+Z): targetAngle = PI (faces South)
        const targetAngle = Math.atan2(-normX, -normZ);
        let diff = targetAngle - this.player.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.player.angle += diff * Math.min(1.0, dt * 14);
      } else {
        // Camera-Relative Movement (Over-Shoulder / 1st Person)
        // Forward vector into screen along negative Z:
        const forwardX = -Math.sin(this.player.angle);
        const forwardZ = -Math.cos(this.player.angle);
        // Right vector along screen right:
        const rightX = Math.cos(this.player.angle);
        const rightZ = -Math.sin(this.player.angle);

        // normZ = -1 for 'W' (Forward), +1 for 'S' (Back)
        // normX = -1 for 'A' (Strafe Left), +1 for 'D' (Strafe Right)
        moveDx = (forwardX * (-normZ) + rightX * normX) * this.player.speed * dt;
        moveDz = (forwardZ * (-normZ) + rightZ * normX) * this.player.speed * dt;
      }

      // Smooth Wall Collision with Wall Sliding (Separate X and Z checks)
      const nextX = this.player.worldX + moveDx;
      if (!this.checkWallCollision(nextX, this.player.worldZ, this.player.radius, u)) {
        this.player.worldX = nextX;
      }

      const nextZ = this.player.worldZ + moveDz;
      if (!this.checkWallCollision(this.player.worldX, nextZ, this.player.radius, u)) {
        this.player.worldZ = nextZ;
      }

      // Check Closed Doors along the way and open them
      this.checkAutoOpenDoors(u);

      // Footstep sound throttle
      this.stepAudioTimer += dt;
      if (this.stepAudioTimer > 0.32) {
        this.stepAudioTimer = 0;
        if (window.gameAudio) window.gameAudio.playStep();
      }

      if (window.engine3D) {
        window.engine3D.isMoving = true;
      }
    } else {
      if (window.engine3D) {
        window.engine3D.isMoving = false;
      }
    }

    // Sync positions with Three.js engine
    if (window.engine3D) {
      window.engine3D.playerPos.set(this.player.worldX, 0, this.player.worldZ);
      window.engine3D.playerAngle = this.player.angle;
    }

    // Update grid position & recalculate FOV
    const newGx = Math.round(this.player.worldX / u);
    const newGy = Math.round(this.player.worldZ / u);

    if (newGx !== this.player.x || newGy !== this.player.y) {
      this.player.x = newGx;
      this.player.y = newGy;
      window.dungeonManager.computeFOV(this.player.x, this.player.y);
      if (window.modernMap) window.modernMap.updateStats();
    }
  }

  checkWallCollision(wx, wz, radius, u) {
    // Check surrounding grid tiles
    const minGx = Math.floor((wx - radius) / u);
    const maxGx = Math.floor((wx + radius) / u);
    const minGy = Math.floor((wz - radius) / u);
    const maxGy = Math.floor((wz + radius) / u);

    for (let gy = minGy; gy <= maxGy; gy++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        if (!window.dungeonManager.isWalkable(gx, gy)) {
          // AABB of solid tile
          const tileMinX = gx * u - u / 2;
          const tileMaxX = gx * u + u / 2;
          const tileMinZ = gy * u - u / 2;
          const tileMaxZ = gy * u + u / 2;

          // Closest point on AABB to circle center
          const closestX = Math.max(tileMinX, Math.min(wx, tileMaxX));
          const closestZ = Math.max(tileMinZ, Math.min(wz, tileMaxZ));

          const distSq = (wx - closestX) ** 2 + (wz - closestZ) ** 2;
          if (distSq < radius * radius) {
            return true; // Collision detected!
          }
        }
      }
    }
    return false;
  }

  checkAutoOpenDoors(u) {
    const gx = Math.round(this.player.worldX / u);
    const gy = Math.round(this.player.worldZ / u);

    const neighbors = [
      { x: gx, y: gy },
      { x: gx + 1, y: gy },
      { x: gx - 1, y: gy },
      { x: gx, y: gy + 1 },
      { x: gx, y: gy - 1 }
    ];

    for (const n of neighbors) {
      if (window.dungeonManager.tiles[n.y]?.[n.x] === 3) {
        // Distance check
        const dist = Math.hypot(this.player.worldX - n.x * u, this.player.worldZ - n.y * u);
        if (dist < 1.35) {
          window.dungeonManager.tiles[n.y][n.x] = 4; // Open door
          const doorGroup = window.engine3D?.doorMeshes.get(`${n.x},${n.y}`);
          if (doorGroup) doorGroup.rotation.y = -Math.PI / 2;

          this.addLog("You pushed open the heavy wooden door.", 'gray');
          if (window.gameAudio) window.gameAudio.playChest();
          window.dungeonManager.computeFOV(this.player.x, this.player.y);
        }
      }
    }
  }

  // --- Real-Time Monster AI Update ---

  updateMonsters(dt, u) {
    const px = this.player.worldX;
    const pz = this.player.worldZ;

    for (let i = window.dungeonManager.monsters.length - 1; i >= 0; i--) {
      const m = window.dungeonManager.monsters[i];
      if (!m || m.hp <= 0 || m.isDead) {
        if (m && !m.isDead && m.hp <= 0) {
          this.slayMonster(m, i);
        } else {
          window.dungeonManager.monsters.splice(i, 1);
          if (window.engine3D) window.engine3D.removeMonsterMesh(m?.id || m);
        }
        continue;
      }

      const dist = Math.hypot(m.worldX - px, m.worldZ - pz);

      // Aggro Range (~10 world units or line of sight)
      if (dist < 10.5) {
        m.state = 'CHASE';

        // Move towards player with wall sliding
        if (dist > 1.4) {
          const dirX = (px - m.worldX) / dist;
          const dirZ = (pz - m.worldZ) / dist;

          const nextX = m.worldX + dirX * m.speed * dt;
          if (!this.checkWallCollision(nextX, m.worldZ, 0.4, u)) {
            m.worldX = nextX;
          }

          const nextZ = m.worldZ + dirZ * m.speed * dt;
          if (!this.checkWallCollision(m.worldX, nextZ, 0.4, u)) {
            m.worldZ = nextZ;
          }

          m.x = Math.round(m.worldX / u);
          m.y = Math.round(m.worldZ / u);
        } else {
          // In Melee Attack Reach: Attack Player on Cooldown
          if (m.attackCooldown <= 0) {
            this.monsterAttackPlayer(m);
            m.attackCooldown = 1.3 + Math.random() * 0.4;
          }
        }
      } else {
        m.state = 'IDLE';
      }

      if (m.attackCooldown > 0) {
        m.attackCooldown -= dt;
      }
    }

    if (window.engine3D) {
      window.engine3D.syncEntities(window.dungeonManager.monsters, window.dungeonManager.items);
    }
  }

  monsterAttackPlayer(m) {
    if (this.gameState !== 'PLAYING') return;

    // Dodge Check
    const isDodge = Math.random() * 100 < this.player.dodge;
    if (isDodge) {
      if (window.engine3D) {
        window.engine3D.spawnDamagePopup(this.player.worldX, 0, this.player.worldZ, 'DODGE!', '#00d2d3');
      }
      this.addLog(`You swiftly dodged ${m.name}'s attack!`, 'cyan');
      return;
    }

    const armDef = (this.player.armor?.def_bonus || 0);
    const totalDef = this.player.base_def + armDef;
    const rawDmg = Math.max(2, Math.round(m.atk * (0.85 + Math.random() * 0.3) - totalDef * 0.5));

    this.player.hp = Math.max(0, this.player.hp - rawDmg);

    if (window.engine3D) {
      window.engine3D.spawnDamagePopup(this.player.worldX, 0, this.player.worldZ, `-${rawDmg}`, '#ff3838');
    }
    if (window.gameAudio) window.gameAudio.playHit();

    this.addLog(`${m.name} strikes you for ${rawDmg} damage!`, 'red');
    this.updateHUD();

    if (this.player.hp <= 0) {
      this.triggerGameOver(`Slain in combat by ${m.name}`);
    }
  }

  // --- Real-Time Player Combat Actions ---

  triggerPlayerAttack() {
    if (this.gameState !== 'PLAYING' || !this.player) return;
    if (this.player.attackCooldown > 0) return; // on cooldown

    this.player.attackCooldown = 0.35; // fluid, agile attack pacing
    if (window.multiplayerClient?.isOnline) {
      window.multiplayerClient.broadcastAction('attack');
    }

    // Trigger visual swing & particle arc in 3D
    if (window.engine3D) {
      window.engine3D.triggerAttackAnimation();
    }
    if (window.gameAudio) {
      window.gameAudio.playAttack();
    }

    // Modern Action Dock tactile feedback
    const dockAtk = document.getElementById('dockAttackSlot');
    if (dockAtk) {
      dockAtk.classList.add('active-slash');
      setTimeout(() => dockAtk.classList.remove('active-slash'), 200);
    }

    const px = this.player.worldX;
    const pz = this.player.worldZ;
    const reach = 2.4; // Melee reach
    const viewMode = window.engine3D ? window.engine3D.viewMode : 'ACTION_RPG';

    let hits = 0;

    for (let i = window.dungeonManager.monsters.length - 1; i >= 0; i--) {
      const m = window.dungeonManager.monsters[i];
      const dist = Math.hypot(m.worldX - px, m.worldZ - pz);

      if (dist <= reach) {
        // In Action RPG mode, check if enemy is generally in front of player
        const dx = m.worldX - px;
        const dz = m.worldZ - pz;
        const angleToTarget = Math.atan2(-dx, -dz);
        let angleDiff = angleToTarget - this.player.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        // Frontal arc ~140 degrees (or very close proximity <= 1.2 units)
        if (Math.abs(angleDiff) < Math.PI * 0.55 || dist <= 1.2) {
          this.damageMonster(m, i);
          hits++;
        }
      }
    }
  }

  damageMonster(m, index) {
    if (!m || m.isDead || m.hp <= 0) return;

    const wepAtk = (this.player.weapon?.atk_bonus || 0);
    const baseAtk = this.player.base_atk + wepAtk;

    const isCrit = Math.random() * 100 < this.player.crit;
    const critMult = isCrit ? 2.0 : (1.0 + Math.random() * 0.25 - 0.12);

    const dmg = Math.max(1, Math.round((baseAtk * critMult) - (m.def * 0.4)));

    m.hp = Math.max(0, m.hp - dmg);

    // 3D Knockback
    const pushDirX = m.worldX - this.player.worldX;
    const pushDirZ = m.worldZ - this.player.worldZ;
    const len = Math.hypot(pushDirX, pushDirZ) || 1;
    const u = window.engine3D ? window.engine3D.unitSize : 2.0;

    const candidateX = m.worldX + (pushDirX / len) * 0.5;
    const candidateZ = m.worldZ + (pushDirZ / len) * 0.5;
    if (!this.checkWallCollision(candidateX, candidateZ, 0.4, u)) {
      m.worldX = candidateX;
      m.worldZ = candidateZ;
    }

    // 3D Floating Combat Text Popup
    if (window.engine3D) {
      window.engine3D.spawnDamagePopup(
        m.worldX,
        0,
        m.worldZ,
        isCrit ? `CRIT! -${dmg}` : `-${dmg}`,
        isCrit ? '#ffb830' : '#ff4757',
        isCrit
      );
      window.engine3D.spawnParticleExplosion(m.worldX, 1.0, m.worldZ, isCrit ? 0xffb830 : 0xe74c3c, 12);
    }
    try {
      if (window.gameAudio) window.gameAudio.playHit();
    } catch (_) {}

    this.addLog(`You strike ${m.name} for ${dmg} damage!${isCrit ? ' (CRITICAL!)' : ''}`, isCrit ? 'gold' : 'white');

    // Check if monster died
    if (m.hp <= 0) {
      this.slayMonster(m, index);
    }
  }

  slayMonster(m, index) {
    if (!m || m.isDead) return;
    m.isDead = true;
    m.hp = 0;

    this.kills++;
    this.score += (m.xp || 15) * 15;
    this.addLog(`🏆 You vanquished ${m.name}! (+${m.xp || 15} XP)`, 'green');

    try {
      if (window.gameAudio) {
        if (typeof window.gameAudio.playEnemyDeath === 'function') {
          window.gameAudio.playEnemyDeath();
        } else if (typeof window.gameAudio.playKill === 'function') {
          window.gameAudio.playKill();
        }
      }
    } catch (e) {
      console.warn("Audio error in slayMonster:", e);
    }

    // Spawn Ground Loot on Monster position
    const u = window.engine3D ? window.engine3D.unitSize : 2.0;
    const gx = Math.round(m.worldX / u);
    const gy = Math.round(m.worldZ / u);

    // 80% chance of gold drop
    const dropGold = Math.floor(15 + Math.random() * 25 * window.dungeonManager.floor);
    window.dungeonManager.items.push({
      id: `loot_${Date.now()}_${Math.random()}`,
      x: gx,
      y: gy,
      type: 'gold',
      gold: dropGold,
      name: `${dropGold} Gold Coins`
    });

    // 25% chance of potion drop
    if (Math.random() < 0.25) {
      const isHealth = Math.random() < 0.5;
      window.dungeonManager.items.push({
        id: `pot_${Date.now()}_${Math.random()}`,
        x: gx,
        y: gy,
        type: isHealth ? 'potion_health' : 'potion_mana',
        name: isHealth ? 'Health Potion' : 'Mana Draught',
        heal: 45,
        mana: 40
      });
    }

    // Securely remove monster by finding its exact index
    const realIdx = window.dungeonManager.monsters.indexOf(m);
    if (realIdx !== -1) {
      window.dungeonManager.monsters.splice(realIdx, 1);
    } else if (typeof index === 'number' && index >= 0 && index < window.dungeonManager.monsters.length) {
      window.dungeonManager.monsters.splice(index, 1);
    } else {
      window.dungeonManager.monsters = window.dungeonManager.monsters.filter(foe => foe !== m && foe.hp > 0);
    }

    // Instantly remove from 3D scene & burst into particles
    if (window.engine3D) {
      window.engine3D.removeMonsterMesh(m.id || m);
      window.engine3D.syncEntities(window.dungeonManager.monsters, window.dungeonManager.items);
    }

    this.addXP(m.xp || 15);
    this.updateHUD();
    if (window.modernMap) window.modernMap.updateStats();
  }

  addXP(amt) {
    this.player.xp += amt;
    if (this.player.xp >= this.player.next_xp) {
      this.player.level++;
      this.player.xp -= this.player.next_xp;
      this.player.next_xp = Math.round(this.player.next_xp * 1.55);

      this.player.max_hp += 18;
      this.player.hp = this.player.max_hp;
      this.player.max_mana += 12;
      this.player.mana = this.player.max_mana;
      this.player.base_atk += 3;
      this.player.base_def += 1;

      this.addLog(`★ LEVEL UP! You reached Level ${this.player.level}! Health & Mana restored!`, 'gold');
      if (window.gameAudio) window.gameAudio.playLevelUp();
      if (window.engine3D) {
        window.engine3D.spawnDamagePopup(this.player.worldX, 0, this.player.worldZ, 'LEVEL UP!', '#ffb830', true);
      }
    }
  }

  // --- Active Skills & Spells ---

  useAbility(abId) {
    if (this.gameState !== 'PLAYING' || !this.player) return;
    const ab = this.player.abilities.find(a => a.id === abId);
    if (!ab) return;

    if (this.player.mana < ab.cost) {
      this.addLog("Not enough Mana to cast " + ab.name + "!", 'red');
      return;
    }

    this.player.mana -= ab.cost;
    this.updateHUD();

    // Modern Action Dock active cast effect
    const dockSkill = (abId === this.player?.abilities?.[0]?.id) ? document.getElementById('dockSkillQ')
      : (abId === this.player?.abilities?.[1]?.id ? document.getElementById('dockSkillE')
      : document.getElementById('dockSkillR'));
    if (dockSkill) {
      dockSkill.classList.add('active-cast');
      setTimeout(() => dockSkill.classList.remove('active-cast'), 300);
    }

    if (window.multiplayerClient?.isOnline) {
      window.multiplayerClient.broadcastAction(abId);
    }

    const px = this.player.worldX;
    const pz = this.player.worldZ;
    const u = window.engine3D ? window.engine3D.unitSize : 2.0;

    switch(abId) {
      case 'cleave': {
        // Warrior: Whirlwind 360-degree cleave
        if (window.engine3D) {
          window.engine3D.spawnSlashArc(px, 0.8, pz, 0);
          window.engine3D.spawnSlashArc(px, 0.8, pz, Math.PI);
        }
        if (window.gameAudio) window.gameAudio.playAttack();

        let count = 0;
        for (let i = window.dungeonManager.monsters.length - 1; i >= 0; i--) {
          const m = window.dungeonManager.monsters[i];
          if (!m || m.isDead || m.hp <= 0) continue;
          if (Math.hypot(m.worldX - px, m.worldZ - pz) <= 3.2) {
            this.damageMonster(m, i);
            count++;
          }
        }
        this.addLog(`Whirlwind swept through ${count} enemies!`, 'gold');
        break;
      }

      case 'bash': {
        // Warrior: Shield Bash
        try { if (window.gameAudio) window.gameAudio.playHit(); } catch (_) {}
        let hit = false;
        for (let i = window.dungeonManager.monsters.length - 1; i >= 0; i--) {
          const m = window.dungeonManager.monsters[i];
          if (!m || m.isDead || m.hp <= 0) continue;
          if (Math.hypot(m.worldX - px, m.worldZ - pz) <= 2.2) {
            this.damageMonster(m, i);
            hit = true;
            break;
          }
        }
        if (!hit) this.addLog("Shield Bash struck empty air.", 'gray');
        break;
      }

      case 'missile': {
        // Mage: Arcane Bolt
        let target = null;
        let minDist = 12;
        for (const m of window.dungeonManager.monsters) {
          if (!m || m.isDead || m.hp <= 0) continue;
          const d = Math.hypot(m.worldX - px, m.worldZ - pz);
          if (d < minDist) {
            minDist = d;
            target = m;
          }
        }

        if (target) {
          if (window.engine3D) {
            window.engine3D.spawn3DSpell(px, pz, target.worldX, target.worldZ, 0x00d2d3);
          }
          try { if (window.gameAudio) window.gameAudio.playSpell(); } catch (_) {}
          setTimeout(() => {
            const idx = window.dungeonManager.monsters.indexOf(target);
            if (idx !== -1 && target.hp > 0 && !target.isDead) this.damageMonster(target, idx);
          }, 240);
          this.addLog("Arcane Bolt launched at " + target.name + "!", 'cyan');
        } else {
          this.addLog("No target in sight for Arcane Bolt.", 'gray');
        }
        break;
      }

      case 'meteor': {
        // Mage: Meteor Blast
        const targetX = px + Math.sin(this.player.angle) * 3.5;
        const targetZ = pz + Math.cos(this.player.angle) * 3.5;
        if (window.engine3D) {
          window.engine3D.spawnParticleExplosion(targetX, 1.2, targetZ, 0xff5e3a, 35);
        }
        try {
          if (window.gameAudio) {
            if (typeof window.gameAudio.playFireball === 'function') window.gameAudio.playFireball();
            else window.gameAudio.playSpell('fireball');
          }
        } catch (_) {}

        for (let i = window.dungeonManager.monsters.length - 1; i >= 0; i--) {
          const m = window.dungeonManager.monsters[i];
          if (!m || m.isDead || m.hp <= 0) continue;
          if (Math.hypot(m.worldX - targetX, m.worldZ - targetZ) <= 3.4) {
            this.damageMonster(m, i);
          }
        }
        this.addLog("Meteor Blast detonated upon the dungeon!", 'gold');
        break;
      }

      case 'blink': {
        // Mage: Astral Shift / Teleport
        const targetX = px + Math.sin(this.player.angle) * 5.0;
        const targetZ = pz + Math.cos(this.player.angle) * 5.0;
        if (!this.checkWallCollision(targetX, targetZ, this.player.radius, u)) {
          this.player.worldX = targetX;
          this.player.worldZ = targetZ;
          if (window.engine3D) {
            window.engine3D.spawnParticleExplosion(px, 1.2, pz, 0x00d2d3, 20);
            window.engine3D.spawnParticleExplosion(targetX, 1.2, targetZ, 0x00d2d3, 20);
          }
          try { if (window.gameAudio) window.gameAudio.playSpell('teleport'); } catch (_) {}
          this.addLog("Astral Shift teleported you forward!", 'cyan');
        } else {
          this.addLog("Astral Shift blocked by solid stone wall.", 'gray');
        }
        break;
      }

      case 'shadow_strike': {
        // Rogue: Shadow Dash
        const dashX = px + Math.sin(this.player.angle) * 4.0;
        const dashZ = pz + Math.cos(this.player.angle) * 4.0;
        if (!this.checkWallCollision(dashX, dashZ, this.player.radius, u)) {
          this.player.worldX = dashX;
          this.player.worldZ = dashZ;
          this.triggerPlayerAttack();
          this.addLog("Shadow Dash pierced through the darkness!", 'cyan');
        }
        break;
      }

      case 'poison_dart': {
        // Rogue: Poison Dart
        let target = null;
        let minDist = 8;
        for (const m of window.dungeonManager.monsters) {
          if (!m || m.isDead || m.hp <= 0) continue;
          const d = Math.hypot(m.worldX - px, m.worldZ - pz);
          if (d < minDist) {
            minDist = d;
            target = m;
          }
        }
        if (target) {
          const idx = window.dungeonManager.monsters.indexOf(target);
          if (idx !== -1 && target.hp > 0 && !target.isDead) this.damageMonster(target, idx);
          this.addLog("Poison Dart hit " + target.name + "!", 'green');
        }
        break;
      }
    }
  }

  // --- Collisions & Pickups Check ---

  checkCollisionsAndPickups(u) {
    const px = this.player.worldX;
    const pz = this.player.worldZ;

    // 1. Items pickup
    for (let i = window.dungeonManager.items.length - 1; i >= 0; i--) {
      const it = window.dungeonManager.items[i];
      const itX = it.x * u;
      const itZ = it.y * u;

      if (Math.hypot(px - itX, pz - itZ) < 0.95) {
        if (it.type === 'gold') {
          this.player.gold += it.gold;
          this.score += it.gold * 5;
          if (window.engine3D) {
            window.engine3D.spawnDamagePopup(itX, 0, itZ, `+${it.gold} G`, '#fbc531');
          }
          try { if (window.gameAudio) window.gameAudio.playGold(); } catch (_) {}
          this.addLog(`Gathered ${it.gold} gold coins!`, 'gold');
        } else {
          this.player.inventory.push(it);
          if (window.engine3D) {
            window.engine3D.spawnDamagePopup(itX, 0, itZ, `+${it.name}`, '#00d2d3');
          }
          try { if (window.gameAudio) window.gameAudio.playChest(); } catch (_) {}
          this.addLog(`Acquired: ${it.name}!`, 'cyan');
        }

        window.dungeonManager.items.splice(i, 1);
        this.updateHUD();
        if (window.modernMap) window.modernMap.updateStats();
      }
    }

    // 2. Stairs to Next Floor
    const stairsX = window.dungeonManager.stairs.x * u;
    const stairsZ = window.dungeonManager.stairs.y * u;
    if (Math.hypot(px - stairsX, pz - stairsZ) < 1.05) {
      if (!this.stairsModalOpen) {
        this.openDescendDialog();
      }
    } else {
      this.stairsModalOpen = false;
    }
  }

  openDescendDialog() {
    this.stairsModalOpen = true;
    const modal = document.getElementById('descendModal');
    const promptText = document.getElementById('descendPromptText');
    if (modal) {
      if (window.dungeonManager.floor >= 4) {
        this.triggerVictory();
        return;
      }
      if (promptText) {
        promptText.textContent = `A stone staircase leads down to 3D Floor ${window.dungeonManager.floor + 1}... Descend into the unknown depths?`;
      }
      modal.showModal();
    }
  }

  confirmDescend() {
    const modal = document.getElementById('descendModal');
    if (modal) modal.close();
    try { if (window.gameAudio) window.gameAudio.playLevelUp(); } catch (_) {}
    this.loadFloor(window.dungeonManager.floor + 1);
  }

  useItem(index) {
    if (this.gameState !== 'PLAYING' || !this.player) return;
    const item = this.player.inventory[index];
    if (!item) return;

    if (item.heal) {
      const actualHeal = Math.min(this.player.max_hp - this.player.hp, item.heal);
      this.player.hp += actualHeal;
      if (window.engine3D) {
        window.engine3D.spawnDamagePopup(this.player.worldX, 0, this.player.worldZ, `+${actualHeal} HP`, '#2ed573');
      }
      try { if (window.gameAudio) window.gameAudio.playPotion(); } catch (_) {}
      this.addLog(`Drank ${item.name}, recovering ${actualHeal} HP!`, 'green');
    } else if (item.mana) {
      const actualMana = Math.min(this.player.max_mana - this.player.mana, item.mana);
      this.player.mana += actualMana;
      if (window.engine3D) {
        window.engine3D.spawnDamagePopup(this.player.worldX, 0, this.player.worldZ, `+${actualMana} MP`, '#00d2d3');
      }
      try { if (window.gameAudio) window.gameAudio.playPotion(); } catch (_) {}
      this.addLog(`Consumed ${item.name}, restoring ${actualMana} Mana!`, 'cyan');
    } else if (item.type === 'scroll_fireball') {
      this.useAbility('meteor');
    }

    this.player.inventory.splice(index, 1);
    this.updateHUD();
  }

  // --- Minimap with Real-Time Player & Monster Dots ---

  renderMinimap() {
    if (!this.minimapCtx) return;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    this.minimapCtx.fillStyle = '#0d0f17';
    this.minimapCtx.fillRect(0, 0, w, h);

    const scaleX = w / window.dungeonManager.width;
    const scaleY = h / window.dungeonManager.height;

    for (let y = 0; y < window.dungeonManager.height; y++) {
      for (let x = 0; x < window.dungeonManager.width; x++) {
        if (!window.dungeonManager.explored[y]?.[x]) continue;

        const tile = window.dungeonManager.tiles[y][x];
        if (tile === 2) {
          this.minimapCtx.fillStyle = '#2c3242';
        } else if (tile === 5) {
          this.minimapCtx.fillStyle = '#00cec9';
        } else {
          this.minimapCtx.fillStyle = '#485460';
        }
        this.minimapCtx.fillRect(x * scaleX, y * scaleY, scaleX + 0.5, scaleY + 0.5);
      }
    }

    // Monsters on Radar
    const u = window.engine3D ? window.engine3D.unitSize : 2.0;
    for (const m of window.dungeonManager.monsters) {
      const gx = m.worldX / u;
      const gy = m.worldZ / u;
      this.minimapCtx.fillStyle = m.boss ? '#ff3838' : '#e74c3c';
      this.minimapCtx.fillRect(gx * scaleX, gy * scaleY, scaleX * 1.5, scaleY * 1.5);
    }

    // Player Dot with Facing Compass
    if (this.player) {
      const px = (this.player.worldX / u) * scaleX;
      const py = (this.player.worldZ / u) * scaleY;

      this.minimapCtx.fillStyle = '#2ecc71';
      this.minimapCtx.beginPath();
      this.minimapCtx.arc(px, py, 3.5, 0, Math.PI * 2);
      this.minimapCtx.fill();

      // Facing line
      this.minimapCtx.strokeStyle = '#f1c40f';
      this.minimapCtx.lineWidth = 2;
      this.minimapCtx.beginPath();
      this.minimapCtx.moveTo(px, py);
      this.minimapCtx.lineTo(
        px - Math.sin(this.player.angle) * 9,
        py - Math.cos(this.player.angle) * 9
      );
      this.minimapCtx.stroke();
    }
  }

  updateHUD() {
    if (!this.player) return;

    const hpBar = document.getElementById('hpFill');
    const hpText = document.getElementById('hpText');
    if (hpBar) {
      const pct = Math.max(0, Math.min(100, (this.player.hp / this.player.max_hp) * 100));
      hpBar.style.width = `${pct}%`;
    }
    if (hpText) hpText.textContent = `${this.player.hp} / ${this.player.max_hp}`;

    const manaBar = document.getElementById('manaFill');
    const manaText = document.getElementById('manaText');
    if (manaBar) {
      const pct = Math.max(0, Math.min(100, (this.player.mana / this.player.max_mana) * 100));
      manaBar.style.width = `${pct}%`;
    }
    if (manaText) manaText.textContent = `${Math.round(this.player.mana)} / ${this.player.max_mana}`;

    const xpBar = document.getElementById('xpFill');
    const xpText = document.getElementById('xpText');
    if (xpBar) {
      const pct = Math.max(0, Math.min(100, (this.player.xp / this.player.next_xp) * 100));
      xpBar.style.width = `${pct}%`;
    }
    if (xpText) xpText.textContent = `Lv.${this.player.level} (${this.player.xp}/${this.player.next_xp})`;

    const floorEl = document.getElementById('hudFloor');
    if (floorEl) floorEl.textContent = `3D Floor ${window.dungeonManager.floor} : The Abyss`;
    const goldEl = document.getElementById('hudGold');
    if (goldEl) goldEl.textContent = `${this.player.gold} G`;
    const scoreEl = document.getElementById('hudScore');
    if (scoreEl) scoreEl.textContent = `Score: ${this.score}`;

    // --- 2026 Sleek Floating In-Game Action Dock Synchronization ---
    const dockHpVal = document.getElementById('dockHpVal');
    const dockHpCircle = document.getElementById('dockHpCircle');
    if (dockHpVal) dockHpVal.textContent = this.player.hp;
    if (dockHpCircle) {
      const circ = 2 * Math.PI * 32; // ~201.06
      const pct = Math.max(0, Math.min(1.0, this.player.hp / this.player.max_hp));
      dockHpCircle.style.strokeDasharray = `${circ}`;
      dockHpCircle.style.strokeDashoffset = `${circ * (1.0 - pct)}`;
      const hpMeter = document.getElementById('dockHpMeter');
      if (hpMeter) {
        if (pct <= 0.3) hpMeter.classList.add('critical-pulse');
        else hpMeter.classList.remove('critical-pulse');
      }
    }

    const dockManaVal = document.getElementById('dockManaVal');
    const dockManaCircle = document.getElementById('dockManaCircle');
    if (dockManaVal) dockManaVal.textContent = Math.round(this.player.mana);
    if (dockManaCircle) {
      const circ = 2 * Math.PI * 32;
      const pct = Math.max(0, Math.min(1.0, this.player.mana / this.player.max_mana));
      dockManaCircle.style.strokeDasharray = `${circ}`;
      dockManaCircle.style.strokeDashoffset = `${circ * (1.0 - pct)}`;
    }

    const dockXpFill = document.getElementById('dockXpFill');
    const dockXpBadge = document.getElementById('dockXpBadge');
    if (dockXpFill) {
      const xpPct = Math.max(0, Math.min(100, Math.round((this.player.xp / this.player.next_xp) * 100)));
      dockXpFill.style.width = `${xpPct}%`;
      if (dockXpBadge) dockXpBadge.textContent = `LV.${this.player.level} • ${xpPct}%`;
    }

    // Update Dock Abilities
    if (this.player.abilities) {
      const skillSlots = [
        { id: 'dockSkillQ', ab: this.player.abilities[0], iconId: 'dockSkillQIcon', nameId: 'dockSkillQName', costId: 'dockSkillQCost' },
        { id: 'dockSkillE', ab: this.player.abilities[1], iconId: 'dockSkillEIcon', nameId: 'dockSkillEName', costId: 'dockSkillECost' },
        { id: 'dockSkillR', ab: this.player.abilities[2], iconId: 'dockSkillRIcon', nameId: 'dockSkillRName', costId: 'dockSkillRCost' }
      ];

      const abilityIcons = {
        cleave: '🌪️',
        bash: '🛡️',
        missile: '✨',
        meteor: '☄️',
        blink: '🌌',
        shadow_strike: '🗡️',
        poison_blade: '🧪'
      };

      skillSlots.forEach(s => {
        const slotEl = document.getElementById(s.id);
        if (!slotEl) return;
        if (s.ab) {
          slotEl.style.display = 'flex';
          const iconEl = document.getElementById(s.iconId);
          const nameEl = document.getElementById(s.nameId);
          const costEl = document.getElementById(s.costId);
          if (iconEl) iconEl.textContent = abilityIcons[s.ab.id] || '⚡';
          if (nameEl) nameEl.textContent = s.ab.name.split(' ')[0];
          if (costEl) costEl.textContent = `${s.ab.cost} MP`;

          if (this.player.mana < s.ab.cost) {
            slotEl.classList.add('mana-depleted');
          } else {
            slotEl.classList.remove('mana-depleted');
          }
        } else {
          slotEl.style.display = 'none';
        }
      });
    }

    // Update Dock Potions
    const potSlots = [
      { id: 'dockPot1', iconId: 'dockPot1Icon', qtyId: 'dockPot1Qty', item: this.player.inventory?.[0] },
      { id: 'dockPot2', iconId: 'dockPot2Icon', qtyId: 'dockPot2Qty', item: this.player.inventory?.[1] },
      { id: 'dockPot3', iconId: 'dockPot3Icon', qtyId: 'dockPot3Qty', item: this.player.inventory?.[2] }
    ];

    potSlots.forEach((ps, idx) => {
      const slotEl = document.getElementById(ps.id);
      if (!slotEl) return;
      if (ps.item) {
        slotEl.style.opacity = '1';
        slotEl.title = `Use ${ps.item.name} [Key: ${idx + 1}]`;
        const iconEl = document.getElementById(ps.iconId);
        const qtyEl = document.getElementById(ps.qtyId);
        if (iconEl) {
          if (ps.item.type.includes('health')) iconEl.textContent = '🧪';
          else if (ps.item.type.includes('mana')) iconEl.textContent = '💧';
          else iconEl.textContent = '📜';
        }
        if (qtyEl) qtyEl.textContent = `${idx + 1}`;
      } else {
        slotEl.style.opacity = '0.35';
        slotEl.title = `Empty Belt Slot [${idx + 1}]`;
        const qtyEl = document.getElementById(ps.qtyId);
        if (qtyEl) qtyEl.textContent = '—';
      }
    });

    this.renderInventoryUI();
    this.renderEquipmentUI();
    this.renderAbilitiesUI();
  }

  renderInventoryUI() {
    const list = document.getElementById('quickInventoryList');
    if (!list) return;
    list.innerHTML = '';

    this.player.inventory.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.className = 'inv-slot';
      btn.title = `${item.name} - ${item.desc || ''}`;
      btn.innerHTML = `<span class="slot-idx">${idx + 1}</span><span class="slot-name">${item.name}</span>`;
      btn.onclick = () => this.useItem(idx);
      list.appendChild(btn);
    });
  }

  renderEquipmentUI() {
    const wepEl = document.getElementById('eqWeapon');
    if (wepEl) wepEl.textContent = this.player.weapon?.name || 'Empty';
    const armEl = document.getElementById('eqArmor');
    if (armEl) armEl.textContent = this.player.armor?.name || 'Empty';
    const relEl = document.getElementById('eqRelic');
    if (relEl) relEl.textContent = this.player.relic?.name || 'Empty';
  }

  renderAbilitiesUI() {
    const container = document.getElementById('abilitiesContainer');
    if (!container) return;
    container.innerHTML = '';

    this.player.abilities.forEach((ab) => {
      const btn = document.createElement('button');
      btn.className = 'ability-btn';
      btn.innerHTML = `<strong>${ab.name}</strong> <small>(${ab.cost} MP)</small><div class="ability-desc">${ab.desc}</div>`;
      btn.onclick = () => this.useAbility(ab.id);
      container.appendChild(btn);
    });
  }

  addLog(msg, color = 'white') {
    this.combatLog.unshift({ msg, color });
    if (this.combatLog.length > 40) this.combatLog.pop();

    const logEl = document.getElementById('combatLogContainer');
    if (logEl) {
      logEl.innerHTML = this.combatLog.slice(0, 15).map(item => `<div class="log-entry log-${item.color}">${item.msg}</div>`).join('');
    }
  }

  triggerGameOver(reason) {
    this.gameState = 'GAMEOVER';
    this.addLog(`💀 DEFEAT: ${reason}`, 'red');
    this.saveScore(false);

    const modal = document.getElementById('gameOverModal');
    if (modal) {
      document.getElementById('deathReasonText').textContent = reason;
      document.getElementById('finalScoreText').textContent = this.score;
      document.getElementById('finalFloorText').textContent = window.dungeonManager.floor;
      document.getElementById('finalKillsText').textContent = this.kills;
      modal.showModal();
    }
  }

  triggerVictory() {
    this.gameState = 'VICTORY';
    this.score += 3000;
    this.addLog(`🏆 VICTORY! The 3D Abyssal Sanctum is conquered!`, 'gold');
    this.saveScore(true);

    const modal = document.getElementById('victoryModal');
    if (modal) {
      document.getElementById('vicScoreText').textContent = this.score;
      document.getElementById('vicGoldText').textContent = this.player.gold;
      document.getElementById('vicKillsText').textContent = this.kills;
      modal.showModal();
    }
  }

  async saveScore(isVictory) {
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.player.name || this.player.classType,
          hero_class: this.player.classType,
          floor: window.dungeonManager.floor,
          gold: this.player.gold,
          kills: this.kills,
          score: this.score,
          victory: isVictory
        })
      });
    } catch(e) {
      console.warn("Could not save score to backend:", e);
    }
  }

  toggleControlMode() {
    this.controlMode = (this.controlMode === 'STRAFE') ? 'TURN' : 'STRAFE';
    const btn = document.getElementById('btnControlMode');
    if (btn) {
      btn.textContent = (this.controlMode === 'STRAFE') ? '🕹 A/D: Strafe' : '🕹 A/D: Turn';
    }
    if (this.controlMode === 'STRAFE') {
      this.addLog('Controls switched: A/D now Strafe Left/Right (Q/E or Arrows Turn).', 'cyan');
    } else {
      this.addLog('Controls switched: A/D now Turn Left/Right (Q/E Strafe).', 'cyan');
    }
    return this.controlMode;
  }

  // --- Real-Time Keyboard Input Listeners ---

  initEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (this.gameState !== 'PLAYING') return;

      this.keysDown.add(e.key);

      // Space or F -> Melee Attack
      if (e.key === ' ' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        this.triggerPlayerAttack();
        return;
      }

      // T -> Toggle A/D Controls (Strafe vs Turn)
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        this.toggleControlMode();
        return;
      }

      // V -> Cycle 3D Camera
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        if (typeof window.toggleCameraMode === 'function') {
          window.toggleCameraMode();
        } else if (window.engine3D) {
          const mode = window.engine3D.cycleCameraMode();
          const modeName = mode === 'ACTION_RPG' ? 'Action RPG' : (mode === 'OVER_SHOULDER' ? '3rd Person' : '1st Person');
          const btn = document.getElementById('btnCameraToggle');
          if (btn) btn.textContent = `🎥 Camera: ${modeName} [V]`;
          this.addLog(`Switched camera to ${modeName} 3D view.`, 'cyan');
        }
        return;
      }

      // U -> Toggle Mouse Look / Pointer Lock (Aim & Look with Mouse)
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        window.engine3D?.toggleMouseLook();
        return;
      }

      // Quick Inventory 1-6
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 6) {
        e.preventDefault();
        this.useItem(num - 1);
        return;
      }

      // Ability hotkeys Q, E, R
      if (this.player) {
        if (e.key === 'q' || e.key === 'Q') {
          if (this.player.abilities[0]) this.useAbility(this.player.abilities[0].id);
        } else if (e.key === 'e' || e.key === 'E') {
          if (this.player.abilities[1]) this.useAbility(this.player.abilities[1].id);
        } else if (e.key === 'r' || e.key === 'R') {
          if (this.player.abilities[2]) this.useAbility(this.player.abilities[2].id);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.key);
    });

    // Clear keys if window loses focus
    window.addEventListener('blur', () => {
      this.keysDown.clear();
    });
  }
}

// Global Game Engine instance
window.gameEngine = null;
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new GameEngine();
});
