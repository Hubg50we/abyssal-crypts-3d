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

  getWallTexture() {
    if (this.cache['wall']) return this.cache['wall'];
    const { canvas, ctx } = this.createCanvas(256, 256);

    // Dark granite foundation
    ctx.fillStyle = '#161922';
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
        grad.addColorStop(0, '#2d3345');
        grad.addColorStop(1, '#1e2330');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y + 2, 122, 58);

        // Brick top highlight
        ctx.fillStyle = '#444d66';
        ctx.fillRect(x + 2, y + 2, 122, 3);
        ctx.fillRect(x + 2, y + 2, 3, 58);

        // Brick bottom shadow
        ctx.fillStyle = '#0f1118';
        ctx.fillRect(x + 2, y + 57, 122, 3);
        ctx.fillRect(x + 121, y + 2, 3, 58);

        // Weathering cracks
        ctx.fillStyle = '#12141c';
        ctx.fillRect(x + 20, y + 15, 12, 2);
        ctx.fillRect(x + 30, y + 17, 2, 8);
        ctx.fillRect(x + 75, y + 35, 15, 2);
      }
    }

    // Mortar lines
    ctx.fillStyle = '#0a0c10';
    for (let r = 0; r <= rows; r++) {
      ctx.fillRect(0, r * rowH - 1, 256, 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.cache['wall'] = tex;
    return tex;
  }

  getFloorTexture() {
    if (this.cache['floor']) return this.cache['floor'];
    const { canvas, ctx } = this.createCanvas(256, 256);

    // Dark flagstone base
    ctx.fillStyle = '#181b24';
    ctx.fillRect(0, 0, 256, 256);

    // Grid of large square floor tiles
    const tileSize = 64;
    for (let y = 0; y < 256; y += tileSize) {
      for (let x = 0; x < 256; x += tileSize) {
        ctx.fillStyle = '#222634';
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // Tile inner bevel
        ctx.fillStyle = '#2e3448';
        ctx.fillRect(x + 4, y + 4, tileSize - 8, 3);
        ctx.fillRect(x + 4, y + 4, 3, tileSize - 8);

        // Subtle moss or grime
        ctx.fillStyle = '#13151d';
        ctx.fillRect(x + 10, y + 25, 14, 8);
        ctx.fillRect(x + 35, y + 40, 8, 8);
      }
    }

    // Mortar grooves
    ctx.fillStyle = '#0d0f15';
    for (let i = 0; i <= 256; i += tileSize) {
      ctx.fillRect(i - 1, 0, 3, 256);
      ctx.fillRect(0, i - 1, 256, 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.cache['floor'] = tex;
    return tex;
  }

  getCeilingTexture() {
    if (this.cache['ceiling']) return this.cache['ceiling'];
    const { canvas, ctx } = this.createCanvas(256, 256);

    // Deep vaulted subterranean stone
    ctx.fillStyle = '#10121a';
    ctx.fillRect(0, 0, 256, 256);

    // Heavy wooden support beams
    ctx.fillStyle = '#231811';
    ctx.fillRect(0, 48, 256, 32);
    ctx.fillRect(0, 176, 256, 32);

    // Wood grain lines
    ctx.fillStyle = '#3a271c';
    ctx.fillRect(0, 52, 256, 2);
    ctx.fillRect(0, 68, 256, 3);
    ctx.fillRect(0, 182, 256, 2);
    ctx.fillRect(0, 198, 256, 3);

    // Iron bolt rivets
    ctx.fillStyle = '#57606f';
    const bolts = [20, 90, 160, 230];
    bolts.forEach(bx => {
      ctx.fillRect(bx, 60, 6, 6);
      ctx.fillRect(bx, 188, 6, 6);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.cache['ceiling'] = tex;
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
