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
    { name: 'Sketchbook', primary: '#2d3436', secondary: '#636e72', bg: '#fafafa', canvas: '#ffffff', ui: '#dfe6e9', text: '#2d3436', accent: '#0984e3' },
    { name: 'Neon',       primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', canvas: '#161650', ui: '#1e1e5e', text: '#60efff', accent: '#ff006e' },
    { name: 'Sunset',     primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', canvas: '#2a1020', ui: '#3a1530', text: '#ffcc5c', accent: '#ff6f61' },
    { name: 'Ocean',      primary: '#0984e3', secondary: '#74b9ff', bg: '#03045e', canvas: '#0a1050', ui: '#0a0a6e', text: '#90e0ef', accent: '#00b4d8' },
    { name: 'Candy',      primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', canvas: '#3b0022', ui: '#4b0032', text: '#ffb6c1', accent: '#00ff7f' },
    { name: 'Forest',     primary: '#00b894', secondary: '#55efc4', bg: '#0a2a1a', canvas: '#0f3520', ui: '#153f28', text: '#55efc4', accent: '#fdcb6e' },
    { name: 'Lava',       primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', canvas: '#2a1500', ui: '#3a2000', text: '#ffd700', accent: '#ff4500' },
    { name: 'Frost',      primary: '#a5b1c2', secondary: '#d1d8e0', bg: '#0a1628', canvas: '#122240', ui: '#1a2a50', text: '#d1d8e0', accent: '#74b9ff' },
];

// ── Drawing Prompts ─────────────────────────────────────────────────────
const promptSets = {
    nature: [
        'tree', 'sun', 'flower', 'mountain', 'cloud', 'rainbow', 'mushroom',
        'moon', 'lightning', 'river', 'leaf', 'cactus', 'waterfall', 'island',
    ],
    animals: [
        'cat', 'dog', 'fish', 'bird', 'butterfly', 'snake', 'dragon',
        'rabbit', 'turtle', 'whale', 'spider', 'penguin', 'frog', 'owl',
    ],
    vehicles: [
        'car', 'boat', 'rocket', 'bicycle', 'airplane', 'train',
        'helicopter', 'submarine', 'skateboard', 'hot air balloon',
    ],
    food: [
        'apple', 'pizza', 'ice cream', 'cupcake', 'banana', 'hamburger',
        'donut', 'watermelon', 'cookie', 'lollipop',
    ],
    objects: [
        'house', 'star', 'heart', 'robot', 'guitar', 'crown', 'key',
        'castle', 'sword', 'book', 'clock', 'umbrella', 'hat', 'shoe',
        'hammer', 'skull', 'candle', 'trophy',
    ],
};

// ── Color Palettes ──────────────────────────────────────────────────────
const colorSchemes = {
    classic:  ['#000000', '#ff0000', '#0000ff', '#008000', '#ffff00', '#ff8c00', '#800080', '#8b4513'],
    pastel:   ['#4a4a4a', '#ff6b6b', '#74b9ff', '#55efc4', '#ffeaa7', '#fab1a0', '#a29bfe', '#dfe6e9'],
    neon:     ['#ffffff', '#ff006e', '#00bbf9', '#00f5d4', '#fee440', '#ff5400', '#9b5de5', '#f15bb5'],
    earth:    ['#2d3436', '#d63031', '#0984e3', '#00b894', '#fdcb6e', '#e17055', '#6c5ce7', '#b2bec3'],
    rainbow:  ['#000000', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#e67e22', '#9b59b6', '#1abc9c'],
    vintage:  ['#3c3c3c', '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#d35400', '#8e44ad', '#7f8c8d'],
    bold:     ['#1a1a1a', '#ff1744', '#2979ff', '#00e676', '#ffea00', '#ff9100', '#d500f9', '#00e5ff'],
    warm:     ['#4a3728', '#cc3300', '#cc6600', '#336633', '#cc9900', '#ff6633', '#993366', '#996633'],
};

// ── Brush sizes ─────────────────────────────────────────────────────────
const BRUSH_SMALL  = 3;
const BRUSH_MEDIUM = 6;
const BRUSH_LARGE  = 10;

// ── DrawingGame ─────────────────────────────────────────────────────────
class DrawingGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Time limit per round
        this.timeLimit = cfg.timeLimit || 20;

        // Brush sizes available
        const brushSizeCount = cfg.brushSizes || 3;
        this.brushSizes = brushSizeCount >= 3
            ? [BRUSH_SMALL, BRUSH_MEDIUM, BRUSH_LARGE]
            : [BRUSH_SMALL, BRUSH_LARGE];

        // Color palette
        const schemeKey = cfg.colorScheme || 'classic';
        this.colors = colorSchemes[schemeKey] || colorSchemes.classic;

        // Build prompts from config prompt set
        const setName = cfg.prompts || 'objects';
        let prompts = [];
        if (setName === 'mixed') {
            for (const key of Object.keys(promptSets)) {
                prompts = prompts.concat(promptSets[key]);
            }
        } else {
            prompts = promptSets[setName] || promptSets.objects;
        }
        // Shuffle prompts deterministically
        this.allPrompts = prompts.slice();
        for (let i = this.allPrompts.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [this.allPrompts[i], this.allPrompts[j]] = [this.allPrompts[j], this.allPrompts[i]];
        }

        // Drawing area (centered white/light rectangle)
        const margin = 20;
        const topBarHeight = 50;
        const bottomBarHeight = 70;
        this.drawAreaX = margin;
        this.drawAreaY = topBarHeight;
        this.drawAreaW = W - margin * 2;
        this.drawAreaH = H - topBarHeight - bottomBarHeight;

        // Current brush state
        this.currentColor = this.colors[0];
        this.currentBrushSize = this.brushSizes.length >= 2 ? this.brushSizes[1] : this.brushSizes[0];

        // Drawing state
        this.isDrawing = false;
        this.strokes = [];         // array of stroke objects: { color, size, points[] }
        this.currentStroke = null;

        // Game state
        this.totalRounds = 5;
        this.currentRound = 0;
        this.roundScores = [];
        this.state = 'drawing';    // drawing, reviewing, rating, finished
        this.stateTimer = 0;
        this.timeLeft = this.timeLimit;

        // Rating state
        this.selectedRating = 0;
        this.hoverRating = 0;

        // UI button positions (computed once)
        this.colorButtons = [];
        this.sizeButtons = [];
        this.starButtons = [];
        this.computeButtonPositions();

        // Current prompt
        this.currentPrompt = this.allPrompts[this.currentRound % this.allPrompts.length];

        // Custom mouse event handlers for drawing
        this._onMouseDown = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleMouseDown(x, y);
        };
        this._onMouseUp = () => {
            this.handleMouseUp();
        };

        this.canvas.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mouseup', this._onMouseUp);
    }

    stop() {
        super.stop();
        if (this._onMouseDown) {
            this.canvas.removeEventListener('mousedown', this._onMouseDown);
        }
        if (this._onMouseUp) {
            window.removeEventListener('mouseup', this._onMouseUp);
        }
    }

    computeButtonPositions() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const bottomY = this.drawAreaY + this.drawAreaH + 10;

        // Color buttons — 8 colors evenly spaced
        const colorBtnSize = 20;
        const colorSpacing = 6;
        const totalColorW = this.colors.length * colorBtnSize + (this.colors.length - 1) * colorSpacing;
        const colorStartX = W / 2 - totalColorW / 2;

        this.colorButtons = [];
        for (let i = 0; i < this.colors.length; i++) {
            this.colorButtons.push({
                x: colorStartX + i * (colorBtnSize + colorSpacing),
                y: bottomY,
                w: colorBtnSize,
                h: colorBtnSize,
                color: this.colors[i],
            });
        }

        // Size buttons — to the right of colors
        const sizeBtnW = 28;
        const sizeSpacing = 6;
        const sizeStartX = colorStartX + totalColorW + 20;

        this.sizeButtons = [];
        for (let i = 0; i < this.brushSizes.length; i++) {
            this.sizeButtons.push({
                x: sizeStartX + i * (sizeBtnW + sizeSpacing),
                y: bottomY,
                w: sizeBtnW,
                h: colorBtnSize,
                size: this.brushSizes[i],
            });
        }

        // Star rating buttons (shown during rating phase)
        const starSize = 36;
        const starSpacing = 8;
        const totalStarW = 5 * starSize + 4 * starSpacing;
        const starStartX = W / 2 - totalStarW / 2;
        const starY = H / 2 + 20;

        this.starButtons = [];
        for (let i = 0; i < 5; i++) {
            this.starButtons.push({
                x: starStartX + i * (starSize + starSpacing),
                y: starY,
                w: starSize,
                h: starSize,
                value: i + 1,
            });
        }
    }

    handleMouseDown(x, y) {
        if (this.gameOver) return;
        if (this.state !== 'drawing') return;

        // Check if click is in draw area
        if (this.isInsideDrawArea(x, y)) {
            this.isDrawing = true;
            this.currentStroke = {
                color: this.currentColor,
                size: this.currentBrushSize,
                points: [{ x, y }],
            };
            this.strokes.push(this.currentStroke);
        }
    }

    handleMouseUp() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.currentStroke = null;
        }
    }

    isInsideDrawArea(x, y) {
        return x >= this.drawAreaX && x <= this.drawAreaX + this.drawAreaW &&
               y >= this.drawAreaY && y <= this.drawAreaY + this.drawAreaH;
    }

    isInsideRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.w &&
               y >= rect.y && y <= rect.y + rect.h;
    }

    onClick(x, y) {
        if (this.gameOver) return;

        if (this.state === 'drawing') {
            // Check color buttons
            for (const btn of this.colorButtons) {
                if (this.isInsideRect(x, y, btn)) {
                    this.currentColor = btn.color;
                    return;
                }
            }

            // Check size buttons
            for (const btn of this.sizeButtons) {
                if (this.isInsideRect(x, y, btn)) {
                    this.currentBrushSize = btn.size;
                    return;
                }
            }
        }

        if (this.state === 'rating') {
            // Check star buttons
            for (const btn of this.starButtons) {
                if (this.isInsideRect(x, y, btn)) {
                    this.selectedRating = btn.value;
                    this.submitRating();
                    return;
                }
            }
        }
    }

    onMouseMove(x, y) {
        if (this.gameOver) return;

        // Drawing
        if (this.state === 'drawing' && this.isDrawing && this.currentStroke) {
            // Clamp to draw area
            const cx = Math.max(this.drawAreaX, Math.min(this.drawAreaX + this.drawAreaW, x));
            const cy = Math.max(this.drawAreaY, Math.min(this.drawAreaY + this.drawAreaH, y));
            this.currentStroke.points.push({ x: cx, y: cy });
        }

        // Hover detection for stars
        if (this.state === 'rating') {
            this.hoverRating = 0;
            for (const btn of this.starButtons) {
                if (this.isInsideRect(x, y, btn)) {
                    this.hoverRating = btn.value;
                    break;
                }
            }
        }
    }

    submitRating() {
        const bonus = Math.max(1, Math.ceil(this.timeLimit / 10));
        const roundScore = this.selectedRating * bonus;
        this.roundScores.push(roundScore);
        this.score += roundScore;

        this.currentRound++;
        if (this.currentRound >= this.totalRounds) {
            this.state = 'finished';
            this.endGame();
        } else {
            // Next round
            this.strokes = [];
            this.currentStroke = null;
            this.isDrawing = false;
            this.selectedRating = 0;
            this.hoverRating = 0;
            this.timeLeft = this.timeLimit;
            this.currentPrompt = this.allPrompts[this.currentRound % this.allPrompts.length];
            this.state = 'drawing';
        }
    }

    update(dt) {
        if (this.state === 'drawing') {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.isDrawing = false;
                this.currentStroke = null;
                this.state = 'reviewing';
                this.stateTimer = 2.0;
            }
        }

        if (this.state === 'reviewing') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'rating';
                this.hoverRating = 0;
                this.selectedRating = 0;
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

        // Drawing area background
        ctx.fillStyle = t.canvas;
        ctx.fillRect(this.drawAreaX, this.drawAreaY, this.drawAreaW, this.drawAreaH);

        // Drawing area border
        ctx.strokeStyle = t.secondary + '80';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.drawAreaX, this.drawAreaY, this.drawAreaW, this.drawAreaH);

        // Render all strokes
        for (const stroke of this.strokes) {
            if (stroke.points.length < 2) {
                // Single dot
                if (stroke.points.length === 1) {
                    ctx.fillStyle = stroke.color;
                    ctx.beginPath();
                    ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                continue;
            }

            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        }

        // Top bar: prompt and timer
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, this.drawAreaY);

        // Prompt text
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Draw a ${this.currentPrompt}!`, W / 2, 16);

        // Round indicator
        ctx.fillStyle = t.secondary;
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Round ${this.currentRound + 1}/${this.totalRounds}`, 12, 16);

        // Score
        ctx.fillStyle = t.secondary;
        ctx.font = '13px monospace';
        ctx.fillText(`Score: ${this.score}`, 12, 34);

        // Timer
        const timerColor = this.timeLeft > 5 ? t.accent : '#ff4444';
        ctx.fillStyle = timerColor;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(this.timeLeft)}s`, W - 12, 16);

        // Timer bar
        const timerBarY = this.drawAreaY - 4;
        const timerFrac = Math.max(0, this.timeLeft / this.timeLimit);
        ctx.fillStyle = t.ui;
        ctx.fillRect(this.drawAreaX, timerBarY, this.drawAreaW, 3);
        ctx.fillStyle = timerColor;
        ctx.fillRect(this.drawAreaX, timerBarY, this.drawAreaW * timerFrac, 3);

        // Bottom bar: tool palette
        if (this.state === 'drawing') {
            this.renderToolbar(ctx, W, H);
        }

        // Reviewing overlay
        if (this.state === 'reviewing') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("Time's up!", W / 2, this.drawAreaY / 2);

            ctx.fillStyle = t.secondary;
            ctx.font = '14px monospace';
            ctx.fillText('Reviewing your drawing...', W / 2, H - 30);
        }

        // Rating overlay
        if (this.state === 'rating') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, W, H);

            // Re-show the drawing through the overlay by drawing it again above
            ctx.fillStyle = t.canvas + 'dd';
            ctx.fillRect(this.drawAreaX, this.drawAreaY, this.drawAreaW, this.drawAreaH);
            for (const stroke of this.strokes) {
                if (stroke.points.length < 2) {
                    if (stroke.points.length === 1) {
                        ctx.fillStyle = stroke.color;
                        ctx.beginPath();
                        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    continue;
                }
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
                ctx.stroke();
            }

            // Rating prompt
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Rate your drawing!', W / 2, this.starButtons[0].y - 30);

            // Star buttons
            const displayRating = this.hoverRating || this.selectedRating;
            for (const btn of this.starButtons) {
                const filled = btn.value <= displayRating;
                ctx.fillStyle = filled ? '#ffd700' : t.ui + '80';
                ctx.font = `${btn.w - 4}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(filled ? '\u2605' : '\u2606', btn.x + btn.w / 2, btn.y + btn.h / 2);
            }

            // Rating label
            if (displayRating > 0) {
                const labels = ['Poor', 'Okay', 'Good', 'Great', 'Amazing!'];
                ctx.fillStyle = t.secondary;
                ctx.font = '14px monospace';
                ctx.fillText(labels[displayRating - 1], W / 2, this.starButtons[0].y + this.starButtons[0].h + 18);
            }
        }

        // Game Over / Finished
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('FINISHED!', W / 2, H / 2 - 60);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Total Score: ${this.score}`, W / 2, H / 2 - 15);

            // Round breakdown
            ctx.font = '14px monospace';
            for (let i = 0; i < this.roundScores.length; i++) {
                const prompt = this.allPrompts[i % this.allPrompts.length];
                ctx.fillText(`Round ${i + 1}: ${prompt} = ${this.roundScores[i]} pts`, W / 2, H / 2 + 20 + i * 20);
            }

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 130);
        }
    }

    renderToolbar(ctx, W, H) {
        const t = this.theme;

        // Color buttons
        for (const btn of this.colorButtons) {
            const isSelected = btn.color === this.currentColor;

            // Selection highlight
            if (isSelected) {
                ctx.strokeStyle = t.primary;
                ctx.lineWidth = 3;
                ctx.strokeRect(btn.x - 3, btn.y - 3, btn.w + 6, btn.h + 6);
            }

            // Color swatch
            ctx.fillStyle = btn.color;
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

            // Border
            ctx.strokeStyle = t.secondary + '60';
            ctx.lineWidth = 1;
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        }

        // Size buttons
        for (const btn of this.sizeButtons) {
            const isSelected = btn.size === this.currentBrushSize;

            // Background
            ctx.fillStyle = isSelected ? t.accent + '40' : t.ui + '40';
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 4);
            ctx.fill();

            // Border
            ctx.strokeStyle = isSelected ? t.accent : t.secondary + '60';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 4);
            ctx.stroke();

            // Size indicator (circle)
            ctx.fillStyle = t.primary;
            ctx.beginPath();
            ctx.arc(btn.x + btn.w / 2, btn.y + btn.h / 2, btn.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Labels
        ctx.fillStyle = t.secondary + '80';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const colorCenter = this.colorButtons[0].x + (this.colorButtons[this.colorButtons.length - 1].x + this.colorButtons[0].w - this.colorButtons[0].x) / 2;
        ctx.fillText('Colors', colorCenter, this.colorButtons[0].y + this.colorButtons[0].h + 4);
        if (this.sizeButtons.length > 0) {
            const sizeCenter = this.sizeButtons[0].x + (this.sizeButtons[this.sizeButtons.length - 1].x + this.sizeButtons[0].w - this.sizeButtons[0].x) / 2;
            ctx.fillText('Size', sizeCenter, this.sizeButtons[0].y + this.sizeButtons[0].h + 4);
        }

        // Drawing instructions (first round only, briefly)
        if (this.currentRound === 0 && this.timeLeft > this.timeLimit - 3) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Click and drag to draw', W / 2, H - 8);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const promptSetNames = ['nature', 'animals', 'vehicles', 'food', 'objects', 'mixed'];
    const timeLimits = [15, 20, 30];
    const brushSizeCounts = [2, 3];
    const colorSchemeNames = Object.keys(colorSchemes);
    let seed = 1;

    // Core combinations: themes x promptSets x timeLimits
    for (const theme of themes) {
        for (const prompts of promptSetNames) {
            for (const timeLimit of timeLimits) {
                const brushSizes = brushSizeCounts[seed % brushSizeCounts.length];
                const colorScheme = colorSchemeNames[seed % colorSchemeNames.length];

                variations.push({
                    name: generateGameName('Drawing', seed),
                    category: 'Drawing',
                    config: { prompts, timeLimit, brushSizes, colorScheme, theme, seed },
                    thumbnail: generateThumbnail('Drawing', { theme }, seed)
                });
                seed++;

                if (variations.length >= 100) break;
            }
            if (variations.length >= 100) break;
        }
        if (variations.length >= 100) break;
    }
    // 8 * 6 * 3 = 144, capped at 100

    // Top up if needed
    while (variations.length < 100) {
        const theme = themes[seed % themes.length];
        const prompts = promptSetNames[seed % promptSetNames.length];
        const timeLimit = timeLimits[seed % timeLimits.length];
        const brushSizes = brushSizeCounts[seed % brushSizeCounts.length];
        const colorScheme = colorSchemeNames[seed % colorSchemeNames.length];

        variations.push({
            name: generateGameName('Drawing', seed),
            category: 'Drawing',
            config: { prompts, timeLimit, brushSizes, colorScheme, theme, seed },
            thumbnail: generateThumbnail('Drawing', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Drawing', DrawingGame, generateVariations);
