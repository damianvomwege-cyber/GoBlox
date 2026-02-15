import { BaseGame } from '../base-game.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';

// ── Seeded PRNG ─────────────────────────────────────────────────────────
function mulberry32(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Themes ──────────────────────────────────────────────────────────────
const themes = [
    { name: 'Classic',  primary: '#ffffff', secondary: '#cccccc', bg: '#1a1a2e', accent: '#ffcc00' },
    { name: 'Neon',     primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', accent: '#ff006e' },
    { name: 'Candy',    primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0020', accent: '#00ff7f' },
    { name: 'Ocean',    primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', accent: '#ffbe0b' },
    { name: 'Forest',   primary: '#2ecc71', secondary: '#55efc4', bg: '#0a1a0a', accent: '#f39c12' },
    { name: 'Sunset',   primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0800', accent: '#ff006e' },
    { name: 'Cosmic',   primary: '#a29bfe', secondary: '#dfe6e9', bg: '#0c0c20', accent: '#fd79a8' },
    { name: 'Minimal',  primary: '#ecf0f1', secondary: '#bdc3c7', bg: '#2c3e50', accent: '#e74c3c' },
];

// ── Item definitions ────────────────────────────────────────────────────
const ITEM_DEFS = [
    { type: 'coin',  good: true,  points: 10,  color: '#ffcc00', symbol: '$',  size: 12 },
    { type: 'gem',   good: true,  points: 25,  color: '#33ccff', symbol: '\u25C6', size: 14 },
    { type: 'star',  good: true,  points: 50,  color: '#ffff66', symbol: '\u2605', size: 16 },
    { type: 'bomb',  good: false, points: 0,   color: '#ff4444', symbol: '\u2716', size: 14, loseLife: true },
    { type: 'skull', good: false, points: -25, color: '#cc44cc', symbol: '\u2620', size: 14 },
];

// ── CatchGame ───────────────────────────────────────────────────────────
class CatchGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Config
        const itemSpeedMap = { slow: 100, medium: 160, fast: 230 };
        this.baseItemSpeed = itemSpeedMap[cfg.itemSpeed] || 160;

        const playerSpeedMap = { slow: 250, medium: 350, fast: 480 };
        this.playerSpeed = playerSpeedMap[cfg.playerSpeed] || 350;

        this.itemVariety = cfg.itemVariety || 4;
        this.badItemChance = (cfg.badItemChance || 20) / 100;

        // Available items (subset based on variety)
        this.goodItems = ITEM_DEFS.filter(d => d.good).slice(0, Math.max(2, this.itemVariety - 1));
        this.badItems = ITEM_DEFS.filter(d => !d.good).slice(0, Math.max(1, this.itemVariety - this.goodItems.length));

        // Player
        this.player = {
            x: W / 2,
            y: H - 50,
            width: 60,
            height: 20,
        };

        // Mouse tracking
        this.mouseX = W / 2;
        this.useMouseControl = false;

        // Lives
        this.lives = 3;

        // Falling items
        this.items = [];
        this.spawnTimer = 0;
        this.spawnInterval = 0.8;

        // Time for difficulty scaling
        this.elapsed = 0;

        // Particles
        this.particles = [];

        // Caught item flash
        this.catchFlash = null;

        // Combo
        this.combo = 0;
        this.comboTimer = 0;
    }

    spawnItem() {
        const W = this.canvas.width;
        const isBad = this.rng() < this.badItemChance;
        const pool = isBad ? this.badItems : this.goodItems;
        const def = pool[Math.floor(this.rng() * pool.length)];

        // Speed increases over time
        const speedMult = 1 + this.elapsed / 60;
        const speed = this.baseItemSpeed * speedMult * (0.8 + this.rng() * 0.4);

        this.items.push({
            x: 20 + this.rng() * (W - 40),
            y: -20,
            speed,
            def,
            rotation: this.rng() * Math.PI * 2,
            rotSpeed: (this.rng() - 0.5) * 4,
            wobble: this.rng() * Math.PI * 2,
            wobbleSpeed: 2 + this.rng() * 3,
            wobbleAmp: 20 + this.rng() * 30,
        });
    }

    onMouseMove(x, y) {
        this.mouseX = x;
        this.useMouseControl = true;
    }

    onKeyDown(key) {
        if (key === 'ArrowLeft' || key === 'a' || key === 'A' ||
            key === 'ArrowRight' || key === 'd' || key === 'D') {
            this.useMouseControl = false;
        }
    }

    update(dt) {
        if (this.gameOver) return;

        const W = this.canvas.width;
        const H = this.canvas.height;
        const p = this.player;

        this.elapsed += dt;

        // Player movement
        if (this.useMouseControl) {
            // Smoothly follow mouse
            const targetX = Math.max(p.width / 2, Math.min(W - p.width / 2, this.mouseX));
            const diff = targetX - p.x;
            p.x += diff * 8 * dt;
        } else {
            if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
                p.x -= this.playerSpeed * dt;
            }
            if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
                p.x += this.playerSpeed * dt;
            }
        }
        p.x = Math.max(p.width / 2, Math.min(W - p.width / 2, p.x));

        // Spawn items
        // Spawn rate increases over time
        const currentInterval = Math.max(0.2, this.spawnInterval - this.elapsed / 120);
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = currentInterval;
            this.spawnItem();
        }

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        // Update items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.speed * dt;
            item.rotation += item.rotSpeed * dt;
            item.wobble += item.wobbleSpeed * dt;
            // Gentle horizontal wobble
            const wobbleX = Math.sin(item.wobble) * item.wobbleAmp * 0.02;
            item.x += wobbleX;

            // Check catch collision with player
            const dx = item.x - p.x;
            const dy = item.y - p.y;
            if (Math.abs(dx) < p.width / 2 + item.def.size &&
                Math.abs(dy) < p.height / 2 + item.def.size) {
                // Caught!
                if (item.def.good) {
                    this.combo++;
                    this.comboTimer = 2;
                    const comboMult = Math.min(5, this.combo);
                    const points = item.def.points * comboMult;
                    this.score += points;

                    this.catchFlash = {
                        text: `+${points}${comboMult > 1 ? ' x' + comboMult : ''}`,
                        x: item.x,
                        y: item.y,
                        timer: 0.8,
                        color: item.def.color,
                    };

                    // Happy particles
                    for (let j = 0; j < 5; j++) {
                        this.particles.push({
                            x: item.x, y: item.y,
                            vx: (this.rng() - 0.5) * 120,
                            vy: -(50 + this.rng() * 80),
                            life: 0.5, maxLife: 0.5,
                            color: item.def.color,
                        });
                    }
                } else {
                    // Bad item
                    this.combo = 0;
                    if (item.def.loseLife) {
                        this.lives--;
                        this.catchFlash = {
                            text: 'LIFE LOST!',
                            x: item.x, y: item.y,
                            timer: 1.0,
                            color: '#ff4444',
                        };
                    } else {
                        this.score = Math.max(0, this.score + item.def.points);
                        this.catchFlash = {
                            text: `${item.def.points}`,
                            x: item.x, y: item.y,
                            timer: 0.8,
                            color: item.def.color,
                        };
                    }

                    // Bad particles
                    for (let j = 0; j < 4; j++) {
                        this.particles.push({
                            x: item.x, y: item.y,
                            vx: (this.rng() - 0.5) * 100,
                            vy: (this.rng() - 0.5) * 100,
                            life: 0.4, maxLife: 0.4,
                            color: '#ff4444',
                        });
                    }

                    if (this.lives <= 0) {
                        this.endGame();
                        return;
                    }
                }
                this.items.splice(i, 1);
                continue;
            }

            // Fell off bottom
            if (item.y > H + 20) {
                // Missing a good item breaks combo
                if (item.def.good) this.combo = 0;
                this.items.splice(i, 1);
            }
        }

        // Update catch flash
        if (this.catchFlash) {
            this.catchFlash.timer -= dt;
            this.catchFlash.y -= 40 * dt;
            if (this.catchFlash.timer <= 0) this.catchFlash = null;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // Gravity
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;
        const p = this.player;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Subtle vertical gradient at bottom
        const grad = ctx.createLinearGradient(0, H - 100, 0, H);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, t.primary + '08');
        ctx.fillStyle = grad;
        ctx.fillRect(0, H - 100, W, 100);

        // Ground line
        ctx.strokeStyle = t.primary + '30';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H - 25);
        ctx.lineTo(W, H - 25);
        ctx.stroke();

        // Falling items
        for (const item of this.items) {
            const def = item.def;

            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.rotate(item.rotation);

            // Glow
            ctx.fillStyle = def.color + '25';
            ctx.beginPath();
            ctx.arc(0, 0, def.size * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Item body
            ctx.fillStyle = def.color;
            ctx.beginPath();
            ctx.arc(0, 0, def.size, 0, Math.PI * 2);
            ctx.fill();

            // Symbol
            ctx.fillStyle = '#000000aa';
            ctx.font = `bold ${def.size}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.symbol, 0, 1);

            // Shine
            ctx.fillStyle = '#ffffff30';
            ctx.beginPath();
            ctx.arc(-def.size * 0.25, -def.size * 0.25, def.size * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Player (basket/paddle)
        const px = p.x - p.width / 2;
        const py = p.y - p.height / 2;

        // Basket shadow
        ctx.fillStyle = '#00000030';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + p.height / 2 + 4, p.width / 2 + 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Basket body (trapezoid)
        ctx.fillStyle = t.primary;
        ctx.beginPath();
        ctx.moveTo(px - 4, py + p.height);
        ctx.lineTo(px + 4, py);
        ctx.lineTo(px + p.width - 4, py);
        ctx.lineTo(px + p.width + 4, py + p.height);
        ctx.closePath();
        ctx.fill();

        // Basket inner
        ctx.fillStyle = t.bg + 'cc';
        ctx.beginPath();
        ctx.moveTo(px + 2, py + p.height - 2);
        ctx.lineTo(px + 7, py + 3);
        ctx.lineTo(px + p.width - 7, py + 3);
        ctx.lineTo(px + p.width - 2, py + p.height - 2);
        ctx.closePath();
        ctx.fill();

        // Basket rim highlight
        ctx.strokeStyle = t.secondary + '80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 4, py);
        ctx.lineTo(px + p.width - 4, py);
        ctx.stroke();

        // Particles
        for (const pt of this.particles) {
            const alpha = pt.life / pt.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Catch flash text
        if (this.catchFlash) {
            const cf = this.catchFlash;
            ctx.globalAlpha = Math.min(1, cf.timer * 2);
            ctx.fillStyle = cf.color;
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cf.text, cf.x, cf.y);
            ctx.globalAlpha = 1;
        }

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Lives
        ctx.fillStyle = '#ff6666';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i < this.lives; i++) {
            ctx.fillText('\u2665', W - 12 - i * 24, 12);
        }

        // Combo
        if (this.combo > 1 && this.comboTimer > 0) {
            ctx.fillStyle = t.accent || '#ffcc00';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`Combo x${Math.min(5, this.combo)}`, 12, 38);
        }

        // Speed indicator
        const speedPercent = Math.floor((1 + this.elapsed / 60) * 100);
        ctx.fillStyle = t.secondary + '80';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`Speed: ${speedPercent}%`, W - 12, 36);

        // Instructions at start
        if (this.elapsed < 3) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Left/Right or Mouse to move | Catch good, dodge bad!', W / 2, H - 8);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 30);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 15);

            ctx.font = '18px monospace';
            ctx.fillText(`Time: ${Math.floor(this.elapsed)}s`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const itemSpeeds = ['slow', 'medium', 'fast'];
    const itemVarieties = [3, 4, 5];
    const playerSpeeds = ['slow', 'medium', 'fast'];
    const badItemChances = [10, 20, 30];
    let seed = 1;

    for (const itemSpeed of itemSpeeds) {
        for (const itemVariety of itemVarieties) {
            for (const badItemChance of badItemChances) {
                for (const theme of themes) {
                    // Alternate player speeds to keep variation count manageable
                    const playerSpeed = playerSpeeds[seed % playerSpeeds.length];
                    variations.push({
                        name: generateGameName('Catch', seed),
                        category: 'Catch',
                        config: {
                            itemSpeed,
                            itemVariety,
                            playerSpeed,
                            badItemChance,
                            theme,
                            seed,
                        },
                        thumbnail: generateThumbnail('Catch', { theme }, seed),
                    });
                    seed++;
                    if (variations.length >= 150) break;
                }
                if (variations.length >= 150) break;
            }
            if (variations.length >= 150) break;
        }
        if (variations.length >= 150) break;
    }
    // 3 * 3 * 3 * 8 = 216 but capped at 150
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Catch', CatchGame, generateVariations);
