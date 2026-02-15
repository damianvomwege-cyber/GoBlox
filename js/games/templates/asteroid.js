import { BaseGame } from '../base-game.js';
import { BaseGame3D, mulberry32 as mulberry32_3d } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
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

// ══════════════════════════════════════════════════════════════════════════
// 3D AsteroidGame — Space flight with asteroids
// ══════════════════════════════════════════════════════════════════════════
class AsteroidGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32_3d(cfg.seed || 1);

        // Ship speed config
        const shipSpeedMap = { slow: 15, medium: 25, fast: 35 };
        this.thrustPower = shipSpeedMap[cfg.shipSpeed] || 25;

        // Asteroid config
        this.startingAsteroids = cfg.asteroidCount || 6;
        const asteroidSpeedMap = { slow: 6, medium: 10, fast: 16 };
        this.asteroidBaseSpeed = asteroidSpeedMap[cfg.asteroidSpeed] || 10;

        // Disable gravity and default player movement
        this.gravity = 0;
        this.moveSpeed = 0;
        this.playerModel.visible = false;

        // Ship state
        this.shipPos = new THREE.Vector3(0, 0, 0);
        this.shipVel = new THREE.Vector3(0, 0, 0);
        this.shipYaw = 0;       // rotation around Y
        this.shipPitch = 0;     // slight visual pitch when thrusting
        this.thrusting = false;
        this.lives = 3;
        this.invulnTimer = 2;
        this.level = 1;
        this.shootCooldown = 0;

        // Arena bounds
        this.arenaSize = 80;

        // Build scene
        this.buildSpaceScene();
        this.buildShipModel();

        // Bullets
        this.bullets3D = [];

        // Asteroids
        this.asteroids3D = [];
        this.spawnAsteroidWave3D(this.startingAsteroids);

        // Explosion particles
        this.explosionParticles = [];

        // HUD
        this.createHUD();
        this.createLivesDisplay();

        // Remove pointer lock message - we use keys, not mouse for camera
        if (this.lockMsg) this.lockMsg.style.display = 'none';
    }

    buildSpaceScene() {
        // Dark background - no sky dome, just black
        this.scene.background = new THREE.Color(0x020208);
        this.scene.fog = null;

        // Remove default hemisphere and ambient lights, use space-specific lighting
        // We keep the sun light but adjust for space feel
        if (this.sunLight) {
            this.sunLight.intensity = 0.8;
            this.sunLight.position.set(50, 30, 50);
        }

        // Add point light on ship (will be moved with ship)
        this.shipLight = new THREE.PointLight(0x4488ff, 0.6, 40);
        this.scene.add(this.shipLight);

        // Starfield particle system
        const starCount = 1500;
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        for (let i = 0; i < starCount; i++) {
            starPositions[i * 3] = (this.rng() - 0.5) * 500;
            starPositions[i * 3 + 1] = (this.rng() - 0.5) * 500;
            starPositions[i * 3 + 2] = (this.rng() - 0.5) * 500;
            starSizes[i] = 0.3 + this.rng() * 1.2;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.8,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8,
        });
        this.starField = new THREE.Points(starGeo, starMat);
        this.scene.add(this.starField);

        // Distant planet
        const planetGeo = new THREE.SphereGeometry(20, 24, 24);
        const planetMat = new THREE.MeshStandardMaterial({
            color: 0x445577,
            roughness: 0.8,
            metalness: 0.2,
            emissive: 0x112233,
            emissiveIntensity: 0.1,
        });
        const planet = new THREE.Mesh(planetGeo, planetMat);
        planet.position.set(-100, 30, -150);
        this.scene.add(planet);

        // Planet ring
        const ringGeo = new THREE.TorusGeometry(28, 1.5, 6, 48);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x667799,
            roughness: 0.6,
            transparent: true,
            opacity: 0.5,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(planet.position);
        ring.rotation.x = Math.PI * 0.35;
        this.scene.add(ring);
    }

    buildShipModel() {
        this.shipGroup = new THREE.Group();

        // Main hull
        const hullGeo = new THREE.ConeGeometry(0.6, 2.5, 6);
        const hullMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.3, metalness: 0.6 });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.rotation.x = Math.PI / 2;
        hull.castShadow = true;
        this.shipGroup.add(hull);

        // Wings
        const wingGeo = new THREE.BoxGeometry(3.0, 0.08, 1.0);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x8888aa, roughness: 0.4, metalness: 0.5 });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(0, 0, 0.4);
        wings.castShadow = true;
        this.shipGroup.add(wings);

        // Engine glow
        const engineGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const engineMat = new THREE.MeshStandardMaterial({
            color: 0x3388ff,
            emissive: 0x3388ff,
            emissiveIntensity: 0.8,
        });
        this.engineGlow = new THREE.Mesh(engineGeo, engineMat);
        this.engineGlow.position.set(0, 0, 1.3);
        this.engineGlow.visible = false;
        this.shipGroup.add(this.engineGlow);

        // Thrust flame (cone behind ship)
        const flameGeo = new THREE.ConeGeometry(0.2, 1.5, 6);
        const flameMat = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff4400,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.8,
        });
        this.thrustFlame = new THREE.Mesh(flameGeo, flameMat);
        this.thrustFlame.rotation.x = -Math.PI / 2;
        this.thrustFlame.position.set(0, 0, 2.0);
        this.thrustFlame.visible = false;
        this.shipGroup.add(this.thrustFlame);

        this.shipGroup.position.copy(this.shipPos);
        this.scene.add(this.shipGroup);
    }

    spawnAsteroidWave3D(count) {
        for (let i = 0; i < count; i++) {
            this.spawnAsteroid3D('large', null);
        }
    }

    spawnAsteroid3D(size, pos) {
        const sizeMap = { large: 3.5, medium: 2.0, small: 1.0 };
        const radius = sizeMap[size] || 3.5;

        let x, y, z;
        if (pos) {
            x = pos.x + (this.rng() - 0.5) * 2;
            y = pos.y + (this.rng() - 0.5) * 2;
            z = pos.z + (this.rng() - 0.5) * 2;
        } else {
            // Spawn away from ship at edge of arena
            const angle = this.rng() * Math.PI * 2;
            const dist = this.arenaSize * 0.4 + this.rng() * this.arenaSize * 0.3;
            x = Math.cos(angle) * dist;
            z = Math.sin(angle) * dist;
            y = (this.rng() - 0.5) * 20;
        }

        const moveAngle = this.rng() * Math.PI * 2;
        const moveAngleV = (this.rng() - 0.5) * 0.5;
        const speed = this.asteroidBaseSpeed * (0.5 + this.rng() * 0.8) * (size === 'small' ? 1.5 : size === 'medium' ? 1.2 : 1);

        // Create rocky mesh with random deformation
        const geo = new THREE.IcosahedronGeometry(radius, 1);
        const positions = geo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const px = positions.getX(i);
            const py = positions.getY(i);
            const pz = positions.getZ(i);
            const len = Math.sqrt(px * px + py * py + pz * pz);
            const deform = 0.7 + this.rng() * 0.3;
            positions.setXYZ(i, px / len * radius * deform, py / len * radius * deform, pz / len * radius * deform);
        }
        positions.needsUpdate = true;
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        this.scene.add(mesh);

        this.asteroids3D.push({
            mesh,
            size,
            radius,
            vx: Math.cos(moveAngle) * Math.cos(moveAngleV) * speed,
            vy: Math.sin(moveAngleV) * speed * 0.3,
            vz: Math.sin(moveAngle) * Math.cos(moveAngleV) * speed,
            rotAxis: new THREE.Vector3(this.rng() - 0.5, this.rng() - 0.5, this.rng() - 0.5).normalize(),
            rotSpeed: (this.rng() - 0.5) * 2,
        });
    }

    wrapPosition(pos) {
        const half = this.arenaSize;
        if (pos.x < -half) pos.x += half * 2;
        if (pos.x > half) pos.x -= half * 2;
        if (pos.z < -half) pos.z += half * 2;
        if (pos.z > half) pos.z -= half * 2;
        // Clamp Y loosely
        pos.y = Math.max(-30, Math.min(30, pos.y));
    }

    onKeyDown(code) {
        if (this.gameOver) return;
        if (code === 'Space') {
            this.shootBullet3D();
        }
    }

    shootBullet3D() {
        if (this.shootCooldown > 0) return;
        this.shootCooldown = 0.15;

        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.shipYaw);

        const speed = 60;
        const geo = new THREE.SphereGeometry(0.12, 6, 6);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 1.0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(this.shipPos).addScaledVector(dir, 1.5);
        this.scene.add(mesh);

        this.bullets3D.push({
            mesh,
            vx: dir.x * speed + this.shipVel.x * 0.3,
            vy: dir.y * speed,
            vz: dir.z * speed + this.shipVel.z * 0.3,
            life: 2.0,
        });
    }

    spawnExplosion(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.1 + this.rng() * 0.15, 4, 4);
            const mat = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.5,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            this.scene.add(mesh);

            this.explosionParticles.push({
                mesh,
                vx: (this.rng() - 0.5) * 30,
                vy: (this.rng() - 0.5) * 30,
                vz: (this.rng() - 0.5) * 30,
                life: 0.4 + this.rng() * 0.4,
                maxLife: 0.8,
            });
        }
    }

    updatePlayer(dt) {
        if (this.gameOver) return;

        // Invulnerability
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        // Ship rotation: A/D
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            this.shipYaw += 3.5 * dt;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            this.shipYaw -= 3.5 * dt;
        }

        // Thrust: W
        this.thrusting = !!(this.keys['KeyW'] || this.keys['ArrowUp']);
        if (this.thrusting) {
            const dir = new THREE.Vector3(0, 0, -1);
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.shipYaw);
            this.shipVel.x += dir.x * this.thrustPower * dt;
            this.shipVel.z += dir.z * this.thrustPower * dt;
        }

        // Friction in space (very slight)
        this.shipVel.multiplyScalar(0.995);

        // Speed cap
        const maxSpeed = 40;
        const speed = this.shipVel.length();
        if (speed > maxSpeed) {
            this.shipVel.multiplyScalar(maxSpeed / speed);
        }

        // Move ship
        this.shipPos.x += this.shipVel.x * dt;
        this.shipPos.y += this.shipVel.y * dt;
        this.shipPos.z += this.shipVel.z * dt;
        this.wrapPosition(this.shipPos);

        // Update ship model
        this.shipGroup.position.copy(this.shipPos);
        this.shipGroup.rotation.y = this.shipYaw;

        // Thrust visuals
        this.engineGlow.visible = this.thrusting;
        this.thrustFlame.visible = this.thrusting;
        if (this.thrusting) {
            this.thrustFlame.scale.z = 0.8 + Math.random() * 0.4;
        }

        // Invulnerability blink
        if (this.invulnTimer > 0) {
            this.shipGroup.visible = Math.floor(this.invulnTimer * 8) % 2 === 0;
        } else {
            this.shipGroup.visible = true;
        }

        // Ship light follows
        this.shipLight.position.copy(this.shipPos);

        // Sync playerPosition for camera system
        this.playerPosition.copy(this.shipPos);
    }

    updateCamera(dt) {
        // Third-person behind ship
        const camDir = new THREE.Vector3(0, 0, 1);
        camDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.shipYaw);

        const targetPos = new THREE.Vector3(
            this.shipPos.x + camDir.x * 10,
            this.shipPos.y + 4,
            this.shipPos.z + camDir.z * 10
        );

        const t = 1 - Math.exp(-6 * dt);
        this.camera.position.lerp(targetPos, t);
        this.camera.lookAt(this.shipPos.x, this.shipPos.y, this.shipPos.z);

        // Move sun with ship
        if (this.sunLight) {
            this.sunLight.position.set(this.shipPos.x + 30, this.shipPos.y + 50, this.shipPos.z + 30);
            this.sunLight.target.position.copy(this.shipPos);
        }
    }

    update(dt) {
        if (this.gameOver) return;

        // Update bullets
        for (let i = this.bullets3D.length - 1; i >= 0; i--) {
            const b = this.bullets3D[i];
            b.mesh.position.x += b.vx * dt;
            b.mesh.position.y += b.vy * dt;
            b.mesh.position.z += b.vz * dt;
            b.life -= dt;
            if (b.life <= 0) {
                this.scene.remove(b.mesh);
                this.bullets3D.splice(i, 1);
            }
        }

        // Update asteroids
        for (const a of this.asteroids3D) {
            a.mesh.position.x += a.vx * dt;
            a.mesh.position.y += a.vy * dt;
            a.mesh.position.z += a.vz * dt;
            a.mesh.rotateOnAxis(a.rotAxis, a.rotSpeed * dt);
            this.wrapPosition(a.mesh.position);
            // Keep Y loosely bounded
            a.mesh.position.y = Math.max(-20, Math.min(20, a.mesh.position.y));
        }

        // Bullet-asteroid collision
        for (let bi = this.bullets3D.length - 1; bi >= 0; bi--) {
            const b = this.bullets3D[bi];
            for (let ai = this.asteroids3D.length - 1; ai >= 0; ai--) {
                const a = this.asteroids3D[ai];
                const dist = b.mesh.position.distanceTo(a.mesh.position);
                if (dist < a.radius + 0.3) {
                    // Hit!
                    this.scene.remove(b.mesh);
                    this.bullets3D.splice(bi, 1);

                    const scoreMap = { large: 25, medium: 50, small: 100 };
                    this.score += scoreMap[a.size] || 25;

                    this.spawnExplosion(a.mesh.position, 0x888888, 8);

                    // Split asteroid
                    if (a.size === 'large') {
                        this.spawnAsteroid3D('medium', a.mesh.position);
                        this.spawnAsteroid3D('medium', a.mesh.position);
                    } else if (a.size === 'medium') {
                        this.spawnAsteroid3D('small', a.mesh.position);
                        this.spawnAsteroid3D('small', a.mesh.position);
                    }

                    this.scene.remove(a.mesh);
                    this.asteroids3D.splice(ai, 1);
                    break;
                }
            }
        }

        // Ship-asteroid collision
        if (this.invulnTimer <= 0) {
            for (let ai = this.asteroids3D.length - 1; ai >= 0; ai--) {
                const a = this.asteroids3D[ai];
                const dist = this.shipPos.distanceTo(a.mesh.position);
                if (dist < a.radius + 0.8) {
                    this.lives--;
                    this.spawnExplosion(this.shipPos, 0xffaa44, 12);
                    this.updateLivesDisplay();

                    if (this.lives <= 0) {
                        this.endGame();
                        return;
                    }

                    // Respawn ship at center
                    this.shipPos.set(0, 0, 0);
                    this.shipVel.set(0, 0, 0);
                    this.invulnTimer = 2;
                    break;
                }
            }
        }

        // Check wave clear
        if (this.asteroids3D.length === 0) {
            this.level++;
            this.spawnAsteroidWave3D(this.startingAsteroids + this.level - 1);
        }

        // Update explosion particles
        for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
            const p = this.explosionParticles[i];
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.life -= dt;
            const alpha = Math.max(0, p.life / p.maxLife);
            p.mesh.scale.setScalar(alpha);
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.explosionParticles.splice(i, 1);
            }
        }

        // Update HUD
        this.updateHUDScore(this.score);
        if (this.hudInfoEl) {
            this.hudInfoEl.textContent = `Wave: ${this.level}  Lives: ${this.lives}`;
        }
    }

    createLivesDisplay() {
        if (!this.hudEl) return;
        this.livesEl = document.createElement('div');
        this.livesEl.style.cssText = 'position:absolute;top:8px;right:12px;color:#ffaa44;font:bold 18px monospace;';
        this.livesEl.textContent = '\u2665'.repeat(this.lives);
        this.hudEl.appendChild(this.livesEl);
    }

    updateLivesDisplay() {
        if (this.livesEl) {
            this.livesEl.textContent = '\u2665'.repeat(Math.max(0, this.lives));
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
                    const is3D = seed % 2 === 0;
                    const name = generateGameName('Space', seed);
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Space',
                        is3D,
                        config: {
                            shipSpeed,
                            asteroidCount,
                            asteroidSpeed,
                            theme,
                            seed,
                            name: name + (is3D ? ' 3D' : ''),
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
GameRegistry.registerTemplate3D('Asteroid', AsteroidGame, AsteroidGame3D, generateVariations);
