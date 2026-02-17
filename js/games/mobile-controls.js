// ── Mobile Controls Module ──────────────────────────────────────────────
// Provides virtual touch controls for all game types on mobile devices.

export const isMobile = () =>
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    (window.innerWidth <= 1024);

// ── Control type mapping per template ──────────────────────────────────
// 'tap'            → touch→click only (most click-based games)
// 'dpad'           → 4-direction d-pad
// 'dpad-jump'      → left/right + jump button
// 'dpad-action'    → d-pad + action button
// 'tetris'         → left/right/down + rotate + drop buttons
// 'joystick'       → analog joystick for 360° movement
// 'joystick-shoot' → joystick + shoot button
// 'horizontal'     → left/right only (paddle/basket games)
const CONTROL_MAP = {
    'Platformer':    'tap',
    'Snake':         'dpad',
    'Shooter':       'joystick-shoot',
    'Racing':        'horizontal',
    'Flappy':        'tap',
    'Tetris':        'tetris',
    'Breakout':      'horizontal',
    'Clicker':       'tap',
    'Memory':        'tap',
    'Match3':        'tap',
    'Quiz':          'tap',
    'Maze':          'dpad',
    'Fishing':       'tap',
    'Cooking':       'tap',
    'Farming':       'tap',
    'Word':          'tap',
    'Drawing':       'tap',
    'Survival':      'joystick',
    'Simon':         'tap',
    'Asteroid':      'joystick-shoot',
    'Bubble':        'tap',
    'Catch':         'horizontal',
    'TowerDefense':  'tap',
    'WhackAMole':    'tap',
    'Rhythm':        'tap',
    'custom':        'dpad-action',
};

export function getControlType(templateName) {
    return CONTROL_MAP[templateName] || 'tap';
}

// ═══════════════════════════════════════════════════════════════════════════
// Mobile Controls Manager
// ═══════════════════════════════════════════════════════════════════════════

export class MobileControls {
    constructor(container, game, controlType) {
        this.container = container;
        this.game = game;
        this.controlType = controlType;
        this.elements = [];
        this.activeJoystick = null;
        this.activeTouches = {};
    }

    setup() {
        if (!isMobile()) return;
        // Prevent default touch behaviors on game area
        this.container.style.touchAction = 'none';

        switch (this.controlType) {
            case 'tap':
                // Touch→click mapping is handled in base class
                break;
            case 'dpad':
                this._createDPad();
                break;
            case 'dpad-jump':
                this._createDPad(false);
                this._createActionButton('JUMP', 'right', () => this._pressKey(' '), () => this._releaseKey(' '));
                break;
            case 'dpad-action':
                this._createDPad();
                this._createActionButton('ACTION', 'right', () => this._pressKey(' '), () => this._releaseKey(' '));
                break;
            case 'tetris':
                this._createTetrisControls();
                break;
            case 'joystick':
                this._createJoystick();
                break;
            case 'joystick-shoot':
                this._createJoystick();
                this._createActionButton('FIRE', 'right', () => this._pressKey(' '), () => this._releaseKey(' '));
                break;
            case 'horizontal':
                this._createHorizontalControls();
                break;
        }
    }

    destroy() {
        this.elements.forEach(el => el.remove());
        this.elements = [];
        this.activeJoystick = null;
    }

    // ── Key simulation ────────────────────────────────────────────────

    _pressKey(key) {
        if (this.game && this.game.keys) {
            this.game.keys[key] = true;
            if (this.game.onKeyDown) this.game.onKeyDown(key);
        }
    }

    _releaseKey(key) {
        if (this.game && this.game.keys) {
            this.game.keys[key] = false;
            if (this.game.onKeyUp) this.game.onKeyUp(key);
        }
    }

