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
    { name: 'Asphalt',   primary: '#e74c3c', secondary: '#ecf0f1', bg: '#2c3e50', road: '#34495e', lane: '#f1c40f', obstacle: '#e67e22' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', road: '#161650', lane: '#ff006e', obstacle: '#ffff00' },
    { name: 'Desert',    primary: '#f39c12', secondary: '#ffeaa7', bg: '#d4a76a', road: '#8b7355', lane: '#ffffff', obstacle: '#c0392b' },
    { name: 'Night',     primary: '#74b9ff', secondary: '#dfe6e9', bg: '#0c1021', road: '#1a1a3e', lane: '#ffffff', obstacle: '#ff6b6b' },
    { name: 'Retro',     primary: '#ff6b6b', secondary: '#ffeaa7', bg: '#2d3436', road: '#636e72', lane: '#ffeaa7', obstacle: '#6c5ce7' },
    { name: 'Arctic',    primary: '#00cec9', secondary: '#dfe6e9', bg: '#c7ecee', road: '#b2bec3', lane: '#2d3436', obstacle: '#d63031' },
    { name: 'Toxic',     primary: '#00b894', secondary: '#55efc4', bg: '#0a3d00', road: '#1a5a00', lane: '#fdcb6e', obstacle: '#e17055' },
    { name: 'Sunset',    primary: '#e84393', secondary: '#fd79a8', bg: '#2d1b4e', road: '#4a2670', lane: '#ffeaa7', obstacle: '#fdcb6e' },
];

