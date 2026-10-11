/**
 * Retro Dungeon Crawler - Procedural 3D Texture Engine
 * Generates rich, atmospheric canvas textures for Three.js without requiring external image assets.
 */

class TextureGenerator {
  constructor() {
    this.cache = {};
  }

  createCanvas(width = 256, height = 256) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    return { canvas: c, ctx: ctx };
  }

  getBiome(floor = 1) {
    if (floor === 2) {
      return {
        name: 'Sunken Catacombs',
        fogColor: 0x051310,
        ambientColor: 0x182c20,
        torchColor: 0x2ed573,
        torchLightColor: 0x10ac84,
        wallRoughness: 0.9,
        floorRoughness: 0.65
      };
    } else if (floor === 3) {
      return {
        name: 'Volcanic Magma Core',
        fogColor: 0x160704,
        ambientColor: 0x2c120c,
        torchColor: 0xff4757,
        torchLightColor: 0xff6b81,
        wallRoughness: 0.8,
        floorRoughness: 0.85
      };
    } else if (floor >= 4) {
      return {
        name: 'Celestial Astral Void',
        fogColor: 0x0b0518,
        ambientColor: 0x1c1335,
        torchColor: 0x00d2d3,
        torchLightColor: 0xa55eea,
        wallRoughness: 0.75,
        floorRoughness: 0.5
      };
    }
    // Floor 1: The Obsidian Crypts
    return {
      name: 'The Obsidian Crypts',
      fogColor: 0x07090e,
      ambientColor: 0x2d3748,
      torchColor: 0xffaa22,
      torchLightColor: 0xff7722,
      wallRoughness: 0.85,
      floorRoughness: 0.75
    };
  }

  getWallTexture(floor = 1) {
    const key = `wall_${floor || 1}`;
    if (this.cache[key]) return this.cache[key];
    const { canvas, ctx } = this.createCanvas(256, 256);

    // Color palettes per floor
    let baseColor = '#161922';
    let brickGradA = '#2d3345';
    let brickGradB = '#1e2330';
    let highlight = '#444d66';
    let shadow = '#0f1118';
    let crackColor = '#12141c';
    let mortar = '#0a0c10';

    if (floor === 2) {
      // Overgrown Sunken Catacombs
      baseColor = '#131e17';
      brickGradA = '#213829';
      brickGradB = '#17271d';
      highlight = '#385e44';
      shadow = '#0b130e';
      crackColor = '#2ed573';
      mortar = '#080f0b';
    } else if (floor === 3) {
      // Volcanic Magma Core
      baseColor = '#1a0c0a';
      brickGradA = '#3a1a15';
      brickGradB = '#220f0c';
      highlight = '#5a251d';
      shadow = '#0d0504';
      crackColor = '#ff4757';
      mortar = '#2c0d08';
    } else if (floor >= 4) {
      // Celestial Astral Void
      baseColor = '#0f0a1c';
      brickGradA = '#241a40';
      brickGradB = '#160f29';
      highlight = '#3d2b6b';
      shadow = '#07040d';
      crackColor = '#00d2d3';
      mortar = '#080512';
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    // Stone brick rows
    const rows = 4;
    const rowH = 64;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * 64;
      for (let c = -1; c < 5; c++) {
        const x = c * 128 + offset;
        const y = r * rowH;

        // Brick surface gradient
        const grad = ctx.createLinearGradient(x, y, x + 120, y + 58);
        grad.addColorStop(0, brickGradA);
        grad.addColorStop(1, brickGradB);
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y + 2, 122, 58);

        // Brick top highlight
        ctx.fillStyle = highlight;
        ctx.fillRect(x + 2, y + 2, 122, 3);
        ctx.fillRect(x + 2, y + 2, 3, 58);

        // Brick bottom shadow
        ctx.fillStyle = shadow;
        ctx.fillRect(x + 2, y + 57, 122, 3);
        ctx.fillRect(x + 121, y + 2, 3, 58);

        // Weathering cracks / glow fissures
        ctx.fillStyle = crackColor;
        ctx.fillRect(x + 20, y + 15, 12, 2);
        ctx.fillRect(x + 30, y + 17, 2, 8);
        ctx.fillRect(x + 75, y + 35, 15, 2);

        // Biome specific accents
        if (floor === 2) {
          // Emerald moss patches
          ctx.fillStyle = '#27ae60';
          ctx.fillRect(x + 10, y + 42, 24, 8);
          ctx.fillRect(x + 80, y + 8, 16, 6);
        } else if (floor === 3) {
          // Glowing magma vein
          ctx.fillStyle = '#ff793f';
          ctx.fillRect(x + 40, y + 22, 18, 3);
          ctx.fillStyle = '#fffa65';
          ctx.fillRect(x + 46, y + 23, 6, 1);
        } else if (floor >= 4) {
          // Cosmic rune glyph
          ctx.fillStyle = '#a55eea';
          ctx.fillRect(x + 50, y + 20, 10, 2);
          ctx.fillRect(x + 54, y + 16, 2, 10);
        }
      }
    }

    // Mortar lines
    ctx.fillStyle = mortar;
    for (let r = 0; r <= rows; r++) {
      ctx.fillRect(0, r * rowH - 1, 256, 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.cache[key] = tex;
    if (floor === 1) this.cache['wall'] = tex;
    return tex;
  }

  getFloorTexture(floor = 1) {
    const key = `floor_${floor || 1}`;
    if (this.cache[key]) return this.cache[key];
    const { canvas, ctx } = this.createCanvas(256, 256);

    let baseColor = '#181b24';
    let tileColor = '#222634';
    let bevel = '#2e3448';
    let grime = '#13151d';
    let mortar = '#0d0f15';

    if (floor === 2) {
      baseColor = '#152018';
      tileColor = '#1b2d22';
      bevel = '#2a4434';
      grime = '#0f1711';
      mortar = '#0a100c';
    } else if (floor === 3) {
      baseColor = '#1f0d0b';
      tileColor = '#2d1410';
      bevel = '#441d18';
      grime = '#ff4757';
      mortar = '#140807';
    } else if (floor >= 4) {
      baseColor = '#110b20';
      tileColor = '#1a1232';
      bevel = '#2e2055';
      grime = '#00d2d3';
      mortar = '#080510';
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    // Grid of large square floor tiles
    const tileSize = 64;
    for (let y = 0; y < 256; y += tileSize) {
      for (let x = 0; x < 256; x += tileSize) {
        ctx.fillStyle = tileColor;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // Tile inner bevel
        ctx.fillStyle = bevel;
        ctx.fillRect(x + 4, y + 4, tileSize - 8, 3);
        ctx.fillRect(x + 4, y + 4, 3, tileSize - 8);

        // Grime or glowing fissure
        ctx.fillStyle = grime;
        ctx.fillRect(x + 10, y + 25, 14, (floor === 3 || floor >= 4) ? 2 : 8);
        ctx.fillRect(x + 35, y + 40, (floor === 3 || floor >= 4) ? 12 : 8, (floor === 3 || floor >= 4) ? 2 : 8);
      }
    }

    // Mortar grooves
    ctx.fillStyle = mortar;
    for (let i = 0; i <= 256; i += tileSize) {
      ctx.fillRect(i - 1, 0, 3, 256);
      ctx.fillRect(0, i - 1, 256, 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.cache[key] = tex;
    if (floor === 1) this.cache['floor'] = tex;
    return tex;
  }

  getCeilingTexture(floor = 1) {
    const key = `ceiling_${floor || 1}`;
    if (this.cache[key]) return this.cache[key];
    const { canvas, ctx } = this.createCanvas(256, 256);

    let baseColor = '#10121a';
    let beamColor = '#231811';
    let grainColor = '#3a271c';

    if (floor === 2) {
      baseColor = '#0f1712';
      beamColor = '#1a241c';
      grainColor = '#293a2d';
    } else if (floor === 3) {
      baseColor = '#180a08';
      beamColor = '#2a110e';
      grainColor = '#421a15';
    } else if (floor >= 4) {
      baseColor = '#0c0717';
      beamColor = '#180f2d';
      grainColor = '#2b1b4f';
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    // Support beams or cosmic void
    if (floor >= 4) {
      // Cosmic void ceiling with stars & nebula dust
      for (let s = 0; s < 45; s++) {
        const sx = (s * 37) % 256;
        const sy = (s * 53) % 256;
        ctx.fillStyle = s % 3 === 0 ? '#00d2d3' : (s % 2 === 0 ? '#a55eea' : '#ffffff');
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else {
      ctx.fillStyle = beamColor;
      ctx.fillRect(0, 48, 256, 32);
      ctx.fillRect(0, 176, 256, 32);

      ctx.fillStyle = grainColor;
      ctx.fillRect(0, 52, 256, 2);
      ctx.fillRect(0, 68, 256, 3);
      ctx.fillRect(0, 182, 256, 2);
      ctx.fillRect(0, 198, 256, 3);

      ctx.fillStyle = '#57606f';
      const bolts = [20, 90, 160, 230];
      bolts.forEach(bx => {
        ctx.fillRect(bx, 60, 6, 6);
        ctx.fillRect(bx, 188, 6, 6);
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.cache[key] = tex;
    if (floor === 1) this.cache['ceiling'] = tex;
    return tex;
  }

  getDoorTexture() {
    if (this.cache['door']) return this.cache['door'];
    const { canvas, ctx } = this.createCanvas(256, 256);

    // Heavy dark oak planks
    ctx.fillStyle = '#3a271c';
    ctx.fillRect(0, 0, 256, 256);

    // Vertical plank grooves
    ctx.fillStyle = '#1c130d';
    for (let x = 0; x <= 256; x += 32) {
      ctx.fillRect(x - 1, 0, 2, 256);
    }

    // Heavy iron cross-bands
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(0, 36, 256, 28);
    ctx.fillRect(0, 192, 256, 28);

    // Iron rivets
    ctx.fillStyle = '#747d8c';
    for (let x = 16; x < 256; x += 32) {
      ctx.fillRect(x, 46, 8, 8);
      ctx.fillRect(x, 202, 8, 8);
    }

    // Ornate bronze lock & keyhole plate
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(112, 112, 32, 40);
    ctx.fillStyle = '#e1b12c';
    ctx.fillRect(116, 116, 24, 32);
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(124, 124, 8, 12);
    ctx.fillRect(126, 136, 4, 10);

    const tex = new THREE.CanvasTexture(canvas);
    this.cache['door'] = tex;
    return tex;
  }

  getChestTexture() {
    if (this.cache['chest']) return this.cache['chest'];
    const { canvas, ctx } = this.createCanvas(128, 128);

    ctx.fillStyle = '#4b382a';
    ctx.fillRect(0, 0, 128, 128);

    // Gold filigree borders
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(0, 0, 128, 12);
    ctx.fillRect(0, 116, 128, 12);
    ctx.fillRect(0, 0, 12, 128);
    ctx.fillRect(116, 0, 12, 128);

    // Gold latch
    ctx.fillStyle = '#ffd32a';
    ctx.fillRect(52, 48, 24, 32);
    ctx.fillStyle = '#111';
    ctx.fillRect(60, 60, 8, 12);

    const tex = new THREE.CanvasTexture(canvas);
    this.cache['chest'] = tex;
    return tex;
  }
}

// Global texture generator
window.gameTextures3D = new TextureGenerator();
