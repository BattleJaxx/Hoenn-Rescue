import {
  SPRITE_SCALE, FEET_Y, GROUND_TOP, GROUND_BOTTOM, WORLD_W, GRAVITY,
  PLAYER, ATTACKS, POOCHYENA, BOSS_POOCHYENA,
} from './config.js';
import { input } from './input.js';
import { effects } from './items.js';
import { MOVES } from './config.js';
import { MOVES_DEF, TYPE_TINT } from './moves.js';
import {
  SPECIES, EVOLUTIONS, START_LEVEL, MAX_LEVEL, expForLevel, playerStats, enemyScale,
} from './leveling.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sign = (v) => (v < 0 ? -1 : 1);

// Follower sprite frames: 0-1 facing down, 2-3 facing up, 4-5 side (facing left)
const SIDE_A = 4;
const SIDE_B = 5;

// ---------------------------------------------------------------------------
// Base fighter: position on the beat 'em up plane (x, y = depth, z = height)
// ---------------------------------------------------------------------------
export class Fighter {
  constructor(scene, key, x, y, hp, name) {
    this.scene = scene;
    this.name = name;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.facing = 1;
    this.hp = hp;
    this.maxHp = hp;
    this.state = 'idle';
    this.t = 0;
    this.flash = 0;
    this.invuln = 0;
    this.offsetX = 0;
    this.walkT = 0;
    this.moving = false;
    this.removed = false;
    this.gravity = GRAVITY;
    this.damageTaken = 1;   // multiplier, e.g. Silcoon's Harden
    this.koReported = false;
    this.vulns = {};        // defence drops from moves like Rock Smash and Crunch
    this.slowedT = 0;       // paralysed/slowed by Body Slam, Bulldoze
    this.poisonT = 0;
    this.frozenT = 0;

    this.shadow = scene.add.image(x, y, 'shadow').setDepth(5).setScale(1.1, 1);
    this.sprite = scene.add.sprite(x, y, key, SIDE_A)
      .setOrigin(0.5, FEET_Y)
      .setScale(SPRITE_SCALE);
    this.slash = scene.add.image(x, y, 'slash').setVisible(false).setOrigin(0.2, 0.5);
  }

  setState(s) {
    this.state = s;
    this.t = 0;
  }

  get airborne() { return this.z > 0 || this.vz > 0; }
  get alive() { return this.hp > 0; }

