import { BaseGame } from '../base-game.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';

// ── Themes ──────────────────────────────────────────────────────────────
const themes = [
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', paddle: '#ffffff',
      brickColors: ['#ff006e', '#ff5400', '#ffbe0b', '#00ff87', '#00bbf9', '#9b5de5'] },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e', paddle: '#ffffff',
      brickColors: ['#f72585', '#b5179e', '#7209b7', '#560bad', '#480ca8', '#3a0ca3'] },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e', paddle: '#caf0f8',
      brickColors: ['#0096c7', '#0077b6', '#005f99', '#023e8a', '#90e0ef', '#48cae4'] },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', paddle: '#ffecd2',
      brickColors: ['#ff6b6b', '#ee5a24', '#f9ca24', '#ff9ff3', '#feca57', '#ff6348'] },
    { name: 'Forest',    primary: '#2d6a4f', secondary: '#95d5b2', bg: '#081c15', paddle: '#d8f3dc',
      brickColors: ['#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#2d6a4f'] },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', paddle: '#ffffff',
      brickColors: ['#00f5d4', '#00bbf9', '#9b5de5', '#f15bb5', '#fee440', '#00f5d4'] },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', paddle: '#ffecd2',
      brickColors: ['#ff0000', '#ff4500', '#ff6b35', '#ff8c00', '#ffd700', '#ffff00'] },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', paddle: '#fff0f5',
      brickColors: ['#ff69b4', '#ff1493', '#da70d6', '#ba55d3', '#ffb6c1', '#ffc0cb'] },
];

// ── Brick layout generators ─────────────────────────────────────────────
function layoutFull(rows, cols) {
    const bricks = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            bricks.push({ row: r, col: c });
        }
    }
    return bricks;
}

function layoutCheckerboard(rows, cols) {
    const bricks = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r + c) % 2 === 0) bricks.push({ row: r, col: c });
        }
    }
    return bricks;
}

function layoutPyramid(rows, cols) {
    const bricks = [];
    for (let r = 0; r < rows; r++) {
        const indent = r;
        const count = cols - 2 * indent;
        for (let c = indent; c < indent + count && c < cols; c++) {
            bricks.push({ row: r, col: c });
        }
    }
    return bricks;
}

function layoutRandom(rows, cols, rng) {
    const bricks = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (rng() > 0.25) bricks.push({ row: r, col: c });
        }
    }
    return bricks;
}

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

