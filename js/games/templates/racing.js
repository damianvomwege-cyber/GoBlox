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
    { name: 'Asphalt',   primary: '#e74c3c', secondary: '#ecf0f1', bg: '#2c3e50', road: '#34495e', lane: '#f1c40f', obstacle: '#e67e22', road3d: 0x34495e, car3d: 0xe74c3c, lane3d: 0xf1c40f, skyTop: 0x87ceeb, skyBottom: 0x2c3e50, fog: 0x667788, ground: 0x4a8f4a },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', road: '#161650', lane: '#ff006e', obstacle: '#ffff00', road3d: 0x161650, car3d: 0x00ff87, lane3d: 0xff006e, skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e, ground: 0x0a0a1e },
    { name: 'Desert',    primary: '#f39c12', secondary: '#ffeaa7', bg: '#d4a76a', road: '#8b7355', lane: '#ffffff', obstacle: '#c0392b', road3d: 0x8b7355, car3d: 0xf39c12, lane3d: 0xffffff, skyTop: 0xc9a44a, skyBottom: 0xd4a76a, fog: 0xc4a06a, ground: 0xb89a5a },
    { name: 'Night',     primary: '#74b9ff', secondary: '#dfe6e9', bg: '#0c1021', road: '#1a1a3e', lane: '#ffffff', obstacle: '#ff6b6b', road3d: 0x1a1a3e, car3d: 0x74b9ff, lane3d: 0xffffff, skyTop: 0x0c1021, skyBottom: 0x1a1a3e, fog: 0x0c1021, ground: 0x0a1a0a },
    { name: 'Retro',     primary: '#ff6b6b', secondary: '#ffeaa7', bg: '#2d3436', road: '#636e72', lane: '#ffeaa7', obstacle: '#6c5ce7', road3d: 0x636e72, car3d: 0xff6b6b, lane3d: 0xffeaa7, skyTop: 0x2d3436, skyBottom: 0x4d5456, fog: 0x3d4446, ground: 0x3d5436 },
    { name: 'Arctic',    primary: '#00cec9', secondary: '#dfe6e9', bg: '#c7ecee', road: '#b2bec3', lane: '#2d3436', obstacle: '#d63031', road3d: 0xb2bec3, car3d: 0x00cec9, lane3d: 0x2d3436, skyTop: 0x87ceeb, skyBottom: 0xc7ecee, fog: 0xb7dcde, ground: 0xc8d8dc },
    { name: 'Toxic',     primary: '#00b894', secondary: '#55efc4', bg: '#0a3d00', road: '#1a5a00', lane: '#fdcb6e', obstacle: '#e17055', road3d: 0x1a5a00, car3d: 0x00b894, lane3d: 0xfdcb6e, skyTop: 0x0a1500, skyBottom: 0x0a3d00, fog: 0x0a2d00, ground: 0x0a2a00 },
    { name: 'Sunset',    primary: '#e84393', secondary: '#fd79a8', bg: '#2d1b4e', road: '#4a2670', lane: '#ffeaa7', obstacle: '#fdcb6e', road3d: 0x4a2670, car3d: 0xe84393, lane3d: 0xffeaa7, skyTop: 0xff6f61, skyBottom: 0x2d1b4e, fog: 0x4d3b6e, ground: 0x3d2b5e },
];