  // Gravity, knockback sliding and landing. Returns true on the frame it lands.
  physics(dt) {
    let landed = false;
    if (this.airborne) {
      this.vz -= this.gravity * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        landed = true;
      }
    }
    this.x += this.vx * dt;
    if (!this.airborne) this.vx *= Math.pow(0.0005, dt); // ground friction
    if (Math.abs(this.vx) < 2) this.vx = 0;
    this.y = clamp(this.y, GROUND_TOP, GROUND_BOTTOM);
    return landed;
  }

  // Called when an attack connects. Returns 'hit', 'blocked', 'miss' or null (ignored).
  takeHit(src, atk) {
    if (!this.alive || this.invuln > 0) return null;
    if (['launched', 'down', 'getup', 'dead'].includes(this.state)) return null;

    const dir = sign(this.x - src.x); // direction we get pushed

    if (!atk.unblockable && this.state === 'block' && this.facing === -dir) {
      this.hp = Math.max(1, this.hp - 1); // chip damage, can't kill
      this.vx = dir * 50;
      this.blockFlash = 80;
      this.scene.sfxBlock(this);
      this.onBlock?.(src, atk);
      return 'blocked';
    }

    let dmg = atk.dmg * (atk.pierce ? 1 : this.damageTaken) * this.vulnMult;
    if (this.modifyIncoming) {
      dmg = this.modifyIncoming(dmg, atk);
      if (dmg === null) return 'miss';
    }

    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 90;
    if (!atk.noStagger || this.hp <= 0) {
      this.facing = -dir;
      if (this.hp <= 0 || atk.knockdown || this.airborne) {
        this.launch(dir, atk.launchHigh);
      } else {
        this.vx = dir * (atk.push || 20) * 3;
        this.stun = atk.stun || 250;
        if (atk.freeze) this.frozenT = this.stun;
        this.setState('hurt');
      }
    }
    this.onHurt?.(atk);
    this.reportKO();
    return 'hit';
  }

  // Damage without a hit reaction (e.g. Rocky Helmet). Still knocks out.
  chip(dmg) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 90;
    if (this.hp <= 0) this.launch(sign(this.x - this.scene.player.x));
    this.reportKO();
  }

  launch(dir, high) {
    this.gravity = GRAVITY;
    this.vx = dir * (high ? 40 : 95);
    this.vz = high ? 240 : 150;
    this.z = Math.max(this.z, 1);
    this.setState('launched');
  }

  reportKO() {
    if (this.hp <= 0 && !this.koReported) {
      this.koReported = true;
      this.onKO?.();
    }
  }

  // Shared handling of hurt / knockdown / get-up. Returns true if it handled this frame.
  updateDamageStates(dt, landed) {
    switch (this.state) {
      case 'hurt':
        if (this.t > this.stun) this.setState('idle');
        return true;
      case 'launched':
        if (landed) {
          this.scene.cameras.main.shake(60, 0.004);
          this.setState(this.alive ? 'down' : 'dead');
        }
        return true;
      case 'down':
        if (this.t > 650) this.setState('getup');
        return true;
      case 'getup':
        if (this.t > 260) {
          this.invuln = 700;
          this.setState('idle');
        }
        return true;
      case 'dead':
        return true;
      default:
        return false;
    }
  }

  get vulnMult() {
    let m = 1;
    for (const v of Object.values(this.vulns)) if (v.t > 0) m += v.stacks * v.amount;
    return m;
  }

  addVuln(key, amount, ms, maxStacks) {
    const prev = this.vulns[key];
    const stacks = Math.min(maxStacks, (prev && prev.t > 0 ? prev.stacks : 0) + 1);
    this.vulns[key] = { stacks, amount, t: ms };
  }

  slowFor(ms) { this.slowedT = Math.max(this.slowedT, ms); }

  poison(total, ms) {
    this.poisonT = ms;
    this.poisonRate = total / (ms / 1000);
    this.poisonAcc = 0;
  }

  tickTimers(dt) {
    const ms = dt * 1000;
    for (const v of Object.values(this.vulns)) v.t -= ms;
    this.slowedT = Math.max(0, this.slowedT - ms);
    this.frozenT = Math.max(0, this.frozenT - ms);
    if (this.poisonT > 0 && this.alive) {
      this.poisonT -= ms;
      this.poisonAcc += this.poisonRate * dt;
      if (this.poisonAcc >= 1) { this.chip(Math.floor(this.poisonAcc)); this.poisonAcc %= 1; }
    }
    this.t += ms;
    this.flash = Math.max(0, this.flash - ms);
    this.blockFlash = Math.max(0, (this.blockFlash || 0) - ms);
    this.invuln = Math.max(0, this.invuln - ms);
  }

  render() {
    const s = this.sprite;
    if (this.moving) this.walkT += this.scene.frameDt;
    else this.walkT = 0;
    const drawn = !!this.frameFor && this.useSheet !== false; // has a hand-drawn action sheet

    let frame;
    let angle = 0;
    if (drawn) {
      frame = this.frameFor();
    } else {
      // Follower sprite only: walk cycle on side frames, rotate to fake knockdowns
      frame = this.moving && Math.floor(this.walkT / 130) % 2 ? SIDE_B : SIDE_A;
      if (this.state === 'launched') angle = -this.facing * 35;
      if (this.state === 'down' || this.state === 'dead') angle = -this.facing * 90;
      if (this.state === 'getup') angle = -this.facing * 45;
    }
    s.setFrame(frame);
    s.setAngle(angle);
    s.setFlipX(this.facing > 0);
    // Drawn sheets carry their own lunges, so the code-driven nudge is only for follower sprites
    const ox = drawn ? 0 : this.offsetX;
    s.setPosition(Math.round(this.x + ox), Math.round(this.y - this.z));
    s.setDepth(10 + this.y);

    // Tints: white flash on hit, blue on block, yellow before an attack
    if (this.flash > 0) s.setTintFill(0xffffff);
    else if (this.blockFlash > 0) s.setTintFill(0x9fc4ff);
    else if (this.state === 'block' && !drawn) s.setTint(0x9fc4ff);
    else if (this.telegraph) s.setTint(Math.floor(this.t / 60) % 2 ? (this.telegraphColor || 0xffe070) : 0xffffff);
    else if (this.frozenT > 0) s.setTint(0xa0f0ff);
    else if (this.focusGlow) s.setTint(Math.floor(this.t / 70) % 2 ? 0xffb070 : 0xffffff);
    else if (this.glowT > 0) s.setTint(Math.floor(this.glowT / 80) % 2 ? 0xfff6a0 : 0xffffff);
    else if (this.tint) s.setTint(this.tint);
    else if (this.poisonT > 0) s.setTint(0xe0a0f0);
    else if (this.slowedT > 0) s.setTint(0xfff090);
    else s.clearTint();

    // Blink while invulnerable after getting up, or while fading out when dead
    let alpha = 1;
    if (this.invuln > 0) alpha = Math.floor(this.invuln / 70) % 2 ? 0.4 : 1;
    if (this.fade !== undefined) alpha = Math.floor(this.fade / 60) % 2 ? 0.2 : 1;
    s.setAlpha(alpha);

    // Shadow shrinks as we go higher
    const sh = clamp(1.1 - this.z / 120, 0.5, 1.1) * (this.size || 1);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y)).setScale(sh, this.size || 1);
  }

  showSlash(scale, tint) {
    if (tint) this.slash.setTint(tint); else this.slash.clearTint();
    this.slash
      .setVisible(true)
      .setScale(scale || 1)
      .setFlipX(this.facing < 0)
      .setOrigin(this.facing > 0 ? 0.2 : 0.8, 0.5)
      .setPosition(Math.round(this.x + this.facing * 8), Math.round(this.y - this.z - 14))
      .setDepth(11 + this.y);
  }

  hideSlash() { this.slash.setVisible(false); }

  destroy() {
    this.removed = true;
    this.sprite.destroy();
    this.shadow.destroy();
    this.slash.destroy();
  }
}

