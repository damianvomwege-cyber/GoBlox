import { BaseGame } from '../base-game.js';
import { BaseGame3D, mulberry32 as mulberry32_3d } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import { drawCharacter } from '../character.js';
import * as THREE from 'three';

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

// ══════════════════════════════════════════════════════════════════════════
// 3D FarmingGame — Farm plot management in 3D
// ══════════════════════════════════════════════════════════════════════════
class FarmingGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32_3d(cfg.seed || 1);

        // Grid size
        const sizeMap = { '3x3': 3, '4x4': 4, '5x5': 5 };
        this.gridSize = sizeMap[cfg.plotCount] || 4;

        // Crop types
        const cropCount = cfg.cropTypes || 4;
        this.crops = CROP_DEFS.slice(0, cropCount);

        // Grow speed
        const growMap = { slow: 0.7, medium: 1.0, fast: 1.5 };
        this.growSpeed = growMap[cfg.growSpeed] || 1.0;

        // Timer
        this.timeLimit = cfg.timeLimit || 90;
        this.timeLeft = this.timeLimit;

        // Currency
        this.currency = 30;
        this.totalEarned = 0;

        // Tool selection
        this.selectedTool = 0; // 0=plant, 1=water, 2=harvest
        this.selectedCropIndex = 0;

        // Plot spacing
        this.plotSize = 2.5;
        this.plotGap = 0.3;
        this.plotStep = this.plotSize + this.plotGap;
        this.gridOffset = -(this.gridSize * this.plotStep) / 2 + this.plotStep / 2;

        // Build world
        this.createSky(0x87ceeb, 0xe0f7fa, 0xaaccaa, 40, 150);
        this.createGroundPlane(0x5a8a3a, 100);

        // Build farm
        this.buildFarmPlots();
        this.buildFence();
        this.buildBarn();
        this.buildEnvironment();

        // Place player near center
        this.playerPosition.set(0, 0, this.gridSize * this.plotStep / 2 + 2);
        this.moveSpeed = 6;

        // Camera: slightly overhead for farm view
        this.cameraAngleY = 0.6;
        this.cameraDistance = 12;

        // Nearest plot tracking
        this.nearestPlot = null;
        this.nearestPlotDist = Infinity;

        // HUD
        this.createHUD();
        this.createFarmHUD();
    }

    buildFarmPlots() {
        this.plots3D = [];

        const soilMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.95, metalness: 0.0 });
        const soilGeo = new THREE.BoxGeometry(this.plotSize, 0.15, this.plotSize);

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = this.gridOffset + c * this.plotStep;
                const z = this.gridOffset + r * this.plotStep;

                // Soil block
                const soil = new THREE.Mesh(soilGeo, soilMat.clone());
                soil.position.set(x, 0.075, z);
                soil.receiveShadow = true;
                soil.castShadow = true;
                this.scene.add(soil);

                // Soil furrow lines
                const furrowGeo = new THREE.BoxGeometry(this.plotSize - 0.2, 0.02, 0.06);
                const furrowMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.95 });
                for (let f = 0; f < 3; f++) {
                    const furrow = new THREE.Mesh(furrowGeo, furrowMat);
                    furrow.position.set(x, 0.16, z - 0.6 + f * 0.6);
                    this.scene.add(furrow);
                }

                // Highlight ring (shown when nearby)
                const ringGeo = new THREE.TorusGeometry(this.plotSize * 0.55, 0.04, 6, 24);
                const ringMat = new THREE.MeshStandardMaterial({
                    color: 0x44ff44,
                    emissive: 0x22aa22,
                    emissiveIntensity: 0.5,
                    transparent: true,
                    opacity: 0,
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = -Math.PI / 2;
                ring.position.set(x, 0.2, z);
                this.scene.add(ring);

                // Crop visual group (populated when planted)
                const cropGroup = new THREE.Group();
                cropGroup.position.set(x, 0.15, z);
                this.scene.add(cropGroup);

                // Water indicator
                const waterGeo = new THREE.PlaneGeometry(this.plotSize - 0.2, this.plotSize - 0.2);
                const waterMat = new THREE.MeshStandardMaterial({
                    color: 0x4488ff,
                    transparent: true,
                    opacity: 0,
                    side: THREE.DoubleSide,
                });
                const waterOverlay = new THREE.Mesh(waterGeo, waterMat);
                waterOverlay.rotation.x = -Math.PI / 2;
                waterOverlay.position.set(x, 0.17, z);
                this.scene.add(waterOverlay);

                this.plots3D.push({
                    row: r,
                    col: c,
                    x, z,
                    soilMesh: soil,
                    ringMesh: ring,
                    cropGroup,
                    waterOverlay,
                    crop: null,
                    lastStage: -1,
                });
            }
        }
    }

    buildFence() {
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.85 });
        const half = (this.gridSize * this.plotStep) / 2 + 1.5;
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
        const railGeo = new THREE.BoxGeometry(0.06, 0.06, 1);

        // Build fence along 4 sides
        const sides = [
            { start: [-half, -half], end: [half, -half], axis: 'x' },
            { start: [-half, half], end: [half, half], axis: 'x' },
            { start: [-half, -half], end: [-half, half], axis: 'z' },
            { start: [half, -half], end: [half, half], axis: 'z' },
        ];

        for (const side of sides) {
            const dx = side.end[0] - side.start[0];
            const dz = side.end[1] - side.start[1];
            const length = Math.sqrt(dx * dx + dz * dz);
            const postCount = Math.floor(length / 2) + 1;

            for (let i = 0; i < postCount; i++) {
                const t = i / (postCount - 1);
                const px = side.start[0] + dx * t;
                const pz = side.start[1] + dz * t;

                const post = new THREE.Mesh(postGeo, fenceMat);
                post.position.set(px, 0.6, pz);
                post.castShadow = true;
                this.scene.add(post);
            }

            // Horizontal rails
            const angle = Math.atan2(dz, dx);
            for (const railY of [0.4, 0.8]) {
                const rail = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, 0.06, length),
                    fenceMat
                );
                rail.position.set(
                    (side.start[0] + side.end[0]) / 2,
                    railY,
                    (side.start[1] + side.end[1]) / 2
                );
                rail.rotation.y = angle;
                this.scene.add(rail);
            }
        }

        // Gate opening on one side
        // (We leave a gap in the +z fence - already looks fine with the fence as is)
    }

    buildBarn() {
        const barnX = (this.gridSize * this.plotStep) / 2 + 6;
        const barnZ = 0;

        // Barn body
        const bodyGeo = new THREE.BoxGeometry(5, 4, 6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8B2500, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(barnX, 2, barnZ);
        body.castShadow = true;
        this.scene.add(body);

        // Barn roof (triangular prism approximated with boxes)
        const roofGeo = new THREE.BoxGeometry(5.5, 0.2, 6.5);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a2a0a, roughness: 0.9 });
        const roofLeft = new THREE.Mesh(roofGeo, roofMat);
        roofLeft.position.set(barnX - 0.8, 4.6, barnZ);
        roofLeft.rotation.z = 0.45;
        roofLeft.castShadow = true;
        this.scene.add(roofLeft);

        const roofRight = new THREE.Mesh(roofGeo, roofMat);
        roofRight.position.set(barnX + 0.8, 4.6, barnZ);
        roofRight.rotation.z = -0.45;
        roofRight.castShadow = true;
        this.scene.add(roofRight);

        // Barn door
        const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.1);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a1a00, roughness: 0.85 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(barnX, 1.25, barnZ - 3.05);
        this.scene.add(door);

        // White trim
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
        const trimGeo = new THREE.BoxGeometry(5.2, 0.15, 6.2);
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.set(barnX, 4.0, barnZ);
        this.scene.add(trim);
    }

    buildEnvironment() {
        // Trees around perimeter
        const treeGeo = new THREE.ConeGeometry(1.2, 3.5, 6);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8 });
        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9 });

        for (let i = 0; i < 15; i++) {
            const angle = this.rng() * Math.PI * 2;
            const dist = 15 + this.rng() * 15;
            const tx = Math.cos(angle) * dist;
            const tz = Math.sin(angle) * dist;

            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 0.75;
            tree.add(trunk);
            const foliage = new THREE.Mesh(treeGeo, treeMat);
            foliage.position.y = 3;
            foliage.castShadow = true;
            tree.add(foliage);
            tree.position.set(tx, 0, tz);
            tree.scale.setScalar(0.7 + this.rng() * 0.6);
            this.scene.add(tree);
        }

        // Path (lighter ground strip leading to farm)
        const pathGeo = new THREE.PlaneGeometry(2, 15);
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.95 });
        const path = new THREE.Mesh(pathGeo, pathMat);
        path.rotation.x = -Math.PI / 2;
        path.position.set(0, 0.02, (this.gridSize * this.plotStep) / 2 + 5);
        this.scene.add(path);
    }

    buildCropVisual(plot) {
        // Clear existing
        while (plot.cropGroup.children.length > 0) {
            plot.cropGroup.remove(plot.cropGroup.children[0]);
        }

        if (!plot.crop) return;

        const def = this.crops[plot.crop.defIndex];
        const stage = plot.crop.stage;

        if (stage === 0) {
            // Seed: small brown mound
            const moundGeo = new THREE.SphereGeometry(0.15, 6, 6);
            const moundMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
            const mound = new THREE.Mesh(moundGeo, moundMat);
            mound.scale.y = 0.5;
            plot.cropGroup.add(mound);
        } else if (stage === 1) {
            // Sprout: small green stem
            const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 6);
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x55aa30, roughness: 0.7 });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.2;
            plot.cropGroup.add(stem);

            // Tiny leaf
            const leafGeo = new THREE.SphereGeometry(0.1, 6, 4);
            leafGeo.scale(1, 0.3, 1);
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x66bb44, roughness: 0.7 });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(0.08, 0.35, 0);
            leaf.rotation.z = -0.5;
            plot.cropGroup.add(leaf);
        } else if (stage === 2) {
            // Medium plant: taller stem with leaves
            const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6);
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x408020, roughness: 0.7 });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.4;
            stem.castShadow = true;
            plot.cropGroup.add(stem);

            // Leaves
            const leafGeo = new THREE.SphereGeometry(0.15, 6, 4);
            leafGeo.scale(1.5, 0.3, 1);
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x66bb44, roughness: 0.7 });
            for (let i = 0; i < 3; i++) {
                const leaf = new THREE.Mesh(leafGeo.clone(), leafMat);
                const angle = (i / 3) * Math.PI * 2;
                leaf.position.set(Math.cos(angle) * 0.12, 0.6 + i * 0.1, Math.sin(angle) * 0.12);
                leaf.rotation.z = angle * 0.3;
                plot.cropGroup.add(leaf);
            }
        } else if (stage === 3) {
            // Harvestable: full plant with colored fruit
            const stemGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 6);
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x408020, roughness: 0.7 });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.5;
            stem.castShadow = true;
            plot.cropGroup.add(stem);

            // Leaves
            const leafGeo = new THREE.SphereGeometry(0.18, 6, 4);
            leafGeo.scale(1.5, 0.3, 1);
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x55aa30, roughness: 0.7 });
            for (let i = 0; i < 4; i++) {
                const leaf = new THREE.Mesh(leafGeo.clone(), leafMat);
                const angle = (i / 4) * Math.PI * 2;
                leaf.position.set(Math.cos(angle) * 0.15, 0.7, Math.sin(angle) * 0.15);
                plot.cropGroup.add(leaf);
            }

            // Fruit
            const fruitGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const fruitMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(def.color),
                emissive: new THREE.Color(def.color),
                emissiveIntensity: 0.2,
                roughness: 0.3,
                metalness: 0.1,
            });
            const fruit = new THREE.Mesh(fruitGeo, fruitMat);
            fruit.position.y = 1.1;
            fruit.castShadow = true;
            fruit.name = 'fruit';
            plot.cropGroup.add(fruit);

            // Glow ring around harvestable
            const glowGeo = new THREE.TorusGeometry(0.4, 0.03, 6, 16);
            const glowMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(def.color),
                emissive: new THREE.Color(def.color),
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.5,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.rotation.x = -Math.PI / 2;
            glow.position.y = 1.1;
            glow.name = 'glow';
            plot.cropGroup.add(glow);
        }
    }

    onKeyDown(code) {
        if (this.gameOver) return;

        // Tool selection with number keys
        if (code === 'Digit1') this.selectedTool = 0;
        else if (code === 'Digit2') this.selectedTool = 1;
        else if (code === 'Digit3') this.selectedTool = 2;

        // Crop selection with Q/E (when plant tool selected)
        if (this.selectedTool === 0) {
            if (code === 'KeyQ') {
                this.selectedCropIndex = Math.max(0, this.selectedCropIndex - 1);
            } else if (code === 'KeyE') {
                this.selectedCropIndex = Math.min(this.crops.length - 1, this.selectedCropIndex + 1);
            }
        }

        // Interact with nearest plot on E or F
        if (code === 'KeyF') {
            this.interactWithNearestPlot();
        }
    }

    onClick(e) {
        if (this.gameOver) return;
        this.interactWithNearestPlot();
    }

    interactWithNearestPlot() {
        if (!this.nearestPlot || this.nearestPlotDist > 3.0) return;

        const plot = this.nearestPlot;

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
                        plot.lastStage = -1;
                        this.buildCropVisual(plot);
                    }
                }
                break;

            case 1: // Water
                if (plot.crop && plot.crop.stage < 3) {
                    plot.crop.watered = true;
                    plot.crop.waterTimer = 5;
                    plot.waterOverlay.material.opacity = 0.15;
                }
                break;

            case 2: // Harvest
                if (plot.crop && plot.crop.stage === 3) {
                    const def = this.crops[plot.crop.defIndex];
                    this.currency += def.value;
                    this.totalEarned += def.value;
                    this.score = this.totalEarned;
                    plot.crop = null;
                    plot.lastStage = -1;
                    this.buildCropVisual(plot);
                    plot.waterOverlay.material.opacity = 0;
                }
                break;
        }
    }

    update(dt) {
        if (this.gameOver) return;

        // Timer
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.score = this.totalEarned;
            this.endGame();
            return;
        }

        // Grow crops
        for (const plot of this.plots3D) {
            if (!plot.crop) continue;

            const def = this.crops[plot.crop.defIndex];
            const waterMult = plot.crop.watered ? 1.0 : 0.3;
            plot.crop.growth += dt * this.growSpeed * waterMult;

            // Water timer
            if (plot.crop.watered) {
                plot.crop.waterTimer -= dt;
                if (plot.crop.waterTimer <= 0) {
                    plot.crop.watered = false;
                    plot.waterOverlay.material.opacity = 0;
                }
            }

            // Stage update
            const totalTime = def.growTime;
            const progress = plot.crop.growth / totalTime;
            let newStage;
            if (progress >= 1.0) newStage = 3;
            else if (progress >= 0.6) newStage = 2;
            else if (progress >= 0.25) newStage = 1;
            else newStage = 0;

            if (newStage !== plot.crop.stage) {
                plot.crop.stage = newStage;
            }

            // Rebuild visual if stage changed
            if (plot.crop.stage !== plot.lastStage) {
                plot.lastStage = plot.crop.stage;
                this.buildCropVisual(plot);
            }

            // Animate harvestable fruit bob
            if (plot.crop.stage === 3) {
                const fruit = plot.cropGroup.getObjectByName('fruit');
                if (fruit) {
                    fruit.position.y = 1.1 + Math.sin(performance.now() * 0.003) * 0.05;
                }
                const glow = plot.cropGroup.getObjectByName('glow');
                if (glow) {
                    glow.material.opacity = 0.3 + Math.sin(performance.now() * 0.004) * 0.2;
                }
            }
        }

        // Find nearest plot
        this.nearestPlotDist = Infinity;
        this.nearestPlot = null;
        for (const plot of this.plots3D) {
            const dx = this.playerPosition.x - plot.x;
            const dz = this.playerPosition.z - plot.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < this.nearestPlotDist) {
                this.nearestPlotDist = dist;
                this.nearestPlot = plot;
            }
        }

        // Highlight nearest plot
        for (const plot of this.plots3D) {
            const isNearest = plot === this.nearestPlot && this.nearestPlotDist < 3.0;
            plot.ringMesh.material.opacity = isNearest ? 0.6 : 0;
        }

        // Update HUD
        this.updateHUDScore(this.score);
        this.updateFarmHUD();
    }

    createFarmHUD() {
        if (!this.hudEl) return;

        // Currency display
        this.currencyEl = document.createElement('div');
        this.currencyEl.style.cssText = 'position:absolute;top:8px;right:12px;color:#ffd700;font:bold 18px monospace;';
        this.hudEl.appendChild(this.currencyEl);

        // Timer display
        this.timerEl = document.createElement('div');
        this.timerEl.style.cssText = 'position:absolute;top:32px;right:12px;color:#ffffff;font:bold 16px monospace;';
        this.hudEl.appendChild(this.timerEl);

        // Tool display
        this.toolEl = document.createElement('div');
        this.toolEl.style.cssText = 'position:absolute;bottom:12px;left:12px;color:#ffffff;font:14px monospace;background:rgba(0,0,0,0.5);padding:6px 10px;border-radius:6px;';
        this.hudEl.appendChild(this.toolEl);

        // Interaction hint
        this.hintEl = document.createElement('div');
        this.hintEl.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);color:#ffffff;font:13px monospace;background:rgba(0,0,0,0.5);padding:4px 10px;border-radius:6px;';
        this.hudEl.appendChild(this.hintEl);
    }

    updateFarmHUD() {
        if (this.currencyEl) {
            this.currencyEl.textContent = `$${this.currency}  (Earned: $${this.totalEarned})`;
        }
        if (this.timerEl) {
            const timeColor = this.timeLeft > 20 ? '#ffffff' : '#ff4444';
            this.timerEl.style.color = timeColor;
            this.timerEl.textContent = `${Math.ceil(this.timeLeft)}s`;
        }
        if (this.toolEl) {
            const toolNames = ['Plant', 'Water', 'Harvest'];
            let toolText = `[1/2/3] Tool: ${toolNames[this.selectedTool]}`;
            if (this.selectedTool === 0) {
                const def = this.crops[this.selectedCropIndex];
                toolText += ` | [Q/E] Crop: ${def.name} ($${def.cost})`;
            }
            this.toolEl.textContent = toolText;
        }
        if (this.hintEl) {
            if (this.nearestPlot && this.nearestPlotDist < 3.0) {
                const plot = this.nearestPlot;
                if (!plot.crop && this.selectedTool === 0) {
                    this.hintEl.textContent = 'Click or F to plant';
                } else if (plot.crop && plot.crop.stage < 3 && this.selectedTool === 1) {
                    this.hintEl.textContent = 'Click or F to water';
                } else if (plot.crop && plot.crop.stage === 3 && this.selectedTool === 2) {
                    this.hintEl.textContent = 'Click or F to harvest!';
                } else if (plot.crop) {
                    this.hintEl.textContent = `${STAGE_NAMES[plot.crop.stage]} - ${this.crops[plot.crop.defIndex].name}`;
                } else {
                    this.hintEl.textContent = 'Empty plot';
                }
                this.hintEl.style.display = 'block';
            } else {
                this.hintEl.textContent = 'Walk to a plot';
                this.hintEl.style.display = 'block';
            }
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
                const is3D = seed % 2 === 0;
                const name = generateGameName('Farming', seed);

                variations.push({
                    name: name + (is3D ? ' 3D' : ''),
                    category: 'Farming',
                    is3D,
                    config: { plotCount, cropTypes, growSpeed, timeLimit, theme, seed, name: name + (is3D ? ' 3D' : '') },
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
        const is3D = seed % 2 === 0;
        const name = generateGameName('Farming', seed);

        variations.push({
            name: name + (is3D ? ' 3D' : ''),
            category: 'Farming',
            is3D,
            config: { plotCount, cropTypes, growSpeed, timeLimit, theme, seed, name: name + (is3D ? ' 3D' : '') },
            thumbnail: generateThumbnail('Farming', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate3D('Farming', FarmingGame, FarmingGame3D, generateVariations);
