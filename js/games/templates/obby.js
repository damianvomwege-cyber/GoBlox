import { BaseGame3D, mulberry32 } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import * as THREE from 'three';

// ── Themes ──────────────────────────────────────────────────────────────
const themes = [
    { name: 'Rainbow',   primary: '#ff6b6b', secondary: '#feca57', stageColors: [0xff6b6b, 0xff9f43, 0xfeca57, 0x2ecc71, 0x00cec9, 0x0984e3, 0x6c5ce7, 0xe84393, 0xfd79a8, 0xa29bfe, 0x55efc4, 0xfdcb6e, 0xff7675, 0x74b9ff, 0x81ecec], skyTop: 0x87ceeb, skyBottom: 0xe0f7fa, fog: 0xccddee, ground: 0x4a8f4a, lava: 0xff2200, killBrick: 0xdd0000, checkpoint: 0x00ff66 },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', stageColors: [0x00ff87, 0x60efff, 0xf72585, 0x7209b7, 0x4361ee, 0x4cc9f0, 0x80ffdb, 0x72efdd, 0xc77dff, 0xe0aaff, 0x48bfe3, 0x56cfe1, 0x64dfdf, 0x5390d9, 0x6930c3], skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e, ground: 0x0a0a2e, lava: 0xff0044, killBrick: 0xff0066, checkpoint: 0x00ff99 },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', stageColors: [0xff6b35, 0xff4500, 0xff8c00, 0xffa500, 0xffd700, 0xb22222, 0xdc143c, 0xcd5c5c, 0xf08080, 0xe9967a, 0xff7f50, 0xff6347, 0xdb7093, 0xc71585, 0xff1493], skyTop: 0x1a0a00, skyBottom: 0x3a1a00, fog: 0x1a0a00, ground: 0x2a1500, lava: 0xff4400, killBrick: 0xff0000, checkpoint: 0x00ff44 },
    { name: 'Arctic',    primary: '#a8dadc', secondary: '#f1faee', stageColors: [0xa8dadc, 0xb8e0e3, 0xc8e6e9, 0x87ceeb, 0x6bb3d9, 0x5d8baa, 0x4a7a9a, 0x94d2e6, 0xaee5f2, 0xc4f0fa, 0x7ec8e3, 0x69b4cf, 0xb2dfee, 0x9dd3e4, 0x88c8da], skyTop: 0x87ceeb, skyBottom: 0xdce7f0, fog: 0xc0d4e4, ground: 0xc8d8dc, lava: 0x00bfff, killBrick: 0x1e90ff, checkpoint: 0x00ff88 },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', stageColors: [0xff69b4, 0xff1493, 0xda70d6, 0xee82ee, 0xdda0dd, 0xffb6c1, 0xffc0cb, 0xff82ab, 0xcd6090, 0xbc8f8f, 0xf0e68c, 0xfafad2, 0xffe4e1, 0xfff0f5, 0xe6e6fa], skyTop: 0xffb6c1, skyBottom: 0xffe4e1, fog: 0xffd4df, ground: 0x90ee90, lava: 0xff1493, killBrick: 0xff0066, checkpoint: 0x7fff00 },
    { name: 'Toxic',     primary: '#aaff00', secondary: '#69ff36', stageColors: [0xaaff00, 0x69ff36, 0x00ff00, 0x32cd32, 0x228b22, 0x006400, 0x7cfc00, 0x7fff00, 0xadff2f, 0x9acd32, 0x00fa9a, 0x00ff7f, 0x3cb371, 0x2e8b57, 0x66cdaa], skyTop: 0x0a1500, skyBottom: 0x1a2a10, fog: 0x0a1500, ground: 0x0a1a00, lava: 0xaaff00, killBrick: 0xff0000, checkpoint: 0x00ffff },
];

