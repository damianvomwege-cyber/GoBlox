import { BaseGame } from '../base-game.js';
import { BaseGame3D, mulberry32 as mulberry32_3d, buildCharacterModel } from '../base-game-3d.js';
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
    { name: 'Sky',       primary: '#ffdd57', secondary: '#87ceeb', bg: '#1a1a3e', pipe: '#2ecc71', ground: '#8b6914', pipe3d: 0x2ecc71, ground3d: 0x8b6914, skyTop: 0x87ceeb, skyBottom: 0x1a1a3e, fog: 0x667788, bird3d: 0xffdd57 },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', pipe: '#ff006e', ground: '#1a1a4e', pipe3d: 0xff006e, ground3d: 0x1a1a4e, skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e, bird3d: 0x00ff87 },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', pipe: '#8b5cf6', ground: '#4a2500', pipe3d: 0x8b5cf6, ground3d: 0x4a2500, skyTop: 0xff6f61, skyBottom: 0x1a0510, fog: 0x3a1520, bird3d: 0xff6f61 },
    { name: 'Ocean',     primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', pipe: '#06d6a0', ground: '#023e7d', pipe3d: 0x06d6a0, ground3d: 0x023e7d, skyTop: 0x03045e, skyBottom: 0x0a0a5e, fog: 0x03045e, bird3d: 0x00b4d8 },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', pipe: '#ff0054', ground: '#3d0c00', pipe3d: 0xff0054, ground3d: 0x3d0c00, skyTop: 0x1a0a00, skyBottom: 0x3a1a00, fog: 0x1a0a00, bird3d: 0xff6b35 },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', pipe: '#9b59b6', ground: '#5a0028', pipe3d: 0x9b59b6, ground3d: 0x5a0028, skyTop: 0xff69b4, skyBottom: 0x2b0012, fog: 0x2b0012, bird3d: 0xff69b4 },
    { name: 'Arctic',    primary: '#a8dadc', secondary: '#f1faee', bg: '#0d1b2a', pipe: '#48cae4', ground: '#1b3a4b', pipe3d: 0x48cae4, ground3d: 0x1b3a4b, skyTop: 0x87ceeb, skyBottom: 0x0d1b2a, fog: 0x5d8baa, bird3d: 0xa8dadc },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', pipe: '#7209b7', ground: '#240046', pipe3d: 0x7209b7, ground3d: 0x240046, skyTop: 0x10002b, skyBottom: 0x20104b, fog: 0x10002b, bird3d: 0x00f5d4 },
];

