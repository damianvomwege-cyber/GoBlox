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
    { name: 'Diner',     primary: '#e17055', secondary: '#fdcb6e', bg: '#1a0800', accent: '#ff7675', counter: '#3d2314', button: '#2d3436' },
    { name: 'Sushi',     primary: '#ff6b6b', secondary: '#ffeaa7', bg: '#1a0010', accent: '#fd79a8', counter: '#2d1520', button: '#2d2d4d' },
    { name: 'Bakery',    primary: '#fdcb6e', secondary: '#ffeaa7', bg: '#1a1000', accent: '#e17055', counter: '#3d2a14', button: '#4d3d2d' },
    { name: 'Pizza',     primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0500', accent: '#ff4444', counter: '#3d1a0a', button: '#2d2d2d' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', accent: '#ff006e', counter: '#161650', button: '#0d0d35' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', accent: '#00ff7f', counter: '#3b0022', button: '#2b1022' },
    { name: 'Tropical',  primary: '#00cec9', secondary: '#55efc4', bg: '#002020', accent: '#fdcb6e', counter: '#003030', button: '#004040' },
    { name: 'Retro',     primary: '#f39c12', secondary: '#e74c3c', bg: '#1a1a1a', accent: '#3498db', counter: '#2a2a2a', button: '#333333' },
];

// ── Ingredient sets ─────────────────────────────────────────────────────
const ingredientSets = {
    4: [
        { name: 'Bread',   emoji: '\uD83C\uDF5E', color: '#d4a574' },
        { name: 'Cheese',  emoji: '\uD83E\uDDC0', color: '#ffd700' },
        { name: 'Tomato',  emoji: '\uD83C\uDF45', color: '#ff4444' },
        { name: 'Lettuce', emoji: '\uD83E\uDD6C', color: '#44cc44' },
    ],
    5: [
        { name: 'Bread',   emoji: '\uD83C\uDF5E', color: '#d4a574' },
        { name: 'Cheese',  emoji: '\uD83E\uDDC0', color: '#ffd700' },
        { name: 'Tomato',  emoji: '\uD83C\uDF45', color: '#ff4444' },
        { name: 'Lettuce', emoji: '\uD83E\uDD6C', color: '#44cc44' },
        { name: 'Meat',    emoji: '\uD83E\uDD69', color: '#cc6644' },
    ],
    6: [
        { name: 'Bread',   emoji: '\uD83C\uDF5E', color: '#d4a574' },
        { name: 'Cheese',  emoji: '\uD83E\uDDC0', color: '#ffd700' },
        { name: 'Tomato',  emoji: '\uD83C\uDF45', color: '#ff4444' },
        { name: 'Lettuce', emoji: '\uD83E\uDD6C', color: '#44cc44' },
        { name: 'Meat',    emoji: '\uD83E\uDD69', color: '#cc6644' },
        { name: 'Onion',   emoji: '\uD83E\uDDC5', color: '#dda0dd' },
    ],
};

