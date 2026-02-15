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
    { name: 'Garden',    primary: '#4caf50', secondary: '#81c784', bg: '#1b3320', hole: '#2a1a0a', mole: '#8d6e63', decoy: '#e53935' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', hole: '#161650', mole: '#00ff87', decoy: '#ff006e' },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e', hole: '#0a0a4e', mole: '#90e0ef', decoy: '#ff6b6b' },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', hole: '#2a1a10', mole: '#ffd700', decoy: '#ff0000' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', hole: '#3b0022', mole: '#ffb6c1', decoy: '#00ff7f' },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', hole: '#001a00', mole: '#33ff33', decoy: '#ff3333' },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', hole: '#20003b', mole: '#00f5d4', decoy: '#fee440' },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', hole: '#2a1520', mole: '#ffcc5c', decoy: '#6c5ce7' },
];

// ── WhackGame ───────────────────────────────────────────────────────────
class WhackGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Hole grid
        this.holeCols = cfg.holeCount === 12 ? 4 : 3;
        this.holeRows = 3;
        this.totalHoles = this.holeCols * this.holeRows;

        // Popup duration settings
        const durationMap = { fast: 0.6, medium: 1.0, slow: 1.5 };
        this.basePopupDuration = durationMap[cfg.popupDuration] || 1.0;

        // Game duration
        this.gameDuration = cfg.duration || 45;
        this.timeLeft = this.gameDuration;

        // Decoy chance
        this.decoyChance = (cfg.decoyChance || 0) / 100;

        // Hole layout
        const holeSpaceW = W * 0.85;
        const holeSpaceH = H * 0.55;
        const startX = (W - holeSpaceW) / 2;
        const startY = H * 0.22;
        const gapX = holeSpaceW / (this.holeCols);
        const gapY = holeSpaceH / (this.holeRows);

        this.holeRadius = Math.min(gapX, gapY) * 0.35;

        this.holes = [];
        for (let r = 0; r < this.holeRows; r++) {
            for (let c = 0; c < this.holeCols; c++) {
                this.holes.push({
                    x: startX + gapX * (c + 0.5),
                    y: startY + gapY * (r + 0.5),
                    active: false,
                    isDecoy: false,
                    timer: 0,
                    popHeight: 0,    // 0 = hidden, 1 = fully popped
                    whacked: false,
                    whackTimer: 0,
                });
            }
        }

        // Mole spawning
        this.spawnTimer = 0;
        this.spawnInterval = 0.8;
        this.maxActiveMoles = 2;

        // Stats
        this.hits = 0;
        this.misses = 0;
        this.combo = 0;
        this.maxCombo = 0;

        // Particles
        this.particles = [];

        // Cursor effect
        this.cursorX = W / 2;
        this.cursorY = H / 2;
        this.hammerSwing = 0;
    }

    spawnMole() {
        // Find inactive holes
        const available = this.holes.filter(h => !h.active && !h.whacked);
        if (available.length === 0) return;

        const hole = available[Math.floor(this.rng() * available.length)];
        hole.active = true;
        hole.isDecoy = this.rng() < this.decoyChance;

        // Duration decreases as game progresses
        const elapsed = this.gameDuration - this.timeLeft;
        const speedup = 1 - (elapsed / this.gameDuration) * 0.5;
        hole.timer = this.basePopupDuration * speedup;
        hole.popHeight = 0;
        hole.whacked = false;
    }

    update(dt) {
        // Count down
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.endGame();
            return;
        }

        // Hammer swing animation
        if (this.hammerSwing > 0) {
            this.hammerSwing -= dt * 8;
            if (this.hammerSwing < 0) this.hammerSwing = 0;
        }

        // Spawn moles
        this.spawnTimer += dt;
        const activeCount = this.holes.filter(h => h.active).length;
        // Spawn more as time progresses
        const elapsed = this.gameDuration - this.timeLeft;
        const maxActive = Math.min(this.maxActiveMoles + Math.floor(elapsed / 15), this.totalHoles - 1);
        const effectiveInterval = Math.max(0.3, this.spawnInterval - elapsed * 0.01);

        if (this.spawnTimer >= effectiveInterval && activeCount < maxActive) {
            this.spawnTimer = 0;
            this.spawnMole();
        }

        // Update holes
        for (const hole of this.holes) {
            if (hole.whacked) {
                hole.whackTimer -= dt;
                if (hole.whackTimer <= 0) {
                    hole.whacked = false;
                    hole.active = false;
                    hole.popHeight = 0;
                }
                continue;
            }

            if (hole.active) {
                // Pop up animation
                if (hole.popHeight < 1) {
                    hole.popHeight = Math.min(1, hole.popHeight + dt * 6);
                }

                hole.timer -= dt;
                if (hole.timer <= 0) {
                    // Missed this mole
                    hole.active = false;
                    hole.popHeight = 0;
                    if (!hole.isDecoy) {
                        this.combo = 0;
                    }
                }
            } else {
                // Pop down animation
                if (hole.popHeight > 0) {
                    hole.popHeight = Math.max(0, hole.popHeight - dt * 8);
                }
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onClick(x, y) {
        if (this.gameOver) return;

        this.cursorX = x;
        this.cursorY = y;
        this.hammerSwing = 1;

        // Check if clicked on an active mole
        let hitMole = false;

        for (const hole of this.holes) {
            if (!hole.active || hole.whacked) continue;
            if (hole.popHeight < 0.5) continue;

            const dx = x - hole.x;
            const dy = y - (hole.y - this.holeRadius * hole.popHeight * 0.5);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.holeRadius * 1.3) {
                hitMole = true;
                hole.whacked = true;
                hole.whackTimer = 0.3;

                if (hole.isDecoy) {
                    // Hit a decoy - penalty
                    this.score = Math.max(0, this.score - 50);
                    this.combo = 0;

                    // Red particles
                    for (let i = 0; i < 6; i++) {
                        this.particles.push({
                            x: hole.x, y: hole.y - this.holeRadius * 0.5,
                            vx: (Math.random() - 0.5) * 200,
                            vy: -Math.random() * 200,
                            life: 0.5, maxLife: 0.5,
                            color: this.theme.decoy,
                        });
                    }

                    // Floating text
                    this.particles.push({
                        x: hole.x, y: hole.y - this.holeRadius,
                        vx: 0, vy: -60,
                        life: 0.8, maxLife: 0.8,
                        text: '-50', color: this.theme.decoy,
                    });
                } else {
                    // Normal hit
                    this.hits++;
                    this.combo++;
                    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                    const comboBonus = Math.min(this.combo, 10);
                    const points = 10 + comboBonus * 5;
                    this.score += points;

                    // Green particles
                    for (let i = 0; i < 8; i++) {
                        this.particles.push({
                            x: hole.x, y: hole.y - this.holeRadius * 0.5,
                            vx: (Math.random() - 0.5) * 250,
                            vy: -Math.random() * 250,
                            life: 0.4, maxLife: 0.4,
                            color: this.theme.primary,
                        });
                    }

                    // Floating text
                    this.particles.push({
                        x: hole.x, y: hole.y - this.holeRadius,
                        vx: 0, vy: -60,
                        life: 0.8, maxLife: 0.8,
                        text: `+${points}`, color: this.theme.primary,
                    });
                }
                break; // Only hit one mole per click
            }
        }

        if (!hitMole) {
            this.misses++;
            this.combo = 0;
        }
    }

    onMouseMove(x, y) {
        this.cursorX = x;
        this.cursorY = y;
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;
        const hr = this.holeRadius;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Draw holes and moles
        for (const hole of this.holes) {
            // Hole shadow/pit
            ctx.fillStyle = t.hole;
            ctx.beginPath();
            ctx.ellipse(hole.x, hole.y, hr, hr * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();

            // Darker inner
            ctx.fillStyle = '#00000060';
            ctx.beginPath();
            ctx.ellipse(hole.x, hole.y, hr * 0.8, hr * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            // Mole (pop up from hole)
            const ph = hole.popHeight;
            if (ph > 0.01) {
                const moleY = hole.y - hr * ph * 0.8;
                const moleR = hr * 0.7;

                // Clip to hide bottom half that's "in the hole"
                ctx.save();
                ctx.beginPath();
                ctx.rect(hole.x - hr * 1.5, hole.y - hr * 3, hr * 3, hr * 2.6);
                ctx.clip();

                if (hole.whacked) {
                    // Whacked state - show stars
                    ctx.fillStyle = hole.isDecoy ? t.decoy + '80' : t.mole + '80';
                    ctx.beginPath();
                    ctx.arc(hole.x, moleY, moleR * 0.9, 0, Math.PI * 2);
                    ctx.fill();

                    // X eyes
                    ctx.strokeStyle = t.bg;
                    ctx.lineWidth = 2;
                    const ex1 = hole.x - moleR * 0.3;
                    const ex2 = hole.x + moleR * 0.3;
                    const ey = moleY - moleR * 0.1;
                    const es = moleR * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(ex1 - es, ey - es); ctx.lineTo(ex1 + es, ey + es);
                    ctx.moveTo(ex1 + es, ey - es); ctx.lineTo(ex1 - es, ey + es);
                    ctx.moveTo(ex2 - es, ey - es); ctx.lineTo(ex2 + es, ey + es);
                    ctx.moveTo(ex2 + es, ey - es); ctx.lineTo(ex2 - es, ey + es);
                    ctx.stroke();
                } else {
                    // Normal/decoy mole
                    const moleColor = hole.isDecoy ? t.decoy : t.mole;

                    // Body
                    ctx.fillStyle = moleColor;
                    ctx.beginPath();
                    ctx.arc(hole.x, moleY, moleR, 0, Math.PI * 2);
                    ctx.fill();

                    // Belly highlight
                    ctx.fillStyle = '#ffffff15';
                    ctx.beginPath();
                    ctx.arc(hole.x, moleY + moleR * 0.1, moleR * 0.6, 0, Math.PI * 2);
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(hole.x - moleR * 0.3, moleY - moleR * 0.15, moleR * 0.18, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(hole.x + moleR * 0.3, moleY - moleR * 0.15, moleR * 0.18, 0, Math.PI * 2);
                    ctx.fill();

                    // Pupils
                    ctx.fillStyle = t.bg;
                    ctx.beginPath();
                    ctx.arc(hole.x - moleR * 0.28, moleY - moleR * 0.13, moleR * 0.09, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(hole.x + moleR * 0.32, moleY - moleR * 0.13, moleR * 0.09, 0, Math.PI * 2);
                    ctx.fill();

                    // Nose
                    ctx.fillStyle = hole.isDecoy ? '#ff000080' : '#00000040';
                    ctx.beginPath();
                    ctx.arc(hole.x, moleY + moleR * 0.15, moleR * 0.12, 0, Math.PI * 2);
                    ctx.fill();

                    // Decoy indicator - angry eyebrows
                    if (hole.isDecoy) {
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(hole.x - moleR * 0.5, moleY - moleR * 0.35);
                        ctx.lineTo(hole.x - moleR * 0.15, moleY - moleR * 0.25);
                        ctx.moveTo(hole.x + moleR * 0.5, moleY - moleR * 0.35);
                        ctx.lineTo(hole.x + moleR * 0.15, moleY - moleR * 0.25);
                        ctx.stroke();
                    }
                }

                ctx.restore();

                // Hole rim over mole (to hide emergence)
                ctx.fillStyle = t.hole;
                ctx.beginPath();
                ctx.ellipse(hole.x, hole.y, hr, hr * 0.45, 0, 0, Math.PI);
                ctx.fill();
            }
        }

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            if (p.text) {
                ctx.fillStyle = p.color;
                ctx.font = 'bold 18px monospace';
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

        // Hammer cursor
        if (!this.gameOver) {
            ctx.save();
            ctx.translate(this.cursorX, this.cursorY);
            ctx.rotate(-0.3 - this.hammerSwing * 0.8);

            // Handle
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-2, 0, 4, 28);

            // Head
            ctx.fillStyle = '#aaaaaa';
            ctx.fillRect(-8, -14, 16, 14);

            // Highlight
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(-6, -12, 4, 10);

            ctx.restore();
        }

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Timer
        ctx.fillStyle = this.timeLeft > 10 ? t.secondary : '#ff4444';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.ceil(this.timeLeft)}s`, W - 12, 12);

        // Combo
        if (this.combo > 1) {
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Combo x${this.combo}!`, W / 2, 12);
        }

        // Instructions at start
        if (this.score === 0 && this.timeLeft > this.gameDuration - 2) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Click the moles! Avoid the red ones!', W / 2, H - 16);
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
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 5);

            ctx.font = '16px monospace';
            ctx.fillText(`Hits: ${this.hits}  Misses: ${this.misses}`, W / 2, H / 2 + 38);
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
    const holeCounts = [9, 12];
    const popupDurations = ['fast', 'medium', 'slow'];
    const durations = [30, 45, 60];
    const decoyChances = [0, 15, 30];
    let seed = 1;

    for (const theme of themes) {
        for (const holeCount of holeCounts) {
            for (const popupDuration of popupDurations) {
                const duration = durations[seed % durations.length];
                const decoyChance = decoyChances[seed % decoyChances.length];

                variations.push({
                    name: generateGameName('Whack-a-Mole', seed),
                    category: 'Whack-a-Mole',
                    config: {
                        holeCount,
                        popupDuration,
                        duration,
                        decoyChance,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Whack-a-Mole', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 2 * 3 = 48 base

    // Add combos with explicit duration and decoy
    for (const theme of themes) {
        for (const duration of durations) {
            for (const decoyChance of decoyChances) {
                const holeCount = holeCounts[seed % holeCounts.length];
                const popupDuration = popupDurations[seed % popupDurations.length];

                variations.push({
                    name: generateGameName('Whack-a-Mole', seed),
                    category: 'Whack-a-Mole',
                    config: {
                        holeCount,
                        popupDuration,
                        duration,
                        decoyChance,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Whack-a-Mole', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // + 8 * 3 * 3 = 72 => 120

    // Top up to ~150
    while (variations.length < 150) {
        const theme = themes[seed % themes.length];
        const holeCount = holeCounts[seed % holeCounts.length];
        const popupDuration = popupDurations[seed % popupDurations.length];
        const duration = durations[(seed + 1) % durations.length];
        const decoyChance = decoyChances[(seed + 2) % decoyChances.length];

        variations.push({
            name: generateGameName('Whack-a-Mole', seed),
            category: 'Whack-a-Mole',
            config: { holeCount, popupDuration, duration, decoyChance, theme, seed },
            thumbnail: generateThumbnail('Whack-a-Mole', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('WhackAMole', WhackGame, generateVariations);
