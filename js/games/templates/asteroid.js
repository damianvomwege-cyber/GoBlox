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
    { name: 'Classic',  primary: '#ffffff', secondary: '#aaaaaa', bg: '#000000', bullet: '#ffff00', asteroid: '#888888' },
    { name: 'Neon',     primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', bullet: '#ff006e', asteroid: '#60efff' },
    { name: 'Retro',    primary: '#33ff33', secondary: '#33cc33', bg: '#001100', bullet: '#33ff33', asteroid: '#33ff33' },
    { name: 'Inferno',  primary: '#ff6600', secondary: '#ffaa33', bg: '#0f0500', bullet: '#ffff00', asteroid: '#ff8844' },
    { name: 'Ice',      primary: '#88ccff', secondary: '#ddeeff', bg: '#050a18', bullet: '#ffffff', asteroid: '#6699cc' },
    { name: 'Purple',   primary: '#cc66ff', secondary: '#9944cc', bg: '#0a0020', bullet: '#ff66cc', asteroid: '#aa88dd' },
    { name: 'Sunset',   primary: '#ff9944', secondary: '#ffcc66', bg: '#1a0800', bullet: '#ffff88', asteroid: '#cc7733' },
    { name: 'Cyber',    primary: '#00ffcc', secondary: '#00cc99', bg: '#000f0f', bullet: '#ff3366', asteroid: '#33ddaa' },
];

