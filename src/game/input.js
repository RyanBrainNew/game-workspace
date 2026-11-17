const GAME_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'Space'
]);

export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = new Set();
    this.nitroQueued = false;
    this.gamepadNitroHeld = false;
    this.usingGamepad = false;
    this.actionHandler = null;
    this.enabled = true;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  onAction(handler) {
    this.actionHandler = handler;
  }

  bindTouch(container) {
    if (!container) return;
    const buttons = container.querySelectorAll('[data-control]');
    buttons.forEach((button) => {
      const control = button.dataset.control;
      const press = (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        if (control === 'nitro') {
          this.nitroQueued = true;
        } else {
          this.touch.add(control);
        }
        button.classList.add('is-pressed');
      };
      const release = (event) => {
        event?.preventDefault();
        this.touch.delete(control);
        button.classList.remove('is-pressed');
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', (event) => {
        if (event.buttons > 0) release(event);
      });
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    });
  }

  _onKeyDown(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (GAME_KEYS.has(event.code) && this.enabled) {
      event.preventDefault();
    }
    if (!this.keys.has(event.code) && event.code === 'ControlLeft') {
      this.nitroQueued = true;
    }
    if (!this.keys.has(event.code) && event.code === 'ControlRight') {
      this.nitroQueued = true;
    }
    this.keys.add(event.code);

    if (event.repeat) return;
    const actions = {
      Escape: 'pause',
      KeyP: 'pause',
      KeyR: 'reset',
      KeyC: 'camera',
      KeyM: 'mute',
      KeyF: 'fullscreen',
      Enter: 'confirm'
    };
    if (actions[event.code] && this.actionHandler) {
      event.preventDefault();
      this.actionHandler(actions[event.code]);
    }
  }

  _onKeyUp(event) {
    this.keys.delete(event.code);
  }

  _onBlur() {
    this.keys.clear();
    this.touch.clear();
    this.nitroQueued = false;
  }

  consumeNitro() {
    const triggered = this.nitroQueued;
    this.nitroQueued = false;
    return triggered;
  }

  has(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  read() {
    const left = this.has('ArrowLeft', 'KeyA') || this.touch.has('left');
    const right = this.has('ArrowRight', 'KeyD') || this.touch.has('right');
    let throttle = this.has('ArrowUp', 'KeyW', 'Space') || this.touch.has('throttle');
    let brake = this.has('ArrowDown', 'KeyS') || this.touch.has('brake');
    let drift = this.has('ShiftLeft', 'ShiftRight') || this.touch.has('drift');
    let analogSteer = 0;

    const gamepad = this._firstGamepad();
    if (gamepad) {
      this.usingGamepad = true;
      const axis = gamepad.axes[0] || 0;
      analogSteer = Math.abs(axis) > 0.12 ? axis : 0;
      throttle = throttle || Boolean(gamepad.buttons[7]?.pressed);
      brake = brake || Boolean(gamepad.buttons[6]?.pressed);
      drift = drift || Boolean(gamepad.buttons[5]?.pressed);
      const nitroHeld = Boolean(gamepad.buttons[0]?.pressed);
      if (nitroHeld && !this.gamepadNitroHeld) this.nitroQueued = true;
      this.gamepadNitroHeld = nitroHeld;
    } else {
      this.usingGamepad = false;
    }
    return {
      steer: Math.max(-1, Math.min(1, (right ? 1 : 0) - (left ? 1 : 0) + analogSteer)),
      throttle,
      brake,
      drift,
      nitro: this.consumeNitro()
    };
  }

  _firstGamepad() {
    if (!navigator.getGamepads) return null;
    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
      if (gamepad?.connected) return gamepad;
    }
    return null;
  }

  clearTransient() {
    this.nitroQueued = false;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}
