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

    // Mouse Controls, Camera Orbit & Wheel Zoom
    this.cameraYawOffset = 0;       // Mouse orbit yaw around player (radians)
    this.cameraPitchOffset = 0;     // Mouse vertical pitch tilt (radians)
    this.cameraZoom = 1.0;          // Mouse wheel zoom scale (0.6x - 2.2x)
    this.isMouseDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseLookActive = false;   // Pointer lock / FPS style mouse look
    this.isPointerLocked = false;

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
    this.killVFXList = [];
    this.cameraShakeTime = 0;
    this.cameraShakeIntensity = 0;

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

    // 6. Comprehensive Mouse Controls (Left-Click Trigger, Right-Click Drag Orbit, Scroll Zoom, Mouse Look)
    const dom = this.renderer.domElement;

    // Prevent default browser context menu on canvas so right-click can orbit camera
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        // Left Click: Trigger Melee Attack or Active Ability
        if (this.mouseLookActive && document.pointerLockElement !== dom) {
          dom.requestPointerLock?.();
        }
        if (window.gameEngine) {
          window.gameEngine.triggerPlayerAttack();
        }
      } else if (e.button === 2) {
        // Right Click: Trigger Camera Drag Orbit
        this.isMouseDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      // 1. Pointer-Lock FPS / 3rd-Person / Action RPG Free Mouse Look
      const isLocked = !!(document.pointerLockElement || this.isPointerLocked);
      if (isLocked) {
        const dx = (e.movementX !== undefined && e.movementX !== null)
          ? e.movementX
          : (e.mozMovementX || e.webkitMovementX || 0);
        const dy = (e.movementY !== undefined && e.movementY !== null)
          ? e.movementY
          : (e.mozMovementY || e.webkitMovementY || 0);
        const sensitivity = 0.0032;

        if (this.viewMode === 'FIRST_PERSON') {
          this.playerAngle -= dx * sensitivity;
          if (window.gameEngine?.player) {
            window.gameEngine.player.angle = this.playerAngle;
          }
          this.pitch = Math.max(-0.8, Math.min(0.8, this.pitch - dy * sensitivity));
        } else if (this.viewMode === 'OVER_SHOULDER') {
          this.playerAngle -= dx * sensitivity;
          if (window.gameEngine?.player) {
            window.gameEngine.player.angle = this.playerAngle;
          }
          this.cameraPitchOffset = Math.max(-0.5, Math.min(0.6, this.cameraPitchOffset - dy * sensitivity));
        } else {
          // Action RPG View with Mouse Lock:
          // Moving mouse horizontally orbits the camera and aligns hero facing angle
          this.cameraYawOffset -= dx * sensitivity;
          this.cameraPitchOffset = Math.max(-0.5, Math.min(0.6, this.cameraPitchOffset - dy * sensitivity));
          this.playerAngle = this.cameraYawOffset;
          if (window.gameEngine?.player) {
            window.gameEngine.player.angle = this.playerAngle;
          }
        }
        return;
      }

      // 2. Right-Click Drag Orbit
      if (this.isMouseDragging) {
        const dx = (e.clientX - this.lastMouseX) || (e.movementX || 0);
        const dy = (e.clientY - this.lastMouseY) || (e.movementY || 0);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const sensitivity = 0.005;
        this.cameraYawOffset -= dx * sensitivity;
        this.cameraPitchOffset = Math.max(-0.5, Math.min(0.6, this.cameraPitchOffset - dy * sensitivity));

        // In 1st person or 3rd person, also turn character
        if (this.viewMode === 'FIRST_PERSON' || this.viewMode === 'OVER_SHOULDER') {
          this.playerAngle -= dx * sensitivity;
          if (window.gameEngine?.player) {
            window.gameEngine.player.angle = this.playerAngle;
          }
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isMouseDragging = false;
      }
    });

    // Mouse Wheel Camera Zoom Trigger
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.001;
      this.cameraZoom = Math.max(0.6, Math.min(2.2, this.cameraZoom + zoomDelta));
    }, { passive: false });

    // Comprehensive Pointer Lock Change Listener (Sync On-Screen HUD & Reticle)
    document.addEventListener('pointerlockchange', () => {
      const isLocked = !!(document.pointerLockElement);
      this.isPointerLocked = isLocked;
      if (isLocked) {
        this.mouseLookActive = true;
      }

      // 1. On-Screen Floating Mouse Lock Pill
      const pill = document.getElementById('hudMouseLockPill');
      const icon = document.getElementById('hudMouseLockIcon');
      const text = document.getElementById('hudMouseLockText');
      if (pill) {
        if (isLocked) {
          pill.classList.add('locked-active');
          pill.title = 'Mouse is LOCKED on Screen. Click or press ESC to unlock.';
        } else {
          pill.classList.remove('locked-active');
          pill.title = 'Click to Lock Mouse on Screen (Hotkey: U)';
        }
      }
      if (icon) icon.textContent = isLocked ? '🔒' : '🖱️';
      if (text) text.textContent = isLocked ? 'Mouse: LOCKED [ESC]' : 'Mouse Lock: OFF';

      // 2. Center Screen Aiming Crosshair / Reticle
      const reticle = document.getElementById('hudAimReticle');
      if (reticle) reticle.style.display = isLocked ? 'block' : 'none';

      // 3. On-Screen Toast Notification
      const toast = document.getElementById('hudMouseLockToast');
      if (toast) {
        if (isLocked) {
          toast.style.display = 'block';
          toast.textContent = '🔒 Mouse Locked to Screen • Move mouse to Look/Aim • Press [ESC] to Unlock';
          clearTimeout(window._mouseToastTimer);
          window._mouseToastTimer = setTimeout(() => {
            if (toast) toast.style.display = 'none';
          }, 3500);
        } else {
          toast.style.display = 'none';
        }
      }

      // 4. Mini-Radar Quick Button
      const radarBtn = document.getElementById('btnRadarMouseLock');
      if (radarBtn) {
        radarBtn.textContent = isLocked ? '🔒' : '🖱️';
        radarBtn.style.color = isLocked ? 'var(--color-cyan)' : '';
        radarBtn.style.borderColor = isLocked ? 'var(--color-cyan)' : '';
      }

      // 5. Header Control Button
      const topBtn = document.getElementById('btnMouseLookToggle');
      if (topBtn) {
        topBtn.textContent = isLocked ? '🔒 Mouse Look: LOCKED [ESC]' : '🖱️ Mouse Look: OFF [U]';
        topBtn.style.color = isLocked ? 'var(--color-cyan)' : '';
      }

      // 6. Chronicle Log
      if (window.gameEngine) {
        if (isLocked) {
          window.gameEngine.addLog('🔒 Mouse locked on screen! Move mouse to look around & aim.', 'cyan');
        } else {
          window.gameEngine.addLog('🔓 Mouse unlocked from screen.', 'dim');
        }
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
      this.playerAngle = this.cameraYawOffset;
      if (window.gameEngine?.player) window.gameEngine.player.angle = this.playerAngle;
    } else if (this.viewMode === 'OVER_SHOULDER') {
      this.viewMode = 'FIRST_PERSON';
    } else {
      this.viewMode = 'ACTION_RPG';
      this.cameraYawOffset = this.playerAngle;
    }

    this.updateCameraVisibility();
    return this.viewMode;
  }

  toggleMouseLook() {
    if (typeof window.toggleMouseLockOnScreen === 'function') {
      window.toggleMouseLockOnScreen();
    } else {
      const dom = this.renderer?.domElement;
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      } else {
        dom?.requestPointerLock?.();
      }
    }
    return this.isPointerLocked;
  }

  resetCameraOrbit() {
    this.cameraYawOffset = 0;
    this.cameraPitchOffset = 0;
    this.cameraZoom = 1.0;
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

    // Clean up slain monsters with death particle bursts & kill VFX
    for (const [id, mesh] of this.monsterMeshes.entries()) {
      if (!currentMonsterIds.has(id)) {
        this.triggerMonsterKillVFX(mesh.position.x, mesh.position.y, mesh.position.z, mesh.userData?.monster);
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

  // Instant removal of slain monster mesh & trigger kill VFX
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
      const monsterData = mesh.userData?.monster || (typeof idOrMonster === 'object' ? idOrMonster : null);
      this.triggerMonsterKillVFX(mesh.position.x, mesh.position.y, mesh.position.z, monsterData);
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

    // Custom scaling per tier and boss
    let size = 1.8;
    if (m.type === 'behemoth') size = 3.1;
    else if (m.type === 'void_drake' || m.type === 'frost_revenant' || m.type === 'chaos_elemental') size = 2.35;
    else if (m.type === 'blood_fiend') size = 2.05;
    else if (m.boss) size = 2.7;

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

    // Dynamic Elemental Ground Aura Ring
    let auraColor = 0xe74c3c;
    if (m.type === 'void_drake') auraColor = 0xa855f7;
    else if (m.type === 'frost_revenant') auraColor = 0x00d2d3;
    else if (m.type === 'chaos_elemental') auraColor = 0xffa502;
    else if (m.type === 'blood_fiend') auraColor = 0xeb2f06;
    else if (m.type === 'behemoth') auraColor = 0xff6b6b;
    else if (m.type === 'wraith') auraColor = 0x8854d0;
    else if (m.boss) auraColor = 0xff3838;

    const auraGeo = new THREE.RingGeometry(size * 0.38, size * 0.52, 28);
    const auraMat = new THREE.MeshBasicMaterial({
      color: auraColor,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.rotation.x = -Math.PI / 2;
    auraMesh.position.y = 0.04;
    group.add(auraMesh);

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

    // Glowing Overhead Monster Badge
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256;
    nameCanvas.height = 64;
    const nCtx = nameCanvas.getContext('2d');
    nCtx.fillStyle = 'rgba(8, 10, 16, 0.85)';
    nCtx.roundRect(6, 6, 244, 52, 10);
    nCtx.fill();
    const hexColor = auraColor.toString(16).padStart(6, '0');
    nCtx.strokeStyle = `#${hexColor}`;
    nCtx.lineWidth = 2.5;
    nCtx.stroke();
    nCtx.font = 'bold 22px sans-serif';
    nCtx.fillStyle = '#ffffff';
    nCtx.textAlign = 'center';
    nCtx.textBaseline = 'middle';
    const mIcon = m.boss ? '👑' : (m.type === 'void_drake' ? '🐉' : (m.type === 'frost_revenant' ? '❄️' : (m.type === 'chaos_elemental' ? '🔥' : (m.type === 'behemoth' ? '👹' : '💀'))));
    nCtx.fillText(`${mIcon} ${m.name || 'Foe'}`, 128, 32);

    const nameTex = new THREE.CanvasTexture(nameCanvas);
    const nameMat = new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, depthTest: false });
    const nameMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), nameMat);
    nameMesh.position.set(0, size + 0.42, 0);
    group.add(nameMesh);

    group.userData = { barFill: barFill, maxBarW: barW, spriteMat: spriteMat, monster: m, auraMesh: auraMesh };

    return group;
  }

  // Cinematic Kill VFX: Floor Shockwave Ring, Rising Ethereal Soul Orb, High-Density Particle Shatter & Screen Shake
  triggerMonsterKillVFX(x, y, z, monster) {
    if (!this.scene) return;

    const mType = monster?.type || 'skeleton';
    const isBoss = !!monster?.boss;

    let primaryColor = 0xff4757;
    let accentColor = 0xffb830;
    if (mType === 'void_drake') {
      primaryColor = 0xa855f7;
      accentColor = 0x00d2d3;
    } else if (mType === 'chaos_elemental') {
      primaryColor = 0xff3838;
      accentColor = 0xfffa65;
    } else if (mType === 'frost_revenant') {
      primaryColor = 0x00d2d3;
      accentColor = 0x54a0ff;
    } else if (mType === 'blood_fiend') {
      primaryColor = 0xeb2f06;
      accentColor = 0x800000;
    } else if (mType === 'behemoth') {
      primaryColor = 0xff6b6b;
      accentColor = 0x5f27cd;
    } else if (mType === 'wraith') {
      primaryColor = 0x9b59b6;
      accentColor = 0x34495e;
    } else if (mType === 'orc') {
      primaryColor = 0x2ed573;
      accentColor = 0xf39c12;
    }

    // 1. Expanding Ground Shockwave Ring
    const ringGeo = new THREE.RingGeometry(0.25, 0.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const shockwave = new THREE.Mesh(ringGeo, ringMat);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.set(x, 0.05, z);
    this.scene.add(shockwave);

    // 2. Rising Ethereal Soul / Spirit Orb
    const orbGeo = new THREE.SphereGeometry(isBoss ? 0.38 : 0.22, 16, 16);
    const orbMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const soulOrb = new THREE.Mesh(orbGeo, orbMat);
    soulOrb.position.set(x, (y || 0) + 0.6, z);
    this.scene.add(soulOrb);

    this.killVFXList.push({
      shockwave,
      soulOrb,
      life: 0.75,
      maxLife: 0.75,
      x, y, z,
      isBoss,
      primaryColor,
      accentColor
    });

    // 3. Dense 3D Particle Shatter Explosion
    this.spawnParticleExplosion(x, (y || 0) + 0.9, z, primaryColor, isBoss ? 48 : 28);
    this.spawnParticleExplosion(x, (y || 0) + 1.2, z, accentColor, isBoss ? 32 : 16);

    // 4. 3D Slain Banner Popup
    const bannerText = isBoss ? `★ ABYSSAL TITAN SLAIN! ★` : `★ SLAIN! +${monster?.xp || 20}XP ★`;
    this.spawnDamagePopup(x, (y || 0) + 0.6, z, bannerText, isBoss ? '#fffa65' : '#ff4757', true);

    // 5. Tactile Screen Shake
    this.cameraShakeTime = isBoss ? 0.38 : 0.20;
    this.cameraShakeIntensity = isBoss ? 0.22 : 0.10;
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

    // 4. Camera Positioning per Mode (Integrated with Mouse Orbit, Pitch & Zoom)
    if (this.viewMode === 'ACTION_RPG') {
      // Modern Top-Down Isometric 3D Action RPG View with Mouse Orbit
      const baseElev = 7.0;
      const baseDist = 5.2;
      const dist = baseDist * this.cameraZoom;
      const elev = (baseElev + this.cameraPitchOffset * 3.5) * this.cameraZoom;

      const cx = this.playerPos.x + Math.sin(this.cameraYawOffset) * dist;
      const cz = this.playerPos.z + Math.cos(this.cameraYawOffset) * dist;
      const cy = this.playerPos.y + elev;

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(
        this.playerPos.x,
        this.playerPos.y + 0.9,
        this.playerPos.z
      );
    } else if (this.viewMode === 'OVER_SHOULDER') {
      // Over the shoulder 3rd person with mouse orbit & pitch
      const baseDist = 3.6;
      const baseH = 2.4;
      const dist = baseDist * this.cameraZoom;
      const elev = (baseH + this.cameraPitchOffset * 2.0) * this.cameraZoom;

      const angle = this.playerAngle + this.cameraYawOffset;
      const cx = this.playerPos.x + Math.sin(angle) * dist;
      const cz = this.playerPos.z + Math.cos(angle) * dist;
      const cy = this.playerPos.y + elev;

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(
        this.playerPos.x - Math.sin(angle) * 2.0,
        this.playerPos.y + 1.2 - this.cameraPitchOffset * 1.5,
        this.playerPos.z - Math.cos(angle) * 2.0
      );
    } else {
      // FIRST_PERSON View
      const bob = this.isMoving ? Math.sin(this.walkAnimTime) * 0.04 : 0;
      this.camera.position.set(this.playerPos.x, 1.45 + bob, this.playerPos.z);
      this.camera.rotation.set(this.pitch + this.cameraPitchOffset, this.playerAngle + this.cameraYawOffset, 0, 'YXZ');
    }

    // 4b. Tactile Camera Screen Shake for Crits and Kills
    if (this.cameraShakeTime > 0) {
      this.cameraShakeTime -= dt;
      const shakeAmt = this.cameraShakeIntensity * Math.max(0, this.cameraShakeTime / 0.35);
      this.camera.position.x += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.z += (Math.random() - 0.5) * shakeAmt;
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

    // 11. Update Kill VFX (Expanding Shockwaves & Ascending Soul Orbs)
    for (let i = this.killVFXList.length - 1; i >= 0; i--) {
      const vfx = this.killVFXList[i];
      vfx.life -= dt;
      const progress = 1.0 - (vfx.life / vfx.maxLife);
      const alpha = Math.max(0, vfx.life / vfx.maxLife);

      if (vfx.shockwave) {
        const ringScale = 1.0 + progress * (vfx.isBoss ? 5.2 : 3.4);
        vfx.shockwave.scale.set(ringScale, ringScale, 1);
        vfx.shockwave.material.opacity = alpha * 0.95;
      }

      if (vfx.soulOrb) {
        vfx.soulOrb.position.y += dt * (vfx.isBoss ? 3.0 : 2.2);
        vfx.soulOrb.position.x += Math.sin(progress * 12) * 0.02;
        vfx.soulOrb.material.opacity = alpha * 0.95;
        const orbScale = Math.max(0.2, 1.0 - progress * 0.45);
        vfx.soulOrb.scale.set(orbScale, orbScale, orbScale);
      }

      if (vfx.life <= 0) {
        if (vfx.shockwave) this.scene.remove(vfx.shockwave);
        if (vfx.soulOrb) this.scene.remove(vfx.soulOrb);
        this.killVFXList.splice(i, 1);
      }
    }

    // 12. Rotate Monster Elemental Ground Auras
    for (const [_, mMesh] of this.monsterMeshes.entries()) {
      if (mMesh.userData?.auraMesh) {
        mMesh.userData.auraMesh.rotation.z += dt * 1.8;
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
