// Ace Trainer Pokémon: mini-bosses with a gimmick each. They use follower sprites for now.
import { Enemy, sign, clamp } from './fighters.js';
import { GROUND_TOP, GROUND_BOTTOM } from './config.js';

// ---------------------------------------------------------------------------
// Shedinja: Wonder Guard. Hits from the front do nothing; one hit from behind knocks it out.
// It turns to face you slowly, and can't turn while attacking or recovering.
// ---------------------------------------------------------------------------
export class Shedinja extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'shedinja', x, y, { name: 'SHEDINJA', species: 'shedinja', hp: 1, speed: 46, ...opts });
    this.hp = this.maxHp = 1; // always 1 HP, as in the games
    this.noToken = true;
    this.turnT = 0;
    this.cooldown = 1500;
    this.noEffectT = 0;
    this.scratch = { windup: 520, dash: 230, dashSpeed: 175, recovery: 1000, dmg: 9, range: 18, depth: 8, stun: 300, push: 26 };
  }

  takeHit(src, atk) {
    const fromFront = (src.x - this.x) * this.facing > 0;
    if (fromFront && this.alive && this.state !== 'enter') {
      if (this.noEffectT <= 0) {
        this.scene.floatText(this.x, this.y - 40, 'NO EFFECT', '#c0c0c0');
        this.noEffectT = 600;
      }
      this.scene.spark(this.x + this.facing * 6, this.y - 18, 0x808080);
      return 'blocked';
    }
    return super.takeHit(src, atk);
  }

  think(dt, p) {
    const ms = dt * 1000;
    const S = this.scratch;
    this.noEffectT -= ms;
    this.cooldown -= ms;
    this.z = 6 + Math.sin(this.scene.time.now / 300) * 2; // hovers
    const dx = p.x - this.x;
    switch (this.state) {
      case 'idle': {
        // Turns to face you only after a short delay
        if (sign(dx) !== this.facing) {
          this.turnT += ms;
          if (this.turnT > 650) { this.facing = sign(dx); this.turnT = 0; }
        } else this.turnT = 0;
        if (!p.alive) break;
        const side = this.x < p.x ? -1 : 1;
        this.moveToward(p.x + side * 34, p.y, this.cfg.speed, dt);
        if (this.cooldown <= 0 && Math.abs(dx) < 46 && Math.abs(p.y - this.y) < 6 && sign(dx) === this.facing) {
          this.telegraph = true;
          this.setState('windup');
        }
        break;
      }
      case 'windup':
        if (this.t > S.windup) { this.telegraph = false; this.hitSet = new Set(); this.setState('dash'); }
        break;
      case 'dash':
        this.x += this.facing * S.dashSpeed * dt;
        this.moving = true;
        this.showSlash(1.1, 0xb080ff);
        this.scene.enemyHit(this, S, this.hitSet);
        if (this.t > S.dash) this.setState('recover');
        break;
      case 'recover':
        if (this.t > S.recovery) { this.cooldown = 900; this.setState('idle'); }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Smeargle: Sketch. Copies the last kind of attack you used.
// ---------------------------------------------------------------------------
export class Smeargle extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'smeargle', x, y, { name: 'SMEARGLE', species: 'smeargle', hp: 26, speed: 44, ...opts });
    this.noToken = true;
    this.cooldown = 1400;
    this.light = { dmg: 4, range: 20, depth: 8, stun: 220, push: 16 };
    this.heavy = { dmg: 13, range: 26, depth: 9, knockdown: true };
  }

  think(dt, p) {
    const ms = dt * 1000;
    this.cooldown -= ms;
    const dx = p.x - this.x;
    switch (this.state) {
      case 'idle': {
        this.facing = sign(dx);
        if (!p.alive) break;
        const side = this.x < p.x ? -1 : 1;
        const want = p.lastAttack === 'special' ? 90 : 26;
        this.moveToward(p.x + side * want, p.y, this.cfg.speed, dt);
        const lined = Math.abs(p.y - this.y) < 6;
        const inRange = p.lastAttack === 'special' ? Math.abs(dx) < 140 : Math.abs(dx) < 34;
        if (this.cooldown <= 0 && lined && inRange) {
          this.copy = ['light', 'heavy', 'special', 'jump'].includes(p.lastAttack) ? p.lastAttack : 'light';
          this.scene.floatText(this.x, this.y - 40, 'SKETCH!', '#ffe080');
          this.telegraph = true;
          this.setState('windup');
        }
        break;
      }
      case 'windup':
        if (this.t > (this.copy === 'heavy' ? 600 : 380)) {
          this.telegraph = false;
          this.hitSet = new Set();
          this.n = 0;
          if (this.copy === 'jump') { this.vz = 200; this.z = 1; }
          this.setState(this.copy);
        }
        break;
      case 'light': // three quick paint swipes
        this.x += this.facing * 40 * dt;
        this.moving = true;
        if (Math.floor(this.t / 120) !== this.n) { this.n = Math.floor(this.t / 120); this.hitSet = new Set(); }
        this.showSlash(0.9, 0xff70c0);
        this.scene.enemyHit(this, this.light, this.hitSet);
        if (this.t > 360) this.finish(800);
        break;
      case 'heavy':
        this.showSlash(1.6, 0x70c0ff);
        this.scene.enemyHit(this, this.heavy, this.hitSet);
        if (this.t > 140) this.finish(1100);
        break;
      case 'special': // four paint blobs
        if (this.t > this.n * 90 && this.n < 4) {
          this.scene.fireEnemyShot(this, 'paint', { dmg: 4, speed: 190, life: 1.0, stun: 160, push: 12, owner: this });
          this.n++;
        }
        if (this.t > 420) this.finish(1000);
        break;
      case 'jump': // leap at you and slam
        this.x += this.facing * 90 * dt;
        if (!this.airborne) {
          this.scene.enemyHit(this, { ...this.heavy, dmg: 10, range: 22 }, this.hitSet);
          this.facing = -this.facing;
          this.scene.enemyHit(this, { ...this.heavy, dmg: 10, range: 22 }, this.hitSet);
          this.facing = sign(dx);
          this.scene.cameras.main.shake(80, 0.006);
          this.finish(900);
        }
        break;
      case 'recover':
        if (this.t > this.rest) this.setState('idle');
        break;
    }
  }

  finish(rest) {
    this.rest = rest;
    this.cooldown = 600;
    this.setState('recover');
  }
}