// ---------------------------------------------------------------------------
// Player: Treecko
// ---------------------------------------------------------------------------
export class Player extends Fighter {
  constructor(scene, x, y) {
    super(scene, 'treecko_actions', x, y, PLAYER.hp, 'TREECKO');
    this.form = 'treecko';
    this.useSheet = true;  // hand-drawn action sheet (Treecko only, so far)
    this.level = START_LEVEL;
    this.exp = expForLevel(START_LEVEL);
    this.upgrades = {};    // light: 'furyCutter' | heavy: 'leafBlade' | special: 'leafStorm'
    this.energy = 0;
    this.queued = null;
    this.items = {};       // item id -> stacks
    this.slowT = 0;        // String Shot slow, ms left
    this.ejectT = 0;       // Eject Button boost, ms left
    this.ejectDur = 1;
    this.spaDropT = 0;     // Leaf Storm's Sp. Atk drop, ms left
    this.furyStacks = 0;
    this.furyT = 0;
    this.glowT = 0;
    this.powerStacks = 0;  // Power-Up Punch
    this.powerT = 0;
    this.drops = { atk: 0, def: 0, spe: 0 }; // Superpower / Close Combat / Hammer Arm, ms left
    this.speedBoostT = 0;  // Flame Charge
    this.confuseT = 0;     // Spinda's Teeter Dance
    this.lastAttack = 'none'; // what Smeargle sketches
    this.recalcStats(true);
  }

  // ----- Level, stats and evolution ----------------------------------------
  recalcStats(fill) {
    this.stats = playerStats(this.form, this.level);
    const newMax = this.stats.maxHp * effects.machoStat(this.items);
    // Keep the HP gained (level up, evolution, Macho Brace), like the mainline games
    this.hp = fill ? newMax : this.hp + (newMax - this.maxHp);
    this.maxHp = newMax;
  }

  get expToNext() { return expForLevel(this.level + 1) - expForLevel(this.level); }
  get expIntoLevel() { return this.exp - expForLevel(this.level); }

  gainExp(n) {
    this.exp += n;
    while (this.level < MAX_LEVEL && this.exp >= expForLevel(this.level + 1)) this.levelUp();
  }

  levelUp() {
    this.level++;
    if (this.alive) this.recalcStats(false);
    this.glowT = 700;
    this.scene.floatText(this.x, this.y - 50, `LEVEL UP! Lv${this.level}`, '#fff6a0');
    const evo = EVOLUTIONS[this.form];
    if (evo && this.level >= evo.level) this.scene.queueEvolution(evo.into);
  }

  evolve(into) {
    this.form = into;
    this.name = SPECIES[into].name;
    this.useSheet = false;   // no hand-drawn sheet for Grovyle/Sceptile yet: follower sprite
    this.sprite.setTexture(into);
    this.recalcStats(false);
    this.hp = this.maxHp;    // evolving fully heals, as a reward
  }

  // ----- Items ---------------------------------------------------------
  addItem(id) {
    this.items[id] = (this.items[id] || 0) + 1;
    this.recalcStats(false); // Macho Brace raises max HP
  }

  healFlat(amount) {
    if (!this.alive || amount <= 0) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.floatText(this.x, this.y - 40, `+${Math.max(1, Math.round(amount))}`, '#7cff7c');
  }

