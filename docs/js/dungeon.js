/**
 * Retro Dungeon Crawler - Dungeon & FOV System
 * Handles procedural map integration, Raycasting Field of View (FOV), and dynamic torch lighting.
 */

class DungeonManager {
  constructor(width = 48, height = 32) {
    this.width = width;
    this.height = height;
    this.floor = 1;
    this.seed = null;
    this.tiles = [];
    this.explored = [];
    this.visible = [];
    this.lightMap = [];
    this.rooms = [];
    this.torches = [];
    this.traps = [];
    this.stairs = { x: 0, y: 0 };
    this.spawn = { x: 0, y: 0 };
    this.monsters = [];
    this.items = [];
    this.shrines = [];
    this.fovRadius = 7;
    this.torchFlickerTime = 0;
  }

  async loadFloor(floorLevel = 1, seed = null) {
    this.floor = floorLevel;
    this.seed = seed;

    let dungeonData = null;
    try {
      const res = await fetch('/api/dungeon/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floor: this.floor, seed: this.seed, width: this.width, height: this.height })
      });
      if (res.ok) {
        dungeonData = await res.json();
      }
    } catch (e) {
      console.warn("Python backend unreachable, using internal client fallback:", e);
    }

    if (!dungeonData) {
      dungeonData = this.generateFallbackDungeon();
    }

