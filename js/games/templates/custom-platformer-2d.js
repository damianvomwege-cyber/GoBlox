import { BaseGame } from '../base-game.js';
import { drawCharacter } from '../character.js';

// ══════════════════════════════════════════════════════════════════════════
// CustomPlatformer2D — plays user-placed level data from the 2D editor
// ══════════════════════════════════════════════════════════════════════════
export class CustomPlatformer2D extends BaseGame {

    init() {
        const cfg = this.config;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Theme & physics
        this.theme = cfg.theme || { name: 'Neon', primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e' };
        this.gravity = cfg.gravity || 1.0;
        this.scrollSpeed = cfg.scrollSpeed || 1.0;

        // Player dimensions & state
        this.playerW = 24;
        this.playerH = 36;
        this.playerVY = 0;
        this.isGrounded = false;
        this.walkAnim = 0;
        this.playerDirection = 'right';

        // Camera (manual follow, no auto-scroll)
        this.cameraX = 0;

        // ── Categorize editor objects ──
        const objs = cfg.objects || [];

        this.platforms = [];    // platform, ground, wall, ramp
        this.hazards = [];      // spike, lava, kill_zone
        this.collectibles = []; // coin, gem, star
        this.enemies = [];      // enemy_patrol, enemy_chase
        this.bouncePads = [];
        this.checkpoints = [];
        this.goalObj = null;
        let spawnObj = null;

        for (const obj of objs) {
            const o = { ...obj };
            switch (o.type) {
                case 'platform':
                case 'ground':
                case 'wall':
                case 'ramp':
                    this.platforms.push(o);
                    break;
                case 'spike':
                case 'lava':
                case 'kill_zone':
                    this.hazards.push(o);
                    break;
                case 'coin':
                    this.collectibles.push({ ...o, collected: false, value: 10 });
                    break;
                case 'gem':
                    this.collectibles.push({ ...o, collected: false, value: 25 });
                    break;
                case 'star':
                    this.collectibles.push({ ...o, collected: false, value: 50 });
                    break;
                case 'enemy_patrol':
                case 'enemy_chase':
                    this.enemies.push({ ...o, origX: o.x, dir: 1 });
                    break;
                case 'bounce_pad':
                    this.bouncePads.push(o);
                    break;
                case 'checkpoint':
                    this.checkpoints.push({ ...o, activated: false });
                    break;
                case 'goal':
                    if (!this.goalObj) this.goalObj = o;
                    break;
                case 'spawn':
                    if (!spawnObj) spawnObj = o;
                    break;
            }
        }

        // Player start position
        if (spawnObj) {
            this.playerX = spawnObj.x;
            this.playerY = spawnObj.y - this.playerH;
        } else {
            this.playerX = 100;
            this.playerY = 300;
        }
        this.spawnX = this.playerX;
        this.spawnY = this.playerY;
        this.spawnObj = spawnObj;

        // Particles
        this.particles = [];

        // Initial camera so player is visible
        this.cameraX = Math.max(0, this.playerX - W * 0.3);

        // Win callback (set externally)
        this.onWin = null;

        // ── Build object map for script runtime ──
        this._objectMap = {};
        for (const arr of [this.platforms, this.hazards, this.collectibles, this.enemies, this.bouncePads, this.checkpoints]) {
            for (const obj of arr) {
                if (obj.id) this._objectMap[obj.id] = obj;
            }
        }
        if (this.goalObj && this.goalObj.id) this._objectMap[this.goalObj.id] = this.goalObj;

        // ── Script runtime (lazy-loaded on first update frame) ──
        this._scriptConfig = cfg.scripts || null;
        this._scriptRuntime = null;
        this._scriptsInitialized = false;
    }

    // ── Override stop for script cleanup ──
    stop() {
        if (this._scriptRuntime) {
            this._scriptRuntime.destroy();
            this._scriptRuntime = null;
        }
        super.stop();
    }

    // ── Update ──────────────────────────────────────────────────────────
    update(dt) {
        if (this.gameOver) return;

        // ── Script runtime: lazy-init on first frame, then update ──
        if (!this._scriptsInitialized && this._scriptConfig?.chains?.length) {
            this._scriptsInitialized = true;
            import('../editor/script-runtime.js').then(({ ScriptRuntime }) => {
                this._scriptRuntime = new ScriptRuntime(this, this._scriptConfig, this._objectMap);
                this._scriptRuntime.init();
            });
        }
        if (this._scriptRuntime) {
            this._scriptRuntime.update(dt);
        }

        const W = this.canvas.width;
        const H = this.canvas.height;

        // ── Player horizontal movement (no auto-scroll) ──
        let moving = false;
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.playerX -= 200 * dt;
            this.playerDirection = 'left';
            moving = true;
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.playerX += 200 * dt;
            this.playerDirection = 'right';
            moving = true;
        }

        // ── Gravity ──
        this.playerVY += this.gravity * 1800 * dt;
        this.playerY += this.playerVY * dt;

        // ── Platform collision ──
        this.isGrounded = false;
        const px = this.playerX;
        const py = this.playerY;
        const pw = this.playerW;
        const ph = this.playerH;

        for (const plat of this.platforms) {
            if (plat.hidden) continue;
            if (plat.type === 'ramp') {
                // Ramp: slope collision
                if (px + pw > plat.x && px < plat.x + plat.w) {
                    // Ramp goes from bottom-left (plat.y + plat.h) to top-right (plat.y)
                    const relX = Math.max(0, Math.min(plat.w, (px + pw / 2) - plat.x));
                    const frac = relX / plat.w;
                    const slopeY = plat.y + plat.h - frac * plat.h;
                    if (py + ph >= slopeY && py + ph <= slopeY + 20 && this.playerVY >= 0) {
                        this.playerY = slopeY - ph;
                        this.playerVY = 0;
                        this.isGrounded = true;
                    }
                }
                continue;
            }

            if (plat.type === 'wall') {
                // Wall: horizontal collision (push player out left/right)
                if (px + pw > plat.x && px < plat.x + plat.w &&
                    py + ph > plat.y && py < plat.y + plat.h) {
                    // Determine which side to push
                    const overlapLeft = (px + pw) - plat.x;
                    const overlapRight = (plat.x + plat.w) - px;
                    if (overlapLeft < overlapRight) {
                        this.playerX = plat.x - pw;
                    } else {
                        this.playerX = plat.x + plat.w;
                    }
                }
                // Also allow landing on top of walls
                if (px + pw > plat.x && px < plat.x + plat.w &&
                    py + ph >= plat.y && py + ph <= plat.y + 20 && this.playerVY >= 0) {
                    this.playerY = plat.y - ph;
                    this.playerVY = 0;
                    this.isGrounded = true;
                }
                continue;
            }

            // platform / ground: top-landing collision
            if (px + pw > plat.x && px < plat.x + plat.w &&
                py + ph >= plat.y && py + ph <= plat.y + 20 && this.playerVY >= 0) {
                this.playerY = plat.y - ph;
                this.playerVY = 0;
                this.isGrounded = true;
            }
        }

        // ── Hazard collision ──
        for (const haz of this.hazards) {
            if (haz.hidden) continue;
            if (this.rectsOverlap(px, py, pw, ph, haz.x, haz.y, haz.w, haz.h)) {
                this.respawn();
                return;
            }
        }

        // ── Collectible collision ──
        for (const col of this.collectibles) {
            if (col.collected || col.hidden) continue;
            if (this.rectsOverlap(px, py, pw, ph, col.x, col.y, col.w, col.h)) {
                col.collected = true;
                this.score += col.value;
                // Spawn sparkle particles
                for (let i = 0; i < 8; i++) {
                    this.particles.push({
                        x: col.x + col.w / 2,
                        y: col.y + col.h / 2,
                        vx: (Math.random() - 0.5) * 120,
                        vy: (Math.random() - 0.5) * 120,
                        life: 0.5,
                        maxLife: 0.5,
                        color: col.color,
                    });
                }
            }
        }

        // ── Enemy movement & collision ──
        for (const en of this.enemies) {
            if (en.hidden) continue;
            const speed = (en.behaviors && en.behaviors.speed) || 2;
            const range = (en.behaviors && en.behaviors.range) || 100;

            if (en.type === 'enemy_patrol') {
                en.x += speed * 60 * dt * en.dir;
                if (en.x > en.origX + range) { en.x = en.origX + range; en.dir = -1; }
                if (en.x < en.origX - range) { en.x = en.origX - range; en.dir = 1; }
            } else if (en.type === 'enemy_chase') {
                const dx = (px + pw / 2) - (en.x + en.w / 2);
                const dy = (py + ph / 2) - (en.y + en.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < range && dist > 1) {
                    en.x += (dx / dist) * speed * 60 * dt;
                    en.y += (dy / dist) * speed * 60 * dt;
                    en.dir = dx > 0 ? 1 : -1;
                }
            }

            if (this.rectsOverlap(px, py, pw, ph, en.x, en.y, en.w, en.h)) {
                this.respawn();
                return;
            }
        }

        // ── Bounce pads ──
        for (const bp of this.bouncePads) {
            if (bp.hidden) continue;
            if (this.rectsOverlap(px, py, pw, ph, bp.x, bp.y, bp.w, bp.h) && this.playerVY >= 0) {
                this.playerVY = -this.gravity * 900;
                this.isGrounded = false;
                for (let i = 0; i < 6; i++) {
                    this.particles.push({
                        x: bp.x + bp.w / 2,
                        y: bp.y,
                        vx: (Math.random() - 0.5) * 100,
                        vy: -Math.random() * 80,
                        life: 0.4,
                        maxLife: 0.4,
                        color: bp.color,
                    });
                }
            }
        }

        // ── Checkpoints ──
        for (const cp of this.checkpoints) {
            if (cp.hidden) continue;
            if (this.rectsOverlap(px, py, pw, ph, cp.x, cp.y, cp.w, cp.h)) {
                if (!cp.activated) {
                    cp.activated = true;
                    this.spawnX = cp.x;
                    this.spawnY = cp.y - this.playerH;
                    // Small activation particles
                    for (let i = 0; i < 5; i++) {
                        this.particles.push({
                            x: cp.x + cp.w / 2,
                            y: cp.y,
                            vx: (Math.random() - 0.5) * 60,
                            vy: -Math.random() * 80,
                            life: 0.5,
                            maxLife: 0.5,
                            color: '#ffcc00',
                        });
                    }
                }
            }
        }

        // ── Goal ──
        if (this.goalObj) {
            const g = this.goalObj;
            if (this.rectsOverlap(px, py, pw, ph, g.x, g.y, g.w, g.h)) {
                this.endGame();
                if (this.onWin) this.onWin();
                return;
            }
        }

        // ── Fall death ──
        if (this.playerY > H + 100) {
            this.respawn();
        }

        // ── Camera follow (lerp) ──
        const targetCam = this.playerX - W * 0.3;
        this.cameraX += (targetCam - this.cameraX) * Math.min(1, 6 * dt);
        if (this.cameraX < 0) this.cameraX = 0;

        // ── Walk animation ──
        if (this.isGrounded && moving) {
            this.walkAnim += dt * 6;
        }

        // ── Update particles ──
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 80 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────
    rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax + aw > bx && ax < bx + bw && ay + ah > by && ay < by + bh;
    }

