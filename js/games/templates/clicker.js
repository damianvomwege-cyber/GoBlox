import { BaseGame } from '../base-game.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';

// ── Themes ──────────────────────────────────────────────────────────────
const themes = [
    { name: 'Gold Rush',   primary: '#ffd700', secondary: '#ffaa00', bg: '#1a1200', accent: '#fff5cc' },
    { name: 'Emerald',     primary: '#00e676', secondary: '#00c853', bg: '#001a0e', accent: '#b9f6ca' },
    { name: 'Crimson',     primary: '#ff1744', secondary: '#d50000', bg: '#1a0006', accent: '#ff8a80' },
    { name: 'Sapphire',    primary: '#2979ff', secondary: '#0052cc', bg: '#000d1a', accent: '#82b1ff' },
    { name: 'Amethyst',    primary: '#d500f9', secondary: '#aa00ff', bg: '#14001a', accent: '#ea80fc' },
    { name: 'Sunset',      primary: '#ff6d00', secondary: '#ff9100', bg: '#1a0d00', accent: '#ffab40' },
    { name: 'Mint',        primary: '#1de9b6', secondary: '#00bfa5', bg: '#001a14', accent: '#a7ffeb' },
    { name: 'Bubblegum',   primary: '#ff4081', secondary: '#f50057', bg: '#1a0010', accent: '#ff80ab' },
    { name: 'Cyber',       primary: '#00e5ff', secondary: '#00b8d4', bg: '#001a1a', accent: '#84ffff' },
    { name: 'Volcano',     primary: '#ff3d00', secondary: '#dd2c00', bg: '#1a0800', accent: '#ff9e80' },
];

// ── Upgrade definitions per upgradeCount ────────────────────────────────
const upgradeTemplates = [
    { name: 'Auto Clicker',  baseCost: 15,   baseRate: 0.5 },
    { name: 'Worker',        baseCost: 100,   baseRate: 3 },
    { name: 'Machine',       baseCost: 500,   baseRate: 15 },
    { name: 'Factory',       baseCost: 2500,  baseRate: 80 },
    { name: 'Megaplex',      baseCost: 12000, baseRate: 400 },
];

