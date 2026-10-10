/**
 * The Abyssal Crypts 3D - Three.js WebGL Engine (2026 Modernized)
 * Smooth continuous 3D world, real-time action camera modes, 3D hero model,
 * floating damage text popups, dynamic lighting & spell particle FX.
 */

class Engine3D {
  constructor() {
    this.container = document.getElementById('canvasContainer');
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.unitSize = 2.0; // 1 dungeon grid tile = 2.0 Three.js units
    this.wallHeight = 3.0;

    // Camera modes: 'ACTION_RPG' (Isometric Top-Down 3D), 'OVER_SHOULDER', 'FIRST_PERSON'
    this.viewMode = 'ACTION_RPG';
    this.pitch = 0;

    // Player position and facing in 3D world space
    this.playerPos = new THREE.Vector3(0, 0, 0);
    this.playerAngle = 0; // Radians, 0 = North (negative Z)
    this.isMoving = false;
    this.walkAnimTime = 0;

    // Lights
    this.playerLight = null;
    this.wallTorches = []; // { light, sconce, flame, wx, wz }

    // World Meshes
    this.dungeonMeshes = [];
    this.doorMeshes = new Map();
    this.monsterMeshes = new Map();
    this.itemMeshes = new Map();
    this.otherPlayerMeshes = new Map();

    // Hero 3D Model (for 3rd Person & Action RPG view)
    this.heroGroup = null;
    this.heroWeaponMesh = null;
    this.heroLeftArm = null;
    this.heroRightArm = null;

    // First Person Weapon Viewmodel
    this.fpWeaponGroup = null;
    this.fpSwordMesh = null;

    // Real-Time Weapon Swing Animation
    this.isAttacking = false;
    this.attackProgress = 0;

    // Dynamic 3D FX
    this.slashMeshes = [];
    this.damagePopups = [];
    this.projectiles = [];
    this.particles3D = [];

    this.torchFlickerTime = 0;
    this.lastTime = performance.now();

    this.init();
  }

