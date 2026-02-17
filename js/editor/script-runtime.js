// js/editor/script-runtime.js — GoBlox Script Runtime
// Executes visual scripts (from ScriptEditor.serialize()) during gameplay.

export class ScriptRuntime {
    constructor(game, scriptData, objectMap) {
        this.game = game;              // CustomPlatformer2D instance
        this.scriptData = scriptData;
        this.objectMap = objectMap;     // id -> object reference for fast lookup
        this.variables = {};           // runtime variable state
        this.functions = {};           // name -> action blocks
        this.timers = [];              // active setTimeout IDs for cleanup
        this.running = true;
        this.maxIterations = 10000;

        // Touch triggers: objectId -> { callback, cooldown }
        this._scriptTouches = {};
        // Key triggers: keyName -> callback
        this._scriptKeys = {};
        // Variable watchers: varName -> [callback, ...]
        this._varWatchers = {};
        // Score triggers: [{ op, val, actions, fired }, ...]
        this._scoreTriggers = [];

        // Touch cooldown tracking (prevents firing every frame)
        this._touchCooldowns = {};

        // DOM overlays created by show_msg
        this._overlays = [];
    }

    // ── Initialize ──────────────────────────────────────────────────
    init() {
        // Initialize user-defined variables (all start at 0)
        const vars = this.scriptData.variables || [];
        for (const v of vars) {
            this.variables[v] = 0;
        }
        // Special built-in variable tracking score
        this.variables['_score'] = this.game.score || 0;

        // Process each chain
        const chains = this.scriptData.chains || [];
        for (const chain of chains) {
            const blocks = chain.blocks || [];
            if (blocks.length === 0) continue;

            const trigger = blocks[0];
            const actions = blocks.slice(1);

            this.registerTrigger(trigger, actions);
        }
    }

    // ── Register Trigger ────────────────────────────────────────────
    registerTrigger(trigger, actions) {
        switch (trigger.type) {
            case 'on_start':
                // Execute actions immediately (async, fire-and-forget)
                this.executeActions(actions);
                break;

            case 'on_touch': {
                const objId = trigger.values.obj;
                if (objId) {
                    this._scriptTouches[objId] = {
                        callback: () => this.executeActions(actions),
                        cooldown: false,
                    };
                }
                break;
            }

            case 'on_key': {
                const keyName = trigger.values.key;
                if (keyName) {
                    // Map friendly names to actual key values
                    const keyMap = {
                        'W': 'w', 'A': 'a', 'S': 's', 'D': 'd',
                        'Space': ' ', 'E': 'e',
                    };
                    const mapped = keyMap[keyName] || keyName;

                    // Register key handler on game
                    if (!this.game._scriptKeys) this.game._scriptKeys = {};
                    this.game._scriptKeys[mapped] = () => this.executeActions(actions);
                    this._scriptKeys[mapped] = true;
                }
                break;
            }

            case 'on_timer': {
                const secs = parseFloat(trigger.values.secs) || 5;
                const timerId = setTimeout(() => {
                    if (this.running) {
                        this.executeActions(actions);
                    }
                }, secs * 1000);
                this.timers.push(timerId);
                break;
            }

            case 'on_var': {
                const varName = trigger.values.var;
                if (varName) {
                    if (!this._varWatchers[varName]) this._varWatchers[varName] = [];
                    this._varWatchers[varName].push(() => this.executeActions(actions));
                }
                break;
            }

            case 'on_score': {
                const op = trigger.values.op || '>=';
                const val = parseFloat(trigger.values.val) || 100;
                this._scoreTriggers.push({ op, val, actions, fired: false });
                break;
            }

            case 'def_func': {
                const name = trigger.values.name;
                if (name) {
                    this.functions[name] = actions;
                }
                break;
            }
        }
    }

    // ── Execute Actions (sequentially) ──────────────────────────────
    async executeActions(actions) {
        if (!actions || actions.length === 0) return;
        for (const action of actions) {
            if (!this.running) return;
            try {
                await this.executeOne(action);
            } catch (err) {
                console.warn('[ScriptRuntime] Error executing block:', action.type, err);
            }
        }
    }

