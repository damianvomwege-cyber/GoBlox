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
    { name: 'Classic',  primary: '#6c5ce7', secondary: '#a29bfe', bg: '#1a0a3e', cardBack: '#4834d4', cardFront: '#dfe6e9', text: '#ffffff' },
    { name: 'Ocean',    primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', cardBack: '#0077b6', cardFront: '#caf0f8', text: '#caf0f8' },
    { name: 'Rose',     primary: '#e84393', secondary: '#fd79a8', bg: '#2d0018', cardBack: '#c44569', cardFront: '#ffeef0', text: '#ffffff' },
    { name: 'Mint',     primary: '#00b894', secondary: '#55efc4', bg: '#0a2e1a', cardBack: '#009966', cardFront: '#e0fff0', text: '#dfe6e9' },
    { name: 'Sunset',   primary: '#e17055', secondary: '#fab1a0', bg: '#2d1b0e', cardBack: '#d35400', cardFront: '#ffeaa7', text: '#ffffff' },
    { name: 'Neon',     primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', cardBack: '#6c5ce7', cardFront: '#1a1a4e', text: '#00ff87' },
    { name: 'Royal',    primary: '#fdcb6e', secondary: '#f39c12', bg: '#1a0a2e', cardBack: '#6c5ce7', cardFront: '#2d1b4e', text: '#fdcb6e' },
    { name: 'Arctic',   primary: '#74b9ff', secondary: '#dfe6e9', bg: '#0c1021', cardBack: '#2d3436', cardFront: '#dfe6e9', text: '#74b9ff' },
];

// ── Symbol Drawing Functions ────────────────────────────────────────────
// Each draws a symbol centered at (0,0) within a radius
const symbolDrawers = [
    // Star
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
    },
    // Heart
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.3);
        ctx.bezierCurveTo(-r, -r * 0.3, -r * 0.5, -r, 0, -r * 0.4);
        ctx.bezierCurveTo(r * 0.5, -r, r, -r * 0.3, 0, r * 0.3);
        ctx.fill();
    },
    // Diamond
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.6, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.6, 0);
        ctx.closePath();
        ctx.fill();
    },
    // Circle
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
    },
    // Triangle
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.87, r * 0.5);
        ctx.lineTo(-r * 0.87, r * 0.5);
        ctx.closePath();
        ctx.fill();
    },
    // Square
    function(ctx, r, color) {
        ctx.fillStyle = color;
        const s = r * 0.7;
        ctx.fillRect(-s, -s, s * 2, s * 2);
    },
    // Moon (crescent)
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ctx.canvas ? '#1a0a3e' : '#1a0a3e'; // will be overridden
        ctx.beginPath();
        ctx.arc(r * 0.3, -r * 0.15, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
    },
    // Sun
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * r * 0.6, Math.sin(angle) * r * 0.6);
            ctx.lineTo(Math.cos(angle) * r * 0.9, Math.sin(angle) * r * 0.9);
            ctx.stroke();
        }
    },
    // Cross / Plus
    function(ctx, r, color) {
        ctx.fillStyle = color;
        const w = r * 0.3;
        ctx.fillRect(-w, -r * 0.8, w * 2, r * 1.6);
        ctx.fillRect(-r * 0.8, -w, r * 1.6, w * 2);
    },
    // Lightning bolt
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(r * 0.1, -r);
        ctx.lineTo(-r * 0.4, 0);
        ctx.lineTo(r * 0.1, -r * 0.1);
        ctx.lineTo(-r * 0.1, r);
        ctx.lineTo(r * 0.5, -r * 0.05);
        ctx.lineTo(0, r * 0.05);
        ctx.closePath();
        ctx.fill();
    },
    // Pentagon
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](Math.cos(angle) * r * 0.8, Math.sin(angle) * r * 0.8);
        }
        ctx.closePath();
        ctx.fill();
    },
    // Hexagon
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI) / 6 - Math.PI / 6;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](Math.cos(angle) * r * 0.8, Math.sin(angle) * r * 0.8);
        }
        ctx.closePath();
        ctx.fill();
    },
    // Arrow
    function(ctx, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.7, r * 0.2);
        ctx.lineTo(r * 0.25, r * 0.2);
        ctx.lineTo(r * 0.25, r);
        ctx.lineTo(-r * 0.25, r);
        ctx.lineTo(-r * 0.25, r * 0.2);
        ctx.lineTo(-r * 0.7, r * 0.2);
        ctx.closePath();
        ctx.fill();
    },
    // Ring / Donut
    function(ctx, r, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = r * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
    },
    // X / Cross mark
    function(ctx, r, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = r * 0.25;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.6);
        ctx.lineTo(r * 0.6, r * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.6, -r * 0.6);
        ctx.lineTo(-r * 0.6, r * 0.6);
        ctx.stroke();
        ctx.lineCap = 'butt';
    },
];