// ── AsteroidGame ────────────────────────────────────────────────────────
class AsteroidGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Ship speed config
        const shipSpeedMap = { slow: 200, medium: 300, fast: 420 };
        this.thrustPower = shipSpeedMap[cfg.shipSpeed] || 300;

        // Asteroid config
        this.startingAsteroids = cfg.asteroidCount || 6;
        const asteroidSpeedMap = { slow: 40, medium: 70, fast: 110 };
        this.asteroidBaseSpeed = asteroidSpeedMap[cfg.asteroidSpeed] || 70;

        // Ship state
        this.ship = {
            x: W / 2,
            y: H / 2,
            angle: -Math.PI / 2, // Pointing up
            vx: 0,
            vy: 0,
            radius: 14,
            thrusting: false,
        };

        this.lives = 3;
        this.invulnTimer = 2; // Brief invulnerability at start
        this.level = 1;

        // Bullets
        this.bullets = [];
        this.shootCooldown = 0;

        // Asteroids
        this.asteroids = [];
        this.spawnAsteroidWave(this.startingAsteroids);

        // Particles
        this.particles = [];

        // Stars background
        this.stars = [];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: this.rng() * W,
                y: this.rng() * H,
                size: 0.5 + this.rng() * 1.5,
                brightness: 0.3 + this.rng() * 0.7,
            });
        }
    }

    spawnAsteroidWave(count) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        for (let i = 0; i < count; i++) {
            this.spawnAsteroid('large', null);
        }
    }

    spawnAsteroid(size, pos) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const sizeMap = { large: 40, medium: 22, small: 12 };
        const radius = sizeMap[size] || 40;

        let x, y;
        if (pos) {
            x = pos.x;
            y = pos.y;
        } else {
            // Spawn away from ship
            const side = Math.floor(this.rng() * 4);
            switch (side) {
                case 0: x = this.rng() * W; y = -radius; break;
                case 1: x = W + radius; y = this.rng() * H; break;
                case 2: x = this.rng() * W; y = H + radius; break;
                default: x = -radius; y = this.rng() * H; break;
            }
        }

        const angle = this.rng() * Math.PI * 2;
        const speed = this.asteroidBaseSpeed * (0.5 + this.rng() * 0.8) * (size === 'small' ? 1.5 : size === 'medium' ? 1.2 : 1);

        // Generate random polygon vertices for visual variety
        const verts = [];
        const vertCount = 8 + Math.floor(this.rng() * 5);
        for (let i = 0; i < vertCount; i++) {
            const a = (i / vertCount) * Math.PI * 2;
            const r = radius * (0.7 + this.rng() * 0.3);
            verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }

        this.asteroids.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius,
            size,
            rotation: this.rng() * Math.PI * 2,
            rotSpeed: (this.rng() - 0.5) * 2,
            verts,
        });
    }

    wrap(obj) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        if (obj.x < -50) obj.x += W + 100;
        if (obj.x > W + 50) obj.x -= W + 100;
        if (obj.y < -50) obj.y += H + 100;
        if (obj.y > H + 50) obj.y -= H + 100;
    }

    onKeyDown(key) {
        if (this.gameOver) return;
        if (key === ' ' || key === 'Space') {
            this.shootBullet();
        }
    }

    shootBullet() {
        if (this.shootCooldown > 0) return;
        this.shootCooldown = 0.15;

        const s = this.ship;
        const speed = 450;
        this.bullets.push({
            x: s.x + Math.cos(s.angle) * s.radius,
            y: s.y + Math.sin(s.angle) * s.radius,
            vx: Math.cos(s.angle) * speed + s.vx * 0.3,
            vy: Math.sin(s.angle) * speed + s.vy * 0.3,
            life: 1.5,
        });
    }

    update(dt) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const s = this.ship;

        // Invulnerability
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        // Ship rotation
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            s.angle -= 4.5 * dt;
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            s.angle += 4.5 * dt;
        }

        // Thrust
        s.thrusting = !!(this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']);
        if (s.thrusting) {
            s.vx += Math.cos(s.angle) * this.thrustPower * dt;
            s.vy += Math.sin(s.angle) * this.thrustPower * dt;

            // Thrust particles
            if (Math.random() < 0.6) {
                this.particles.push({
                    x: s.x - Math.cos(s.angle) * s.radius,
                    y: s.y - Math.sin(s.angle) * s.radius,
                    vx: -Math.cos(s.angle) * 80 + (Math.random() - 0.5) * 60,
                    vy: -Math.sin(s.angle) * 80 + (Math.random() - 0.5) * 60,
                    life: 0.3 + Math.random() * 0.3,
                    maxLife: 0.6,
                    color: '#ff8833',
                });
            }
        }

        // Friction
        const friction = 0.99;
        s.vx *= friction;
        s.vy *= friction;

        // Speed cap
        const maxSpeed = 500;
        const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        if (speed > maxSpeed) {
            s.vx = (s.vx / speed) * maxSpeed;
            s.vy = (s.vy / speed) * maxSpeed;
        }

        // Move ship
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        this.wrap(s);

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0 || b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) {
                this.bullets.splice(i, 1);
            }
        }

        // Update asteroids
        for (const a of this.asteroids) {
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            a.rotation += a.rotSpeed * dt;
            this.wrap(a);
        }

        // Bullet-asteroid collision
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                if (dx * dx + dy * dy < a.radius * a.radius) {
                    // Hit!
                    this.bullets.splice(bi, 1);

                    // Score
                    const scoreMap = { large: 25, medium: 50, small: 100 };
                    this.score += scoreMap[a.size] || 25;

                    // Explosion particles
                    for (let p = 0; p < 8; p++) {
                        this.particles.push({
                            x: a.x, y: a.y,
                            vx: (Math.random() - 0.5) * 150,
                            vy: (Math.random() - 0.5) * 150,
                            life: 0.3 + Math.random() * 0.4,
                            maxLife: 0.7,
                            color: this.theme.asteroid,
                        });
                    }

                    // Split asteroid
                    if (a.size === 'large') {
                        this.spawnAsteroid('medium', { x: a.x, y: a.y });
                        this.spawnAsteroid('medium', { x: a.x, y: a.y });
                    } else if (a.size === 'medium') {
                        this.spawnAsteroid('small', { x: a.x, y: a.y });
                        this.spawnAsteroid('small', { x: a.x, y: a.y });
                    }

                    this.asteroids.splice(ai, 1);
                    break;
                }
            }
        }

        // Ship-asteroid collision
        if (this.invulnTimer <= 0) {
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                const dx = s.x - a.x;
                const dy = s.y - a.y;
                if (dx * dx + dy * dy < (s.radius + a.radius) * (s.radius + a.radius) * 0.6) {
                    // Hit ship
                    this.lives--;

                    // Explosion
                    for (let p = 0; p < 12; p++) {
                        this.particles.push({
                            x: s.x, y: s.y,
                            vx: (Math.random() - 0.5) * 200,
                            vy: (Math.random() - 0.5) * 200,
                            life: 0.5 + Math.random() * 0.5,
                            maxLife: 1.0,
                            color: this.theme.primary,
                        });
                    }

                    if (this.lives <= 0) {
                        this.endGame();
                        return;
                    }

                    // Respawn ship at center
                    s.x = W / 2;
                    s.y = H / 2;
                    s.vx = 0;
                    s.vy = 0;
                    this.invulnTimer = 2;
                    break;
                }
            }
        }

        // Check wave clear — spawn next wave
        if (this.asteroids.length === 0) {
            this.level++;
            this.spawnAsteroidWave(this.startingAsteroids + this.level - 1);
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

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;
        const s = this.ship;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Stars
        for (const star of this.stars) {
            ctx.fillStyle = t.secondary;
            ctx.globalAlpha = star.brightness * 0.6;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Asteroids
        for (const a of this.asteroids) {
            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.rotation);

            ctx.strokeStyle = t.asteroid;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(a.verts[0].x, a.verts[0].y);
            for (let i = 1; i < a.verts.length; i++) {
                ctx.lineTo(a.verts[i].x, a.verts[i].y);
            }
            ctx.closePath();
            ctx.stroke();

            // Subtle fill
            ctx.fillStyle = t.asteroid + '15';
            ctx.fill();

            ctx.restore();
        }

        // Bullets
        ctx.fillStyle = t.bullet;
        for (const b of this.bullets) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ship (only if alive)
        if (!this.gameOver) {
            // Invulnerability blink
            if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 8) % 2 === 0) {
                ctx.globalAlpha = 0.3;
            }

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);

            // Ship triangle
            ctx.strokeStyle = t.primary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.radius, 0);
            ctx.lineTo(-s.radius * 0.7, -s.radius * 0.6);
            ctx.lineTo(-s.radius * 0.4, 0);
            ctx.lineTo(-s.radius * 0.7, s.radius * 0.6);
            ctx.closePath();
            ctx.stroke();

            // Fill
            ctx.fillStyle = t.primary + '20';
            ctx.fill();

            // Thrust flame
            if (s.thrusting) {
                ctx.fillStyle = '#ff6600';
                ctx.beginPath();
                ctx.moveTo(-s.radius * 0.5, -s.radius * 0.25);
                ctx.lineTo(-s.radius * (0.9 + Math.random() * 0.5), 0);
                ctx.lineTo(-s.radius * 0.5, s.radius * 0.25);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
            ctx.globalAlpha = 1;
        }

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Lives
        ctx.font = '14px monospace';
        ctx.fillStyle = t.secondary;
        ctx.fillText(`Wave: ${this.level}`, 12, 38);

        // Lives as small ships
        for (let i = 0; i < this.lives; i++) {
            const lx = W - 30 - i * 24;
            const ly = 20;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(-Math.PI / 2);
            ctx.strokeStyle = t.primary;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-5, -4);
            ctx.lineTo(-3, 0);
            ctx.lineTo(-5, 4);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // Instructions at start
        if (this.score === 0 && this.invulnTimer > 0) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Left/Right: rotate | Up/W: thrust | Space: shoot', W / 2, H - 16);
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

            ctx.font = '18px monospace';
            ctx.fillText(`Wave: ${this.level}`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const shipSpeeds = ['slow', 'medium', 'fast'];
    const asteroidCounts = [4, 6, 8];
    const asteroidSpeeds = ['slow', 'medium', 'fast'];
    let seed = 1;

    for (const shipSpeed of shipSpeeds) {
        for (const asteroidCount of asteroidCounts) {
            for (const asteroidSpeed of asteroidSpeeds) {
                for (const theme of themes) {
                    variations.push({
                        name: generateGameName('Space', seed),
                        category: 'Space',
                        config: {
                            shipSpeed,
                            asteroidCount,
                            asteroidSpeed,
                            theme,
                            seed,
                        },
                        thumbnail: generateThumbnail('Space', { theme }, seed),
                    });
                    seed++;
                    if (variations.length >= 150) break;
                }
                if (variations.length >= 150) break;
            }
            if (variations.length >= 150) break;
        }
        if (variations.length >= 150) break;
    }
    // 3 * 3 * 3 * 8 = 216 but capped at 150
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Asteroid', AsteroidGame, generateVariations);