  addPowerStack() {
    this.powerStacks = Math.min(5, this.powerStacks + 1);
    this.powerT = 6000;
  }

  statDrop(stat, ms) {
    this.drops[stat] = ms / effects.statDropSpeed(this.items);
    const label = { atk: 'ATTACK', def: 'DEFENCE', spe: 'SPEED' }[stat];
    this.scene.floatText(this.x, this.y - 48, `${label} FELL`, '#c8c8ff');
  }

  confuse(ms) {
    this.confuseT = ms / effects.statDropSpeed(this.items);
    this.scene.floatText(this.x, this.y - 40, 'CONFUSED', '#ff9fd0');
  }

  heal(frac) {
    if (!this.alive || frac <= 0) return;
    const amount = this.maxHp * frac;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.floatText(this.x, this.y - 40, `+${Math.max(1, Math.round(amount))}`, '#7cff7c');
  }

  get speedMult() {
    let m = effects.machoSpeed(this.items);
    if (this.slowT > 0) m *= 0.55;
    if (this.drops.spe > 0) m *= 0.7;
    if (this.speedBoostT > 0) m *= 1.5;
    if (this.ejectT > 0) m *= 1 + this.ejectT / this.ejectDur; // +100% fading to 0
    return m;
  }

  // Damage multiplier for our attacks: level stats, items and move upgrades
  outgoing(atkName) {
    let m = effects.machoStat(this.items);
    const special = atkName === 'seed' || atkName === 'leafStorm';
    m *= special ? this.stats.spaMult : this.stats.atkMult;
    if (special) {
      m *= effects.specialMult(this.items);
      if (this.spaDropT > 0) m *= MOVES.leafStorm.spaDrop;
    }
    if (atkName === 'light3') m *= effects.finisherMult(this.items);
    if (this.upgrades.light === 'furyCutter' && atkName.startsWith('light')) {
      m *= 1 + MOVES.furyCutter.perStack * this.furyStacks;
    }
    if (this.upgrades.heavy === 'leafBlade' && atkName === 'heavy') m *= MOVES.leafBlade.dmgMult;
    m *= 1 + 0.06 * this.powerStacks;
    if (this.drops.atk > 0) m *= 0.7;
    return m;
  }

  modifyIncoming(dmg) {
    if (Math.random() < effects.missChance(this.items)) {
      this.scene.floatText(this.x, this.y - 40, 'MISS', '#ffffff');
      return null;
    }
    dmg /= effects.machoStat(this.items);
    if (this.drops.def > 0) dmg *= 1.3;
    const flat = effects.flatReduce(this.items);
    if (flat) dmg = Math.max(1, dmg - flat);
    return dmg;
  }

  onHurt(atk) {
    this.furyStacks = 0;
    this.focusGlow = false;
    if (atk && atk.confuse) this.confuse(atk.confuse);
    const secs = effects.ejectSeconds(this.items);
    if (secs > 0) {
      this.ejectDur = secs * 1000;
      this.ejectT = this.ejectDur;
    }
    if (atk && atk.slow) {
      this.slowT = atk.slow / effects.statDropSpeed(this.items);
      this.scene.floatText(this.x, this.y - 40, 'SPEED DOWN', '#c8c8ff');
    }
  }

  onBlock(src, atk) {
    const dmg = effects.thorns(this.items);
    const target = (atk && atk.owner) || src;
    if (dmg > 0 && target && target.chip && target.alive) {
      target.chip(dmg);
      this.scene.spark(target.x, target.y - target.z - 14, 0xffb070);
      this.scene.noteTarget(target);
    }
  }

  // ----- Combat ----------------------------------------------------------
  startAttack(name) {
    this.atkName = name;
    this.lastAttack = name === 'heavy' ? 'heavy' : 'light';
    const slot = name === 'heavy' ? 'heavy' : 'light';
    const moveId = this.upgrades[slot];
    const mv = MOVES_DEF[moveId];
    const a = { ...ATTACKS[name] };
    if (mv && mv.build) mv.build(a, name);
    // Arm Thrust: the extra strikes before the finisher don't knock down
    if (moveId === 'armThrust' && name === 'light3' && this.chainN < 4) a.knockdown = false;
    a.dmg *= this.outgoing(name);
    // Critical hits: Leaf Blade, Shadow Claw
    const crit = a.crit || (name === 'heavy' && moveId === 'leafBlade'
      ? { chance: MOVES.leafBlade.critChance, mult: MOVES.leafBlade.critMult } : null);
    a.crit = false;
    if (crit && Math.random() < crit.chance) { a.dmg *= crit.mult; a.crit = true; }
    a.onHit = mv && mv.onHit;
    a.tint = mv ? TYPE_TINT[mv.type] : null;
    if (a.speedBoost) this.speedBoostT = a.speedBoost;
    this.atk = a;
    this.hitIdx = 0;
    this.spawned = false;
    this.recoiled = false;
    this.focusGlow = !!a.focus;
    this.hitSet = new Set();
    this.queued = null;
    this.setState('attack');
  }

