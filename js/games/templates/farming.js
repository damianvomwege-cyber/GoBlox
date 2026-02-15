import { BaseGame } from '../base-game.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import { drawCharacter } from '../character.js';

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
    { name: 'Spring',    primary: '#6ab04c', secondary: '#badc58', bg: '#1a2a10', soil: '#5a3a1a', grid: '#2a3a15', water: '#74b9ff', sun: '#ffd700' },
    { name: 'Summer',    primary: '#f9ca24', secondary: '#f0932b', bg: '#2a1a00', soil: '#6b4226', grid: '#3a2a10', water: '#54a0ff', sun: '#ffdd59' },
    { name: 'Autumn',    primary: '#e17055', secondary: '#fdcb6e', bg: '#1a1008', soil: '#4a2a10', grid: '#2a1a08', water: '#74b9ff', sun: '#ffbe76' },
    { name: 'Winter',    primary: '#dfe6e9', secondary: '#b2bec3', bg: '#0a1a2a', soil: '#3a3a3a', grid: '#1a2a35', water: '#a5b1c2', sun: '#ffeaa7' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', soil: '#161650', grid: '#1a1a40', water: '#00d2ff', sun: '#fee440' },
    { name: 'Desert',    primary: '#f39c12', secondary: '#e74c3c', bg: '#1a1000', soil: '#8B7355', grid: '#2a2010', water: '#5dade2', sun: '#ffd700' },
    { name: 'Tropical',  primary: '#00cec9', secondary: '#55efc4', bg: '#002020', soil: '#654321', grid: '#003030', water: '#81ecec', sun: '#fdcb6e' },
    { name: 'Moonlit',   primary: '#a29bfe', secondary: '#6c5ce7', bg: '#0c0c20', soil: '#2a2a3a', grid: '#15152a', water: '#74b9ff', sun: '#d4d4ff' },
];

// ── Crop definitions ────────────────────────────────────────────────────
const CROP_DEFS = [
    { name: 'Wheat',    cost: 5,  value: 15,  growTime: 6,  color: '#f0c040', stages: ['#8B7355', '#90a040', '#c0c040', '#f0c040'] },
    { name: 'Carrot',   cost: 8,  value: 22,  growTime: 8,  color: '#ff8c00', stages: ['#8B7355', '#60a020', '#a0c040', '#ff8c00'] },
    { name: 'Tomato',   cost: 10, value: 30,  growTime: 10, color: '#ff4444', stages: ['#8B7355', '#40a040', '#80c040', '#ff4444'] },
    { name: 'Corn',     cost: 12, value: 38,  growTime: 12, color: '#ffd700', stages: ['#8B7355', '#50b030', '#90d050', '#ffd700'] },
    { name: 'Pumpkin',  cost: 18, value: 55,  growTime: 16, color: '#ff6600', stages: ['#8B7355', '#308020', '#60a030', '#ff6600'] },
];

// Growth stage names
const STAGE_NAMES = ['Seed', 'Sprout', 'Grown', 'Harvest'];

