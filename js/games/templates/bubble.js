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

// ── Bubble colors ───────────────────────────────────────────────────────
const BUBBLE_PALETTES = [
    ['#ff4444', '#4444ff', '#44cc44'],                                   // 3 colors
    ['#ff4444', '#4444ff', '#44cc44', '#ffcc00'],                        // 4 colors
    ['#ff4444', '#4444ff', '#44cc44', '#ffcc00', '#ff66cc'],             // 5 colors
    ['#ff4444', '#4444ff', '#44cc44', '#ffcc00', '#ff66cc', '#44cccc'],  // 6 colors
];

// ── BubbleGame ──────────────────────────────────────────────────────────
class BubbleGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Config
        this.colorCount = cfg.colorCount || 4;
        this.colors = BUBBLE_PALETTES[this.colorCount - 3] || BUBBLE_PALETTES[1];
        this.startRows = cfg.startRows || 5;
        this.pushInterval = cfg.pushInterval || 8;

        // Grid setup
        this.bubbleRadius = 14;
        this.bubbleDiam = this.bubbleRadius * 2;
        this.cols = Math.floor(W / this.bubbleDiam);
        this.gridOffsetX = (W - this.cols * this.bubbleDiam) / 2 + this.bubbleRadius;
        this.gridOffsetY = this.bubbleRadius + 30; // Top margin for HUD

        // Hex grid row height
        this.rowHeight = this.bubbleDiam * 0.866; // sqrt(3)/2

        // Bottom dead line
        this.deadLine = H - 80;

        // Grid: array of rows, each row is array of {color} or null
        this.grid = [];
        this.initGrid();

        // Shooter
        this.shooterX = W / 2;
        this.shooterY = H - 45;
        this.aimAngle = -Math.PI / 2; // Straight up
        this.currentBubble = this.randomColor();
        this.nextBubble = this.randomColor();

        // Flying bubble
        this.flyingBubble = null;

        // Aim position
        this.mouseX = W / 2;
        this.mouseY = H / 2;

        // Shots since last push
        this.shotsSincePush = 0;

        // Particles
        this.particles = [];

        // Pop animation
        this.poppingBubbles = [];
    }

    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.startRows; r++) {
            const cols = r % 2 === 0 ? this.cols : this.cols - 1;
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push({ color: this.randomColor() });
            }
            this.grid.push(row);
        }
    }

    randomColor() {
        return this.colors[Math.floor(this.rng() * this.colorCount)];
    }

    getBubblePos(row, col) {
        const offset = row % 2 === 0 ? 0 : this.bubbleRadius;
        return {
            x: this.gridOffsetX + col * this.bubbleDiam + offset,
            y: this.gridOffsetY + row * this.rowHeight,
        };
    }

    getGridCell(x, y) {
        // Find closest grid position to pixel coordinates
        let bestRow = 0, bestCol = 0, bestDist = Infinity;
        for (let r = 0; r <= this.grid.length + 1; r++) {
            const maxCols = r % 2 === 0 ? this.cols : this.cols - 1;
            for (let c = 0; c < maxCols; c++) {
                const pos = this.getBubblePos(r, c);
                const dx = x - pos.x;
                const dy = y - pos.y;
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestRow = r;
                    bestCol = c;
                }
            }
        }
        return { row: bestRow, col: bestCol };
    }

    findConnected(row, col, color) {
        // BFS to find all connected bubbles of same color
        const visited = new Set();
        const queue = [{ r: row, c: col }];
        const connected = [];
        const key = (r, c) => `${r},${c}`;

        while (queue.length > 0) {
            const { r, c } = queue.shift();
            const k = key(r, c);
            if (visited.has(k)) continue;
            visited.add(k);

            if (r < 0 || r >= this.grid.length) continue;
            const maxCols = r % 2 === 0 ? this.cols : this.cols - 1;
            if (c < 0 || c >= maxCols) continue;
            if (!this.grid[r] || !this.grid[r][c]) continue;
            if (this.grid[r][c].color !== color) continue;

            connected.push({ r, c });

            // 6 hex neighbors
            const neighbors = this.getNeighbors(r, c);
            for (const n of neighbors) {
                if (!visited.has(key(n.r, n.c))) {
                    queue.push(n);
                }
            }
        }
        return connected;
    }

    getNeighbors(r, c) {
        const isEvenRow = r % 2 === 0;
        if (isEvenRow) {
            return [
                { r: r, c: c - 1 }, { r: r, c: c + 1 },
                { r: r - 1, c: c - 1 }, { r: r - 1, c: c },
                { r: r + 1, c: c - 1 }, { r: r + 1, c: c },
            ];
        } else {
            return [
                { r: r, c: c - 1 }, { r: r, c: c + 1 },
                { r: r - 1, c: c }, { r: r - 1, c: c + 1 },
                { r: r + 1, c: c }, { r: r + 1, c: c + 1 },
            ];
        }
    }

    findFloating() {
        // Find all bubbles not connected to the top row (they "float" and should drop)
        const connected = new Set();
        const queue = [];

        // Start BFS from all top-row bubbles
        if (this.grid[0]) {
            for (let c = 0; c < this.grid[0].length; c++) {
                if (this.grid[0][c]) {
                    queue.push({ r: 0, c });
                    connected.add(`0,${c}`);
                }
            }
        }

        while (queue.length > 0) {
            const { r, c } = queue.shift();
            const neighbors = this.getNeighbors(r, c);
            for (const n of neighbors) {
                const k = `${n.r},${n.c}`;
                if (connected.has(k)) continue;
                if (n.r < 0 || n.r >= this.grid.length) continue;
                if (!this.grid[n.r] || !this.grid[n.r][n.c]) continue;
                connected.add(k);
                queue.push(n);
            }
        }

        // Anything not in connected set is floating
        const floating = [];
        for (let r = 0; r < this.grid.length; r++) {
            if (!this.grid[r]) continue;
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c] && !connected.has(`${r},${c}`)) {
                    floating.push({ r, c });
                }
            }
        }
        return floating;
    }

    pushNewRow() {
        // Add a new row at the top, shifting everything down
        const newRow = [];
        // Determine if new row 0 should be even or odd after shift
        // After shift, all rows increase by 1, so new row 0 is always "even row index"
        const cols = this.cols; // row 0 is always even
        for (let c = 0; c < cols; c++) {
            newRow.push({ color: this.randomColor() });
        }
        this.grid.unshift(newRow);
    }

    checkGameOver() {
        // Check if any bubble is at or past the dead line
        for (let r = 0; r < this.grid.length; r++) {
            if (!this.grid[r]) continue;
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c]) {
                    const pos = this.getBubblePos(r, c);
                    if (pos.y + this.bubbleRadius >= this.deadLine) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    onMouseMove(x, y) {
        this.mouseX = x;
        this.mouseY = y;

        // Calculate aim angle
        const dx = x - this.shooterX;
        const dy = y - this.shooterY;
        let angle = Math.atan2(dy, dx);
        // Clamp to upward angles
        if (angle > -0.15) angle = -0.15;
        if (angle < -Math.PI + 0.15) angle = -Math.PI + 0.15;
        this.aimAngle = angle;
    }

    onClick(x, y) {
        if (this.gameOver || this.flyingBubble) return;

        const speed = 500;
        this.flyingBubble = {
            x: this.shooterX,
            y: this.shooterY,
            vx: Math.cos(this.aimAngle) * speed,
            vy: Math.sin(this.aimAngle) * speed,
            color: this.currentBubble,
        };

        this.currentBubble = this.nextBubble;
        this.nextBubble = this.randomColor();

        this.shotsSincePush++;
    }

    update(dt) {
        const W = this.canvas.width;

        // Update flying bubble
        if (this.flyingBubble) {
            const fb = this.flyingBubble;
            fb.x += fb.vx * dt;
            fb.y += fb.vy * dt;

            // Wall bounce
            if (fb.x - this.bubbleRadius < 0) {
                fb.x = this.bubbleRadius;
                fb.vx = Math.abs(fb.vx);
            }
            if (fb.x + this.bubbleRadius > W) {
                fb.x = W - this.bubbleRadius;
                fb.vx = -Math.abs(fb.vx);
            }

            // Hit top
            if (fb.y - this.bubbleRadius < this.gridOffsetY - this.rowHeight) {
                this.landBubble(fb);
                return;
            }

            // Hit existing bubbles
            for (let r = 0; r < this.grid.length; r++) {
                if (!this.grid[r]) continue;
                for (let c = 0; c < this.grid[r].length; c++) {
                    if (!this.grid[r][c]) continue;
                    const pos = this.getBubblePos(r, c);
                    const dx = fb.x - pos.x;
                    const dy = fb.y - pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.bubbleDiam * 0.9) {
                        this.landBubble(fb);
                        return;
                    }
                }
            }
        }

        // Update pop animation
        for (let i = this.poppingBubbles.length - 1; i >= 0; i--) {
            const pb = this.poppingBubbles[i];
            pb.timer -= dt;
            pb.scale = Math.max(0, pb.timer / pb.maxTimer);
            if (pb.timer <= 0) this.poppingBubbles.splice(i, 1);
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 400 * dt; // Gravity
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    landBubble(fb) {
        // Find the grid cell to place the bubble
        const cell = this.getGridCell(fb.x, fb.y);

        // Ensure the row exists in grid
        while (this.grid.length <= cell.row) {
            const maxCols = this.grid.length % 2 === 0 ? this.cols : this.cols - 1;
            const row = new Array(maxCols).fill(null);
            this.grid.push(row);
        }

        // Ensure column is valid
        const maxCols = cell.row % 2 === 0 ? this.cols : this.cols - 1;
        if (cell.col >= maxCols) cell.col = maxCols - 1;
        if (cell.col < 0) cell.col = 0;

        // Ensure row array is long enough
        while (this.grid[cell.row].length < maxCols) {
            this.grid[cell.row].push(null);
        }

        // Place bubble
        this.grid[cell.row][cell.col] = { color: fb.color };
        this.flyingBubble = null;

        // Find connected same-color bubbles
        const connected = this.findConnected(cell.row, cell.col, fb.color);

        if (connected.length >= 3) {
            // Pop them!
            let popScore = connected.length * 10;
            for (const { r, c } of connected) {
                const pos = this.getBubblePos(r, c);
                const color = this.grid[r][c].color;

                // Pop animation
                this.poppingBubbles.push({
                    x: pos.x, y: pos.y,
                    color,
                    timer: 0.3, maxTimer: 0.3,
                    scale: 1,
                });

                // Particles
                for (let i = 0; i < 3; i++) {
                    this.particles.push({
                        x: pos.x, y: pos.y,
                        vx: (this.rng() - 0.5) * 120,
                        vy: (this.rng() - 0.5) * 120 - 50,
                        life: 0.5, maxLife: 0.5,
                        color,
                    });
                }

                this.grid[r][c] = null;
            }

            // Find and drop floating bubbles
            const floating = this.findFloating();
            for (const { r, c } of floating) {
                const pos = this.getBubblePos(r, c);
                const color = this.grid[r][c].color;

                this.particles.push({
                    x: pos.x, y: pos.y,
                    vx: (this.rng() - 0.5) * 80,
                    vy: 20,
                    life: 0.8, maxLife: 0.8,
                    color,
                });

                this.grid[r][c] = null;
                popScore += 15;
            }

            this.score += popScore;
        }

        // Push new row periodically
        if (this.shotsSincePush >= this.pushInterval) {
            this.shotsSincePush = 0;
            this.pushNewRow();
        }

        // Check game over
        if (this.checkGameOver()) {
            this.endGame();
        }

        // Check win (all bubbles cleared)
        let hasBubbles = false;
        for (let r = 0; r < this.grid.length; r++) {
            if (!this.grid[r]) continue;
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c]) { hasBubbles = true; break; }
            }
            if (hasBubbles) break;
        }
        if (!hasBubbles) {
            this.score += 500; // Bonus for clearing
            this.initGrid(); // New board
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

        // Dead line
        ctx.strokeStyle = '#ff333366';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, this.deadLine);
        ctx.lineTo(W, this.deadLine);
        ctx.stroke();
        ctx.setLineDash([]);

        // Grid bubbles
        for (let r = 0; r < this.grid.length; r++) {
            if (!this.grid[r]) continue;
            for (let c = 0; c < this.grid[r].length; c++) {
                if (!this.grid[r][c]) continue;
                const pos = this.getBubblePos(r, c);
                const color = this.grid[r][c].color;

                // Bubble
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, this.bubbleRadius - 1, 0, Math.PI * 2);
                ctx.fill();

                // Shine
                ctx.fillStyle = '#ffffff30';
                ctx.beginPath();
                ctx.arc(pos.x - 3, pos.y - 3, this.bubbleRadius * 0.3, 0, Math.PI * 2);
                ctx.fill();

                // Border
                ctx.strokeStyle = '#00000030';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, this.bubbleRadius - 1, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Popping bubbles
        for (const pb of this.poppingBubbles) {
            ctx.globalAlpha = pb.scale;
            ctx.fillStyle = pb.color;
            ctx.beginPath();
            ctx.arc(pb.x, pb.y, this.bubbleRadius * (1 + (1 - pb.scale) * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
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

        // Flying bubble
        if (this.flyingBubble) {
            const fb = this.flyingBubble;
            ctx.fillStyle = fb.color;
            ctx.beginPath();
            ctx.arc(fb.x, fb.y, this.bubbleRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff30';
            ctx.beginPath();
            ctx.arc(fb.x - 3, fb.y - 3, this.bubbleRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Aim trajectory (dotted line)
        if (!this.flyingBubble && !this.gameOver) {
            ctx.strokeStyle = t.primary + '40';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(this.shooterX, this.shooterY);

            // Simple trajectory with wall bouncing preview
            let tx = this.shooterX;
            let ty = this.shooterY;
            let tvx = Math.cos(this.aimAngle);
            let tvy = Math.sin(this.aimAngle);
            const steps = 60;
            const stepLen = 5;
            for (let i = 0; i < steps; i++) {
                tx += tvx * stepLen;
                ty += tvy * stepLen;
                if (tx < this.bubbleRadius) { tx = this.bubbleRadius; tvx = -tvx; }
                if (tx > W - this.bubbleRadius) { tx = W - this.bubbleRadius; tvx = -tvx; }
                ctx.lineTo(tx, ty);
                if (ty < this.gridOffsetY) break;
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Shooter
        // Current bubble
        ctx.fillStyle = this.currentBubble;
        ctx.beginPath();
        ctx.arc(this.shooterX, this.shooterY, this.bubbleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff30';
        ctx.beginPath();
        ctx.arc(this.shooterX - 3, this.shooterY - 3, this.bubbleRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Shooter base
        ctx.fillStyle = t.secondary + '40';
        ctx.beginPath();
        ctx.arc(this.shooterX, this.shooterY, this.bubbleRadius + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Next bubble preview
        ctx.fillStyle = '#ffffff80';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('NEXT', this.shooterX + 45, this.shooterY - 10);

        ctx.fillStyle = this.nextBubble;
        ctx.beginPath();
        ctx.arc(this.shooterX + 45, this.shooterY, this.bubbleRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // HUD
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 8);

        // Push countdown
        const shotsLeft = this.pushInterval - this.shotsSincePush;
        ctx.fillStyle = shotsLeft <= 2 ? '#ff6644' : t.secondary + 'cc';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`Push in: ${shotsLeft}`, W - 12, 10);

        // Instructions
        if (this.score === 0 && !this.flyingBubble) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Aim with mouse, click to shoot', W / 2, this.deadLine + 14);
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

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 55);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const colorCounts = [3, 4, 5, 6];
    const startRowsOptions = [4, 5, 6];
    const pushIntervals = [5, 8, 12];
    let seed = 1;

    for (const colorCount of colorCounts) {
        for (const startRows of startRowsOptions) {
            for (const pushInterval of pushIntervals) {
                for (const theme of themes) {
                    variations.push({
                        name: generateGameName('Bubble Shooter', seed),
                        category: 'Bubble Shooter',
                        config: {
                            colorCount,
                            startRows,
                            pushInterval,
                            theme,
                            seed,
                        },
                        thumbnail: generateThumbnail('Bubble Shooter', { theme }, seed),
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
    // 4 * 3 * 3 * 8 = 288 but capped at 150
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Bubble', BubbleGame, generateVariations);
