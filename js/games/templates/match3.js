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
    { name: 'Candy',    primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0020', tile: '#3b0030', text: '#ffffff',
      colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'] },
    { name: 'Jewel',    primary: '#e74c3c', secondary: '#f39c12', bg: '#1a0a2e', tile: '#2a1a3e', text: '#ffffff',
      colors: ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e67e22'] },
    { name: 'Ocean',    primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', tile: '#0a0a5e', text: '#caf0f8',
      colors: ['#00b4d8', '#0077b6', '#90e0ef', '#48cae4', '#023e8a', '#caf0f8'] },
    { name: 'Forest',   primary: '#00b894', secondary: '#55efc4', bg: '#0a2e1a', tile: '#1a3e2a', text: '#dfe6e9',
      colors: ['#00b894', '#6ab04c', '#f9ca24', '#eb4d4b', '#30336b', '#95afc0'] },
    { name: 'Neon',     primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', tile: '#161650', text: '#ffffff',
      colors: ['#ff006e', '#00ff87', '#ffff00', '#00d4ff', '#ff00ff', '#ff6600'] },
    { name: 'Sunset',   primary: '#e84393', secondary: '#fd79a8', bg: '#2d1b4e', tile: '#3d2b5e', text: '#ffeaa7',
      colors: ['#e84393', '#fd79a8', '#fdcb6e', '#e17055', '#6c5ce7', '#00cec9'] },
    { name: 'Retro',    primary: '#fdcb6e', secondary: '#ffeaa7', bg: '#2d3436', tile: '#3d4446', text: '#dfe6e9',
      colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#1dd1a1', '#ee5a24'] },
    { name: 'Ice',      primary: '#74b9ff', secondary: '#dfe6e9', bg: '#0c1021', tile: '#1c2031', text: '#dfe6e9',
      colors: ['#74b9ff', '#a29bfe', '#dfe6e9', '#81ecec', '#55efc4', '#ffeaa7'] },
];

// ── Tile state constants ────────────────────────────────────────────────
const EMPTY = -1;

// ── Match3Game ──────────────────────────────────────────────────────────
class Match3Game extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);
        this.cols = cfg.gridSize;
        this.rows = cfg.gridSize;
        this.colorCount = cfg.colorCount;
        this.timeLimit = cfg.timeLimit;
        this.timeLeft = this.timeLimit;

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Grid layout
        this.tileSize = Math.floor(Math.min((W - 40) / this.cols, (H - 100) / this.rows));
        this.gridOffsetX = Math.floor((W - this.tileSize * this.cols) / 2);
        this.gridOffsetY = Math.floor((H - this.tileSize * this.rows) / 2) + 20;

        // Board (2D array: board[row][col] = color index or EMPTY)
        this.board = [];
        this.initBoard();

        // Remove any initial matches
        this.removeInitialMatches();

        // Selection state
        this.selected = null; // { row, col }

        // Animation state
        this.animating = false;
        this.fallingTiles = [];  // { row, col, fromY, toY, progress }
        this.removingTiles = []; // { row, col, progress }
        this.animTimer = 0;

        // Combo counter
        this.combo = 0;

        // Particles
        this.particles = [];
    }

    initBoard() {
        this.board = [];
        for (let r = 0; r < this.rows; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.board[r][c] = Math.floor(this.rng() * this.colorCount);
            }
        }
    }

    removeInitialMatches() {
        // Keep regenerating until no matches exist
        let hasMatches = true;
        let tries = 0;
        while (hasMatches && tries < 100) {
            hasMatches = false;
            tries++;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    // Check horizontal
                    if (c >= 2 && this.board[r][c] !== EMPTY &&
                        this.board[r][c] === this.board[r][c - 1] &&
                        this.board[r][c] === this.board[r][c - 2]) {
                        this.board[r][c] = Math.floor(this.rng() * this.colorCount);
                        hasMatches = true;
                    }
                    // Check vertical
                    if (r >= 2 && this.board[r][c] !== EMPTY &&
                        this.board[r][c] === this.board[r - 1][c] &&
                        this.board[r][c] === this.board[r - 2][c]) {
                        this.board[r][c] = Math.floor(this.rng() * this.colorCount);
                        hasMatches = true;
                    }
                }
            }
        }
    }

    findMatches() {
        const matched = new Set();

        // Horizontal
        for (let r = 0; r < this.rows; r++) {
            let run = 1;
            for (let c = 1; c < this.cols; c++) {
                if (this.board[r][c] !== EMPTY && this.board[r][c] === this.board[r][c - 1]) {
                    run++;
                } else {
                    if (run >= 3) {
                        for (let k = 0; k < run; k++) {
                            matched.add(`${r},${c - 1 - k}`);
                        }
                    }
                    run = 1;
                }
            }
            if (run >= 3) {
                for (let k = 0; k < run; k++) {
                    matched.add(`${r},${this.cols - 1 - k}`);
                }
            }
        }

        // Vertical
        for (let c = 0; c < this.cols; c++) {
            let run = 1;
            for (let r = 1; r < this.rows; r++) {
                if (this.board[r][c] !== EMPTY && this.board[r][c] === this.board[r - 1][c]) {
                    run++;
                } else {
                    if (run >= 3) {
                        for (let k = 0; k < run; k++) {
                            matched.add(`${r - 1 - k},${c}`);
                        }
                    }
                    run = 1;
                }
            }
            if (run >= 3) {
                for (let k = 0; k < run; k++) {
                    matched.add(`${this.rows - 1 - k},${c}`);
                }
            }
        }

        return matched;
    }

    removeMatches(matched) {
        const points = matched.size * 10 * (1 + this.combo * 0.5);
        this.score += Math.floor(points);
        this.combo++;

        // Spawn particles for each matched tile
        for (const key of matched) {
            const [r, c] = key.split(',').map(Number);
            const colorIdx = this.board[r][c];
            const cx = this.gridOffsetX + c * this.tileSize + this.tileSize / 2;
            const cy = this.gridOffsetY + r * this.tileSize + this.tileSize / 2;
            for (let i = 0; i < 4; i++) {
                this.particles.push({
                    x: cx, y: cy,
                    vx: (Math.random() - 0.5) * 200,
                    vy: (Math.random() - 0.5) * 200,
                    life: 0.5, maxLife: 0.5,
                    color: this.theme.colors[colorIdx % this.theme.colors.length],
                });
            }
            this.board[r][c] = EMPTY;
        }
    }

    applyGravity() {
        // Drop tiles down to fill empty spaces
        let moved = false;
        for (let c = 0; c < this.cols; c++) {
            let writeRow = this.rows - 1;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.board[r][c] !== EMPTY) {
                    if (r !== writeRow) {
                        this.board[writeRow][c] = this.board[r][c];
                        this.board[r][c] = EMPTY;
                        moved = true;
                    }
                    writeRow--;
                }
            }
            // Fill top with new tiles
            for (let r = writeRow; r >= 0; r--) {
                this.board[r][c] = Math.floor(this.rng() * this.colorCount);
                moved = true;
            }
        }
        return moved;
    }

    isAdjacent(r1, c1, r2, c2) {
        return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
    }

    trySwap(r1, c1, r2, c2) {
        // Swap
        [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]];

        // Check if swap creates a match
        const matches = this.findMatches();
        if (matches.size > 0) {
            // Valid swap — process chain
            this.combo = 0;
            this.processChain();
        } else {
            // Invalid swap — swap back
            [this.board[r1][c1], this.board[r2][c2]] = [this.board[r2][c2], this.board[r1][c1]];
        }
    }

    processChain() {
        // Use a delayed chain via animating flag
        this.animating = true;
        this.chainStep();
    }

    chainStep() {
        const matches = this.findMatches();
        if (matches.size > 0) {
            this.removeMatches(matches);
            this.applyGravity();
            // Delay next check
            setTimeout(() => this.chainStep(), 200);
        } else {
            this.animating = false;
            this.combo = 0;
        }
    }

    update(dt) {
        // Timer
        if (this.timeLimit > 0) {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.endGame();
                return;
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // gravity
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onClick(mx, my) {
        if (this.gameOver || this.animating) return;

        // Convert to grid coords
        const col = Math.floor((mx - this.gridOffsetX) / this.tileSize);
        const row = Math.floor((my - this.gridOffsetY) / this.tileSize);

        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            this.selected = null;
            return;
        }

        if (this.board[row][col] === EMPTY) return;

        if (this.selected) {
            if (this.selected.row === row && this.selected.col === col) {
                this.selected = null;
                return;
            }

            if (this.isAdjacent(this.selected.row, this.selected.col, row, col)) {
                this.trySwap(this.selected.row, this.selected.col, row, col);
                this.selected = null;
            } else {
                this.selected = { row, col };
            }
        } else {
            this.selected = { row, col };
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;
        const ts = this.tileSize;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Grid background
        ctx.fillStyle = t.tile;
        ctx.fillRect(
            this.gridOffsetX - 4, this.gridOffsetY - 4,
            this.cols * ts + 8, this.rows * ts + 8
        );

        // Draw tiles
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = this.gridOffsetX + c * ts;
                const y = this.gridOffsetY + r * ts;
                const val = this.board[r][c];

                // Cell background
                ctx.fillStyle = t.bg + '80';
                ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);

                if (val === EMPTY) continue;

                const color = t.colors[val % t.colors.length];
                const pad = ts * 0.12;
                const tileR = ts * 0.2;

                // Selected highlight
                if (this.selected && this.selected.row === r && this.selected.col === c) {
                    ctx.fillStyle = '#ffffff40';
                    ctx.fillRect(x, y, ts, ts);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
                }

                // Tile (rounded square)
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(x + pad, y + pad, ts - pad * 2, ts - pad * 2, tileR);
                ctx.fill();

                // Inner shine
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.beginPath();
                ctx.roundRect(x + pad + 2, y + pad + 2, (ts - pad * 2) * 0.5, (ts - pad * 2) * 0.35, tileR * 0.5);
                ctx.fill();
            }
        }

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

        // HUD - Score
        ctx.fillStyle = t.text;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Combo indicator
        if (this.combo > 1) {
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Combo x${this.combo}!`, W / 2, 12);
        }

        // Timer
        if (this.timeLimit > 0) {
            ctx.fillStyle = this.timeLeft < 10 ? '#ff6b6b' : t.text;
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.ceil(this.timeLeft)}s`, W - 12, 12);
        }

        // Instructions
        if (this.score === 0 && !this.selected) {
            ctx.fillStyle = t.text + 'aa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Click tile, then click adjacent to swap', W / 2, H - 10);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('TIME UP!', W / 2, H / 2 - 30);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 15);

            ctx.fillStyle = t.text + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 55);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const gridSizes = [6, 7, 8];
    const colorCounts = [4, 5, 6];
    const timeLimits = [30, 60, 90];
    let seed = 1;

    for (const gridSize of gridSizes) {
        for (const colorCount of colorCounts) {
            for (const timeLimit of timeLimits) {
                for (const theme of themes) {
                    variations.push({
                        name: generateGameName('Puzzle', seed),
                        category: 'Puzzle',
                        config: {
                            gridSize,
                            colorCount,
                            timeLimit,
                            theme,
                            seed,
                        },
                        thumbnail: generateThumbnail('Puzzle', { theme }, seed),
                    });
                    seed++;
                }
            }
        }
    }
    // 3 * 3 * 3 * 8 = 216 (truncate to ~250 range by adding extra combos below)
    // Add a few extra with 0 time limit (untimed)
    for (const gridSize of [6, 7]) {
        for (const colorCount of [4, 5]) {
            for (const theme of themes) {
                variations.push({
                    name: generateGameName('Puzzle', seed),
                    category: 'Puzzle',
                    config: {
                        gridSize,
                        colorCount,
                        timeLimit: 0,
                        theme,
                        seed,
                    },
                    thumbnail: generateThumbnail('Puzzle', { theme }, seed),
                });
                seed++;
            }
        }
    }
    // 216 + 32 = 248
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Match3', Match3Game, generateVariations);
