import { BaseGame } from '../base-game.js';
import { BaseGame3D, buildCharacterModel, mulberry32 } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import { drawCharacter } from '../character.js';
import * as THREE from 'three';

// ── Seeded PRNG (for 2D fallback) ───────────────────────────────────────
function mulberry32_2d(seed) {
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
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', color3d: 0x00ff87, accent3d: 0x60efff, skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e, ground: 0x0a0a2e },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', color3d: 0xff6b35, accent3d: 0xffd700, skyTop: 0x1a0a00, skyBottom: 0x3a1a00, fog: 0x1a0a00, ground: 0x2a1500 },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e', color3d: 0x0077b6, accent3d: 0x90e0ef, skyTop: 0x03045e, skyBottom: 0x0a0a4e, fog: 0x03045e, ground: 0x02033e },
    { name: 'Forest',    primary: '#2d6a4f', secondary: '#95d5b2', bg: '#081c15', color3d: 0x2d6a4f, accent3d: 0x95d5b2, skyTop: 0x4a9a6f, skyBottom: 0x081c15, fog: 0x1a3a2a, ground: 0x1a3a2a },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', color3d: 0xff69b4, accent3d: 0xffb6c1, skyTop: 0xff69b4, skyBottom: 0x2b0012, fog: 0x2b0012, ground: 0x3b0022 },
    { name: 'Midnight',  primary: '#7b2ff7', secondary: '#c084fc', bg: '#0f0720', color3d: 0x7b2ff7, accent3d: 0xc084fc, skyTop: 0x0f0720, skyBottom: 0x1f1740, fog: 0x0f0720, ground: 0x0a0515 },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e', color3d: 0xf72585, accent3d: 0x4cc9f0, skyTop: 0x1a1a2e, skyBottom: 0x2a2a4e, fog: 0x1a1a2e, ground: 0x15152a },
    { name: 'Desert',    primary: '#e9c46a', secondary: '#f4a261', bg: '#1d1306', color3d: 0xe9c46a, accent3d: 0xf4a261, skyTop: 0xc9a44a, skyBottom: 0x1d1306, fog: 0x3d3316, ground: 0x2d2310 },
    { name: 'Arctic',    primary: '#a8dadc', secondary: '#f1faee', bg: '#0d1b2a', color3d: 0xa8dadc, accent3d: 0xf1faee, skyTop: 0x87ceeb, skyBottom: 0x0d1b2a, fog: 0x5d8baa, ground: 0xc8d8dc },
    { name: 'Toxic',     primary: '#aaff00', secondary: '#69ff36', bg: '#0a1500', color3d: 0xaaff00, accent3d: 0x69ff36, skyTop: 0x0a1500, skyBottom: 0x1a2a10, fog: 0x0a1500, ground: 0x0a1a00 },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', color3d: 0xff6f61, accent3d: 0xffcc5c, skyTop: 0xff6f61, skyBottom: 0x1a0510, fog: 0x3a1520, ground: 0x2a0a15 },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', color3d: 0x00f5d4, accent3d: 0xf15bb5, skyTop: 0x10002b, skyBottom: 0x20104b, fog: 0x10002b, ground: 0x0a001b },
];

