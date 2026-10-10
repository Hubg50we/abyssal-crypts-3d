/**
 * Retro Dungeon Crawler - Procedural Pixel-Art Sprite Engine
 * Generates high-definition retro 24x24 pixel-art sprites programmatically into offscreen canvases.
 */

class SpriteGenerator {
  constructor(tileSize = 32) {
    this.tileSize = tileSize;
    this.cache = {};
    this.generateAll();
  }

  createCanvas() {
    const c = document.createElement('canvas');
    c.width = this.tileSize;
    c.height = this.tileSize;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx: ctx };
  }

  generateAll() {
    this.cache['floor'] = this.renderFloor();
    this.cache['floor_alt'] = this.renderFloorAlt();
    this.cache['wall'] = this.renderWall();
    this.cache['door_closed'] = this.renderDoor(false);
    this.cache['door_open'] = this.renderDoor(true);
    this.cache['stairs_down'] = this.renderStairs();
    this.cache['trap'] = this.renderTrap();

    // Heroes
    this.cache['hero_warrior'] = this.renderWarrior();
    this.cache['hero_mage'] = this.renderMage();
    this.cache['hero_rogue'] = this.renderRogue();

    // Monsters
    this.cache['m_skeleton'] = this.renderSkeleton();
    this.cache['m_goblin'] = this.renderGoblin();
    this.cache['m_slime'] = this.renderSlime();
    this.cache['m_shade'] = this.renderShade();
    this.cache['m_orc'] = this.renderOrc();
    this.cache['m_necromancer'] = this.renderNecromancer();
    this.cache['m_boss'] = this.renderBoss();
    this.cache['m_void_drake'] = this.renderVoidDrake();
    this.cache['m_chaos_elemental'] = this.renderChaosElemental();
    this.cache['m_frost_revenant'] = this.renderFrostRevenant();
    this.cache['m_blood_fiend'] = this.renderBloodFiend();
    this.cache['m_behemoth'] = this.renderBehemoth();

    // Interactive & Items
    this.cache['chest_closed'] = this.renderChest(false);
    this.cache['chest_open'] = this.renderChest(true);
    this.cache['shrine_red'] = this.renderShrine('#e84118');
    this.cache['shrine_blue'] = this.renderShrine('#00a8ff');
    this.cache['shrine_gold'] = this.renderShrine('#fbc531');

    this.cache['potion_red'] = this.renderPotion('#ff3838');
    this.cache['potion_blue'] = this.renderPotion('#17c0eb');
    this.cache['scroll_fire'] = this.renderScroll('#ff9f1a');
    this.cache['scroll_teleport'] = this.renderScroll('#7158e2');
    this.cache['sword'] = this.renderSword();
    this.cache['dagger'] = this.renderDagger();
    this.cache['staff'] = this.renderStaff();
    this.cache['armor'] = this.renderArmor();
    this.cache['cloak'] = this.renderCloak();
    this.cache['amulet'] = this.renderAmulet();
    this.cache['gold'] = this.renderGold();
  }

  get(name) {
    return this.cache[name] || this.cache['floor'];
  }

  // --- Environment ---

  renderFloor() {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    // Dark stone flagstone base
    ctx.fillStyle = '#1e2029';
    ctx.fillRect(0, 0, s, s);

    // Stone tile grooves
    ctx.fillStyle = '#14161d';
    ctx.fillRect(0, 0, s, 1);
    ctx.fillRect(0, 0, 1, s);
    ctx.fillRect(s - 1, 0, 1, s);
    ctx.fillRect(0, s - 1, s, 1);

    // Subtle stone noise & scratches
    ctx.fillStyle = '#2b2e3b';
    ctx.fillRect(4, 5, 8, 4);
    ctx.fillRect(16, 18, 10, 6);
    ctx.fillRect(6, 22, 6, 4);

    ctx.fillStyle = '#121319';
    ctx.fillRect(14, 8, 2, 8);
    ctx.fillRect(24, 12, 1, 6);
    return canvas;
  }

  renderFloorAlt() {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    ctx.fillStyle = '#21242e';
    ctx.fillRect(0, 0, s, s);

    ctx.fillStyle = '#161821';
    ctx.fillRect(0, 0, s, 1);
    ctx.fillRect(0, 0, 1, s);

    // Small dungeon rune or pebble
    ctx.fillStyle = '#2e3342';
    ctx.fillRect(8, 8, 6, 6);
    ctx.fillStyle = '#3f4659';
    ctx.fillRect(10, 10, 2, 2);
    return canvas;
  }

  renderWall() {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    // Dark sturdy brick wall
    ctx.fillStyle = '#161922';
    ctx.fillRect(0, 0, s, s);

    // Beveled stone blocks
    ctx.fillStyle = '#2d3345';
    // Top stone block
    ctx.fillRect(2, 2, s - 4, s / 2 - 3);
    // Lower left block
    ctx.fillRect(2, s / 2 + 1, s / 2 - 3, s / 2 - 3);
    // Lower right block
    ctx.fillRect(s / 2 + 1, s / 2 + 1, s / 2 - 3, s / 2 - 3);

    // Highlights
    ctx.fillStyle = '#444d66';
    ctx.fillRect(3, 3, s - 6, 2);
    ctx.fillRect(3, s / 2 + 2, s / 2 - 5, 2);
    ctx.fillRect(s / 2 + 2, s / 2 + 2, s / 2 - 5, 2);

    // Deep mortar cracks
    ctx.fillStyle = '#0a0b0f';
    ctx.fillRect(0, s / 2 - 1, s, 2);
    ctx.fillRect(s / 2 - 1, s / 2, 2, s / 2);
    return canvas;
  }

  renderDoor(isOpen) {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    if (isOpen) {
      ctx.fillStyle = '#181b24';
      ctx.fillRect(0, 0, s, s);
      // Open doorway arch
      ctx.fillStyle = '#4b382a';
      ctx.fillRect(2, 2, 4, s - 4);
      ctx.fillRect(s - 6, 2, 4, s - 4);
      ctx.fillStyle = '#ffd32a';
      ctx.fillRect(s - 5, s / 2, 2, 4);
    } else {
      // Solid wooden studded door
      ctx.fillStyle = '#181b24';
      ctx.fillRect(0, 0, s, s);

      ctx.fillStyle = '#634832';
      ctx.fillRect(4, 4, s - 8, s - 8);

      // Iron bands
      ctx.fillStyle = '#3d404d';
      ctx.fillRect(4, 8, s - 8, 3);
      ctx.fillRect(4, s - 11, s - 8, 3);

      // Gold keyhole
      ctx.fillStyle = '#fbc531';
      ctx.fillRect(s / 2 - 2, s / 2 - 2, 4, 4);
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(s / 2 - 1, s / 2 - 1, 2, 2);
    }
    return canvas;
  }

  renderStairs() {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    ctx.fillStyle = '#14161e';
    ctx.fillRect(0, 0, s, s);

    // Descending spiral stairs
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const offset = i * 3;
      const shade = Math.floor(60 - i * 11);
      ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 10})`;
      ctx.fillRect(offset + 3, offset + 3, s - offset * 2 - 6, s - offset * 2 - 6);
    }
    // Deep center void with blue magical rune
    ctx.fillStyle = '#05070a';
    ctx.fillRect(13, 13, 6, 6);
    ctx.fillStyle = '#00d2d3';
    ctx.fillRect(15, 15, 2, 2);
    return canvas;
  }

  renderTrap() {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    ctx.fillStyle = '#1e2029';
    ctx.fillRect(0, 0, s, s);

    // Metallic spike holes
    ctx.fillStyle = '#0c0d12';
    const holes = [[8, 8], [20, 8], [14, 14], [8, 20], [20, 20]];
    holes.forEach(([x, y]) => {
      ctx.fillRect(x, y, 4, 4);
      ctx.fillStyle = '#718093';
      ctx.fillRect(x + 1, y + 1, 2, 2);
      ctx.fillStyle = '#0c0d12';
    });
    return canvas;
  }

  // --- Heroes ---

  renderWarrior() {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    // Heavy Steel Knight
    // Red cloak
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(7, 10, 18, 18);

    // Steel chestplate
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(10, 11, 12, 12);
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(11, 12, 10, 4);

    // Golden cross on chest
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(15, 14, 2, 7);
    ctx.fillRect(13, 16, 6, 2);

    // Steel helm
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(10, 3, 12, 9);
    // Gold visor
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(12, 7, 8, 2);
    // Red plume
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(14, 1, 4, 3);

    // Broadsword in hand
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(23, 5, 2, 16);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(21, 17, 6, 2);
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(23, 19, 2, 4);

    // Shield in other hand
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(4, 12, 5, 10);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(5, 13, 3, 8);
    return canvas;
  }

  renderMage() {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    // Arcane Robed Wizard
    // Purple robe
    ctx.fillStyle = '#6c5ce7';
    ctx.fillRect(8, 10, 16, 18);
    ctx.fillStyle = '#a29bfe';
    ctx.fillRect(10, 12, 12, 14);

    // Pointed hood
    ctx.fillStyle = '#574b90';
    ctx.fillRect(10, 4, 12, 8);
    ctx.fillRect(12, 1, 8, 4);
    // Glowing eyes
    ctx.fillStyle = '#00cec9';
    ctx.fillRect(12, 8, 2, 2);
    ctx.fillRect(18, 8, 2, 2);

    // Arcane staff
    ctx.fillStyle = '#d63031';
    ctx.fillRect(5, 4, 2, 22);
    // Glowing crystal head
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(3, 2, 6, 6);
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(4, 3, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, 4, 2, 2);

    // Magic rune aura
    ctx.fillStyle = 'rgba(116, 185, 255, 0.4)';
    ctx.fillRect(22, 14, 4, 4);
    return canvas;
  }

  renderRogue() {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    // Shadow Rogue
    // Dark cowl & mantle
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(8, 8, 16, 20);

    // Leather brigandine
    ctx.fillStyle = '#4b4b4b';
    ctx.fillRect(10, 11, 12, 12);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(11, 13, 10, 8);

    // Shadow cowl
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(9, 3, 14, 8);
    // Emerald piercing eyes
    ctx.fillStyle = '#2ed573';
    ctx.fillRect(12, 7, 2, 2);
    ctx.fillRect(18, 7, 2, 2);

    // Twin daggers
    ctx.fillStyle = '#ced6e0';
    ctx.fillRect(6, 14, 2, 8);
    ctx.fillRect(24, 14, 2, 8);
    ctx.fillStyle = '#ffa502';
    ctx.fillRect(5, 20, 4, 2);
    ctx.fillRect(23, 20, 4, 2);
    return canvas;
  }

  // --- Monsters ---

  renderSkeleton() {
    const { canvas, ctx } = this.createCanvas();
    // Bone frame
    ctx.fillStyle = '#dcdde1';
    // Skull
    ctx.fillRect(11, 4, 10, 8);
    // Red glowing eye sockets
    ctx.fillStyle = '#e84118';
    ctx.fillRect(13, 7, 2, 2);
    ctx.fillRect(17, 7, 2, 2);

    // Spine and ribcage
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(15, 12, 2, 10);
    ctx.fillRect(11, 14, 10, 2);
    ctx.fillRect(12, 17, 8, 2);
    ctx.fillRect(13, 20, 6, 2);

    // Bone legs
    ctx.fillRect(12, 22, 2, 7);
    ctx.fillRect(18, 22, 2, 7);

    // Rusted blade
    ctx.fillStyle = '#718093';
    ctx.fillRect(23, 8, 2, 14);
    ctx.fillStyle = '#e1b12c';
    ctx.fillRect(22, 20, 4, 2);
    return canvas;
  }

  renderGoblin() {
    const { canvas, ctx } = this.createCanvas();
    // Green goblin archer
    ctx.fillStyle = '#44bd32';
    // Head with big pointed ears
    ctx.fillRect(11, 5, 10, 8);
    ctx.fillRect(6, 7, 5, 3);
    ctx.fillRect(21, 7, 5, 3);

    // Yellow sinister eyes
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(13, 8, 2, 2);
    ctx.fillRect(17, 8, 2, 2);

    // Leather rags
    ctx.fillStyle = '#795548';
    ctx.fillRect(10, 13, 12, 11);

    // Wooden bow
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(5, 10, 2, 14);
    ctx.fillRect(6, 9, 2, 2);
    ctx.fillRect(6, 23, 2, 2);
    // Bow string
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 11, 1, 12);
    return canvas;
  }

  renderSlime() {
    const { canvas, ctx } = this.createCanvas();
    // Gelatinous purple blob
    ctx.fillStyle = '#8c7ae6';
    ctx.fillRect(6, 12, 20, 14);
    ctx.fillRect(8, 8, 16, 5);
    ctx.fillRect(10, 6, 12, 3);

    // Highlight sheen
    ctx.fillStyle = '#9c88ff';
    ctx.fillRect(9, 9, 6, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 10, 2, 2);

    // Big anime-like slime eyes
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(10, 16, 3, 4);
    ctx.fillRect(19, 16, 3, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 16, 1, 2);
    ctx.fillRect(19, 16, 1, 2);
    return canvas;
  }

  renderShade() {
    const { canvas, ctx } = this.createCanvas();
    // Cyan ethereal wraith
    ctx.fillStyle = 'rgba(0, 210, 211, 0.85)';
    ctx.fillRect(9, 4, 14, 14);
    ctx.fillRect(7, 10, 18, 10);
    // Spectral wisps
    ctx.fillRect(9, 24, 4, 5);
    ctx.fillRect(19, 24, 4, 4);

    // Bright glowing void core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 8, 3, 3);
    ctx.fillRect(17, 8, 3, 3);
    return canvas;
  }

  renderOrc() {
    const { canvas, ctx } = this.createCanvas();
    // Massive muscular green/brown orc
    ctx.fillStyle = '#218c74';
    ctx.fillRect(8, 5, 16, 10);
    // Red war paint
    ctx.fillStyle = '#b33939';
    ctx.fillRect(9, 9, 14, 2);

    // Tusks
    ctx.fillStyle = '#f7f1e3';
    ctx.fillRect(11, 13, 2, 3);
    ctx.fillRect(19, 13, 2, 3);

    // Spiked iron armor
    ctx.fillStyle = '#474787';
    ctx.fillRect(6, 14, 20, 12);
    // Spikes
    ctx.fillStyle = '#aaa69d';
    ctx.fillRect(4, 15, 3, 2);
    ctx.fillRect(25, 15, 3, 2);
    return canvas;
  }

  renderNecromancer() {
    const { canvas, ctx } = this.createCanvas();
    // Dark robes
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(8, 8, 16, 20);

    // Hood & Bone Mask
    ctx.fillStyle = '#474787';
    ctx.fillRect(9, 4, 14, 8);
    ctx.fillStyle = '#f7f1e3';
    ctx.fillRect(11, 6, 10, 6);
    // Glowing violet eyes
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(13, 8, 2, 2);
    ctx.fillRect(17, 8, 2, 2);

    // Skull Staff
    ctx.fillStyle = '#706fd3';
    ctx.fillRect(24, 5, 2, 22);
    ctx.fillStyle = '#f7f1e3';
    ctx.fillRect(22, 2, 6, 5);
    return canvas;
  }

  renderBoss() {
    const { canvas, ctx } = this.createCanvas();
    // Arch-Lich Malakor
    // Towering demonic wings / aura
    ctx.fillStyle = 'rgba(235, 47, 6, 0.4)';
    ctx.fillRect(2, 2, 28, 28);

    // Obsidian Horns
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(5, 2, 4, 8);
    ctx.fillRect(23, 2, 4, 8);

    // Dark armor & skull
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(8, 8, 16, 20);
    ctx.fillStyle = '#d2dae2';
    ctx.fillRect(10, 6, 12, 8);

    // Blazing ruby eyes
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(12, 9, 3, 3);
    ctx.fillRect(17, 9, 3, 3);

    // Giant flaming broadsword
    ctx.fillStyle = '#ff9f1a';
    ctx.fillRect(25, 4, 3, 22);
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(26, 6, 1, 18);
    return canvas;
  }

  renderVoidDrake() {
    const { canvas, ctx } = this.createCanvas();
    // Void Dragon with wings & amethyst horns
    ctx.fillStyle = 'rgba(142, 68, 173, 0.45)';
    ctx.fillRect(2, 6, 28, 16); // Void mist aura

    // Wings
    ctx.fillStyle = '#4a235a';
    ctx.fillRect(3, 4, 8, 12);
    ctx.fillRect(21, 4, 8, 12);
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(4, 5, 6, 9);
    ctx.fillRect(22, 5, 6, 9);

    // Drake Dragon Head & Neck
    ctx.fillStyle = '#6c3483';
    ctx.fillRect(10, 8, 12, 14);
    ctx.fillRect(11, 4, 10, 7);

    // Amethyst Horns
    ctx.fillStyle = '#bb86fc';
    ctx.fillRect(9, 1, 3, 5);
    ctx.fillRect(20, 1, 3, 5);

    // Void Breath Core & Glowing Eyes
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(12, 6, 2, 2);
    ctx.fillRect(18, 6, 2, 2);
    ctx.fillRect(14, 10, 4, 4);

    // Claws & Tail
    ctx.fillStyle = '#2c003e';
    ctx.fillRect(9, 22, 4, 6);
    ctx.fillRect(19, 22, 4, 6);
    ctx.fillRect(15, 22, 2, 8);
    return canvas;
  }

  renderChaosElemental() {
    const { canvas, ctx } = this.createCanvas();
    // Swirling plasma energy elemental
    ctx.fillStyle = 'rgba(231, 76, 60, 0.35)';
    ctx.fillRect(4, 4, 24, 24);

    // Outer plasma arcs
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(6, 6, 20, 20);
    ctx.fillStyle = '#ff793f';
    ctx.fillRect(8, 8, 16, 16);

    // Core Solar Fusion
    ctx.fillStyle = '#fffa65';
    ctx.fillRect(10, 10, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 12, 8, 8);

    // Electric Cyan Energy Sparks
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(4, 12, 3, 3);
    ctx.fillRect(25, 14, 3, 3);
    ctx.fillRect(14, 4, 3, 3);
    ctx.fillRect(15, 25, 3, 3);
    return canvas;
  }

  renderFrostRevenant() {
    const { canvas, ctx } = this.createCanvas();
    // Glacial armored dread knight
    ctx.fillStyle = 'rgba(0, 206, 201, 0.35)';
    ctx.fillRect(4, 4, 24, 24);

    // Glacial Plate Armor
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(8, 6, 16, 20);
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(9, 7, 14, 18);

    // Frost Horned Greathelm
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(10, 3, 12, 8);
    ctx.fillStyle = '#dfe6e9';
    ctx.fillRect(7, 1, 3, 6);
    ctx.fillRect(22, 1, 3, 6);

    // Cold Piercing Blue Visor
    ctx.fillStyle = '#00cec9';
    ctx.fillRect(12, 6, 8, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 6, 4, 2);

    // Ice Crystal Greatsword
    ctx.fillStyle = '#81ecec';
    ctx.fillRect(24, 2, 4, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(25, 4, 2, 20);
    return canvas;
  }

  renderBloodFiend() {
    const { canvas, ctx } = this.createCanvas();
    // Crimson gargoyle fiend
    ctx.fillStyle = 'rgba(192, 57, 43, 0.4)';
    ctx.fillRect(3, 4, 26, 24);

    // Leathery wings
    ctx.fillStyle = '#78281f';
    ctx.fillRect(2, 6, 8, 14);
    ctx.fillRect(22, 6, 8, 14);

    // Muscular demonic torso
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(9, 8, 14, 16);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(11, 10, 10, 12);

    // Gargoyle Horns & Head
    ctx.fillStyle = '#922b21';
    ctx.fillRect(10, 4, 12, 8);
    ctx.fillStyle = '#f5b7b1';
    ctx.fillRect(8, 2, 3, 5);
    ctx.fillRect(21, 2, 3, 5);

    // Burning ruby eyes & fangs
    ctx.fillStyle = '#ff7979';
    ctx.fillRect(12, 7, 2, 2);
    ctx.fillRect(18, 7, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(13, 10, 2, 2);
    ctx.fillRect(17, 10, 2, 2);

    // Sharp talons
    ctx.fillStyle = '#17202a';
    ctx.fillRect(8, 24, 4, 4);
    ctx.fillRect(20, 24, 4, 4);
    return canvas;
  }

  renderBehemoth() {
    const { canvas, ctx } = this.createCanvas();
    // Colossal demonic titan juggernaut
    ctx.fillStyle = '#1c2833';
    ctx.fillRect(4, 4, 24, 24); // Massive broad frame

    // Obsidian Carapace Armor
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(6, 6, 20, 22);

    // Magma Cracks Across Body
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(9, 10, 3, 10);
    ctx.fillRect(18, 12, 4, 8);
    ctx.fillRect(12, 16, 8, 2);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(10, 11, 1, 8);
    ctx.fillRect(19, 13, 2, 6);

    // Giant Iron-Clad Horns
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(4, 1, 5, 8);
    ctx.fillRect(23, 1, 5, 8);
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(5, 2, 3, 6);
    ctx.fillRect(24, 2, 3, 6);

    // Burning Molten Eyes
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(11, 7, 3, 3);
    ctx.fillRect(18, 7, 3, 3);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(12, 8, 1, 1);
    ctx.fillRect(19, 8, 1, 1);
    return canvas;
  }

  // --- Interactive & Items ---

  renderChest(isOpen) {
    const { canvas, ctx } = this.createCanvas();
    const s = this.tileSize;
    if (isOpen) {
      // Open chest
      ctx.fillStyle = '#574b90';
      ctx.fillRect(6, 14, 20, 12);
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(6, 14, 20, 3);
      // Gold glitter inside
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(8, 11, 16, 4);
      // Open lid angled up
      ctx.fillStyle = '#786fa6';
      ctx.fillRect(6, 6, 20, 5);
    } else {
      // Closed treasure chest
      ctx.fillStyle = '#574b90';
      ctx.fillRect(6, 12, 20, 14);

      // Gold bands
      ctx.fillStyle = '#f5cd79';
      ctx.fillRect(6, 12, 20, 3);
      ctx.fillRect(6, 23, 20, 3);
      ctx.fillRect(6, 12, 3, 14);
      ctx.fillRect(23, 12, 3, 14);

      // Gold Lock
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(14, 15, 4, 5);
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(15, 17, 2, 2);
    }
    return canvas;
  }

  renderShrine(accentColor) {
    const { canvas, ctx } = this.createCanvas();
    // Marble altar base
    ctx.fillStyle = '#57606f';
    ctx.fillRect(6, 18, 20, 10);
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(8, 14, 16, 5);

    // Glowing mystic crystal floating above
    ctx.fillStyle = accentColor;
    ctx.fillRect(12, 4, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 6, 4, 4);
    return canvas;
  }

  renderPotion(color) {
    const { canvas, ctx } = this.createCanvas();
    // Glass flask
    ctx.fillStyle = '#f1f2f6';
    ctx.fillRect(13, 6, 6, 4);
    // Cork
    ctx.fillStyle = '#a4b0be';
    ctx.fillRect(14, 4, 4, 2);

    // Liquid base
    ctx.fillStyle = color;
    ctx.fillRect(9, 10, 14, 16);
    // Bottle shine
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(11, 12, 2, 10);
    return canvas;
  }

  renderScroll(ribbonColor) {
    const { canvas, ctx } = this.createCanvas();
    // Aged parchment roll
    ctx.fillStyle = '#f5cd79';
    ctx.fillRect(8, 8, 16, 16);
    ctx.fillStyle = '#eccc68';
    ctx.fillRect(6, 6, 20, 3);
    ctx.fillRect(6, 23, 20, 3);

    // Colored sealing ribbon & rune
    ctx.fillStyle = ribbonColor;
    ctx.fillRect(8, 14, 16, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 14, 4, 4);
    return canvas;
  }

  renderSword() {
    const { canvas, ctx } = this.createCanvas();
    // Diagonal blade
    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(12, 4, 8, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, 4, 2, 16);
    // Gold crossguard
    ctx.fillStyle = '#e1b12c';
    ctx.fillRect(8, 20, 16, 3);
    // Pommel
    ctx.fillStyle = '#c23616';
    ctx.fillRect(14, 25, 4, 4);
    return canvas;
  }

  renderDagger() {
    const { canvas, ctx } = this.createCanvas();
    ctx.fillStyle = '#00d2d3';
    ctx.fillRect(14, 8, 4, 12);
    ctx.fillStyle = '#10ac84';
    ctx.fillRect(11, 20, 10, 3);
    ctx.fillStyle = '#222f3e';
    ctx.fillRect(14, 23, 4, 4);
    return canvas;
  }

  renderStaff() {
    const { canvas, ctx } = this.createCanvas();
    ctx.fillStyle = '#795548';
    ctx.fillRect(15, 8, 2, 20);
    ctx.fillStyle = '#5f27cd';
    ctx.fillRect(12, 2, 8, 8);
    ctx.fillStyle = '#341f97';
    ctx.fillRect(14, 4, 4, 4);
    return canvas;
  }

  renderArmor() {
    const { canvas, ctx } = this.createCanvas();
    ctx.fillStyle = '#718093';
    ctx.fillRect(8, 6, 16, 18);
    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(10, 8, 12, 5);
    ctx.fillStyle = '#e1b12c';
    ctx.fillRect(14, 13, 4, 8);
    return canvas;
  }

  renderCloak() {
    const { canvas, ctx } = this.createCanvas();
    ctx.fillStyle = '#2c2c54';
    ctx.fillRect(7, 6, 18, 20);
    ctx.fillStyle = '#474787';
    ctx.fillRect(10, 8, 12, 8);
    ctx.fillStyle = '#2ed573';
    ctx.fillRect(15, 8, 2, 2);
    return canvas;
  }

  renderAmulet() {
    const { canvas, ctx } = this.createCanvas();
    ctx.fillStyle = '#e1b12c';
    ctx.fillRect(10, 6, 12, 10);
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(12, 16, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 18, 3, 3);
    return canvas;
  }

  renderGold() {
    const { canvas, ctx } = this.createCanvas();
    ctx.fillStyle = '#e1b12c';
    // Gold coin pile
    ctx.fillRect(8, 16, 6, 8);
    ctx.fillRect(16, 16, 6, 8);
    ctx.fillRect(12, 12, 8, 8);
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(13, 13, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 14, 2, 2);
    return canvas;
  }
}

// Global sprite manager
window.gameSprites = new SpriteGenerator(32);
