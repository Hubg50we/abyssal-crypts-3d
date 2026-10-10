# ⚔ The Abyssal Crypts 3D — Modern Three.js & Python Roguelike

A full-featured **3D** dungeon crawler powered by a Python backend and a WebGL Three.js 3D rendering engine. Built with modern 2026 smooth 3D controls, camera-relative movement pacing, full 360° mouse-look, tactical turn-based combat, dynamic lighting, and synthesized 16-bit retro audio.

---

## 🎮 Modern 3D Navigation & Controls

| Input | Action | Description |
| :--- | :--- | :--- |
| <kbd>W</kbd> | **Forward** | Smooth, paced step in the direction you are facing |
| <kbd>S</kbd> | **Backward** | Smooth retreat without spinning |
| <kbd>A</kbd> / <kbd>D</kbd> | **Turn Left / Right** | 90° smooth turn (or strafe in Strafe mode) |
| <kbd>Q</kbd> / <kbd>E</kbd> | **Turn Left / Right** | Dedicated smooth 90° pivots |
| <kbd>Z</kbd> / <kbd>C</kbd> | **Strafe** | Sidestep left / right |
| **Mouse Click** | **360° Mouse Look** | Click canvas to lock cursor and look around smoothly in 360° (<kbd>Esc</kbd> to unlock) |
| <kbd>F</kbd> or **Left Click** | **Attack In Front** | Swing 3D weapon at target directly in front of you |
| `⚡ Pacing` Button | **Speed Modes** | Cycle between *Normal (220ms)*, *Tactical / Slow (340ms)*, and *Brisk (160ms)* |
| <kbd>V</kbd> | **Toggle 1st / 3rd Person** | Switch between First-Person and Third-Person 3D views |
| <kbd>Space</kbd> | **Rest** | Wait 1 turn to recharge Mana |

---

## 🚀 How to Run

1. Open your terminal in the game directory:
   ```bash
   cd "C:\Users\Administrator\.gemini\antigravity-ide\scratch\retro-dungeon-crawler"
   ```

2. Start the Python server:
   ```bash
   python server.py
   ```

3. Open your browser:
   ```
   http://localhost:8000
   ```
