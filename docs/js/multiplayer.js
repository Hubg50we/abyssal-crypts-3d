/**
 * Retro Dungeon Crawler - Real-Time Online Multiplayer Engine (2026)
 * Handles room creation, party lobbies, low-latency 10Hz position synchronization,
 * party descent across procedural dungeon floors, and in-game party chat/pings.
 */

class MultiplayerClient {
  constructor() {
    this.isOnline = false;
    this.roomCode = null;
    this.playerId = null;
    this.playerName = 'Adventurer';
    this.heroClass = 'Warrior';
    this.isHost = false;
    this.otherPlayers = new Map(); // id -> player state
    this.syncTimer = null;
    this.syncIntervalMs = 90; // ~11 Hz fluid synchronization
    this.lastSyncTime = 0;
    this.ping = 0;
    this.recentChat = [];
    this.recentEvents = [];

    // Listen for room code in URL parameters (?room=CODE or ?delve=CODE)
    this.checkUrlParams();
  }

  checkUrlParams() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room') || urlParams.get('delve');
      if (roomParam) {
        this.pendingRoomCode = roomParam.toUpperCase().trim();
      }
    } catch (_) {}
  }

  getInviteUrl() {
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${this.roomCode || 'PUBLIC'}`;
  }

  async createRoom(name, heroClass, customCode = null) {
    this.playerName = name || this.playerName;
    this.heroClass = heroClass || this.heroClass;

    try {
      const res = await fetch('/api/multiplayer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.playerName,
          hero_class: this.heroClass,
          room_code: customCode
        })
      });

      if (!res.ok) throw new Error("Failed to create online chamber");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Room creation error");

      this.isOnline = true;
      this.isHost = true;
      this.roomCode = data.room_code;
      this.playerId = data.player_id;

      this.onConnected(data.seed, data.floor);
      return data;
    } catch (e) {
      console.error("Multiplayer create error:", e);
      throw e;
    }
  }

  async joinRoom(roomCode, name, heroClass) {
    this.playerName = name || this.playerName;
    this.heroClass = heroClass || this.heroClass;
    const code = (roomCode || 'PUBLIC').toUpperCase().trim();

    try {
      const res = await fetch('/api/multiplayer/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.playerName,
          hero_class: this.heroClass,
          room_code: code
        })
      });

      if (!res.ok) throw new Error("Could not join online chamber");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Join room error");

      this.isOnline = true;
      this.isHost = false;
      this.roomCode = data.room_code;
      this.playerId = data.player_id;

      if (Array.isArray(data.players)) {
        for (const p of data.players) {
          this.otherPlayers.set(p.id, p);
        }
      }

      this.onConnected(data.seed, data.floor);
      return data;
    } catch (e) {
      console.error("Multiplayer join error:", e);
      throw e;
    }
  }

  onConnected(seed, floor) {
    // Synchronize game engine to shared floor & seed
    if (window.gameEngine) {
      window.gameEngine.addLog(`🌐 Connected to Online Chamber #${this.roomCode}!`, 'gold');
      window.gameEngine.addLog(`Invite URL: ${this.getInviteUrl()}`, 'cyan');

      // Re-seed floor if different
      if (window.dungeonManager && (window.dungeonManager.seed !== seed || window.dungeonManager.floor !== floor)) {
        window.gameEngine.loadFloor(floor, seed);
      }
    }

    this.startSyncLoop();
    this.updatePartyUI();
  }

  startSyncLoop() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => this.syncTick(), this.syncIntervalMs);
  }

  stopSyncLoop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async syncTick() {
    if (!this.isOnline || !this.roomCode || !this.playerId) return;
    if (!window.gameEngine?.player) return;

    const p = window.gameEngine.player;
    const sendTime = performance.now();

    const payload = {
      room_code: this.roomCode,
      player_id: this.playerId,
      worldX: p.worldX,
      worldZ: p.worldZ,
      angle: p.angle,
      hp: p.hp,
      max_hp: p.max_hp,
      score: window.gameEngine.score,
      action: this.pendingAction || 'none'
    };
    this.pendingAction = 'none';

    try {
      const res = await fetch('/api/multiplayer/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) {
        if (data.room_closed) {
          this.leaveRoom(false);
          window.gameEngine?.addLog("⚠️ Room session expired or closed.", 'red');
        }
        return;
      }

      this.ping = Math.round(performance.now() - sendTime);

      // Check if host triggered party descent to next floor
      if (data.floor && data.seed && window.dungeonManager) {
        if (data.floor !== window.dungeonManager.floor || data.seed !== window.dungeonManager.seed) {
          window.gameEngine?.loadFloor(data.floor, data.seed);
        }
      }

      // Update other players list
      const receivedIds = new Set();
      if (Array.isArray(data.players)) {
        for (const op of data.players) {
          receivedIds.add(op.id);
          const existing = this.otherPlayers.get(op.id);
          if (existing) {
            // Smoothly update target positions
            existing.targetX = op.worldX;
            existing.targetZ = op.worldZ;
            existing.targetAngle = op.angle;
            existing.hp = op.hp;
            existing.max_hp = op.max_hp;
            existing.score = op.score;
            if (op.action && op.action !== 'none' && op.action !== existing.lastAction) {
              existing.lastAction = op.action;
              this.handleOtherPlayerAction(existing, op.action);
            }
          } else {
            // New teammate joined
            op.targetX = op.worldX;
            op.targetZ = op.worldZ;
            op.targetAngle = op.angle;
            this.otherPlayers.set(op.id, op);
            window.gameEngine?.addLog(`⚔️ ${op.name} (${op.hero_class}) joined party!`, 'gold');
            if (window.gameAudio) window.gameAudio.playLevelUp?.();
          }
        }
      }

      // Remove disconnected teammates
      for (const [id, op] of this.otherPlayers.entries()) {
        if (!receivedIds.has(id)) {
          this.otherPlayers.delete(id);
          window.engine3D?.removeOtherPlayerMesh(id);
          window.gameEngine?.addLog(`👋 ${op.name} disconnected.`, 'gray');
        }
      }

      // Sync 3D meshes in Three.js scene
      if (window.engine3D) {
        window.engine3D.syncOtherPlayers(this.otherPlayers);
      }

      // Update new events / chat
      if (Array.isArray(data.events) && data.events.length > 0) {
        const lastEvt = data.events[data.events.length - 1];
        if (lastEvt && lastEvt.time > (this.lastEventTime || 0)) {
          this.lastEventTime = lastEvt.time;
        }
      }

      this.updatePartyUI();
    } catch (err) {
      // Degrade gracefully on temporary network blips
    }
  }

  broadcastAction(actionName) {
    this.pendingAction = actionName;
  }

  handleOtherPlayerAction(p, action) {
    if (!window.engine3D) return;

    if (action === 'attack') {
      window.engine3D.spawnSlashArc(p.worldX, 0.8, p.worldZ, p.targetAngle || 0);
      try { window.gameAudio?.playAttack?.(); } catch (_) {}
    } else if (action === 'spell' || action === 'missile') {
      const tx = p.worldX + Math.sin(p.targetAngle || 0) * 6;
      const tz = p.worldZ + Math.cos(p.targetAngle || 0) * 6;
      window.engine3D.spawn3DSpell(p.worldX, p.worldZ, tx, tz, 0x00d2d3);
      try { window.gameAudio?.playSpell?.(); } catch (_) {}
    } else if (action === 'meteor') {
      const tx = p.worldX + Math.sin(p.targetAngle || 0) * 4;
      const tz = p.worldZ + Math.cos(p.targetAngle || 0) * 4;
      window.engine3D.spawnParticleExplosion(tx, 1.2, tz, 0xff5e3a, 30);
      try { window.gameAudio?.playFireball?.(); } catch (_) {}
    } else if (action === 'cleave') {
      window.engine3D.spawnSlashArc(p.worldX, 0.8, p.worldZ, 0);
      window.engine3D.spawnSlashArc(p.worldX, 0.8, p.worldZ, Math.PI);
      try { window.gameAudio?.playAttack?.(); } catch (_) {}
    }
  }

  async sendChat(msg) {
    if (!this.isOnline || !msg?.trim()) return;
    try {
      const res = await fetch('/api/multiplayer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: this.roomCode,
          player_id: this.playerId,
          message: msg.trim()
        })
      });
      if (res.ok) {
        window.gameEngine?.addLog(`[Party] You: ${msg}`, 'cyan');
      }
    } catch (_) {}
  }

  async sendPartyDescend(nextFloor) {
    if (!this.isOnline) return;
    try {
      await fetch('/api/multiplayer/descend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: this.roomCode,
          player_id: this.playerId,
          floor: nextFloor
        })
      });
    } catch (_) {}
  }

  async leaveRoom(notifyServer = true) {
    if (notifyServer && this.isOnline && this.roomCode && this.playerId) {
      try {
        fetch('/api/multiplayer/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_code: this.roomCode,
            player_id: this.playerId
          })
        });
      } catch (_) {}
    }

    this.stopSyncLoop();
    this.isOnline = false;
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;

    // Purge 3D meshes of former teammates
    for (const [id] of this.otherPlayers.entries()) {
      window.engine3D?.removeOtherPlayerMesh(id);
    }
    this.otherPlayers.clear();

    this.updatePartyUI();
    window.gameEngine?.addLog("Returned to Solo Offline Mode.", 'gray');
  }

  updatePartyUI() {
    const container = document.getElementById('onlinePartyWidget');
    if (!container) return;

    if (!this.isOnline) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    const roomBadge = document.getElementById('partyRoomCode');
    if (roomBadge) roomBadge.textContent = `#${this.roomCode}`;

    const memberList = document.getElementById('partyMemberList');
    if (memberList) {
      const p = window.gameEngine?.player;
      const myHpPct = p ? Math.max(0, Math.min(100, (p.hp / p.max_hp) * 100)) : 100;

      let html = `
        <div class="party-member-row self">
          <div class="member-info">
            <span class="member-class-badge ${this.heroClass.toLowerCase()}">${this.heroClass[0]}</span>
            <span class="member-name">${this.playerName} <small>(You)</small></span>
          </div>
          <div class="member-hp-bar">
            <div class="member-hp-fill" style="width: ${myHpPct}%;"></div>
          </div>
        </div>
      `;

      for (const [id, op] of this.otherPlayers.entries()) {
        const opHpPct = Math.max(0, Math.min(100, (op.hp / (op.max_hp || 120)) * 100));
        html += `
          <div class="party-member-row">
            <div class="member-info">
              <span class="member-class-badge ${(op.hero_class || 'warrior').toLowerCase()}">${(op.hero_class || 'W')[0]}</span>
              <span class="member-name">${op.name}</span>
            </div>
            <div class="member-hp-bar">
              <div class="member-hp-fill" style="width: ${opHpPct}%;"></div>
            </div>
          </div>
        `;
      }

      memberList.innerHTML = html;
    }

    const pingText = document.getElementById('partyPingText');
    if (pingText) pingText.textContent = `${this.ping}ms`;
  }
}

// Global multiplayer client instance
window.multiplayerClient = new MultiplayerClient();
