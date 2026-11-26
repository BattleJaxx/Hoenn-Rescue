import Phaser from 'phaser';
import {
  VIEW_W, VIEW_H, GROUND_TOP, GROUND_BOTTOM, WORLD_W, WAVES, MAX_ATTACKERS, PLAYER, ATTACKS, WILD,
} from './config.js';
import { makeTextures } from './textures.js';
import { Player, Poochyena, sign } from './fighters.js';
import { WILD_CLASSES, randomLaneY } from './wild.js';
import { Grunt, Pickup } from './grunt.js';
import { ITEMS, ITEM_IDS, itemDesc, rollItems, effects } from './items.js';
import { input } from './input.js';

const FONT = '"Press Start 2P", monospace';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function text(scene, x, y, str, size = 8, color = '#ffffff') {
  return scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: 2,
  });
}

// ---------------------------------------------------------------------------
export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    this.load.spritesheet('treecko', 'assets/treecko.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('treecko_actions', 'assets/treecko_actions.png', { frameWidth: 48, frameHeight: 32 });
    this.load.spritesheet('poochyena_actions', 'assets/poochyena_actions.png', { frameWidth: 48, frameHeight: 32 });
    this.load.image('fg-bush', 'assets/fg_bush.png');
    this.load.image('ground', 'assets/ground.png');
    this.load.spritesheet('poochyena', 'assets/poochyena.png', { frameWidth: 32, frameHeight: 32 });
    for (const m of ['wurmple', 'shroomish', 'silcoon']) {
      this.load.spritesheet(m, `assets/${m}.png`, { frameWidth: 32, frameHeight: 32 });
    }
    this.load.spritesheet('aqua_grunt', 'assets/aqua_grunt.png', { frameWidth: 16, frameHeight: 32 });
    for (const id of ITEM_IDS) this.load.image(`item_${id}`, `assets/items/${id}.png`);
  }

  create() {
    makeTextures(this);
    this.scene.start('title');
  }
}