// ── ClickerGame ─────────────────────────────────────────────────────────
class ClickerGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.currency = 0;
        this.clickValue = cfg.baseClickValue;
        this.costMultiplier = cfg.upgradeCostMultiplier;
        this.autoGenRate = cfg.autoGenRate;
        this.timeLimit = 60; // 60-second timed rounds
        this.elapsed = 0;

        // Setup upgrades
        this.upgrades = [];
        const count = cfg.upgradeCount;
        for (let i = 0; i < count; i++) {
            const tmpl = upgradeTemplates[i];
            this.upgrades.push({
                name: tmpl.name,
                baseCost: tmpl.baseCost,
                cost: tmpl.baseCost,
                baseRate: tmpl.baseRate * this.autoGenRate,
                rate: tmpl.baseRate * this.autoGenRate,
                owned: 0,
            });
        }

        // Click popups
        this.popups = [];

        // Click area pulse animation
        this.pulseTimer = 0;
        this.clickAreaRadius = 0;

        // Track total earned for score
        this.totalEarned = 0;

        // Hover state
        this.mouseX = 0;
        this.mouseY = 0;
    }

    getClickArea() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const panelW = Math.min(200, W * 0.3);
        const areaW = W - panelW;
        return {
            cx: areaW / 2,
            cy: H / 2 - 20,
            radius: Math.min(areaW, H) * 0.22,
        };
    }

    getUpgradeRects() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const panelW = Math.min(200, W * 0.3);
        const panelX = W - panelW;
        const rects = [];
        const itemH = 70;
        const pad = 8;
        const startY = 60;
        for (let i = 0; i < this.upgrades.length; i++) {
            rects.push({
                x: panelX + pad,
                y: startY + i * (itemH + pad),
                w: panelW - pad * 2,
                h: itemH,
            });
        }
        return rects;
    }

    update(dt) {
        // Timer
        this.elapsed += dt;
        if (this.elapsed >= this.timeLimit) {
            this.elapsed = this.timeLimit;
            this.score = Math.floor(this.totalEarned);
            this.endGame();
            return;
        }

        // Auto generation
        let autoRate = 0;
        for (const up of this.upgrades) {
            autoRate += up.rate * up.owned;
        }
        const autoEarned = autoRate * dt;
        this.currency += autoEarned;
        this.totalEarned += autoEarned;

        // Pulse animation
        this.pulseTimer += dt;

        // Update popups
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const p = this.popups[i];
            p.y -= 50 * dt;
            p.life -= dt;
            if (p.life <= 0) this.popups.splice(i, 1);
        }

        this.score = Math.floor(this.totalEarned);
    }

    onClick(x, y) {
        if (this.gameOver) return;

        // Check click area
        const area = this.getClickArea();
        const dx = x - area.cx;
        const dy = y - area.cy;
        if (dx * dx + dy * dy <= area.radius * area.radius) {
            this.currency += this.clickValue;
            this.totalEarned += this.clickValue;
            this.clickAreaRadius = area.radius * 1.1; // pulse

            // Popup
            this.popups.push({
                x: area.cx + (Math.random() - 0.5) * 60,
                y: area.cy - area.radius * 0.5,
                text: `+${this.clickValue}`,
                life: 0.8,
                maxLife: 0.8,
            });
            return;
        }

        // Check upgrade buttons
        const rects = this.getUpgradeRects();
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                const up = this.upgrades[i];
                if (this.currency >= up.cost) {
                    this.currency -= up.cost;
                    up.owned++;
                    up.cost = Math.floor(up.baseCost * Math.pow(this.costMultiplier, up.owned));
                }
                return;
            }
        }
    }

    onMouseMove(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }

    formatNumber(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return Math.floor(n).toString();
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        const panelW = Math.min(200, W * 0.3);
        const panelX = W - panelW;

        // Timer bar at top
        const timeLeft = Math.max(0, this.timeLimit - this.elapsed);
        const timeFrac = timeLeft / this.timeLimit;
        ctx.fillStyle = t.primary + '30';
        ctx.fillRect(0, 0, W, 8);
        ctx.fillStyle = t.primary;
        ctx.fillRect(0, 0, W * timeFrac, 8);

        // Timer text
        ctx.fillStyle = t.accent;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${Math.ceil(timeLeft)}s`, panelX / 2, 14);

        // Currency display
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.formatNumber(this.currency), panelX / 2, 40);

        // Auto rate
        let autoRate = 0;
        for (const up of this.upgrades) {
            autoRate += up.rate * up.owned;
        }
        ctx.fillStyle = t.secondary;
        ctx.font = '14px monospace';
        ctx.fillText(`${this.formatNumber(autoRate)}/sec`, panelX / 2, 78);

        // Click area
        const area = this.getClickArea();
        const pulse = Math.sin(this.pulseTimer * 3) * 0.05 + 1;
        const drawR = area.radius * pulse;

        // Outer glow
        const glow = ctx.createRadialGradient(area.cx, area.cy, drawR * 0.5, area.cx, area.cy, drawR * 1.3);
        glow.addColorStop(0, t.primary + '30');
        glow.addColorStop(1, t.primary + '00');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(area.cx, area.cy, drawR * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Main button
        const grad = ctx.createRadialGradient(area.cx, area.cy - drawR * 0.2, 0, area.cx, area.cy, drawR);
        grad.addColorStop(0, t.primary);
        grad.addColorStop(1, t.secondary);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(area.cx, area.cy, drawR, 0, Math.PI * 2);
        ctx.fill();

        // Button border
        ctx.strokeStyle = t.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(area.cx, area.cy, drawR, 0, Math.PI * 2);
        ctx.stroke();

        // Button text
        ctx.fillStyle = t.bg;
        ctx.font = `bold ${Math.floor(drawR * 0.35)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CLICK', area.cx, area.cy - 8);
        ctx.font = `${Math.floor(drawR * 0.2)}px monospace`;
        ctx.fillText(`+${this.clickValue}`, area.cx, area.cy + drawR * 0.25);

        // Click popups
        for (const p of this.popups) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = t.accent;
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        // Upgrades panel bg
        ctx.fillStyle = t.primary + '10';
        ctx.fillRect(panelX, 0, panelW, H);
        ctx.fillStyle = t.primary + '40';
        ctx.fillRect(panelX, 0, 2, H);

        // Panel title
        ctx.fillStyle = t.accent;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('UPGRADES', panelX + panelW / 2, 30);

        // Upgrade items
        const rects = this.getUpgradeRects();
        for (let i = 0; i < this.upgrades.length; i++) {
            const up = this.upgrades[i];
            const r = rects[i];
            const canBuy = this.currency >= up.cost;

            // Hover detection
            const hovered = (
                this.mouseX >= r.x && this.mouseX <= r.x + r.w &&
                this.mouseY >= r.y && this.mouseY <= r.y + r.h
            );

            // Background
            ctx.fillStyle = canBuy
                ? (hovered ? t.primary + '40' : t.primary + '20')
                : t.primary + '08';
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, 6);
            ctx.fill();

            // Border
            ctx.strokeStyle = canBuy ? t.primary + '80' : t.primary + '20';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(r.x, r.y, r.w, r.h, 6);
            ctx.stroke();

            // Name + owned
            ctx.fillStyle = canBuy ? t.accent : t.accent + '60';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${up.name} (${up.owned})`, r.x + 8, r.y + 20);

            // Cost
            ctx.fillStyle = canBuy ? t.primary : t.secondary + '60';
            ctx.font = '12px monospace';
            ctx.fillText(`Cost: ${this.formatNumber(up.cost)}`, r.x + 8, r.y + 38);

            // Rate
            ctx.fillStyle = t.secondary;
            ctx.fillText(`+${this.formatNumber(up.rate)}/s`, r.x + 8, r.y + 54);
        }

        // Score at top left
        ctx.fillStyle = t.accent;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Total: ${this.formatNumber(this.totalEarned)}`, 10, H - 24);

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 42px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("TIME'S UP!", W / 2, H / 2 - 40);

            ctx.fillStyle = t.accent;
            ctx.font = 'bold 28px monospace';
            ctx.fillText(`Total Earned: ${this.formatNumber(this.score)}`, W / 2, H / 2 + 10);

            ctx.fillStyle = t.secondary;
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 55);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const clickValues = [1, 2, 5];
    const upgradeCounts = [3, 4, 5];
    const costMultipliers = [1.12, 1.15, 1.2];
    const autoGenRates = [0.8, 1, 1.3];
    let seed = 1;

    // Full combinatorial: 10 themes * 3 click * 3 upgrade * 3 cost = 270
    // Trim slightly with auto rate cycling to land near 250
    for (const theme of themes) {
        for (const baseClickValue of clickValues) {
            for (const upgradeCount of upgradeCounts) {
                for (const costMult of costMultipliers) {
                    const autoRate = autoGenRates[seed % autoGenRates.length];
                    variations.push({
                        name: generateGameName('Tycoon', seed),
                        category: 'Tycoon',
                        config: {
                            theme,
                            baseClickValue,
                            upgradeCount,
                            upgradeCostMultiplier: costMult,
                            autoGenRate: autoRate,
                            seed
                        },
                        thumbnail: generateThumbnail('Tycoon', { theme }, seed)
                    });
                    seed++;
                }
            }
        }
    }
    // 10 * 3 * 3 * 3 = 270 variations
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Clicker', ClickerGame, generateVariations);