  init() {
    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090e);
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.055);

    // 2. Camera Setup
    const width = this.container ? this.container.clientWidth : 800;
    const height = this.container ? this.container.clientHeight : 560;
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 120);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const oldCanvas = document.getElementById('gameCanvas');
    if (oldCanvas) {
      this.renderer.domElement.id = 'gameCanvas';
      oldCanvas.replaceWith(this.renderer.domElement);
    }

    // 4. Ambient & Player Torch Light
    const ambientLight = new THREE.AmbientLight(0x2d3748, 0.85);
    this.scene.add(ambientLight);

    this.playerLight = new THREE.PointLight(0xffa834, 2.4, 14, 1.8);
    this.playerLight.castShadow = true;
    this.playerLight.shadow.mapSize.width = 512;
    this.playerLight.shadow.mapSize.height = 512;
    this.scene.add(this.playerLight);

    // 5. Build 3D Hero Model & 1st Person Viewmodel
    this.createHeroModel();
    this.createFirstPersonWeaponViewmodel();

    // 6. Canvas Mouse Click (Attack or Target)
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      // Left click attacks in real-time
      if (e.button === 0 && window.gameEngine) {
        window.gameEngine.triggerPlayerAttack();
      }
    });

    window.addEventListener('resize', () => this.onResize());

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.render(t));
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  cycleCameraMode() {
    if (this.viewMode === 'ACTION_RPG') {
      this.viewMode = 'OVER_SHOULDER';
    } else if (this.viewMode === 'OVER_SHOULDER') {
      this.viewMode = 'FIRST_PERSON';
    } else {
      this.viewMode = 'ACTION_RPG';
    }

    this.updateCameraVisibility();
    return this.viewMode;
  }

  updateCameraVisibility() {
    const isFirstPerson = (this.viewMode === 'FIRST_PERSON');
    if (this.heroGroup) {
      this.heroGroup.visible = !isFirstPerson;
    }
    if (this.fpWeaponGroup) {
      this.fpWeaponGroup.visible = isFirstPerson;
    }
  }

  // --- 3D Hero Model for 3rd Person / Action RPG Perspective ---

  createHeroModel() {
    this.heroGroup = new THREE.Group();

    // 1. Torso Armor
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x4b6584,
      metalness: 0.8,
      roughness: 0.3
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.35), torsoMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    this.heroGroup.add(torso);

    // Gold belt buckle
    const beltMat = new THREE.MeshStandardMaterial({ color: 0xfbc531, metalness: 0.9, roughness: 0.2 });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.37), beltMat);
    belt.position.y = 0.55;
    this.heroGroup.add(belt);

    // 2. Head & Knight Helmet
    const helmMat = new THREE.MeshStandardMaterial({ color: 0x778ca3, metalness: 0.85, roughness: 0.25 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), helmMat);
    head.position.y = 1.35;
    head.castShadow = true;
    this.heroGroup.add(head);

    // Glowing Visor Eyes (facing front: -Z)
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), visorMat);
    visor.position.set(0, 1.35, -0.18);
    this.heroGroup.add(visor);

    // Crest on Helmet (extending from front to back)
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xff3838, roughness: 0.5 });
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.42), crestMat);
    crest.position.set(0, 1.58, 0.02);
    this.heroGroup.add(crest);

    // 3. Left Arm & Shield (Hero's left arm at -X, holding shield forward at -Z)
    const armMat = new THREE.MeshStandardMaterial({ color: 0x4b6584, roughness: 0.4 });
    this.heroLeftArm = new THREE.Group();
    this.heroLeftArm.position.set(-0.36, 1.05, 0);

    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), armMat);
    leftArmMesh.position.y = -0.22;
    this.heroLeftArm.add(leftArmMesh);

    // Heater Shield (pointing forward at -Z)
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.7, roughness: 0.3 });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.4), shieldMat);
    shield.position.set(-0.12, -0.2, -0.08);
    shield.castShadow = true;
    this.heroLeftArm.add(shield);

    // Shield Gold Emblem
    const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.2), beltMat);
    emblem.position.set(-0.12, -0.2, -0.08);
    this.heroLeftArm.add(emblem);

    this.heroGroup.add(this.heroLeftArm);

    // 4. Right Arm & Weapon (Hero's right arm at +X, weapon pointing forward at -Z)
    this.heroRightArm = new THREE.Group();
    this.heroRightArm.position.set(0.36, 1.05, 0);

    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), armMat);
    rightArmMesh.position.y = -0.22;
    this.heroRightArm.add(rightArmMesh);

    // Weapon (Broadsword pointing forward: -Z)
    const sword = this.buildMiniSword();
    sword.position.set(0.08, -0.4, -0.2);
    sword.rotation.x = -Math.PI / 2;
    this.heroRightArm.add(sword);
    this.heroWeaponMesh = sword;

    this.heroGroup.add(this.heroRightArm);

    // 5. Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.5 });
    const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.22), legMat);
    legLeft.position.set(-0.15, 0.25, 0);
    legLeft.castShadow = true;
    this.heroGroup.add(legLeft);

    const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.22), legMat);
    legRight.position.set(0.15, 0.25, 0);
    legRight.castShadow = true;
    this.heroGroup.add(legRight);

    this.scene.add(this.heroGroup);
  }

  buildMiniSword() {
    const group = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.95, roughness: 0.15 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.02), bladeMat);
    blade.position.y = 0.4;
    blade.castShadow = true;
    group.add(blade);

    const guardMat = new THREE.MeshStandardMaterial({ color: 0xfbc531, metalness: 0.8, roughness: 0.2 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.06), guardMat);
    group.add(guard);

    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x574b90 });
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), hiltMat);
    hilt.position.y = -0.12;
    group.add(hilt);

    return group;
  }

  updateHeroClassStyle(heroClass) {
    if (!this.heroGroup) return;
    // Adapt color scheme per class
    // warrior = steel & gold, mage = mystic sapphire & purple, rogue = obsidian & crimson
    if (this.heroWeaponMesh) {
      if (heroClass === 'Mage') {
        this.heroWeaponMesh.children[0].material.color.setHex(0x00d2d3);
      } else if (heroClass === 'Rogue') {
        this.heroWeaponMesh.children[0].material.color.setHex(0xa4b0be);
      } else {
        this.heroWeaponMesh.children[0].material.color.setHex(0xe0e0e0);
      }
    }
  }

  // --- 1st Person Weapon Viewmodel ---

  createFirstPersonWeaponViewmodel() {
    this.fpWeaponGroup = new THREE.Group();

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xced6e0, metalness: 0.9, roughness: 0.2 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.02), bladeMat);
    blade.position.set(0, 0.42, 0);

    const guardMat = new THREE.MeshStandardMaterial({ color: 0xfbc531, metalness: 0.8, roughness: 0.3 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.06), guardMat);

    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), hiltMat);
    hilt.position.set(0, -0.14, 0);

    const pommelMat = new THREE.MeshStandardMaterial({ color: 0xe84118 });
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), pommelMat);
    pommel.position.set(0, -0.26, 0);

    const sword = new THREE.Group();
    sword.add(blade);
    sword.add(guard);
    sword.add(hilt);
    sword.add(pommel);

    sword.position.set(0.35, -0.3, -0.6);
    sword.rotation.set(-0.2, 0.3, -0.1);

    this.fpWeaponGroup.add(sword);
    this.fpSwordMesh = sword;

    this.camera.add(this.fpWeaponGroup);
    this.scene.add(this.camera);

    this.fpWeaponGroup.visible = false; // Default is ACTION_RPG view
  }

  // --- Attack Animation & FX ---

  triggerAttackAnimation() {
    this.isAttacking = true;
    this.attackProgress = 0;

    // Spawn 3D glowing slash crescent arc in front of the hero (-sin θ, -cos θ)
    this.spawnSlashArc(
      this.playerPos.x - Math.sin(this.playerAngle) * 0.9,
      0.9,
      this.playerPos.z - Math.cos(this.playerAngle) * 0.9,
      this.playerAngle
    );
  }

  spawnSlashArc(x, y, z, angle) {
    const arcGeo = new THREE.RingGeometry(0.6, 1.4, 16, 1, 0, Math.PI * 0.9);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xffa834,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.position.set(x, y, z);
    arcMesh.rotation.x = Math.PI / 2;
    arcMesh.rotation.z = angle - Math.PI * 0.45;

    this.scene.add(arcMesh);
    this.slashMeshes.push({ mesh: arcMesh, life: 0.2, maxLife: 0.2 });
  }

  // --- 3D Floating Damage Numbers / Popups ---

  spawnDamagePopup(x, y, z, text, color = '#ff4757', isCrit = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.font = isCrit ? 'bold 44px sans-serif' : 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(text, 128 + 2, 64 + 2);

    // Text Fill
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y + 1.2, z);
    sprite.scale.set(1.5, 0.75, 1);

    this.scene.add(sprite);
    this.damagePopups.push({
      sprite: sprite,
      life: 0.85,
      maxLife: 0.85,
      vy: 1.8 + Math.random() * 0.4
    });
  }

  // --- 3D Dungeon World Generation ---

  buildDungeon(dungeonData) {
    this.clearDungeon();

    const w = dungeonData.width;
    const h = dungeonData.height;
    const u = this.unitSize;

    const wallTex = window.gameTextures3D.getWallTexture();
    const floorTex = window.gameTextures3D.getFloorTexture();
    const ceilTex = window.gameTextures3D.getCeilingTexture();
    const doorTex = window.gameTextures3D.getDoorTexture();

    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, metalness: 0.1 });
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75, metalness: 0.15 });
    const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.9, metalness: 0.05 });
    const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.7, metalness: 0.3 });

    const boxGeo = new THREE.BoxGeometry(u, this.wallHeight, u);
    const floorGeo = new THREE.PlaneGeometry(u, u);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = dungeonData.tiles[y][x];
        const wx = x * u;
        const wz = y * u;

        if (tile !== 2 && tile !== 0) {
          // Floor
          const floorMesh = new THREE.Mesh(floorGeo, floorMat);
          floorMesh.rotation.x = -Math.PI / 2;
          floorMesh.position.set(wx, 0, wz);
          floorMesh.receiveShadow = true;
          this.scene.add(floorMesh);
          this.dungeonMeshes.push(floorMesh);

          // Ceiling
          const ceilMesh = new THREE.Mesh(floorGeo, ceilMat);
          ceilMesh.rotation.x = Math.PI / 2;
          ceilMesh.position.set(wx, this.wallHeight, wz);
          this.scene.add(ceilMesh);
          this.dungeonMeshes.push(ceilMesh);

          // Doors
          if (tile === 3 || tile === 4) {
            const doorPivot = new THREE.Group();
            doorPivot.position.set(wx - u / 2, 0, wz);

            const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(u, this.wallHeight * 0.9, 0.2), doorMat);
            doorMesh.position.set(u / 2, this.wallHeight * 0.45, 0);
            doorMesh.castShadow = true;
            doorPivot.add(doorMesh);

            if (tile === 4) {
              doorPivot.rotation.y = -Math.PI / 2; // already open
            }

            this.scene.add(doorPivot);
            this.doorMeshes.set(`${x},${y}`, doorPivot);
            this.dungeonMeshes.push(doorPivot);
          }

          // Stairs down
          if (tile === 5) {
            this.create3DStairs(wx, wz);
          }
        } else if (tile === 2) {
          // Solid Wall
          const wallMesh = new THREE.Mesh(boxGeo, wallMat);
          wallMesh.position.set(wx, this.wallHeight / 2, wz);
          wallMesh.castShadow = true;
          wallMesh.receiveShadow = true;
          this.scene.add(wallMesh);
          this.dungeonMeshes.push(wallMesh);
        }
      }
    }

    // Torches
    for (const torch of dungeonData.torches) {
      this.create3DTorch(torch.x * u, torch.y * u);
    }

    // Shrines
    for (const shrine of dungeonData.shrines) {
      this.create3DShrine(shrine);
    }
  }

  create3DTorch(wx, wz) {
    const sconceMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, metalness: 0.8 });
    const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.5, 8), sconceMat);
    sconce.position.set(wx, 1.8, wz);
    this.scene.add(sconce);
    this.dungeonMeshes.push(sconce);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), flameMat);
    flame.position.set(wx, 2.05, wz);
    this.scene.add(flame);
    this.dungeonMeshes.push(flame);

    // Only create 1 pointlight per torch and manage intensity dynamically
    const torchLight = new THREE.PointLight(0xff7722, 0, 7, 2);
    torchLight.position.set(wx, 2.1, wz);
    this.scene.add(torchLight);

    this.wallTorches.push({
      light: torchLight,
      sconce: sconce,
      flame: flame,
      wx: wx,
      wz: wz
    });
  }

  create3DShrine(shrine) {
    const wx = shrine.x * this.unitSize;
    const wz = shrine.y * this.unitSize;

    const altarMat = new THREE.MeshStandardMaterial({ color: 0x485460, roughness: 0.6 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.8, 8), altarMat);
    base.position.set(wx, 0.4, wz);
    base.castShadow = true;
    this.scene.add(base);
    this.dungeonMeshes.push(base);

    const crystalMat = new THREE.MeshStandardMaterial({
      color: shrine.color || 0x00d2d3,
      emissive: shrine.color || 0x00d2d3,
      emissiveIntensity: 0.7,
      roughness: 0.2
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), crystalMat);
    crystal.position.set(wx, 1.3, wz);
    this.scene.add(crystal);
    this.dungeonMeshes.push(crystal);
  }

  create3DStairs(wx, wz) {
    const steps = 4;
    const stepH = 0.15;
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.8 });

    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.6 - i * 0.25, stepH, 1.6 - i * 0.25), stepMat);
      step.position.set(wx, -i * stepH, wz);
      this.scene.add(step);
      this.dungeonMeshes.push(step);
    }

    const stairsLight = new THREE.PointLight(0x00cec9, 1.8, 5, 2);
    stairsLight.position.set(wx, 0.4, wz);
    this.scene.add(stairsLight);
    this.dungeonMeshes.push(stairsLight);
  }

  clearDungeon() {
    for (const mesh of this.dungeonMeshes) {
      this.scene.remove(mesh);
    }
    this.dungeonMeshes = [];

    for (const wt of this.wallTorches) {
      this.scene.remove(wt.light);
      this.scene.remove(wt.sconce);
      this.scene.remove(wt.flame);
    }
    this.wallTorches = [];

    this.monsterMeshes.forEach(mesh => this.scene.remove(mesh));
    this.monsterMeshes.clear();

    this.itemMeshes.forEach(mesh => this.scene.remove(mesh));
    this.itemMeshes.clear();

    this.otherPlayerMeshes.forEach(mesh => this.scene.remove(mesh));
    this.otherPlayerMeshes.clear();

    this.doorMeshes.clear();
  }

  // --- Real-Time Entity Synchronization ---

  syncEntities(monsters, items) {
    const u = this.unitSize;
    const currentMonsterIds = new Set();

    for (const m of monsters) {
      if (!m || m.hp <= 0 || m.isDead) continue; // Instantly ignore dead monsters
      currentMonsterIds.add(m.id);
      let mGroup = this.monsterMeshes.get(m.id);

      if (!mGroup) {
        mGroup = this.createMonsterMesh(m);
        this.scene.add(mGroup);
        this.monsterMeshes.set(m.id, mGroup);
      }

      // Smooth interpolation to real-time monster position
      const targetX = m.worldX !== undefined ? m.worldX : m.x * u;
      const targetZ = m.worldZ !== undefined ? m.worldZ : m.y * u;

      mGroup.position.x = targetX;
      mGroup.position.z = targetZ;

      // Monsters face the camera
      mGroup.lookAt(this.camera.position.x, mGroup.position.y, this.camera.position.z);

      // Distance check to player for visibility in 3D
      const distToPlayer = mGroup.position.distanceTo(this.playerPos);
      const isVisible = distToPlayer < 24; // visible in realistic range
      mGroup.visible = isVisible;

      this.updateMonsterHealthBar(mGroup, m);
    }

    // Clean up slain monsters with death particle bursts
    for (const [id, mesh] of this.monsterMeshes.entries()) {
      if (!currentMonsterIds.has(id)) {
        this.spawnParticleExplosion(mesh.position.x, mesh.position.y + 0.9, mesh.position.z, 0xe74c3c, 24);
        this.scene.remove(mesh);
        this.monsterMeshes.delete(id);
      }
    }

    // Sync ground items
    const currentItemIds = new Set();
    for (const it of items) {
      currentItemIds.add(it.id);
      let itMesh = this.itemMeshes.get(it.id);

      if (!itMesh) {
        itMesh = this.createItemMesh(it);
        this.scene.add(itMesh);
        this.itemMeshes.set(it.id, itMesh);
      }

      itMesh.position.set(it.x * u, 0.45 + Math.sin(performance.now() * 0.005 + it.x) * 0.08, it.y * u);
      itMesh.rotation.y += 0.025;
      itMesh.visible = (itMesh.position.distanceTo(this.playerPos) < 22);
    }

    for (const [id, mesh] of this.itemMeshes.entries()) {
      if (!currentItemIds.has(id)) {
        this.scene.remove(mesh);
        this.itemMeshes.delete(id);
      }
    }
  }

  // Instant removal of slain monster mesh & spawn death particles
  removeMonsterMesh(idOrMonster) {
    let id = (typeof idOrMonster === 'object' && idOrMonster !== null) ? idOrMonster.id : idOrMonster;
    let mesh = id ? this.monsterMeshes.get(id) : null;

    // Fallback: If not found by direct ID, search by monster reference or mesh
    if (!mesh && typeof idOrMonster === 'object' && idOrMonster !== null) {
      for (const [mid, mMesh] of this.monsterMeshes.entries()) {
        if (mMesh === idOrMonster || mMesh.userData?.monster === idOrMonster) {
          id = mid;
          mesh = mMesh;
          break;
        }
      }
    }

    if (mesh) {
      this.spawnParticleExplosion(mesh.position.x, mesh.position.y + 0.9, mesh.position.z, 0xe74c3c, 26);
      this.scene.remove(mesh);
      if (id) this.monsterMeshes.delete(id);
    }
  }

  // --- Real-Time Online Multiplayer Player Synchronization ---

  syncOtherPlayers(otherPlayersMap) {
    if (!otherPlayersMap) return;
    const currentIds = new Set();

    for (const [id, p] of otherPlayersMap.entries()) {
      currentIds.add(id);
      let pGroup = this.otherPlayerMeshes.get(id);

      if (!pGroup) {
        pGroup = this.createOtherPlayerMesh(p);
        this.scene.add(pGroup);
        this.otherPlayerMeshes.set(id, pGroup);
      }

      // Set target position for smooth 60 FPS lerp
      pGroup.userData.targetPos = {
        x: p.targetX !== undefined ? p.targetX : p.worldX,
        z: p.targetZ !== undefined ? p.targetZ : p.worldZ
      };

      // Update Overhead Health Bar
      this.updateOtherPlayerHealthBar(pGroup, p);
    }

    // Clean up disconnected players
    for (const [id, mesh] of this.otherPlayerMeshes.entries()) {
      if (!currentIds.has(id)) {
        this.removeOtherPlayerMesh(id);
      }
    }
  }

  createOtherPlayerMesh(p) {
    const group = new THREE.Group();
    group.position.set(p.worldX || 0, 0, p.worldZ || 0);

    const heroKey = `hero_${(p.hero_class || 'warrior').toLowerCase()}`;
    const spriteCanvas = window.gameSprites?.get(heroKey) || window.gameSprites?.get('hero_warrior');
    const spriteTex = new THREE.CanvasTexture(spriteCanvas);
    spriteTex.magFilter = THREE.NearestFilter;
    spriteTex.minFilter = THREE.NearestFilter;

    const size = 1.85;
    const spriteMat = new THREE.MeshStandardMaterial({
      map: spriteTex,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.5
    });

    const spritePlane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), spriteMat);
    spritePlane.position.y = size / 2;
    spritePlane.castShadow = true;
    group.add(spritePlane);

    // Glowing Overhead Name Tag
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256;
    nameCanvas.height = 64;
    const nCtx = nameCanvas.getContext('2d');
    nCtx.fillStyle = 'rgba(7, 9, 14, 0.75)';
    nCtx.roundRect(4, 4, 248, 56, 12);
    nCtx.fill();
    nCtx.strokeStyle = p.hero_class === 'Mage' ? '#00d2d3' : (p.hero_class === 'Rogue' ? '#2ed573' : '#ffb830');
    nCtx.lineWidth = 3;
    nCtx.stroke();
    nCtx.font = 'bold 24px sans-serif';
    nCtx.fillStyle = '#ffffff';
    nCtx.textAlign = 'center';
    nCtx.textBaseline = 'middle';
    const icon = p.hero_class === 'Mage' ? '🔮' : (p.hero_class === 'Rogue' ? '🗡️' : '⚔️');
    nCtx.fillText(`${icon} ${p.name || 'Hero'}`, 128, 32);

    const nameTex = new THREE.CanvasTexture(nameCanvas);
    const nameMat = new THREE.MeshBasicMaterial({ map: nameTex, transparent: true });
    const nameMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), nameMat);
    nameMesh.position.set(0, size + 0.45, 0);
    group.add(nameMesh);

    // Overhead Mini Health Bar
    const barW = size * 0.75;
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(barW, 0.08), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    barBg.position.set(0, size + 0.15, 0);

    const barFill = new THREE.Mesh(
      new THREE.PlaneGeometry(barW, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x2ed573 })
    );
    barFill.position.set(0, size + 0.15, 0.01);

    group.add(barBg);
    group.add(barFill);

    group.userData = {
      barFill: barFill,
      maxBarW: barW,
      targetPos: { x: p.worldX || 0, z: p.worldZ || 0 },
      player: p
    };

    return group;
  }

  updateOtherPlayerHealthBar(group, p) {
    if (!group.userData?.barFill) return;
    const maxHp = (typeof p.max_hp === 'number' && p.max_hp > 0) ? p.max_hp : 120;
    const hp = typeof p.hp === 'number' ? Math.max(0, p.hp) : 0;
    const pct = Math.max(0, Math.min(1.0, hp / maxHp));
    const maxW = group.userData.maxBarW;
    group.userData.barFill.scale.x = pct;
    group.userData.barFill.position.x = -(maxW * (1 - pct)) / 2;
  }

  removeOtherPlayerMesh(id) {
    const mesh = this.otherPlayerMeshes.get(id);
    if (mesh) {
      this.spawnParticleExplosion(mesh.position.x, 1.0, mesh.position.z, 0x00d2d3, 16);
      this.scene.remove(mesh);
      this.otherPlayerMeshes.delete(id);
    }
  }

  createMonsterMesh(m) {
    const group = new THREE.Group();
    group.position.set(m.x * this.unitSize, 0, m.y * this.unitSize);

    const spriteCanvas = window.gameSprites.get(`m_${m.type}`) || window.gameSprites.get('m_skeleton');
    const spriteTex = new THREE.CanvasTexture(spriteCanvas);
    spriteTex.magFilter = THREE.NearestFilter;
    spriteTex.minFilter = THREE.NearestFilter;

    const size = m.boss ? 2.6 : 1.75;
    const spriteMat = new THREE.MeshStandardMaterial({
      map: spriteTex,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.5
    });

    const spritePlane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), spriteMat);
    spritePlane.position.y = size / 2;
    spritePlane.castShadow = true;
    group.add(spritePlane);

    // Overhead Health Bar
    const barW = size * 0.8;
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(barW, 0.08), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    barBg.position.set(0, size + 0.18, 0);

    const barFill = new THREE.Mesh(
      new THREE.PlaneGeometry(barW, 0.08),
      new THREE.MeshBasicMaterial({ color: m.boss ? 0xff3838 : 0x2ed573 })
    );
    barFill.position.set(0, size + 0.18, 0.01);

    group.add(barBg);
    group.add(barFill);
    group.userData = { barFill: barFill, maxBarW: barW, spriteMat: spriteMat, monster: m };

    return group;
  }

  updateMonsterHealthBar(group, m) {
    if (!group.userData?.barFill) return;
    const maxHp = (typeof m.max_hp === 'number' && m.max_hp > 0) ? m.max_hp : Math.max(1, m.hp || 20);
    const hp = typeof m.hp === 'number' ? Math.max(0, m.hp) : 0;
    const pct = Math.max(0, Math.min(1.0, hp / maxHp));
    const maxW = group.userData.maxBarW;
    group.userData.barFill.scale.x = pct;
    group.userData.barFill.position.x = -(maxW * (1 - pct)) / 2;
  }

  createItemMesh(it) {
    const group = new THREE.Group();
    if (it.in_chest) {
      const chestMat = new THREE.MeshStandardMaterial({
        map: window.gameTextures3D.getChestTexture(),
        roughness: 0.6
      });
      const chestBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), chestMat);
      chestBox.castShadow = true;
      group.add(chestBox);
    } else {
      const color = it.type === 'gold' ? 0xfbc531 : (it.type.includes('mana') ? 0x00d2d3 : 0xff3838);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.6,
        roughness: 0.2
      });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), mat);
      group.add(mesh);
    }
    return group;
  }

  // --- Particle Explosions & Projectiles ---

  spawnParticleExplosion(x, y, z, color = 0xffaa22, count = 20) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: color })
      );
      p.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      p.userData = {
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 3.5 + 1.5,
        vz: Math.sin(angle) * speed,
        life: 0.8
      };
      this.scene.add(p);
      this.particles3D.push(p);
    }
  }

  spawn3DSpell(fromX, fromZ, toX, toZ, color = 0x00d2d3) {
    const start = new THREE.Vector3(fromX, 1.2, fromZ);
    const end = new THREE.Vector3(toX, 1.2, toZ);

    const orbMat = new THREE.MeshBasicMaterial({ color: color });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), orbMat);
    orb.position.copy(start);

    const light = new THREE.PointLight(color, 2.0, 5, 2);
    orb.add(light);
    this.scene.add(orb);

    this.projectiles.push({
      mesh: orb,
      start: start,
      end: end,
      progress: 0,
      color: color
    });
  }

  // --- Real-Time Render Loop ---

  render(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // 1. Update Game Engine Logic (real-time physics, continuous movement, AI)
    if (window.gameEngine && window.gameEngine.gameState === 'PLAYING') {
      window.gameEngine.update(dt);
    }

    // 2. Sync Hero 3D Model Position & Animation
    if (this.heroGroup) {
      this.heroGroup.position.set(this.playerPos.x, 0, this.playerPos.z);
      this.heroGroup.rotation.y = this.playerAngle;

      // Walking stride animation
      if (this.isMoving) {
        this.walkAnimTime += dt * 10;
        const bob = Math.sin(this.walkAnimTime) * 0.06;
        this.heroGroup.position.y = Math.abs(bob);

        if (this.heroLeftArm) {
          this.heroLeftArm.rotation.x = Math.sin(this.walkAnimTime) * 0.35;
        }
        if (this.heroRightArm && !this.isAttacking) {
          this.heroRightArm.rotation.x = -Math.sin(this.walkAnimTime) * 0.35;
        }
      } else {
        this.heroGroup.position.y = 0;
        if (this.heroLeftArm) this.heroLeftArm.rotation.x = 0;
        if (this.heroRightArm && !this.isAttacking) this.heroRightArm.rotation.x = 0;
      }

      // Attack swinging gesture on 3D hero model
      if (this.isAttacking) {
        this.attackProgress += dt * 5.0;
        if (this.heroRightArm) {
          const swing = Math.sin(this.attackProgress * Math.PI);
          this.heroRightArm.rotation.x = -swing * 1.5;
          this.heroRightArm.rotation.y = -swing * 0.8;
        }
        if (this.attackProgress >= 1.0) {
          this.isAttacking = false;
          if (this.heroRightArm) {
            this.heroRightArm.rotation.set(0, 0, 0);
          }
        }
      }
    }

    // 3. First-Person Viewmodel Attack Animation
    if (this.fpSwordMesh && this.isAttacking) {
      const swing = Math.sin(this.attackProgress * Math.PI);
      this.fpSwordMesh.rotation.x = -0.2 - swing * 1.2;
      this.fpSwordMesh.rotation.y = 0.3 - swing * 0.8;
      if (this.attackProgress >= 1.0) {
        this.fpSwordMesh.rotation.set(-0.2, 0.3, -0.1);
      }
    }

    // 3b. Smooth 60 FPS Interpolation for Online Teammates & Billboard Nametags
    for (const [id, group] of this.otherPlayerMeshes.entries()) {
      if (group.userData?.targetPos) {
        group.position.x += (group.userData.targetPos.x - group.position.x) * 0.22;
        group.position.z += (group.userData.targetPos.z - group.position.z) * 0.22;
      }
      group.lookAt(this.camera.position.x, group.position.y, this.camera.position.z);
    }

    // 4. Camera Positioning per Mode
    if (this.viewMode === 'ACTION_RPG') {
      // Modern Top-Down Isometric 3D Action RPG View (Zero Wall Clipping)
      const camElev = 7.0;
      const camBack = 5.2;
      this.camera.position.set(
        this.playerPos.x,
        this.playerPos.y + camElev,
        this.playerPos.z + camBack
      );
      this.camera.lookAt(
        this.playerPos.x,
        this.playerPos.y + 0.9,
        this.playerPos.z - 0.4
      );
    } else if (this.viewMode === 'OVER_SHOULDER') {
      // Over the shoulder 3rd person with wall-clipping avoidance (behind hero looking forward)
      const camDist = 3.6;
      const camH = 2.4;
      const cx = this.playerPos.x + Math.sin(this.playerAngle) * camDist;
      const cz = this.playerPos.z + Math.cos(this.playerAngle) * camDist;

      this.camera.position.set(cx, this.playerPos.y + camH, cz);
      this.camera.lookAt(
        this.playerPos.x - Math.sin(this.playerAngle) * 2.0,
        this.playerPos.y + 1.2,
        this.playerPos.z - Math.cos(this.playerAngle) * 2.0
      );
    } else {
      // FIRST_PERSON View
      const bob = this.isMoving ? Math.sin(this.walkAnimTime) * 0.04 : 0;
      this.camera.position.set(this.playerPos.x, 1.45 + bob, this.playerPos.z);
      this.camera.rotation.set(this.pitch, this.playerAngle, 0, 'YXZ');
    }

    // 5. Player Torch Light (always follows hero)
    if (this.playerLight) {
      this.playerLight.position.set(
        this.playerPos.x,
        this.playerPos.y + 1.8,
        this.playerPos.z
      );

      this.torchFlickerTime += dt * 8;
      const flicker = 0.88 + Math.sin(this.torchFlickerTime) * 0.12;
      this.playerLight.intensity = 2.2 * flicker;
    }

    // 6. Wall Torches - Activate only the 4 closest torches to avoid WebGL light limits!
    this.wallTorches.sort((a, b) => {
      const da = (a.wx - this.playerPos.x)**2 + (a.wz - this.playerPos.z)**2;
      const db = (b.wx - this.playerPos.x)**2 + (b.wz - this.playerPos.z)**2;
      return da - db;
    });

    for (let i = 0; i < this.wallTorches.length; i++) {
      const wt = this.wallTorches[i];
      if (i < 4) {
        wt.light.intensity = 1.4 * (0.85 + Math.sin(this.torchFlickerTime + wt.wx) * 0.15);
      } else {
        wt.light.intensity = 0; // Offload non-closest lights
      }
    }

    // 7. Update Slash Arc Meshes
    for (let i = this.slashMeshes.length - 1; i >= 0; i--) {
      const s = this.slashMeshes[i];
      s.life -= dt;
      s.mesh.material.opacity = Math.max(0, s.life / s.maxLife);
      s.mesh.scale.multiplyScalar(1.04);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.slashMeshes.splice(i, 1);
      }
    }

    // 8. Update 3D Floating Damage Popups
    for (let i = this.damagePopups.length - 1; i >= 0; i--) {
      const dp = this.damagePopups[i];
      dp.life -= dt;
      dp.sprite.position.y += dp.vy * dt;
      dp.sprite.material.opacity = Math.max(0, dp.life / dp.maxLife);
      if (dp.life <= 0) {
        this.scene.remove(dp.sprite);
        this.damagePopups.splice(i, 1);
      }
    }

    // 9. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.progress += dt * 4.0;
      proj.mesh.position.lerpVectors(proj.start, proj.end, proj.progress);

      if (proj.progress >= 1.0) {
        this.spawnParticleExplosion(proj.end.x, proj.end.y, proj.end.z, proj.color, 18);
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 10. Update 3D Particles
    for (let i = this.particles3D.length - 1; i >= 0; i--) {
      const p = this.particles3D[i];
      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.userData.vy -= 9.8 * dt;
      p.userData.life -= dt * 1.6;

      if (p.userData.life <= 0 || p.position.y <= 0) {
        this.scene.remove(p);
        this.particles3D.splice(i, 1);
      }
    }

    // Render WebGL
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((t) => this.render(t));
  }
}

// Global 3D engine instance
window.engine3D = null;
window.addEventListener('DOMContentLoaded', () => {
  if (window.THREE) {
    window.engine3D = new Engine3D();
  }
});
