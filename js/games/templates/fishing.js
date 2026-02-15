import { BaseGame } from '../base-game.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import { drawCharacter } from '../character.js';

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
    { name: 'Lake',      primary: '#0984e3', secondary: '#74b9ff', bg: '#03045e', water: '#0077b6', sky: '#023e8a', line: '#dfe6e9', fish: '#ffd700' },
    { name: 'Ocean',     primary: '#00b4d8', secondary: '#90e0ef', bg: '#001845', water: '#0096c7', sky: '#001d3d', line: '#b2bec3', fish: '#ff6b6b' },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', water: '#2a4858', sky: '#4a1942', line: '#ffeaa7', fish: '#ff9ff3' },
    { name: 'Tropical',  primary: '#00cec9', secondary: '#55efc4', bg: '#004040', water: '#006060', sky: '#002020', line: '#dfe6e9', fish: '#fdcb6e' },
    { name: 'Arctic',    primary: '#a5b1c2', secondary: '#d1d8e0', bg: '#0a1628', water: '#1e3a5f', sky: '#0c2340', line: '#ffffff', fish: '#74b9ff' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', water: '#161650', sky: '#0d0d35', line: '#ff006e', fish: '#fee440' },
    { name: 'Swamp',     primary: '#6ab04c', secondary: '#badc58', bg: '#1a2a10', water: '#2d4a1a', sky: '#1a3010', line: '#dfe6e9', fish: '#e17055' },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', water: '#8B0000', sky: '#2a0a00', line: '#ffd700', fish: '#ff4500' },
];

// ── Fish definitions ────────────────────────────────────────────────────
const FISH_DEFS = {
    shallow: [
        { name: 'Minnow',    points: 10,  size: 0.6, speed: 80,  color: '#c0c0c0', depthMin: 0.05, depthMax: 0.3 },
        { name: 'Perch',     points: 10,  size: 0.7, speed: 60,  color: '#a8d8a8', depthMin: 0.05, depthMax: 0.35 },
        { name: 'Bluegill',  points: 25,  size: 0.8, speed: 55,  color: '#4488cc', depthMin: 0.1,  depthMax: 0.4 },
    ],
    medium: [
        { name: 'Bass',      points: 25,  size: 0.9, speed: 65,  color: '#338833', depthMin: 0.15, depthMax: 0.55 },
        { name: 'Trout',     points: 25,  size: 0.85, speed: 70, color: '#cc7744', depthMin: 0.1,  depthMax: 0.5 },
        { name: 'Catfish',   points: 50,  size: 1.1, speed: 40,  color: '#665544', depthMin: 0.3,  depthMax: 0.7 },
        { name: 'Pike',      points: 50,  size: 1.2, speed: 75,  color: '#556b2f', depthMin: 0.2,  depthMax: 0.65 },
    ],
    deep: [
        { name: 'Salmon',    points: 50,  size: 1.0, speed: 80,  color: '#ff8866', depthMin: 0.2,  depthMax: 0.7 },
        { name: 'Swordfish', points: 100, size: 1.4, speed: 90,  color: '#6688bb', depthMin: 0.4,  depthMax: 0.85 },
        { name: 'Tuna',      points: 50,  size: 1.3, speed: 85,  color: '#334466', depthMin: 0.35, depthMax: 0.8 },
        { name: 'Anglerfish', points: 100, size: 1.0, speed: 30, color: '#443322', depthMin: 0.7,  depthMax: 0.95 },
        { name: 'Shark',     points: 100, size: 1.6, speed: 95,  color: '#778899', depthMin: 0.5,  depthMax: 0.9 },
    ],
};

