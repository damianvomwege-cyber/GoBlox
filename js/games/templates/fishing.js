import { BaseGame } from '../base-game.js';
import { BaseGame3D, mulberry32 as mulberry32_3d, buildCharacterModel } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import { drawCharacter } from '../character.js';
import * as THREE from 'three';

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

// ══════════════════════════════════════════════════════════════════════════
// 3D FishingGame — Lakeside fishing at a dock
// ══════════════════════════════════════════════════════════════════════════
class FishingGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32_3d(cfg.seed || 1);

        // Timing difficulty
        const diffMap = { easy: 1.2, medium: 0.8, hard: 0.5 };
        this.timingWindow = diffMap[cfg.difficulty] || 0.8;

        // Fish species
        this.fishPool = FISH_DEFS[cfg.depth] || FISH_DEFS.medium;
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
        this.castPower = 0;
        this.castCharging = false;
        this.castDirection = 1;
        this.hookedFish = null;
        this.bobberBob = 0;
        this.waveTime = 0;
        this.caughtList = [];
        this.hookTarget = new THREE.Vector3(0, 0, 0);

        // Disable default walking
        this.gravity = 0;
        this.moveSpeed = 0;

        // Build scene
        this.buildLakeScene();
        this.buildDock();
        this.buildEnvironment();

        // Position player on dock
        this.playerPosition.set(0, 0.5, 4);
        this.playerModel.position.copy(this.playerPosition);
        this.playerModel.rotation.y = Math.PI; // Face the water

        // Fishing line mesh
        this.buildFishingLine();

        // Bobber
        this.buildBobber();

        // Swimming fish
        this.swimFish3D = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.5;
        for (let i = 0; i < 5; i++) {
            this.spawnSwimFish3D();
        }

        // HUD
        this.createHUD();
        this.createFishingHUD();

        // Camera: looking at water from behind player
        this.cameraAngleX = Math.PI;
        this.cameraAngleY = 0.4;
        this.cameraDistance = 8;

        // Lock mouse message hidden - click is used for fishing
        if (this.lockMsg) {
            this.lockMsg.textContent = 'Klicken zum Angeln';
        }
    }

    buildLakeScene() {
        // Sky
        this.createSky(0x87ceeb, 0xe0f7fa, 0xccddee, 40, 200);

        // Ground (shore)
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Water surface
        const waterGeo = new THREE.PlaneGeometry(80, 60);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x1a6ea0,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.7,
        });
        this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
        this.waterMesh.rotation.x = -Math.PI / 2;
        this.waterMesh.position.set(0, -0.3, -25);
        this.waterMesh.receiveShadow = true;
        this.scene.add(this.waterMesh);

        // Underwater volume (darker plane below water)
        const deepGeo = new THREE.PlaneGeometry(80, 60);
        const deepMat = new THREE.MeshStandardMaterial({
            color: 0x05304a,
            roughness: 0.9,
        });
        const deepPlane = new THREE.Mesh(deepGeo, deepMat);
        deepPlane.rotation.x = -Math.PI / 2;
        deepPlane.position.set(0, -8, -25);
        this.scene.add(deepPlane);

        // Shore edge (sandy strip)
        const shoreGeo = new THREE.PlaneGeometry(80, 4);
        const shoreMat = new THREE.MeshStandardMaterial({ color: 0xc2a060, roughness: 0.95 });
        const shore = new THREE.Mesh(shoreGeo, shoreMat);
        shore.rotation.x = -Math.PI / 2;
        shore.position.set(0, 0.01, 2);
        shore.receiveShadow = true;
        this.scene.add(shore);
    }

    buildDock() {
        // Dock planks
        const plankMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85, metalness: 0.0 });
        const dockWidth = 3;
        const dockLength = 6;

        // Deck
        const deckGeo = new THREE.BoxGeometry(dockWidth, 0.15, dockLength);
        const deck = new THREE.Mesh(deckGeo, plankMat);
        deck.position.set(0, 0.4, 1);
        deck.castShadow = true;
        deck.receiveShadow = true;
        this.scene.add(deck);

        // Plank lines
        const lineGeo = new THREE.BoxGeometry(dockWidth - 0.1, 0.16, 0.03);
        const lineMat = new THREE.MeshStandardMaterial({ color: 0x6B4914, roughness: 0.9 });
        for (let i = 0; i < 5; i++) {
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(0, 0.48, -1.5 + i * 1.2);
            this.scene.add(line);
        }

        // Support posts
        const postGeo = new THREE.CylinderGeometry(0.12, 0.15, 2, 6);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x5a3a10, roughness: 0.9 });
        const posts = [[-1.2, -1], [1.2, -1], [-1.2, 3], [1.2, 3]];
        for (const [px, pz] of posts) {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(px, -0.5, pz);
            post.castShadow = true;
            this.scene.add(post);
        }

        // Railing post at end of dock
        const railGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6);
        const rail = new THREE.Mesh(railGeo, postMat);
        rail.position.set(1.3, 1.1, -1.8);
        rail.castShadow = true;
        this.scene.add(rail);
    }

    buildEnvironment() {
        // Trees around lake
        const treeGeo = new THREE.ConeGeometry(1.5, 4, 6);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8 });
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9 });

        const treePositions = [];
        for (let i = 0; i < 20; i++) {
            const angle = this.rng() * Math.PI * 2;
            const dist = 15 + this.rng() * 20;
            const tx = Math.cos(angle) * dist;
            const tz = Math.sin(angle) * dist;
            // Only place trees on land (positive z or far from water center)
            if (tz > -3 || Math.abs(tx) > 20) {
                treePositions.push([tx, tz]);
            }
        }

        for (const [tx, tz] of treePositions) {
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 1;
            tree.add(trunk);
            const foliage = new THREE.Mesh(treeGeo, treeMat);
            foliage.position.y = 3.5;
            foliage.castShadow = true;
            tree.add(foliage);
            tree.position.set(tx, 0, tz);
            tree.scale.setScalar(0.8 + this.rng() * 0.6);
            this.scene.add(tree);
        }

        // Rocks along shore
        const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.95 });
        for (let i = 0; i < 8; i++) {
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.set(
                (this.rng() - 0.5) * 30,
                this.rng() * 0.2,
                1 + this.rng() * 3
            );
            rock.scale.setScalar(0.5 + this.rng() * 1.0);
            rock.rotation.set(this.rng(), this.rng(), this.rng());
            rock.castShadow = true;
            this.scene.add(rock);
        }
    }

    buildFishingLine() {
        // Fishing rod (static, attached to player)
        const rodGeo = new THREE.CylinderGeometry(0.03, 0.06, 3.5, 6);
        const rodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
        this.rodMesh = new THREE.Mesh(rodGeo, rodMat);
        this.rodMesh.position.set(0.4, 2.0, -0.5);
        this.rodMesh.rotation.x = -0.6;
        this.rodMesh.rotation.z = 0.15;
        this.playerModel.add(this.rodMesh);

        // Rod tip position (world space, updated each frame)
        this.rodTipWorld = new THREE.Vector3();

        // Fishing line (updated dynamically)
        const lineGeo = new THREE.BufferGeometry();
        const linePositions = new Float32Array(6); // 2 points
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        const lineMat = new THREE.LineBasicMaterial({ color: 0xdddddd, linewidth: 1 });
        this.fishingLine = new THREE.Line(lineGeo, lineMat);
        this.fishingLine.visible = false;
        this.scene.add(this.fishingLine);
    }

    buildBobber() {
        const bobberGroup = new THREE.Group();
        // Red float
        const floatGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const floatMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.3 });
        const float = new THREE.Mesh(floatGeo, floatMat);
        bobberGroup.add(float);
        // White top
        const topGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 0.12;
        bobberGroup.add(top);

        this.bobberMesh = bobberGroup;
        this.bobberMesh.visible = false;
        this.scene.add(this.bobberMesh);
    }

    spawnSwimFish3D() {
        const def = this.fishPool[Math.floor(this.rng() * this.fishPool.length)];
        const goingRight = this.rng() > 0.5;
        const depthY = -1 - def.depthMin * 7 - this.rng() * (def.depthMax - def.depthMin) * 7;
        const startX = goingRight ? -35 : 35;
        const z = -10 - this.rng() * 30;

        const size = def.size * (0.8 + this.rng() * 0.4);

        // Fish body
        const fishGroup = new THREE.Group();
        const bodyGeo = new THREE.SphereGeometry(0.4 * size, 8, 6);
        bodyGeo.scale(1, 0.5, 1.8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(def.color),
            roughness: 0.4,
            metalness: 0.1,
            transparent: true,
            opacity: 0.8,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        fishGroup.add(body);

        // Tail
        const tailGeo = new THREE.ConeGeometry(0.2 * size, 0.4 * size, 4);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.position.set(0, 0, 0.6 * size);
        tail.rotation.x = Math.PI / 2;
        fishGroup.add(tail);

        // Eye
        const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0.12 * size, 0.08 * size, -0.3 * size);
        fishGroup.add(eye);

        fishGroup.position.set(startX, depthY, z);
        if (!goingRight) fishGroup.rotation.y = Math.PI;
        this.scene.add(fishGroup);

        this.swimFish3D.push({
            mesh: fishGroup,
            def,
            vx: (goingRight ? 1 : -1) * def.speed * 0.1 * (0.7 + this.rng() * 0.6),
            wiggle: this.rng() * Math.PI * 2,
            wiggleSpeed: 3 + this.rng() * 4,
        });
    }

    updatePlayer(dt) {
        // Override: no walking, player stands on dock
        if (this.gameOver) return;
        this.playerModel.position.copy(this.playerPosition);
        this.animateCharacter(dt);

        // Update rod tip world position
        const tipLocal = new THREE.Vector3(0, 1.7, 0);
        this.rodMesh.localToWorld(tipLocal);
        this.rodTipWorld.copy(tipLocal);
    }

    updateCamera(dt) {
        // Fixed camera behind player looking at water
        const targetPos = new THREE.Vector3(0, 5, 10);
        const t = 1 - Math.exp(-4 * dt);
        this.camera.position.lerp(targetPos, t);
        this.camera.lookAt(0, 0, -8);

        if (this.sunLight) {
            this.sunLight.position.set(30, 50, 30);
            this.sunLight.target.position.set(0, 0, -10);
        }
    }

    onClick(e) {
        if (this.gameOver) return;

        // Let pointer lock happen first time
        if (!this.pointerLocked && !this.gameOver) {
            // Don't request pointer lock for fishing - use clicks directly
        }

        switch (this.state) {
            case 'idle':
                if (!this.castCharging) {
                    this.castCharging = true;
                    this.castPower = 0.2;
                    this.castDirection = 1;
                } else {
                    this.castCharging = false;
                    this.state = 'casting';
                    this.stateTimer = 1.0;
                    // Hook target in water
                    this.hookTarget.set(
                        (this.rng() - 0.5) * 6,
                        -0.3,
                        -5 - this.castPower * 20
                    );
                    this.hookPos = this.rodTipWorld.clone();
                }
                break;

            case 'bite':
                this.state = 'reeling';
                this.stateTimer = 2.0;
                break;

            case 'waiting':
                this.state = 'missed';
                this.stateTimer = 0.8;
                break;
        }
    }

    resetLine() {
        this.state = 'idle';
        this.stateTimer = 0;
        this.hookedFish = null;
        this.castPower = 0;
        this.castCharging = false;
        this.castDirection = 1;
        this.fishingLine.visible = false;
        this.bobberMesh.visible = false;
    }

    update(dt) {
        if (this.gameOver) return;

        // Timer
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.endGame();
            return;
        }

        this.waveTime += dt;

        // Animate water
        if (this.waterMesh) {
            this.waterMesh.position.y = -0.3 + Math.sin(this.waveTime * 0.8) * 0.05;
        }

        // Cast power charging
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
                if (this.hookPos) {
                    this.hookPos.lerp(this.hookTarget, dt * 3);
                    this.hookPos.y = Math.max(this.hookTarget.y - this.castPower * 6, this.hookPos.y - dt * 8);
                }
                if (this.stateTimer <= 0) {
                    this.state = 'waiting';
                    this.stateTimer = 2 + this.rng() * 4;
                    this.hookPos = this.hookTarget.clone();
                    this.hookPos.y = -0.3 - this.castPower * 5;
                }
                this.fishingLine.visible = true;
                this.bobberMesh.visible = true;
                break;

            case 'waiting':
                this.bobberBob += dt * 3;
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    const hookDepth = Math.abs(this.hookPos.y + 0.3) / 7;
                    const candidates = this.fishPool.filter(f =>
                        hookDepth >= f.depthMin && hookDepth <= f.depthMax
                    );
                    if (candidates.length > 0) {
                        this.hookedFish = candidates[Math.floor(this.rng() * candidates.length)];
                        this.state = 'bite';
                        this.stateTimer = this.timingWindow;
                    } else {
                        this.stateTimer = 1 + this.rng() * 3;
                    }
                }
                this.fishingLine.visible = true;
                this.bobberMesh.visible = true;
                break;

            case 'bite':
                this.stateTimer -= dt;
                this.bobberBob += dt * 12;
                if (this.stateTimer <= 0) {
                    this.state = 'missed';
                    this.stateTimer = 1.0;
                    this.hookedFish = null;
                }
                this.fishingLine.visible = true;
                this.bobberMesh.visible = true;
                break;

            case 'reeling':
                this.stateTimer -= dt;
                if (this.hookPos) {
                    this.hookPos.y += dt * 5;
                    this.hookPos.lerp(this.rodTipWorld, dt * 2);
                }
                if ((this.hookPos && this.hookPos.y > 0.5) || this.stateTimer <= 0) {
                    this.state = 'caught';
                    this.stateTimer = 1.5;
                    if (this.hookedFish) {
                        this.score += this.hookedFish.points;
                        this.caughtList.push(this.hookedFish);
                    }
                }
                this.fishingLine.visible = true;
                this.bobberMesh.visible = false;
                break;

            case 'caught':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this.resetLine();
                break;

            case 'missed':
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this.resetLine();
                break;
        }

        // Update fishing line geometry
        if (this.fishingLine.visible && this.hookPos) {
            const positions = this.fishingLine.geometry.attributes.position;
            positions.setXYZ(0, this.rodTipWorld.x, this.rodTipWorld.y, this.rodTipWorld.z);
            positions.setXYZ(1, this.hookPos.x, this.hookPos.y, this.hookPos.z);
            positions.needsUpdate = true;
        }

        // Update bobber
        if (this.bobberMesh.visible && this.hookPos) {
            const bobY = this.state === 'bite'
                ? -0.3 + Math.sin(this.bobberBob) * 0.15
                : -0.3 + Math.sin(this.bobberBob) * 0.04;
            this.bobberMesh.position.set(this.hookPos.x, bobY, this.hookPos.z);
        }

        // Spawn swimming fish
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            if (this.swimFish3D.length < 10) {
                this.spawnSwimFish3D();
            }
        }

        // Update swimming fish
        for (let i = this.swimFish3D.length - 1; i >= 0; i--) {
            const f = this.swimFish3D[i];
            f.mesh.position.x += f.vx * dt;
            f.wiggle += f.wiggleSpeed * dt;
            f.mesh.position.y += Math.sin(f.wiggle) * 0.01;

            if (f.mesh.position.x < -40 || f.mesh.position.x > 40) {
                this.scene.remove(f.mesh);
                this.swimFish3D.splice(i, 1);
            }
        }

        // Update HUD
        this.updateHUDScore(this.score);
        const timeColor = this.timeLeft > 15 ? '' : 'color:#ff4444;';
        let info = `Fish: ${this.caughtList.length}`;
        if (this.state === 'bite') info = 'BITE! CLICK!';
        else if (this.state === 'caught' && this.hookedFish) info = `${this.hookedFish.name}! +${this.hookedFish.points}`;
        else if (this.state === 'missed') info = 'Got away!';
        else if (this.castCharging) info = `Power: ${Math.floor(this.castPower * 100)}%`;

        if (this.hudInfoEl) {
            this.hudInfoEl.innerHTML = `<span style="${timeColor}font-weight:bold;">${Math.ceil(this.timeLeft)}s</span> | ${info}`;
        }
    }

    createFishingHUD() {
        if (!this.hudEl) return;
        // Cast power bar
        this.powerBarEl = document.createElement('div');
        this.powerBarEl.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);width:120px;height:12px;background:rgba(0,0,0,0.5);border-radius:6px;overflow:hidden;display:none;';
        this.powerBarFill = document.createElement('div');
        this.powerBarFill.style.cssText = 'height:100%;background:#44ff44;border-radius:6px;transition:width 0.05s;';
        this.powerBarEl.appendChild(this.powerBarFill);
        this.hudEl.appendChild(this.powerBarEl);
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
                const is3D = seed % 2 === 0;
                const name = generateGameName('Fishing', seed);

                variations.push({
                    name: name + (is3D ? ' 3D' : ''),
                    category: 'Fishing',
                    is3D,
                    config: { depth, difficulty, fishTypes, timeLimit, theme, seed, name: name + (is3D ? ' 3D' : '') },
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
        const is3D = seed % 2 === 0;
        const name = generateGameName('Fishing', seed);

        variations.push({
            name: name + (is3D ? ' 3D' : ''),
            category: 'Fishing',
            is3D,
            config: { depth, difficulty, fishTypes, timeLimit, theme, seed, name: name + (is3D ? ' 3D' : '') },
            thumbnail: generateThumbnail('Fishing', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate3D('Fishing', FishingGame, FishingGame3D, generateVariations);