    // ── Execute One Block ───────────────────────────────────────────
    async executeOne(block) {
        if (!this.running) return;

        switch (block.type) {
            case 'move_to': {
                const obj = this.objectMap[block.values.obj];
                if (obj) {
                    obj.x = parseFloat(block.values.x) || 0;
                    obj.y = parseFloat(block.values.y) || 0;
                }
                break;
            }

            case 'show_hide': {
                const obj = this.objectMap[block.values.obj];
                if (obj) {
                    const action = block.values.action;
                    obj.hidden = (action === 'Verstecke');
                }
                break;
            }

            case 'destroy': {
                const objId = block.values.obj;
                const obj = this.objectMap[objId];
                if (obj) {
                    // Remove from the appropriate game array
                    this._removeFromArrays(obj);
                    delete this.objectMap[objId];
                }
                break;
            }

            case 'add_score': {
                const pts = parseFloat(block.values.pts) || 0;
                this.game.score += pts;
                break;
            }

            case 'show_msg': {
                const text = block.values.text || '';
                this._showMessage(text);
                break;
            }

            case 'wait': {
                const secs = parseFloat(block.values.secs) || 1;
                await new Promise(resolve => {
                    const id = setTimeout(resolve, secs * 1000);
                    this.timers.push(id);
                });
                break;
            }

            case 'teleport': {
                const obj = this.objectMap[block.values.obj];
                if (obj) {
                    this.game.playerX = obj.x;
                    this.game.playerY = obj.y - this.game.playerH;
                    this.game.playerVY = 0;
                }
                break;
            }

            case 'play_sound': {
                const snd = block.values.snd || 'collect';
                console.log('[ScriptRuntime] play_sound (stub):', snd);
                break;
            }

            case 'win_game': {
                this._showMessage('Gewonnen!');
                this.game.endGame();
                if (this.game.onWin) this.game.onWin();
                break;
            }

            case 'lose_game': {
                this._showMessage('Verloren!');
                this.game.endGame();
                break;
            }

            case 'change_color': {
                const obj = this.objectMap[block.values.obj];
                if (obj) {
                    obj.color = block.values.color || '#ff0000';
                }
                break;
            }

            case 'set_var': {
                const varName = block.values.var;
                const val = parseFloat(block.values.val) || 0;
                if (varName) {
                    this.variables[varName] = val;
                    this._fireVarWatchers(varName);
                }
                break;
            }

            case 'change_var': {
                const varName = block.values.var;
                const delta = parseFloat(block.values.val) || 0;
                if (varName) {
                    this.variables[varName] = (this.variables[varName] || 0) + delta;
                    this._fireVarWatchers(varName);
                }
                break;
            }

            case 'call_func': {
                const name = block.values.name;
                if (name && this.functions[name]) {
                    await this.executeActions(this.functions[name]);
                }
                break;
            }

            case 'if_cond': {
                const result = this.evalCondition(
                    block.values.var,
                    block.values.op,
                    block.values.val
                );
                if (result && block.children) {
                    await this.executeActions(block.children);
                }
                break;
            }

            case 'if_else': {
                const result = this.evalCondition(
                    block.values.var,
                    block.values.op,
                    block.values.val
                );
                if (result && block.children) {
                    await this.executeActions(block.children);
                } else if (!result && block.elseChildren) {
                    await this.executeActions(block.elseChildren);
                }
                break;
            }

            case 'if_random': {
                const pct = parseFloat(block.values.pct) || 50;
                const roll = Math.random() * 100;
                if (roll < pct && block.children) {
                    await this.executeActions(block.children);
                }
                break;
            }

            case 'repeat_n': {
                const n = Math.min(parseFloat(block.values.n) || 0, this.maxIterations);
                for (let i = 0; i < n; i++) {
                    if (!this.running) return;
                    if (block.children) {
                        await this.executeActions(block.children);
                    }
                    // Yield every 100 iterations to prevent UI freeze
                    if (i > 0 && i % 100 === 0) {
                        await new Promise(r => setTimeout(r, 0));
                    }
                }
                break;
            }

            case 'repeat_while': {
                let iterations = 0;
                while (
                    this.running &&
                    iterations < this.maxIterations &&
                    this.evalCondition(block.values.var, block.values.op, block.values.val)
                ) {
                    if (block.children) {
                        await this.executeActions(block.children);
                    }
                    iterations++;
                    // Yield every 100 iterations
                    if (iterations % 100 === 0) {
                        await new Promise(r => setTimeout(r, 0));
                    }
                }
                break;
            }

            default:
                console.warn('[ScriptRuntime] Unknown block type:', block.type);
        }
    }

    // ── Evaluate Condition ──────────────────────────────────────────
    evalCondition(varName, op, val) {
        const varVal = this.variables[varName] || 0;
        const numVal = parseFloat(val) || 0;

        switch (op) {
            case '>=': return varVal >= numVal;
            case '<=': return varVal <= numVal;
            case '==': return varVal === numVal;
            case '!=': return varVal !== numVal;
            default:   return false;
        }
    }

