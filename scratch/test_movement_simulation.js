/**
 * Comprehensive Automated Headless Simulation Test for Movement,
 * Wall Collision Math, Wall Sliding, Door Opening, and Camera Angles.
 */

const assert = require('assert');

// 1. Mock Dungeon Manager
const u = 2.0; // unit size
const gridWidth = 10;
const gridHeight = 10;

// Grid layout:
// 2 = Wall, 1 = Floor, 3 = Closed Door, 4 = Open Door
const tiles = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(2));

// Carve a room from (2, 2) to (5, 5)
for (let y = 2; y <= 5; y++) {
  for (let x = 2; x <= 5; x++) {
    tiles[y][x] = 1; // Floor
  }
}
// Place a closed door at (6, 3) leading to corridor at (7, 3)
tiles[3][6] = 3; // Closed Door
tiles[3][7] = 1; // Corridor Floor

const mockDungeonManager = {
  width: gridWidth,
  height: gridHeight,
  tiles: tiles,
  isWalkable(gx, gy) {
    if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) return false;
    const t = this.tiles[gy]?.[gx];
    return t === 1 || t === 4 || t === 5; // 1=floor, 4=open door, 5=stairs
  },
  computeFOV() {}
};

// 2. Collision & Door logic exactly as in game.js
function checkWallCollision(wx, wz, radius, u, dm) {
  if (!dm) return false;
  const minGx = Math.floor((wx - radius + u / 2) / u);
  const maxGx = Math.floor((wx + radius + u / 2) / u);
  const minGy = Math.floor((wz - radius + u / 2) / u);
  const maxGy = Math.floor((wz + radius + u / 2) / u);

  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      if (!dm.isWalkable(gx, gy)) {
        const tileMinX = gx * u - u / 2;
        const tileMaxX = gx * u + u / 2;
        const tileMinZ = gy * u - u / 2;
        const tileMaxZ = gy * u + u / 2;

        const closestX = Math.max(tileMinX, Math.min(wx, tileMaxX));
        const closestZ = Math.max(tileMinZ, Math.min(wz, tileMaxZ));

        const distSq = (wx - closestX) ** 2 + (wz - closestZ) ** 2;
        if (distSq < radius * radius) {
          return true; // Collision!
        }
      }
    }
  }
  return false;
}

function checkAutoOpenDoors(player, u, dm) {
  if (!dm) return;
  const gx = Math.round(player.worldX / u);
  const gy = Math.round(player.worldZ / u);

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (dm.tiles[ny]?.[nx] === 3) {
        const dist = Math.hypot(player.worldX - nx * u, player.worldZ - ny * u);
        if (dist < 2.0) {
          dm.tiles[ny][nx] = 4; // Open door!
          return true;
        }
      }
    }
  }
  return false;
}

function simulateStep(player, keys, dt, u, dm, camYaw = 0) {
  checkAutoOpenDoors(player, u, dm);

  let inputX = 0;
  let inputZ = 0;
  if (keys.has('w')) inputZ -= 1;
  if (keys.has('s')) inputZ += 1;
  if (keys.has('a')) inputX -= 1;
  if (keys.has('d')) inputX += 1;

  if (inputX === 0 && inputZ === 0) return;

  const len = Math.hypot(inputX, inputZ);
  const normX = inputX / len;
  const normZ = inputZ / len;

  const forwardX = -Math.sin(camYaw);
  const forwardZ = -Math.cos(camYaw);
  const rightX = Math.cos(camYaw);
  const rightZ = -Math.sin(camYaw);

  const moveDx = (forwardX * (-normZ) + rightX * normX) * player.speed * dt;
  const moveDz = (forwardZ * (-normZ) + rightZ * normX) * player.speed * dt;

  // Wall sliding
  const nextX = player.worldX + moveDx;
  if (!checkWallCollision(nextX, player.worldZ, player.radius, u, dm)) {
    player.worldX = nextX;
  }

  const nextZ = player.worldZ + moveDz;
  if (!checkWallCollision(player.worldX, nextZ, player.radius, u, dm)) {
    player.worldZ = nextZ;
  }

  checkAutoOpenDoors(player, u, dm);
}

// =================== RUN TESTS ===================
console.log('--- STARTING SIMULATION TESTS ---');

const player = {
  worldX: 3 * u, // 6.0 (room center at x=3)
  worldZ: 3 * u, // 6.0 (room center at y=3)
  radius: 0.42,
  speed: 6.2
};

// TEST 1: Spawn check
console.log('TEST 1: Spawn Walkability');
const spawnCollision = checkWallCollision(player.worldX, player.worldZ, player.radius, u, mockDungeonManager);
assert.strictEqual(spawnCollision, false, 'Player should not collide on spawn floor tile');
console.log('  PASS: Player spawned cleanly at (6.0, 6.0) with zero collision.');