// Symbol colors (consistent vibrant colors)
const symbolColors = [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
    '#5f27cd', '#1dd1a1', '#ee5a24', '#0abde3', '#f368e0',
    '#10ac84', '#e74c3c', '#3498db', '#f39c12', '#9b59b6',
];

// ── MemoryGame ──────────────────────────────────────────────────────────
class MemoryGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);
        this.cols = cfg.gridCols;
        this.rows = cfg.gridRows;
        this.timeLimit = cfg.timeLimit; // 0 = unlimited
        this.timeLeft = this.timeLimit || 0;
        this.elapsed = 0;

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Card size
        const maxCardW = Math.floor((W - 40) / this.cols);
        const maxCardH = Math.floor((H - 100) / this.rows);
        this.cardSize = Math.min(maxCardW, maxCardH) - 4;
        this.cardGap = 4;
        const totalW = this.cols * (this.cardSize + this.cardGap) - this.cardGap;
        const totalH = this.rows * (this.cardSize + this.cardGap) - this.cardGap;
        this.gridOffsetX = Math.floor((W - totalW) / 2);
        this.gridOffsetY = Math.floor((H - totalH) / 2) + 15;

        // Generate card pairs
        const totalCards = this.cols * this.rows;
        const pairCount = Math.floor(totalCards / 2);
        this.totalPairs = pairCount;

        // Create symbol assignments (each symbol appears twice)
        const symbols = [];
        for (let i = 0; i < pairCount; i++) {
            symbols.push(i, i);
        }
        // If odd total, add one extra (will be a lonely card — still allowed)
        if (totalCards % 2 !== 0) {
            symbols.push(pairCount);
        }

        // Shuffle with seeded RNG
        for (let i = symbols.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
        }

        // Create cards grid
        this.cards = [];
        let idx = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.cards.push({
                    row: r, col: c,
                    symbol: symbols[idx],
                    faceUp: false,
                    matched: false,
                    flipProgress: 0, // 0 = face down, 1 = face up
                });
                idx++;
            }
        }

        // Game state
        this.flippedCards = [];     // currently face-up (max 2)
        this.pairsFound = 0;
        this.moves = 0;
        this.lockInput = false;     // while checking/flipping back
        this.flipBackTimer = 0;

        // Particles
        this.particles = [];
    }

    getCard(row, col) {
        return this.cards.find(c => c.row === row && c.col === col);
    }

    update(dt) {
        // Timer
        this.elapsed += dt;
        if (this.timeLimit > 0) {
            this.timeLeft = this.timeLimit - this.elapsed;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.endGame();
                return;
            }
        }

        // Flip-back timer
        if (this.lockInput && this.flipBackTimer > 0) {
            this.flipBackTimer -= dt;
            if (this.flipBackTimer <= 0) {
                // Flip the two non-matching cards back
                for (const card of this.flippedCards) {
                    card.faceUp = false;
                }
                this.flippedCards = [];
                this.lockInput = false;
            }
        }

        // Animate card flips
        for (const card of this.cards) {
            const target = (card.faceUp || card.matched) ? 1 : 0;
            const speed = 6; // flip speed
            if (card.flipProgress < target) {
                card.flipProgress = Math.min(1, card.flipProgress + speed * dt);
            } else if (card.flipProgress > target) {
                card.flipProgress = Math.max(0, card.flipProgress - speed * dt);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 150 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onClick(mx, my) {
        if (this.gameOver || this.lockInput) return;

        // Find which card was clicked
        for (const card of this.cards) {
            if (card.matched || card.faceUp) continue;

            const x = this.gridOffsetX + card.col * (this.cardSize + this.cardGap);
            const y = this.gridOffsetY + card.row * (this.cardSize + this.cardGap);

            if (mx >= x && mx <= x + this.cardSize && my >= y && my <= y + this.cardSize) {
                this.flipCard(card);
                return;
            }
        }
    }

    flipCard(card) {
        card.faceUp = true;
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.moves++;
            const [a, b] = this.flippedCards;

            if (a.symbol === b.symbol) {
                // Match!
                a.matched = true;
                b.matched = true;
                this.pairsFound++;
                this.score = this.pairsFound;

                // Spawn particles
                for (const mc of [a, b]) {
                    const cx = this.gridOffsetX + mc.col * (this.cardSize + this.cardGap) + this.cardSize / 2;
                    const cy = this.gridOffsetY + mc.row * (this.cardSize + this.cardGap) + this.cardSize / 2;
                    for (let i = 0; i < 6; i++) {
                        this.particles.push({
                            x: cx, y: cy,
                            vx: (Math.random() - 0.5) * 200,
                            vy: -50 - Math.random() * 150,
                            life: 0.6, maxLife: 0.6,
                            color: symbolColors[mc.symbol % symbolColors.length],
                        });
                    }
                }

                this.flippedCards = [];

                // Check win
                if (this.pairsFound >= this.totalPairs) {
                    this.endGame();
                }
            } else {
                // No match — flip back after delay
                this.lockInput = true;
                this.flipBackTimer = 1.0;
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

        // Draw cards
        for (const card of this.cards) {
            const x = this.gridOffsetX + card.col * (this.cardSize + this.cardGap);
            const y = this.gridOffsetY + card.row * (this.cardSize + this.cardGap);
            const cs = this.cardSize;
            const progress = card.flipProgress;

            // Flip animation: scale X from 1 -> 0 -> 1 with face change at 0.5
            const showFront = progress > 0.5;
            const scaleX = Math.abs(progress - 0.5) * 2; // 1 at 0 and 1, 0 at 0.5
            const drawW = cs * scaleX;
            const drawX = x + (cs - drawW) / 2;

            ctx.save();

            if (card.matched) {
                // Matched cards — slightly transparent
                ctx.globalAlpha = 0.6;
            }

            if (showFront) {
                // Card front (face up)
                ctx.fillStyle = t.cardFront;
                ctx.beginPath();
                ctx.roundRect(drawX, y, drawW, cs, 6);
                ctx.fill();

                // Draw symbol if sufficiently visible
                if (scaleX > 0.3) {
                    const sym = card.symbol;
                    const symIdx = sym % symbolDrawers.length;
                    const color = symbolColors[sym % symbolColors.length];
                    const symR = cs * 0.28;

                    ctx.save();
                    ctx.translate(x + cs / 2, y + cs / 2);
                    ctx.scale(scaleX, 1);

                    // For moon symbol, need bg color for cutout
                    if (symIdx === 6) {
                        // Moon special: override internal bg
                        const origFill = ctx.fillStyle;
                        symbolDrawers[symIdx](ctx, symR, color);
                        // Redraw cutout with card front color
                        ctx.fillStyle = t.cardFront;
                        ctx.beginPath();
                        ctx.arc(symR * 0.3, -symR * 0.15, symR * 0.65, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        symbolDrawers[symIdx](ctx, symR, color);
                    }

                    ctx.restore();
                }
            } else {
                // Card back (face down)
                ctx.fillStyle = t.cardBack;
                ctx.beginPath();
                ctx.roundRect(drawX, y, drawW, cs, 6);
                ctx.fill();

                // Pattern on back
                if (scaleX > 0.3) {
                    ctx.save();
                    ctx.translate(x + cs / 2, y + cs / 2);
                    ctx.scale(scaleX, 1);

                    ctx.strokeStyle = t.primary + '40';
                    ctx.lineWidth = 1;
                    // Diamond pattern
                    const s = cs * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(0, -s);
                    ctx.lineTo(s, 0);
                    ctx.lineTo(0, s);
                    ctx.lineTo(-s, 0);
                    ctx.closePath();
                    ctx.stroke();

                    ctx.fillStyle = t.primary + '30';
                    ctx.beginPath();
                    ctx.arc(0, 0, cs * 0.08, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }
            }

            // Card border
            ctx.strokeStyle = t.primary + '60';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(drawX, y, drawW, cs, 6);
            ctx.stroke();

            ctx.restore();
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

        // HUD
        ctx.fillStyle = t.text;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Pairs: ${this.pairsFound}/${this.totalPairs}`, 12, 10);

        ctx.fillStyle = t.text + '99';
        ctx.font = '14px monospace';
        ctx.fillText(`Moves: ${this.moves}`, 12, 34);

        // Timer
        if (this.timeLimit > 0) {
            ctx.fillStyle = this.timeLeft < 10 ? '#ff6b6b' : t.text;
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.ceil(this.timeLeft)}s`, W - 12, 10);
        } else {
            // Show elapsed time
            ctx.fillStyle = t.text + '99';
            ctx.font = '14px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.floor(this.elapsed)}s`, W - 12, 10);
        }

        // Instructions
        if (this.moves === 0) {
            ctx.fillStyle = t.text + 'aa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Click cards to find matching pairs', W / 2, H - 10);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            const won = this.pairsFound >= this.totalPairs;
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(won ? 'YOU WIN!' : 'TIME UP!', W / 2, H / 2 - 35);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 22px monospace';
            ctx.fillText(`Pairs: ${this.pairsFound}/${this.totalPairs}`, W / 2, H / 2 + 10);

            ctx.font = '16px monospace';
            ctx.fillText(`Moves: ${this.moves} | Time: ${Math.floor(this.elapsed)}s`, W / 2, H / 2 + 40);

            ctx.fillStyle = t.text + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 72);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const gridConfigs = [
        { cols: 4, rows: 3 },   // 12 cards = 6 pairs
        { cols: 4, rows: 4 },   // 16 cards = 8 pairs
        { cols: 5, rows: 4 },   // 20 cards = 10 pairs
        { cols: 6, rows: 5 },   // 30 cards = 15 pairs
    ];
    const timeLimits = [30, 60, 120, 0]; // 0 = unlimited
    let seed = 1;

    for (const grid of gridConfigs) {
        for (const timeLimit of timeLimits) {
            for (const theme of themes) {
                variations.push({
                    name: generateGameName('Memory', seed),
                    category: 'Memory',
                    config: {
                        gridCols: grid.cols,
                        gridRows: grid.rows,
                        timeLimit,
                        theme,
                        seed,
                    },
                    thumbnail: generateThumbnail('Memory', { theme }, seed),
                });
                seed++;
            }
        }
    }
    // 4 * 4 * 8 = 128 — add more by doubling some configs with different seeds
    for (const grid of gridConfigs) {
        for (const timeLimit of [60, 120]) {
            for (const theme of themes) {
                variations.push({
                    name: generateGameName('Memory', seed),
                    category: 'Memory',
                    config: {
                        gridCols: grid.cols,
                        gridRows: grid.rows,
                        timeLimit,
                        theme,
                        seed,
                    },
                    thumbnail: generateThumbnail('Memory', { theme }, seed),
                });
                seed++;
            }
        }
    }
    // 128 + 64 = 192
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Memory', MemoryGame, generateVariations);
