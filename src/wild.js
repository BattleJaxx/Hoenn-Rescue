// Wild Petalburg Woods Pokémon. They attack only the player.
// They use follower sprites (no hand-drawn action sheets yet), so knockdowns are faked by rotation.
import { Enemy, sign, clamp } from './fighters.js';
import { WURMPLE, SHROOMISH, SILCOON, GROUND_TOP, GROUND_BOTTOM } from './config.js';

// ---------------------------------------------------------------------------
// Wurmple: slow crawler. Shoots String Shot from range (slows you), tackles up close.
// ---------------------------------------------------------------------------
export class Wurmple extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'wurmple', x, y, { ...WURMPLE, wild: true, ...opts });
  }

  think(dt, p) {
    const S = WURMPLE.stringShot;
    const T = WURMPLE.tackle;
    const dx = p.x - this.x;
    const adx = Math.abs(dx);
    const ady = Math.abs(p.y - this.y);

    switch (this.state) {
      case 'idle':
        this.facing = sign(dx);
        if (!p.alive) break;
        if (this.token) {
          this.tokenAge = (this.tokenAge || 0) + dt * 1000;
          if (adx < 22 && ady < 5) {
            this.telegraph = true;
            this.setState('tackleWindup');
          } else if (adx >= S.minRange && adx <= S.maxRange && ady < 5) {
            this.telegraph = true;
            this.setState('stringWindup');
          } else {
            // Line up in depth with the player at shooting distance
            const side = this.x < p.x ? -1 : 1;
            this.moveToward(p.x + side * 70, p.y, WURMPLE.speed, dt);
          }
          if (this.tokenAge > 4000) this.scene.releaseToken(this);
        } else {
          this.hangBack(p, dt, WURMPLE.waitSpeed);
        }
        break;

      case 'stringWindup':
        this.offsetX = -this.facing * 2;
        if (this.t > S.windup) {
          this.telegraph = false;
          this.scene.fireEnemyShot(this, 'string', { ...S, owner: this, noStagger: true });
          this.setState('recover');
        }
        break;

      case 'tackleWindup':
        if (this.t > T.windup) {
          this.telegraph = false;
          this.hitSet = new Set();
          this.setState('tackle');
        }
        break;

      case 'tackle':
        this.x += this.facing * T.dashSpeed * dt;
        this.moving = true;
        this.scene.enemyHit(this, T, this.hitSet);
        if (this.t > T.dash) this.setState('recover');
        break;

      case 'recover':
        if (this.t > S.recovery) {
          this.scene.releaseToken(this);
          this.setState('idle');
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Shroomish: barely moves. Puffs a lingering spore cloud when you get close.
// Works on its own cooldown, outside the turn-taking.
// ---------------------------------------------------------------------------
export class Shroomish extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'shroomish', x, y, { ...SHROOMISH, wild: true, ...opts });
    this.cooldown = 1200;
    this.noToken = true;
  }

  think(dt, p) {
    const S = SHROOMISH.spore;
    const dx = p.x - this.x;
    this.cooldown -= dt * 1000;

    switch (this.state) {
      case 'idle': {
        this.facing = sign(dx);
        if (!p.alive) break;
        const near = Math.abs(dx) < S.triggerRange && Math.abs(p.y - this.y) < 16;
        if (near && this.cooldown <= 0) {
          this.telegraph = true;
          this.setState('sporeWindup');
        } else if (!near) {
          // Waddle slowly towards the player's lane
          this.moveToward(this.x + sign(dx) * 4, p.y, SHROOMISH.speed, dt);
        }
        break;
      }

      case 'sporeWindup':
        this.offsetX = Math.floor(this.t / 70) % 2 ? 1 : -1; // shiver
        if (this.t > S.windup) {
          this.telegraph = false;
          this.scene.spawnSporeCloud(this, S);
          this.cooldown = S.cooldown;
          this.setState('idle');
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Silcoon: a hardened cocoon that blocks the lane. Takes half damage.
// Hops and slams if you stand right next to it.
// ---------------------------------------------------------------------------
export class Silcoon extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'silcoon', x, y, { ...SILCOON, wild: true, ...opts });
    this.damageTaken = SILCOON.hardenTaken;
    this.obstacle = SILCOON.body;
    this.cooldown = 1000;
    this.noToken = true;
  }

  think(dt, p) {
    const S = SILCOON.slam;
    const dx = p.x - this.x;
    this.cooldown -= dt * 1000;

    switch (this.state) {
      case 'idle':
        this.facing = sign(dx);
        if (p.alive && this.cooldown <= 0 && Math.abs(dx) < S.triggerRange && Math.abs(p.y - this.y) < 8) {
          this.telegraph = true;
          this.setState('slamWindup');
        }
        break;

      case 'slamWindup':
        if (this.t > S.windup) {
          this.telegraph = false;
          this.vz = 130;
          this.z = 1;
          this.setState('slam');
        }
        break;

      case 'slam':
        if (!this.airborne) {
          // Lands: hits whoever is next to it, either side
          this.hitSet = new Set();
          const front = { ...S, range: S.range };
          this.scene.enemyHit(this, front, this.hitSet);
          this.facing = -this.facing;
          this.scene.enemyHit(this, front, this.hitSet);
          this.facing = sign(dx);
          this.scene.cameras.main.shake(70, 0.006);
          this.cooldown = S.cooldown;
          this.setState('idle');
        }
        break;
    }
  }
}

export const WILD_CLASSES = { wurmple: Wurmple, shroomish: Shroomish, silcoon: Silcoon };

export function randomLaneY() {
  return clamp(GROUND_TOP + 8 + Math.random() * (GROUND_BOTTOM - GROUND_TOP - 16), GROUND_TOP, GROUND_BOTTOM);
}
