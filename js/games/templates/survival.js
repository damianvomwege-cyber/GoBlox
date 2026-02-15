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
    { name: 'Wasteland', primary: '#a0522d', secondary: '#d2b48c', bg: '#1a1008', enemy: '#ff4444', resource: '#44ff88', grid: '#2a1a08' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', enemy: '#ff006e', resource: '#00ffcc', grid: '#161650' },
    { name: 'Arctic',    primary: '#88ccff', secondary: '#ddeeff', bg: '#0a1628', enemy: '#ff6666', resource: '#66ffaa', grid: '#102030' },
    { name: 'Jungle',    primary: '#33cc33', secondary: '#66ff66', bg: '#0a1a0a', enemy: '#ff3300', resource: '#ffff33', grid: '#0e220e' },
    { name: 'Lava',      primary: '#ff6600', secondary: '#ffaa33', bg: '#1a0800', enemy: '#ff0033', resource: '#33ff99', grid: '#2a1200' },
    { name: 'Cyber',     primary: '#cc33ff', secondary: '#ff66ff', bg: '#0f0020', enemy: '#ff3366', resource: '#33ffcc', grid: '#180030' },
    { name: 'Ocean',     primary: '#0099cc', secondary: '#66ccee', bg: '#030820', enemy: '#ff4466', resource: '#66ff88', grid: '#051030' },
    { name: 'Midnight',  primary: '#6666cc', secondary: '#9999ee', bg: '#08080f', enemy: '#ff5555', resource: '#55ff99', grid: '#10101a' },
];

