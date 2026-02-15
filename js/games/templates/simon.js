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
    { name: 'Classic',   primary: '#ffffff', secondary: '#aaaaaa', bg: '#1a1a2e', accent: '#ffcc00' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', accent: '#ff006e' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0020', accent: '#00ff7f' },
    { name: 'Ocean',     primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', accent: '#ffbe0b' },
    { name: 'Sunset',    primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', accent: '#ff006e' },
    { name: 'Forest',    primary: '#2ecc71', secondary: '#55efc4', bg: '#0a1a0a', accent: '#f39c12' },
    { name: 'Cosmic',    primary: '#a29bfe', secondary: '#dfe6e9', bg: '#0c0c20', accent: '#fd79a8' },
    { name: 'Minimal',   primary: '#ecf0f1', secondary: '#bdc3c7', bg: '#2c3e50', accent: '#e74c3c' },
];

// ── Pad colors (always 4) ───────────────────────────────────────────────
const PAD_COLORS = [
    { normal: '#cc3333', lit: '#ff6666', label: 'Red'    },
    { normal: '#3333cc', lit: '#6666ff', label: 'Blue'   },
    { normal: '#33cc33', lit: '#66ff66', label: 'Green'  },
    { normal: '#cccc33', lit: '#ffff66', label: 'Yellow' },
];

// ── Game states ─────────────────────────────────────────────────────────
const STATE_SHOWING  = 'showing';
const STATE_WAITING  = 'waiting';
const STATE_FLASH_OK = 'flash_ok';
const STATE_FAIL     = 'fail';

// ── SimonGame ───────────────────────────────────────────────────────────
class SimonGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        // Speed: how fast pads flash
        const speedMap = { slow: 0.8, medium: 0.5, fast: 0.3 };
        this.flashDuration = speedMap[cfg.speed] || 0.5;
        this.pauseDuration = this.flashDuration * 0.4;
        this.maxRounds = cfg.maxRounds || 30;

        const W = this.canvas.width;
        const H = this.canvas.height;
        this.centerX = W / 2;
        this.centerY = H / 2;

        // Pad geometry — 4 quadrant arcs
        this.padRadius = Math.min(W, H) * 0.35;
        this.innerRadius = this.padRadius * 0.22;
        this.pads = PAD_COLORS.map((c, i) => ({
            ...c,
            startAngle: (i * Math.PI) / 2 - Math.PI / 2,
            endAngle: ((i + 1) * Math.PI) / 2 - Math.PI / 2,
            isLit: false,
            clickFlash: 0,
        }));

        // Sequence
        this.sequence = [];
        this.playerIndex = 0;
        this.round = 0;

        // State machine
        this.state = STATE_SHOWING;
        this.showIndex = 0;
        this.showTimer = 0;
        this.isShowingPad = false;
        this.flashOkTimer = 0;

        // Pre-generate full sequence
        for (let i = 0; i < this.maxRounds + 5; i++) {
            this.sequence.push(Math.floor(this.rng() * 4));
        }

        // Start round 1 after a brief delay
        this.round = 1;
        this.startShowSequence();
    }

    startShowSequence() {
        this.state = STATE_SHOWING;
        this.showIndex = 0;
        this.showTimer = 0.6; // Initial pause before showing
        this.isShowingPad = false;
        // Clear all lit
        for (const p of this.pads) p.isLit = false;
    }

    padAtPoint(x, y) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.innerRadius || dist > this.padRadius) return -1;

        let angle = Math.atan2(dy, dx);
        // Shift so pad 0 starts at -PI/2
        angle += Math.PI / 2;
        if (angle < 0) angle += Math.PI * 2;

        const index = Math.floor((angle / (Math.PI * 2)) * 4);
        return Math.min(3, index);
    }

    onClick(x, y) {
        if (this.gameOver) return;
        if (this.state !== STATE_WAITING) return;

        const padIndex = this.padAtPoint(x, y);
        if (padIndex < 0) return;

        // Flash the clicked pad
        this.pads[padIndex].clickFlash = 0.3;

        // Check correctness
        if (padIndex === this.sequence[this.playerIndex]) {
            this.playerIndex++;
            if (this.playerIndex >= this.round) {
                // Round complete
                this.score = this.round;
                if (this.round >= this.maxRounds) {
                    // Win!
                    this.endGame();
                    return;
                }
                this.round++;
                this.state = STATE_FLASH_OK;
                this.flashOkTimer = 0.6;
            }
        } else {
            // Wrong!
            this.state = STATE_FAIL;
            this.flashOkTimer = 1.2;
        }
    }

    update(dt) {
        // Update click flashes
        for (const p of this.pads) {
            if (p.clickFlash > 0) p.clickFlash -= dt;
        }

        if (this.state === STATE_SHOWING) {
            this.showTimer -= dt;
            if (this.showTimer <= 0) {
                if (this.isShowingPad) {
                    // Turn off current pad, pause before next
                    this.pads[this.sequence[this.showIndex]].isLit = false;
                    this.showIndex++;
                    this.isShowingPad = false;

                    if (this.showIndex >= this.round) {
                        // Done showing, player's turn
                        this.state = STATE_WAITING;
                        this.playerIndex = 0;
                    } else {
                        this.showTimer = this.pauseDuration;
                    }
                } else {
                    // Light up next pad
                    this.pads[this.sequence[this.showIndex]].isLit = true;
                    this.isShowingPad = true;
                    this.showTimer = this.flashDuration;
                }
            }
        } else if (this.state === STATE_FLASH_OK) {
            this.flashOkTimer -= dt;
            if (this.flashOkTimer <= 0) {
                this.startShowSequence();
            }
        } else if (this.state === STATE_FAIL) {
            this.flashOkTimer -= dt;
            if (this.flashOkTimer <= 0) {
                this.endGame();
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

        // Draw pads
        for (let i = 0; i < 4; i++) {
            const pad = this.pads[i];
            const isLit = pad.isLit || pad.clickFlash > 0;

            ctx.fillStyle = isLit ? pad.lit : pad.normal;

            // Fail flash: make wrong pads flash red
            if (this.state === STATE_FAIL && Math.floor(this.flashOkTimer * 6) % 2 === 0) {
                ctx.fillStyle = pad.normal + '80';
            }

            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.arc(this.centerX, this.centerY, this.padRadius, pad.startAngle, pad.endAngle);
            ctx.closePath();
            ctx.fill();

            // Pad border
            ctx.strokeStyle = t.bg;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.arc(this.centerX, this.centerY, this.padRadius, pad.startAngle, pad.endAngle);
            ctx.closePath();
            ctx.stroke();

            // Glow when lit
            if (isLit) {
                ctx.fillStyle = pad.lit + '40';
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.centerY);
                ctx.arc(this.centerX, this.centerY, this.padRadius + 8, pad.startAngle, pad.endAngle);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Center circle
        ctx.fillStyle = t.bg;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.innerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff30';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Outer ring
        ctx.strokeStyle = '#ffffff20';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.padRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Round number in center
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${this.round}`, this.centerX, this.centerY);

        // HUD - Score / Round
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Round: ${this.round}`, 12, 12);

        ctx.fillStyle = t.secondary + 'cc';
        ctx.font = '14px monospace';
        ctx.fillText(`Best: ${this.score}`, 12, 38);

        // State indicator
        ctx.textAlign = 'center';
        ctx.fillStyle = t.accent || t.primary;
        ctx.font = 'bold 16px monospace';
        if (this.state === STATE_SHOWING) {
            ctx.fillText('Watch...', W / 2, 16);
        } else if (this.state === STATE_WAITING) {
            const remaining = this.round - this.playerIndex;
            ctx.fillText(`Your turn! (${remaining} left)`, W / 2, 16);
        } else if (this.state === STATE_FLASH_OK) {
            ctx.fillStyle = '#44ff44';
            ctx.fillText('Correct!', W / 2, 16);
        } else if (this.state === STATE_FAIL) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText('Wrong!', W / 2, 16);
        }

        // Sequence progress dots
        const dotY = H - 20;
        const maxDots = Math.min(this.round, 20);
        const dotStart = W / 2 - (maxDots * 12) / 2;
        for (let i = 0; i < maxDots; i++) {
            const dx = dotStart + i * 12 + 4;
            if (this.state === STATE_WAITING && i < this.playerIndex) {
                ctx.fillStyle = '#44ff44';
            } else if (this.state === STATE_SHOWING && i <= this.showIndex && this.isShowingPad) {
                ctx.fillStyle = t.accent || '#ffcc00';
            } else {
                ctx.fillStyle = '#ffffff30';
            }
            ctx.beginPath();
            ctx.arc(dx, dotY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Instructions
        if (this.round <= 1 && this.state === STATE_SHOWING) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Click the colored pads in the right order', W / 2, H - 40);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (this.round > this.maxRounds) {
                ctx.fillText('YOU WIN!', W / 2, H / 2 - 30);
            } else {
                ctx.fillText('GAME OVER', W / 2, H / 2 - 30);
            }

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Rounds: ${this.score}`, W / 2, H / 2 + 15);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 55);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const speeds = ['slow', 'medium', 'fast'];
    const maxRoundsOptions = [20, 30, 50];
    let seed = 1;

    for (const speed of speeds) {
        for (const maxRounds of maxRoundsOptions) {
            for (const theme of themes) {
                variations.push({
                    name: generateGameName('Simon Says', seed),
                    category: 'Simon Says',
                    config: {
                        colorCount: 4,
                        speed,
                        maxRounds,
                        theme,
                        seed,
                    },
                    thumbnail: generateThumbnail('Simon Says', { theme }, seed),
                });
                seed++;
            }
        }
    }
    // Pad with extra seeds to hit ~100
    while (variations.length < 100) {
        const speed = speeds[seed % speeds.length];
        const maxRounds = maxRoundsOptions[seed % maxRoundsOptions.length];
        const theme = themes[seed % themes.length];
        variations.push({
            name: generateGameName('Simon Says', seed),
            category: 'Simon Says',
            config: {
                colorCount: 4,
                speed,
                maxRounds,
                theme,
                seed,
            },
            thumbnail: generateThumbnail('Simon Says', { theme }, seed),
        });
        seed++;
    }
    // 3 * 3 * 8 = 72, then padded to 100
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Simon', SimonGame, generateVariations);
