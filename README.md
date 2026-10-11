---
title: The Abyssal Crypts 3D
emoji: 🗡️
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 8000
pinned: false
---

# ⚔ The Abyssal Crypts 3D — Modern Three.js & Python Roguelike

A full-featured **3D** dungeon crawler powered by a Python backend and a WebGL Three.js 3D rendering engine. Built with modern 2026 smooth 3D controls, camera-relative movement pacing, full 360° mouse-look, tactical turn-based & real-time combat, dynamic lighting, procedural floor biomes, and synthesized 16-bit retro audio.

🎮 **Live GitHub Pages Demo**: [https://hubg50we.github.io/abyssal-crypts-3d/](https://hubg50we.github.io/abyssal-crypts-3d/)

---

## 🛡️ Hero Classes & Abilities

| Hero Class | Role & Playstyle | Primary [Q] | Secondary [E] | Ultimate [R] |
| :--- | :--- | :--- | :--- | :--- |
| **Warrior** | High HP, frontline heavy blade | **Whirlwind [Q]** (360° cleave) | **Shield Bash [E]** (Stun & knockback) | **War Cry [R]** (Stuns foes, +50% ATK for 6s) |
| **Mage** | Ranged arcane spells, high mana | **Arcane Bolt [Q]** (Homing missile) | **Meteor Blast [E]** (Explosive 3D AoE) | **Astral Shift [R]** (Instant blink forward) |
| **Rogue** | High evasion, 200% lethal crits | **Shadow Dash [Q]** (Leaping pierce) | **Poison Dart [E]** (Toxic dart) | **Fan of Knives [R]** (360° razor flurry) |
| **Paladin** | Sacred guardian, holy spells & healing | **Holy Smite [Q]** (Radiant vertical ray) | **Holy Radiance [E]** (Heals 35 HP + burns foes) | **Aegis of Dawn [R]** (50% damage reduction barrier) |

---

## 🏰 Dynamic 3D Subterranean Biomes (Floors 1–4)

Each descending floor transforms the dungeon atmosphere with unique procedural stone textures, dynamic fog coloring, and themed torchlight:

1. **Floor 1: The Obsidian Crypts** — Dark slate granite, amber wall torches, and deep blue-grey crypt fog.
2. **Floor 2: Sunken Catacombs** — Moss-covered subterranean masonry, damp emerald torchlight, and algae-tinted fog.
3. **Floor 3: Volcanic Magma Core** — Charred basalt stonework, glowing ember wall braziers, and fiery crimson ash fog.
4. **Floor 4+: Celestial Astral Void** — Deep runic starlight masonry, cyan & violet void lanterns, and deep ethereal astral fog.

---

## 💀 Monsters & Boss Encounters

- **Classic Crypt Horrors**: Skeleton Warriors, Goblin Sneaks, Goblin Archers, Orc Berserkers, Shadow Phantoms, Blood Fiends.
- **Floor-Themed Nightmares**:
  - *Catacomb Bog Lurker* (Floor 2+): High health swamp abomination.
  - *Basalt Magma Golem* (Floor 3+): Armored volcanic juggernaut with crushing blows.
  - *Astral Void Stalker* (Floor 4+): Ethereal void entity with deadly ranged phase strikes.
  - *Malakor the Arch-Lich* (Floor 4 Boss): Final subterranean tyrant.
- **Cinematic Boss Health Dock**: Top-center HUD health bar tracks nearby bosses and elites with real-time vitality indicators.

---

## 🎮 Modern 3D Navigation & Controls

| Input | Action | Description |
| :--- | :--- | :--- |
| <kbd>W</kbd> | **Forward** | Real-time continuous forward motion with zero keyboard delay (0ms) |
| <kbd>S</kbd> | **Backward** | Smooth retreat without camera spinning |
| <kbd>A</kbd> / <kbd>D</kbd> | **Strafe / Turn** | Responsive lateral strafe or smooth 360° turn |
| <kbd>Q</kbd> / <kbd>E</kbd> / <kbd>R</kbd> | **Abilities** | Instant cast class spells and ultimates |
| <kbd>1</kbd>–<kbd>6</kbd> | **Quick Belt** | Instantly drink health potions, mana draughts, and spell scrolls |
| **Mouse Click** / <kbd>U</kbd> | **360° Mouse Look** | Lock cursor to aim & look around smoothly in 360° (<kbd>Esc</kbd> to unlock) |
| <kbd>F</kbd> / **Left Click** / <kbd>Space</kbd> | **Attack In Front** | Instant zero-delay 3D melee strike with particle arc FX |
| `⚡ Pacing` Button | **Speed Modes** | **Zero Delay (0ms Instant)** — Cycle between *Zero Delay (0ms)*, *Turbo Hyper (0ms)*, and *Agile* |
| <kbd>V</kbd> | **Toggle 3D Camera** | Switch between Action RPG, Over-the-Shoulder, and First-Person 3D views |
| <kbd>M</kbd> | **Tactical Map Scanner** | Fullscreen holographic radar with live entity telemetry |

---

## 🌐 24/7 Cloud Hosting

This repository is configured for 24/7 continuous hosting on **Hugging Face Spaces**:
- **SDK**: Docker
- **Port**: 8000
- **Uptime**: 24/7 Continuous (runs independently in the cloud)
