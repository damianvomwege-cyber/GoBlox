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
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', grid: '#161650',
      pieces: ['#ff006e', '#00ff87', '#60efff', '#ffbe0b', '#9b5de5', '#ff5400', '#00bbf9'] },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e', grid: '#2a2a3e',
      pieces: ['#f72585', '#b5179e', '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0', '#4895ef'] },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e', grid: '#0a0a6e',
      pieces: ['#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#caf0f8', '#023e8a', '#0077b6'] },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', grid: '#2a1a10',
      pieces: ['#ff0000', '#ff4500', '#ff6b35', '#ff8c00', '#ffa500', '#ffd700', '#ffff00'] },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', grid: '#3b0022',
      pieces: ['#ff69b4', '#ff1493', '#da70d6', '#ba55d3', '#ff6eb4', '#ffb6c1', '#ffc0cb'] },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', grid: '#001a00',
      pieces: ['#00ff00', '#33ff33', '#66ff66', '#00cc00', '#009900', '#00ff66', '#33cc33'] },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', grid: '#20003b',
      pieces: ['#00f5d4', '#00bbf9', '#9b5de5', '#f15bb5', '#fee440', '#00f5d4', '#ff006e'] },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', grid: '#2a1520',
      pieces: ['#ff6f61', '#ff9671', '#ffc75f', '#f9f871', '#d65db1', '#845ec2', '#ff6348'] },
];

// ── Tetromino definitions ───────────────────────────────────────────────
// Each shape defined as array of [row, col] offsets from rotation center
const TETROMINOES = {
    I: { shapes: [
        [[0,0],[0,1],[0,2],[0,3]],
        [[0,0],[1,0],[2,0],[3,0]],
        [[0,0],[0,1],[0,2],[0,3]],
        [[0,0],[1,0],[2,0],[3,0]],
    ], colorIndex: 0 },
    O: { shapes: [
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
    ], colorIndex: 1 },
    T: { shapes: [
        [[0,0],[0,1],[0,2],[1,1]],
        [[0,0],[1,0],[2,0],[1,1]],
        [[1,0],[1,1],[1,2],[0,1]],
        [[0,0],[1,0],[2,0],[1,-1]],
    ], colorIndex: 2 },
    S: { shapes: [
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,0],[1,0],[1,1],[2,1]],
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,0],[1,0],[1,1],[2,1]],
    ], colorIndex: 3 },
    Z: { shapes: [
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,1],[1,0],[1,1],[2,0]],
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,1],[1,0],[1,1],[2,0]],
    ], colorIndex: 4 },
    J: { shapes: [
        [[0,0],[1,0],[1,1],[1,2]],
        [[0,0],[0,1],[1,0],[2,0]],
        [[0,0],[0,1],[0,2],[1,2]],
        [[0,0],[1,0],[2,0],[2,-1]],
    ], colorIndex: 5 },
    L: { shapes: [
        [[0,2],[1,0],[1,1],[1,2]],
        [[0,0],[1,0],[2,0],[2,1]],
        [[0,0],[0,1],[0,2],[1,0]],
        [[0,0],[0,1],[1,1],[2,1]],
    ], colorIndex: 6 },
};