// ══════════════════════════════════════════════════════════════════════════
// 2D PlatformerGame (original, kept intact)
// ══════════════════════════════════════════════════════════════════════════
class PlatformerGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.gravity = cfg.gravity;
        this.scrollSpeed = cfg.speed;
        this.platformDensity = cfg.platformDensity;
        this.gapSize = cfg.gapSize;

        const W = this.canvas.width;
        const H = this.canvas.height;

        this.playerW = 24;
        this.playerH = 36;
        this.playerDirection = 'right';
        this.walkAnim = 0;
        this.playerX = W * 0.2;
        this.playerY = H - 80;
        this.playerVY = 0;
        this.isGrounded = false;

        this.rng = mulberry32_2d(cfg.seed || 42);
        this.distance = 0;
        this.cameraX = 0;

        this.platforms = [];
        this.generateInitialPlatforms();
        this.particles = [];
    }

    generateInitialPlatforms() {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const groundY = H - 40;
        this.platforms.push({ x: -100, y: groundY, w: W * 0.6, h: 20 });
        let lastX = W * 0.5;
        const count = 60;
        for (let i = 0; i < count; i++) {
            const gap = this.gapSize * (40 + this.rng() * 30);
            const platW = this.platformDensity * (60 + this.rng() * 80);
            const yVariation = groundY - 20 - this.rng() * (H * 0.45);
            const y = Math.max(80, Math.min(groundY, yVariation));
            lastX += gap;
            this.platforms.push({ x: lastX, y, w: platW, h: 16 });
            lastX += platW;
        }
        this.nextPlatformX = lastX;
    }

    generateMorePlatforms() {
        const H = this.canvas.height;
        const groundY = H - 40;
        const count = 20;
        let lastX = this.nextPlatformX;
        for (let i = 0; i < count; i++) {
            const gap = this.gapSize * (40 + this.rng() * 30);
            const platW = this.platformDensity * (60 + this.rng() * 80);
            const yVariation = groundY - 20 - this.rng() * (H * 0.45);
            const y = Math.max(80, Math.min(groundY, yVariation));
            lastX += gap;
            this.platforms.push({ x: lastX, y, w: platW, h: 16 });
            lastX += platW;
        }
        this.nextPlatformX = lastX;
    }

    update(dt) {
        const H = this.canvas.height;
        const scrollPx = this.scrollSpeed * 200 * dt;
        this.cameraX += scrollPx;
        this.distance += scrollPx;
        this.score = Math.floor(this.distance / 10);
        if (this.nextPlatformX - this.cameraX < this.canvas.width * 3) {
            this.generateMorePlatforms();
        }
        this.platforms = this.platforms.filter(p => p.x + p.w > this.cameraX - 200);
        this.playerVY += this.gravity * 1800 * dt;
        this.playerY += this.playerVY * dt;
        this.isGrounded = false;
        const px = this.playerX + this.cameraX;
        const py = this.playerY;
        const pw = this.playerW;
        const ph = this.playerH;
        for (const plat of this.platforms) {
            if (px + pw > plat.x && px < plat.x + plat.w && py + ph >= plat.y && py + ph <= plat.y + 20 && this.playerVY >= 0) {
                this.playerY = plat.y - ph;
                this.playerVY = 0;
                this.isGrounded = true;
                break;
            }
        }
        if (this.isGrounded && this.rng() > 0.85) {
            this.particles.push({ x: this.playerX + this.playerW / 2, y: this.playerY + this.playerH, vx: (this.rng() - 0.5) * 40, vy: -this.rng() * 30, life: 0.4, maxLife: 0.4 });
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        if (this.isGrounded) this.walkAnim += dt * 6;
        if (this.playerY > H + 50) this.endGame();
    }

    onKeyDown(key) {
        if (this.gameOver) return;
        if ((key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') && this.isGrounded) {
            this.playerVY = -this.gravity * 600;
            this.isGrounded = false;
            for (let i = 0; i < 6; i++) {
                this.particles.push({ x: this.playerX + this.playerW / 2, y: this.playerY + this.playerH, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, life: 0.5, maxLife: 0.5 });
            }
        }
    }

    render() {
        const ctx = this.ctx; const W = this.canvas.width; const H = this.canvas.height; const t = this.theme;
        ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = t.secondary + '15';
        for (let i = 0; i < 40; i++) {
            const bx = ((i * 137.5 + 50) % (W + 200)) - (this.cameraX * 0.1 % (W + 200));
            const by = (i * 83.7 + 30) % H;
            ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.save(); ctx.translate(-this.cameraX, 0);
        for (const plat of this.platforms) {
            if (plat.x + plat.w < this.cameraX - 50 || plat.x > this.cameraX + W + 50) continue;
            ctx.fillStyle = t.secondary; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = t.primary; ctx.fillRect(plat.x, plat.y, plat.w, 4);
            ctx.fillStyle = t.primary + '60'; ctx.fillRect(plat.x, plat.y, 3, plat.h); ctx.fillRect(plat.x + plat.w - 3, plat.y, 3, plat.h);
        }
        const worldPlayerX = this.playerX + this.cameraX;
        const charCenterX = worldPlayerX + this.playerW / 2;
        const charCenterY = this.playerY + this.playerH / 2;
        drawCharacter(ctx, charCenterX, charCenterY, this.playerH, 'right', 'none', this.isGrounded ? this.walkAnim : 0);
        ctx.restore();
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife; ctx.fillStyle = t.primary; ctx.globalAlpha = alpha; ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = t.primary; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`Score: ${this.score}`, 15, 15);
        if (this.distance < 200) { ctx.fillStyle = t.secondary + 'aa'; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.fillText('Press SPACE / UP / W to jump', W / 2, H - 20); }
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = t.primary; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GAME OVER', W / 2, H / 2 - 30);
            ctx.fillStyle = t.secondary; ctx.font = 'bold 28px monospace'; ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 20);
            ctx.fillStyle = t.secondary + 'aa'; ctx.font = '18px monospace'; ctx.fillText('Refresh to play again', W / 2, H / 2 + 60);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 3D PlatformerGame — Obby-style floating platforms
// ══════════════════════════════════════════════════════════════════════════
class PlatformerGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 42);
        this.platformsReached = 0;
        this.currentPlatformIndex = 0;

        // Adjust physics for platformer
        this.moveSpeed = 7;
        this.jumpForce = 11;
        this.gravity = -28;
        this.cameraDistance = 12;
        this.cameraHeight = 6;
        this.cameraAngleY = 0.35;

        // Sky and fog
        this.createSky(cfg.theme.skyTop, cfg.theme.skyBottom, cfg.theme.fog, 40, 180);

        // No ground plane — falling is death
        // But add a distant ground far below for visual reference
        const farGroundGeo = new THREE.PlaneGeometry(500, 500);
        const farGroundMat = new THREE.MeshStandardMaterial({ color: cfg.theme.ground, roughness: 1 });
        const farGround = new THREE.Mesh(farGroundGeo, farGroundMat);
        farGround.rotation.x = -Math.PI / 2;
        farGround.position.y = -50;
        farGround.receiveShadow = true;
        this.scene.add(farGround);

        // Generate platforms
        this.platforms3D = [];
        this.platformMeshes = [];

        // Reusable materials
        this.platMat = new THREE.MeshStandardMaterial({ color: cfg.theme.color3d, roughness: 0.6, metalness: 0.1 });
        this.platAccentMat = new THREE.MeshStandardMaterial({ color: cfg.theme.accent3d, roughness: 0.5, metalness: 0.2 });

        // Starting platform (large)
        this.addPlatform(0, 0, 0, 6, 0.5, 6, false);

        // Generate a path of platforms
        this.generatePlatforms(80);

        // Player starts on first platform
        this.playerPosition.set(0, 0.5, 0);

        // HUD
        this.createHUD();

        // Config name for display
        this.config.name = cfg.name || 'Platformer 3D';
    }

    addPlatform(x, y, z, w, h, d, isMoving = false) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, this.rng() > 0.7 ? this.platAccentMat : this.platMat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const platData = {
            mesh,
            x: x - w / 2, y: y - h / 2, z: z - d / 2,
            w, h, d,
            isMoving,
            moveAxis: null,
            moveRange: 0,
            moveSpeed: 0,
            movePhase: 0,
            origX: x, origY: y, origZ: z
        };

        if (isMoving) {
            const axis = this.rng() < 0.5 ? 'x' : 'z';
            platData.moveAxis = axis;
            platData.moveRange = 2 + this.rng() * 3;
            platData.moveSpeed = 1 + this.rng() * 2;
            platData.movePhase = this.rng() * Math.PI * 2;
        }

        this.platforms3D.push(platData);
        this.platformMeshes.push(mesh);
    }

    generatePlatforms(count) {
        let lastX = 0, lastY = 0, lastZ = 0;

        for (let i = 0; i < count; i++) {
            // Move forward (Z direction) with some variation
            const dz = -(3 + this.rng() * 5);
            const dx = (this.rng() - 0.5) * 8;
            const dy = (this.rng() - 0.5) * 3;

            lastX += dx;
            lastY = Math.max(0, lastY + dy);
            lastZ += dz;

            const w = 1.5 + this.rng() * 3;
            const d = 1.5 + this.rng() * 3;
            const isMoving = this.rng() < 0.2 && i > 5;

            this.addPlatform(lastX, lastY, lastZ, w, 0.5, d, isMoving);
        }
    }

    getGroundY(x, z) {
        // No global ground — return -100 to let player fall
        return -100;
    }

    update(dt) {
        // Update moving platforms
        const time = this.clock.elapsedTime;
        for (const p of this.platforms3D) {
            if (p.isMoving) {
                const offset = Math.sin(time * p.moveSpeed + p.movePhase) * p.moveRange;
                if (p.moveAxis === 'x') {
                    p.mesh.position.x = p.origX + offset;
                    p.x = p.mesh.position.x - p.w / 2;
                } else {
                    p.mesh.position.z = p.origZ + offset;
                    p.z = p.mesh.position.z - p.d / 2;
                }
            }
        }

        // Platform collisions — check if player lands on any platform
        this.playerOnGround = false;
        for (let i = 0; i < this.platforms3D.length; i++) {
            const p = this.platforms3D[i];
            const box = { x: p.x, y: p.y, z: p.z, w: p.w, h: p.h, d: p.d };

            if (this.checkBoxCollision(box)) {
                this.resolveBoxCollision(box);

                // Track platform progress
                if (i > this.currentPlatformIndex) {
                    this.currentPlatformIndex = i;
                    this.platformsReached = i;
                    this.score = this.platformsReached * 10;
                    this.updateHUDScore(this.score);
                }
            }
        }

        // Fall to death
        if (this.playerPosition.y < -60) {
            this.endGame();
        }

        // Update HUD info
        if (this.hudInfoEl) {
            this.hudInfoEl.textContent = `Plattform: ${this.platformsReached}`;
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const speeds = [1, 1.5, 2];
    const gravities = [0.8, 1, 1.3];
    const densities = [1, 1.3, 1.6];
    const gapSizes = [0.8, 1, 1.3];
    let seed = 1;

    for (const speed of speeds) {
        for (const gravity of gravities) {
            for (const density of densities) {
                for (const theme of themes) {
                    const gapSize = gapSizes[seed % gapSizes.length];
                    const name = generateGameName('Platformer', seed);
                    // Half are 3D, half are 2D
                    const is3D = seed % 2 === 0;
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Platformer',
                        is3D,
                        config: {
                            speed,
                            gravity,
                            platformDensity: density,
                            gapSize,
                            theme,
                            seed,
                            name: name + (is3D ? ' 3D' : ''),
                        },
                        thumbnail: generateThumbnail('Platformer', { theme }, seed)
                    });
                    seed++;
                }
            }
        }
    }
    return variations; // 3 * 3 * 3 * 12 = 324
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate3D('Platformer', PlatformerGame, PlatformerGame3D, generateVariations);