    // ── Update (called each frame by the game) ─────────────────────
    update(dt) {
        if (!this.running) return;

        // Sync _score variable with game score
        this.variables['_score'] = this.game.score;

        // ── Check score triggers ──
        for (const st of this._scoreTriggers) {
            if (st.fired) continue;
            const score = this.game.score;
            let met = false;
            switch (st.op) {
                case '>=': met = score >= st.val; break;
                case '<=': met = score <= st.val; break;
                case '==': met = score === st.val; break;
                case '!=': met = score !== st.val; break;
                default: break;
            }
            if (met) {
                st.fired = true;
                this.executeActions(st.actions);
            }
        }

        // ── Check on_touch triggers ──
        const px = this.game.playerX;
        const py = this.game.playerY;
        const pw = this.game.playerW;
        const ph = this.game.playerH;

        for (const objId of Object.keys(this._scriptTouches)) {
            const obj = this.objectMap[objId];
            if (!obj || obj.hidden) continue;

            const touching = this._rectsOverlap(
                px, py, pw, ph,
                obj.x, obj.y, obj.w, obj.h
            );

            if (touching) {
                if (!this._touchCooldowns[objId]) {
                    this._touchCooldowns[objId] = true;
                    this._scriptTouches[objId].callback();
                }
            } else {
                // Player moved away — allow re-trigger on next contact
                this._touchCooldowns[objId] = false;
            }
        }

        // ── Check key triggers ──
        if (this.game._scriptKeys) {
            for (const key of Object.keys(this.game._scriptKeys)) {
                if (this.game.keys[key] || this.game.keys[key.toUpperCase()]) {
                    // Use a simple cooldown to avoid firing every frame
                    const cooldownKey = '_keyCD_' + key;
                    if (!this[cooldownKey]) {
                        this[cooldownKey] = true;
                        this.game._scriptKeys[key]();
                    }
                } else {
                    const cooldownKey = '_keyCD_' + key;
                    this[cooldownKey] = false;
                }
            }
        }
    }

    // ── AABB overlap check ──────────────────────────────────────────
    _rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax + aw > bx && ax < bx + bw && ay + ah > by && ay < by + bh;
    }

    // ── Fire variable watchers ──────────────────────────────────────
    _fireVarWatchers(varName) {
        const watchers = this._varWatchers[varName];
        if (!watchers) return;
        for (const cb of watchers) {
            cb();
        }
    }

    // ── Remove object from all game arrays ──────────────────────────
    _removeFromArrays(obj) {
        const arrays = [
            this.game.platforms,
            this.game.hazards,
            this.game.collectibles,
            this.game.enemies,
            this.game.bouncePads,
            this.game.checkpoints,
        ];
        for (const arr of arrays) {
            const idx = arr.indexOf(obj);
            if (idx >= 0) {
                arr.splice(idx, 1);
                return;
            }
        }
        // Check if it's the goal
        if (this.game.goalObj === obj) {
            this.game.goalObj = null;
        }
    }

    // ── Show a temporary message overlay ────────────────────────────
    _showMessage(text) {
        const canvas = this.game.canvas;
        if (!canvas || !canvas.parentElement) return;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 24px;
            font-family: monospace;
            font-weight: bold;
            z-index: 100;
            pointer-events: none;
            text-align: center;
            white-space: pre-wrap;
            animation: scriptMsgFade 2.5s ease-out forwards;
        `;
        overlay.textContent = text;

        // Inject keyframe animation if not already present
        if (!document.getElementById('script-msg-anim')) {
            const style = document.createElement('style');
            style.id = 'script-msg-anim';
            style.textContent = `
                @keyframes scriptMsgFade {
                    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    15%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    75%  { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // Position relative to the canvas parent
        const parent = canvas.parentElement;
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        parent.appendChild(overlay);
        this._overlays.push(overlay);

        // Auto-remove after animation
        const timerId = setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
            const idx = this._overlays.indexOf(overlay);
            if (idx >= 0) this._overlays.splice(idx, 1);
        }, 2500);
        this.timers.push(timerId);
    }

    // ── Destroy / Cleanup ───────────────────────────────────────────
    destroy() {
        this.running = false;

        // Clear all timers
        for (const id of this.timers) {
            clearTimeout(id);
        }
        this.timers = [];

        // Remove all DOM overlays
        for (const el of this._overlays) {
            if (el.parentNode) el.remove();
        }
        this._overlays = [];

        // Clear script key handlers from game
        if (this.game._scriptKeys) {
            this.game._scriptKeys = {};
        }

        // Clear references
        this._scriptTouches = {};
        this._scriptKeys = {};
        this._varWatchers = {};
        this._scoreTriggers = [];
        this._touchCooldowns = {};
    }
}