    this.applyData(dungeonData);
    return dungeonData;
  }

  applyData(data) {
    this.seed = data.seed;
    this.floor = data.floor;
    this.width = data.width;
    this.height = data.height;
    this.tiles = data.tiles;
    this.rooms = data.rooms || [];
    this.torches = data.torches || [];
    this.traps = data.traps || [];
    this.stairs = data.stairs || { x: 2, y: 2 };
    this.spawn = data.spawn || { x: 1, y: 1 };
    this.monsters = data.monsters || [];
    this.items = data.items || [];
    this.shrines = data.shrines || [];

    // Initialize visibility matrices
    this.explored = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    this.visible = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    this.lightMap = Array.from({ length: this.height }, () => Array(this.width).fill(0));
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.tiles[y][x];
    // Walls and empty are not walkable
    if (tile === 2 || tile === 0) return false;
    // Check closed door
    if (tile === 3) return false;
    return true;
  }

  isOpaque(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    const tile = this.tiles[y][x];
    return tile === 2 || tile === 0 || tile === 3;
  }

  // --- Raycasting Field of View (FOV) ---

  computeFOV(playerX, playerY) {
    // Reset current visibility
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.visible[y][x] = false;
        this.lightMap[y][x] = 0;
      }
    }

    // Player always sees own tile
    this.visible[playerY][playerX] = true;
    this.explored[playerY][playerX] = true;
    this.lightMap[playerY][playerX] = 1.0;

    const numRays = 360;
    const stepAngle = (Math.PI * 2) / numRays;

    for (let i = 0; i < numRays; i++) {
      const angle = i * stepAngle;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      let cx = playerX + 0.5;
      let cy = playerY + 0.5;

      for (let d = 0; d <= this.fovRadius; d += 0.4) {
        cx += cos * 0.4;
        cy += sin * 0.4;

        const tx = Math.floor(cx);
        const ty = Math.floor(cy);

        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) break;

        const dist = Math.hypot(tx - playerX, ty - playerY);
        if (dist <= this.fovRadius) {
          this.visible[ty][tx] = true;
          this.explored[ty][tx] = true;

          // Light intensity falls off with distance
          const intensity = Math.max(0, 1.0 - (dist / this.fovRadius) * 0.85);
          if (intensity > this.lightMap[ty][tx]) {
            this.lightMap[ty][tx] = intensity;
          }
        }

        if (this.isOpaque(tx, ty)) {
          break;
        }
      }
    }

    // Add ambient glow from wall torches if within explored / visible
    this.torchFlickerTime += 0.05;
    for (const torch of this.torches) {
      const flicker = 0.85 + Math.sin(this.torchFlickerTime * 3 + torch.x * 2) * 0.15;
      const torchRadius = 4;
      for (let dy = -torchRadius; dy <= torchRadius; dy++) {
        for (let dx = -torchRadius; dx <= torchRadius; dx++) {
          const tx = torch.x + dx;
          const ty = torch.y + dy;
          if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
            const dist = Math.hypot(dx, dy);
            if (dist <= torchRadius) {
              const torchLight = (1.0 - dist / torchRadius) * 0.7 * flicker;
              this.lightMap[ty][tx] = Math.min(1.0, this.lightMap[ty][tx] + torchLight);
            }
          }
        }
      }
    }
  }

  // --- Complete procedural generator (runs 100% in-browser offline or online) ---

  generateFallbackDungeon() {
    const tiles = Array.from({ length: this.height }, () => Array(this.width).fill(2));
    const rooms = [];
    const minSize = 5;
    const maxSize = 9;

    for (let r = 0; r < 12; r++) {
      const rw = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      const rh = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      const rx = Math.floor(Math.random() * (this.width - rw - 3)) + 1;
      const ry = Math.floor(Math.random() * (this.height - rh - 3)) + 1;

      let overlaps = false;
      for (const room of rooms) {
        if (rx <= room.x + room.w && rx + rw >= room.x && ry <= room.y + room.h && ry + rh >= room.y) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          tiles[y][x] = 1;
        }
      }
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
    }

    // Connect rooms with corridors
    for (let i = 0; i < rooms.length - 1; i++) {
      const r1 = rooms[i];
      const r2 = rooms[i + 1];
      let cx = r1.x + Math.floor(r1.w / 2);
      let cy = r1.y + Math.floor(r1.h / 2);
      const ex = r2.x + Math.floor(r2.w / 2);
      const ey = r2.y + Math.floor(r2.h / 2);

      while (cx !== ex) {
        tiles[cy][cx] = 1;
        cx += cx < ex ? 1 : -1;
      }
      while (cy !== ey) {
        tiles[cy][cx] = 1;
        cy += cy < ey ? 1 : -1;
      }
    }

    const first = rooms[0] || { x: 2, y: 2, w: 4, h: 4 };
    const last = rooms[rooms.length - 1] || { x: this.width - 6, y: this.height - 6, w: 4, h: 4 };
    const spawn = { x: first.x + Math.floor(first.w / 2), y: first.y + Math.floor(first.h / 2) };
    const stairs = { x: last.x + Math.floor(last.w / 2), y: last.y + Math.floor(last.h / 2) };
    tiles[stairs.y][stairs.x] = 5;

    // Torches & Traps
    const torches = [];
    const traps = [];
    for (const room of rooms) {
      if (Math.random() < 0.75) {
        torches.push({ x: room.x + 1, y: room.y });
      }
      if (Math.random() < 0.5 && room !== first) {
        const tx = room.x + Math.floor(room.w / 2);
        const ty = room.y + Math.floor(room.h / 2);
        traps.push({ x: tx, y: ty, damage: 12 + this.floor * 4, triggered: false });
        tiles[ty][tx] = 8;
      }
    }

    // Monster generation & floor scaling
    const monsters = [];
    let monsterId = 1;

    // Floor 4 Boss
    if (this.floor >= 4) {
      monsters.push({
        id: 'boss_malakor',
        x: stairs.x - 1,
        y: stairs.y,
        type: 'boss',
        name: 'Malakor, Obsidian Arch-Lich',
        hp: 160 + this.floor * 30,
        max_hp: 160 + this.floor * 30,
        atk: 22 + this.floor * 3,
        def: 8,
        xp: 350,
        icon: 'boss',
        color: '#e84118',
        boss: true
      });
    }

    const monsterTypes = [
      { type: 'skeleton', name: 'Skeleton Warrior', hp: 24, atk: 8, def: 2, xp: 20, icon: 'skeleton', color: '#f5f6fa' },
      { type: 'goblin', name: 'Goblin Sneak', hp: 16, atk: 7, def: 1, xp: 16, icon: 'goblin', color: '#4cd137' },
      { type: 'goblin_archer', name: 'Goblin Archer', hp: 18, atk: 9, def: 1, xp: 24, icon: 'archer', color: '#44bd32', ranged: true },
      { type: 'orc', name: 'Orc Berserker', hp: 38, atk: 14, def: 4, xp: 45, icon: 'orc', color: '#e1b12c' },
      { type: 'spectre', name: 'Shadow Phantom', hp: 28, atk: 12, def: 2, xp: 35, icon: 'spectre', color: '#9c88ff' },
      { type: 'blood_fiend', name: 'Crimson Blood Fiend', hp: 36, atk: 17, def: 3, xp: 55, icon: 'fiend', color: '#e74c3c' },
      { type: 'necromancer', name: 'Bone Weaver Necromancer', hp: 34, atk: 13, def: 3, xp: 55, icon: 'necro', color: '#8c7ae6', caster: true },
      { type: 'chaos_elemental', name: 'Chaos Core Elemental', hp: 44, atk: 16, def: 4, xp: 70, icon: 'elemental', color: '#ff793f', caster: true },
      { type: 'frost_revenant', name: 'Glacial Frost Revenant', hp: 54, atk: 20, def: 6, xp: 85, icon: 'revenant', color: '#00d2d3' },
      { type: 'void_drake', name: 'Void Nether Drake', hp: 50, atk: 19, def: 5, xp: 80, icon: 'void_drake', color: '#9b59b6', ranged: true, flying: true },
      { type: 'behemoth', name: 'Abyssal Titan Behemoth', hp: 76, atk: 25, def: 7, xp: 125, icon: 'behemoth', color: '#e67e22', elite: true },
      { type: 'bog_abomination', name: 'Catacomb Bog Lurker', hp: 48, atk: 15, def: 5, xp: 75, icon: 'bog_abomination', color: '#2ed573' },
      { type: 'magma_golem', name: 'Basalt Magma Golem', hp: 65, atk: 22, def: 8, xp: 110, icon: 'magma_golem', color: '#e74c3c', elite: true },
      { type: 'void_stalker', name: 'Astral Void Stalker', hp: 58, atk: 24, def: 5, xp: 120, icon: 'void_stalker', color: '#9b59b6', ranged: true }
    ];

    for (const room of rooms.slice(1)) {
      const count = Math.floor(Math.random() * (2 + Math.min(2, this.floor))) + 1;
      for (let c = 0; c < count; c++) {
        const t = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        const mx = room.x + Math.floor(Math.random() * (room.w - 2)) + 1;
        const my = room.y + Math.floor(Math.random() * (room.h - 2)) + 1;
        if (mx === stairs.x && my === stairs.y) continue;
        if (monsters.some(m => m.x === mx && m.y === my)) continue;

        const scale = 1.0 + (this.floor - 1) * 0.25;
        monsters.push({
          id: `m_${monsterId++}`,
          x: mx,
          y: my,
          type: t.type,
          name: t.name,
          hp: Math.floor(t.hp * scale),
          max_hp: Math.floor(t.hp * scale),
          atk: Math.floor(t.atk * scale),
          def: t.def,
          xp: Math.floor(t.xp * scale),
          icon: t.icon,
          color: t.color,
          ranged: !!t.ranged,
          caster: !!t.caster
        });
      }
    }

    // Loot Items & Equipment
    const items = [];
    let itemId = 1;
    const possibleItems = [
      { type: 'potion_health', name: 'Crimson Health Potion', heal: 35, icon: 'potion_red', desc: 'Restores 35 Health points' },
      { type: 'potion_mana', name: 'Azure Mana Draught', mana: 30, icon: 'potion_blue', desc: 'Restores 30 Mana or Energy' },
      { type: 'scroll_fireball', name: 'Scroll of Hellfire', damage: 45, icon: 'scroll_fire', desc: 'Blasts target enemy with fire' },
      { type: 'scroll_teleport', name: 'Scroll of Astral Shift', icon: 'scroll_teleport', desc: 'Teleports you to a safe tile in another room' },
      { type: 'weapon', name: 'Runic Longsword', atk_bonus: 5 + this.floor * 2, slot: 'weapon', icon: 'sword', desc: 'Sharp enchanted blade (+ATK)' },
      { type: 'weapon', name: 'Shadow Dagger of Venom', atk_bonus: 4 + this.floor * 2, crit_bonus: 15, slot: 'weapon', icon: 'dagger', desc: 'Fast lethal dagger (+Crit)' },
      { type: 'weapon', name: 'Staff of Arcane Echoes', atk_bonus: 6 + this.floor * 2, mana_bonus: 20, slot: 'weapon', icon: 'staff', desc: 'Channeled mage catalyst (+ATK, +Mana)' },
      { type: 'armor', name: 'Iron Plate Cuirass', def_bonus: 3 + this.floor, slot: 'armor', icon: 'armor', desc: 'Sturdy forged iron armor (+DEF)' },
      { type: 'armor', name: 'Cloak of Evasion', def_bonus: 2 + this.floor, dodge_bonus: 12, slot: 'armor', icon: 'cloak', desc: 'Silken shadowy mantle (+Dodge)' },
      { type: 'relic', name: 'Amulet of Blood Pact', vampirism: 15, slot: 'relic', icon: 'amulet', desc: 'Leeches 15% life from melee strikes' },
      { type: 'gold', name: 'Heavy Gold Pouch', gold: (Math.floor(Math.random() * 45) + 25) * this.floor, icon: 'gold', desc: 'Shining dungeon coins' }
    ];

    for (const room of rooms.slice(1)) {
      if (Math.random() < 0.8) {
        const ix = room.x + Math.floor(Math.random() * (room.w - 2)) + 1;
        const iy = room.y + Math.floor(Math.random() * (room.h - 2)) + 1;
        if (ix === stairs.x && iy === stairs.y) continue;
        if (items.some(i => i.x === ix && i.y === iy)) continue;

        const choice = Object.assign({}, possibleItems[Math.floor(Math.random() * possibleItems.length)]);
        choice.id = `item_${itemId++}`;
        choice.x = ix;
        choice.y = iy;
        if (Math.random() < 0.35) choice.in_chest = true;
        items.push(choice);
      }
    }

    // Shrines
    const shrines = [];
    const shrineTypes = [
      { type: 'health', name: 'Shrine of Vitality', effect: 'Restores full health and increases max HP by 10', icon: 'shrine_red', color: '#e84118' },
      { type: 'mana', name: 'Shrine of the Arcane Well', effect: 'Restores full mana and boosts magic power', icon: 'shrine_blue', color: '#00a8ff' },
      { type: 'fury', name: 'Altar of the Berserker', effect: 'Grants +4 permanent Attack bonus', icon: 'shrine_gold', color: '#fbc531' }
    ];
    if (rooms.length > 2 && Math.random() < 0.7) {
      const sRoom = rooms[Math.floor(Math.random() * (rooms.length - 2)) + 1];
      const sType = shrineTypes[Math.floor(Math.random() * shrineTypes.length)];
      shrines.push({
        id: 'shrine_1',
        x: sRoom.x + Math.floor(sRoom.w / 2),
        y: sRoom.y + Math.floor(sRoom.h / 2),
        type: sType.type,
        name: sType.name,
        effect: sType.effect,
        icon: sType.icon,
        color: sType.color,
        used: false
      });
    }

    return {
      seed: Math.floor(Math.random() * 888888),
      floor: this.floor,
      width: this.width,
      height: this.height,
      tiles: tiles,
      rooms: rooms,
      torches: torches,
      traps: traps,
      spawn: spawn,
      stairs: stairs,
      monsters: monsters,
      items: items,
      shrines: shrines
    };
  }
}


// Global dungeon manager instance
window.dungeonManager = new DungeonManager(48, 32);