// ── FishingGame ─────────────────────────────────────────────────────────
class FishingGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Water surface at ~40% from top
        this.waterY = H * 0.38;
        this.waterBottom = H;

        // Timing difficulty
        const diffMap = { easy: 1.2, medium: 0.8, hard: 0.5 };
        this.timingWindow = diffMap[cfg.difficulty] || 0.8;

        // Fish species for this depth config
        this.fishPool = FISH_DEFS[cfg.depth] || FISH_DEFS.medium;
        // Limit species count
        const speciesCount = cfg.fishTypes || 4;
        if (this.fishPool.length > speciesCount) {
            this.fishPool = this.fishPool.slice(0, speciesCount);
        }

        // Timer
        this.timeLimit = cfg.timeLimit || 60;
        this.timeLeft = this.timeLimit;

        // Game state
        this.state = 'idle'; // idle, casting, waiting, bite, reeling, caught, missed
        this.stateTimer = 0;

        // Rod & line
        this.rodTipX = W * 0.35;
        this.rodTipY = this.waterY - 30;
        this.hookX = 0;
        this.hookY = 0;
        this.hookDepth = 0;     // 0-1 normalized depth in water
        this.castPower = 0;     // 0-1 how far cast
        this.castCharging = false;
        this.castDirection = 1; // power oscillates

        // Current fish on hook
        this.hookedFish = null;
        this.biteTimer = 0;
        this.biteExclamation = 0;

        // Fish swimming in the water
        this.swimFish = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.5;

        // Caught fish log
        this.caughtList = [];

        // Particles (splash, sparkle)
        this.particles = [];

        // Wave animation
        this.waveTime = 0;

        // Bobber animation
        this.bobberBob = 0;

        // Pre-spawn some fish
        for (let i = 0; i < 5; i++) {
            this.spawnSwimFish();
        }
    }

    spawnSwimFish() {
        const W = this.canvas.width;
        const def = this.fishPool[Math.floor(this.rng() * this.fishPool.length)];
        const waterH = this.waterBottom - this.waterY;
        const depthY = this.waterY + waterH * (def.depthMin + this.rng() * (def.depthMax - def.depthMin));
        const goingRight = this.rng() > 0.5;

        this.swimFish.push({
            def,
            x: goingRight ? -40 : W + 40,
            y: depthY,
            vx: (goingRight ? 1 : -1) * (def.speed * (0.7 + this.rng() * 0.6)),
            size: def.size * (0.8 + this.rng() * 0.4),
            wiggle: this.rng() * Math.PI * 2,
            wiggleSpeed: 3 + this.rng() * 4,
        });
    }

    update(dt) {
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Timer
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.endGame();
            return;
        }

        // Wave animation
        this.waveTime += dt;

        // Casting charge
        if (this.castCharging && this.state === 'idle') {
            this.castPower += this.castDirection * dt * 1.5;
            if (this.castPower >= 1) { this.castPower = 1; this.castDirection = -1; }
            if (this.castPower <= 0.2) { this.castPower = 0.2; this.castDirection = 1; }
        }

        // State machine
        switch (this.state) {
            case 'casting':
                this.stateTimer -= dt;
                // Animate hook dropping
                this.hookY += dt * 200;
                const targetY = this.waterY + (this.waterBottom - this.waterY) * (0.2 + this.castPower * 0.7);
                if (this.hookY >= targetY || this.stateTimer <= 0) {
                    this.hookY = targetY;
                    this.hookDepth = (this.hookY - this.waterY) / (this.waterBottom - this.waterY);
                    this.state = 'waiting';
                    this.stateTimer = 2 + this.rng() * 4; // wait 2-6 seconds for a bite
                }
                break;

            case 'waiting':
                this.bobberBob += dt * 3;
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    // Find a fish near the hook depth
                    const candidates = this.fishPool.filter(f =>
                        this.hookDepth >= f.depthMin && this.hookDepth <= f.depthMax
                    );
                    if (candidates.length > 0) {
                        this.hookedFish = candidates[Math.floor(this.rng() * candidates.length)];
                        this.state = 'bite';
                        this.stateTimer = this.timingWindow;
                        this.biteExclamation = 1;
                    } else {
                        // Nothing at this depth, wait again
                        this.stateTimer = 1 + this.rng() * 3;
                    }
                }
                break;

            case 'bite':
                this.stateTimer -= dt;
                this.biteExclamation = Math.max(0, this.biteExclamation);
                this.bobberBob += dt * 12; // frantic bobbing
                if (this.stateTimer <= 0) {
                    // Missed!
                    this.state = 'missed';
                    this.stateTimer = 1.0;
                    this.hookedFish = null;
                }
                break;

            case 'reeling':
                this.stateTimer -= dt;
                this.hookY -= dt * 300;
                if (this.hookY <= this.waterY - 20 || this.stateTimer <= 0) {
                    // Caught!
                    this.state = 'caught';
                    this.stateTimer = 1.5;
                    if (this.hookedFish) {
                        this.score += this.hookedFish.points;
                        this.caughtList.push(this.hookedFish);
                        // Splash particles
                        for (let i = 0; i < 10; i++) {
                            this.particles.push({
                                x: this.hookX,
                                y: this.waterY,
                                vx: (this.rng() - 0.5) * 200,
                                vy: -this.rng() * 200 - 50,
                                life: 0.6,
                                maxLife: 0.6,
                                color: this.theme.water,
                                size: 3 + this.rng() * 4,
                            });
                        }
                    }
                }
                break;

            case 'caught':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.resetLine();
                }
                break;

            case 'missed':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.resetLine();
                }
                break;
        }

        // Spawn swimming fish
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            if (this.swimFish.length < 10) {
                this.spawnSwimFish();
            }
        }

        // Update swimming fish
        for (let i = this.swimFish.length - 1; i >= 0; i--) {
            const f = this.swimFish[i];
            f.x += f.vx * dt;
            f.wiggle += f.wiggleSpeed * dt;
            f.y += Math.sin(f.wiggle) * 0.3;

            // Remove if offscreen
            if (f.x < -60 || f.x > W + 60) {
                this.swimFish.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 400 * dt; // gravity
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    resetLine() {
        this.state = 'idle';
        this.stateTimer = 0;
        this.hookedFish = null;
        this.castPower = 0;
        this.castCharging = false;
        this.castDirection = 1;
        this.hookX = 0;
        this.hookY = 0;
        this.hookDepth = 0;
    }

    onClick(x, y) {
        if (this.gameOver) return;

        switch (this.state) {
            case 'idle':
                if (!this.castCharging) {
                    // Start charging
                    this.castCharging = true;
                    this.castPower = 0.2;
                    this.castDirection = 1;
                } else {
                    // Release cast
                    this.castCharging = false;
                    this.state = 'casting';
                    this.stateTimer = 1.0;
                    this.hookX = this.rodTipX + this.castPower * (this.canvas.width * 0.45);
                    this.hookY = this.waterY;

                    // Splash
                    for (let i = 0; i < 5; i++) {
                        this.particles.push({
                            x: this.hookX,
                            y: this.waterY,
                            vx: (this.rng() - 0.5) * 100,
                            vy: -this.rng() * 100,
                            life: 0.4,
                            maxLife: 0.4,
                            color: this.theme.secondary,
                            size: 2 + this.rng() * 3,
                        });
                    }
                }
                break;

            case 'bite':
                // Reel in!
                this.state = 'reeling';
                this.stateTimer = 2.0;
                break;

            case 'waiting':
                // Premature reel — nothing caught
                this.state = 'missed';
                this.stateTimer = 0.8;
                break;
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.waterY);
        skyGrad.addColorStop(0, t.sky);
        skyGrad.addColorStop(1, t.bg);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, this.waterY);

        // Clouds
        ctx.fillStyle = '#ffffff10';
        this.drawCloud(ctx, W * 0.2 + Math.sin(this.waveTime * 0.1) * 10, this.waterY * 0.2, 40);
        this.drawCloud(ctx, W * 0.65 + Math.sin(this.waveTime * 0.08 + 1) * 15, this.waterY * 0.35, 30);

        // Water background
        const waterGrad = ctx.createLinearGradient(0, this.waterY, 0, H);
        waterGrad.addColorStop(0, t.water);
        waterGrad.addColorStop(1, t.bg);
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, this.waterY, W, H - this.waterY);

        // Underwater light rays
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 5; i++) {
            const rx = W * 0.15 + i * W * 0.18;
            ctx.fillStyle = t.secondary;
            ctx.beginPath();
            ctx.moveTo(rx - 5, this.waterY);
            ctx.lineTo(rx + 20, H);
            ctx.lineTo(rx - 20, H);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Swimming fish
        for (const f of this.swimFish) {
            this.drawFish(ctx, f);
        }

        // Water surface wave
        ctx.strokeStyle = t.secondary + '60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
            const wy = this.waterY + Math.sin(x * 0.03 + this.waveTime * 2) * 3
                                    + Math.sin(x * 0.06 + this.waveTime * 3) * 1.5;
            if (x === 0) ctx.moveTo(x, wy);
            else ctx.lineTo(x, wy);
        }
        ctx.stroke();

        // Fisherman character
        const fishermanX = this.rodTipX - 70;
        const fishermanY = this.waterY - 5;
        const fishermanSize = 45;
        drawCharacter(ctx, fishermanX, fishermanY, fishermanSize, 'right', 'rod', 0);

        // Rod
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.rodTipX - 60, this.waterY + 10);
        ctx.lineTo(this.rodTipX, this.rodTipY);
        ctx.stroke();

        // Rod tip detail
        ctx.strokeStyle = '#A0522D';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.rodTipX - 40, this.waterY - 5);
        ctx.lineTo(this.rodTipX, this.rodTipY);
        ctx.stroke();

        // Fishing line and hook
        if (this.state !== 'idle' || this.castCharging) {
            if (this.castCharging) {
                // Show cast power indicator
                const barX = this.rodTipX + 15;
                const barY = this.rodTipY - 10;
                const barW = 8;
                const barH = 50;

                ctx.fillStyle = '#ffffff30';
                ctx.fillRect(barX, barY, barW, barH);

                const powerColor = this.castPower > 0.7 ? '#ff4444' :
                                   this.castPower > 0.4 ? '#ffaa00' : '#44ff44';
                ctx.fillStyle = powerColor;
                ctx.fillRect(barX, barY + barH * (1 - this.castPower), barW, barH * this.castPower);

                ctx.strokeStyle = '#ffffff60';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barW, barH);
            } else {
                // Draw fishing line
                ctx.strokeStyle = t.line;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.rodTipX, this.rodTipY);
                // Slight curve
                const midX = (this.rodTipX + this.hookX) / 2;
                const midY = Math.min(this.rodTipY, this.hookY) - 15;
                ctx.quadraticCurveTo(midX, midY, this.hookX, this.hookY);
                ctx.stroke();

                // Bobber (at water surface)
                if (this.state === 'waiting' || this.state === 'bite') {
                    const bobY = this.waterY + Math.sin(this.bobberBob) * (this.state === 'bite' ? 6 : 2);
                    ctx.fillStyle = '#ff4444';
                    ctx.beginPath();
                    ctx.arc(this.hookX, bobY, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(this.hookX, bobY - 3, 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Hook
                ctx.strokeStyle = '#cccccc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.hookX, this.hookY, 5, 0, Math.PI, false);
                ctx.stroke();

                // Bite exclamation
                if (this.state === 'bite') {
                    const pulse = 1 + Math.sin(this.waveTime * 15) * 0.2;
                    ctx.fillStyle = '#ff0000';
                    ctx.font = `bold ${Math.floor(32 * pulse)}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('!', this.hookX, this.waterY - 15);

                    ctx.fillStyle = t.primary;
                    ctx.font = '14px monospace';
                    ctx.fillText('CLICK!', this.hookX, this.waterY - 45);
                }

                // Show hooked fish being reeled
                if (this.state === 'reeling' && this.hookedFish) {
                    const fishSize = 18 * this.hookedFish.size;
                    ctx.fillStyle = this.hookedFish.color;
                    ctx.beginPath();
                    ctx.ellipse(this.hookX, this.hookY + 8, fishSize, fishSize * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Tail
                    ctx.beginPath();
                    ctx.moveTo(this.hookX + fishSize, this.hookY + 8);
                    ctx.lineTo(this.hookX + fishSize + 8, this.hookY);
                    ctx.lineTo(this.hookX + fishSize + 8, this.hookY + 16);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        // Caught message
        if (this.state === 'caught' && this.hookedFish) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.roundRect(W / 2 - 100, this.waterY - 70, 200, 50, 8);
            ctx.fill();

            ctx.fillStyle = t.fish;
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${this.hookedFish.name}! +${this.hookedFish.points}`, W / 2, this.waterY - 45);
        }

        // Missed message
        if (this.state === 'missed') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.roundRect(W / 2 - 60, this.waterY - 60, 120, 35, 8);
            ctx.fill();

            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Got away!', W / 2, this.waterY - 42);
        }

        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Fish count
        ctx.fillStyle = t.secondary;
        ctx.font = '14px monospace';
        ctx.fillText(`Fish: ${this.caughtList.length}`, 12, 38);

        // Timer
        ctx.fillStyle = this.timeLeft > 15 ? t.secondary : '#ff4444';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.ceil(this.timeLeft)}s`, W - 12, 12);

        // Depth indicator
        ctx.fillStyle = t.secondary + '80';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Depth: ${this.config.depth}`, W - 12, 38);

        // Instructions
        if (this.state === 'idle' && !this.castCharging && this.score === 0) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Click to charge cast, click again to release', W / 2, H - 16);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("TIME'S UP!", W / 2, H / 2 - 40);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 5);

            ctx.font = '16px monospace';
            ctx.fillText(`Fish caught: ${this.caughtList.length}`, W / 2, H / 2 + 38);

            // Best catch
            if (this.caughtList.length > 0) {
                const best = this.caughtList.reduce((a, b) => a.points > b.points ? a : b);
                ctx.fillText(`Best: ${best.name} (${best.points}pts)`, W / 2, H / 2 + 60);
            }

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 92);
        }
    }

    drawCloud(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.35, 0, Math.PI * 2);
        ctx.arc(x - size * 0.35, y + size * 0.05, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFish(ctx, f) {
        const size = 15 * f.size;
        const dir = f.vx > 0 ? 1 : -1;
        const wiggleY = Math.sin(f.wiggle) * 2;

        ctx.fillStyle = f.def.color;
        ctx.globalAlpha = 0.8;

        // Body
        ctx.beginPath();
        ctx.ellipse(f.x, f.y + wiggleY, size, size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(f.x - dir * size, f.y + wiggleY);
        ctx.lineTo(f.x - dir * (size + 8), f.y + wiggleY - 6);
        ctx.lineTo(f.x - dir * (size + 8), f.y + wiggleY + 6);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(f.x + dir * size * 0.5, f.y + wiggleY - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(f.x + dir * size * 0.55, f.y + wiggleY - 2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const depths = ['shallow', 'medium', 'deep'];
    const difficulties = ['easy', 'medium', 'hard'];
    const fishTypeCounts = [3, 4, 5];
    const timeLimits = [60, 90];
    let seed = 1;

    for (const theme of themes) {
        for (const depth of depths) {
            for (const difficulty of difficulties) {
                const fishTypes = fishTypeCounts[seed % fishTypeCounts.length];
                const timeLimit = timeLimits[seed % timeLimits.length];

                variations.push({
                    name: generateGameName('Fishing', seed),
                    category: 'Fishing',
                    config: { depth, difficulty, fishTypes, timeLimit, theme, seed },
                    thumbnail: generateThumbnail('Fishing', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 3 * 3 = 72

    // Top up to ~100
    while (variations.length < 100) {
        const theme = themes[seed % themes.length];
        const depth = depths[seed % depths.length];
        const difficulty = difficulties[(seed + 1) % difficulties.length];
        const fishTypes = fishTypeCounts[(seed + 2) % fishTypeCounts.length];
        const timeLimit = timeLimits[seed % timeLimits.length];

        variations.push({
            name: generateGameName('Fishing', seed),
            category: 'Fishing',
            config: { depth, difficulty, fishTypes, timeLimit, theme, seed },
            thumbnail: generateThumbnail('Fishing', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Fishing', FishingGame, generateVariations);