    respawn() {
        this.playerX = this.spawnX;
        this.playerY = this.spawnY;
        this.playerVY = 0;
        this.isGrounded = false;
        // Respawn particles
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: this.spawnX + this.playerW / 2,
                y: this.spawnY + this.playerH / 2,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 0.5,
                maxLife: 0.5,
                color: this.theme.primary,
            });
        }
    }

    // ── onKeyDown ────────────────────────────────────────────────────────
    onKeyDown(key) {
        if (this.gameOver) return;
        if ((key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') && this.isGrounded) {
            this.playerVY = -this.gravity * 600;
            this.isGrounded = false;
            // Jump particles
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x: this.playerX + this.playerW / 2,
                    y: this.playerY + this.playerH,
                    vx: (Math.random() - 0.5) * 80,
                    vy: -Math.random() * 60,
                    life: 0.5,
                    maxLife: 0.5,
                    color: this.theme.primary,
                });
            }
        }
    }

    // ── Render ───────────────────────────────────────────────────────────
    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Parallax dots
        ctx.fillStyle = t.secondary + '15';
        for (let i = 0; i < 40; i++) {
            const bx = ((i * 137.5 + 50) % (W + 200)) - (this.cameraX * 0.1 % (W + 200));
            const by = (i * 83.7 + 30) % H;
            ctx.beginPath();
            ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(-this.cameraX, 0);

        // ── Render platforms (platform/ground) ──
        for (const plat of this.platforms) {
            if (plat.hidden) continue;
            if (plat.x + plat.w < this.cameraX - 50 || plat.x > this.cameraX + W + 50) continue;

            if (plat.type === 'ramp') {
                // Triangle fill for ramps
                ctx.fillStyle = plat.color;
                ctx.beginPath();
                ctx.moveTo(plat.x, plat.y + plat.h);
                ctx.lineTo(plat.x + plat.w, plat.y);
                ctx.lineTo(plat.x + plat.w, plat.y + plat.h);
                ctx.closePath();
                ctx.fill();
                // Slope edge accent
                ctx.strokeStyle = t.primary;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(plat.x, plat.y + plat.h);
                ctx.lineTo(plat.x + plat.w, plat.y);
                ctx.stroke();
                continue;
            }

            if (plat.type === 'wall') {
                ctx.fillStyle = plat.color;
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                // Top accent
                ctx.fillStyle = t.primary;
                ctx.fillRect(plat.x, plat.y, plat.w, 3);
                continue;
            }

            // platform / ground
            ctx.fillStyle = plat.color;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            // Top edge accent
            ctx.fillStyle = t.primary;
            ctx.fillRect(plat.x, plat.y, plat.w, 4);
            // Side edges
            ctx.fillStyle = t.primary + '60';
            ctx.fillRect(plat.x, plat.y, 3, plat.h);
            ctx.fillRect(plat.x + plat.w - 3, plat.y, 3, plat.h);
        }

        // ── Render hazards ──
        for (const haz of this.hazards) {
            if (haz.hidden) continue;
            if (haz.x + haz.w < this.cameraX - 50 || haz.x > this.cameraX + W + 50) continue;

            if (haz.type === 'spike') {
                // Triangle spike
                ctx.fillStyle = haz.color;
                ctx.beginPath();
                ctx.moveTo(haz.x, haz.y + haz.h);
                ctx.lineTo(haz.x + haz.w / 2, haz.y);
                ctx.lineTo(haz.x + haz.w, haz.y + haz.h);
                ctx.closePath();
                ctx.fill();
            } else {
                // lava / kill_zone: glowing rect
                ctx.fillStyle = haz.color;
                ctx.fillRect(haz.x, haz.y, haz.w, haz.h);
                // Glow effect
                ctx.fillStyle = haz.color + '40';
                ctx.fillRect(haz.x - 2, haz.y - 2, haz.w + 4, haz.h + 4);
                // Shimmer top
                ctx.fillStyle = '#ffffff30';
                ctx.fillRect(haz.x, haz.y, haz.w, 2);
            }
        }

        // ── Render collectibles (uncollected only) ──
        for (const col of this.collectibles) {
            if (col.collected || col.hidden) continue;
            if (col.x + col.w < this.cameraX - 50 || col.x > this.cameraX + W + 50) continue;

            const cx = col.x + col.w / 2;
            const cy = col.y + col.h / 2;
            const r = Math.max(col.w, col.h) / 2;

            ctx.fillStyle = col.color;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Shine highlight
            ctx.fillStyle = '#ffffff60';
            ctx.beginPath();
            ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Render enemies ──
        for (const en of this.enemies) {
            if (en.hidden) continue;
            if (en.x + en.w < this.cameraX - 50 || en.x > this.cameraX + W + 50) continue;

            ctx.fillStyle = en.color;
            ctx.fillRect(en.x, en.y, en.w, en.h);

            // Eyes (white + black pupil)
            const eyeY = en.y + en.h * 0.3;
            const eyeR = en.w * 0.12;
            // Left eye
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(en.x + en.w * 0.3, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            // Right eye
            ctx.beginPath();
            ctx.arc(en.x + en.w * 0.7, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            // Pupils
            ctx.fillStyle = '#000000';
            const pupilOff = en.dir > 0 ? eyeR * 0.3 : -eyeR * 0.3;
            ctx.beginPath();
            ctx.arc(en.x + en.w * 0.3 + pupilOff, eyeY, eyeR * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(en.x + en.w * 0.7 + pupilOff, eyeY, eyeR * 0.55, 0, Math.PI * 2);
            ctx.fill();

            // Patrol range indicator
            if (en.type === 'enemy_patrol') {
                const range = (en.behaviors && en.behaviors.range) || 100;
                ctx.strokeStyle = en.color + '30';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(en.origX - range, en.y + en.h / 2);
                ctx.lineTo(en.origX + range + en.w, en.y + en.h / 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // ── Render bounce pads ──
        for (const bp of this.bouncePads) {
            if (bp.hidden) continue;
            if (bp.x + bp.w < this.cameraX - 50 || bp.x > this.cameraX + W + 50) continue;

            ctx.fillStyle = bp.color;
            ctx.fillRect(bp.x, bp.y, bp.w, bp.h);
            // Upward arrow indicator
            ctx.fillStyle = '#ffffff';
            const arrowX = bp.x + bp.w / 2;
            const arrowY = bp.y + bp.h / 2;
            ctx.beginPath();
            ctx.moveTo(arrowX - 5, arrowY + 2);
            ctx.lineTo(arrowX, arrowY - 3);
            ctx.lineTo(arrowX + 5, arrowY + 2);
            ctx.closePath();
            ctx.fill();
        }

        // ── Render checkpoints ──
        for (const cp of this.checkpoints) {
            if (cp.hidden) continue;
            if (cp.x + cp.w < this.cameraX - 50 || cp.x > this.cameraX + W + 50) continue;

            // Flag pole
            ctx.fillStyle = '#888888';
            ctx.fillRect(cp.x + 2, cp.y, 3, cp.h);
            // Flag
            ctx.fillStyle = cp.activated ? '#33cc33' : cp.color;
            ctx.beginPath();
            ctx.moveTo(cp.x + 5, cp.y);
            ctx.lineTo(cp.x + cp.w, cp.y + 6);
            ctx.lineTo(cp.x + 5, cp.y + 12);
            ctx.closePath();
            ctx.fill();
        }

        // ── Render spawn ──
        if (this.spawnObj) {
            const s = this.spawnObj;
            ctx.fillStyle = s.color + '50';
            ctx.fillRect(s.x, s.y, s.w, s.h);
            // Small flag
            ctx.fillStyle = '#888888';
            ctx.fillRect(s.x + 2, s.y, 2, s.h);
            ctx.fillStyle = s.color + '80';
            ctx.beginPath();
            ctx.moveTo(s.x + 4, s.y);
            ctx.lineTo(s.x + 16, s.y + 6);
            ctx.lineTo(s.x + 4, s.y + 12);
            ctx.closePath();
            ctx.fill();
        }

        // ── Render goal ──
        if (this.goalObj) {
            const g = this.goalObj;
            if (g.x + g.w >= this.cameraX - 50 && g.x <= this.cameraX + W + 50) {
                // Golden glow
                ctx.fillStyle = '#ffcc0030';
                ctx.beginPath();
                ctx.arc(g.x + g.w / 2, g.y + g.h / 2, g.w, 0, Math.PI * 2);
                ctx.fill();
                // Star shape
                const cx = g.x + g.w / 2;
                const cy = g.y + g.h / 2;
                const outerR = Math.min(g.w, g.h) / 2;
                const innerR = outerR * 0.45;
                ctx.fillStyle = g.color;
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    const r = i % 2 === 0 ? outerR : innerR;
                    const angle = (i * Math.PI / 5) - Math.PI / 2;
                    const method = i === 0 ? 'moveTo' : 'lineTo';
                    ctx[method](cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
                }
                ctx.closePath();
                ctx.fill();
                // Shine
                ctx.fillStyle = '#ffffff50';
                ctx.beginPath();
                ctx.arc(cx - outerR * 0.2, cy - outerR * 0.2, outerR * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Draw player ──
        drawCharacter(
            ctx,
            this.playerX + this.playerW / 2,
            this.playerY + this.playerH / 2,
            this.playerH,
            this.playerDirection,
            'none',
            this.isGrounded ? this.walkAnim : 0
        );

        ctx.restore();

        // ── Render particles (screen-space) ──
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color || t.primary;
            ctx.globalAlpha = alpha;
            ctx.fillRect(p.x - this.cameraX - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        // ── HUD ──
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 15, 15);

        // Controls hint
        ctx.fillStyle = t.secondary + 'aa';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WASD / Pfeiltasten + LEERTASTE', W / 2, H - 22);

        // ── Game Over overlay ──
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GESCHAFFT!', W / 2, H / 2 - 30);
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 28px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 20);
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '18px monospace';
            ctx.fillText('ESC zum Beenden', W / 2, H / 2 + 60);
        }
    }
}