// ── CookingGame ─────────────────────────────────────────────────────────
class CookingGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Ingredients
        this.ingredientCount = cfg.ingredientCount || 5;
        this.ingredients = ingredientSets[this.ingredientCount] || ingredientSets[5];

        // Order size (how many ingredients per dish)
        this.orderSize = cfg.orderSize || 3;

        // Time pressure
        const pressureMap = { relaxed: 12, normal: 8, rush: 5 };
        this.orderTimeLimit = pressureMap[cfg.timePressure] || 8;

        // Speed increase
        this.speedMultiplier = 1.0;

        // Order queue
        this.orders = [];
        this.maxOrders = 4;
        this.orderSpawnTimer = 0;
        this.orderSpawnInterval = 3.0;

        // Current preparation
        this.currentInput = [];

        // Game state
        this.lives = 3;
        this.dishesCompleted = 0;
        this.combo = 0;
        this.maxCombo = 0;

        // Ingredient button layout
        const btnW = Math.min(70, (W - 20) / this.ingredientCount - 8);
        const btnH = 60;
        const totalBtnW = this.ingredientCount * (btnW + 8) - 8;
        const btnStartX = (W - totalBtnW) / 2;
        const btnY = H - btnH - 15;

        this.buttons = this.ingredients.map((ing, i) => ({
            x: btnStartX + i * (btnW + 8),
            y: btnY,
            w: btnW,
            h: btnH,
            ingredient: ing,
            pressed: 0, // animation timer
        }));

        // Particles
        this.particles = [];

        // Spawn first order
        this.spawnOrder();
    }

    spawnOrder() {
        if (this.orders.length >= this.maxOrders) return;

        const recipe = [];
        for (let i = 0; i < this.orderSize; i++) {
            recipe.push(Math.floor(this.rng() * this.ingredientCount));
        }

        this.orders.push({
            recipe,
            timeLeft: this.orderTimeLimit / this.speedMultiplier,
            maxTime: this.orderTimeLimit / this.speedMultiplier,
            shakeTimer: 0,
        });
    }

    checkCurrentInput() {
        if (this.orders.length === 0) return;

        const order = this.orders[0];
        const recipe = order.recipe;

        // Check if current input matches so far
        for (let i = 0; i < this.currentInput.length; i++) {
            if (this.currentInput[i] !== recipe[i]) {
                // Wrong ingredient — clear input, shake order
                this.currentInput = [];
                order.shakeTimer = 0.3;

                // Error particles
                for (let j = 0; j < 3; j++) {
                    this.particles.push({
                        x: this.canvas.width / 2,
                        y: 80,
                        vx: (this.rng() - 0.5) * 100,
                        vy: -this.rng() * 80,
                        life: 0.4, maxLife: 0.4,
                        color: '#ff4444',
                        text: 'X',
                    });
                }
                return;
            }
        }

        // Check if order completed
        if (this.currentInput.length === recipe.length) {
            // Dish completed!
            this.dishesCompleted++;
            this.score += 10 + Math.floor(this.combo * 5);
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            // Success particles
            const orderY = 55;
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: this.canvas.width / 2,
                    y: orderY,
                    vx: (this.rng() - 0.5) * 200,
                    vy: -this.rng() * 150,
                    life: 0.5, maxLife: 0.5,
                    color: this.theme.primary,
                });
            }
            this.particles.push({
                x: this.canvas.width / 2,
                y: orderY - 20,
                vx: 0, vy: -40,
                life: 0.8, maxLife: 0.8,
                color: this.theme.secondary,
                text: `+${10 + Math.floor((this.combo - 1) * 5)}`,
            });

            this.orders.shift();
            this.currentInput = [];

            // Increase speed over time
            this.speedMultiplier = Math.min(2.0, 1.0 + this.dishesCompleted * 0.05);
        }
    }

    update(dt) {
        if (this.lives <= 0) return;

        // Spawn orders
        this.orderSpawnTimer += dt;
        const effectiveInterval = Math.max(1.5, this.orderSpawnInterval / this.speedMultiplier);
        if (this.orderSpawnTimer >= effectiveInterval) {
            this.orderSpawnTimer = 0;
            this.spawnOrder();
        }

        // Update orders
        for (let i = this.orders.length - 1; i >= 0; i--) {
            const order = this.orders[i];
            order.timeLeft -= dt;
            if (order.shakeTimer > 0) order.shakeTimer -= dt;

            if (order.timeLeft <= 0) {
                // Order expired
                this.orders.splice(i, 1);
                this.lives--;
                this.combo = 0;
                if (i === 0) this.currentInput = [];

                // Expire particles
                this.particles.push({
                    x: this.canvas.width / 2,
                    y: 60,
                    vx: 0, vy: -30,
                    life: 1.0, maxLife: 1.0,
                    color: '#ff4444',
                    text: 'EXPIRED!',
                });

                if (this.lives <= 0) {
                    this.endGame();
                    return;
                }
            }
        }

        // Update button press animation
        for (const btn of this.buttons) {
            if (btn.pressed > 0) btn.pressed -= dt * 5;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (!p.text) p.vy += 200 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onClick(x, y) {
        if (this.gameOver) return;
        if (this.lives <= 0) return;

        // Check ingredient buttons
        for (let i = 0; i < this.buttons.length; i++) {
            const btn = this.buttons[i];
            if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                btn.pressed = 1;
                this.currentInput.push(i);
                this.checkCurrentInput();
                return;
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

        // Counter surface
        ctx.fillStyle = t.counter;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);
        ctx.fillStyle = t.counter + 'dd';
        ctx.fillRect(0, H * 0.55, W, 4);

        // Chef character at the counter
        const chefX = W - 45;
        const chefY = H * 0.55 - 10;
        drawCharacter(ctx, chefX, chefY, 48, 'left', 'spatula', 0);

        // Orders area title
        ctx.fillStyle = t.secondary + '60';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('ORDERS:', 12, 10);

        // Draw orders
        const orderAreaY = 28;
        const orderH = 55;
        const orderGap = 6;

        for (let i = 0; i < this.orders.length; i++) {
            const order = this.orders[i];
            const oy = orderAreaY + i * (orderH + orderGap);
            const shakeX = order.shakeTimer > 0 ? Math.sin(order.shakeTimer * 40) * 5 : 0;

            // Order background
            const timeRatio = order.timeLeft / order.maxTime;
            const urgentAlpha = timeRatio < 0.3 ? '60' : '30';
            ctx.fillStyle = (i === 0 ? t.accent : t.secondary) + urgentAlpha;
            ctx.beginPath();
            ctx.roundRect(12 + shakeX, oy, W - 24, orderH, 6);
            ctx.fill();

            // Order border (active order highlight)
            if (i === 0) {
                ctx.strokeStyle = t.accent + '80';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(12 + shakeX, oy, W - 24, orderH, 6);
                ctx.stroke();
            }

            // Timer bar
            const barW = (W - 32) * timeRatio;
            const barColor = timeRatio > 0.5 ? t.primary : timeRatio > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillStyle = barColor + '60';
            ctx.beginPath();
            ctx.roundRect(16 + shakeX, oy + orderH - 8, barW, 5, 2);
            ctx.fill();

            // Recipe ingredients
            const recipe = order.recipe;
            const ingSize = 28;
            const totalIngW = recipe.length * (ingSize + 6) - 6;
            const ingStartX = (W - totalIngW) / 2 + shakeX;

            for (let j = 0; j < recipe.length; j++) {
                const ing = this.ingredients[recipe[j]];
                const ix = ingStartX + j * (ingSize + 6);
                const iy = oy + 8;

                // Ingredient circle
                const isCompleted = i === 0 && j < this.currentInput.length && this.currentInput[j] === recipe[j];
                ctx.fillStyle = isCompleted ? ing.color + 'dd' : ing.color + '40';
                ctx.beginPath();
                ctx.arc(ix + ingSize / 2, iy + ingSize / 2, ingSize / 2, 0, Math.PI * 2);
                ctx.fill();

                if (isCompleted) {
                    ctx.strokeStyle = '#ffffff60';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(ix + ingSize / 2, iy + ingSize / 2, ingSize / 2, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Ingredient label
                ctx.fillStyle = '#ffffffcc';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ing.name.substring(0, 4), ix + ingSize / 2, iy + ingSize / 2);
            }

            // Order number
            ctx.fillStyle = t.secondary + '80';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`#${i + 1}`, 18 + shakeX, oy + 4);

            // Time remaining
            ctx.fillStyle = timeRatio < 0.3 ? '#ff4444' : t.secondary + '80';
            ctx.font = '11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.ceil(order.timeLeft)}s`, W - 18 + shakeX, oy + 4);
        }

        // No orders message
        if (this.orders.length === 0 && !this.gameOver) {
            ctx.fillStyle = t.secondary + '60';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Waiting for orders...', W / 2, orderAreaY + 40);
        }

        // Ingredient buttons
        for (const btn of this.buttons) {
            const pressOffset = Math.max(0, btn.pressed) * 4;
            const bx = btn.x;
            const by = btn.y + pressOffset;
            const bw = btn.w;
            const bh = btn.h - pressOffset;

            // Button shadow
            if (pressOffset < 3) {
                ctx.fillStyle = '#00000040';
                ctx.beginPath();
                ctx.roundRect(bx + 2, by + 3, bw, bh, 8);
                ctx.fill();
            }

            // Button body
            ctx.fillStyle = t.button;
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, 8);
            ctx.fill();

            // Button top highlight
            ctx.fillStyle = btn.ingredient.color + '30';
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, 8);
            ctx.fill();

            // Border
            ctx.strokeStyle = btn.ingredient.color + '60';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, 8);
            ctx.stroke();

            // Ingredient color circle
            ctx.fillStyle = btn.ingredient.color;
            ctx.beginPath();
            ctx.arc(bx + bw / 2, by + bh * 0.38, 12, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = '#ffffffcc';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(btn.ingredient.name.substring(0, 5), bx + bw / 2, by + bh * 0.65);
        }

        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            if (p.text) {
                ctx.fillStyle = p.color;
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, W - 12, H * 0.56 + 8);

        // Dishes count
        ctx.fillStyle = t.secondary;
        ctx.font = '13px monospace';
        ctx.fillText(`Dishes: ${this.dishesCompleted}`, W - 12, H * 0.56 + 32);

        // Combo
        if (this.combo > 1) {
            ctx.fillStyle = t.accent;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Combo x${this.combo}!`, W / 2, H * 0.56 + 10);
        }

        // Lives
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const heartsStr = '\u2764'.repeat(this.lives) + '\u2661'.repeat(Math.max(0, 3 - this.lives));
        ctx.fillText(heartsStr, 12, H * 0.56 + 8);

        // Speed indicator
        if (this.speedMultiplier > 1.1) {
            ctx.fillStyle = t.accent + 'aa';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`Speed: x${this.speedMultiplier.toFixed(1)}`, 12, H * 0.56 + 32);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 40);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 5);

            ctx.font = '16px monospace';
            ctx.fillText(`Dishes: ${this.dishesCompleted}`, W / 2, H / 2 + 38);
            ctx.fillText(`Max Combo: ${this.maxCombo}`, W / 2, H / 2 + 60);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 92);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const ingredientCounts = [4, 5, 6];
    const orderSizes = [2, 3, 4];
    const timePressures = ['relaxed', 'normal', 'rush'];
    let seed = 1;

    for (const theme of themes) {
        for (const ingredientCount of ingredientCounts) {
            for (const timePressure of timePressures) {
                const orderSize = orderSizes[seed % orderSizes.length];

                variations.push({
                    name: generateGameName('Cooking', seed),
                    category: 'Cooking',
                    config: { ingredientCount, orderSize, timePressure, theme, seed },
                    thumbnail: generateThumbnail('Cooking', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 3 * 3 = 72

    // Top up to ~100
    while (variations.length < 100) {
        const theme = themes[seed % themes.length];
        const ingredientCount = ingredientCounts[seed % ingredientCounts.length];
        const orderSize = orderSizes[(seed + 1) % orderSizes.length];
        const timePressure = timePressures[(seed + 2) % timePressures.length];

        variations.push({
            name: generateGameName('Cooking', seed),
            category: 'Cooking',
            config: { ingredientCount, orderSize, timePressure, theme, seed },
            thumbnail: generateThumbnail('Cooking', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Cooking', CookingGame, generateVariations);