const PIECE_NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// ── TetrisGame ──────────────────────────────────────────────────────────
class TetrisGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        this.cols = cfg.gridWidth || 10;
        this.rows = cfg.gridHeight || 20;

        // Speed: rows per second (drop interval)
        const speedMap = { slow: 0.8, medium: 1.2, fast: 2.0 };
        this.baseDropInterval = 1 / (speedMap[cfg.startSpeed] || 1.2);
        this.dropInterval = this.baseDropInterval;
        this.dropTimer = 0;
        this.softDropping = false;

        // Calculate cell size
        const W = this.canvas.width;
        const H = this.canvas.height;
        const maxCellW = Math.floor((W - 120) / this.cols); // Leave space for side panel
        const maxCellH = Math.floor((H - 40) / this.rows);
        this.cellSize = Math.min(maxCellW, maxCellH, 28);

        const gridW = this.cols * this.cellSize;
        const gridH = this.rows * this.cellSize;
        this.gridX = Math.floor((W - gridW - 100) / 2) + 10;
        this.gridY = Math.floor((H - gridH) / 2);

        // Grid: 0 = empty, or color string
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid.push(new Array(this.cols).fill(null));
        }

        // Piece bag (7-bag randomizer)
        this.bag = [];
        this.fillBag();

        // Current and next piece
        this.nextPiece = this.drawFromBag();
        this.spawnPiece();

        // Stats
        this.linesCleared = 0;
        this.level = 1;

        // Row clear animation
        this.clearingRows = [];
        this.clearTimer = 0;
        this.clearDuration = 0.3;

        // DAS (Delayed Auto Shift) for responsive left/right
        this.dasTimer = 0;
        this.dasDirection = 0;
        this.dasDelay = 0.17;
        this.dasRepeat = 0.05;
        this.dasReady = false;

        // Lock delay
        this.lockTimer = 0;
        this.lockDelay = 0.5;
        this.onGround = false;
    }

    fillBag() {
        const pieces = [...PIECE_NAMES];
        // Fisher-Yates shuffle with seeded rng
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        this.bag.push(...pieces);
    }

    drawFromBag() {
        if (this.bag.length === 0) this.fillBag();
        return this.bag.shift();
    }

    spawnPiece() {
        this.currentType = this.nextPiece;
        this.nextPiece = this.drawFromBag();
        this.rotation = 0;

        const shape = TETROMINOES[this.currentType].shapes[0];
        // Center horizontally
        const minCol = Math.min(...shape.map(s => s[1]));
        const maxCol = Math.max(...shape.map(s => s[1]));
        const pieceW = maxCol - minCol + 1;

        this.pieceX = Math.floor((this.cols - pieceW) / 2) - minCol;
        this.pieceY = 0;

        // Check if spawn position is blocked => game over
        if (this.collides(this.pieceX, this.pieceY, this.rotation)) {
            this.endGame();
        }

        this.onGround = false;
        this.lockTimer = 0;
        this.dropTimer = 0;
    }

    getShape(type, rotation) {
        return TETROMINOES[type].shapes[rotation % 4];
    }

    collides(px, py, rotation) {
        const shape = this.getShape(this.currentType, rotation);
        for (const [r, c] of shape) {
            const gr = py + r;
            const gc = px + c;
            if (gc < 0 || gc >= this.cols || gr >= this.rows) return true;
            if (gr >= 0 && this.grid[gr][gc] !== null) return true;
        }
        return false;
    }

    lockPiece() {
        const shape = this.getShape(this.currentType, this.rotation);
        const colorIdx = TETROMINOES[this.currentType].colorIndex;
        const color = this.theme.pieces[colorIdx];

        for (const [r, c] of shape) {
            const gr = this.pieceY + r;
            const gc = this.pieceX + c;
            if (gr >= 0 && gr < this.rows && gc >= 0 && gc < this.cols) {
                this.grid[gr][gc] = color;
            }
        }

        // Check for completed rows
        const fullRows = [];
        for (let r = 0; r < this.rows; r++) {
            if (this.grid[r].every(cell => cell !== null)) {
                fullRows.push(r);
            }
        }

        if (fullRows.length > 0) {
            this.clearingRows = fullRows;
            this.clearTimer = this.clearDuration;

            // Score: 100/300/500/800
            const scoreMap = [0, 100, 300, 500, 800];
            this.score += (scoreMap[fullRows.length] || fullRows.length * 200) * this.level;
            this.linesCleared += fullRows.length;

            // Level up every 10 lines
            this.level = Math.floor(this.linesCleared / 10) + 1;

            // Speed increase
            this.dropInterval = this.baseDropInterval * Math.pow(0.85, this.level - 1);
        } else {
            this.spawnPiece();
        }
    }

    clearFullRows() {
        // Remove rows from bottom to top
        const sorted = [...this.clearingRows].sort((a, b) => b - a);
        for (const row of sorted) {
            this.grid.splice(row, 1);
            this.grid.unshift(new Array(this.cols).fill(null));
        }
        this.clearingRows = [];
        this.spawnPiece();
    }

    getGhostY() {
        let gy = this.pieceY;
        while (!this.collides(this.pieceX, gy + 1, this.rotation)) {
            gy++;
        }
        return gy;
    }

    movePiece(dx) {
        if (!this.collides(this.pieceX + dx, this.pieceY, this.rotation)) {
            this.pieceX += dx;
            // Reset lock timer if on ground and we moved
            if (this.onGround) {
                this.lockTimer = 0;
            }
        }
    }

    rotatePiece() {
        const newRotation = (this.rotation + 1) % 4;
        // Try normal rotation
        if (!this.collides(this.pieceX, this.pieceY, newRotation)) {
            this.rotation = newRotation;
            if (this.onGround) this.lockTimer = 0;
            return;
        }
        // Wall kick: try offsets
        const kicks = [[-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
        for (const [kx, ky] of kicks) {
            if (!this.collides(this.pieceX + kx, this.pieceY + ky, newRotation)) {
                this.pieceX += kx;
                this.pieceY += ky;
                this.rotation = newRotation;
                if (this.onGround) this.lockTimer = 0;
                return;
            }
        }
    }

    hardDrop() {
        const ghostY = this.getGhostY();
        this.score += (ghostY - this.pieceY) * 2;
        this.pieceY = ghostY;
        this.lockPiece();
    }

    update(dt) {
        // Row clear animation
        if (this.clearingRows.length > 0) {
            this.clearTimer -= dt;
            if (this.clearTimer <= 0) {
                this.clearFullRows();
            }
            return;
        }

        // DAS
        if (this.dasDirection !== 0) {
            this.dasTimer += dt;
            if (this.dasReady) {
                if (this.dasTimer >= this.dasRepeat) {
                    this.dasTimer -= this.dasRepeat;
                    this.movePiece(this.dasDirection);
                }
            } else if (this.dasTimer >= this.dasDelay) {
                this.dasReady = true;
                this.dasTimer = 0;
                this.movePiece(this.dasDirection);
            }
        }

        // Drop
        const effectiveInterval = this.softDropping ? this.dropInterval * 0.1 : this.dropInterval;
        this.dropTimer += dt;

        if (this.dropTimer >= effectiveInterval) {
            this.dropTimer -= effectiveInterval;

            if (!this.collides(this.pieceX, this.pieceY + 1, this.rotation)) {
                this.pieceY++;
                if (this.softDropping) this.score += 1;
                this.onGround = false;
                this.lockTimer = 0;
            } else {
                this.onGround = true;
            }
        }

        // Lock delay
        if (this.onGround) {
            this.lockTimer += dt;
            if (this.lockTimer >= this.lockDelay) {
                this.lockPiece();
            }
        }
    }

    onKeyDown(key) {
        if (this.gameOver) return;
        if (this.clearingRows.length > 0) return;

        switch (key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.movePiece(-1);
                this.dasDirection = -1;
                this.dasTimer = 0;
                this.dasReady = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.movePiece(1);
                this.dasDirection = 1;
                this.dasTimer = 0;
                this.dasReady = false;
                break;
            case 'ArrowUp':
            case 'z':
            case 'Z':
                this.rotatePiece();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.softDropping = true;
                break;
            case ' ':
                this.hardDrop();
                break;
        }
    }

    onKeyUp(key) {
        switch (key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.dasDirection === -1) {
                    this.dasDirection = 0;
                    this.dasTimer = 0;
                    this.dasReady = false;
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.dasDirection === 1) {
                    this.dasDirection = 0;
                    this.dasTimer = 0;
                    this.dasReady = false;
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.softDropping = false;
                break;
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;
        const cs = this.cellSize;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Grid background
        ctx.fillStyle = t.grid;
        ctx.fillRect(this.gridX, this.gridY, this.cols * cs, this.rows * cs);

        // Grid lines
        ctx.strokeStyle = t.bg + '60';
        ctx.lineWidth = 1;
        for (let c = 0; c <= this.cols; c++) {
            ctx.beginPath();
            ctx.moveTo(this.gridX + c * cs, this.gridY);
            ctx.lineTo(this.gridX + c * cs, this.gridY + this.rows * cs);
            ctx.stroke();
        }
        for (let r = 0; r <= this.rows; r++) {
            ctx.beginPath();
            ctx.moveTo(this.gridX, this.gridY + r * cs);
            ctx.lineTo(this.gridX + this.cols * cs, this.gridY + r * cs);
            ctx.stroke();
        }

        // Locked blocks
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const color = this.grid[r][c];
                if (color) {
                    const clearing = this.clearingRows.includes(r);
                    if (clearing) {
                        const flash = Math.floor((this.clearTimer / this.clearDuration) * 6) % 2;
                        ctx.fillStyle = flash ? '#ffffff' : color;
                    } else {
                        ctx.fillStyle = color;
                    }
                    const x = this.gridX + c * cs;
                    const y = this.gridY + r * cs;
                    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

                    // Highlight
                    if (!clearing) {
                        ctx.fillStyle = '#ffffff20';
                        ctx.fillRect(x + 1, y + 1, cs - 2, (cs - 2) * 0.3);
                    }
                }
            }
        }

        // Ghost piece
        if (!this.gameOver && this.clearingRows.length === 0) {
            const ghostY = this.getGhostY();
            const shape = this.getShape(this.currentType, this.rotation);
            const colorIdx = TETROMINOES[this.currentType].colorIndex;
            ctx.fillStyle = t.pieces[colorIdx] + '30';
            ctx.strokeStyle = t.pieces[colorIdx] + '60';
            ctx.lineWidth = 1;

            for (const [r, c] of shape) {
                const gr = ghostY + r;
                const gc = this.pieceX + c;
                if (gr >= 0 && gr < this.rows && gc >= 0 && gc < this.cols) {
                    const x = this.gridX + gc * cs;
                    const y = this.gridY + gr * cs;
                    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
                    ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
                }
            }

            // Current piece
            const pieceColor = t.pieces[colorIdx];
            ctx.fillStyle = pieceColor;

            for (const [r, c] of shape) {
                const gr = this.pieceY + r;
                const gc = this.pieceX + c;
                if (gr >= 0 && gr < this.rows && gc >= 0 && gc < this.cols) {
                    const x = this.gridX + gc * cs;
                    const y = this.gridY + gr * cs;
                    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

                    // Highlight
                    ctx.fillStyle = '#ffffff25';
                    ctx.fillRect(x + 1, y + 1, cs - 2, (cs - 2) * 0.3);
                    ctx.fillStyle = pieceColor;
                }
            }
        }

        // Grid border
        ctx.strokeStyle = t.primary + '80';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.gridX, this.gridY, this.cols * cs, this.rows * cs);

        // Side panel
        const panelX = this.gridX + this.cols * cs + 16;

        // Next piece
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('NEXT', panelX, this.gridY);

        const nextShape = TETROMINOES[this.nextPiece].shapes[0];
        const nextColor = t.pieces[TETROMINOES[this.nextPiece].colorIndex];
        const previewCS = cs * 0.8;

        ctx.fillStyle = t.grid;
        ctx.fillRect(panelX, this.gridY + 20, previewCS * 4 + 4, previewCS * 4 + 4);

        ctx.fillStyle = nextColor;
        for (const [r, c] of nextShape) {
            ctx.fillRect(
                panelX + 2 + c * previewCS + 1,
                this.gridY + 22 + r * previewCS + 1,
                previewCS - 2,
                previewCS - 2
            );
        }

        // Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 14px monospace';
        ctx.fillText('SCORE', panelX, this.gridY + 110);
        ctx.fillStyle = t.secondary;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${this.score}`, panelX, this.gridY + 128);

        // Level
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 14px monospace';
        ctx.fillText('LEVEL', panelX, this.gridY + 160);
        ctx.fillStyle = t.secondary;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${this.level}`, panelX, this.gridY + 178);

        // Lines
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 14px monospace';
        ctx.fillText('LINES', panelX, this.gridY + 210);
        ctx.fillStyle = t.secondary;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`${this.linesCleared}`, panelX, this.gridY + 228);

        // Controls hint
        ctx.fillStyle = t.secondary + '60';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        const hintX = this.gridX + (this.cols * cs) / 2;
        ctx.fillText('Left/Right: Move  Up/Z: Rotate', hintX, this.gridY + this.rows * cs + 14);
        ctx.fillText('Down: Soft Drop  Space: Hard Drop', hintX, this.gridY + this.rows * cs + 28);

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

            ctx.font = '16px monospace';
            ctx.fillText(`Lines: ${this.linesCleared}  Level: ${this.level}`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const startSpeeds = ['slow', 'medium', 'fast'];
    const gridWidths = [8, 10, 12];
    const gridHeights = [16, 20, 24];
    let seed = 1;

    for (const theme of themes) {
        for (const startSpeed of startSpeeds) {
            for (const gridWidth of gridWidths) {
                const gridHeight = gridHeights[seed % gridHeights.length];

                variations.push({
                    name: generateGameName('Tetris', seed),
                    category: 'Tetris',
                    config: {
                        startSpeed,
                        gridWidth,
                        gridHeight,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Tetris', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 3 * 3 = 72 base

    // More combos with explicit height variations
    for (const theme of themes) {
        for (const gridHeight of gridHeights) {
            for (const gridWidth of gridWidths) {
                const startSpeed = startSpeeds[seed % startSpeeds.length];
                variations.push({
                    name: generateGameName('Tetris', seed),
                    category: 'Tetris',
                    config: {
                        startSpeed,
                        gridWidth,
                        gridHeight,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Tetris', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // + 8 * 3 * 3 = 72 => 144 total

    // Top up to ~150
    while (variations.length < 150) {
        const theme = themes[seed % themes.length];
        const startSpeed = startSpeeds[seed % startSpeeds.length];
        const gridWidth = gridWidths[(seed + 1) % gridWidths.length];
        const gridHeight = gridHeights[(seed + 2) % gridHeights.length];

        variations.push({
            name: generateGameName('Tetris', seed),
            category: 'Tetris',
            config: { startSpeed, gridWidth, gridHeight, theme, seed },
            thumbnail: generateThumbnail('Tetris', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Tetris', TetrisGame, generateVariations);
