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

  // --- Fallback procedural generator (if offline) ---

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

      // Overlap check
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

    // Connect rooms
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

    return {
      seed: Math.floor(Math.random() * 888888),
      floor: this.floor,
      width: this.width,
      height: this.height,
      tiles: tiles,
      rooms: rooms,
      torches: [],
      traps: [],
      spawn: spawn,
      stairs: stairs,
      monsters: [
        { id: 'm_1', x: spawn.x + 3, y: spawn.y, type: 'skeleton', name: 'Skeleton Guard', hp: 20, max_hp: 20, atk: 6, def: 2, xp: 15, icon: 'skeleton', color: '#fff' }
      ],
      items: [
        { id: 'item_1', x: spawn.x + 2, y: spawn.y, type: 'potion_health', name: 'Health Potion', heal: 30, icon: 'potion_red', desc: 'Restores 30 HP' }
      ],
      shrines: []
    };
  }
}

// Global dungeon manager instance
window.dungeonManager = new DungeonManager(48, 32);