  update(dt) {
    this.tickTimers(dt);
    const ms = dt * 1000;
    this.slowT = Math.max(0, this.slowT - ms);
    this.ejectT = Math.max(0, this.ejectT - ms);
    this.spaDropT = Math.max(0, this.spaDropT - ms);
    this.powerT = Math.max(0, this.powerT - ms);
    if (this.powerT <= 0) this.powerStacks = 0;
    for (const k of Object.keys(this.drops)) this.drops[k] = Math.max(0, this.drops[k] - ms);
    this.speedBoostT = Math.max(0, this.speedBoostT - ms);
    this.confuseT = Math.max(0, this.confuseT - ms);
    this.glowT = Math.max(0, this.glowT - ms);
    this.furyT = Math.max(0, this.furyT - ms);
    if (this.furyT <= 0) this.furyStacks = 0;
    this.tint = this.slowT > 0 ? 0xd8d8ff : null;

    const landed = this.physics(dt);
    this.moving = false;
    this.offsetX = 0;
    this.hideSlash();
    this.clampToScreen();

    if (this.updateDamageStates(dt, landed)) return;

    const I = input;
    // Confusion swaps the directions
    const conf = this.confuseT > 0 ? -1 : 1;
    const dirX = conf * ((I.held.right ? 1 : 0) - (I.held.left ? 1 : 0));
    const dirY = conf * ((I.held.down ? 1 : 0) - (I.held.up ? 1 : 0));
    const spd = this.speedMult;

    switch (this.state) {
      case 'idle':
      case 'walk': {
        // Standing on a dropped item: Light picks it up instead of attacking
        if (I.pressed.light && this.scene.hoverPickup) {
          this.scene.takePickup(this.scene.hoverPickup);
          break;
        }
        // Next to someone on the grass bank: Light talks to them
        if (I.pressed.light && this.scene.hoverNpc) {
          this.scene.talkTo(this.scene.hoverNpc);
          break;
        }
        if (I.pressed.special && this.energy >= PLAYER.specialCost) {
          this.energy -= PLAYER.specialCost;
          this.seedsFired = 0;
          this.lastAttack = 'special';
          this.setState('special');
          break;
        }
        if (I.pressed.light) { this.chainN = 0; this.startAttack('light1'); break; }
        if (I.pressed.heavy) { this.startAttack('heavy'); break; }
        if (I.pressed.jump) {
          // Air Balloon: same height, longer airtime
          const k = effects.jumpTime(this.items);
          this.vz = PLAYER.jumpVel / k;
          this.gravity = GRAVITY / (k * k);
          this.vx = dirX * PLAYER.speedX * spd;
          this.z = 1;
          this.airAtk = null;
          this.lastAttack = 'jump';
          this.setState('jump');
          break;
        }
        if (I.held.block) { this.setState('block'); break; }
        if (dirX) this.facing = dirX;
        this.x += dirX * PLAYER.speedX * spd * dt;
        this.y += dirY * PLAYER.speedY * spd * dt;
        this.moving = dirX !== 0 || dirY !== 0;
        break;
      }

      case 'block':
        if (!I.held.block) this.setState('idle');
        break;

      case 'jump': {
        if (!this.airAtk && (I.pressed.light || I.pressed.heavy)) {
          this.airAtk = I.pressed.heavy ? 'jumpHeavy' : 'jumpLight';
          this.airAtkData = { ...ATTACKS[this.airAtk], dmg: ATTACKS[this.airAtk].dmg * this.outgoing(this.airAtk) };
          this.hitSet = new Set();
        }
        if (this.airAtk) {
          this.showSlash(this.airAtk === 'jumpHeavy' ? 1.4 : 1.1);
          this.offsetX = this.facing * 3;
          this.scene.meleeHit(this, this.airAtkData, this.hitSet);
        }
        if (landed) {
          this.vx = 0;
          this.gravity = GRAVITY;
          this.setState('land');
        }
        break;
      }

      case 'land':
        if (this.t > 90) this.setState('idle');
        break;

      case 'attack': {
        const a = this.atk;
        if (I.pressed.light) this.queued = 'light';
        const tActive = a.startup;
        const tRecover = a.startup + a.active;
        const tEnd = tRecover + a.recovery;
        if (this.t < tActive) {
          this.offsetX = -this.facing * (this.atkName === 'heavy' ? 3 : 1); // wind-up
        } else if (this.t < tRecover) {
          this.focusGlow = false;
          this.offsetX = this.facing * a.lunge;
          const isLight = this.atkName.startsWith('light');
          if (a.dash) this.x += this.facing * a.dash * dt;
          // Multi-hit moves can hit the same enemy again each beat
          if (a.hits > 1) {
            const idx = Math.floor((this.t - tActive) / (a.active / a.hits));
            if (idx !== this.hitIdx) { this.hitIdx = idx; this.hitSet = new Set(); }
          }
          let landed = 0;
          if (a.spawn) {
            if (!this.spawned) { this.scene.spawnMove(a.spawn, this, a); this.spawned = true; }
          } else {
            this.showSlash(a.slashScale, a.tint);
            // Multi-hit moves only knock down on their last hit, so every hit can land
            const hitAtk = a.hits > 1 && a.knockdown && this.hitIdx < a.hits - 1 ? { ...a, knockdown: false, stun: 300 } : a;
            landed = this.scene.meleeHit(this, hitAtk, this.hitSet);
          }
          if (landed && a.recoil && !this.recoiled) {
            this.recoiled = true;
            this.hp = Math.max(1, this.hp - a.dmg * a.recoil);
            this.flash = 60;
          }
          if (landed && isLight && this.upgrades.light === 'furyCutter') {
            this.furyStacks = Math.min(MOVES.furyCutter.maxStacks, this.furyStacks + 1);
            this.furyT = MOVES.furyCutter.window;
          }
        } else {
          this.offsetX = this.facing * Math.max(0, a.lunge - (this.t - tRecover) / 30);
          // Light chain: L, L, L (Arm Thrust: up to 5)
          let next = { light1: 'light2', light2: 'light3' }[this.atkName];
          if (this.upgrades.light === 'armThrust' && this.atkName === 'light3' && this.chainN < 4) next = 'light3';
          if (this.queued === 'light' && next) { this.chainN = (this.chainN || 0) + 1; this.startAttack(next); break; }
        }
        if (this.t >= tEnd) {
          if (a.selfDrop) this.statDrop(a.selfDrop, 6000);
          this.setState('idle');
        }
        break;
      }

      case 'special': {
        if (this.upgrades.special === 'leafStorm') {
          // Leaf Storm: one big volley, then Sp. Atk drops (Clear Amulet shortens the drop)
          if (!this.seedsFired && this.t >= 120) {
            this.scene.fireLeafStorm(this);
            this.seedsFired = 1;
            this.spaDropT = MOVES.leafStorm.dropTime / effects.statDropSpeed(this.items);
          }
          if (this.t > 620) this.setState('idle');
          break;
        }
        // Bullet Seed: a burst of four seeds
        const times = [90, 160, 230, 300];
        while (this.seedsFired < times.length && this.t >= times[this.seedsFired]) {
          this.scene.fireSeed(this);
          this.seedsFired++;
        }
        this.offsetX = -this.facing * (this.seedsFired % 2);
        if (this.t > 480) this.setState('idle');
        break;
      }
    }

    this.scene.pushOutOfObstacles(this);
    this.clampToScreen();
  }