// ---------------------------------------------------------------------------
// Spinda: Teeter Dance. Wobbles unpredictably; its Dizzy Punch and dance confuse you
// (your controls are reversed for a few seconds).
// ---------------------------------------------------------------------------
export class Spinda extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'spinda', x, y, { name: 'SPINDA', species: 'spinda', hp: 24, speed: 50, ...opts });
    this.noToken = true;
    this.cooldown = 1200;
    this.danceCooldown = 4000;
    this.wanderT = 0;
    this.wander = { x: 0, y: 0 };
    this.punch = { windup: 380, dash: 170, dashSpeed: 160, recovery: 600, dmg: 7, range: 16, depth: 8, stun: 260, push: 22, confuse: 3000 };
  }

  render() {
    super.render();
    if (['idle', 'dance'].includes(this.state) && this.alive) {
      const k = this.state === 'dance' ? 25 : 12;
      this.sprite.setAngle(Math.sin(this.scene.time.now / (this.state === 'dance' ? 90 : 160)) * k);
    }
  }

  think(dt, p) {
    const ms = dt * 1000;
    this.cooldown -= ms;
    this.danceCooldown -= ms;
    const dx = p.x - this.x;
    switch (this.state) {
      case 'idle': {
        this.facing = sign(dx);
        if (!p.alive) break;
        // Stagger about on the way to the player
        this.wanderT -= ms;
        if (this.wanderT <= 0) {
          this.wanderT = 300 + Math.random() * 400;
          this.wander = { x: (Math.random() - 0.5) * 70, y: (Math.random() - 0.5) * 40 };
        }
        const side = this.x < p.x ? -1 : 1;
        this.moveToward(p.x + side * 20 + this.wander.x, clamp(p.y + this.wander.y, GROUND_TOP, GROUND_BOTTOM), this.cfg.speed, dt);
        if (this.danceCooldown <= 0 && Math.abs(dx) < 60) {
          this.scene.floatText(this.x, this.y - 40, 'TEETER DANCE', '#ff9fd0');
          this.setState('dance');
        } else if (this.cooldown <= 0 && Math.abs(dx) < 24 && Math.abs(p.y - this.y) < 6) {
          this.telegraph = true;
          this.setState('windup');
        }
        break;
      }
      case 'dance': // confuses you if you're still close when it ends
        if (this.t > 1300) {
          this.scene.spark(this.x, this.y - 16, 0xff9fd0);
          if (Math.abs(p.x - this.x) < 46 && Math.abs(p.y - this.y) < 16 && p.alive && p.invuln <= 0) p.confuse(3000);
          this.danceCooldown = 5500;
          this.setState('idle');
        }
        break;
      case 'windup':
        if (this.t > this.punch.windup) { this.telegraph = false; this.hitSet = new Set(); this.setState('punch'); }
        break;
      case 'punch':
        this.x += this.facing * this.punch.dashSpeed * dt;
        this.moving = true;
        this.showSlash(0.9, 0xff9fd0);
        this.scene.enemyHit(this, this.punch, this.hitSet);
        if (this.t > this.punch.dash) this.setState('recover');
        break;
      case 'recover':
        if (this.t > this.punch.recovery) { this.cooldown = 900; this.setState('idle'); }
        break;
    }
  }
}

export const ACE_CLASSES = { shedinja: Shedinja, smeargle: Smeargle, spinda: Spinda };