// ── BreakoutGame ────────────────────────────────────────────────────────
class BreakoutGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Paddle
        const paddleSizes = { small: W * 0.12, medium: W * 0.18, large: W * 0.25 };
        this.paddleW = paddleSizes[cfg.paddleSize] || paddleSizes.medium;
        this.paddleH = 14;
        this.paddleX = (W - this.paddleW) / 2;
        this.paddleY = H - 40;
        this.paddleSpeed = W * 0.9; // px/sec for keyboard control

        // Ball
        const ballSpeeds = { slow: 280, medium: 380, fast: 500 };
        this.baseBallSpeed = ballSpeeds[cfg.ballSpeed] || ballSpeeds.medium;
        this.ballRadius = 7;
        this.resetBall();

        // Lives
        this.lives = 3;

        // Bricks
        this.brickRows = cfg.brickRows;
        this.brickCols = cfg.brickCols;
        this.brickPadding = 4;
        this.brickOffsetTop = 60;
        this.brickOffsetSide = 20;
        const totalPadX = this.brickOffsetSide * 2 + this.brickPadding * (this.brickCols - 1);
        this.brickW = (W - totalPadX) / this.brickCols;
        this.brickH = 20;

        // Generate layout
        let layoutPositions;
        switch (cfg.brickLayout) {
            case 'checkerboard': layoutPositions = layoutCheckerboard(this.brickRows, this.brickCols); break;
            case 'pyramid':      layoutPositions = layoutPyramid(this.brickRows, this.brickCols);      break;
            case 'random':       layoutPositions = layoutRandom(this.brickRows, this.brickCols, this.rng); break;
            default:             layoutPositions = layoutFull(this.brickRows, this.brickCols);
        }

        const brickColors = cfg.theme.brickColors;
        this.bricks = layoutPositions.map(({ row, col }) => ({
            x: this.brickOffsetSide + col * (this.brickW + this.brickPadding),
            y: this.brickOffsetTop + row * (this.brickH + this.brickPadding),
            w: this.brickW,
            h: this.brickH,
            color: brickColors[row % brickColors.length],
            points: (this.brickRows - row) * 10, // top rows worth more
            alive: true,
        }));

        this.totalBricks = this.bricks.filter(b => b.alive).length;

        // Particles
        this.particles = [];

        // Track mouse
        this.useKeyboard = false;
    }

    resetBall() {
        const W = this.canvas.width;
        this.ballX = W / 2;
        this.ballY = this.paddleY - 20;
        // Random angle between 225 and 315 degrees (going upward)
        const angle = (225 + this.rng() * 90) * Math.PI / 180;
        this.ballVX = Math.cos(angle) * this.baseBallSpeed;
        this.ballVY = Math.sin(angle) * this.baseBallSpeed;
        // Ensure ball goes upward
        if (this.ballVY > 0) this.ballVY = -this.ballVY;
    }

    update(dt) {
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Keyboard paddle movement
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.paddleX -= this.paddleSpeed * dt;
            this.useKeyboard = true;
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.paddleX += this.paddleSpeed * dt;
            this.useKeyboard = true;
        }

        // Clamp paddle
        this.paddleX = Math.max(0, Math.min(W - this.paddleW, this.paddleX));

        // Move ball
        this.ballX += this.ballVX * dt;
        this.ballY += this.ballVY * dt;

        const r = this.ballRadius;

        // Wall collisions (left/right)
        if (this.ballX - r <= 0) {
            this.ballX = r;
            this.ballVX = Math.abs(this.ballVX);
        }
        if (this.ballX + r >= W) {
            this.ballX = W - r;
            this.ballVX = -Math.abs(this.ballVX);
        }

        // Ceiling
        if (this.ballY - r <= 0) {
            this.ballY = r;
            this.ballVY = Math.abs(this.ballVY);
        }

        // Floor — lose life
        if (this.ballY + r >= H) {
            this.lives--;
            if (this.lives <= 0) {
                this.endGame();
                return;
            }
            this.resetBall();
            return;
        }

        // Paddle collision
        if (
            this.ballVY > 0 &&
            this.ballY + r >= this.paddleY &&
            this.ballY + r <= this.paddleY + this.paddleH + 5 &&
            this.ballX >= this.paddleX - r &&
            this.ballX <= this.paddleX + this.paddleW + r
        ) {
            // Where on paddle did ball hit? -1 to 1
            const hitPos = (this.ballX - (this.paddleX + this.paddleW / 2)) / (this.paddleW / 2);
            const maxAngle = 60 * Math.PI / 180;
            const angle = hitPos * maxAngle;
            const speed = Math.sqrt(this.ballVX * this.ballVX + this.ballVY * this.ballVY);

            this.ballVX = Math.sin(angle) * speed;
            this.ballVY = -Math.cos(angle) * speed;
            this.ballY = this.paddleY - r;

            // Slight speed increase over time
            const speedMult = 1.002;
            this.ballVX *= speedMult;
            this.ballVY *= speedMult;
        }

        // Brick collisions
        for (const brick of this.bricks) {
            if (!brick.alive) continue;

            // AABB vs circle
            const closestX = Math.max(brick.x, Math.min(this.ballX, brick.x + brick.w));
            const closestY = Math.max(brick.y, Math.min(this.ballY, brick.y + brick.h));
            const distX = this.ballX - closestX;
            const distY = this.ballY - closestY;

            if (distX * distX + distY * distY < r * r) {
                brick.alive = false;
                this.score += brick.points;

                // Determine bounce direction
                const overlapX = r - Math.abs(distX);
                const overlapY = r - Math.abs(distY);
                if (overlapX < overlapY) {
                    this.ballVX = -this.ballVX;
                } else {
                    this.ballVY = -this.ballVY;
                }

                // Particles
                for (let i = 0; i < 8; i++) {
                    this.particles.push({
                        x: closestX,
                        y: closestY,
                        vx: (Math.random() - 0.5) * 200,
                        vy: (Math.random() - 0.5) * 200,
                        life: 0.5,
                        maxLife: 0.5,
                        color: brick.color,
                    });
                }

                break; // one brick per frame
            }
        }

        // Check win
        if (this.bricks.every(b => !b.alive)) {
            this.score += this.lives * 100; // bonus for remaining lives
            this.endGame();
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt; // gravity on particles
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onMouseMove(x, _y) {
        if (this.gameOver) return;
        if (!this.useKeyboard) {
            this.paddleX = x - this.paddleW / 2;
            this.paddleX = Math.max(0, Math.min(this.canvas.width - this.paddleW, this.paddleX));
        }
    }

    onClick(_x, _y) {
        // Reset keyboard mode on click so mouse takes over
        this.useKeyboard = false;
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Subtle grid pattern
        ctx.strokeStyle = t.primary + '08';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = 0; y < H; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Bricks
        for (const brick of this.bricks) {
            if (!brick.alive) continue;

            // Brick body
            ctx.fillStyle = brick.color;
            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 3);
            ctx.fill();

            // Top highlight
            ctx.fillStyle = '#ffffff25';
            ctx.fillRect(brick.x + 2, brick.y + 1, brick.w - 4, brick.h * 0.35);

            // Border
            ctx.strokeStyle = '#00000030';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 3);
            ctx.stroke();
        }

        // Paddle
        const paddleGrad = ctx.createLinearGradient(this.paddleX, this.paddleY, this.paddleX, this.paddleY + this.paddleH);
        paddleGrad.addColorStop(0, t.paddle);
        paddleGrad.addColorStop(1, t.primary);
        ctx.fillStyle = paddleGrad;
        ctx.beginPath();
        ctx.roundRect(this.paddleX, this.paddleY, this.paddleW, this.paddleH, this.paddleH / 2);
        ctx.fill();

        // Paddle glow
        ctx.shadowColor = t.primary;
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'transparent';
        ctx.beginPath();
        ctx.roundRect(this.paddleX, this.paddleY, this.paddleW, this.paddleH, this.paddleH / 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.ballX, this.ballY, this.ballRadius, 0, Math.PI * 2);
        ctx.fill();

        // Ball glow
        ctx.fillStyle = t.primary + '40';
        ctx.beginPath();
        ctx.arc(this.ballX, this.ballY, this.ballRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Ball trail (small)
        ctx.fillStyle = t.primary + '20';
        ctx.beginPath();
        ctx.arc(this.ballX - this.ballVX * 0.02, this.ballY - this.ballVY * 0.02, this.ballRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Particles
        for (const p of this.particles) {
            const alpha = Math.floor((p.life / p.maxLife) * 255).toString(16).padStart(2, '0');
            ctx.fillStyle = p.color + alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Lives
        ctx.fillStyle = t.secondary;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i < this.lives; i++) {
            ctx.beginPath();
            ctx.arc(W - 20 - i * 24, 22, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bricks remaining
        const alive = this.bricks.filter(b => b.alive).length;
        ctx.fillStyle = t.secondary + '80';
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${alive} / ${this.totalBricks} bricks`, W / 2, 15);

        // Instructions
        if (this.score === 0) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Mouse or Arrow keys to move paddle', W / 2, 36);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            const won = this.bricks.every(b => !b.alive);
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(won ? 'YOU WIN!' : 'GAME OVER', W / 2, H / 2 - 30);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 15);

            if (won) {
                ctx.font = '16px monospace';
                ctx.fillText(`Lives bonus: +${this.lives * 100}`, W / 2, H / 2 + 48);
            }

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const brickRowOptions = [3, 4, 5, 6];
    const brickColOptions = [6, 8, 10];
    const ballSpeedOptions = ['slow', 'medium', 'fast'];
    const paddleSizeOptions = ['small', 'medium', 'large'];
    const layouts = ['full', 'checkerboard', 'pyramid', 'random'];
    let seed = 1;

    for (const theme of themes) {
        for (const layout of layouts) {
            for (const ballSpeed of ballSpeedOptions) {
                // Vary rows, cols, paddle across seed
                const brickRows = brickRowOptions[seed % brickRowOptions.length];
                const brickCols = brickColOptions[seed % brickColOptions.length];
                const paddleSize = paddleSizeOptions[seed % paddleSizeOptions.length];

                variations.push({
                    name: generateGameName('Breakout', seed),
                    category: 'Breakout',
                    config: {
                        brickRows,
                        brickCols,
                        ballSpeed,
                        paddleSize,
                        brickLayout: layout,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Breakout', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 themes * 4 layouts * 3 speeds = 96 base

    // Additional variations with explicit row/col combos
    for (const theme of themes) {
        for (const brickRows of brickRowOptions) {
            for (const paddleSize of paddleSizeOptions) {
                const layout = layouts[seed % layouts.length];
                const ballSpeed = ballSpeedOptions[seed % ballSpeedOptions.length];
                const brickCols = brickColOptions[seed % brickColOptions.length];

                variations.push({
                    name: generateGameName('Breakout', seed),
                    category: 'Breakout',
                    config: {
                        brickRows,
                        brickCols,
                        ballSpeed,
                        paddleSize,
                        brickLayout: layout,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Breakout', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // + 8 * 4 * 3 = 96 more = ~192 total
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Breakout', BreakoutGame, generateVariations);