// Difficulty presets
const difficulties = [
    { name: 'Normal',     gapMulti: 1.0, speedMulti: 1.0, extraKill: 0 },
    { name: 'Schwer',     gapMulti: 1.3, speedMulti: 1.4, extraKill: 2 },
    { name: 'Extrem',     gapMulti: 1.6, speedMulti: 1.8, extraKill: 4 },
];

// ══════════════════════════════════════════════════════════════════════════
// ObbyGame — 3D Obstacle Course
// ══════════════════════════════════════════════════════════════════════════
class ObbyGame extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.difficulty = cfg.difficulty || difficulties[0];
        this.rng = mulberry32(cfg.seed || 42);
        this.totalStages = cfg.totalStages || 15;

        // Physics tuned for obby
        this.moveSpeed = 9;
        this.jumpForce = 12;
        this.gravity = -30;
        this.cameraDistance = 11;
        this.cameraAngleY = 0.35;
        this.cameraSmoothing = 10;
        this.sprintSpeed = 14;
        this.normalSpeed = 9;
        this.isSprinting = false;

        // State
        this.currentStage = 0;
        this.deaths = 0;
        this.timerElapsed = 0;
        this.lastCheckpoint = new THREE.Vector3(0, 1, 0);
        this.checkpointsActivated = new Set();
        this.respawning = false;
        this.respawnTimer = 0;
        this.completed = false;

        // Obstacle arrays
        this.platforms = [];       // static platforms (colliders)
        this.disappearing = [];    // disappearing platforms
        this.moving = [];          // moving platforms
        this.killBricks = [];      // spinning kill bricks
        this.conveyors = [];       // conveyor belts
        this.checkpoints = [];     // checkpoint pads
        this.lavaZones = [];       // lava floor sections
        this.particles = [];       // visual particles

        // Sky
        this.createSky(cfg.theme.skyTop, cfg.theme.skyBottom, cfg.theme.fog, 60, 250);

        // Far below ground (death plane visual)
        const farGround = new THREE.Mesh(
            new THREE.PlaneGeometry(600, 600),
            new THREE.MeshStandardMaterial({ color: cfg.theme.ground, roughness: 1 })
        );
        farGround.rotation.x = -Math.PI / 2;
        farGround.position.y = -50;
        farGround.receiveShadow = true;
        this.scene.add(farGround);

        // Expand shadow camera for the long course
        if (this.sunLight) {
            this.sunLight.shadow.camera.left = -80;
            this.sunLight.shadow.camera.right = 80;
            this.sunLight.shadow.camera.top = 80;
            this.sunLight.shadow.camera.bottom = -80;
            this.sunLight.shadow.camera.far = 250;
        }

        // Build the course
        this.buildCourse();

        // Player start
        this.playerPosition.set(0, 1, 0);

        // HUD
        this.createObbyHUD();
    }

    // ── HUD ──────────────────────────────────────────────────────────────
    createObbyHUD() {
        this.hudEl = document.createElement('div');
        this.hudEl.className = 'game-3d-hud';
        this.hudEl.style.cssText = 'pointer-events:none;position:absolute;top:0;left:0;width:100%;padding:12px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-start;font-family:monospace;z-index:10;';
        this.hudEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:4px;">
                <div id="obby-stage" style="color:#fff;font-size:18px;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.5);">Stufe 1/${this.totalStages}</div>
                <div id="obby-timer" style="color:#feca57;font-size:14px;text-shadow:0 2px 4px rgba(0,0,0,0.5);">Zeit: 0:00.0</div>
                <div id="obby-deaths" style="color:#ff6b6b;font-size:14px;text-shadow:0 2px 4px rgba(0,0,0,0.5);">Tode: 0</div>
            </div>
            <div id="obby-sprint" style="color:#aaa;font-size:12px;text-shadow:0 2px 4px rgba(0,0,0,0.5);">Shift = Sprint</div>
        `;
        this.container.appendChild(this.hudEl);
        this.stageEl = this.hudEl.querySelector('#obby-stage');
        this.timerEl = this.hudEl.querySelector('#obby-timer');
        this.deathsEl = this.hudEl.querySelector('#obby-deaths');
    }

    // ── Course Builder ───────────────────────────────────────────────────
    buildCourse() {
        const rng = this.rng;
        const diff = this.difficulty;
        const stageColors = this.theme.stageColors;

        // Cursor position as we build forward
        let cx = 0, cy = 0, cz = 0;

        // Stage 0: Starting platform (large, safe)
        this.addPlatform(cx, cy, cz, 6, 1, 6, stageColors[0], true);
        this.addCheckpoint(cx, cy + 1.01, cz, 0);
        cz -= 8;

        for (let stage = 1; stage <= this.totalStages; stage++) {
            const color = stageColors[stage % stageColors.length];
            const stageType = this.pickStageType(stage, rng);

            // Move forward with some randomness
            const dz = -(12 + rng() * 8);
            const dx = (rng() - 0.5) * 6;
            const dy = (rng() - 0.3) * 2;

            cx += dx;
            cy = Math.max(0, cy + dy);
            cz += dz;

            this.buildStage(stage, stageType, cx, cy, cz, color, rng, diff);

            // Checkpoint at the end of each stage
            const checkZ = cz - 2;
            this.addPlatform(cx, cy, checkZ, 4, 1, 4, color, true);
            this.addCheckpoint(cx, cy + 1.01, checkZ, stage);

            cz = checkZ - 4;
        }

        // Win platform
        cz -= 6;
        this.addPlatform(cx, cy, cz, 8, 1, 8, 0xffd700, true);
        this.winZone = { x: cx - 4, y: cy, z: cz - 4, w: 8, h: 3, d: 8 };

        // Gold decorations on win platform
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const px = cx + Math.cos(angle) * 3;
            const pz = cz + Math.sin(angle) * 3;
            const trophy = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.5, 2, 8),
                new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.3, metalness: 0.8, roughness: 0.2 })
            );
            trophy.position.set(px, cy + 2, pz);
            trophy.castShadow = true;
            this.scene.add(trophy);
        }
    }

    pickStageType(stage, rng) {
        // Types: 'gaps', 'disappearing', 'moving', 'killspin', 'balance', 'lava', 'conveyor', 'wallrun', 'mixed'
        const types = ['gaps', 'disappearing', 'moving', 'killspin', 'balance', 'lava', 'conveyor', 'wallrun'];
        if (stage <= 2) return types[stage - 1]; // first 2 are gentle intros
        if (stage >= this.totalStages - 1) return 'mixed';
        return types[Math.floor(rng() * types.length)];
    }

    buildStage(stage, type, cx, cy, cz, color, rng, diff) {
        switch (type) {
            case 'gaps': this.buildGapStage(cx, cy, cz, color, rng, diff, stage); break;
            case 'disappearing': this.buildDisappearingStage(cx, cy, cz, color, rng, diff, stage); break;
            case 'moving': this.buildMovingStage(cx, cy, cz, color, rng, diff, stage); break;
            case 'killspin': this.buildKillSpinStage(cx, cy, cz, color, rng, diff, stage); break;
            case 'balance': this.buildBalanceStage(cx, cy, cz, color, rng, diff, stage); break;
            case 'lava': this.buildLavaStage(cx, cy, cz, color, rng, diff, stage); break;
            case 'conveyor': this.buildConveyorStage(cx, cy, cz, color, rng, diff, stage); break;
            case 'wallrun': this.buildWallRunStage(cx, cy, cz, color, rng, diff, stage); break;
            case 'mixed': this.buildMixedStage(cx, cy, cz, color, rng, diff, stage); break;
        }
    }

    // ── Stage Builders ───────────────────────────────────────────────────

    buildGapStage(cx, cy, cz, color, rng, diff, stage) {
        const count = 4 + Math.floor(rng() * 3);
        let z = cz + 4;
        for (let i = 0; i < count; i++) {
            const gap = (2.5 + rng() * 2) * diff.gapMulti;
            const w = 2 + rng() * 2;
            const d = 1.5 + rng() * 1.5;
            const dx = (rng() - 0.5) * 4;
            z += gap;
            this.addPlatform(cx + dx, cy, cz - i * (gap), w, 0.5, d, color);
        }
    }

    buildDisappearingStage(cx, cy, cz, color, rng, diff, stage) {
        const count = 5 + Math.floor(rng() * 3);
        for (let i = 0; i < count; i++) {
            const dx = (rng() - 0.5) * 6;
            const dz = -(i * 3 + rng() * 2);
            const period = 2 + rng() * 2;
            const phase = rng() * period;
            this.addDisappearingPlatform(cx + dx, cy, cz + dz, 2.5, 0.5, 2.5, color, period, phase);
        }
    }

    buildMovingStage(cx, cy, cz, color, rng, diff, stage) {
        const count = 4 + Math.floor(rng() * 2);
        for (let i = 0; i < count; i++) {
            const dz = -(i * 5 + 2);
            const axis = rng() < 0.5 ? 'x' : 'y';
            const range = (2 + rng() * 3) * diff.gapMulti;
            const speed = (1 + rng() * 1.5) * diff.speedMulti;
            this.addMovingPlatform(cx, cy + (axis === 'y' ? 1 : 0), cz + dz, 3, 0.5, 3, color, axis, range, speed, rng() * Math.PI * 2);
        }
    }

    buildKillSpinStage(cx, cy, cz, color, rng, diff, stage) {
        // Platforms with spinning kill bricks between them
        const count = 3 + Math.floor(rng() * 2) + diff.extraKill;
        for (let i = 0; i < count; i++) {
            const dz = -(i * 6 + 2);
            this.addPlatform(cx, cy, cz + dz, 5, 0.5, 3, color);
            if (i < count - 1) {
                // Kill brick in the middle area
                const kx = cx + (rng() - 0.5) * 3;
                const ky = cy + 0.8;
                const kz = cz + dz - 2.5;
                this.addKillBrick(kx, ky, kz, 1 + rng() * 1.5, (1.5 + rng()) * diff.speedMulti);
            }
        }
    }

    buildBalanceStage(cx, cy, cz, color, rng, diff, stage) {
        const count = 3 + Math.floor(rng() * 2);
        for (let i = 0; i < count; i++) {
            const dz = -(i * 6 + 2);
            const beamLen = 8 + rng() * 6;
            const beamW = 0.4 + rng() * 0.3;
            this.addPlatform(cx, cy, cz + dz, beamW, 0.3, beamLen, color);
        }
    }

    buildLavaStage(cx, cy, cz, color, rng, diff, stage) {
        // Lava floor with small platforms to hop on
        const lavaW = 12, lavaD = 14;
        this.addLavaZone(cx - lavaW / 2, cy - 0.1, cz - lavaD, lavaW, 0.2, lavaD);

        const count = 6 + Math.floor(rng() * 4);
        for (let i = 0; i < count; i++) {
            const px = cx + (rng() - 0.5) * (lavaW - 3);
            const pz = cz - 1 - rng() * (lavaD - 3);
            const s = 1 + rng() * 1.2;
            this.addPlatform(px, cy + 0.3, pz, s, 0.4, s, color);
        }
    }

    buildConveyorStage(cx, cy, cz, color, rng, diff, stage) {
        const count = 3 + Math.floor(rng() * 2);
        for (let i = 0; i < count; i++) {
            const dz = -(i * 6 + 2);
            const dirX = (rng() < 0.5 ? -1 : 1) * (3 + rng() * 2) * diff.speedMulti;
            this.addConveyor(cx, cy, cz + dz, 5, 0.5, 4, color, dirX, 0);
        }
    }

    buildWallRunStage(cx, cy, cz, color, rng, diff, stage) {
        // Narrow corridor with walls - player must navigate tight space
        const corridorLen = 10 + rng() * 6;
        const corridorW = 2;
        const wallH = 4;

        // Floor
        this.addPlatform(cx, cy, cz - corridorLen / 2, corridorW + 1, 0.5, corridorLen, color);

        // Left wall
        this.addPlatform(cx - corridorW, cy + wallH / 2, cz - corridorLen / 2, 0.5, wallH, corridorLen, color);
        // Right wall
        this.addPlatform(cx + corridorW, cy + wallH / 2, cz - corridorLen / 2, 0.5, wallH, corridorLen, color);

        // Kill bricks inside corridor
        const killCount = 2 + diff.extraKill;
        for (let i = 0; i < killCount; i++) {
            const kz = cz - 2 - (i * corridorLen / (killCount + 1));
            this.addKillBrick(cx, cy + 0.8, kz, 1, (1 + rng()) * diff.speedMulti);
        }
    }

    buildMixedStage(cx, cy, cz, color, rng, diff, stage) {
        // Combination of multiple obstacle types
        // Moving platform start
        this.addMovingPlatform(cx - 3, cy, cz + 2, 2.5, 0.5, 2.5, color, 'x', 3, 1.2 * diff.speedMulti, 0);

        // Disappearing section
        for (let i = 0; i < 3; i++) {
            this.addDisappearingPlatform(cx + (rng() - 0.5) * 5, cy, cz - i * 3, 2, 0.5, 2, color, 2 + rng(), rng() * 3);
        }

        // Kill brick guard
        this.addKillBrick(cx, cy + 0.8, cz - 10, 1.5, 2 * diff.speedMulti);

        // Final conveyor
        this.addConveyor(cx, cy, cz - 13, 4, 0.5, 3, color, (rng() < 0.5 ? -3 : 3) * diff.speedMulti, 0);
    }

    // ── Object Factories ─────────────────────────────────────────────────

    addPlatform(x, y, z, w, h, d, color, isStatic = false) {
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const collider = { x: x - w / 2, y: y - h / 2, z: z - d / 2, w, h, d };
        this.platforms.push({ mesh, collider, color });
        return collider;
    }

    addDisappearingPlatform(x, y, z, w, h, d, color, period, phase) {
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, transparent: true });
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const collider = { x: x - w / 2, y: y - h / 2, z: z - d / 2, w, h, d };
        this.disappearing.push({ mesh, collider, period, phase, visible: true, mat });
    }

    addMovingPlatform(x, y, z, w, h, d, color, axis, range, speed, phase) {
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const collider = { x: x - w / 2, y: y - h / 2, z: z - d / 2, w, h, d };
        this.moving.push({ mesh, collider, origX: x, origY: y, origZ: z, axis, range, speed, phase, w, h, d });
    }

    addKillBrick(x, y, z, size, speed) {
        const mat = new THREE.MeshStandardMaterial({
            color: this.theme.killBrick,
            emissive: this.theme.killBrick,
            emissiveIntensity: 0.4,
            roughness: 0.3,
        });
        const geo = new THREE.BoxGeometry(size, size * 0.4, size);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        this.scene.add(mesh);

        this.killBricks.push({
            mesh,
            x, y, z,
            size,
            speed,
            collider: { x: x - size / 2, y: y - size * 0.2, z: z - size / 2, w: size, h: size * 0.4, d: size }
        });
    }

    addCheckpoint(x, y, z, stageIndex) {
        const mat = new THREE.MeshStandardMaterial({
            color: this.theme.checkpoint,
            emissive: this.theme.checkpoint,
            emissiveIntensity: 0.2,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8,
        });
        const geo = new THREE.CylinderGeometry(1, 1, 0.15, 16);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Glow ring
        const ringGeo = new THREE.TorusGeometry(1.2, 0.05, 8, 32);
        const ringMat = new THREE.MeshStandardMaterial({
            color: this.theme.checkpoint,
            emissive: this.theme.checkpoint,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, y + 0.1, z);
        this.scene.add(ring);

        this.checkpoints.push({
            mesh, ring, mat, ringMat,
            x, y, z,
            stageIndex,
            collider: { x: x - 1, y: y - 0.1, z: z - 1, w: 2, h: 2.5, d: 2 },
            activated: false
        });
    }

    addLavaZone(x, y, z, w, h, d) {
        const mat = new THREE.MeshStandardMaterial({
            color: this.theme.lava,
            emissive: this.theme.lava,
            emissiveIntensity: 0.7,
            roughness: 0.2,
        });
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x + w / 2, y, z + d / 2);
        this.scene.add(mesh);

        // Point light for glow
        const light = new THREE.PointLight(this.theme.lava, 1.5, 15);
        light.position.set(x + w / 2, y + 2, z + d / 2);
        this.scene.add(light);

        this.lavaZones.push({
            mesh,
            collider: { x, y: y - h / 2, z, w, h: h + 1, d }
        });
    }

    addConveyor(x, y, z, w, h, d, color, pushX, pushZ) {
        // Slightly different color to distinguish from normal platform
        const darkerColor = new THREE.Color(color).multiplyScalar(0.7).getHex();
        const mat = new THREE.MeshStandardMaterial({ color: darkerColor, roughness: 0.4, metalness: 0.3 });
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Stripe arrows on conveyor to indicate direction
        const arrowMat = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.3,
        });
        for (let i = -1; i <= 1; i++) {
            const arrow = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.05, 0.15),
                arrowMat
            );
            arrow.position.set(x + i * 1.2, y + h / 2 + 0.03, z);
            this.scene.add(arrow);
        }

        const collider = { x: x - w / 2, y: y - h / 2, z: z - d / 2, w, h, d };
        this.platforms.push({ mesh, collider, color }); // Also acts as platform
        this.conveyors.push({ collider, pushX, pushZ });
    }

    // ── Game Update ──────────────────────────────────────────────────────

    update(dt) {
        if (this.completed) return;

        const time = this.clock.elapsedTime;

        // Timer
        if (!this.respawning) {
            this.timerElapsed += dt;
        }

        // Sprint
        this.isSprinting = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];
        this.moveSpeed = this.isSprinting ? this.sprintSpeed : this.normalSpeed;

        // Respawn animation
        if (this.respawning) {
            this.respawnTimer -= dt;
            this.playerModel.visible = Math.floor(this.respawnTimer * 10) % 2 === 0; // Blink
            if (this.respawnTimer <= 0) {
                this.respawning = false;
                this.playerModel.visible = true;
            }
            return;
        }

        // ── Update disappearing platforms ──
        for (const dp of this.disappearing) {
            const t = ((time + dp.phase) % dp.period) / dp.period;
            // Visible for 60% of cycle, fading out, then invisible
            if (t < 0.5) {
                dp.visible = true;
                dp.mat.opacity = 1.0;
            } else if (t < 0.6) {
                dp.visible = true;
                dp.mat.opacity = 1.0 - (t - 0.5) / 0.1;
            } else {
                dp.visible = false;
                dp.mat.opacity = 0.0;
            }
            dp.mesh.visible = dp.mat.opacity > 0.05;
        }

        // ── Update moving platforms ──
        for (const mp of this.moving) {
            const offset = Math.sin(time * mp.speed + mp.phase) * mp.range;
            if (mp.axis === 'x') {
                mp.mesh.position.x = mp.origX + offset;
                mp.collider.x = mp.mesh.position.x - mp.w / 2;
            } else if (mp.axis === 'y') {
                mp.mesh.position.y = mp.origY + offset;
                mp.collider.y = mp.mesh.position.y - mp.h / 2;
            } else {
                mp.mesh.position.z = mp.origZ + offset;
                mp.collider.z = mp.mesh.position.z - mp.d / 2;
            }
        }

        // ── Update spinning kill bricks ──
        for (const kb of this.killBricks) {
            kb.mesh.rotation.y += kb.speed * dt * 3;
            // Update collider based on rotation (approximate as AABB)
            const s = kb.size;
            kb.collider.x = kb.mesh.position.x - s / 2;
            kb.collider.z = kb.mesh.position.z - s / 2;
        }

        // ── Collision: static platforms ──
        this.playerOnGround = false;
        for (const p of this.platforms) {
            if (this.checkBoxCollision(p.collider)) {
                this.resolveBoxCollision(p.collider);
            }
        }

        // ── Collision: disappearing platforms ──
        for (const dp of this.disappearing) {
            if (dp.visible && this.checkBoxCollision(dp.collider)) {
                this.resolveBoxCollision(dp.collider);
            }
        }

        // ── Collision: moving platforms ──
        for (const mp of this.moving) {
            if (this.checkBoxCollision(mp.collider)) {
                this.resolveBoxCollision(mp.collider);
                // Carry player with platform
                if (this.playerOnGround) {
                    const offset = Math.cos(time * mp.speed + mp.phase) * mp.range * mp.speed;
                    if (mp.axis === 'x') this.playerPosition.x += offset * dt;
                    else if (mp.axis === 'y') this.playerPosition.y += offset * dt;
                    else this.playerPosition.z += offset * dt;
                }
            }
        }

        // ── Collision: kill bricks ──
        for (const kb of this.killBricks) {
            if (this.checkBoxCollision(kb.collider)) {
                this.die();
                return;
            }
        }

        // ── Collision: lava zones ──
        for (const lz of this.lavaZones) {
            if (this.checkBoxCollision(lz.collider)) {
                this.die();
                return;
            }
        }

        // ── Conveyor push ──
        for (const conv of this.conveyors) {
            if (this.checkBoxCollision(conv.collider)) {
                this.playerPosition.x += conv.pushX * dt;
                this.playerPosition.z += conv.pushZ * dt;
            }
        }

        // ── Checkpoint collision ──
        for (const cp of this.checkpoints) {
            if (!cp.activated && this.checkBoxCollision(cp.collider)) {
                cp.activated = true;
                this.checkpointsActivated.add(cp.stageIndex);
                this.lastCheckpoint.set(cp.x, cp.y + 0.5, cp.z);
                this.currentStage = cp.stageIndex;

                // Visual feedback: glow bright
                cp.mat.emissiveIntensity = 0.8;
                cp.mat.opacity = 1.0;
                cp.ringMat.emissiveIntensity = 1.0;

                // Spawn particles
                this.spawnParticles(cp.x, cp.y + 1, cp.z, 0x00ff66, 15);
            }
        }

        // ── Animate checkpoint rings ──
        for (const cp of this.checkpoints) {
            if (cp.activated) {
                cp.ring.rotation.z += dt * 2;
                cp.mesh.position.y = cp.y + Math.sin(time * 3) * 0.05;
            }
        }

        // ── Fall to death ──
        if (this.playerPosition.y < -20) {
            this.die();
            return;
        }

        // ── Win check ──
        if (this.winZone && this.checkBoxCollision(this.winZone)) {
            this.win();
            return;
        }

        // ── Update particles ──
        this.updateParticles(dt);

        // ── Lava glow animation ──
        for (const lz of this.lavaZones) {
            const pulse = 0.5 + Math.sin(time * 4) * 0.2;
            lz.mesh.material.emissiveIntensity = pulse;
        }

        // ── HUD ──
        this.updateObbyHUD();
    }

    getGroundY() {
        return -100; // No global ground
    }

    // ── Death and Respawn ────────────────────────────────────────────────

    die() {
        this.deaths++;
        this.respawning = true;
        this.respawnTimer = 1.0;

        // Spawn death particles at player position
        this.spawnParticles(
            this.playerPosition.x,
            this.playerPosition.y + 1,
            this.playerPosition.z,
            0xff4444,
            20
        );

        // Reset to last checkpoint
        this.playerPosition.copy(this.lastCheckpoint);
        this.playerVelocity.set(0, 0, 0);
        this.playerOnGround = true;
    }

    win() {
        this.completed = true;
        this.spawnParticles(this.playerPosition.x, this.playerPosition.y + 2, this.playerPosition.z, 0xffd700, 30);
        this.showWinScreen();
    }

    showWinScreen() {
        const minutes = Math.floor(this.timerElapsed / 60);
        const seconds = (this.timerElapsed % 60).toFixed(1);
        const timeStr = `${minutes}:${seconds.padStart(4, '0')}`;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);z-index:20;font-family:monospace;';
        overlay.innerHTML = `
            <div style="color:#ffd700;font-size:48px;font-weight:bold;text-shadow:0 0 20px rgba(255,215,0,0.5);margin-bottom:20px;">GESCHAFFT!</div>
            <div style="color:#fff;font-size:20px;margin:5px;">Zeit: ${timeStr}</div>
            <div style="color:#ff6b6b;font-size:20px;margin:5px;">Tode: ${this.deaths}</div>
            <div style="color:#aaa;font-size:16px;margin:5px;">Stufen: ${this.totalStages}</div>
            <button id="obby-replay" style="margin-top:25px;padding:12px 30px;font-size:18px;font-family:monospace;font-weight:bold;background:#ffd700;color:#000;border:none;border-radius:8px;cursor:pointer;">Nochmal spielen</button>
        `;
        this.container.appendChild(overlay);

        overlay.querySelector('#obby-replay').addEventListener('click', () => {
            overlay.remove();
            this.score = Math.max(1, Math.floor(1000 - this.timerElapsed * 2 - this.deaths * 10));
            this.endGame();
        });

        // Score based on time + deaths
        this.score = Math.max(1, Math.floor(1000 - this.timerElapsed * 2 - this.deaths * 10));
    }

    // ── Particles ────────────────────────────────────────────────────────

    spawnParticles(x, y, z, color, count) {
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
        for (let i = 0; i < count; i++) {
            const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.position.set(x, y, z);
            this.scene.add(mesh);
            this.particles.push({
                mesh,
                vx: (Math.random() - 0.5) * 8,
                vy: 3 + Math.random() * 6,
                vz: (Math.random() - 0.5) * 8,
                life: 0.8 + Math.random() * 0.5,
                maxLife: 1.3,
            });
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.vy -= 12 * dt;
            p.life -= dt;
            p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
            p.mesh.rotation.x += dt * 5;
            p.mesh.rotation.z += dt * 3;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    // ── HUD Update ───────────────────────────────────────────────────────

    updateObbyHUD() {
        if (this.stageEl) {
            this.stageEl.textContent = `Stufe ${this.currentStage + 1}/${this.totalStages + 1}`;
        }
        if (this.timerEl) {
            const m = Math.floor(this.timerElapsed / 60);
            const s = (this.timerElapsed % 60).toFixed(1);
            this.timerEl.textContent = `Zeit: ${m}:${s.padStart(4, '0')}`;
        }
        if (this.deathsEl) {
            this.deathsEl.textContent = `Tode: ${this.deaths}`;
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    let seed = 5000; // unique seed range

    for (const difficulty of difficulties) {
        for (const theme of themes) {
            for (const totalStages of [10, 15]) {
                const name = generateGameName('Obby', seed);
                variations.push({
                    name,
                    category: 'Obby',
                    is3D: true,
                    config: {
                        theme,
                        difficulty,
                        totalStages,
                        seed,
                        name,
                    },
                    thumbnail: generateThumbnail('Obby', { theme }, seed),
                });
                seed++;
            }
        }
    }
    return variations; // 3 * 6 * 2 = 36
}

// ── Registration ────────────────────────────────────────────────────────
// Obby is 3D only — pass null for 2D class
GameRegistry.registerTemplate3D('Obby', null, ObbyGame, generateVariations);