    _releaseAllDirections() {
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
         'w', 'W', 'a', 'A', 's', 'S', 'd', 'D',
         'KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach(k => {
            if (this.game && this.game.keys) this.game.keys[k] = false;
        });
    }

    // ── D-Pad ─────────────────────────────────────────────────────────

    _createDPad(fourWay = true) {
        const pad = document.createElement('div');
        pad.className = 'mobile-dpad';

        const dirs = fourWay
            ? [
                { cls: 'up',    key: 'ArrowUp',    icon: '&#9650;' },
                { cls: 'down',  key: 'ArrowDown',  icon: '&#9660;' },
                { cls: 'left',  key: 'ArrowLeft',  icon: '&#9664;' },
                { cls: 'right', key: 'ArrowRight', icon: '&#9654;' },
            ]
            : [
                { cls: 'left',  key: 'ArrowLeft',  icon: '&#9664;' },
                { cls: 'right', key: 'ArrowRight', icon: '&#9654;' },
            ];

        dirs.forEach(d => {
            const btn = document.createElement('div');
            btn.className = `mobile-dpad-btn mobile-dpad-${d.cls}`;
            btn.innerHTML = d.icon;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('active');
                this._pressKey(d.key);
            }, { passive: false });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                this._releaseKey(d.key);
            }, { passive: false });
            btn.addEventListener('touchcancel', (e) => {
                btn.classList.remove('active');
                this._releaseKey(d.key);
            });
            pad.appendChild(btn);
        });

        this.container.appendChild(pad);
        this.elements.push(pad);
        return pad;
    }

    // ── Joystick ──────────────────────────────────────────────────────

    _createJoystick() {
        const wrap = document.createElement('div');
        wrap.className = 'mobile-joystick';

        const base = document.createElement('div');
        base.className = 'mobile-joystick-base';

        const knob = document.createElement('div');
        knob.className = 'mobile-joystick-knob';

        base.appendChild(knob);
        wrap.appendChild(base);

        const maxDist = 40;
        let originX = 0, originY = 0;
        let active = false;

        const updateKeys = (dx, dy) => {
            const deadZone = 0.25;
            const normX = dx / maxDist;
            const normY = dy / maxDist;

            // WASD keys for 2D, KeyW etc. for 3D
            const up = normY < -deadZone;
            const down = normY > deadZone;
            const left = normX < -deadZone;
            const right = normX > deadZone;

            this._setDirectionKeys(up, down, left, right);
        };

        const resetKnob = () => {
            knob.style.transform = 'translate(-50%, -50%)';
            this._releaseAllDirections();
            active = false;
        };

        wrap.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = base.getBoundingClientRect();
            originX = rect.left + rect.width / 2;
            originY = rect.top + rect.height / 2;
            active = true;
        }, { passive: false });

        wrap.addEventListener('touchmove', (e) => {
            if (!active) return;
            e.preventDefault();
            const touch = e.touches[0];
            let dx = touch.clientX - originX;
            let dy = touch.clientY - originY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            updateKeys(dx, dy);
        }, { passive: false });

        wrap.addEventListener('touchend', (e) => {
            e.preventDefault();
            resetKnob();
        }, { passive: false });

        wrap.addEventListener('touchcancel', () => resetKnob());

        this.container.appendChild(wrap);
        this.elements.push(wrap);
        return wrap;
    }

    _setDirectionKeys(up, down, left, right) {
        if (!this.game || !this.game.keys) return;
        // Set both Arrow and letter keys for compatibility with all games
        const keys = this.game.keys;
        keys['ArrowUp'] = up;     keys['w'] = up;     keys['W'] = up;     keys['KeyW'] = up;
        keys['ArrowDown'] = down;  keys['s'] = down;   keys['S'] = down;   keys['KeyS'] = down;
        keys['ArrowLeft'] = left;  keys['a'] = left;   keys['A'] = left;   keys['KeyA'] = left;
        keys['ArrowRight'] = right; keys['d'] = right;  keys['D'] = right;  keys['KeyD'] = right;
    }

    // ── Action Button ─────────────────────────────────────────────────

    _createActionButton(label, position, onPress, onRelease) {
        const btn = document.createElement('div');
        btn.className = `mobile-action-btn mobile-action-${position}`;
        btn.textContent = label;

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('active');
            if (onPress) onPress();
        }, { passive: false });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            if (onRelease) onRelease();
        }, { passive: false });
        btn.addEventListener('touchcancel', () => {
            btn.classList.remove('active');
            if (onRelease) onRelease();
        });

        this.container.appendChild(btn);
        this.elements.push(btn);
        return btn;
    }

    // ── Tetris Controls ───────────────────────────────────────────────

    _createTetrisControls() {
        const leftArea = document.createElement('div');
        leftArea.className = 'mobile-tetris-left';

        const makeBtn = (label, key, parent) => {
            const btn = document.createElement('div');
            btn.className = 'mobile-tetris-btn';
            btn.textContent = label;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('active');
                this._pressKey(key);
            }, { passive: false });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                this._releaseKey(key);
            }, { passive: false });
            btn.addEventListener('touchcancel', () => {
                btn.classList.remove('active');
                this._releaseKey(key);
            });
            parent.appendChild(btn);
            return btn;
        };

        makeBtn('◀', 'ArrowLeft', leftArea);
        makeBtn('▼', 'ArrowDown', leftArea);
        makeBtn('▶', 'ArrowRight', leftArea);

        const rightArea = document.createElement('div');
        rightArea.className = 'mobile-tetris-right';
        makeBtn('↻', 'ArrowUp', rightArea);
        makeBtn('DROP', ' ', rightArea);

        this.container.appendChild(leftArea);
        this.container.appendChild(rightArea);
        this.elements.push(leftArea, rightArea);
    }

    // ── Horizontal Controls ───────────────────────────────────────────

    _createHorizontalControls() {
        const wrap = document.createElement('div');
        wrap.className = 'mobile-horizontal';

        const left = document.createElement('div');
        left.className = 'mobile-horizontal-btn mobile-horizontal-left';
        left.innerHTML = '&#9664;';

        const right = document.createElement('div');
        right.className = 'mobile-horizontal-btn mobile-horizontal-right';
        right.innerHTML = '&#9654;';

        const press = (btn, key) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('active');
                this._pressKey(key);
            }, { passive: false });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
                this._releaseKey(key);
            }, { passive: false });
            btn.addEventListener('touchcancel', () => {
                btn.classList.remove('active');
                this._releaseKey(key);
            });
        };

        press(left, 'ArrowLeft');
        press(right, 'ArrowRight');

        wrap.appendChild(left);
        wrap.appendChild(right);
        this.container.appendChild(wrap);
        this.elements.push(wrap);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mobile Controls for 3D Games