  // Keep Treecko on screen and inside the world
  clampToScreen() {
    const cam = this.scene.camX;
    this.x = clamp(this.x, Math.max(10, cam + 10), Math.min(WORLD_W - 10, cam + 310));
    this.y = clamp(this.y, GROUND_TOP, GROUND_BOTTOM);
  }

  // Pick a frame from the hand-drawn sheet (art/templates/README.md lists the rows)
  frameFor() {
    const COLS = 4;
    const f = (row, col) => row * COLS + col;
    const now = this.scene.time.now;
    switch (this.state) {
      case 'idle':
      case 'walk':
        if (this.moving) return f(1, Math.floor(this.walkT / 130) % 2);
        return f(0, Math.floor(now / 400) % 2);
      case 'attack': {
        const a = this.atk;
        const row = { light1: 2, light2: 3, light3: 4, heavy: 5 }[this.atkName];
        if (this.atkName === 'heavy') {
          if (this.t < a.startup / 2) return f(row, 0);
          if (this.t < a.startup) return f(row, 1);
          if (this.t < a.startup + a.active) return f(row, 2);
          return f(row, 3);
        }
        if (this.t < a.startup) return f(row, 0);
        if (this.t < a.startup + a.active) return f(row, 1);
        return f(row, 2);
      }
      case 'jump':
        if (this.airAtk === 'jumpLight') return f(7, 0);
        if (this.airAtk === 'jumpHeavy') return f(8, 0);
        return f(6, this.vz > 0 ? 0 : 1);
      case 'land':
        return f(6, 1);
      case 'special':
        if (!this.seedsFired) return f(9, 0);
        return f(9, this.seedsFired % 2 ? 1 : 2);
      case 'block': return f(10, 0);
      case 'hurt': return f(11, 0);
      case 'launched': return f(12, 0);
      case 'down':
      case 'dead': return f(13, 0);
      case 'getup': return f(14, 0);
      default: return f(0, 0);
    }
  }