// ── FlappyGame ──────────────────────────────────────────────────────────
class FlappyGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Gap sizes: fraction of canvas height
        const gapSizes = { small: 0.2, medium: 0.27, large: 0.34 };
        this.gapHeight = H * (gapSizes[cfg.gapSize] || gapSizes.medium);

        // Pipe speed
        const pipeSpeeds = { slow: 120, medium: 180, fast: 260 };
        this.pipeSpeed = pipeSpeeds[cfg.pipeSpeed] || pipeSpeeds.medium;

        // Gravity
        const gravities = { light: 600, normal: 900, heavy: 1250 };
        this.gravity = gravities[cfg.gravity] || gravities.normal;

        // Pipe spacing (horizontal distance between pipes)
        const spacings = { near: 0.38, far: 0.55 };
        this.pipeSpacing = W * (spacings[cfg.pipeSpacing] || spacings.far);

        // Bird
        this.birdSize = 22;
        this.birdX = W * 0.2;
        this.birdY = H * 0.4;
        this.birdVY = 0;
        this.flapStrength = -Math.sqrt(this.gravity) * 14;
        this.birdRotation = 0;

        // Ground
        this.groundH = 50;
        this.groundOffset = 0;

        // Pipes
        this.pipes = [];
        this.pipeWidth = 52;
        this.nextPipeX = W * 0.8;

        // Pre-generate some pipes
        for (let i = 0; i < 6; i++) {
            this.spawnPipe();
        }

        // State
        this.started = false;
        this.bestScore = 0;

        // Particles
        this.particles = [];
    }

    spawnPipe() {
        const H = this.canvas.height - this.groundH;
        const minGapTop = 60;
        const maxGapTop = H - this.gapHeight - 60;
        const gapTop = minGapTop + this.rng() * (maxGapTop - minGapTop);

        this.pipes.push({
            x: this.nextPipeX,
            gapTop,
            gapBottom: gapTop + this.gapHeight,
            scored: false,
        });
        this.nextPipeX += this.pipeSpacing;
    }

    flap() {
        if (this.gameOver) return;
        if (!this.started) this.started = true;
        this.birdVY = this.flapStrength;

        // Flap particles
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                x: this.birdX - this.birdSize * 0.3,
                y: this.birdY + this.birdSize * 0.3,
                vx: -20 - Math.random() * 40,
                vy: 10 + Math.random() * 30,
                life: 0.3,
                maxLife: 0.3,
            });
        }
    }

    onKeyDown(key) {
        if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
            this.flap();
        }
    }

    onClick(_x, _y) {
        this.flap();
    }

    update(dt) {
        if (!this.started) return;

        const W = this.canvas.width;
        const H = this.canvas.height;
        const floorY = H - this.groundH;

        // Bird physics
        this.birdVY += this.gravity * dt;
        this.birdY += this.birdVY * dt;

        // Bird rotation (visual only)
        if (this.birdVY < 0) {
            this.birdRotation = Math.max(-0.5, this.birdRotation - 4 * dt);
        } else {
            this.birdRotation = Math.min(1.2, this.birdRotation + 3 * dt);
        }

        // Ground scroll
        this.groundOffset = (this.groundOffset + this.pipeSpeed * dt) % 40;

        // Move pipes
        for (const pipe of this.pipes) {
            pipe.x -= this.pipeSpeed * dt;

            // Score when bird passes pipe center
            if (!pipe.scored && pipe.x + this.pipeWidth / 2 < this.birdX) {
                pipe.scored = true;
                this.score++;
            }
        }

        // Remove off-screen pipes and generate new ones
        if (this.pipes.length > 0 && this.pipes[0].x + this.pipeWidth < -20) {
            this.pipes.shift();
            this.spawnPipe();
        }

        // Collision detection
        const bs = this.birdSize;
        const bx = this.birdX;
        const by = this.birdY;

        // Floor / ceiling
        if (by + bs / 2 >= floorY || by - bs / 2 <= 0) {
            this.endGame();
            return;
        }

        // Pipe collision (circle vs rectangles, simplified with AABB)
        const birdLeft = bx - bs * 0.4;
        const birdRight = bx + bs * 0.4;
        const birdTop = by - bs * 0.35;
        const birdBottom = by + bs * 0.35;

        for (const pipe of this.pipes) {
            const pLeft = pipe.x;
            const pRight = pipe.x + this.pipeWidth;

            // Check horizontal overlap
            if (birdRight > pLeft && birdLeft < pRight) {
                // Top pipe
                if (birdTop < pipe.gapTop) {
                    this.endGame();
                    return;
                }
                // Bottom pipe
                if (birdBottom > pipe.gapBottom) {
                    this.endGame();
                    return;
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

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;
        const floorY = H - this.groundH;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Background stars/dots
        ctx.fillStyle = t.secondary + '15';
        const rng2 = mulberry32(42); // deterministic bg dots
        for (let i = 0; i < 30; i++) {
            const x = rng2() * W;
            const y = rng2() * (floorY - 20);
            ctx.beginPath();
            ctx.arc(x, y, 1.5 + rng2(), 0, Math.PI * 2);
            ctx.fill();
        }

        // Pipes
        for (const pipe of this.pipes) {
            // Only draw visible pipes
            if (pipe.x + this.pipeWidth < -10 || pipe.x > W + 10) continue;

            const pw = this.pipeWidth;
            const capH = 16;
            const capExtra = 6;

            // Top pipe body
            ctx.fillStyle = t.pipe;
            ctx.fillRect(pipe.x, 0, pw, pipe.gapTop);

            // Top pipe cap
            ctx.fillStyle = t.pipe;
            ctx.beginPath();
            ctx.roundRect(pipe.x - capExtra, pipe.gapTop - capH, pw + capExtra * 2, capH, 4);
            ctx.fill();

            // Top pipe highlight
            ctx.fillStyle = '#ffffff18';
            ctx.fillRect(pipe.x + 4, 0, 8, pipe.gapTop - capH);

            // Top pipe shadow
            ctx.fillStyle = '#00000020';
            ctx.fillRect(pipe.x + pw - 10, 0, 6, pipe.gapTop - capH);

            // Bottom pipe body
            ctx.fillStyle = t.pipe;
            ctx.fillRect(pipe.x, pipe.gapBottom, pw, floorY - pipe.gapBottom);

            // Bottom pipe cap
            ctx.beginPath();
            ctx.roundRect(pipe.x - capExtra, pipe.gapBottom, pw + capExtra * 2, capH, 4);
            ctx.fill();

            // Bottom pipe highlight
            ctx.fillStyle = '#ffffff18';
            ctx.fillRect(pipe.x + 4, pipe.gapBottom + capH, 8, floorY - pipe.gapBottom - capH);

            // Bottom pipe shadow
            ctx.fillStyle = '#00000020';
            ctx.fillRect(pipe.x + pw - 10, pipe.gapBottom + capH, 6, floorY - pipe.gapBottom - capH);
        }

        // Ground
        ctx.fillStyle = t.ground;
        ctx.fillRect(0, floorY, W, this.groundH);

        // Ground pattern
        ctx.strokeStyle = t.primary + '20';
        ctx.lineWidth = 2;
        for (let x = -this.groundOffset; x < W + 40; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, floorY);
            ctx.lineTo(x + 20, floorY + this.groundH);
            ctx.stroke();
        }

        // Ground top edge
        ctx.fillStyle = t.primary + '40';
        ctx.fillRect(0, floorY, W, 3);

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = t.secondary;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Character with cape (replaces bird)
        ctx.save();
        ctx.translate(this.birdX, this.birdY);
        // Tilt based on velocity
        const tiltAngle = Math.max(-0.4, Math.min(0.6, this.birdRotation * 0.5));
        ctx.rotate(tiltAngle);

        const bs = this.birdSize;
        const charSize = bs * 2;
        const animFrame = performance.now() * 0.003;
        drawCharacter(ctx, 0, 0, charSize, 'right', 'cape', animFrame);

        ctx.restore();

        // Score display (large, centered)
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.strokeStyle = '#00000080';
        ctx.lineWidth = 4;
        ctx.strokeText(this.score.toString(), W / 2, 20);
        ctx.fillText(this.score.toString(), W / 2, 20);

        // Start prompt
        if (!this.started && !this.gameOver) {
            ctx.fillStyle = t.secondary + 'cc';
            ctx.font = 'bold 22px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Tap or press SPACE to start', W / 2, H / 2 + 60);

            // Bouncing arrow
            const bounce = Math.sin(performance.now() * 0.004) * 8;
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 30px monospace';
            ctx.fillText('^', W / 2, H / 2 + 30 + bounce);
        }

        // Game Over overlay
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 40);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 32px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 10);

            // Pipe count
            ctx.font = '16px monospace';
            ctx.fillText(`${this.score} pipe${this.score !== 1 ? 's' : ''} cleared`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 3D FlappyGame — flying through gaps in 3D perspective
// ══════════════════════════════════════════════════════════════════════════
class FlappyGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32_3d(cfg.seed || 1);

        // Gap sizes in world units
        const gapSizes = { small: 4, medium: 5.5, large: 7 };
        this.gapHeight = gapSizes[cfg.gapSize] || gapSizes.medium;

        // Pipe speed (world units/sec)
        const pipeSpeeds = { slow: 8, medium: 12, fast: 18 };
        this.pipeSpeed = pipeSpeeds[cfg.pipeSpeed] || pipeSpeeds.medium;

        // Gravity
        const gravities = { light: -18, normal: -28, heavy: -40 };
        this.birdGravity = gravities[cfg.gravity] || gravities.normal;

        // Pipe spacing
        const spacings = { near: 10, far: 16 };
        this.pipeSpacing = spacings[cfg.pipeSpacing] || spacings.far;

        // Bird state
        this.birdY = 8;
        this.birdVY = 0;
        this.flapStrength = Math.sqrt(Math.abs(this.birdGravity)) * 2.8;
        this.birdX = 0;  // bird stays at x=0, world moves toward bird

        // World boundaries
        this.ceilingY = 18;
        this.floorY = 0;
        this.groundHeight = 0.5;

        // Pipes
        this.pipes3D = [];
        this.nextPipeX = 15;
        this.pipeWidth = 2;
        this.pillarDepth = 3; // depth in Z for 3D look

        // Started state
        this.started = false;

        // Disable default player model and physics
        this.playerModel.visible = false;
        this.gravity = 0;
        this.moveSpeed = 0;

        // Build the world
        this.createSky(cfg.theme.skyTop || 0x87ceeb, cfg.theme.skyBottom || 0x1a1a3e, cfg.theme.fog || 0x667788, 40, 200);
        this.buildGround();
        this.buildBird();

        // Pre-generate pipes
        for (let i = 0; i < 8; i++) {
            this.spawnPipe3D();
        }

        // HUD
        this.createHUD();

        // Remove pointer lock message
        if (this.lockMsg) this.lockMsg.style.display = 'none';
    }

    buildGround() {
        const t = this.theme;
        const groundGeo = new THREE.PlaneGeometry(400, 20);
        const groundMat = new THREE.MeshStandardMaterial({ color: t.ground3d || 0x8b6914, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, 0, 0);
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Ceiling (subtle)
        const ceilGeo = new THREE.PlaneGeometry(400, 20);
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.9, transparent: true, opacity: 0.3 });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(0, this.ceilingY, 0);
        this.scene.add(ceil);
    }

    buildBird() {
        // Use the GoBlox character as the "bird"
        this.birdModel = buildCharacterModel();
        this.birdModel.position.set(this.birdX, this.birdY, 0);
        this.birdModel.castShadow = true;
        this.birdModel.scale.set(0.8, 0.8, 0.8);
        this.scene.add(this.birdModel);
    }

    spawnPipe3D() {
        const t = this.theme;
        const minGapTop = 3;
        const maxGapTop = this.ceilingY - this.gapHeight - 2;
        const gapTop = minGapTop + this.rng() * (maxGapTop - minGapTop);
        const gapBottom = gapTop + this.gapHeight;

        const pipeMat = new THREE.MeshStandardMaterial({
            color: t.pipe3d || 0x2ecc71,
            roughness: 0.5,
            metalness: 0.2,
        });

        // Bottom pillar
        const bottomH = gapTop;
        if (bottomH > 0) {
            const bottomGeo = new THREE.BoxGeometry(this.pipeWidth, bottomH, this.pillarDepth);
            const bottomMesh = new THREE.Mesh(bottomGeo, pipeMat);
            bottomMesh.position.set(this.nextPipeX, bottomH / 2, 0);
            bottomMesh.castShadow = true;
            bottomMesh.receiveShadow = true;
            this.scene.add(bottomMesh);

            // Cap on bottom pillar
            const capGeo = new THREE.BoxGeometry(this.pipeWidth + 0.6, 0.5, this.pillarDepth + 0.6);
            const cap = new THREE.Mesh(capGeo, pipeMat);
            cap.position.set(this.nextPipeX, gapTop - 0.25, 0);
            cap.castShadow = true;
            this.scene.add(cap);

            this.pipes3D.push({ meshes: [bottomMesh, cap], x: this.nextPipeX, scored: false, gapTop, gapBottom });
        }

        // Top pillar
        const topH = this.ceilingY - gapBottom;
        if (topH > 0) {
            const topGeo = new THREE.BoxGeometry(this.pipeWidth, topH, this.pillarDepth);
            const topMesh = new THREE.Mesh(topGeo, pipeMat);
            topMesh.position.set(this.nextPipeX, gapBottom + topH / 2, 0);
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            this.scene.add(topMesh);

            // Cap on top pillar
            const capGeo = new THREE.BoxGeometry(this.pipeWidth + 0.6, 0.5, this.pillarDepth + 0.6);
            const cap = new THREE.Mesh(capGeo, pipeMat);
            cap.position.set(this.nextPipeX, gapBottom + 0.25, 0);
            cap.castShadow = true;
            this.scene.add(cap);

            // Store meshes on existing pipe entry or create new
            const existing = this.pipes3D.find(p => p.x === this.nextPipeX);
            if (existing) {
                existing.meshes.push(topMesh, cap);
            } else {
                this.pipes3D.push({ meshes: [topMesh, cap], x: this.nextPipeX, scored: false, gapTop, gapBottom });
            }
        }

        this.nextPipeX += this.pipeSpacing;
    }

    flap3D() {
        if (this.gameOver) return;
        if (!this.started) this.started = true;
        this.birdVY = this.flapStrength;
    }

    onKeyDown(code) {
        if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
            this.flap3D();
        }
    }

    onClick(e) {
        this.flap3D();
    }

    updatePlayer(dt) {
        // No default player physics
    }

    updateCamera(dt) {
        // Side view camera that follows the bird
        const targetPos = new THREE.Vector3(
            this.birdX,
            this.birdY * 0.3 + 6,
            20
        );
        const t = 1 - Math.exp(-4 * dt);
        this.camera.position.lerp(targetPos, t);
        this.camera.lookAt(this.birdX + 8, this.birdY * 0.5 + 3, 0);

        if (this.sunLight) {
            this.sunLight.position.set(this.birdX + 30, 50, 30);
            this.sunLight.target.position.set(this.birdX, this.birdY, 0);
        }
    }

    update(dt) {
        if (this.gameOver) return;
        if (!this.started) return;

        // Bird physics
        this.birdVY += this.birdGravity * dt;
        this.birdY += this.birdVY * dt;

        // Update bird model
        this.birdModel.position.set(this.birdX, this.birdY, 0);
        // Tilt bird based on velocity
        const tilt = Math.max(-0.5, Math.min(0.6, -this.birdVY * 0.03));
        this.birdModel.rotation.z = tilt;

        // Animate arms for flapping
        const leftArm = this.birdModel.getObjectByName('leftArm');
        const rightArm = this.birdModel.getObjectByName('rightArm');
        if (this.birdVY > 0) {
            const flapAnim = Math.sin(this.clock.elapsedTime * 15) * 1.2;
            if (leftArm) leftArm.rotation.x = flapAnim;
            if (rightArm) rightArm.rotation.x = -flapAnim;
        } else {
            if (leftArm) leftArm.rotation.x = 0.8;
            if (rightArm) rightArm.rotation.x = -0.8;
        }

        // Move pipes toward bird (bird stays at x=0, world scrolls)
        for (let i = this.pipes3D.length - 1; i >= 0; i--) {
            const pipe = this.pipes3D[i];
            pipe.x -= this.pipeSpeed * dt;

            for (const mesh of pipe.meshes) {
                mesh.position.x = pipe.x;
            }

            // Score when bird passes pipe
            if (!pipe.scored && pipe.x + this.pipeWidth / 2 < this.birdX) {
                pipe.scored = true;
                this.score++;
                this.updateHUDScore(this.score);
            }

            // Remove far-behind pipes
            if (pipe.x < this.birdX - 20) {
                for (const mesh of pipe.meshes) {
                    this.scene.remove(mesh);
                }
                this.pipes3D.splice(i, 1);
                this.spawnPipe3D();
            }
        }

        // Floor / ceiling collision
        if (this.birdY <= this.floorY + 1.2 || this.birdY >= this.ceilingY - 0.5) {
            this.endGame();
            return;
        }

        // Pipe collision
        const birdR = 0.5; // approximate bird radius
        for (const pipe of this.pipes3D) {
            const pLeft = pipe.x - this.pipeWidth / 2;
            const pRight = pipe.x + this.pipeWidth / 2;

            // Check horizontal overlap
            if (this.birdX + birdR > pLeft && this.birdX - birdR < pRight) {
                // Hit bottom pillar?
                if (this.birdY - birdR < pipe.gapTop) {
                    this.endGame();
                    return;
                }
                // Hit top pillar?
                if (this.birdY + birdR > pipe.gapBottom) {
                    this.endGame();
                    return;
                }
            }
        }

        if (this.hudInfoEl) {
            this.hudInfoEl.textContent = `${this.score} pipe${this.score !== 1 ? 's' : ''} cleared`;
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const gapSizes = ['small', 'medium', 'large'];
    const pipeSpeeds = ['slow', 'medium', 'fast'];
    const gravities = ['light', 'normal', 'heavy'];
    const pipeSpacings = ['near', 'far'];
    let seed = 1;

    for (const gapSize of gapSizes) {
        for (const pipeSpeed of pipeSpeeds) {
            for (const gravity of gravities) {
                for (const theme of themes) {
                    const pipeSpacing = pipeSpacings[seed % pipeSpacings.length];
                    const is3D = seed % 2 === 0;
                    const name = generateGameName('Flappy', seed);
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Flappy',
                        is3D,
                        config: {
                            gapSize,
                            pipeSpeed,
                            gravity,
                            pipeSpacing,
                            theme,
                            seed,
                            name: name + (is3D ? ' 3D' : ''),
                        },
                        thumbnail: generateThumbnail('Flappy', { theme }, seed)
                    });
                    seed++;
                }
            }
        }
    }
    // 3 * 3 * 3 * 8 = 216
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate3D('Flappy', FlappyGame, FlappyGame3D, generateVariations);