// ── RacingGame ──────────────────────────────────────────────────────────
class RacingGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);
        this.laneCount = cfg.laneCount;
        this.obstacleFrequency = cfg.obstacleFrequency;
        this.baseSpeed = cfg.speed;

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Road geometry
        this.roadWidth = W * 0.7;
        this.roadLeft = (W - this.roadWidth) / 2;
        this.laneWidth = this.roadWidth / this.laneCount;

        // Player car
        this.carWidth = this.laneWidth * 0.55;
        this.carHeight = this.carWidth * 1.8;
        this.playerLane = Math.floor(this.laneCount / 2);
        this.playerX = this.getLaneCenter(this.playerLane);
        this.targetX = this.playerX;
        this.playerY = H - this.carHeight - 30;

        // Scrolling
        this.scrollSpeed = 150 + this.baseSpeed * 40; // pixels/sec
        this.scrollOffset = 0;
        this.distance = 0;

        // Lane markings (repeating pattern)
        this.dashLength = 30;
        this.dashGap = 20;

        // Obstacles
        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.0 / this.obstacleFrequency;

        // Speed ramp
        this.speedMultiplier = 1;

        // Particles (collision)
        this.particles = [];
    }

    getLaneCenter(lane) {
        return this.roadLeft + lane * this.laneWidth + this.laneWidth / 2;
    }

    spawnObstacle() {
        const lane = Math.floor(this.rng() * this.laneCount);
        const type = this.rng() > 0.35 ? 'car' : 'barrier';
        const w = type === 'car' ? this.carWidth : this.laneWidth * 0.7;
        const h = type === 'car' ? this.carHeight : this.carWidth * 0.5;
        const speedFactor = type === 'car' ? 0.3 + this.rng() * 0.5 : 0;

        this.obstacles.push({
            x: this.getLaneCenter(lane),
            y: -h,
            w,
            h,
            type,
            speedFactor, // cars move slower than road scroll
            color: type === 'car' ? this.randomColor() : this.theme.obstacle,
        });
    }

    randomColor() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];
        return colors[Math.floor(this.rng() * colors.length)];
    }

    update(dt) {
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Increase speed over time
        this.speedMultiplier = 1 + this.distance / 5000;
        const currentSpeed = this.scrollSpeed * this.speedMultiplier;

        // Scroll
        this.scrollOffset += currentSpeed * dt;
        this.distance += currentSpeed * dt;
        this.score = Math.floor(this.distance / 10);

        // Move player toward target lane smoothly
        const moveSpeed = 600;
        const diff = this.targetX - this.playerX;
        if (Math.abs(diff) > 1) {
            this.playerX += Math.sign(diff) * Math.min(moveSpeed * dt, Math.abs(diff));
        } else {
            this.playerX = this.targetX;
        }

        // Clamp player inside road
        const halfCar = this.carWidth / 2;
        this.playerX = Math.max(this.roadLeft + halfCar + 4, Math.min(this.roadLeft + this.roadWidth - halfCar - 4, this.playerX));

        // Spawn obstacles
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval / this.speedMultiplier) {
            this.spawnTimer = 0;
            this.spawnObstacle();
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            o.y += (currentSpeed * (1 - o.speedFactor)) * dt;

            // Remove off-screen
            if (o.y > H + 50) {
                this.obstacles.splice(i, 1);
                continue;
            }

            // Collision check with player (AABB)
            const px = this.playerX - this.carWidth / 2;
            const py = this.playerY;
            const ox = o.x - o.w / 2;
            const oy = o.y - o.h / 2;

            if (px < ox + o.w && px + this.carWidth > ox &&
                py < oy + o.h && py + this.carHeight > oy) {
                // Spawn crash particles
                for (let j = 0; j < 12; j++) {
                    this.particles.push({
                        x: this.playerX,
                        y: this.playerY + this.carHeight / 2,
                        vx: (Math.random() - 0.5) * 300,
                        vy: (Math.random() - 0.5) * 300,
                        life: 0.6,
                        maxLife: 0.6,
                        color: this.theme.primary,
                    });
                }
                this.endGame();
                return;
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onKeyDown(key) {
        if (this.gameOver) return;
        switch (key) {
            case 'ArrowLeft': case 'a': case 'A':
                this.playerLane = Math.max(0, this.playerLane - 1);
                this.targetX = this.getLaneCenter(this.playerLane);
                break;
            case 'ArrowRight': case 'd': case 'D':
                this.playerLane = Math.min(this.laneCount - 1, this.playerLane + 1);
                this.targetX = this.getLaneCenter(this.playerLane);
                break;
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Background (off-road)
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Road surface
        ctx.fillStyle = t.road;
        ctx.fillRect(this.roadLeft, 0, this.roadWidth, H);

        // Road edges
        ctx.fillStyle = t.secondary;
        ctx.fillRect(this.roadLeft - 4, 0, 4, H);
        ctx.fillRect(this.roadLeft + this.roadWidth, 0, 4, H);

        // Lane markings (scrolling dashes)
        ctx.strokeStyle = t.lane;
        ctx.lineWidth = 2;
        ctx.setLineDash([this.dashLength, this.dashGap]);
        const dashOffset = -(this.scrollOffset % (this.dashLength + this.dashGap));
        ctx.lineDashOffset = dashOffset;

        for (let i = 1; i < this.laneCount; i++) {
            const x = this.roadLeft + i * this.laneWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Obstacles
        for (const o of this.obstacles) {
            const ox = o.x - o.w / 2;
            const oy = o.y - o.h / 2;

            if (o.type === 'car') {
                // Car body
                ctx.fillStyle = o.color;
                ctx.beginPath();
                ctx.roundRect(ox, oy, o.w, o.h, 6);
                ctx.fill();

                // Windshield
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                const wsY = oy + o.h * 0.15;
                const wsH = o.h * 0.2;
                ctx.fillRect(ox + o.w * 0.15, wsY, o.w * 0.7, wsH);

                // Rear window
                const rwY = oy + o.h * 0.7;
                ctx.fillRect(ox + o.w * 0.2, rwY, o.w * 0.6, wsH * 0.8);
            } else {
                // Barrier — striped
                ctx.fillStyle = o.color;
                ctx.fillRect(ox, oy, o.w, o.h);
                // Stripes
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                const stripeW = o.w / 6;
                for (let s = 0; s < 6; s += 2) {
                    ctx.fillRect(ox + s * stripeW, oy, stripeW, o.h);
                }
            }
        }

        // Player car
        const px = this.playerX - this.carWidth / 2;
        const py = this.playerY;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.playerX, py + this.carHeight + 4, this.carWidth / 2 + 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car body
        ctx.fillStyle = t.primary;
        ctx.beginPath();
        ctx.roundRect(px, py, this.carWidth, this.carHeight, 8);
        ctx.fill();

        // Windshield
        ctx.fillStyle = t.secondary + 'aa';
        const wsW = this.carWidth * 0.7;
        const wsH = this.carHeight * 0.18;
        ctx.fillRect(px + (this.carWidth - wsW) / 2, py + this.carHeight * 0.18, wsW, wsH);

        // Rear
        ctx.fillRect(px + (this.carWidth - wsW * 0.85) / 2, py + this.carHeight * 0.7, wsW * 0.85, wsH * 0.75);

        // Headlights
        ctx.fillStyle = '#ffffcc';
        const hlSize = this.carWidth * 0.12;
        ctx.beginPath();
        ctx.arc(px + this.carWidth * 0.22, py + 4, hlSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + this.carWidth * 0.78, py + 4, hlSize, 0, Math.PI * 2);
        ctx.fill();

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD - Score / Distance
        ctx.fillStyle = t.secondary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        ctx.fillStyle = t.secondary + '99';
        ctx.font = '14px monospace';
        ctx.fillText(`${Math.floor(this.distance)}m`, 12, 38);

        // Speed indicator
        ctx.fillStyle = t.lane;
        ctx.font = '14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`x${this.speedMultiplier.toFixed(1)}`, W - 12, 12);

        // Instructions at start
        if (this.distance < 50) {
            ctx.fillStyle = t.secondary + 'bb';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Left/Right or A/D to steer', W / 2, H - 12);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('CRASH!', W / 2, H / 2 - 30);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 15);

            ctx.font = '16px monospace';
            ctx.fillText(`Distance: ${Math.floor(this.distance)}m`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const speeds = [2, 3, 4];           // base speed multiplier
    const laneCounts = [2, 3, 4];
    const frequencies = [2, 3, 4];      // obstacle frequency
    let seed = 1;

    for (const speed of speeds) {
        for (const laneCount of laneCounts) {
            for (const freq of frequencies) {
                for (const theme of themes) {
                    variations.push({
                        name: generateGameName('Racing', seed),
                        category: 'Racing',
                        config: {
                            speed,
                            laneCount,
                            obstacleFrequency: freq,
                            theme,
                            seed,
                        },
                        thumbnail: generateThumbnail('Racing', { theme }, seed),
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
GameRegistry.registerTemplate('Racing', RacingGame, generateVariations);