// ── SurvivalGame ────────────────────────────────────────────────────────
class SurvivalGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Map size
        const mapSizes = { small: 1.0, medium: 1.5, large: 2.0 };
        this.mapScale = mapSizes[cfg.mapSize] || 1.5;
        this.mapW = W * this.mapScale;
        this.mapH = H * this.mapScale;

        // Player
        this.player = {
            x: this.mapW / 2,
            y: this.mapH / 2,
            radius: 12,
            speed: 180,
            hp: 100,
            maxHp: 100,
            shieldTimer: 0,
        };

        // Camera
        this.camX = 0;
        this.camY = 0;

        // Resources
        const densityMap = { sparse: 6, normal: 12, abundant: 20 };
        this.maxResources = densityMap[cfg.resourceDensity] || 12;
        this.resources = [];
        for (let i = 0; i < this.maxResources; i++) {
            this.spawnResource();
        }

        // Enemies
        this.enemies = [];
        this.enemyTypes = cfg.enemyTypes || 2;
        const spawnRateMap = { slow: 2.5, medium: 1.5, fast: 0.8 };
        this.baseSpawnInterval = spawnRateMap[cfg.spawnRate] || 1.5;
        this.spawnTimer = this.baseSpawnInterval;
        this.timeSurvived = 0;

        // Particles
        this.particles = [];

        // Damage cooldown
        this.damageCooldown = 0;
    }

    spawnResource() {
        const type = this.rng() < 0.25 ? 'shield' : 'health';
        this.resources.push({
            x: 30 + this.rng() * (this.mapW - 60),
            y: 30 + this.rng() * (this.mapH - 60),
            type,
            radius: 8,
            bobPhase: this.rng() * Math.PI * 2,
        });
    }

    spawnEnemy() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        // Spawn from edges of the visible area
        const side = Math.floor(this.rng() * 4);
        let x, y;
        switch (side) {
            case 0: x = this.camX - 30; y = this.camY + this.rng() * H; break;
            case 1: x = this.camX + W + 30; y = this.camY + this.rng() * H; break;
            case 2: x = this.camX + this.rng() * W; y = this.camY - 30; break;
            default: x = this.camX + this.rng() * W; y = this.camY + H + 30; break;
        }

        // Enemy type determines speed and size
        const typeIndex = Math.floor(this.rng() * this.enemyTypes);
        const types = [
            { speed: 60, radius: 10, hp: 1, color: this.theme.enemy },
            { speed: 90, radius: 7, hp: 1, color: '#ff8800' },
            { speed: 40, radius: 16, hp: 2, color: '#cc0044' },
        ];
        const t = types[typeIndex] || types[0];

        // Scale speed with time survived
        const speedMult = 1 + this.timeSurvived / 120;

        this.enemies.push({
            x, y,
            speed: t.speed * speedMult,
            radius: t.radius,
            hp: t.hp,
            color: t.color,
        });
    }

    update(dt) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const p = this.player;

        this.timeSurvived += dt;

        // Player movement
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
            p.x += dx * p.speed * dt;
            p.y += dy * p.speed * dt;
        }

        // Clamp player to map
        p.x = Math.max(p.radius, Math.min(this.mapW - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(this.mapH - p.radius, p.y));

        // Camera follow
        this.camX = Math.max(0, Math.min(this.mapW - W, p.x - W / 2));
        this.camY = Math.max(0, Math.min(this.mapH - H, p.y - H / 2));

        // Shield timer
        if (p.shieldTimer > 0) p.shieldTimer -= dt;

        // Damage cooldown
        if (this.damageCooldown > 0) this.damageCooldown -= dt;

        // Resource collection
        for (let i = this.resources.length - 1; i >= 0; i--) {
            const r = this.resources[i];
            const rdx = p.x - r.x;
            const rdy = p.y - r.y;
            const dist = Math.sqrt(rdx * rdx + rdy * rdy);
            if (dist < p.radius + r.radius) {
                if (r.type === 'health') {
                    p.hp = Math.min(p.maxHp, p.hp + 10);
                    this.score += 5;
                } else {
                    p.shieldTimer = 3;
                    this.score += 10;
                }
                // Particles
                for (let j = 0; j < 6; j++) {
                    this.particles.push({
                        x: r.x, y: r.y,
                        vx: (this.rng() - 0.5) * 150,
                        vy: (this.rng() - 0.5) * 150,
                        life: 0.5, maxLife: 0.5,
                        color: r.type === 'health' ? this.theme.resource : '#66ccff',
                    });
                }
                this.resources.splice(i, 1);
                this.spawnResource();
            }
        }

        // Enemy spawning — rate increases over time
        const spawnInterval = Math.max(0.3, this.baseSpawnInterval - this.timeSurvived / 60);
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = spawnInterval;
            // Spawn more enemies as time goes on
            const count = 1 + Math.floor(this.timeSurvived / 30);
            for (let i = 0; i < count; i++) {
                this.spawnEnemy();
            }
        }

        // Enemy AI — chase player
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const edx = p.x - e.x;
            const edy = p.y - e.y;
            const elen = Math.sqrt(edx * edx + edy * edy);
            if (elen > 0) {
                e.x += (edx / elen) * e.speed * dt;
                e.y += (edy / elen) * e.speed * dt;
            }

            // Collision with player
            if (elen < p.radius + e.radius) {
                if (p.shieldTimer > 0) {
                    // Destroy enemy on shield
                    for (let j = 0; j < 4; j++) {
                        this.particles.push({
                            x: e.x, y: e.y,
                            vx: (this.rng() - 0.5) * 120,
                            vy: (this.rng() - 0.5) * 120,
                            life: 0.4, maxLife: 0.4,
                            color: '#66ccff',
                        });
                    }
                    this.enemies.splice(i, 1);
                    this.score += 15;
                    continue;
                }
                if (this.damageCooldown <= 0) {
                    p.hp -= 15;
                    this.damageCooldown = 0.5;
                    // Knockback particles
                    for (let j = 0; j < 3; j++) {
                        this.particles.push({
                            x: p.x, y: p.y,
                            vx: (this.rng() - 0.5) * 100,
                            vy: (this.rng() - 0.5) * 100,
                            life: 0.3, maxLife: 0.3,
                            color: '#ff4444',
                        });
                    }
                    if (p.hp <= 0) {
                        p.hp = 0;
                        this.endGame();
                        return;
                    }
                }
            }

            // Remove enemies too far from map
            if (e.x < -100 || e.x > this.mapW + 100 || e.y < -100 || e.y > this.mapH + 100) {
                this.enemies.splice(i, 1);
            }
        }

        // Score: add 1 point per second survived (on top of resource pickups)
        const prevSec = Math.floor(this.timeSurvived - dt);
        const curSec = Math.floor(this.timeSurvived);
        if (curSec > prevSec) {
            this.score += curSec - prevSec;
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.life -= dt;
            if (pt.life <= 0) this.particles.splice(i, 1);
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

        ctx.save();
        ctx.translate(-this.camX, -this.camY);

        // Grid
        ctx.strokeStyle = t.grid;
        ctx.lineWidth = 1;
        const gridStep = 40;
        const startGX = Math.floor(this.camX / gridStep) * gridStep;
        const startGY = Math.floor(this.camY / gridStep) * gridStep;
        for (let gx = startGX; gx < this.camX + W + gridStep; gx += gridStep) {
            ctx.beginPath();
            ctx.moveTo(gx, this.camY);
            ctx.lineTo(gx, this.camY + H);
            ctx.stroke();
        }
        for (let gy = startGY; gy < this.camY + H + gridStep; gy += gridStep) {
            ctx.beginPath();
            ctx.moveTo(this.camX, gy);
            ctx.lineTo(this.camX + W, gy);
            ctx.stroke();
        }

        // Map border
        ctx.strokeStyle = t.primary + '40';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.mapW, this.mapH);

        // Resources
        for (const r of this.resources) {
            const bob = Math.sin(r.bobPhase + this.timeSurvived * 3) * 3;

            // Glow
            ctx.fillStyle = (r.type === 'health' ? t.resource : '#66ccff') + '30';
            ctx.beginPath();
            ctx.arc(r.x, r.y + bob, r.radius * 2, 0, Math.PI * 2);
            ctx.fill();

            if (r.type === 'health') {
                // Green diamond
                ctx.fillStyle = t.resource;
                ctx.save();
                ctx.translate(r.x, r.y + bob);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-r.radius * 0.6, -r.radius * 0.6, r.radius * 1.2, r.radius * 1.2);
                ctx.restore();
            } else {
                // Shield — blue circle with S
                ctx.fillStyle = '#66ccff';
                ctx.beginPath();
                ctx.arc(r.x, r.y + bob, r.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#003366';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('S', r.x, r.y + bob);
            }
        }

        // Enemies
        for (const e of this.enemies) {
            // Glow
            ctx.fillStyle = e.color + '30';
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius * 1.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#000000aa';
            const eyeOff = e.radius * 0.3;
            const eyeR = e.radius * 0.2;
            ctx.beginPath();
            ctx.arc(e.x - eyeOff, e.y - eyeOff, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(e.x + eyeOff, e.y - eyeOff, eyeR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Player
        // Shield aura
        if (p.shieldTimer > 0) {
            const alpha = Math.min(1, p.shieldTimer) * 0.4;
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Damage flash
        if (this.damageCooldown > 0.3) {
            ctx.fillStyle = '#ff6666';
        } else {
            ctx.fillStyle = t.primary;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Player inner
        ctx.fillStyle = t.secondary + '80';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Eyes on player
        ctx.fillStyle = t.bg;
        ctx.beginPath();
        ctx.arc(p.x - 4, p.y - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + 4, p.y - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();

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

        ctx.restore();

        // ── HUD ──

        // Health bar background
        const hbX = 12, hbY = 12, hbW = 150, hbH = 16;
        ctx.fillStyle = '#333333';
        ctx.fillRect(hbX, hbY, hbW, hbH);

        // Health bar fill
        const hpFrac = p.hp / p.maxHp;
        const hpColor = hpFrac > 0.5 ? '#44cc44' : hpFrac > 0.25 ? '#cccc44' : '#cc4444';
        ctx.fillStyle = hpColor;
        ctx.fillRect(hbX, hbY, hbW * hpFrac, hbH);

        // Health bar border
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(hbX, hbY, hbW, hbH);

        // HP text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`HP: ${Math.ceil(p.hp)}`, hbX + hbW / 2, hbY + hbH / 2);

        // Shield indicator
        if (p.shieldTimer > 0) {
            ctx.fillStyle = '#66ccff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`SHIELD ${Math.ceil(p.shieldTimer)}s`, hbX, hbY + hbH + 6);
        }

        // Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, W - 12, 12);

        // Time survived
        ctx.fillStyle = t.secondary + 'cc';
        ctx.font = '14px monospace';
        ctx.fillText(`Time: ${Math.floor(this.timeSurvived)}s`, W - 12, 36);

        // Enemy count
        ctx.fillStyle = t.enemy || '#ff4444';
        ctx.font = '12px monospace';
        ctx.fillText(`Enemies: ${this.enemies.length}`, W - 12, 56);

        // Instructions at start
        if (this.timeSurvived < 3) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('WASD to move — Collect resources — Avoid enemies!', W / 2, H - 16);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 40);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 5);

            ctx.font = '18px monospace';
            ctx.fillText(`Survived: ${Math.floor(this.timeSurvived)}s`, W / 2, H / 2 + 38);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 75);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const mapSizes = ['small', 'medium', 'large'];
    const densities = ['sparse', 'normal', 'abundant'];
    const enemyTypeCounts = [1, 2, 3];
    const spawnRates = ['slow', 'medium', 'fast'];
    let seed = 1;

    for (const mapSize of mapSizes) {
        for (const resourceDensity of densities) {
            for (const enemyTypes of enemyTypeCounts) {
                for (const theme of themes) {
                    // Alternate spawn rates across seeds
                    const spawnRate = spawnRates[seed % spawnRates.length];
                    variations.push({
                        name: generateGameName('Survival', seed),
                        category: 'Survival',
                        config: {
                            mapSize,
                            resourceDensity,
                            enemyTypes,
                            spawnRate,
                            theme,
                            seed,
                        },
                        thumbnail: generateThumbnail('Survival', { theme }, seed),
                    });
                    seed++;
                }
            }
        }
    }
    // 3 * 3 * 3 * 8 = 216
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Survival', SurvivalGame, generateVariations);
