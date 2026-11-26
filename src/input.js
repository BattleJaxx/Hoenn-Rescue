// Unified input: keyboard + on-screen touch controls.
// Each frame the game calls input.update(), then reads:
//   input.held.<name>     true while the control is held
//   input.pressed.<name>  true only on the frame it was pressed
// Names: left, right, up, down, light, heavy, jump, special, block, start, help

const NAMES = ['left', 'right', 'up', 'down', 'light', 'heavy', 'jump', 'special', 'block', 'start', 'help'];

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'light', KeyZ: 'light',
  KeyK: 'heavy', KeyX: 'heavy',
  Space: 'jump', KeyC: 'jump',
  KeyL: 'special', KeyV: 'special',
  ShiftLeft: 'block', ShiftRight: 'block', KeyI: 'block',
  Enter: 'start',
  KeyH: 'help', Escape: 'help',
};

class Input {
  constructor() {
    this.keys = {};    // keyboard state
    this.touch = {};   // touch button state
    this.stick = { x: 0, y: 0 };
    this.held = {};
    this.pressed = {};
    this.prev = {};
    this.latched = new Set(); // presses that happened since the last update (so quick taps are never missed)
    this.anyPressed = false;
    NAMES.forEach((n) => { this.held[n] = false; this.pressed[n] = false; this.prev[n] = false; });

    window.addEventListener('keydown', (e) => {
      const name = KEYMAP[e.code];
      if (name) {
        if (!e.repeat) this.latched.add(name);
        this.keys[name] = true;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const name = KEYMAP[e.code];
      if (name) { this.keys[name] = false; e.preventDefault(); }
    });
    window.addEventListener('blur', () => { this.keys = {}; });

    this.setupTouch();
  }

  setupTouch() {
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) document.body.classList.add('touch');

    // iOS Safari ignores user-scalable=no and can still zoom on quick repeated taps
    // (e.g. spamming Light) or pinches. Cancelling the touch events themselves stops that;
    // the game reads pointer events, which still fire.
    const noZoom = (e) => { if (e.cancelable) e.preventDefault(); };
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) noZoom(e); }, { passive: false });
    document.addEventListener('touchend', noZoom, { passive: false });
    document.addEventListener('dblclick', noZoom, { passive: false });
    for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, noZoom, { passive: false });

    // Buttons
    document.querySelectorAll('#buttons .btn').forEach((el) => {
      const name = el.dataset.btn;
      const down = (e) => {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        this.touch[name] = true;
        this.latched.add(name);
        el.classList.add('down');
      };
      const up = (e) => {
        e.preventDefault();
        this.touch[name] = false;
        el.classList.remove('down');
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    // Help button (title screen)
    const helpBtn = document.getElementById('help-btn');
    helpBtn?.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.latched.add('help'); });

    // Floating joystick: touch anywhere on the left half and the stick centres under your thumb.
    // Drag past the edge and the stick follows your thumb, so you never slide off it.
    const zone = document.getElementById('stick-zone');
    const pad = document.getElementById('dpad');
    const knob = document.getElementById('dpad-knob');
    if (!zone || !pad) return;
    const RADIUS = 56;   // px the knob can travel from the centre
    let activeId = null;
    let cx = 0;
    let cy = 0;
    const place = () => {
      pad.style.left = `${cx - pad.offsetWidth / 2}px`;
      pad.style.top = `${cy - pad.offsetHeight / 2}px`;
      pad.style.bottom = 'auto';
    };
    const move = (e) => {
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) {
        // drag the base along behind the thumb
        cx += (dx / len) * (len - RADIUS);
        cy += (dy / len) * (len - RADIUS);
        dx = e.clientX - cx;
        dy = e.clientY - cy;
        place();
      }
      this.stick.x = dx / RADIUS;
      this.stick.y = dy / RADIUS;
      knob.style.transform = `translate(${dx * 0.75}px, ${dy * 0.75}px)`;
    };
    const release = (e) => {
      if (e && e.pointerId !== activeId) return;
      activeId = null;
      this.stick.x = 0;
      this.stick.y = 0;
      knob.style.transform = '';
      pad.classList.remove('active');
      pad.style.left = pad.style.top = pad.style.bottom = ''; // back to its resting spot
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // Tapping still starts the game on the title and retry screens
      this.touch.start = true;
      this.latched.add('start');
      if (activeId !== null) return;
      activeId = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      cx = e.clientX;
      cy = e.clientY;
      pad.classList.add('active');
      place();
      move(e);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === activeId) move(e); });
    zone.addEventListener('pointerup', (e) => { this.touch.start = false; release(e); });
    zone.addEventListener('pointercancel', release);
    zone.addEventListener('lostpointercapture', release);

    // Tapping anywhere on the game counts as "start" (title / retry screens)
    document.getElementById('game').addEventListener('pointerdown', () => { this.touch.start = true; this.latched.add('start'); });
    document.getElementById('game').addEventListener('pointerup', () => { this.touch.start = false; });
  }

  update() {
    const DEAD = 0.35;
    const touchDir = {
      left: this.stick.x < -DEAD,
      right: this.stick.x > DEAD,
      up: this.stick.y < -DEAD,
      down: this.stick.y > DEAD,
    };
    this.anyPressed = false;
    NAMES.forEach((n) => {
      const h = !!(this.keys[n] || this.touch[n] || touchDir[n]);
      this.pressed[n] = (h && !this.prev[n]) || this.latched.has(n);
      this.held[n] = h;
      this.prev[n] = h;
      if (this.pressed[n] && !['left', 'right', 'up', 'down', 'help'].includes(n)) this.anyPressed = true;
    });
    this.latched.clear();
  }
}

export const input = new Input();
