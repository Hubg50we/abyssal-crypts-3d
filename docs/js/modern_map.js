/**
 * The Abyssal Crypts 3D - Modern UI Map & Tactical Holographic Radar (2026 Edition)
 * Features:
 *  - Floating in-game circular Glassmorphic HUD Radar with 360° radar sweep & live compass
 *  - Range metric rings (4M / 8M / 12M) with polar crosshairs & telemetry
 *  - Real-time Player Field-of-View light cone & facing chevron
 *  - Dynamic Proximity Threat Alert (pulsing amber/crimson radar aura when foes enter 5M radius)
 *  - High-res vector rendering of dungeon architecture, doors, stairs & shrines
 *  - Fullscreen Tactical Holographic Map Modal (hotkey [M]) with exploration stats & zoom
 *  - Multi-mode Tactical Scanner (Holographic Grid mode vs Infrared Thermal mode)
 *  - Web Audio API Holographic sound generator for high-tech UI feedback
 *  - Smooth zoom controls (+ / -) and player-centered smooth camera tracking
 */

class ModernMapSystem {
  constructor() {
    // HUD Floating Radar
    this.radarCanvas = typeof document !== 'undefined' ? document.getElementById('hudRadarCanvas') : null;
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    // Fullscreen Tactical Map
    this.tacticalCanvas = typeof document !== 'undefined' ? document.getElementById('tacticalMapCanvas') : null;
    this.tacticalCtx = this.tacticalCanvas ? this.tacticalCanvas.getContext('2d') : null;

    // Sidebar Overview Canvas (if present)
    this.minimapCanvas = typeof document !== 'undefined' ? document.getElementById('minimapCanvas') : null;
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // Radar Settings & State
    this.radarZoom = 1.6; // 0.9 to 3.2
    this.tacticalZoom = 1.0; // 0.7 to 2.5
    this.tacticalMode = 'grid'; // 'grid' | 'thermal'
    this.radarSweepAngle = 0;
    this.pulseTime = 0;

    // Proximity Threat System
    this.closestEnemyDist = 999;
    this.isThreatActive = false;
    this.lastAlarmTime = 0;

    // Player tracking smoothed coordinates
    this.smoothPlayerX = 0;
    this.smoothPlayerZ = 0;

    // Compass & Telemetry
    this.bearingDegrees = 0;
    this.cardinalHeading = 'N';

    // Stats cache
    this.exploredPercent = 0;
    this.activeFoes = 0;
    this.activeLoot = 0;

    // Web Audio Synthesizer Context
    this.audioCtx = null;

    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    this.setupHighDPI(this.radarCanvas, this.radarCtx, 190, 190);
    if (this.tacticalCanvas) {
      this.setupHighDPI(this.tacticalCanvas, this.tacticalCtx, 820, 480);
    }

    // Keyboard listener: 'M' or 'm' toggles Tactical Map modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        // Prevent toggle if typing in text inputs
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        this.toggleTacticalModal();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.setupHighDPI(this.radarCanvas, this.radarCtx, 190, 190);
      if (this.tacticalCanvas) {
        this.setupHighDPI(this.tacticalCanvas, this.tacticalCtx, 820, 480);
      }
    });
  }

  // --- Audio Synthesizer Helpers ---

  initAudio() {
    if (this.audioCtx) return this.audioCtx;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    } catch (_) {
      this.audioCtx = null;
    }
    return this.audioCtx;
  }

  playRadarPingSound() {
    const ctx = this.initAudio();
    if (!ctx || ctx.state === 'suspended') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (_) {}
  }

  playMapOpenSound() {
    const ctx = this.initAudio();
    if (!ctx || ctx.state === 'suspended') return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.03);

        gain.gain.setValueAtTime(0.05, now + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.03);
        osc.stop(now + 0.25);
      });
    } catch (_) {}
  }

  setupHighDPI(canvas, ctx, cssWidth, cssHeight) {
    if (!canvas || !ctx) return;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    ctx.scale(dpr, dpr);
  }

  toggleTacticalModal() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('tacticalMapModal');
    if (!modal) return;
    if (modal.open) {
      modal.close();
    } else {
      this.playMapOpenSound();
      this.updateStats();
      modal.showModal();
      this.renderTacticalMap();
    }
  }

  toggleTacticalMode() {
    this.tacticalMode = this.tacticalMode === 'grid' ? 'thermal' : 'grid';
    this.playRadarPingSound();

    if (typeof document !== 'undefined') {
      const btn = document.getElementById('btnTacticalMode');
      if (btn) {
        btn.textContent = this.tacticalMode === 'thermal' 
          ? '🔥 Mode: Infrared Thermal' 
          : '🌡 Mode: Holographic Grid';
        btn.style.color = this.tacticalMode === 'thermal' ? 'var(--color-red)' : 'var(--color-cyan)';
      }
    }

    this.renderTacticalMap();
    if (typeof window !== 'undefined' && window.gameEngine) {
      window.gameEngine.addLog(`Tactical Map: ${this.tacticalMode.toUpperCase()} mode activated.`, 'cyan');
    }
  }

  resetTacticalZoom() {
    this.tacticalZoom = 1.0;
    this.playRadarPingSound();
    this.renderTacticalMap();
  }

  zoomRadar(delta) {
    this.radarZoom = Math.max(0.9, Math.min(3.2, this.radarZoom + delta));
    this.playRadarPingSound();
    if (typeof window !== 'undefined' && window.gameEngine) {
      window.gameEngine.addLog(`Radar Zoom: ${Math.round(this.radarZoom * 100)}%`, 'cyan');
    }
  }

  zoomTactical(delta) {
    this.tacticalZoom = Math.max(0.7, Math.min(2.5, this.tacticalZoom + delta));
    this.playRadarPingSound();
    this.renderTacticalMap();
  }

  // Calculate compass heading & cardinal direction from player angle
  computeCompassBearing(playerAngle) {
    // playerAngle in radians: 0 is North (-Z), PI/2 is West (-X), PI is South (+Z), 3PI/2 is East (+X)
    let deg = Math.round(((-playerAngle) * 180 / Math.PI) % 360);
    if (deg < 0) deg += 360;

    const cardinals = [
      { name: 'N', min: 337.5, max: 360 },
      { name: 'N', min: 0, max: 22.5 },
      { name: 'NE', min: 22.5, max: 67.5 },
      { name: 'E', min: 67.5, max: 112.5 },
      { name: 'SE', min: 112.5, max: 157.5 },
      { name: 'S', min: 157.5, max: 202.5 },
      { name: 'SW', min: 202.5, max: 247.5 },
      { name: 'W', min: 247.5, max: 292.5 },
      { name: 'NW', min: 292.5, max: 337.5 }
    ];

    const match = cardinals.find(c => deg >= c.min && deg < c.max);
    return {
      degrees: deg,
      cardinal: match ? match.name : 'N'
    };
  }

  snapToPlayer() {
    const ge = typeof window !== 'undefined' ? window.gameEngine : null;
    const p = ge?.player;
    if (!p) return;
    const u = (typeof window !== 'undefined' && window.engine3D?.unitSize) || 2.0;
    this.smoothPlayerX = p.worldX / u;
    this.smoothPlayerZ = p.worldZ / u;
  }

  update(dt) {
    this.radarSweepAngle = (this.radarSweepAngle + dt * 2.2) % (Math.PI * 2);
    this.pulseTime += dt * 3.5;

    const ge = typeof window !== 'undefined' ? window.gameEngine : null;
    const p = ge?.player;
    if (!p) return;

    const u = (typeof window !== 'undefined' && window.engine3D?.unitSize) || 2.0;
    const targetPx = p.worldX / u;
    const targetPz = p.worldZ / u;

    // Instant snap if starting at zero
    if (this.smoothPlayerX === 0 && this.smoothPlayerZ === 0 && (targetPx !== 0 || targetPz !== 0)) {
      this.smoothPlayerX = targetPx;
      this.smoothPlayerZ = targetPz;
    }

    // Smooth camera lag on radar for fluid motion
    this.smoothPlayerX += (targetPx - this.smoothPlayerX) * Math.min(1.0, dt * 12);
    this.smoothPlayerZ += (targetPz - this.smoothPlayerZ) * Math.min(1.0, dt * 12);

    // Compute Compass Heading
    const bearing = this.computeCompassBearing(p.angle);
    this.bearingDegrees = bearing.degrees;
    this.cardinalHeading = bearing.cardinal;

    this.renderHUD();

    // If tactical modal is open, re-render it
    if (typeof document !== 'undefined') {
      const modal = document.getElementById('tacticalMapModal');
      if (modal && modal.open) {
        this.renderTacticalMap();
      }
    }
  }

  updateStats() {
    const dm = typeof window !== 'undefined' ? window.dungeonManager : null;
    if (!dm) return;

    let exploredCount = 0;
    let totalWalkable = 0;
    for (let y = 0; y < dm.height; y++) {
      for (let x = 0; x < dm.width; x++) {
        if (dm.tiles[y]?.[x] !== 0 && dm.tiles[y]?.[x] !== 2) {
          totalWalkable++;
          if (dm.explored[y]?.[x]) exploredCount++;
        }
      }
    }

    this.exploredPercent = totalWalkable > 0 ? Math.round((exploredCount / totalWalkable) * 100) : 0;
    this.activeFoes = dm.monsters.filter(m => m.hp > 0).length;
    this.activeLoot = dm.items.length;

    if (typeof document === 'undefined') return;

    // Update Sidebar elements
    const fillEl = document.getElementById('hudExplorationFill');
    const pctEl = document.getElementById('hudExplorationPct');
    if (fillEl) fillEl.style.width = `${this.exploredPercent}%`;
    if (pctEl) pctEl.textContent = `${this.exploredPercent}% Mapped`;

    const foeEl = document.getElementById('sensorFoesCount');
    if (foeEl) foeEl.textContent = this.activeFoes;
    const lootEl = document.getElementById('sensorLootCount');
    if (lootEl) lootEl.textContent = this.activeLoot;

    const stairsEl = document.getElementById('sensorStairsStatus');
    if (stairsEl && dm.stairs) {
      const isExplored = dm.explored[dm.stairs.y]?.[dm.stairs.x];
      stairsEl.textContent = isExplored ? 'Located ⚡' : 'Searching...';
      stairsEl.style.color = isExplored ? 'var(--color-cyan)' : 'var(--color-gold)';
    }

    // Update Tactical Modal elements
    const modalPct = document.getElementById('tacticalExplorationText');
    if (modalPct) modalPct.textContent = `${this.exploredPercent}% Mapped`;
    const modalFoes = document.getElementById('tacticalHostilesText');
    if (modalFoes) modalFoes.textContent = `${this.activeFoes} Active`;
    const modalLoot = document.getElementById('tacticalLootText');
    if (modalLoot) modalLoot.textContent = `${this.activeLoot} Detected`;
    const modalGate = document.getElementById('tacticalGateText');
    if (modalGate && dm.stairs) {
      const isExplored = dm.explored[dm.stairs.y]?.[dm.stairs.x];
      modalGate.textContent = isExplored ? `Located (${dm.stairs.x}, ${dm.stairs.y})` : 'Undiscovered';
    }
  }

  // --- 1. Render Floating In-Game HUD Radar (Top-Right Circular) ---

  renderHUD() {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = 190;
    const h = 190;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = w / 2 - 4;

    ctx.clearRect(0, 0, w, h);

    const dm = typeof window !== 'undefined' ? window.dungeonManager : null;
    const ge = typeof window !== 'undefined' ? window.gameEngine : null;
    const p = ge?.player;
    if (!dm || !p) return;

    // 1. Clip to Circle with Soft Outer Shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Dark Obsidian Glass Backdrop
    const bgGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius);
    bgGrad.addColorStop(0, '#0c101d');
    bgGrad.addColorStop(0.75, '#070a13');
    bgGrad.addColorStop(1, '#030509');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Polar Grid Metric Rings with Distance Labels (4M, 8M, 12M)
    const ringRadii = [
      { r: radius * 0.35, label: '4M' },
      { r: radius * 0.68, label: '8M' },
      { r: radius * 0.96, label: '12M' }
    ];

    ctx.lineWidth = 1;
    ringRadii.forEach(ring => {
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.09)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring.r, 0, Math.PI * 2);
      ctx.stroke();

      // Metric Badge text along 45° line
      ctx.fillStyle = 'rgba(0, 245, 212, 0.35)';
      ctx.font = '700 8px Outfit, sans-serif';
      const labelAngle = Math.PI * 0.25;
      const lx = centerX + Math.cos(labelAngle) * (ring.r - 2);
      const ly = centerY + Math.sin(labelAngle) * (ring.r - 2);
      ctx.fillText(ring.label, lx, ly);
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.06)';
    ctx.beginPath();
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h);
    ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
    ctx.stroke();

    // 2. Render Dungeon Geometry (Centered on smooth player coords)
    const tileSize = 12 * this.radarZoom;
    const px = this.smoothPlayerX;
    const py = this.smoothPlayerZ;

    const minX = Math.max(0, Math.floor(px - radius / tileSize - 1));
    const maxX = Math.min(dm.width - 1, Math.ceil(px + radius / tileSize + 1));
    const minY = Math.max(0, Math.floor(py - radius / tileSize - 1));
    const maxY = Math.min(dm.height - 1, Math.ceil(py + radius / tileSize + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const isExplored = dm.explored[y]?.[x];
        if (!isExplored) continue;

        const isVisible = dm.visible[y]?.[x];
        const screenX = centerX + (x - px) * tileSize - tileSize / 2;
        const screenY = centerY + (y - py) * tileSize - tileSize / 2;

        const tile = dm.tiles[y][x];

        if (tile === 2) {
          // Solid Wall
          ctx.fillStyle = isVisible ? '#27344e' : '#141a27';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);

          // Runic neon edge border for walls
          ctx.strokeStyle = isVisible ? 'rgba(0, 245, 212, 0.3)' : 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, tileSize - 1, tileSize - 1);
        } else if (tile === 3 || tile === 4) {
          // Doors
          ctx.fillStyle = '#f39c12';
          ctx.fillRect(screenX + tileSize * 0.2, screenY + tileSize * 0.2, tileSize * 0.6, tileSize * 0.6);
        } else {
          // Walkable Floor / Corridor
          ctx.fillStyle = isVisible ? 'rgba(0, 245, 212, 0.14)' : 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
        }
      }
    }

    // 3. Render Stairs to Next Floor
    if (dm.stairs && dm.explored[dm.stairs.y]?.[dm.stairs.x]) {
      const sx = centerX + (dm.stairs.x - px) * tileSize;
      const sy = centerY + (dm.stairs.y - py) * tileSize;

      const pulse = 4 + Math.sin(this.pulseTime) * 2;
      ctx.fillStyle = '#00f5d4';
      ctx.shadowColor = '#00f5d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Concentric beacon wave
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
      ctx.beginPath();
      ctx.arc(sx, sy, pulse + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Render Ground Items & Relics
    for (const it of dm.items) {
      if (!dm.explored[it.y]?.[it.x]) continue;
      const ix = centerX + (it.x - px) * tileSize;
      const iy = centerY + (it.y - py) * tileSize;

      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ix, iy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Render Monsters & Check Proximity Threats
    const u = (typeof window !== 'undefined' && window.engine3D?.unitSize) || 2.0;
    let minEnemyDist = 999;

    for (const m of dm.monsters) {
      if (m.hp <= 0) continue;
      const mx = m.worldX / u;
      const my = m.worldZ / u;

      const distFromPlayer = Math.hypot(mx - px, my - py);
      if (distFromPlayer < minEnemyDist) {
        minEnemyDist = distFromPlayer;
      }

      // Check distance from player for radar detection (~16 units)
      if (distFromPlayer > 16) continue;

      const screenMx = centerX + (mx - px) * tileSize;
      const screenMy = centerY + (my - py) * tileSize;

      const mColor = m.boss ? '#ff3838' : '#ff4757';
      const mSize = m.boss ? 5.5 : 3.8;

      ctx.fillStyle = mColor;
      ctx.shadowColor = mColor;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(screenMx, screenMy, mSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Boss pulsing alert ring
      if (m.boss) {
        ctx.strokeStyle = 'rgba(255, 56, 56, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(screenMx, screenMy, mSize + 3 + Math.sin(this.pulseTime * 2) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    this.closestEnemyDist = minEnemyDist;
    this.isThreatActive = minEnemyDist <= 5.0;

    // Handle Proximity Threat Alert UI Styling
    if (typeof document !== 'undefined') {
      const radarCard = document.querySelector('.radar-card');
      const telemetryPill = document.getElementById('radarTelemetry');
      if (radarCard && telemetryPill) {
        if (this.isThreatActive) {
          radarCard.classList.add('threat-alert');
          telemetryPill.classList.add('threat');
        } else {
          radarCard.classList.remove('threat-alert');
          telemetryPill.classList.remove('threat');
        }
      }
    }

    // 6. Player Vision Cone (Light Beam emanating from hero)
    ctx.save();
    ctx.translate(centerX, centerY);
    const screenHeading = -p.angle - Math.PI / 2;
    ctx.rotate(screenHeading);

    const coneGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 55 * this.radarZoom);
    coneGrad.addColorStop(0, 'rgba(0, 245, 212, 0.35)');
    coneGrad.addColorStop(0.7, 'rgba(0, 245, 212, 0.08)');
    coneGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 55 * this.radarZoom, -Math.PI * 0.22, Math.PI * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 7. Player Icon (Golden Glowing Arrowhead Chevron)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(screenHeading);

    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing core pip
    ctx.fillStyle = '#00f5d4';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 8. Rotating Radar Sweep Wave
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.radarSweepAngle);

    const sweepGrad = ctx.createLinearGradient(0, 0, radius, 0);
    sweepGrad.addColorStop(0, 'rgba(0, 245, 212, 0.25)');
    sweepGrad.addColorStop(1, 'rgba(0, 245, 212, 0.0)');

    ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();

    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -0.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 9. Soft Vignette Inner Shadow
    const innerShadow = ctx.createRadialGradient(centerX, centerY, radius - 15, centerX, centerY, radius);
    innerShadow.addColorStop(0, 'rgba(0,0,0,0)');
    innerShadow.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = innerShadow;
    ctx.fillRect(0, 0, w, h);

    ctx.restore(); // Restore outer clip

    // 10. Outer Tech Ring & Neon Trim
    ctx.strokeStyle = this.isThreatActive ? 'rgba(255, 71, 87, 0.85)' : 'rgba(0, 245, 212, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing Runic Degree Notches
    ctx.strokeStyle = 'rgba(255, 184, 48, 0.35)';
    ctx.lineWidth = 1.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const x1 = centerX + Math.cos(a) * (radius - 5);
      const y1 = centerY + Math.sin(a) * (radius - 5);
      const x2 = centerX + Math.cos(a) * radius;
      const y2 = centerY + Math.sin(a) * radius;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 11. Live Telemetry Badge Updates
    if (typeof document !== 'undefined') {
      const coordEl = document.getElementById('radarCoordText');
      if (coordEl) {
        if (this.isThreatActive) {
          coordEl.textContent = `⚠️ FOE: ${this.closestEnemyDist.toFixed(1)}M`;
        } else {
          coordEl.textContent = `X: ${Math.round(px)}, Y: ${Math.round(py)}`;
        }
      }

      const floorEl = document.getElementById('radarFloorText');
      if (floorEl) {
        floorEl.textContent = `3D Floor ${dm.floor}`;
      }

      const bearingEl = document.getElementById('radarBearingText');
      if (bearingEl) {
        const padDeg = String(this.bearingDegrees).padStart(3, '0');
        bearingEl.textContent = `${padDeg}° ${this.cardinalHeading}`;
      }
    }
  }

  // --- 2. Render Fullscreen Holographic Tactical Map Modal ---

  renderTacticalMap() {
    if (!this.tacticalCtx || !this.tacticalCanvas) return;
    const ctx = this.tacticalCtx;
    const w = 820;
    const h = 480;

    ctx.clearRect(0, 0, w, h);

    const dm = typeof window !== 'undefined' ? window.dungeonManager : null;
    const ge = typeof window !== 'undefined' ? window.gameEngine : null;
    const p = ge?.player;
    if (!dm || !p) return;

    const isThermal = this.tacticalMode === 'thermal';

    // Dark Obsidian Canvas Background with Cybernetic Grid
    ctx.fillStyle = isThermal ? '#08050e' : '#070a12';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = isThermal ? 'rgba(255, 71, 87, 0.05)' : 'rgba(0, 245, 212, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Auto-fit Dungeon to tactical canvas or center on player when zoomed in
    const margin = 36;
    const baseScale = Math.min((w - margin * 2) / dm.width, (h - margin * 2) / dm.height);
    const scale = baseScale * this.tacticalZoom;

    const u = (typeof window !== 'undefined' && window.engine3D?.unitSize) || 2.0;
    const px = p.worldX / u;
    const py = p.worldZ / u;

    let offsetX, offsetY;
    if (this.tacticalZoom > 1.0) {
      offsetX = w / 2 - px * scale;
      offsetY = h / 2 - py * scale;
    } else {
      offsetX = (w - dm.width * scale) / 2;
      offsetY = (h - dm.height * scale) / 2;
    }

    // 1. Render Explored Map Architecture
    for (let y = 0; y < dm.height; y++) {
      for (let x = 0; x < dm.width; x++) {
        const isExplored = dm.explored[y]?.[x];
        const isVisible = dm.visible[y]?.[x];

        if (!isExplored) continue;

        const tile = dm.tiles[y][x];
        const tx = offsetX + (x - 0.5) * scale;
        const ty = offsetY + (y - 0.5) * scale;

        if (tile === 2) {
          // Walls
          ctx.fillStyle = isThermal 
            ? (isVisible ? '#1f132e' : '#110a1c')
            : (isVisible ? '#27344e' : '#141b2a');
          ctx.fillRect(tx, ty, scale + 0.5, scale + 0.5);

          ctx.strokeStyle = isThermal 
            ? (isVisible ? 'rgba(255, 71, 87, 0.25)' : 'rgba(255, 255, 255, 0.04)')
            : (isVisible ? 'rgba(0, 245, 212, 0.35)' : 'rgba(255, 255, 255, 0.06)');
          ctx.lineWidth = 1;
          ctx.strokeRect(tx + 0.5, ty + 0.5, scale - 1, scale - 1);
        } else if (tile === 3 || tile === 4) {
          // Doors
          ctx.fillStyle = '#f39c12';
          ctx.fillRect(tx + scale * 0.15, ty + scale * 0.15, scale * 0.7, scale * 0.7);
        } else {
          // Explored Floor
          ctx.fillStyle = isThermal
            ? (isVisible ? 'rgba(255, 107, 129, 0.12)' : 'rgba(52, 31, 151, 0.08)')
            : (isVisible ? 'rgba(0, 245, 212, 0.12)' : 'rgba(255, 255, 255, 0.04)');
          ctx.fillRect(tx, ty, scale + 0.5, scale + 0.5);
        }
      }
    }

    // 2. Render Stairs Gateway
    if (dm.stairs && dm.explored[dm.stairs.y]?.[dm.stairs.x]) {
      const sx = offsetX + dm.stairs.x * scale;
      const sy = offsetY + dm.stairs.y * scale;

      ctx.fillStyle = '#00f5d4';
      ctx.shadowColor = '#00f5d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(sx, sy, scale * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Stairs label
      ctx.fillStyle = '#00f5d4';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STAIRS DOWN', sx, sy - scale * 0.7);
    }

    // 3. Render Items & Relics
    for (const it of dm.items) {
      if (!dm.explored[it.y]?.[it.x]) continue;
      const ix = offsetX + it.x * scale;
      const iy = offsetY + it.y * scale;

      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ix, iy, scale * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 4. Render Active Monsters
    for (const m of dm.monsters) {
      if (m.hp <= 0) continue;
      const gx = m.worldX / u;
      const gy = m.worldZ / u;

      const mx = offsetX + gx * scale;
      const my = offsetY + gy * scale;

      // In Thermal mode, draw an infrared radiant bloom
      if (isThermal) {
        const heatGrad = ctx.createRadialGradient(mx, my, scale * 0.2, mx, my, scale * 1.8);
        heatGrad.addColorStop(0, m.boss ? 'rgba(255, 56, 56, 0.75)' : 'rgba(255, 107, 129, 0.6)');
        heatGrad.addColorStop(0.5, 'rgba(255, 165, 2, 0.25)');
        heatGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(mx, my, scale * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = m.boss ? '#ff3838' : '#e74c3c';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(mx, my, scale * (m.boss ? 0.65 : 0.42), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Render Hero Marker & Vision Cone
    const screenPx = offsetX + px * scale;
    const screenPy = offsetY + py * scale;

    const screenHeading = -p.angle - Math.PI / 2;

    // Vision cone
    ctx.save();
    ctx.translate(screenPx, screenPy);
    ctx.rotate(screenHeading);
    ctx.fillStyle = isThermal ? 'rgba(255, 209, 102, 0.18)' : 'rgba(0, 245, 212, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, scale * 5.0, -Math.PI * 0.25, Math.PI * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Hero chevron
    ctx.save();
    ctx.translate(screenPx, screenPy);
    ctx.rotate(screenHeading);

    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Hero pulse wave
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screenPx, screenPy, 14 + Math.sin(this.pulseTime) * 4, 0, Math.PI * 2);
    ctx.stroke();

    // 6. Cybernetic Scanline Sweep Overlay
    const scanlineY = ((Date.now() / 25) % h);
    ctx.strokeStyle = isThermal ? 'rgba(255, 71, 87, 0.15)' : 'rgba(0, 245, 212, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, scanlineY);
    ctx.lineTo(w, scanlineY);
    ctx.stroke();
  }
}

// Global modern map instance
if (typeof window !== 'undefined') {
  window.modernMap = null;
  window.addEventListener('DOMContentLoaded', () => {
    window.modernMap = new ModernMapSystem();
  });
}

// Node.js module export for headless tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModernMapSystem };
}