  gainEnergy(n) {
    this.energy = Math.min(PLAYER.energyMax, this.energy + n);
  }
}

// ---------------------------------------------------------------------------
// Enemy base: shared entry, screen clamping, death and movement helpers.
// Subclasses implement think(dt, p) for their own behaviour.
// ---------------------------------------------------------------------------
export class Enemy extends Fighter {
  constructor(scene, key, x, y, cfg) {
    // Config numbers are tuned for Lv5; scale HP and damage to this one's level
    const level = cfg.level || 5;
    const scale = enemyScale(cfg.species, level);
    super(scene, key, x, y, cfg.hp * scale.hp, cfg.name);
    this.cfg = cfg;
    this.species = cfg.species;
    this.level = level;
    this.dmgMult = scale.dmg;
    this.wild = !!cfg.wild;
    this.fromGrunt = !!cfg.fromGrunt;
    this.token = false;
    this.slotY = (Math.random() - 0.5) * 30;
    this.slotX = 54 + Math.random() * 30;
    this.paceT = Math.random() * 1000;
    this.setState(cfg.emerge ? 'emerge' : 'enter');
    if (cfg.emerge) {
      // Hop out of the tall grass onto the path
      this.z = 1;
      this.vz = 150;
      this.emergeY = cfg.emergeToY;
    }
  }

  onHurt() {
    this.telegraph = false;
    this.scene.releaseToken(this);
  }

  onKO() { this.scene.onEnemyKO(this); }

  moveToward(tx, ty, speed, dt) {
    const ddx = tx - this.x;
    const ddy = ty - this.y;
    const d = Math.hypot(ddx, ddy);
    if (d < 2) return true;
    const step = Math.min(d, speed * (this.slowedT > 0 ? 0.5 : 1) * dt);
    this.x += (ddx / d) * step;
    this.y += (ddy / d) * step;
    this.moving = true;
    return false;
  }

  // Wait at a distance from the player, pacing back and forth
  hangBack(p, dt, speed) {
    const side = this.x < p.x ? -1 : 1;
    this.paceT += dt * 1000;
    const pace = Math.sin(this.paceT / 500) * 8;
    const tx = p.x + side * (this.slotX + pace);
    const ty = clamp(p.y + this.slotY, GROUND_TOP, GROUND_BOTTOM);
    this.moveToward(tx, ty, speed, dt);
  }

  update(dt) {
    this.tickTimers(dt);
    const landed = this.physics(dt);
    this.moving = false;
    this.offsetX = 0;
    this.hideSlash();

    if (this.state === 'dead') {
      this.fade = (this.fade || 0) + dt * 1000;
      if (this.fade > 700) this.destroy();
      return;
    }
    // Once on screen, stay on screen (the player can't scroll back to reach them)
    if (this.state !== 'enter') {
      const cam = this.scene.camX;
      this.x = clamp(this.x, cam + 8, cam + 312);
    }
    if (this.updateDamageStates(dt, landed)) return;

    const p = this.scene.player;
    if (this.state === 'enter') {
      const cam = this.scene.camX;
      this.facing = sign(p.x - this.x);
      this.moveToward(clamp(this.x, cam + 30, cam + 290), this.y, this.cfg.speed, dt);
      if (this.x > cam + 24 && this.x < cam + 296) this.setState('idle');
      return;
    }
    if (this.state === 'emerge') {
      this.facing = sign(p.x - this.x);
      this.y += (this.emergeY - this.y) * Math.min(1, dt * 6);
      this.moving = true;
      if (landed) this.setState('idle');
      return;
    }
    this.think(dt, p);
  }
}