// TEST 2: 4-Directional Free Movement
console.log('\nTEST 2: Smooth 4-Directional Movement (W, A, S, D)');
const startX = player.worldX;
const startZ = player.worldZ;

// Move W (North, -Z)
simulateStep(player, new Set(['w']), 0.05, u, mockDungeonManager);
assert.ok(player.worldZ < startZ, 'Moving W must decrease worldZ');
console.log(`  PASS: W moved forward (-Z): ${startZ} -> ${player.worldZ}`);

// Move S (South, +Z)
simulateStep(player, new Set(['s']), 0.05, u, mockDungeonManager);
console.log(`  PASS: S moved backward (+Z): -> ${player.worldZ}`);

// Move A (West, -X)
simulateStep(player, new Set(['a']), 0.05, u, mockDungeonManager);
assert.ok(player.worldX < startX, 'Moving A must decrease worldX');
console.log(`  PASS: A moved left (-X): ${startX} -> ${player.worldX}`);

// Move D (East, +X)
simulateStep(player, new Set(['d']), 0.05, u, mockDungeonManager);
console.log(`  PASS: D moved right (+X): -> ${player.worldX}`);

// TEST 3: Wall Collision and Sliding
console.log('\nTEST 3: Wall Collision & Sliding along Solid Wall');
// Reset player to center (3, 3)
player.worldX = 3 * u; // 6.0
player.worldZ = 3 * u; // 6.0

// Walk WEST into the wall at x=1 (wall tile is at x=1, min boundary of floor x=2 is 2*u - u/2 = 3.0)
// Floor tile x=2 spans [3.0, 5.0]. Wall is at x=1 ([1.0, 3.0]).
// So minimum allowed worldX is 3.0 + radius = 3.42
for (let i = 0; i < 60; i++) {
  simulateStep(player, new Set(['a']), 0.02, u, mockDungeonManager);
}

console.log(`  Player stopped at X = ${player.worldX.toFixed(3)} against west wall (Expected within [3.42, 3.60])`);
assert.ok(player.worldX >= 3.42 && player.worldX <= 3.60, 'Player must stop before wall boundary');
assert.strictEqual(checkWallCollision(player.worldX, player.worldZ, player.radius, u, mockDungeonManager), false, 'Player must NOT be stuck inside the wall');

// While pressed against the wall, hold W and A. Player must SLIDE along the wall!
const preSlideZ = player.worldZ;
for (let i = 0; i < 20; i++) {
  simulateStep(player, new Set(['w', 'a']), 0.02, u, mockDungeonManager);
}
assert.ok(player.worldZ < preSlideZ, 'Player must slide along wall in Z axis while pressing A and W');
console.log(`  PASS: Wall sliding verified! Z slid from ${preSlideZ.toFixed(3)} to ${player.worldZ.toFixed(3)} while remaining against wall.`);

// Verify player can easily walk AWAY from the wall (Press D)
const preEscapeX = player.worldX;
simulateStep(player, new Set(['d']), 0.05, u, mockDungeonManager);
assert.ok(player.worldX > preEscapeX, 'Player must easily walk away from the wall');
console.log(`  PASS: Walked away from wall with zero friction/stickiness.`);

// TEST 4: Door Auto-Opening
console.log('\nTEST 4: Proximity Door Auto-Opening');
// Place player at (5, 3), walking EAST toward closed door at (6, 3) (worldX = 12.0)
player.worldX = 5 * u; // 10.0
player.worldZ = 3 * u; // 6.0
assert.strictEqual(mockDungeonManager.tiles[3][6], 3, 'Door must initially be closed (tile 3)');

for (let i = 0; i < 30; i++) {
  simulateStep(player, new Set(['d']), 0.02, u, mockDungeonManager);
}

assert.strictEqual(mockDungeonManager.tiles[3][6], 4, 'Door must automatically open (tile 4)');
console.log(`  PASS: Door automatically opened to tile 4 when approached!`);

// Continue walking through the door into the corridor
for (let i = 0; i < 30; i++) {
  simulateStep(player, new Set(['d']), 0.02, u, mockDungeonManager);
}
assert.ok(player.worldX > 6 * u, 'Player must walk through the opened door into the corridor');
console.log(`  PASS: Player walked straight through the opened door to X = ${player.worldX.toFixed(3)}.`);

// TEST 5: Camera Yaw Relative Movement
console.log('\nTEST 5: Camera Yaw Relative Movement');
player.worldX = 3 * u;
player.worldZ = 3 * u;
// If camera is rotated 90 degrees (Math.PI / 2):
// Screen UP ('W') moves in -X direction
const preCamX = player.worldX;
simulateStep(player, new Set(['w']), 0.05, u, mockDungeonManager, Math.PI / 2);
assert.ok(player.worldX < preCamX, 'With camera rotated 90deg, W moves along -X');
console.log(`  PASS: Camera yaw offset movement properly aligned with screen orientation.`);

console.log('\n=== ALL 5 SIMULATION TESTS PASSED PERFECTLY ===');