// ── FarmingGame ─────────────────────────────────────────────────────────
class FarmingGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Grid size
        const sizeMap = { '3x3': 3, '4x4': 4, '5x5': 5 };
        this.gridSize = sizeMap[cfg.plotCount] || 4;

        // Crop types available
        const cropCount = cfg.cropTypes || 4;
        this.crops = CROP_DEFS.slice(0, cropCount);

        // Grow speed multiplier
        const growMap = { slow: 0.7, medium: 1.0, fast: 1.5 };
        this.growSpeed = growMap[cfg.growSpeed] || 1.0;

        // Timer
        this.timeLimit = cfg.timeLimit || 90;
        this.timeLeft = this.timeLimit;

        // Currency
        this.currency = 30; // starting money

        // Tools: 0=plant, 1=water, 2=harvest
        this.selectedTool = 0;
        this.selectedCropIndex = 0;

        // Grid layout
        const gridPx = Math.min(W * 0.7, H * 0.55);
        this.cellSize = Math.floor(gridPx / this.gridSize);
        this.gridOffsetX = Math.floor((W - this.cellSize * this.gridSize) / 2);
        this.gridOffsetY = Math.floor(H * 0.12);

        // Plots
        this.plots = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                this.plots.push({
                    row: r,
                    col: c,
                    crop: null,         // null = empty, or { defIndex, stage, growth, watered, waterTimer }
                });
            }
        }

        // Tool buttons
        const toolBtnW = 65;
        const toolBtnH = 40;
        const toolAreaY = this.gridOffsetY + this.cellSize * this.gridSize + 15;
        this.toolButtons = [
            { x: 15, y: toolAreaY, w: toolBtnW, h: toolBtnH, label: 'Plant', tool: 0 },
            { x: 15 + toolBtnW + 8, y: toolAreaY, w: toolBtnW, h: toolBtnH, label: 'Water', tool: 1 },
            { x: 15 + (toolBtnW + 8) * 2, y: toolAreaY, w: toolBtnW, h: toolBtnH, label: 'Harvest', tool: 2 },
        ];

        // Crop selection buttons (shown when plant tool selected)
        this.cropButtons = [];
        const cropBtnW = 55;
        const cropBtnH = 50;
        const cropAreaY = toolAreaY + toolBtnH + 10;
        for (let i = 0; i < this.crops.length; i++) {
            this.cropButtons.push({
                x: 15 + i * (cropBtnW + 6),
                y: cropAreaY,
                w: cropBtnW,
                h: cropBtnH,
                cropIndex: i,
            });
        }

        // Particles
        this.particles = [];

        // Total earned (score = profit)
        this.totalEarned = 0;
    }

    getPlot(row, col) {
        return this.plots.find(p => p.row === row && p.col === col);
    }

    update(dt) {
        // Timer
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.score = this.totalEarned;
            this.endGame();
            return;
        }

        // Grow crops
        for (const plot of this.plots) {
            if (!plot.crop) continue;

            const def = this.crops[plot.crop.defIndex];
            const waterMult = plot.crop.watered ? 1.0 : 0.3;
            plot.crop.growth += dt * this.growSpeed * waterMult;

            // Update water timer
            if (plot.crop.watered) {
                plot.crop.waterTimer -= dt;
                if (plot.crop.waterTimer <= 0) {
                    plot.crop.watered = false;
                }
            }

            // Update stage
            const totalTime = def.growTime;
            const progress = plot.crop.growth / totalTime;

            if (progress >= 1.0) {
                plot.crop.stage = 3; // harvestable
            } else if (progress >= 0.6) {
                plot.crop.stage = 2; // grown
            } else if (progress >= 0.25) {
                plot.crop.stage = 1; // sprout
            } else {
                plot.crop.stage = 0; // seed
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (!p.text) p.vy += 100 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onClick(x, y) {
        if (this.gameOver) return;

        // Check tool buttons
        for (const btn of this.toolButtons) {
            if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                this.selectedTool = btn.tool;
                return;
            }
        }

        // Check crop selection buttons (when plant tool selected)
        if (this.selectedTool === 0) {
            for (const btn of this.cropButtons) {
                if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                    this.selectedCropIndex = btn.cropIndex;
                    return;
                }
            }
        }

        // Check grid click
        const gx = Math.floor((x - this.gridOffsetX) / this.cellSize);
        const gy = Math.floor((y - this.gridOffsetY) / this.cellSize);
        if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) return;

        const plot = this.getPlot(gy, gx);
        if (!plot) return;

        const plotCenterX = this.gridOffsetX + gx * this.cellSize + this.cellSize / 2;
        const plotCenterY = this.gridOffsetY + gy * this.cellSize + this.cellSize / 2;

        switch (this.selectedTool) {
            case 0: // Plant
                if (!plot.crop) {
                    const def = this.crops[this.selectedCropIndex];
                    if (this.currency >= def.cost) {
                        this.currency -= def.cost;
                        plot.crop = {
                            defIndex: this.selectedCropIndex,
                            stage: 0,
                            growth: 0,
                            watered: false,
                            waterTimer: 0,
                        };
                        // Plant particles
                        for (let i = 0; i < 3; i++) {
                            this.particles.push({
                                x: plotCenterX, y: plotCenterY,
                                vx: (this.rng() - 0.5) * 40,
                                vy: -this.rng() * 40 - 10,
                                life: 0.4, maxLife: 0.4,
                                color: this.theme.soil,
                            });
                        }
                    }
                }
                break;

            case 1: // Water
                if (plot.crop && plot.crop.stage < 3) {
                    plot.crop.watered = true;
                    plot.crop.waterTimer = 5; // watered for 5 seconds
                    // Water particles
                    for (let i = 0; i < 5; i++) {
                        this.particles.push({
                            x: plotCenterX + (this.rng() - 0.5) * this.cellSize * 0.6,
                            y: plotCenterY - 5,
                            vx: (this.rng() - 0.5) * 20,
                            vy: this.rng() * 30 + 10,
                            life: 0.5, maxLife: 0.5,
                            color: this.theme.water,
                        });
                    }
                }
                break;

            case 2: // Harvest
                if (plot.crop && plot.crop.stage === 3) {
                    const def = this.crops[plot.crop.defIndex];
                    this.currency += def.value;
                    this.totalEarned += def.value;
                    this.score = this.totalEarned;
                    plot.crop = null;

                    // Harvest particles
                    for (let i = 0; i < 8; i++) {
                        this.particles.push({
                            x: plotCenterX, y: plotCenterY,
                            vx: (this.rng() - 0.5) * 120,
                            vy: -this.rng() * 100 - 30,
                            life: 0.5, maxLife: 0.5,
                            color: def.color,
                        });
                    }
                    this.particles.push({
                        x: plotCenterX, y: plotCenterY - 20,
                        vx: 0, vy: -40,
                        life: 0.8, maxLife: 0.8,
                        color: this.theme.sun,
                        text: `+$${def.value}`,
                    });
                }
                break;
        }
    }

    onKeyDown(key) {
        if (this.gameOver) return;
        if (key === '1') this.selectedTool = 0;
        else if (key === '2') this.selectedTool = 1;
        else if (key === '3') this.selectedTool = 2;
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

        // Sun
        ctx.fillStyle = t.sun + '30';
        ctx.beginPath();
        ctx.arc(W - 50, 35, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = t.sun + '60';
        ctx.beginPath();
        ctx.arc(W - 50, 35, 15, 0, Math.PI * 2);
        ctx.fill();

        // Grid
        for (const plot of this.plots) {
            const px = this.gridOffsetX + plot.col * cs;
            const py = this.gridOffsetY + plot.row * cs;

            // Soil background
            ctx.fillStyle = t.soil;
            ctx.beginPath();
            ctx.roundRect(px + 2, py + 2, cs - 4, cs - 4, 4);
            ctx.fill();

            // Soil texture lines
            ctx.strokeStyle = t.soil + '80';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const ly = py + cs * 0.3 + i * cs * 0.2;
                ctx.beginPath();
                ctx.moveTo(px + 6, ly);
                ctx.lineTo(px + cs - 6, ly);
                ctx.stroke();
            }

            if (plot.crop) {
                const def = this.crops[plot.crop.defIndex];
                const stage = plot.crop.stage;
                const centerX = px + cs / 2;
                const centerY = py + cs / 2;

                // Watered indicator (wet soil)
                if (plot.crop.watered) {
                    ctx.fillStyle = t.water + '25';
                    ctx.beginPath();
                    ctx.roundRect(px + 2, py + 2, cs - 4, cs - 4, 4);
                    ctx.fill();
                }

                // Draw crop based on stage
                const stageColor = def.stages[stage];

                if (stage === 0) {
                    // Seed: small dot
                    ctx.fillStyle = stageColor;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY + cs * 0.1, cs * 0.08, 0, Math.PI * 2);
                    ctx.fill();
                } else if (stage === 1) {
                    // Sprout: small stem with tiny leaf
                    ctx.strokeStyle = stageColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY + cs * 0.2);
                    ctx.lineTo(centerX, centerY - cs * 0.05);
                    ctx.stroke();

                    ctx.fillStyle = stageColor;
                    ctx.beginPath();
                    ctx.ellipse(centerX + 4, centerY - cs * 0.05, 5, 3, 0.3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (stage === 2) {
                    // Grown: taller with leaves
                    ctx.strokeStyle = '#408020';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY + cs * 0.25);
                    ctx.lineTo(centerX, centerY - cs * 0.15);
                    ctx.stroke();

                    ctx.fillStyle = stageColor;
                    ctx.beginPath();
                    ctx.ellipse(centerX - 6, centerY - cs * 0.05, 7, 4, -0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(centerX + 6, centerY - cs * 0.1, 7, 4, 0.4, 0, Math.PI * 2);
                    ctx.fill();
                } else if (stage === 3) {
                    // Harvestable: full plant with fruit, pulsing glow
                    const pulse = 0.8 + Math.sin(performance.now() * 0.004) * 0.2;

                    // Glow
                    ctx.fillStyle = def.color + '30';
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, cs * 0.35 * pulse, 0, Math.PI * 2);
                    ctx.fill();

                    // Stem
                    ctx.strokeStyle = '#408020';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY + cs * 0.25);
                    ctx.lineTo(centerX, centerY - cs * 0.2);
                    ctx.stroke();

                    // Leaves
                    ctx.fillStyle = '#55aa30';
                    ctx.beginPath();
                    ctx.ellipse(centerX - 8, centerY, 8, 4, -0.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(centerX + 8, centerY - 3, 8, 4, 0.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Fruit
                    ctx.fillStyle = def.color;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY - cs * 0.18, cs * 0.12, 0, Math.PI * 2);
                    ctx.fill();

                    // Shine
                    ctx.fillStyle = '#ffffff40';
                    ctx.beginPath();
                    ctx.arc(centerX - 2, centerY - cs * 0.22, cs * 0.04, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Stage label
                ctx.fillStyle = '#ffffff80';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(STAGE_NAMES[stage], centerX, py + cs - 3);
            }
        }

        // Grid border
        ctx.strokeStyle = t.grid;
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.gridOffsetX - 1,
            this.gridOffsetY - 1,
            this.gridSize * cs + 2,
            this.gridSize * cs + 2
        );

        // Farmer character standing beside the grid
        const farmerX = this.gridOffsetX + this.gridSize * cs + 30;
        const farmerY = this.gridOffsetY + this.gridSize * cs - 10;
        const farmerItem = this.selectedTool === 0 ? 'hoe' : this.selectedTool === 1 ? 'basket' : 'hoe';
        if (farmerX + 30 < W) {
            drawCharacter(ctx, farmerX, farmerY, 50, 'left', farmerItem, 0);
        }

        // Grid lines
        ctx.strokeStyle = t.grid + '60';
        ctx.lineWidth = 1;
        for (let i = 1; i < this.gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(this.gridOffsetX + i * cs, this.gridOffsetY);
            ctx.lineTo(this.gridOffsetX + i * cs, this.gridOffsetY + this.gridSize * cs);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.gridOffsetX, this.gridOffsetY + i * cs);
            ctx.lineTo(this.gridOffsetX + this.gridSize * cs, this.gridOffsetY + i * cs);
            ctx.stroke();
        }

        // Tool buttons
        for (const btn of this.toolButtons) {
            const isSelected = this.selectedTool === btn.tool;
            ctx.fillStyle = isSelected ? t.primary + '50' : '#ffffff10';
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
            ctx.fill();

            ctx.strokeStyle = isSelected ? t.primary : '#ffffff30';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
            ctx.stroke();

            ctx.fillStyle = isSelected ? t.primary : '#ffffffaa';
            ctx.font = `${isSelected ? 'bold ' : ''}11px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 - 5);

            // Key hint
            ctx.fillStyle = '#ffffff40';
            ctx.font = '9px monospace';
            ctx.fillText(`[${btn.tool + 1}]`, btn.x + btn.w / 2, btn.y + btn.h / 2 + 10);
        }

        // Crop selection (when plant tool selected)
        if (this.selectedTool === 0) {
            for (const btn of this.cropButtons) {
                const def = this.crops[btn.cropIndex];
                const isSelected = this.selectedCropIndex === btn.cropIndex;
                const canAfford = this.currency >= def.cost;

                ctx.fillStyle = isSelected ? def.color + '40' : '#ffffff08';
                ctx.beginPath();
                ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
                ctx.fill();

                ctx.strokeStyle = isSelected ? def.color : (canAfford ? '#ffffff30' : '#ff444430');
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.beginPath();
                ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6);
                ctx.stroke();

                // Crop color circle
                ctx.fillStyle = canAfford ? def.color : def.color + '40';
                ctx.beginPath();
                ctx.arc(btn.x + btn.w / 2, btn.y + 15, 8, 0, Math.PI * 2);
                ctx.fill();

                // Name
                ctx.fillStyle = canAfford ? '#ffffffcc' : '#ffffff40';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(def.name, btn.x + btn.w / 2, btn.y + 27);

                // Cost
                ctx.fillStyle = canAfford ? t.sun : '#ff444488';
                ctx.font = '9px monospace';
                ctx.fillText(`$${def.cost}`, btn.x + btn.w / 2, btn.y + 37);
            }
        }

        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            if (p.text) {
                ctx.fillStyle = p.color;
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // HUD - Score / Currency
        ctx.fillStyle = t.sun;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`$${this.currency}`, 12, 10);

        ctx.fillStyle = t.secondary;
        ctx.font = '13px monospace';
        ctx.fillText(`Earned: $${this.totalEarned}`, 12, 34);

        // Timer
        ctx.fillStyle = this.timeLeft > 20 ? t.secondary : '#ff4444';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.ceil(this.timeLeft)}s`, W - 12, 10);

        // Current tool indicator
        const toolNames = ['Plant', 'Water', 'Harvest'];
        ctx.fillStyle = t.primary;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Tool: ${toolNames[this.selectedTool]}`, W / 2, 10);

        // Instructions
        if (this.totalEarned === 0 && this.timeLeft > this.timeLimit - 3) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Plant crops, water them, harvest when ready!', W / 2, H - 12);
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
            ctx.fillText(`Earned: $${this.totalEarned}`, W / 2, H / 2 + 5);

            ctx.font = '16px monospace';
            ctx.fillText(`Final Balance: $${this.currency}`, W / 2, H / 2 + 38);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 75);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const plotCounts = ['3x3', '4x4', '5x5'];
    const cropTypeCounts = [3, 4, 5];
    const growSpeeds = ['slow', 'medium', 'fast'];
    const timeLimits = [90, 120];
    let seed = 1;

    for (const theme of themes) {
        for (const plotCount of plotCounts) {
            for (const growSpeed of growSpeeds) {
                const cropTypes = cropTypeCounts[seed % cropTypeCounts.length];
                const timeLimit = timeLimits[seed % timeLimits.length];

                variations.push({
                    name: generateGameName('Farming', seed),
                    category: 'Farming',
                    config: { plotCount, cropTypes, growSpeed, timeLimit, theme, seed },
                    thumbnail: generateThumbnail('Farming', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 3 * 3 = 72

    // Top up to ~100
    while (variations.length < 100) {
        const theme = themes[seed % themes.length];
        const plotCount = plotCounts[seed % plotCounts.length];
        const cropTypes = cropTypeCounts[(seed + 1) % cropTypeCounts.length];
        const growSpeed = growSpeeds[(seed + 2) % growSpeeds.length];
        const timeLimit = timeLimits[seed % timeLimits.length];

        variations.push({
            name: generateGameName('Farming', seed),
            category: 'Farming',
            config: { plotCount, cropTypes, growSpeed, timeLimit, theme, seed },
            thumbnail: generateThumbnail('Farming', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Farming', FarmingGame, generateVariations);
