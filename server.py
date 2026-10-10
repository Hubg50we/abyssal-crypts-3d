"""
Retro Dungeon Crawler - Python Game Server
Serves static game client and provides procedural generation & persistence APIs.
"""

import http.server
import json
import math
import os
import random
import sys
import threading
import time
from typing import Dict, List, Any, Tuple

PORT = int(os.environ.get("PORT", 8000))
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

os.makedirs(DATA_DIR, exist_ok=True)
LEADERBOARD_FILE = os.path.join(DATA_DIR, "leaderboard.json")
SAVE_FILE = os.path.join(DATA_DIR, "savegame.json")

# Tile constants
TILE_EMPTY = 0
TILE_FLOOR = 1
TILE_WALL = 2
TILE_DOOR_CLOSED = 3
TILE_DOOR_OPEN = 4
TILE_STAIRS_DOWN = 5
TILE_WATER = 6
TILE_LAVA = 7
TILE_TRAP = 8

# Initialize default leaderboard if missing
if not os.path.exists(LEADERBOARD_FILE):
    default_scores = [
        {"name": "Valerius the Bold", "hero_class": "Warrior", "floor": 4, "gold": 840, "kills": 38, "score": 4920, "date": "Ancient Record"},
        {"name": "Elysia Shadowstep", "hero_class": "Rogue", "floor": 3, "gold": 620, "kills": 29, "score": 3480, "date": "Ancient Record"},
        {"name": "Archmage Vaelin", "hero_class": "Mage", "floor": 3, "gold": 510, "kills": 24, "score": 2890, "date": "Ancient Record"},
        {"name": "Krag Ironbreaker", "hero_class": "Warrior", "floor": 2, "gold": 310, "kills": 16, "score": 1720, "date": "Ancient Record"},
        {"name": "Lyra Whisperwind", "hero_class": "Rogue", "floor": 2, "gold": 220, "kills": 11, "score": 1180, "date": "Ancient Record"},
    ]
    with open(LEADERBOARD_FILE, "w", encoding="utf-8") as f:
        json.dump(default_scores, f, indent=2)


