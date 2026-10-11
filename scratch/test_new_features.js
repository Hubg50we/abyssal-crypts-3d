/**
 * Automated Verification for New Features:
 * - Paladin class & Warrior/Rogue Ultimate Abilities
 * - Floor-based Biomes (Floors 1-4)
 * - New Monster Spawning (bog_abomination, magma_golem, void_stalker)
 * - Web Audio FX Methods
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- RUNNING NEW FEATURE VERIFICATION ---');

// 1. Verify Paladin Class & Ultimates in game.js
const gameSrc = fs.readFileSync('./public/js/game.js', 'utf8');

assert(gameSrc.includes('Paladin: {'), 'Paladin class defined in game.js');
assert(gameSrc.includes("id: 'smite'"), 'Paladin smite ability present');
assert(gameSrc.includes("id: 'holy_radiance'"), 'Paladin holy_radiance ability present');
assert(gameSrc.includes("id: 'aegis'"), 'Paladin aegis ability present');
assert(gameSrc.includes("id: 'battlecry'"), 'Warrior battlecry ability present');
assert(gameSrc.includes("id: 'fan_of_knives'"), 'Rogue fan_of_knives ability present');
assert(gameSrc.includes('case \'smite\':'), 'smite handler present in useAbility');
assert(gameSrc.includes('case \'holy_radiance\':'), 'holy_radiance handler present in useAbility');
assert(gameSrc.includes('case \'aegis\':'), 'aegis handler present in useAbility');
assert(gameSrc.includes('case \'battlecry\':'), 'battlecry handler present in useAbility');
assert(gameSrc.includes('case \'fan_of_knives\':'), 'fan_of_knives handler present in useAbility');
assert(gameSrc.includes('hudBossBarContainer'), 'hudBossBarContainer tracked in updateHUD');
console.log('✔ PASS: Paladin & Ultimate abilities verified in game.js');

// 2. Verify Biomes in textures3d.js
const texturesSrc = fs.readFileSync('./public/js/textures3d.js', 'utf8');
assert(texturesSrc.includes('getBiome('), 'getBiome defined in textures3d.js');
assert(texturesSrc.includes('The Obsidian Crypts'), 'Biome 1: Obsidian Crypts');
assert(texturesSrc.includes('Sunken Catacombs'), 'Biome 2: Sunken Catacombs');
assert(texturesSrc.includes('Volcanic Magma Core'), 'Biome 3: Volcanic Magma Core');
assert(texturesSrc.includes('Celestial Astral Void'), 'Biome 4: Celestial Astral Void');
console.log('✔ PASS: Floor 1-4 Biomes verified in textures3d.js');

// 3. Verify 3D Spells & Paladin in engine3d.js
const engineSrc = fs.readFileSync('./public/js/engine3d.js', 'utf8');
assert(engineSrc.includes('spawnHolySmite'), 'spawnHolySmite in engine3d.js');
assert(engineSrc.includes('spawnHolyRadiance'), 'spawnHolyRadiance in engine3d.js');
assert(engineSrc.includes('spawnBattlecryShockwave'), 'spawnBattlecryShockwave in engine3d.js');
assert(engineSrc.includes('spawnFanOfKnivesBlades'), 'spawnFanOfKnivesBlades in engine3d.js');
assert(engineSrc.includes('spawnAegisShield'), 'spawnAegisShield in engine3d.js');
assert(engineSrc.includes("'Paladin'"), 'Paladin model style in engine3d.js');
console.log('✔ PASS: 3D Spells & Paladin mesh verified in engine3d.js');

// 4. Verify Sprites in sprites.js
const spritesSrc = fs.readFileSync('./public/js/sprites.js', 'utf8');
assert(spritesSrc.includes('renderPaladin()'), 'renderPaladin in sprites.js');
assert(spritesSrc.includes('renderBogAbomination()'), 'renderBogAbomination in sprites.js');
assert(spritesSrc.includes('renderMagmaGolem()'), 'renderMagmaGolem in sprites.js');
assert(spritesSrc.includes('renderVoidStalker()'), 'renderVoidStalker in sprites.js');
console.log('✔ PASS: New Sprites verified in sprites.js');

// 5. Verify Monster Spawning in server.py and dungeon.js
const serverSrc = fs.readFileSync('./server.py', 'utf8');
const dungeonSrc = fs.readFileSync('./public/js/dungeon.js', 'utf8');
assert(serverSrc.includes('bog_abomination'), 'bog_abomination defined in server.py');
assert(serverSrc.includes('magma_golem'), 'magma_golem defined in server.py');
assert(serverSrc.includes('void_stalker'), 'void_stalker defined in server.py');
assert(dungeonSrc.includes('bog_abomination'), 'bog_abomination defined in dungeon.js');
assert(dungeonSrc.includes('magma_golem'), 'magma_golem defined in dungeon.js');
assert(dungeonSrc.includes('void_stalker'), 'void_stalker defined in dungeon.js');
console.log('✔ PASS: New Monsters verified in server.py and dungeon.js');

// 6. Verify Web Audio Methods in audio.js
const audioSrc = fs.readFileSync('./public/js/audio.js', 'utf8');
assert(audioSrc.includes('playHoly('), 'playHoly in audio.js');
assert(audioSrc.includes('playDivine('), 'playDivine in audio.js');
assert(audioSrc.includes('playBattlecry('), 'playBattlecry in audio.js');
assert(audioSrc.includes('playFanOfKnives('), 'playFanOfKnives in audio.js');
assert(audioSrc.includes('playAegis('), 'playAegis in audio.js');
assert(audioSrc.includes('playBossEncounter('), 'playBossEncounter in audio.js');
console.log('✔ PASS: Audio synthesis methods verified in audio.js');

// 7. Verify Index.html UI elements
const htmlSrc = fs.readFileSync('./public/index.html', 'utf8');
assert(htmlSrc.includes('selectClass(\'Paladin\')'), 'Paladin card in index.html');
assert(htmlSrc.includes('id="hudBossBarContainer"'), 'Boss health bar in index.html');
assert(htmlSrc.includes('Aegis of Dawn'), 'Controls modal mentions ultimates');
console.log('✔ PASS: UI markup verified in index.html');

console.log('🎉 ALL 7 NEW FEATURE VERIFICATIONS PASSED PERFECTLY!');
