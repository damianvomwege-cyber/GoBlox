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
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e' },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00' },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e' },
    { name: 'Forest',    primary: '#2d6a4f', secondary: '#95d5b2', bg: '#081c15' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012' },
    { name: 'Midnight',  primary: '#7b2ff7', secondary: '#c084fc', bg: '#0f0720' },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e' },
    { name: 'Desert',    primary: '#e9c46a', secondary: '#f4a261', bg: '#1d1306' },
    { name: 'Arctic',    primary: '#a8dadc', secondary: '#f1faee', bg: '#0d1b2a' },
    { name: 'Toxic',     primary: '#aaff00', secondary: '#69ff36', bg: '#0a1500' },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510' },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b' },
];

// ── PlatformerGame ──────────────────────────────────────────────────────
class PlatformerGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.gravity = cfg.gravity;
        this.scrollSpeed = cfg.speed;
        this.platformDensity = cfg.platformDensity;
        this.gapSize = cfg.gapSize;

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Player
        this.playerW = 30;
        this.playerH = 30;
        this.playerX = W * 0.2;
        this.playerY = H - 80;
        this.playerVY = 0;
        this.isGrounded = false;

        // Level generation via seed
        this.rng = mulberry32(cfg.seed || 42);
        this.distance = 0;
        this.cameraX = 0;

        // Generate initial platforms
        this.platforms = [];
        this.generateInitialPlatforms();

        // Particles for visual juice
        this.particles = [];
    }

    generateInitialPlatforms() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const groundY = H - 40;

        // Starting ground platform
        this.platforms.push({ x: -100, y: groundY, w: W * 0.6, h: 20 });

        // Generate ahead
        let lastX = W * 0.5;
        const count = 60;
        for (let i = 0; i < count; i++) {
            const gap = this.gapSize * (40 + this.rng() * 30);
            const platW = this.platformDensity * (60 + this.rng() * 80);
            const yVariation = groundY - 20 - this.rng() * (H * 0.45);
            const y = Math.max(80, Math.min(groundY, yVariation));
            lastX += gap;
            this.platforms.push({ x: lastX, y, w: platW, h: 16 });
            lastX += platW;
        }
        this.nextPlatformX = lastX;
    }

    generateMorePlatforms() {
        const H = this.canvas.height;
        const groundY = H - 40;
        const count = 20;
        let lastX = this.nextPlatformX;
        for (let i = 0; i < count; i++) {
            const gap = this.gapSize * (40 + this.rng() * 30);
            const platW = this.platformDensity * (60 + this.rng() * 80);
            const yVariation = groundY - 20 - this.rng() * (H * 0.45);
            const y = Math.max(80, Math.min(groundY, yVariation));
            lastX += gap;
            this.platforms.push({ x: lastX, y, w: platW, h: 16 });
            lastX += platW;
        }
        this.nextPlatformX = lastX;
    }

    update(dt) {
        const H = this.canvas.height;
        const scrollPx = this.scrollSpeed * 200 * dt;

        // Scroll camera
        this.cameraX += scrollPx;
        this.distance += scrollPx;
        this.score = Math.floor(this.distance / 10);

        // Generate more platforms if needed
        if (this.nextPlatformX - this.cameraX < this.canvas.width * 3) {
            this.generateMorePlatforms();
        }

        // Prune old platforms
        this.platforms = this.platforms.filter(p => p.x + p.w > this.cameraX - 200);

        // Gravity
        this.playerVY += this.gravity * 1800 * dt;
        this.playerY += this.playerVY * dt;

        // Collision with platforms
        this.isGrounded = false;
        const px = this.playerX + this.cameraX;
        const py = this.playerY;
        const pw = this.playerW;
        const ph = this.playerH;

        for (const plat of this.platforms) {
            if (
                px + pw > plat.x &&
                px < plat.x + plat.w &&
                py + ph >= plat.y &&
                py + ph <= plat.y + 20 &&
                this.playerVY >= 0
            ) {
                this.playerY = plat.y - ph;
                this.playerVY = 0;
                this.isGrounded = true;
                break;
            }
        }

        // Jump particles
        if (this.isGrounded && this.rng() > 0.85) {
            this.particles.push({
                x: this.playerX + this.playerW / 2,
                y: this.playerY + this.playerH,
                vx: (this.rng() - 0.5) * 40,
                vy: -this.rng() * 30,
                life: 0.4,
                maxLife: 0.4
            });
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 80 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Fall off screen = game over
        if (this.playerY > H + 50) {
            this.endGame();
        }
    }

    onKeyDown(key) {
        if (this.gameOver) return;
        if ((key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') && this.isGrounded) {
            this.playerVY = -this.gravity * 600;
            this.isGrounded = false;

            // Jump particles burst
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x: this.playerX + this.playerW / 2,
                    y: this.playerY + this.playerH,
                    vx: (Math.random() - 0.5) * 80,
                    vy: -Math.random() * 60,
                    life: 0.5,
                    maxLife: 0.5
                });
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Background parallax dots
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

        // Draw platforms
        for (const plat of this.platforms) {
            // Only draw visible
            if (plat.x + plat.w < this.cameraX - 50 || plat.x > this.cameraX + W + 50) continue;

            // Platform body
            ctx.fillStyle = t.secondary;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

            // Top highlight
            ctx.fillStyle = t.primary;
            ctx.fillRect(plat.x, plat.y, plat.w, 4);

            // Edge marks
            ctx.fillStyle = t.primary + '60';
            ctx.fillRect(plat.x, plat.y, 3, plat.h);
            ctx.fillRect(plat.x + plat.w - 3, plat.y, 3, plat.h);
        }

        // Draw player (world coords: playerX is relative to camera)
        const worldPlayerX = this.playerX + this.cameraX;
        ctx.fillStyle = t.primary;
        ctx.fillRect(worldPlayerX, this.playerY, this.playerW, this.playerH);

        // Player inner highlight
        ctx.fillStyle = t.secondary;
        ctx.fillRect(worldPlayerX + 4, this.playerY + 4, this.playerW - 8, this.playerH - 8);

        // Eyes
        ctx.fillStyle = t.bg;
        ctx.fillRect(worldPlayerX + 7, this.playerY + 8, 5, 6);
        ctx.fillRect(worldPlayerX + 18, this.playerY + 8, 5, 6);

        // Pupils (shift based on velocity direction)
        const pupilShiftX = 1;
        const pupilShiftY = Math.min(2, Math.max(-2, this.playerVY * 0.005));
        ctx.fillStyle = '#fff';
        ctx.fillRect(worldPlayerX + 9 + pupilShiftX, this.playerY + 10 + pupilShiftY, 2, 3);
        ctx.fillRect(worldPlayerX + 20 + pupilShiftX, this.playerY + 10 + pupilShiftY, 2, 3);

        ctx.restore();

        // Draw particles (screen space)
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = t.primary;
            ctx.globalAlpha = alpha;
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        // Score display
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 15, 15);

        // Instructions hint at start
        if (this.distance < 200) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Press SPACE / UP / W to jump', W / 2, H - 20);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 30);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 28px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 20);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '18px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 60);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const speeds = [1, 1.5, 2];
    const gravities = [0.8, 1, 1.3];
    const densities = [1, 1.3, 1.6];
    const gapSizes = [0.8, 1, 1.3];
    let seed = 1;

    for (const speed of speeds) {
        for (const gravity of gravities) {
            for (const density of densities) {
                for (const theme of themes) {
                    const gapSize = gapSizes[seed % gapSizes.length];
                    variations.push({
                        name: generateGameName('Platformer', seed),
                        category: 'Platformer',
                        config: {
                            speed,
                            gravity,
                            platformDensity: density,
                            gapSize,
                            theme,
                            seed
                        },
                        thumbnail: generateThumbnail('Platformer', { theme }, seed)
                    });
                    seed++;
                }
            }
        }
    }
    return variations; // 3 * 3 * 3 * 12 = 324
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Platformer', PlatformerGame, generateVariations);