// ── RacingGame ──────────────────────────────────────────────────────────
class RacingGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);
        this.laneCount = cfg.laneCount;
        this.obstacleFrequency = cfg.obstacleFrequency;
        this.baseSpeed = cfg.speed;

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Road geometry
        this.roadWidth = W * 0.7;
        this.roadLeft = (W - this.roadWidth) / 2;
        this.laneWidth = this.roadWidth / this.laneCount;

        // Player car
        this.carWidth = this.laneWidth * 0.55;
        this.carHeight = this.carWidth * 1.8;
        this.playerLane = Math.floor(this.laneCount / 2);
        this.playerX = this.getLaneCenter(this.playerLane);
        this.targetX = this.playerX;
        this.playerY = H - this.carHeight - 30;

        // Scrolling
        this.scrollSpeed = 150 + this.baseSpeed * 40; // pixels/sec
        this.scrollOffset = 0;
        this.distance = 0;

        // Lane markings (repeating pattern)
        this.dashLength = 30;
        this.dashGap = 20;

        // Obstacles
        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.0 / this.obstacleFrequency;

        // Speed ramp
        this.speedMultiplier = 1;

        // Particles (collision)
        this.particles = [];
    }

    getLaneCenter(lane) {
        return this.roadLeft + lane * this.laneWidth + this.laneWidth / 2;
    }

    spawnObstacle() {
        const lane = Math.floor(this.rng() * this.laneCount);
        const type = this.rng() > 0.35 ? 'car' : 'barrier';
        const w = type === 'car' ? this.carWidth : this.laneWidth * 0.7;
        const h = type === 'car' ? this.carHeight : this.carWidth * 0.5;
        const speedFactor = type === 'car' ? 0.3 + this.rng() * 0.5 : 0;

        this.obstacles.push({
            x: this.getLaneCenter(lane),
            y: -h,
            w,
            h,
            type,
            speedFactor, // cars move slower than road scroll
            color: type === 'car' ? this.randomColor() : this.theme.obstacle,
        });
    }

    randomColor() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];
        return colors[Math.floor(this.rng() * colors.length)];
    }

    update(dt) {
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Increase speed over time
        this.speedMultiplier = 1 + this.distance / 5000;
        const currentSpeed = this.scrollSpeed * this.speedMultiplier;

        // Scroll
        this.scrollOffset += currentSpeed * dt;
        this.distance += currentSpeed * dt;
        this.score = Math.floor(this.distance / 10);

        // Move player toward target lane smoothly
        const moveSpeed = 600;
        const diff = this.targetX - this.playerX;
        if (Math.abs(diff) > 1) {
            this.playerX += Math.sign(diff) * Math.min(moveSpeed * dt, Math.abs(diff));
        } else {
            this.playerX = this.targetX;
        }

        // Clamp player inside road
        const halfCar = this.carWidth / 2;
        this.playerX = Math.max(this.roadLeft + halfCar + 4, Math.min(this.roadLeft + this.roadWidth - halfCar - 4, this.playerX));

        // Spawn obstacles
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval / this.speedMultiplier) {
            this.spawnTimer = 0;
            this.spawnObstacle();
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            o.y += (currentSpeed * (1 - o.speedFactor)) * dt;

            // Remove off-screen
            if (o.y > H + 50) {
                this.obstacles.splice(i, 1);
                continue;
            }

            // Collision check with player (AABB)
            const px = this.playerX - this.carWidth / 2;
            const py = this.playerY;
            const ox = o.x - o.w / 2;
            const oy = o.y - o.h / 2;

            if (px < ox + o.w && px + this.carWidth > ox &&
                py < oy + o.h && py + this.carHeight > oy) {
                // Spawn crash particles
                for (let j = 0; j < 12; j++) {
                    this.particles.push({
                        x: this.playerX,
                        y: this.playerY + this.carHeight / 2,
                        vx: (Math.random() - 0.5) * 300,
                        vy: (Math.random() - 0.5) * 300,
                        life: 0.6,
                        maxLife: 0.6,
                        color: this.theme.primary,
                    });
                }
                this.endGame();
                return;
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

    onKeyDown(key) {
        if (this.gameOver) return;
        switch (key) {
            case 'ArrowLeft': case 'a': case 'A':
                this.playerLane = Math.max(0, this.playerLane - 1);
                this.targetX = this.getLaneCenter(this.playerLane);
                break;
            case 'ArrowRight': case 'd': case 'D':
                this.playerLane = Math.min(this.laneCount - 1, this.playerLane + 1);
                this.targetX = this.getLaneCenter(this.playerLane);
                break;
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Background (off-road)
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Road surface
        ctx.fillStyle = t.road;
        ctx.fillRect(this.roadLeft, 0, this.roadWidth, H);

        // Road edges
        ctx.fillStyle = t.secondary;
        ctx.fillRect(this.roadLeft - 4, 0, 4, H);
        ctx.fillRect(this.roadLeft + this.roadWidth, 0, 4, H);

        // Lane markings (scrolling dashes)
        ctx.strokeStyle = t.lane;
        ctx.lineWidth = 2;
        ctx.setLineDash([this.dashLength, this.dashGap]);
        const dashOffset = -(this.scrollOffset % (this.dashLength + this.dashGap));
        ctx.lineDashOffset = dashOffset;

        for (let i = 1; i < this.laneCount; i++) {
            const x = this.roadLeft + i * this.laneWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Obstacles
        for (const o of this.obstacles) {
            const ox = o.x - o.w / 2;
            const oy = o.y - o.h / 2;

            if (o.type === 'car') {
                // Car body
                ctx.fillStyle = o.color;
                ctx.beginPath();
                ctx.roundRect(ox, oy, o.w, o.h, 6);
                ctx.fill();

                // Windshield
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                const wsY = oy + o.h * 0.15;
                const wsH = o.h * 0.2;
                ctx.fillRect(ox + o.w * 0.15, wsY, o.w * 0.7, wsH);

                // Rear window
                const rwY = oy + o.h * 0.7;
                ctx.fillRect(ox + o.w * 0.2, rwY, o.w * 0.6, wsH * 0.8);
            } else {
                // Barrier — striped
                ctx.fillStyle = o.color;
                ctx.fillRect(ox, oy, o.w, o.h);
                // Stripes
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                const stripeW = o.w / 6;
                for (let s = 0; s < 6; s += 2) {
                    ctx.fillRect(ox + s * stripeW, oy, stripeW, o.h);
                }
            }
        }

        // Player car
        const px = this.playerX - this.carWidth / 2;
        const py = this.playerY;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.playerX, py + this.carHeight + 4, this.carWidth / 2 + 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car body
        ctx.fillStyle = t.primary;
        ctx.beginPath();
        ctx.roundRect(px, py, this.carWidth, this.carHeight, 8);
        ctx.fill();

        // Windshield
        ctx.fillStyle = t.secondary + 'aa';
        const wsW = this.carWidth * 0.7;
        const wsH = this.carHeight * 0.18;
        ctx.fillRect(px + (this.carWidth - wsW) / 2, py + this.carHeight * 0.18, wsW, wsH);

        // Rear
        ctx.fillRect(px + (this.carWidth - wsW * 0.85) / 2, py + this.carHeight * 0.7, wsW * 0.85, wsH * 0.75);

        // Headlights
        ctx.fillStyle = '#ffffcc';
        const hlSize = this.carWidth * 0.12;
        ctx.beginPath();
        ctx.arc(px + this.carWidth * 0.22, py + 4, hlSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + this.carWidth * 0.78, py + 4, hlSize, 0, Math.PI * 2);
        ctx.fill();

        // Tiny character in the car with helmet
        const charSize = this.carHeight * 0.35;
        drawCharacter(ctx, this.playerX, py + this.carHeight * 0.38, charSize, 'down', 'helmet', 0);

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD - Score / Distance
        ctx.fillStyle = t.secondary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        ctx.fillStyle = t.secondary + '99';
        ctx.font = '14px monospace';
        ctx.fillText(`${Math.floor(this.distance)}m`, 12, 38);

        // Speed indicator
        ctx.fillStyle = t.lane;
        ctx.font = '14px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`x${this.speedMultiplier.toFixed(1)}`, W - 12, 12);

        // Instructions at start
        if (this.distance < 50) {
            ctx.fillStyle = t.secondary + 'bb';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Left/Right or A/D to steer', W / 2, H - 12);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('CRASH!', W / 2, H / 2 - 30);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 15);

            ctx.font = '16px monospace';
            ctx.fillText(`Distance: ${Math.floor(this.distance)}m`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 3D RacingGame — straight road with obstacles
// ══════════════════════════════════════════════════════════════════════════
class RacingGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32_3d(cfg.seed || 1);
        this.laneCount = cfg.laneCount || 3;
        this.obstacleFrequency = cfg.obstacleFrequency || 3;
        this.baseSpeed = cfg.speed || 3;

        // Road parameters
        this.laneWidth = 3;
        this.roadWidth = this.laneCount * this.laneWidth;
        this.roadHalfW = this.roadWidth / 2;

        // Player car state
        this.playerLane = Math.floor(this.laneCount / 2);
        this.carX = this.getLaneCenter3D(this.playerLane);
        this.targetCarX = this.carX;
        this.distance = 0;
        this.scrollSpeed = 20 + this.baseSpeed * 6;
        this.speedMultiplier = 1;

        // Obstacles
        this.obstacles3D = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.0 / this.obstacleFrequency;
        this.obstacleFarZ = -200;
        this.obstacleRemoveZ = 15;

        // Disable default player model and physics
        this.playerModel.visible = false;
        this.gravity = 0;
        this.moveSpeed = 0;

        // Build the world
        this.createSky(cfg.theme.skyTop || 0x87ceeb, cfg.theme.skyBottom || 0xe0f7fa, cfg.theme.fog || 0xccddee, 30, 180);

        this.buildRoad();
        this.buildBarriers();
        this.buildPlayerCar();
        this.buildEnvironment();

        // HUD
        this.createHUD();

        // Remove pointer lock message — no mouse needed
        if (this.lockMsg) this.lockMsg.style.display = 'none';
    }

    getLaneCenter3D(lane) {
        return -this.roadHalfW + this.laneWidth * 0.5 + lane * this.laneWidth;
    }

    buildRoad() {
        const t = this.theme;
        // Long road plane
        const roadGeo = new THREE.PlaneGeometry(this.roadWidth, 300);
        const roadMat = new THREE.MeshStandardMaterial({ color: t.road3d || 0x34495e, roughness: 0.85, metalness: 0.0 });
        this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
        this.roadMesh.rotation.x = -Math.PI / 2;
        this.roadMesh.position.set(0, 0.01, -120);
        this.roadMesh.receiveShadow = true;
        this.scene.add(this.roadMesh);

        // Ground on sides
        const sideGeo = new THREE.PlaneGeometry(60, 300);
        const sideMat = new THREE.MeshStandardMaterial({ color: t.ground || 0x4a8f4a, roughness: 0.9 });
        const leftSide = new THREE.Mesh(sideGeo, sideMat);
        leftSide.rotation.x = -Math.PI / 2;
        leftSide.position.set(-this.roadHalfW - 30, 0, -120);
        leftSide.receiveShadow = true;
        this.scene.add(leftSide);

        const rightSide = new THREE.Mesh(sideGeo, sideMat);
        rightSide.rotation.x = -Math.PI / 2;
        rightSide.position.set(this.roadHalfW + 30, 0, -120);
        rightSide.receiveShadow = true;
        this.scene.add(rightSide);

        // Lane markings using InstancedMesh
        const dashGeo = new THREE.BoxGeometry(0.1, 0.02, 1.5);
        const dashMat = new THREE.MeshStandardMaterial({ color: t.lane3d || 0xf1c40f, emissive: t.lane3d || 0xf1c40f, emissiveIntensity: 0.3 });
        const dashesPerLane = 40;
        const dashSpacing = 6;
        const totalDashes = (this.laneCount - 1) * dashesPerLane;
        this.laneDashes = new THREE.InstancedMesh(dashGeo, dashMat, totalDashes);
        this.laneDashes.receiveShadow = false;

        const dummy = new THREE.Object3D();
        let idx = 0;
        for (let lane = 1; lane < this.laneCount; lane++) {
            const lx = -this.roadHalfW + lane * this.laneWidth;
            for (let d = 0; d < dashesPerLane; d++) {
                dummy.position.set(lx, 0.02, -d * dashSpacing);
                dummy.updateMatrix();
                this.laneDashes.setMatrixAt(idx++, dummy.matrix);
            }
        }
        this.laneDashes.instanceMatrix.needsUpdate = true;
        this.dashSpacing = dashSpacing;
        this.dashCount = dashesPerLane;
        this.scene.add(this.laneDashes);
    }

    buildBarriers() {
        const t = this.theme;
        // Side barriers
        const barrierGeo = new THREE.BoxGeometry(0.3, 0.6, 300);
        const barrierMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });

        const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
        leftBarrier.position.set(-this.roadHalfW - 0.3, 0.3, -120);
        leftBarrier.castShadow = true;
        this.scene.add(leftBarrier);

        const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
        rightBarrier.position.set(this.roadHalfW + 0.3, 0.3, -120);
        rightBarrier.castShadow = true;
        this.scene.add(rightBarrier);
    }

    buildPlayerCar() {
        const t = this.theme;
        this.carGroup = new THREE.Group();

        // Car body
        const bodyGeo = new THREE.BoxGeometry(1.6, 0.6, 3.0);
        const bodyMat = new THREE.MeshStandardMaterial({ color: t.car3d || 0xe74c3c, roughness: 0.3, metalness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        this.carGroup.add(body);

        // Roof
        const roofGeo = new THREE.BoxGeometry(1.2, 0.4, 1.4);
        const roofMat = new THREE.MeshStandardMaterial({ color: t.car3d || 0xe74c3c, roughness: 0.3, metalness: 0.4 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 0.95, -0.2);
        roof.castShadow = true;
        this.carGroup.add(roof);

        // Windshield
        const windGeo = new THREE.BoxGeometry(1.1, 0.35, 0.05);
        const windMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.6 });
        const windshield = new THREE.Mesh(windGeo, windMat);
        windshield.position.set(0, 0.9, -0.9);
        windshield.rotation.x = 0.3;
        this.carGroup.add(windshield);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        const wheelPositions = [
            [-0.8, 0.25, 0.9],
            [0.8, 0.25, 0.9],
            [-0.8, 0.25, -0.9],
            [0.8, 0.25, -0.9],
        ];
        for (const [wx, wy, wz] of wheelPositions) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(wx, wy, wz);
            wheel.rotation.z = Math.PI / 2;
            this.carGroup.add(wheel);
        }

        // Headlights
        const hlGeo = new THREE.SphereGeometry(0.1, 6, 6);
        const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 0.8 });
        const hl1 = new THREE.Mesh(hlGeo, hlMat);
        hl1.position.set(-0.55, 0.5, -1.5);
        this.carGroup.add(hl1);
        const hl2 = new THREE.Mesh(hlGeo, hlMat);
        hl2.position.set(0.55, 0.5, -1.5);
        this.carGroup.add(hl2);

        this.carGroup.position.set(this.carX, 0, 0);
        this.scene.add(this.carGroup);
    }

    buildEnvironment() {
        // Trees and buildings along the roadside
        const treeGeo = new THREE.ConeGeometry(1, 3, 6);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8 });
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.5, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9 });
        const buildingGeo = new THREE.BoxGeometry(3, 4, 3);
        const buildingColors = [0x7f8c8d, 0x95a5a6, 0x6c7a89, 0x5d6d7e];

        for (let i = 0; i < 30; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const offsetX = this.roadHalfW + 4 + this.rng() * 15;
            const z = -i * 10 - 5;

            if (this.rng() > 0.4) {
                // Tree
                const tree = new THREE.Group();
                const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                trunk.position.y = 0.75;
                tree.add(trunk);
                const foliage = new THREE.Mesh(treeGeo, treeMat);
                foliage.position.y = 2.8;
                foliage.castShadow = true;
                tree.add(foliage);
                tree.position.set(side * offsetX, 0, z);
                this.scene.add(tree);
            } else {
                // Building
                const bColor = buildingColors[Math.floor(this.rng() * buildingColors.length)];
                const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.8 });
                const bHeight = 3 + this.rng() * 6;
                const building = new THREE.Mesh(new THREE.BoxGeometry(2 + this.rng() * 3, bHeight, 2 + this.rng() * 3), bMat);
                building.position.set(side * offsetX, bHeight / 2, z);
                building.castShadow = true;
                this.scene.add(building);
            }
        }
    }

    randomColor3D() {
        const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1];
        return colors[Math.floor(this.rng() * colors.length)];
    }

    spawnObstacle3D() {
        const lane = Math.floor(this.rng() * this.laneCount);
        const type = this.rng() > 0.35 ? 'car' : 'barrier';
        const speedFactor = type === 'car' ? 0.3 + this.rng() * 0.5 : 0;
        const lx = this.getLaneCenter3D(lane);

        let mesh;
        if (type === 'car') {
            const group = new THREE.Group();
            const color = this.randomColor3D();
            const oBodyGeo = new THREE.BoxGeometry(1.4, 0.55, 2.6);
            const oBodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
            const oBody = new THREE.Mesh(oBodyGeo, oBodyMat);
            oBody.position.y = 0.47;
            oBody.castShadow = true;
            group.add(oBody);

            const oRoofGeo = new THREE.BoxGeometry(1.1, 0.35, 1.2);
            const oRoof = new THREE.Mesh(oRoofGeo, oBodyMat);
            oRoof.position.set(0, 0.9, 0);
            oRoof.castShadow = true;
            group.add(oRoof);

            group.position.set(lx, 0, this.obstacleFarZ);
            this.scene.add(group);
            mesh = group;
        } else {
            const barrGeo = new THREE.BoxGeometry(this.laneWidth * 0.8, 0.5, 0.8);
            const barrMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.6 });
            mesh = new THREE.Mesh(barrGeo, barrMat);
            mesh.position.set(lx, 0.25, this.obstacleFarZ);
            mesh.castShadow = true;
            this.scene.add(mesh);
        }

        this.obstacles3D.push({
            mesh,
            type,
            lane,
            z: this.obstacleFarZ,
            speedFactor,
            halfW: type === 'car' ? 0.7 : this.laneWidth * 0.4,
            halfD: type === 'car' ? 1.3 : 0.4,
            height: type === 'car' ? 1.2 : 0.5,
        });
    }

    onKeyDown(code) {
        if (this.gameOver) return;
        if (code === 'ArrowLeft' || code === 'KeyA') {
            this.playerLane = Math.max(0, this.playerLane - 1);
            this.targetCarX = this.getLaneCenter3D(this.playerLane);
        } else if (code === 'ArrowRight' || code === 'KeyD') {
            this.playerLane = Math.min(this.laneCount - 1, this.playerLane + 1);
            this.targetCarX = this.getLaneCenter3D(this.playerLane);
        }
    }

    updatePlayer(dt) {
        // Override: no default player movement/physics
        if (this.gameOver) return;

        // Smooth lane change
        const laneSpeed = 12;
        const diff = this.targetCarX - this.carX;
        if (Math.abs(diff) > 0.05) {
            this.carX += diff * Math.min(1, laneSpeed * dt);
        } else {
            this.carX = this.targetCarX;
        }

        this.carGroup.position.x = this.carX;
        // Slight tilt when turning
        this.carGroup.rotation.z = -diff * 0.15;
    }

    updateCamera(dt) {
        // Fixed chase camera behind and above the car
        const targetPos = new THREE.Vector3(
            this.carX * 0.3,
            5,
            9
        );
        const t = 1 - Math.exp(-6 * dt);
        this.camera.position.lerp(targetPos, t);
        this.camera.lookAt(this.carX * 0.5, 0.5, -10);

        // Move sun to follow
        if (this.sunLight) {
            this.sunLight.position.set(this.carX + 30, 50, 30);
            this.sunLight.target.position.set(this.carX, 0, -20);
        }
    }

    update(dt) {
        if (this.gameOver) return;

        // Speed ramp
        this.speedMultiplier = 1 + this.distance / 800;
        const currentSpeed = this.scrollSpeed * this.speedMultiplier;

        this.distance += currentSpeed * dt;
        this.score = Math.floor(this.distance);
        this.updateHUDScore(this.score);

        // Animate lane dashes scrolling
        const dummy = new THREE.Object3D();
        const scrollOff = (this.distance * 0.5) % this.dashSpacing;
        let idx = 0;
        for (let lane = 1; lane < this.laneCount; lane++) {
            const lx = -this.roadHalfW + lane * this.laneWidth;
            for (let d = 0; d < this.dashCount; d++) {
                dummy.position.set(lx, 0.02, -d * this.dashSpacing + scrollOff);
                dummy.updateMatrix();
                this.laneDashes.setMatrixAt(idx++, dummy.matrix);
            }
        }
        this.laneDashes.instanceMatrix.needsUpdate = true;

        // Spawn obstacles
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval / this.speedMultiplier) {
            this.spawnTimer = 0;
            this.spawnObstacle3D();
        }

        // Move obstacles toward player
        for (let i = this.obstacles3D.length - 1; i >= 0; i--) {
            const o = this.obstacles3D[i];
            const moveSpeed = currentSpeed * (1 - o.speedFactor);
            o.z += moveSpeed * dt;
            o.mesh.position.z = o.z;

            // Remove past player
            if (o.z > this.obstacleRemoveZ) {
                this.scene.remove(o.mesh);
                this.obstacles3D.splice(i, 1);
                continue;
            }

            // Collision check (simple AABB)
            const carHalfW = 0.7;
            const carFrontZ = -1.5;
            const carBackZ = 1.5;

            if (Math.abs(this.carX - o.mesh.position.x) < (carHalfW + o.halfW) &&
                o.z + o.halfD > carFrontZ && o.z - o.halfD < carBackZ) {
                this.endGame();
                return;
            }
        }

        // HUD info
        if (this.hudInfoEl) {
            this.hudInfoEl.textContent = `${Math.floor(this.distance)}m  x${this.speedMultiplier.toFixed(1)}`;
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const speeds = [2, 3, 4];           // base speed multiplier
    const laneCounts = [2, 3, 4];
    const frequencies = [2, 3, 4];      // obstacle frequency
    let seed = 1;

    for (const speed of speeds) {
        for (const laneCount of laneCounts) {
            for (const freq of frequencies) {
                for (const theme of themes) {
                    const is3D = seed % 2 === 0;
                    const name = generateGameName('Racing', seed);
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Racing',
                        is3D,
                        config: {
                            speed,
                            laneCount,
                            obstacleFrequency: freq,
                            theme,
                            seed,
                            name: name + (is3D ? ' 3D' : ''),
                        },
                        thumbnail: generateThumbnail('Racing', { theme }, seed),
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
GameRegistry.registerTemplate3D('Racing', RacingGame, RacingGame3D, generateVariations);