class MultiplayerManager:
    """Thread-safe in-memory state manager for online co-op delves."""

    def __init__(self):
        self.lock = threading.Lock()
        self.rooms: Dict[str, Dict[str, Any]] = {}
        self._ensure_room("PUBLIC", seed=1001, floor=1)

    def _ensure_room(self, code: str, seed: int = None, floor: int = 1) -> Dict[str, Any]:
        if code not in self.rooms:
            self.rooms[code] = {
                "code": code,
                "seed": seed if seed is not None else random.randint(100000, 999999),
                "floor": floor,
                "created_at": time.time(),
                "players": {},
                "chat": [],
                "events": [{"text": f"Dungeon Chamber {code} formed.", "time": time.time()}]
            }
        return self.rooms[code]

    def create_room(self, name: str, hero_class: str, room_code: str = None) -> Dict[str, Any]:
        with self.lock:
            code = (room_code or "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=5))).upper().strip()
            seed = random.randint(100000, 999999)
            room = self._ensure_room(code, seed=seed, floor=1)
            player_id = f"p_{int(time.time() * 1000)}_{random.randint(100, 999)}"
            room["players"][player_id] = {
                "id": player_id,
                "name": name or "Adventurer",
                "hero_class": hero_class or "Warrior",
                "worldX": 0.0,
                "worldZ": 0.0,
                "angle": 0.0,
                "hp": 120,
                "max_hp": 120,
                "action": "none",
                "action_time": 0,
                "score": 0,
                "last_seen": time.time()
            }
            room["events"].append({"text": f"👑 {name} opened Delve #{code}!", "time": time.time()})
            return {
                "success": True,
                "room_code": code,
                "player_id": player_id,
                "seed": room["seed"],
                "floor": room["floor"],
                "is_host": True
            }

    def join_room(self, room_code: str, name: str, hero_class: str) -> Dict[str, Any]:
        with self.lock:
            code = (room_code or "PUBLIC").upper().strip()
            self._cleanup_inactive_locked(code)
            room = self._ensure_room(code)
            player_id = f"p_{int(time.time() * 1000)}_{random.randint(100, 999)}"
            room["players"][player_id] = {
                "id": player_id,
                "name": name or "Adventurer",
                "hero_class": hero_class or "Warrior",
                "worldX": 0.0,
                "worldZ": 0.0,
                "angle": 0.0,
                "hp": 120,
                "max_hp": 120,
                "action": "none",
                "action_time": 0,
                "score": 0,
                "last_seen": time.time()
            }
            room["events"].append({"text": f"⚔️ {name} joined the delve!", "time": time.time()})
            other_players = [p for pid, p in room["players"].items() if pid != player_id]
            return {
                "success": True,
                "room_code": code,
                "player_id": player_id,
                "seed": room["seed"],
                "floor": room["floor"],
                "players": other_players,
                "chat": room["chat"][-15:],
                "events": room["events"][-10:]
            }

    def sync_player(self, room_code: str, player_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            code = (room_code or "PUBLIC").upper().strip()
            if code not in self.rooms:
                return {"success": False, "error": "Room not found", "room_closed": True}
            room = self.rooms[code]
            now = time.time()
            if player_id in room["players"]:
                p = room["players"][player_id]
                p["worldX"] = float(data.get("worldX", p["worldX"]))
                p["worldZ"] = float(data.get("worldZ", p["worldZ"]))
                p["angle"] = float(data.get("angle", p["angle"]))
                p["hp"] = int(data.get("hp", p["hp"]))
                p["max_hp"] = int(data.get("max_hp", p["max_hp"]))
                p["score"] = int(data.get("score", p["score"]))
                if "action" in data and data["action"] != "none":
                    p["action"] = data["action"]
                    p["action_time"] = now
                elif now - p.get("action_time", 0) > 0.6:
                    p["action"] = "none"
                p["last_seen"] = now

            self._cleanup_inactive_locked(code)
            other_players = [p for pid, p in room["players"].items() if pid != player_id]
            return {
                "success": True,
                "floor": room["floor"],
                "seed": room["seed"],
                "players": other_players,
                "chat": room["chat"][-10:],
                "events": room["events"][-6:]
            }

    def send_chat(self, room_code: str, player_id: str, message: str) -> Dict[str, Any]:
        with self.lock:
            code = (room_code or "PUBLIC").upper().strip()
            if code not in self.rooms:
                return {"success": False, "error": "Room not found"}
            room = self.rooms[code]
            sender_name = room["players"].get(player_id, {}).get("name", "Hero")
            hero_class = room["players"].get(player_id, {}).get("hero_class", "Warrior")
            msg_obj = {
                "sender": sender_name,
                "hero_class": hero_class,
                "text": str(message).strip()[:140],
                "time": time.time()
            }
            room["chat"].append(msg_obj)
            room["chat"] = room["chat"][-30:]
            return {"success": True, "message": msg_obj}

    def descend_party(self, room_code: str, player_id: str, next_floor: int) -> Dict[str, Any]:
        with self.lock:
            code = (room_code or "PUBLIC").upper().strip()
            if code not in self.rooms:
                return {"success": False, "error": "Room not found"}
            room = self.rooms[code]
            room["floor"] = int(next_floor)
            room["seed"] = random.randint(100000, 999999)
            sender_name = room["players"].get(player_id, {}).get("name", "Hero")
            room["events"].append({"text": f"🚪 {sender_name} led the party down to Floor {next_floor}!", "time": time.time()})
            return {"success": True, "floor": room["floor"], "seed": room["seed"]}

    def leave_room(self, room_code: str, player_id: str) -> Dict[str, Any]:
        with self.lock:
            code = (room_code or "PUBLIC").upper().strip()
            if code in self.rooms and player_id in self.rooms[code]["players"]:
                name = self.rooms[code]["players"][player_id].get("name", "Hero")
                del self.rooms[code]["players"][player_id]
                self.rooms[code]["events"].append({"text": f"👋 {name} departed the delve.", "time": time.time()})
            return {"success": True}

    def list_rooms(self) -> List[Dict[str, Any]]:
        with self.lock:
            now = time.time()
            res = []
            for code, r in list(self.rooms.items()):
                active_count = sum(1 for p in r["players"].values() if now - p["last_seen"] < 12)
                if active_count > 0 or code == "PUBLIC":
                    res.append({
                        "code": code,
                        "player_count": active_count,
                        "floor": r["floor"],
                        "age_seconds": int(now - r["created_at"])
                    })
            return res

    def _cleanup_inactive_locked(self, code: str, timeout: float = 12.0):
        if code in self.rooms:
            now = time.time()
            room = self.rooms[code]
            for pid in list(room["players"].keys()):
                if now - room["players"][pid]["last_seen"] > timeout:
                    name = room["players"][pid].get("name", "Hero")
                    del room["players"][pid]
                    room["events"].append({"text": f"⏳ {name} timed out.", "time": now})


multiplayer_manager = MultiplayerManager()


class DungeonGenerator:
    """Procedural BSP and corridor carver for rogue-like dungeons."""

    def __init__(self, width: int = 50, height: int = 35, floor_level: int = 1, seed: int = None):
        self.width = width
        self.height = height
        self.floor = floor_level
        self.seed = seed if seed is not None else random.randint(100000, 999999)
        self.rng = random.Random(self.seed)
        self.grid = [[TILE_WALL for _ in range(width)] for _ in range(height)]
        self.rooms: List[Dict[str, int]] = []
        self.doors: List[Dict[str, int]] = []
        self.torches: List[Dict[str, int]] = []
        self.traps: List[Dict[str, int]] = []
        self.stairs_down: Dict[str, int] = {"x": 0, "y": 0}
        self.spawn_point: Dict[str, int] = {"x": 0, "y": 0}
        self.monsters: List[Dict[str, Any]] = []
        self.items: List[Dict[str, Any]] = []
        self.shrines: List[Dict[str, Any]] = []

    def generate(self) -> Dict[str, Any]:
        # Generate partitioned rooms
        self._carve_bsp_rooms()
        self._connect_rooms()
        self._place_features()
        self._populate_monsters()
        self._populate_loot()
        self._populate_shrines()

        return {
            "seed": self.seed,
            "floor": self.floor,
            "width": self.width,
            "height": self.height,
            "tiles": self.grid,
            "rooms": self.rooms,
            "torches": self.torches,
            "spawn": self.spawn_point,
            "stairs": self.stairs_down,
            "monsters": self.monsters,
            "items": self.items,
            "shrines": self.shrines,
            "traps": self.traps
        }

    def _carve_bsp_rooms(self):
        # Recursive space partition nodes
        class Leaf:
            def __init__(self, x, y, w, h, rng):
                self.x = x
                self.y = y
                self.w = w
                self.h = h
                self.rng = rng
                self.left = None
                self.right = None
                self.room = None

            def split(self) -> bool:
                if self.left or self.right:
                    return False
                # Determine direction of split
                split_h = self.rng.choice([True, False])
                if self.w > self.h and self.w / self.h >= 1.25:
                    split_h = False
                elif self.h > self.w and self.h / self.w >= 1.25:
                    split_h = True

                max_size = (self.h if split_h else self.w) - 7
                if max_size <= 7:
                    return False

                split_pos = self.rng.randint(7, max_size)

                if split_h:
                    self.left = Leaf(self.x, self.y, self.w, split_pos, self.rng)
                    self.right = Leaf(self.x, self.y + split_pos, self.w, self.h - split_pos, self.rng)
                else:
                    self.left = Leaf(self.x, self.y, split_pos, self.h, self.rng)
                    self.right = Leaf(self.x + split_pos, self.y, self.w - split_pos, self.h, self.rng)
                return True

            def create_rooms(self, dungeon):
                if self.left or self.right:
                    if self.left:
                        self.left.create_rooms(dungeon)
                    if self.right:
                        self.right.create_rooms(dungeon)
                else:
                    # Carve a room inside leaf bounds
                    room_w = self.rng.randint(max(4, self.w - 5), max(5, self.w - 2))
                    room_h = self.rng.randint(max(4, self.h - 5), max(5, self.h - 2))
                    room_x = self.x + self.rng.randint(1, max(1, self.w - room_w - 1))
                    room_y = self.y + self.rng.randint(1, max(1, self.h - room_h - 1))

                    room_dict = {"x": room_x, "y": room_y, "w": room_w, "h": room_h}
                    self.room = room_dict
                    dungeon.rooms.append(room_dict)

                    for ry in range(room_y, room_y + room_h):
                        for rx in range(room_x, room_x + room_w):
                            if 1 <= rx < dungeon.width - 1 and 1 <= ry < dungeon.height - 1:
                                dungeon.grid[ry][rx] = TILE_FLOOR

        root = Leaf(1, 1, self.width - 2, self.height - 2, self.rng)
        leaves = [root]
        did_split = True
        iterations = 0
        while did_split and iterations < 18:
            did_split = False
            for leaf in list(leaves):
                if leaf.left is None and leaf.right is None:
                    if leaf.w > 12 or leaf.h > 12 or self.rng.random() > 0.3:
                        if leaf.split():
                            leaves.append(leaf.left)
                            leaves.append(leaf.right)
                            did_split = True
            iterations += 1

        root.create_rooms(self)

    def _connect_rooms(self):
        # Sort rooms by center coordinate to connect neighbors
        if not self.rooms:
            return

        for i in range(len(self.rooms) - 1):
            r1 = self.rooms[i]
            r2 = self.rooms[i + 1]

            x1 = r1["x"] + r1["w"] // 2
            y1 = r1["y"] + r1["h"] // 2
            x2 = r2["x"] + r2["w"] // 2
            y2 = r2["y"] + r2["h"] // 2

            # L-shaped corridor
            if self.rng.choice([True, False]):
                self._carve_h_tunnel(x1, x2, y1)
                self._carve_v_tunnel(y1, y2, x2)
            else:
                self._carve_v_tunnel(y1, y2, x1)
                self._carve_h_tunnel(x1, x2, y2)

        # Also connect a few random pairs for looping paths
        if len(self.rooms) > 3:
            for _ in range(min(3, len(self.rooms) // 2)):
                rA = self.rng.choice(self.rooms)
                rB = self.rng.choice(self.rooms)
                if rA != rB:
                    xA = rA["x"] + rA["w"] // 2
                    yA = rA["y"] + rA["h"] // 2
                    xB = rB["x"] + rB["w"] // 2
                    yB = rB["y"] + rB["h"] // 2
                    self._carve_h_tunnel(xA, xB, yA)
                    self._carve_v_tunnel(yA, yB, xB)

    def _carve_h_tunnel(self, x1: int, x2: int, y: int):
        for x in range(min(x1, x2), max(x1, x2) + 1):
            if 1 <= x < self.width - 1 and 1 <= y < self.height - 1:
                self.grid[y][x] = TILE_FLOOR

    def _carve_v_tunnel(self, y1: int, y2: int, x: int):
        for y in range(min(y1, y2), max(y1, y2) + 1):
            if 1 <= x < self.width - 1 and 1 <= y < self.height - 1:
                self.grid[y][x] = TILE_FLOOR

    def _place_features(self):
        if not self.rooms:
            return

        # Player spawn in first room
        first_room = self.rooms[0]
        self.spawn_point = {
            "x": first_room["x"] + first_room["w"] // 2,
            "y": first_room["y"] + first_room["h"] // 2
        }

        # Stairs down in furthest room
        last_room = self.rooms[-1]
        self.stairs_down = {
            "x": last_room["x"] + last_room["w"] // 2,
            "y": last_room["y"] + last_room["h"] // 2
        }
        self.grid[self.stairs_down["y"]][self.stairs_down["x"]] = TILE_STAIRS_DOWN

        # Place wall torches around rooms for atmosphere
        for room in self.rooms:
            # North wall torch
            if self.rng.random() < 0.7:
                tx = room["x"] + room["w"] // 2
                ty = room["y"]
                self.torches.append({"x": tx, "y": ty, "color": "#ffaa22", "intensity": 1.0})
            if self.rng.random() < 0.4:
                tx = room["x"] + 1
                ty = room["y"] + room["h"] // 2
                self.torches.append({"x": tx, "y": ty, "color": "#ff7700", "intensity": 0.85})

        # Place hidden traps in some corridors and rooms
        for room in self.rooms[1:]:
            if self.rng.random() < 0.5:
                trap_x = self.rng.randint(room["x"] + 1, room["x"] + room["w"] - 2)
                trap_y = self.rng.randint(room["y"] + 1, room["y"] + room["h"] - 2)
                if (trap_x, trap_y) != (self.spawn_point["x"], self.spawn_point["y"]) and (trap_x, trap_y) != (self.stairs_down["x"], self.stairs_down["y"]):
                    self.traps.append({"x": trap_x, "y": trap_y, "type": "spike", "damage": 8 + self.floor * 4})

    def _populate_monsters(self):
        monster_types = [
            {"type": "skeleton", "name": "Skeleton Guard", "hp": 22, "atk": 7, "def": 2, "xp": 18, "icon": "skeleton", "color": "#e0e0e0"},
            {"type": "goblin", "name": "Goblin Archer", "hp": 16, "atk": 9, "def": 1, "xp": 22, "icon": "goblin", "color": "#44bd32", "ranged": True},
            {"type": "slime", "name": "Abyssal Slime", "hp": 28, "atk": 5, "def": 3, "xp": 15, "icon": "slime", "color": "#9c88ff"},
            {"type": "shade", "name": "Crypt Phantom", "hp": 20, "atk": 11, "def": 0, "xp": 30, "icon": "shade", "color": "#00d2d3", "flying": True},
            {"type": "orc", "name": "Orc Berserker", "hp": 40, "atk": 14, "def": 4, "xp": 45, "icon": "orc", "color": "#e74c3c"}
        ]

        if self.floor >= 3:
            monster_types.append({
                "type": "necromancer", "name": "Bone Necromancer", "hp": 45, "atk": 12, "def": 3, "xp": 65, "icon": "necromancer", "color": "#8c7ae6", "caster": True
            })

        # Final floor boss
        if self.floor >= 4:
            boss_room = self.rooms[-1]
            bx = boss_room["x"] + boss_room["w"] // 2
            by = boss_room["y"] + boss_room["h"] // 2
            # Offset from stairs
            if bx == self.stairs_down["x"]:
                bx += 1
            self.monsters.append({
                "id": "boss_malakor",
                "x": bx,
                "y": by,
                "type": "boss",
                "name": "Malakor, Obsidian Arch-Lich",
                "hp": 160 + self.floor * 30,
                "max_hp": 160 + self.floor * 30,
                "atk": 22 + self.floor * 3,
                "def": 8,
                "xp": 350,
                "icon": "boss",
                "color": "#e84118",
                "boss": True
            })

        # Regular monsters in non-spawn rooms
        monster_id = 1
        for room in self.rooms[1:]:
            count = self.rng.randint(1, 2 + min(2, self.floor))
            for _ in range(count):
                m_template = self.rng.choice(monster_types)
                mx = self.rng.randint(room["x"] + 1, room["x"] + room["w"] - 2)
                my = self.rng.randint(room["y"] + 1, room["y"] + room["h"] - 2)

                # Avoid stacking
                if any(m["x"] == mx and m["y"] == my for m in self.monsters) or (mx == self.stairs_down["x"] and my == self.stairs_down["y"]):
                    continue

                scale = 1.0 + (self.floor - 1) * 0.25
                self.monsters.append({
                    "id": f"m_{monster_id}",
                    "x": mx,
                    "y": my,
                    "type": m_template["type"],
                    "name": m_template["name"],
                    "hp": int(m_template["hp"] * scale),
                    "max_hp": int(m_template["hp"] * scale),
                    "atk": int(m_template["atk"] * scale),
                    "def": m_template["def"],
                    "xp": int(m_template["xp"] * scale),
                    "icon": m_template["icon"],
                    "color": m_template["color"],
                    "ranged": m_template.get("ranged", False),
                    "caster": m_template.get("caster", False)
                })
                monster_id += 1

    def _populate_loot(self):
        item_id = 1
        possible_items = [
            {"type": "potion_health", "name": "Crimson Health Potion", "heal": 35, "icon": "potion_red", "desc": "Restores 35 Health points"},
            {"type": "potion_mana", "name": "Azure Mana Draught", "mana": 30, "icon": "potion_blue", "desc": "Restores 30 Mana or Energy"},
            {"type": "scroll_fireball", "name": "Scroll of Hellfire", "damage": 45, "icon": "scroll_fire", "desc": "Blasts target enemy and neighbors with fire"},
            {"type": "scroll_teleport", "name": "Scroll of Astral Shift", "icon": "scroll_teleport", "desc": "Instantly teleports you to a safe tile in another room"},
            {"type": "weapon", "name": "Runic Longsword", "atk_bonus": 5 + self.floor * 2, "slot": "weapon", "icon": "sword", "desc": "Sharp enchanted blade (+ATK)"},
            {"type": "weapon", "name": "Shadow Dagger of Venom", "atk_bonus": 4 + self.floor * 2, "crit_bonus": 15, "slot": "weapon", "icon": "dagger", "desc": "Fast lethal dagger (+Crit)"},
            {"type": "weapon", "name": "Staff of Arcane Echoes", "atk_bonus": 6 + self.floor * 2, "mana_bonus": 20, "slot": "weapon", "icon": "staff", "desc": "Channeled mage catalyst (+ATK, +Max Mana)"},
            {"type": "armor", "name": "Iron Plate Cuirass", "def_bonus": 3 + self.floor, "slot": "armor", "icon": "armor", "desc": "Sturdy forged iron armor (+DEF)"},
            {"type": "armor", "name": "Cloak of Evasion", "def_bonus": 2 + self.floor, "dodge_bonus": 12, "slot": "armor", "icon": "cloak", "desc": "Silken shadowy mantle (+Dodge)"},
            {"type": "relic", "name": "Amulet of Blood Pact", "vampirism": 15, "slot": "relic", "icon": "amulet", "desc": "Leeches 15% life from melee strikes"},
            {"type": "gold", "name": "Heavy Gold Pouch", "gold": self.rng.randint(25, 70) * self.floor, "icon": "gold", "desc": "Shining dungeon coins"},
        ]

        for room in self.rooms[1:]:
            if self.rng.random() < 0.8:
                ix = self.rng.randint(room["x"] + 1, room["x"] + room["w"] - 2)
                iy = self.rng.randint(room["y"] + 1, room["y"] + room["h"] - 2)

                # Skip occupied
                if any(m["x"] == ix and m["y"] == iy for m in self.monsters) or (ix == self.stairs_down["x"] and iy == self.stairs_down["y"]):
                    continue

                item_choice = self.rng.choice(possible_items).copy()
                item_choice["id"] = f"item_{item_id}"
                item_choice["x"] = ix
                item_choice["y"] = iy
                # 30% chance to be inside a chest
                if self.rng.random() < 0.4:
                    item_choice["in_chest"] = True
                self.items.append(item_choice)
                item_id += 1

    def _populate_shrines(self):
        shrine_types = [
            {"type": "health", "name": "Shrine of Vitality", "effect": "Restores full health and increases max HP by 10", "icon": "shrine_red", "color": "#e84118"},
            {"type": "mana", "name": "Shrine of the Arcane Well", "effect": "Restores full mana and boosts magic power", "icon": "shrine_blue", "color": "#00a8ff"},
            {"type": "fury", "name": "Altar of the Berserker", "effect": "Grants +4 permanent Attack bonus", "icon": "shrine_gold", "color": "#fbc531"}
        ]
        if len(self.rooms) > 2 and self.rng.random() < 0.7:
            shrine_room = self.rng.choice(self.rooms[1:-1])
            sx = shrine_room["x"] + shrine_room["w"] // 2
            sy = shrine_room["y"] + shrine_room["h"] // 2
            st = self.rng.choice(shrine_types)
            self.shrines.append({
                "id": "shrine_1",
                "x": sx,
                "y": sy,
                "type": st["type"],
                "name": st["name"],
                "effect": st["effect"],
                "icon": st["icon"],
                "color": st["color"],
                "used": False
            })


class GameRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler serving files from /public and providing JSON API."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/api/status":
            self._send_json({
                "status": "ok",
                "state": "online",
                "server": "The Abyssal Crypts 3D Python Server",
                "version": "1.0.0",
                "time": time.time()
            })
        elif self.path == "/api/scores":
            try:
                if os.path.exists(LEADERBOARD_FILE):
                    with open(LEADERBOARD_FILE, "r", encoding="utf-8") as f:
                        scores = json.load(f)
                else:
                    scores = []
                self._send_json(scores)
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
        elif self.path == "/api/load":
            try:
                if os.path.exists(SAVE_FILE):
                    with open(SAVE_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    self._send_json({"saved": True, "state": data})
                else:
                    self._send_json({"saved": False, "state": None})
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
        elif self.path == "/api/lore":
            lore_db = {
                "floors": {
                    "1": {"title": "The Forgotten Crypts", "lore": "Ancient catacombs carved into the obsidian crust. Cobwebs brush against rusted armor of fallen warriors."},
                    "2": {"title": "The Sunken Ruin", "lore": "Flooded subterranean aqueducts where dark waters echo with the hissing of goblin archers."},
                    "3": {"title": "The Abyssal Catacombs", "lore": "The veil between worlds thins. Phantom shadows and bone necromancers weave hexes in the dark."},
                    "4": {"title": "The Obsidian Sanctum", "lore": "The throne room of Malakor the Arch-Lich. Pure demonic malice radiates from the walls."}
                },
                "classes": {
                    "Warrior": {"title": "Ironclad Vanguard", "desc": "Masters of steel and tenacity. Can cleave multiple adjacent foes and absorb crushing blows."},
                    "Mage": {"title": "Weaver of Arcana", "desc": "Wielders of cosmic fire and astral shifts. Can obliterate enemies from a distance with devastating spells."},
                    "Rogue": {"title": "Shadow Blade", "desc": "Swift and lethal infiltrators. Strike with high critical rate and can vanish in smoke clouds."}
                }
            }
            self._send_json(lore_db)
        elif self.path == "/api/multiplayer/rooms":
            self._send_json(multiplayer_manager.list_rooms())
        else:
            # Fall back to serving static files from public/
            super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            body = {}

        if self.path == "/api/dungeon/generate":
            floor = body.get("floor", 1)
            seed = body.get("seed", None)
            width = body.get("width", 48)
            height = body.get("height", 32)
            gen = DungeonGenerator(width=width, height=height, floor_level=floor, seed=seed)
            dungeon_data = gen.generate()
            self._send_json(dungeon_data)

        elif self.path == "/api/scores":
            try:
                scores = []
                if os.path.exists(LEADERBOARD_FILE):
                    with open(LEADERBOARD_FILE, "r", encoding="utf-8") as f:
                        scores = json.load(f)

                new_entry = {
                    "name": body.get("name", "Unknown Hero"),
                    "hero_class": body.get("hero_class", "Adventurer"),
                    "floor": body.get("floor", 1),
                    "gold": body.get("gold", 0),
                    "kills": body.get("kills", 0),
                    "score": body.get("score", 0),
                    "date": time.strftime("%Y-%m-%d %H:%M")
                }
                scores.append(new_entry)
                # Sort descending by score
                scores.sort(key=lambda x: x.get("score", 0), reverse=True)
                scores = scores[:50]

                with open(LEADERBOARD_FILE, "w", encoding="utf-8") as f:
                    json.dump(scores, f, indent=2)

                self._send_json({"success": True, "leaderboard": scores})
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)

        elif self.path == "/api/save":
            try:
                with open(SAVE_FILE, "w", encoding="utf-8") as f:
                    json.dump(body, f, indent=2)
                self._send_json({"success": True})
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
        elif self.path in ("/api/test-log", "/api/test-report"):
            try:
                test_file = os.path.join(DATA_DIR, "test_report.json")
                with open(test_file, "w", encoding="utf-8") as f:
                    json.dump(body, f, indent=2)
                sys.stderr.write(f"[AIBot Test] Received report: {body.get('summary', 'Report saved')}\n")
                self._send_json({"success": True, "saved": True})
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
        elif self.path == "/api/multiplayer/create":
            name = body.get("name", "Adventurer")
            hero_class = body.get("hero_class", "Warrior")
            room_code = body.get("room_code", None)
            res = multiplayer_manager.create_room(name, hero_class, room_code)
            self._send_json(res)

        elif self.path == "/api/multiplayer/join":
            room_code = body.get("room_code", "PUBLIC")
            name = body.get("name", "Adventurer")
            hero_class = body.get("hero_class", "Warrior")
            res = multiplayer_manager.join_room(room_code, name, hero_class)
            self._send_json(res)

        elif self.path == "/api/multiplayer/sync":
            room_code = body.get("room_code", "PUBLIC")
            player_id = body.get("player_id", "")
            res = multiplayer_manager.sync_player(room_code, player_id, body)
            self._send_json(res)

        elif self.path == "/api/multiplayer/chat":
            room_code = body.get("room_code", "PUBLIC")
            player_id = body.get("player_id", "")
            message = body.get("message", "")
            res = multiplayer_manager.send_chat(room_code, player_id, message)
            self._send_json(res)

        elif self.path == "/api/multiplayer/descend":
            room_code = body.get("room_code", "PUBLIC")
            player_id = body.get("player_id", "")
            next_floor = body.get("floor", 1)
            res = multiplayer_manager.descend_party(room_code, player_id, next_floor)
            self._send_json(res)

        elif self.path == "/api/multiplayer/leave":
            room_code = body.get("room_code", "PUBLIC")
            player_id = body.get("player_id", "")
            res = multiplayer_manager.leave_room(room_code, player_id)
            self._send_json(res)

        else:
            self._send_json({"error": "Endpoint not found"}, status=404)

    def _send_json(self, data: Any, status: int = 200):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def log_message(self, format, *args):
        # Clean terminal logging
        sys.stderr.write(f"[{time.strftime('%H:%M:%S')}] {format % args}\n")


def run_server(port: int = PORT):
    env_port = os.environ.get("PORT")
    ports_to_try = [port] if env_port else [port, 8080, 8081, 8888, 9000]
    for p in ports_to_try:
        try:
            server = http.server.ThreadingHTTPServer(("0.0.0.0", p), GameRequestHandler)
            print(f"============================================================")
            print(f"   RETRO DUNGEON CRAWLER - PYTHON SERVER ACTIVE")
            print(f"   Listening on: http://0.0.0.0:{p}")
            print(f"   Serving from: {PUBLIC_DIR}")
            print(f"============================================================")
            server.serve_forever()
            break
        except OSError as e:
            if "Address already in use" in str(e) or e.errno == 10048:
                print(f"Port {p} in use, trying next port...")
                continue
            raise


if __name__ == "__main__":
    port_arg = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(port_arg)
