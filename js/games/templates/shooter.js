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
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', enemy: '#ff006e', bullet: '#ffff00' },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e', enemy: '#ff9f1c', bullet: '#ffffff' },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e', enemy: '#ff6b6b', bullet: '#caf0f8' },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', enemy: '#ff0000', bullet: '#ffff00' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', enemy: '#00ff7f', bullet: '#ffffff' },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', enemy: '#ff3333', bullet: '#00ff00' },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', enemy: '#fee440', bullet: '#00f5d4' },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', enemy: '#6c5ce7', bullet: '#ffcc5c' },
];

// ── ShooterGame ─────────────────────────────────────────────────────────
class ShooterGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Arena size
        const arenaSizes = { small: 0.7, medium: 0.85, large: 1.0 };
        const scale = arenaSizes[cfg.arenaSize] || 0.85;
        this.arenaW = Math.floor(W * scale);
        this.arenaH = Math.floor(H * scale);
        this.arenaX = Math.floor((W - this.arenaW) / 2);
        this.arenaY = Math.floor((H - this.arenaH) / 2);

        // Enemy speed
        const speedMap = { slow: 60, medium: 100, fast: 150 };
        this.enemyBaseSpeed = speedMap[cfg.enemySpeed] || 100;

        // Spawn rate (enemies per second)
        const spawnMap = { slow: 0.8, medium: 1.5, fast: 2.5 };
        this.spawnRate = spawnMap[cfg.spawnRate] || 1.5;
        this.spawnTimer = 0;
        this.spawnInterval = 1 / this.spawnRate;

        // Player
        this.playerSize = 16;
        this.playerX = W / 2;
        this.playerY = H / 2;
        this.playerSpeed = 200;
        this.lives = 3;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 1.5;

        // Mouse aim
        this.mouseX = W / 2;
        this.mouseY = 0;
        this.walkAnim = 0;

        // Bullets
        this.bullets = [];
        this.bulletSpeed = 450;
        this.bulletRadius = 4;
        this.shootCooldown = 0;
        this.shootRate = 0.15; // seconds between shots

        // Enemies
        this.enemies = [];
        this.enemyIdCounter = 0;

        // Difficulty scaling
        this.elapsed = 0;

        // Particles
        this.particles = [];
    }

    spawnEnemy() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const edge = Math.floor(this.rng() * 4);
        let x, y;

        switch (edge) {
            case 0: x = this.rng() * W; y = -20; break;          // top
            case 1: x = this.rng() * W; y = H + 20; break;       // bottom
            case 2: x = -20; y = this.rng() * H; break;           // left
            default: x = W + 20; y = this.rng() * H; break;       // right
        }

        // Type: 70% normal, 20% fast-small, 10% slow-big
        const roll = this.rng();
        let type, size, speed, hp, points;
        if (roll < 0.1) {
            type = 'big';
            size = 20;
            speed = this.enemyBaseSpeed * 0.5;
            hp = 3;
            points = 30;
        } else if (roll < 0.3) {
            type = 'fast';
            size = 8;
            speed = this.enemyBaseSpeed * 1.8;
            hp = 1;
            points = 20;
        } else {
            type = 'normal';
            size = 12;
            speed = this.enemyBaseSpeed;
            hp = 1;
            points = 10;
        }

        // Scale speed with time
        const difficultyMult = 1 + this.elapsed * 0.02;
        speed *= difficultyMult;

        this.enemies.push({
            id: this.enemyIdCounter++,
            x, y, size, speed, hp, type, points
        });
    }

    update(dt) {
        this.elapsed += dt;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Invincibility timer
        if (this.invincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // Player movement (WASD)
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
            this.playerX += dx * this.playerSpeed * dt;
            this.playerY += dy * this.playerSpeed * dt;
            this.walkAnim += dt * 6;
        }

        // Clamp player to arena
        const ps = this.playerSize;
        this.playerX = Math.max(this.arenaX + ps, Math.min(this.arenaX + this.arenaW - ps, this.playerX));
        this.playerY = Math.max(this.arenaY + ps, Math.min(this.arenaY + this.arenaH - ps, this.playerY));

        // Shoot cooldown
        this.shootCooldown -= dt;
        if (this.shootCooldown < 0) this.shootCooldown = 0;

        // Auto-shoot with space held
        if (this.keys[' '] && this.shootCooldown <= 0) {
            this.fireBullet();
        }

        // Spawn enemies
        this.spawnTimer += dt;
        // Spawn rate increases over time
        const effectiveInterval = this.spawnInterval / (1 + this.elapsed * 0.015);
        if (this.spawnTimer >= effectiveInterval) {
            this.spawnTimer -= effectiveInterval;
            this.spawnEnemy();
        }

        // Move bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            // Remove if off-screen
            if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
                this.bullets.splice(i, 1);
            }
        }

        // Move enemies toward player
        for (const e of this.enemies) {
            const edx = this.playerX - e.x;
            const edy = this.playerY - e.y;
            const dist = Math.sqrt(edx * edx + edy * edy);
            if (dist > 1) {
                e.x += (edx / dist) * e.speed * dt;
                e.y += (edy / dist) * e.speed * dt;
            }
        }

        // Bullet-enemy collisions
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
                const e = this.enemies[ei];
                const ddx = b.x - e.x;
                const ddy = b.y - e.y;
                const dist = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dist < e.size + this.bulletRadius) {
                    e.hp--;
                    this.bullets.splice(bi, 1);
                    if (e.hp <= 0) {
                        this.score += e.points;
                        // Death particles
                        for (let p = 0; p < 6; p++) {
                            this.particles.push({
                                x: e.x, y: e.y,
                                vx: (Math.random() - 0.5) * 200,
                                vy: (Math.random() - 0.5) * 200,
                                life: 0.4, maxLife: 0.4,
                                color: this.theme.enemy,
                                size: e.size * 0.3,
                            });
                        }
                        this.enemies.splice(ei, 1);
                    }
                    break;
                }
            }
        }

        // Enemy-player collisions
        if (!this.invincible) {
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                const ddx = this.playerX - e.x;
                const ddy = this.playerY - e.y;
                const dist = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dist < ps + e.size) {
                    this.lives--;
                    this.enemies.splice(i, 1);

                    // Hit particles
                    for (let p = 0; p < 8; p++) {
                        this.particles.push({
                            x: this.playerX, y: this.playerY,
                            vx: (Math.random() - 0.5) * 300,
                            vy: (Math.random() - 0.5) * 300,
                            life: 0.5, maxLife: 0.5,
                            color: this.theme.primary,
                            size: 3,
                        });
                    }

                    if (this.lives <= 0) {
                        this.endGame();
                        return;
                    }

                    // Brief invincibility
                    this.invincible = true;
                    this.invincibleTimer = this.invincibleDuration;
                    break;
                }
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    fireBullet() {
        const adx = this.mouseX - this.playerX;
        const ady = this.mouseY - this.playerY;
        const dist = Math.sqrt(adx * adx + ady * ady);
        if (dist < 1) return;

        const vx = (adx / dist) * this.bulletSpeed;
        const vy = (ady / dist) * this.bulletSpeed;

        this.bullets.push({
            x: this.playerX,
            y: this.playerY,
            vx, vy
        });
        this.shootCooldown = this.shootRate;
    }

    onClick(x, y) {
        if (this.gameOver) return;
        this.mouseX = x;
        this.mouseY = y;
        if (this.shootCooldown <= 0) {
            this.fireBullet();
        }
    }

    onMouseMove(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }

    onKeyDown(key) {
        if (key === ' ' && !this.gameOver && this.shootCooldown <= 0) {
            this.fireBullet();
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

        // Arena border
        ctx.strokeStyle = t.primary + '40';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.arenaX, this.arenaY, this.arenaW, this.arenaH);

        // Arena subtle grid
        ctx.strokeStyle = t.primary + '0a';
        ctx.lineWidth = 1;
        for (let x = this.arenaX; x < this.arenaX + this.arenaW; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, this.arenaY);
            ctx.lineTo(x, this.arenaY + this.arenaH);
            ctx.stroke();
        }
        for (let y = this.arenaY; y < this.arenaY + this.arenaH; y += 40) {
            ctx.beginPath();
            ctx.moveTo(this.arenaX, y);
            ctx.lineTo(this.arenaX + this.arenaW, y);
            ctx.stroke();
        }

        // Bullets
        ctx.fillStyle = t.bullet;
        for (const b of this.bullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, this.bulletRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Enemies
        for (const e of this.enemies) {
            if (e.type === 'big') {
                ctx.fillStyle = t.enemy;
                ctx.fillRect(e.x - e.size, e.y - e.size, e.size * 2, e.size * 2);
                // Inner highlight
                ctx.fillStyle = t.enemy + '60';
                ctx.fillRect(e.x - e.size * 0.5, e.y - e.size * 0.5, e.size, e.size);
            } else if (e.type === 'fast') {
                ctx.fillStyle = t.enemy;
                // Triangle shape for fast enemies
                ctx.beginPath();
                const angle = Math.atan2(this.playerY - e.y, this.playerX - e.x);
                ctx.moveTo(e.x + Math.cos(angle) * e.size, e.y + Math.sin(angle) * e.size);
                ctx.lineTo(e.x + Math.cos(angle + 2.4) * e.size, e.y + Math.sin(angle + 2.4) * e.size);
                ctx.lineTo(e.x + Math.cos(angle - 2.4) * e.size, e.y + Math.sin(angle - 2.4) * e.size);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = t.enemy;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                ctx.fill();
                // Eye toward player
                const angle = Math.atan2(this.playerY - e.y, this.playerX - e.x);
                ctx.fillStyle = t.bg;
                ctx.beginPath();
                ctx.arc(
                    e.x + Math.cos(angle) * e.size * 0.4,
                    e.y + Math.sin(angle) * e.size * 0.4,
                    e.size * 0.25, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }

        // Player
        const blink = this.invincible && Math.floor(this.invincibleTimer * 10) % 2 === 0;
        if (!blink) {
            // Aim line
            const aimDx = this.mouseX - this.playerX;
            const aimDy = this.mouseY - this.playerY;
            const aimDist = Math.sqrt(aimDx * aimDx + aimDy * aimDy);
            if (aimDist > 1) {
                ctx.strokeStyle = t.primary + '30';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(this.playerX, this.playerY);
                ctx.lineTo(
                    this.playerX + (aimDx / aimDist) * 40,
                    this.playerY + (aimDy / aimDist) * 40
                );
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Character direction based on mouse
            const charDir = this.mouseX >= this.playerX ? 'right' : 'left';
            drawCharacter(ctx, this.playerX, this.playerY, this.playerSize * 2.2, charDir, 'pistol', this.walkAnim);
        }

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Lives
        ctx.fillStyle = t.secondary;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i < this.lives; i++) {
            ctx.beginPath();
            ctx.arc(W - 20 - i * 24, 22, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Enemy count
        ctx.fillStyle = t.secondary + '80';
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Enemies: ${this.enemies.length}`, W / 2, 15);

        // Instructions
        if (this.score === 0 && this.elapsed < 3) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('WASD to move, Click/Space to shoot', W / 2, H - 12);
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

            ctx.font = '16px monospace';
            ctx.fillText(`Survived: ${Math.floor(this.elapsed)}s`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const enemySpeeds = ['slow', 'medium', 'fast'];
    const spawnRates = ['slow', 'medium', 'fast'];
    const arenaSizes = ['small', 'medium', 'large'];
    let seed = 1;

    for (const theme of themes) {
        for (const enemySpeed of enemySpeeds) {
            for (const spawnRate of spawnRates) {
                const arenaSize = arenaSizes[seed % arenaSizes.length];

                variations.push({
                    name: generateGameName('Shooter', seed),
                    category: 'Shooter',
                    config: {
                        enemySpeed,
                        spawnRate,
                        arenaSize,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Shooter', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 3 * 3 = 72 base

    // Extra variations cycling arena sizes explicitly
    for (const theme of themes) {
        for (const arenaSize of arenaSizes) {
            for (const enemySpeed of enemySpeeds) {
                for (const spawnRate of spawnRates) {
                    // Skip duplicates from first loop
                    if (arenaSize === arenaSizes[seed % arenaSizes.length]) {
                        seed++;
                        continue;
                    }
                    variations.push({
                        name: generateGameName('Shooter', seed),
                        category: 'Shooter',
                        config: {
                            enemySpeed,
                            spawnRate,
                            arenaSize,
                            theme,
                            seed
                        },
                        thumbnail: generateThumbnail('Shooter', { theme }, seed)
                    });
                    seed++;
                }
            }
        }
    }
    // Aiming for ~200 total

    // Fill to ~200 if needed
    while (variations.length < 200) {
        const theme = themes[seed % themes.length];
        const enemySpeed = enemySpeeds[seed % enemySpeeds.length];
        const spawnRate = spawnRates[(seed + 1) % spawnRates.length];
        const arenaSize = arenaSizes[(seed + 2) % arenaSizes.length];

        variations.push({
            name: generateGameName('Shooter', seed),
            category: 'Shooter',
            config: { enemySpeed, spawnRate, arenaSize, theme, seed },
            thumbnail: generateThumbnail('Shooter', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Shooter', ShooterGame, generateVariations);