// ---------------------------------------------------------------------------
export class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }

  create() {
    this.add.tileSprite(0, 0, VIEW_W, 110, 'bg-far').setOrigin(0);
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.45).setOrigin(0);
    text(this, VIEW_W / 2, 34, 'HOENN', 24, '#7cd35a').setOrigin(0.5);
    text(this, VIEW_W / 2, 62, 'RESCUE', 24, '#ffd23f').setOrigin(0.5);
    this.add.sprite(VIEW_W / 2 - 26, 112, 'treecko', 4).setScale(2).setFlipX(true);
    this.add.sprite(VIEW_W / 2 + 26, 112, 'poochyena', 4).setScale(2);
    const isTouch = document.body.classList.contains('touch');
    this.prompt = text(this, VIEW_W / 2, 132, isTouch ? 'TAP TO START' : 'PRESS ENTER', 8).setOrigin(0.5);
    if (!isTouch) {
      text(this, VIEW_W / 2, 152, 'MOVE ARROWS  LIGHT J  HEAVY K', 8, '#cfcfcf').setOrigin(0.5);
      text(this, VIEW_W / 2, 164, 'JUMP SPACE  SPECIAL L  BLOCK SHIFT', 8, '#cfcfcf').setOrigin(0.5);
    }
    this.t = 0;
    this.ready = false;
    this.time.delayedCall(300, () => { this.ready = true; });
  }

  update(_, delta) {
    input.update();
    this.t += delta;
    this.prompt.setVisible(Math.floor(this.t / 450) % 2 === 0);
    if (this.ready && (input.anyPressed || input.pressed.start)) this.scene.start('game');
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    this.camX = 0;
    this.locked = false;
    this.waveIdx = 0;
    this.waveState = 'none';     // none | fighting | choosing
    this.hitstop = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.enemies = [];
    this.seeds = [];
    this.enemyShots = [];
    this.clouds = [];
    this.pickups = [];
    this.hoverPickup = null;
    this.grunt = null;
    this.directorT = 0;
    this.frameDt = 16;
    this.lastTarget = null;
    this.lastTargetT = 0;
    this.goT = 0;
    this.wildT = Phaser.Math.Between(...WILD.firstDelay);
    this.pendingWild = null;

    this.cameras.main.setBounds(0, 0, WORLD_W, VIEW_H);
    this.cameras.main.setRoundPixels(true);

    this.buildBackground();

    this.player = new Player(this, 40, 140);
    this.player.facing = 1;

    this.buildHud();
    this.banner = text(this, VIEW_W / 2, 70, 'STAGE 1', 16, '#ffd23f').setOrigin(0.5).setScrollFactor(0).setDepth(20000);
    this.banner2 = text(this, VIEW_W / 2, 92, 'PETALBURG WOODS', 8).setOrigin(0.5).setScrollFactor(0).setDepth(20000);
  }

  // ----- Scenery ----------------------------------------------------------
  buildBackground() {
    this.bgFar = this.add.tileSprite(0, 0, VIEW_W, 110, 'bg-far').setOrigin(0).setScrollFactor(0).setDepth(-40);
    this.bgTrunks = this.add.tileSprite(0, -14, VIEW_W, 120, 'bg-trunks').setOrigin(0).setScrollFactor(0).setDepth(-30);
    this.ground = this.add.tileSprite(0, GROUND_TOP - 12, VIEW_W, 76, 'ground').setOrigin(0).setScrollFactor(0).setDepth(-20);
    // Fill below the ground strip with the colour of its bottom-left pixel
    const gTex = this.textures.get('ground').getSourceImage();
    const under = this.textures.getPixel(0, gTex.height - 1, 'ground');
    this.add.rectangle(0, GROUND_TOP - 12 + gTex.height, VIEW_W, VIEW_H, under ? under.color : 0x58a043)
      .setOrigin(0).setScrollFactor(0).setDepth(-21);
    this.fg = this.add.tileSprite(0, VIEW_H - 24, VIEW_W, 24, 'fg-bush').setOrigin(0).setScrollFactor(0).setDepth(9000);
  }

  updateBackground() {
    this.bgFar.tilePositionX = this.camX * 0.2;
    this.bgTrunks.tilePositionX = this.camX * 0.55;
    this.ground.tilePositionX = this.camX;
    this.fg.tilePositionX = this.camX * 1.3;
  }

  // ----- HUD ------------------------------------------------------------------
  buildHud() {
    const D = 20000;
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(D);
    this.add.image(2, 0, 'treecko', 0).setOrigin(0).setScrollFactor(0).setDepth(D + 1);
    text(this, 32, 3, 'TREECKO', 8).setScrollFactor(0).setDepth(D + 1);
    this.expText = text(this, 92, 3, '', 8, '#9fd8ff').setScrollFactor(0).setDepth(D + 1);
    this.spText = text(this, 128, 17, 'SP', 8, '#9cff6a').setScrollFactor(0).setDepth(D + 1);
    this.enemyName = text(this, VIEW_W - 4, 3, '', 8).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 1);
    this.goArrow = this.add.image(VIEW_W - 22, 70, 'go-arrow').setScrollFactor(0).setDepth(D).setVisible(false);
    this.goText = text(this, VIEW_W - 34, 66, 'GO', 8, '#ffd23f').setOrigin(1, 0).setScrollFactor(0).setDepth(D).setVisible(false);
    this.itemRow = [];

    // Item choice panel (shown while standing on a dropped item)
    this.panel = this.add.container(0, 0).setScrollFactor(0).setDepth(D + 2).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.82).fillRect(8, 136, VIEW_W - 16, 40);
    bg.lineStyle(1, 0xffffff, 0.8).strokeRect(8.5, 136.5, VIEW_W - 17, 39);
    this.panelIcon = this.add.image(26, 156, 'item_lucky_egg');
    this.panelName = text(this, 44, 141, '', 8, '#ffd23f');
    this.panelDesc = this.add.text(44, 153, '', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff', wordWrap: { width: 250 }, lineSpacing: 2,
    });
    const isTouch = document.body.classList.contains('touch');
    this.panelHint = text(this, VIEW_W - 12, 141, isTouch ? 'L: TAKE' : 'J: TAKE', 8, '#9cff6a').setOrigin(1, 0);
    this.panel.add([bg, this.panelIcon, this.panelName, this.panelDesc, this.panelHint]);
  }

  refreshItemRow() {
    this.itemRow.forEach((o) => o.destroy());
    this.itemRow = [];
    let x = 34;
    for (const id of ITEM_IDS) {
      const n = this.player.items[id];
      if (!n) continue;
      const img = this.add.image(x, 34, `item_${id}`).setScale(0.5).setScrollFactor(0).setDepth(20001);
      this.itemRow.push(img);
      if (n > 1) {
        this.itemRow.push(text(this, x + 3, 33, `${n}`, 8).setScrollFactor(0).setDepth(20002));
      }
      x += n > 1 ? 20 : 14;
    }
  }

  drawBar(g, x, y, w, h, frac, color) {
    g.fillStyle(0x000000, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0x3a3a3a, 1).fillRect(x, y, w, h);
    g.fillStyle(color, 1).fillRect(x, y, Math.round(w * clamp(frac, 0, 1)), h);
  }

  updateHud() {
    const g = this.hud;
    const p = this.player;
    g.clear();
    const hpFrac = p.hp / p.maxHp;
    this.drawBar(g, 32, 13, 92, 5, hpFrac, hpFrac > 0.5 ? 0x58d858 : hpFrac > 0.2 ? 0xf8d030 : 0xf85838);
    this.drawBar(g, 32, 21, 92, 3, p.energy / PLAYER.energyMax, 0x40b8f8);
    g.fillStyle(0xffffff, 1).fillRect(32 + 46, 20, 1, 5); // special cost marker
    const ready = p.energy >= PLAYER.specialCost;
    this.spText.setVisible(ready && Math.floor(this.time.now / 300) % 2 === 0);
    this.expText.setText(`EXP ${Math.floor(p.exp)}`);

    const e = this.lastTarget;
    if (e && !e.removed && this.lastTargetT > 0) {
      this.enemyName.setText(e.wild ? `WILD ${e.name}` : e.name).setVisible(true);
      this.drawBar(g, VIEW_W - 96, 13, 92, 5, e.hp / e.maxHp, 0xf85838);
    } else {
      this.enemyName.setVisible(false);
    }

    const showGo = this.goT > 0 && Math.floor(this.goT / 250) % 2 === 0;
    this.goArrow.setVisible(showGo);
    this.goText.setVisible(showGo);

    const h = this.hoverPickup;
    this.panel.setVisible(!!h);
    if (h) {
      const have = p.items[h.id] || 0;
      this.panelIcon.setTexture(`item_${h.id}`);
      this.panelName.setText(have ? `${ITEMS[h.id].name} (have ${have})` : ITEMS[h.id].name);
      this.panelDesc.setText(itemDesc(h.id, have + 1));
    }
  }

  floatText(x, y, str, color = '#ffffff') {
    const t = text(this, Math.round(x), Math.round(y), str, 8, color).setOrigin(0.5).setDepth(19500);
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // ----- Combat helpers -------------------------------------------------------
  overlaps(a, t, atk) {
    const dx = (t.x - a.x) * a.facing;
    return dx > -6 && dx < atk.range + 6
      && Math.abs(t.y - a.y) <= atk.depth
      && Math.abs(t.z - a.z) < 26;
  }

  noteTarget(e) {
    this.lastTarget = e;
    this.lastTargetT = 2500;
  }

  meleeHit(attacker, atk, hitSet) {
    for (const e of this.enemies) {
      if (hitSet.has(e) || !e.alive || e.removed) continue;
      if (!this.overlaps(attacker, e, atk)) continue;
      const r = e.takeHit(attacker, atk);
      if (!r) continue;
      hitSet.add(e);
      this.noteTarget(e);
      if (r === 'hit') {
        this.player.gainEnergy(PLAYER.energyPerHit);
        this.hitstop = atk.knockdown ? 85 : 55;
        this.spark((attacker.x + e.x) / 2, e.y - e.z - 14);
        if (atk.shake) this.cameras.main.shake(110, 0.012);
      }
    }
  }

  enemyHit(enemy, atk, hitSet) {
    const p = this.player;
    if (hitSet.has(p) || !p.alive) return;
    if (!this.overlaps(enemy, p, atk)) return;
    const r = p.takeHit(enemy, atk);
    if (!r) return;
    hitSet.add(p);
    if (r === 'hit') {
      this.hitstop = 60;
      this.spark((enemy.x + p.x) / 2, p.y - p.z - 14);
    }
  }

  sfxBlock(f) {
    this.spark(f.x + f.facing * 8, f.y - f.z - 14, 0x9fc4ff);
  }

  spark(x, y, tint = 0xffffff) {
    const s = this.add.image(Math.round(x), Math.round(y), 'spark').setDepth(9500).setTint(tint);
    this.tweens.add({ targets: s, scale: 1.8, alpha: 0, duration: 160, onComplete: () => s.destroy() });
  }

  onEnemyKO(e) {
    const p = this.player;
    const gained = e.exp * effects.xpMult(p.items);
    p.exp += gained;
    this.floatText(e.x, e.y - 36, `+${Math.round(gained)} EXP`, '#9fd8ff');
    p.heal(effects.koHeal(p.items));
  }

  // Silcoon and other obstacles: push a fighter out of their body
  pushOutOfObstacles(f) {
    for (const e of this.enemies) {
      if (!e.obstacle || !e.alive || e.removed || f.z > 14) continue;
      const dx = f.x - e.x;
      if (Math.abs(dx) < e.obstacle.w && Math.abs(f.y - e.y) < e.obstacle.d) {
        f.x = e.x + sign(dx) * e.obstacle.w;
      }
    }
  }

  // ----- Projectiles ----------------------------------------------------------
  fireSeed(p) {
    const img = this.add.image(p.x, p.y, 'seed').setDepth(9400);
    img.setFlipX(p.facing < 0);
    this.seeds.push({
      img, x: p.x + p.facing * 12, y: p.y + (Math.random() - 0.5) * 4, z: p.z + 14,
      dir: p.facing, life: 0.75,
      atk: { ...ATTACKS.seed, dmg: ATTACKS.seed.dmg * p.outgoing('seed') },
    });
  }

  updateSeeds(dt) {
    for (const s of this.seeds) {
      s.x += s.dir * 240 * dt;
      s.life -= dt;
      for (const e of this.enemies) {
        if (!e.alive || e.removed || s.life <= 0) continue;
        if (Math.abs(e.x - s.x) < 10 && Math.abs(e.y - s.y) < 9 && e.z < 24) {
          const r = e.takeHit({ x: s.x - s.dir * 20, y: s.y }, s.atk);
          if (r) {
            this.noteTarget(e);
            this.spark(s.x, s.y - s.z, 0xc8ff90);
            this.hitstop = Math.max(this.hitstop, 30);
            s.life = 0;
          }
        }
      }
      s.img.setPosition(Math.round(s.x), Math.round(s.y - s.z)).setDepth(11 + s.y);
      if (s.life <= 0) s.img.destroy();
    }
    this.seeds = this.seeds.filter((s) => s.life > 0);
  }

  fireEnemyShot(owner, texture, atk) {
    const img = this.add.image(owner.x, owner.y, texture).setDepth(9400).setFlipX(owner.facing < 0);
    this.enemyShots.push({
      img, x: owner.x + owner.facing * 10, y: owner.y, z: 8, dir: owner.facing,
      speed: atk.speed, life: atk.life, atk,
    });
  }

  updateEnemyShots(dt) {
    const p = this.player;
    for (const s of this.enemyShots) {
      s.x += s.dir * s.speed * dt;
      s.life -= dt;
      if (s.life > 0 && p.alive && Math.abs(p.x - s.x) < 8 && Math.abs(p.y - s.y) < 7 && p.z < 20) {
        const r = p.takeHit({ x: s.x - s.dir * 20, y: s.y }, s.atk);
        if (r) {
          if (r === 'hit') this.spark(s.x, p.y - 14, 0xe0e0ff);
          s.life = 0;
        }
      }
      s.img.setPosition(Math.round(s.x), Math.round(s.y - s.z)).setDepth(11 + s.y);
      if (s.life <= 0) s.img.destroy();
    }
    this.enemyShots = this.enemyShots.filter((s) => s.life > 0);
  }

  spawnSporeCloud(owner, S) {
    const img = this.add.image(owner.x, owner.y - 6, 'spore').setDepth(10 + owner.y + 2).setAlpha(0);
    this.tweens.add({ targets: img, alpha: 0.9, duration: 200 });
    this.clouds.push({ img, x: owner.x, y: owner.y, life: S.life, tickT: 0, S, owner });
  }

  updateClouds(dt) {
    const p = this.player;
    const ms = dt * 1000;
    for (const c of this.clouds) {
      c.life -= ms;
      c.tickT -= ms;
      c.img.setPosition(Math.round(c.x + Math.sin(this.time.now / 300) * 2), Math.round(c.y - 6));
      if (c.life < 400) c.img.setAlpha(Math.max(0, c.life / 400) * 0.9);
      const inside = Math.abs(p.x - c.x) < c.S.radiusX && Math.abs(p.y - c.y) < c.S.radiusY && p.z < 20;
      if (inside && c.tickT <= 0 && p.alive) {
        c.tickT = c.S.tick;
        p.takeHit({ x: c.x, y: c.y }, { dmg: c.S.dmg, unblockable: true, noStagger: true, owner: c.owner });
      }
      if (c.life <= 0) c.img.destroy();
    }
    this.clouds = this.clouds.filter((c) => c.life > 0);
  }

  // ----- Turn-taking director ---------------------------------------------
  releaseToken(e) {
    e.token = false;
    e.tokenAge = 0;
  }

  updateDirector(dt) {
    this.directorT -= dt * 1000;
    if (this.directorT > 0) return;
    this.directorT = 450;
    const p = this.player;
    if (!p.alive || ['launched', 'down', 'getup'].includes(p.state)) return;
    const live = this.enemies.filter((e) => e.alive && !e.removed && !e.noToken);
    const holders = live.filter((e) => e.token).length;
    if (holders >= MAX_ATTACKERS) return;
    const free = live.filter((e) => !e.token && e.state === 'idle');
    if (!free.length) return;
    const pick = free[Math.floor(Math.random() * free.length)];
    pick.token = true;
    pick.tokenAge = 0;
  }

  // ----- Grunt waves and item choice ---------------------------------------
  startWave(count) {
    this.locked = true;
    this.goT = 0;
    this.waveState = 'fighting';
    this.grunt = new Grunt(this, this.camX + 236);
    for (let i = 0; i < count; i++) {
      const fromRight = i % 2 === 0;
      const x = fromRight ? this.camX + VIEW_W + 20 + i * 14 : this.camX - 20 - i * 14;
      const y = GROUND_TOP + 6 + Math.random() * (GROUND_BOTTOM - GROUND_TOP - 12);
      const e = new Poochyena(this, x, y);
      e.fromGrunt = true;
      this.enemies.push(e);
    }
  }

  dropItems(x) {
    const ids = rollItems(2);
    const cx = clamp(x, this.camX + 60, this.camX + 260);
    const y = GROUND_TOP + 22;
    this.pickups = ids.map((id, i) => new Pickup(this, id, x, GROUND_TOP - 30, cx + (i ? 30 : -30), y));
  }

  takePickup(pk) {
    const p = this.player;
    p.addItem(pk.id);
    this.floatText(p.x, p.y - 44, `GOT ${ITEMS[pk.id].name}!`, '#ffd23f');
    this.pickups.forEach((o) => o.poof());
    this.pickups = [];
    this.hoverPickup = null;
    this.refreshItemRow();
    this.waveState = 'none';
    this.locked = false;
    this.waveIdx++;
    if (this.waveIdx >= WAVES.length) this.time.delayedCall(700, () => this.stageClear());
    else this.goT = 3000;
  }

  updateWaves(dt) {
    const p = this.player;
    if (this.grunt && !this.grunt.removed) this.grunt.update(dt);

    if (this.waveState === 'none') {
      const target = clamp(p.x - 130, 0, WORLD_W - VIEW_W);
      this.camX = Math.max(this.camX, target); // arcade-style: no scrolling back
      const next = WAVES[this.waveIdx];
      if (next && p.x >= next.at) this.startWave(next.count);
    } else if (this.waveState === 'fighting') {
      const left = this.enemies.filter((e) => e.fromGrunt && e.alive && !e.removed).length;
      if (left === 0 && this.grunt && this.grunt.state === 'stand') {
        this.grunt.defeat();
        p.heal(effects.waveHeal(p.items)); // Leftovers
        this.waveState = 'choosing';
      }
    } else if (this.waveState === 'choosing') {
      // Which dropped item is Treecko standing on?
      this.hoverPickup = null;
      for (const pk of this.pickups) {
        pk.update(this.time.now, false);
        if (pk.landed && Math.abs(p.x - pk.x) < 14 && Math.abs(p.y - pk.y) < 10 && p.z < 6) this.hoverPickup = pk;
      }
      if (this.hoverPickup) this.hoverPickup.update(this.time.now, true);
    }
    this.cameras.main.scrollX = Math.round(this.camX);
  }

  // ----- Wild encounters --------------------------------------------------------
  updateWild(dt) {
    if (this.phase !== 'play' || this.waveState === 'choosing') return;
    // Time passes twice as fast between waves, so walking stretches get encounters too
    this.wildT -= dt * 1000 * (this.waveState === 'none' ? 2 : 1);
    if (this.wildT > 0 || this.pendingWild) return;
    this.wildT = Phaser.Math.Between(...WILD.interval);
    const wildAlive = this.enemies.filter((e) => e.wild && e.alive && !e.removed).length;
    if (wildAlive >= WILD.maxAlive) return;

    // Pick a species by the encounter table
    const total = WILD.table.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    const species = WILD.table.find((r) => (roll -= r.weight) < 0).species;

    // Rustle a patch of tall grass first, away from the player
    const p = this.player;
    let x;
    for (let tries = 0; tries < 10; tries++) {
      x = this.camX + 30 + Math.random() * (VIEW_W - 60);
      if (Math.abs(x - p.x) > 50) break;
    }
    const fromTop = Math.random() < 0.5;
    const y = fromTop ? GROUND_TOP - 4 : GROUND_BOTTOM + 4;
    this.pendingWild = { species, x, y, t: 750 };
    this.rustle(x, y);
  }

  rustle(x, y) {
    const mark = text(this, x, y - 20, '!', 8, '#ffd23f').setOrigin(0.5).setDepth(19000);
    this.tweens.add({ targets: mark, y: y - 26, yoyo: true, repeat: 2, duration: 120, onComplete: () => mark.destroy() });
    for (let i = 0; i < 8; i++) {
      const leaf = this.add.image(x + (Math.random() - 0.5) * 14, y, 'leaf').setDepth(10 + y);
      this.tweens.add({
        targets: leaf,
        x: leaf.x + (Math.random() - 0.5) * 24,
        y: y - 8 - Math.random() * 14,
        alpha: 0,
        delay: Math.random() * 400,
        duration: 450,
        onComplete: () => leaf.destroy(),
      });
    }
  }

  updatePendingWild(dt) {
    const w = this.pendingWild;
    if (!w) return;
    w.t -= dt * 1000;
    if (w.t > 0) return;
    this.pendingWild = null;
    const opts = { emerge: true, emergeToY: randomLaneY() };
    const e = w.species === 'poochyena'
      ? new Poochyena(this, w.x, w.y, { ...opts, wild: true })
      : new WILD_CLASSES[w.species](this, w.x, w.y, opts);
    this.enemies.push(e);
  }

  stageClear() {
    this.phase = 'clear';
    this.phaseT = 0;
    this.banner.setText('STAGE CLEAR').setColor('#ffd23f').setVisible(true);
    this.banner2.setText(document.body.classList.contains('touch') ? 'TAP TO PLAY AGAIN' : 'PRESS ENTER TO PLAY AGAIN').setVisible(true);
  }

  gameOver() {
    this.phase = 'over';
    this.phaseT = 0;
    this.banner.setText('GAME OVER').setColor('#f85838').setVisible(true);
    this.banner2.setText(document.body.classList.contains('touch') ? 'TAP TO RETRY' : 'PRESS ENTER TO RETRY').setVisible(true);
  }

  // ----- Main loop ----------------------------------------------------------
  update(_, delta) {
    input.update();
    const dt = Math.min(delta, 50) / 1000;
    this.frameDt = delta;
    this.phaseT += delta;

    if (this.phase === 'intro') {
      if (this.phaseT > 1600) {
        this.phase = 'play';
        this.banner.setVisible(false);
        this.banner2.setVisible(false);
      }
    }
    if ((this.phase === 'over' || this.phase === 'clear') && this.phaseT > 900
      && (input.anyPressed || input.pressed.start)) {
      this.scene.restart();
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= delta;
    } else {
      if (this.phase !== 'intro') this.player.update(dt);
      for (const e of this.enemies) if (!e.removed) e.update(dt);
      this.enemies = this.enemies.filter((e) => !e.removed);
      this.updateSeeds(dt);
      this.updateEnemyShots(dt);
      this.updateClouds(dt);
      this.updateDirector(dt);
      this.updateWild(dt);
      this.updatePendingWild(dt);
      if (this.phase === 'play') this.updateWaves(dt);
      this.lastTargetT -= delta;
      this.goT = Math.max(0, this.goT - delta);

      if (this.phase === 'play' && this.player.state === 'dead' && this.player.t > 900) this.gameOver();
    }

    this.player.render();
    for (const e of this.enemies) e.render();
    this.updateBackground();
    this.updateHud();
  }
}