// ---------------------------------------------------------------------------
// Poochyena (rusher): closes in and lunges with a bite
// ---------------------------------------------------------------------------
export class Poochyena extends Enemy {
  constructor(scene, x, y, opts = {}) {
    super(scene, 'poochyena_actions', x, y, { ...POOCHYENA, name: 'POOCHYENA', species: 'poochyena', ...opts });
    this.cur = POOCHYENA.bite;
    if (opts.boss) {
      // Boss: bigger, tougher, attacks on its own rhythm with Tackle and Bite
      const Bz = BOSS_POOCHYENA;
      this.isBoss = true;
      this.size = Bz.size;
      this.sprite.setScale(SPRITE_SCALE * Bz.size);
      this.maxHp *= Bz.hpMult;
      this.hp = this.maxHp;
      this.noToken = true;
      this.cooldown = 1500;
      this.howled = false;
    }
  }

  showSlash(scale, tint) { super.showSlash((scale || 1) * (this.size || 1), tint); }

  // Pick a frame from the hand-drawn sheet (2 columns, rows listed in art/templates/README.md)
  frameFor() {
    const f = (row, col) => row * 2 + col;
    const B = this.cur;
    switch (this.state) {
      case 'enter':
      case 'emerge':
      case 'idle':
        if (this.moving) return f(1, Math.floor(this.walkT / 130) % 2);
        return f(0, Math.floor(this.scene.time.now / 400) % 2);
      case 'windup': return f(2, this.t < B.windup / 2 ? 0 : 1);
      case 'bite': return f(3, this.t < B.dash / 2 ? 0 : 1);
      case 'recover': return f(4, 0);
      case 'hurt': return f(5, 0);
      case 'launched': return f(6, 0);
      case 'down':
      case 'dead': return f(7, 0);
      case 'getup': return f(8, 0);
      default: return f(0, 0);
    }
  }

  think(dt, p) {
    const B = this.cur;
    const dx = p.x - this.x;
    const side = this.x < p.x ? -1 : 1;

    // Boss: Howls once when its HP drops below half, raising its attack
    if (this.isBoss && !this.howled && this.hp < this.maxHp * BOSS_POOCHYENA.howlAt && this.state === 'idle') {
      this.howled = true;
      this.dmgMult *= BOSS_POOCHYENA.howlMult;
      this.setState('howl');
      this.scene.floatText(this.x, this.y - 54, 'HOWL! ATTACK ROSE', '#ff7060');
      this.scene.cameras.main.shake(300, 0.008);
      return;
    }

    switch (this.state) {
      case 'howl':
        this.offsetX = Math.floor(this.t / 50) % 2 ? 1 : -1;
        this.telegraph = true;
        this.telegraphColor = 0xff6050;
        if (this.t > 900) { this.telegraph = false; this.setState('idle'); }
        break;

      case 'idle': {
        this.facing = sign(dx);
        if (!p.alive) break;
        if (this.isBoss) {
          const Bz = BOSS_POOCHYENA;
          this.cooldown -= dt * 1000;
          const there = this.moveToward(p.x + side * 24, p.y, POOCHYENA.speed * 1.1, dt);
          if (this.cooldown <= 0 && (there || (Math.abs(dx) < 30 && Math.abs(p.y - this.y) < 6))) {
            const bite = Math.random() < Bz.biteChance;
            this.cur = bite ? Bz.bite : Bz.tackle;
            this.telegraphColor = bite ? 0xff4040 : 0xffe070;
            if (bite) this.scene.floatText(this.x, this.y - 54, 'BITE!', '#ff7060');
            this.telegraph = true;
            this.setState('windup');
          }
          break;
        }
        if (this.token) {
          // Close in and line up for a bite
          const there = this.moveToward(p.x + side * 20, p.y, POOCHYENA.speed, dt);
          if (there || (Math.abs(dx) < 24 && Math.abs(p.y - this.y) < 5)) {
            this.telegraph = true;
            this.setState('windup');
          }
          this.tokenAge = (this.tokenAge || 0) + dt * 1000;
          if (this.tokenAge > 3000) this.scene.releaseToken(this); // gave up
        } else {
          this.hangBack(p, dt, POOCHYENA.waitSpeed);
        }
        break;
      }

      case 'windup':
        this.offsetX = -this.facing * 2;
        if (this.t > B.windup) {
          this.telegraph = false;
          this.hitSet = new Set();
          this.setState('bite');
        }
        break;

      case 'bite':
        this.x += this.facing * B.dashSpeed * dt;
        this.moving = true;
        this.showSlash(0.8);
        this.scene.enemyHit(this, B, this.hitSet);
        if (this.t > B.dash) this.setState('recover');
        break;

      case 'recover':
        if (this.t > B.recovery) {
          this.scene.releaseToken(this);
          if (this.isBoss) this.cooldown = BOSS_POOCHYENA.cooldown;
          this.setState('idle');
        }
        break;
    }
  }
}