// ═══════════════════════════════════════════════════════════════════════════

// Templates that need a shoot/action button in 3D mode
const SHOOT_3D_TEMPLATES = ['Shooter', 'Asteroid', 'Survival'];

export class MobileControls3D {
    constructor(container, game, templateName) {
        this.container = container;
        this.game = game;
        this.templateName = templateName || '';
        this.elements = [];
        this.cameraTouch = null;
    }

    setup() {
        if (!isMobile()) return;
        this.container.style.touchAction = 'none';

        this._createJoystick();
        this._createJumpButton();
        this._createCameraTouchArea();

        // Show shoot button for shooter-type 3D games
        if (SHOOT_3D_TEMPLATES.includes(this.templateName)) {
            this._createShootButton();
        }
    }

    destroy() {
        this.elements.forEach(el => el.remove());
        this.elements = [];
        this.cameraTouch = null;
    }

    // ── Joystick (Left side) ──────────────────────────────────────────

    _createJoystick() {
        const wrap = document.createElement('div');
        wrap.className = 'mobile-3d-joystick';

        const base = document.createElement('div');
        base.className = 'mobile-joystick-base';

        const knob = document.createElement('div');
        knob.className = 'mobile-joystick-knob';

        base.appendChild(knob);
        wrap.appendChild(base);

        const maxDist = 40;
        let originX = 0, originY = 0;
        let touchId = null;

        const resetKnob = () => {
            knob.style.transform = 'translate(-50%, -50%)';
            if (this.game && this.game.keys) {
                this.game.keys['KeyW'] = false;
                this.game.keys['KeyS'] = false;
                this.game.keys['KeyA'] = false;
                this.game.keys['KeyD'] = false;
                this.game.keys['ArrowUp'] = false;
                this.game.keys['ArrowDown'] = false;
                this.game.keys['ArrowLeft'] = false;
                this.game.keys['ArrowRight'] = false;
            }
            touchId = null;
        };

        wrap.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            const rect = base.getBoundingClientRect();
            originX = rect.left + rect.width / 2;
            originY = rect.top + rect.height / 2;
        }, { passive: false });

        wrap.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
            if (!touch) return;

            let dx = touch.clientX - originX;
            let dy = touch.clientY - originY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

            const deadZone = 0.25;
            const normX = dx / maxDist;
            const normY = dy / maxDist;

            if (this.game && this.game.keys) {
                this.game.keys['KeyW'] = normY < -deadZone;
                this.game.keys['KeyS'] = normY > deadZone;
                this.game.keys['KeyA'] = normX < -deadZone;
                this.game.keys['KeyD'] = normX > deadZone;
                this.game.keys['ArrowUp'] = normY < -deadZone;
                this.game.keys['ArrowDown'] = normY > deadZone;
                this.game.keys['ArrowLeft'] = normX < -deadZone;
                this.game.keys['ArrowRight'] = normX > deadZone;
            }
        }, { passive: false });

        wrap.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetKnob();
        }, { passive: false });

        wrap.addEventListener('touchcancel', () => resetKnob());

        this.container.appendChild(wrap);
        this.elements.push(wrap);
    }

    // ── Camera Touch Area (right half of screen) ──────────────────────

    _createCameraTouchArea() {
        const area = document.createElement('div');
        area.className = 'mobile-3d-camera-area';

        let lastX = 0, lastY = 0;
        let camTouchId = null;

        area.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            camTouchId = touch.identifier;
            lastX = touch.clientX;
            lastY = touch.clientY;
        }, { passive: false });

        area.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = Array.from(e.changedTouches).find(t => t.identifier === camTouchId);
            if (!touch) return;

            const dx = touch.clientX - lastX;
            const dy = touch.clientY - lastY;
            lastX = touch.clientX;
            lastY = touch.clientY;

            // Feed camera movement directly into the game
            if (this.game) {
                this.game.cameraAngleX -= dx * this.game.cameraSensitivity * 2;
                this.game.cameraAngleY += dy * this.game.cameraSensitivity * 2;
                this.game.cameraAngleY = Math.max(-0.2, Math.min(1.2, this.game.cameraAngleY));
            }
        }, { passive: false });

        area.addEventListener('touchend', (e) => {
            e.preventDefault();
            camTouchId = null;
        }, { passive: false });

        area.addEventListener('touchcancel', () => { camTouchId = null; });

        this.container.appendChild(area);
        this.elements.push(area);
    }

    // ── Jump Button ───────────────────────────────────────────────────

    _createJumpButton() {
        const btn = document.createElement('div');
        btn.className = 'mobile-3d-jump-btn';
        btn.textContent = 'JUMP';

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.add('active');
            if (this.game && this.game.keys) {
                this.game.keys['Space'] = true;
            }
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.remove('active');
            if (this.game && this.game.keys) {
                this.game.keys['Space'] = false;
            }
        }, { passive: false });

        btn.addEventListener('touchcancel', () => {
            btn.classList.remove('active');
            if (this.game && this.game.keys) {
                this.game.keys['Space'] = false;
            }
        });

        this.container.appendChild(btn);
        this.elements.push(btn);
    }

    // ── Shoot Button ──────────────────────────────────────────────────

    _createShootButton() {
        const btn = document.createElement('div');
        btn.className = 'mobile-3d-shoot-btn';
        btn.textContent = 'FIRE';

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.add('active');
            // Fire bullet via click and hold Space for auto-fire
            if (this.game) {
                if (this.game.onClick) this.game.onClick({ button: 0 });
                if (this.game.keys) this.game.keys['Space'] = true;
            }
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.remove('active');
            if (this.game && this.game.keys) this.game.keys['Space'] = false;
        }, { passive: false });

        btn.addEventListener('touchcancel', () => {
            btn.classList.remove('active');
            if (this.game && this.game.keys) this.game.keys['Space'] = false;
        });

        this.container.appendChild(btn);
        this.elements.push(btn);
    }
}
