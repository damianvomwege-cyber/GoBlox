import { BaseGame } from '../base-game.js';
import { BaseGame3D, buildCharacterModel, mulberry32 } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import { drawCharacter } from '../character.js';
import * as THREE from 'three';

// ── Seeded PRNG (for 2D) ────────────────────────────────────────────────
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
    { name: 'Dungeon',  primary: '#fdcb6e', secondary: '#f39c12', bg: '#1a1a2e', wall: '#2d3436', path: '#0a0a1e', player: '#00b894', exit: '#e74c3c', fog: '#0a0a1e', text: '#dfe6e9', wallColor3d: 0x2d3436, floorColor3d: 0x1a1a2e, skyTop: 0x0a0a1e, skyBottom: 0x1a1a2e, fogColor: 0x0a0a1e, exitColor: 0xe74c3c },
    { name: 'Neon',     primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', wall: '#6c5ce7', path: '#161650', player: '#00ff87', exit: '#ff006e', fog: '#0a0a2e', text: '#ffffff', wallColor3d: 0x6c5ce7, floorColor3d: 0x161650, skyTop: 0x0a0a2e, skyBottom: 0x161650, fogColor: 0x0a0a2e, exitColor: 0xff006e },
    { name: 'Ice',      primary: '#74b9ff', secondary: '#dfe6e9', bg: '#0c1021', wall: '#b2bec3', path: '#1c2031', player: '#00cec9', exit: '#ff6b6b', fog: '#0c1021', text: '#dfe6e9', wallColor3d: 0xb2bec3, floorColor3d: 0x1c2031, skyTop: 0x5d8baa, skyBottom: 0x0c1021, fogColor: 0x2c3041, exitColor: 0xff6b6b },
    { name: 'Forest',   primary: '#00b894', secondary: '#55efc4', bg: '#0a2e0a', wall: '#2d6a2d', path: '#0a1a0a', player: '#feca57', exit: '#e74c3c', fog: '#0a2e0a', text: '#dfe6e9', wallColor3d: 0x2d6a2d, floorColor3d: 0x0a1a0a, skyTop: 0x4a9a6f, skyBottom: 0x0a2e0a, fogColor: 0x1a3a1a, exitColor: 0xe74c3c },
    { name: 'Lava',     primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0500', wall: '#4a1500', path: '#0a0200', player: '#00b4d8', exit: '#ffd700', fog: '#1a0500', text: '#ffffff', wallColor3d: 0x4a1500, floorColor3d: 0x0a0200, skyTop: 0x1a0a00, skyBottom: 0x3a1a00, fogColor: 0x1a0a00, exitColor: 0xffd700 },
    { name: 'Ocean',    primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', wall: '#023e8a', path: '#010225', player: '#feca57', exit: '#ff6b6b', fog: '#03045e', text: '#caf0f8', wallColor3d: 0x023e8a, floorColor3d: 0x010225, skyTop: 0x03045e, skyBottom: 0x0a0a4e, fogColor: 0x03045e, exitColor: 0xff6b6b },
    { name: 'Royal',    primary: '#6c5ce7', secondary: '#a29bfe', bg: '#1a0a2e', wall: '#4a3480', path: '#100520', player: '#fdcb6e', exit: '#e74c3c', fog: '#1a0a2e', text: '#dfe6e9', wallColor3d: 0x4a3480, floorColor3d: 0x100520, skyTop: 0x1a0a2e, skyBottom: 0x2a1a4e, fogColor: 0x1a0a2e, exitColor: 0xe74c3c },
    { name: 'Sunset',   primary: '#e84393', secondary: '#fd79a8', bg: '#2d1b0e', wall: '#6d3b1e', path: '#1d0b00', player: '#55efc4', exit: '#feca57', fog: '#2d1b0e', text: '#ffffff', wallColor3d: 0x6d3b1e, floorColor3d: 0x1d0b00, skyTop: 0x6d3b1e, skyBottom: 0x2d1b0e, fogColor: 0x2d1b0e, exitColor: 0xfeca57 },
];

// ── Wall bits (bitmask) ─────────────────────────────────────────────────
const NN = 1, SS = 2, EE = 4, WW = 8;
const DX = { [NN]: 0, [SS]: 0, [EE]: 1, [WW]: -1 };
const DY = { [NN]: -1, [SS]: 1, [EE]: 0, [WW]: 0 };
const OPPOSITE = { [NN]: SS, [SS]: NN, [EE]: WW, [WW]: EE };

// ── Maze Generation (Recursive Backtracker, seeded) ─────────────────────
function generateMaze(width, height, rng) {
    const grid = [];
    for (let y = 0; y < height; y++) { grid[y] = []; for (let x = 0; x < width; x++) grid[y][x] = 0; }
    const stack = []; const visited = [];
    for (let y = 0; y < height; y++) { visited[y] = []; for (let x = 0; x < width; x++) visited[y][x] = false; }
    let cx = 0, cy = 0; visited[cy][cx] = true; stack.push({ x: cx, y: cy });
    while (stack.length > 0) {
        const { x, y } = stack[stack.length - 1];
        const dirs = [];
        for (const dir of [NN, SS, EE, WW]) { const nx = x + DX[dir]; const ny = y + DY[dir]; if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx]) dirs.push(dir); }
        if (dirs.length === 0) { stack.pop(); }
        else { const dir = dirs[Math.floor(rng() * dirs.length)]; const nx = x + DX[dir]; const ny = y + DY[dir]; grid[y][x] |= dir; grid[ny][nx] |= OPPOSITE[dir]; visited[ny][nx] = true; stack.push({ x: nx, y: ny }); }
    }
    return grid;
}

// ══════════════════════════════════════════════════════════════════════════
// 2D MazeGame (original, kept intact but compressed)
// ══════════════════════════════════════════════════════════════════════════
class MazeGame extends BaseGame {
    init() {
        const cfg = this.config; this.theme = cfg.theme; this.rng = mulberry32_2d(cfg.seed || 1);
        this.mazeW = cfg.size; this.mazeH = cfg.size; this.visibility = cfg.visibility; this.timeLimit = cfg.timeLimit; this.timeLeft = this.timeLimit; this.elapsed = 0;
        this.grid = generateMaze(this.mazeW, this.mazeH, this.rng);
        const canvasW = this.canvas.width; const canvasH = this.canvas.height;
        this.cellSize = Math.floor(Math.min((canvasW - 30) / this.mazeW, (canvasH - 60) / this.mazeH));
        this.offsetX = Math.floor((canvasW - this.cellSize * this.mazeW) / 2);
        this.offsetY = Math.floor((canvasH - this.cellSize * this.mazeH) / 2) + 15;
        this.fogRadius = this.visibility === 'fog' ? 2.5 : 999;
        this.playerX = 0; this.playerY = 0; this.playerDirection = 'right';
        this.exitX = this.mazeW - 1; this.exitY = this.mazeH - 1;
        this.moveCooldown = 0; this.visited = new Set(); this.visited.add('0,0'); this.won = false; this.particles = []; this.exitPulse = 0;
    }
    canMove(x, y, dir) { return (this.grid[y][x] & dir) !== 0; }
    movePlayer(dx, dy) {
        if (this.won || this.gameOver) return; let dir;
        if (dx === 1) dir = EE; else if (dx === -1) dir = WW; else if (dy === -1) dir = NN; else if (dy === 1) dir = SS; else return;
        if (this.canMove(this.playerX, this.playerY, dir)) {
            this.playerX += dx; this.playerY += dy; this.visited.add(`${this.playerX},${this.playerY}`);
            if (dx === 1) this.playerDirection = 'right'; else if (dx === -1) this.playerDirection = 'left'; else if (dy === 1) this.playerDirection = 'down'; else if (dy === -1) this.playerDirection = 'up';
            if (this.playerX === this.exitX && this.playerY === this.exitY) {
                this.won = true; this.score = Math.max(1, Math.floor(this.timeLimit > 0 ? this.timeLeft : 1000 - this.elapsed));
                const cx = this.offsetX + this.exitX * this.cellSize + this.cellSize / 2; const cy = this.offsetY + this.exitY * this.cellSize + this.cellSize / 2;
                for (let i = 0; i < 15; i++) this.particles.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 250, vy: -50 - Math.random() * 200, life: 1.0, maxLife: 1.0, color: this.theme.exit });
                this.endGame();
            }
        }
    }
    update(dt) {
        this.elapsed += dt;
        if (this.timeLimit > 0 && !this.won) { this.timeLeft = this.timeLimit - this.elapsed; if (this.timeLeft <= 0) { this.timeLeft = 0; this.score = 0; this.endGame(); return; } }
        if (this.moveCooldown > 0) this.moveCooldown -= dt;
        if (this.moveCooldown <= 0) { let moved = false;
            if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) { this.movePlayer(0, -1); moved = true; }
            else if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) { this.movePlayer(0, 1); moved = true; }
            else if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) { this.movePlayer(-1, 0); moved = true; }
            else if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) { this.movePlayer(1, 0); moved = true; }
            if (moved) this.moveCooldown = 0.12;
        }
        this.exitPulse += dt * 3;
        for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 150 * dt; p.life -= dt; if (p.life <= 0) this.particles.splice(i, 1); }
    }
    render() {
        const ctx = this.ctx; const canvasW = this.canvas.width; const canvasH = this.canvas.height; const t = this.theme; const cs = this.cellSize;
        ctx.fillStyle = t.bg; ctx.fillRect(0, 0, canvasW, canvasH);
        for (let y = 0; y < this.mazeH; y++) { for (let x = 0; x < this.mazeW; x++) {
            const cx = this.offsetX + x * cs; const cy = this.offsetY + y * cs; const cell = this.grid[y][x];
            const dist = Math.sqrt((x - this.playerX) ** 2 + (y - this.playerY) ** 2);
            if (dist > this.fogRadius + 0.5) { ctx.fillStyle = t.fog; ctx.fillRect(cx, cy, cs, cs); continue; }
            const fogAlpha = dist > this.fogRadius - 0.5 ? 1 - (this.fogRadius + 0.5 - dist) : 0;
            const isVisited = this.visited.has(`${x},${y}`); ctx.fillStyle = isVisited ? t.path + 'cc' : t.path; ctx.fillRect(cx, cy, cs, cs);
            if (isVisited) { ctx.fillStyle = t.player + '15'; ctx.fillRect(cx, cy, cs, cs); }
            ctx.strokeStyle = t.wall; ctx.lineWidth = 2;
            if (!(cell & NN)) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + cs, cy); ctx.stroke(); }
            if (!(cell & SS)) { ctx.beginPath(); ctx.moveTo(cx, cy + cs); ctx.lineTo(cx + cs, cy + cs); ctx.stroke(); }
            if (!(cell & WW)) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + cs); ctx.stroke(); }
            if (!(cell & EE)) { ctx.beginPath(); ctx.moveTo(cx + cs, cy); ctx.lineTo(cx + cs, cy + cs); ctx.stroke(); }
            if (fogAlpha > 0) { ctx.fillStyle = t.fog; ctx.globalAlpha = fogAlpha; ctx.fillRect(cx, cy, cs, cs); ctx.globalAlpha = 1; }
        }}
        ctx.strokeStyle = t.primary + '80'; ctx.lineWidth = 3; ctx.strokeRect(this.offsetX, this.offsetY, this.mazeW * cs, this.mazeH * cs);
        const exitDist = Math.sqrt((this.exitX - this.playerX) ** 2 + (this.exitY - this.playerY) ** 2);
        if (exitDist <= this.fogRadius + 0.5) {
            const ex = this.offsetX + this.exitX * cs + cs / 2; const ey = this.offsetY + this.exitY * cs + cs / 2; const pulse = 0.7 + Math.sin(this.exitPulse) * 0.3;
            ctx.fillStyle = t.exit + '30'; ctx.beginPath(); ctx.arc(ex, ey, cs * 0.5 * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = t.exit; ctx.beginPath(); const r = cs * 0.3 * pulse;
            for (let i = 0; i < 5; i++) { const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2; const method = i === 0 ? 'moveTo' : 'lineTo'; ctx[method](ex + Math.cos(angle) * r, ey + Math.sin(angle) * r); }
            ctx.closePath(); ctx.fill();
        }
        const px = this.offsetX + this.playerX * cs + cs / 2; const py = this.offsetY + this.playerY * cs + cs / 2;
        drawCharacter(ctx, px, py, cs * 0.85, this.playerDirection, 'torch', this.elapsed * 3);
        for (const p of this.particles) { const alpha = p.life / p.maxLife; ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
        ctx.fillStyle = t.text; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        if (this.timeLimit > 0) { ctx.fillStyle = this.timeLeft < 10 ? '#ff6b6b' : t.text; ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, 12, 8); }
        else { ctx.fillStyle = t.text + '99'; ctx.font = '14px monospace'; ctx.fillText(`Time: ${Math.floor(this.elapsed)}s`, 12, 10); }
        if (this.visibility === 'fog') { ctx.fillStyle = t.primary + 'aa'; ctx.font = '12px monospace'; ctx.textAlign = 'right'; ctx.fillText('FOG', canvasW - 12, 10); }
        ctx.fillStyle = t.text + '60'; ctx.font = '12px monospace'; ctx.textAlign = 'right'; ctx.fillText(`${this.mazeW}x${this.mazeH}`, canvasW - 12, 24);
        if (this.elapsed < 3) { ctx.fillStyle = t.text + 'bb'; ctx.font = '13px monospace'; ctx.textAlign = 'center'; ctx.fillText('Arrow keys / WASD to move', canvasW / 2, canvasH - 10); }
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, canvasW, canvasH); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (this.won) { ctx.fillStyle = t.exit; ctx.font = 'bold 40px monospace'; ctx.fillText('ESCAPE!', canvasW / 2, canvasH / 2 - 40); ctx.fillStyle = t.secondary; ctx.font = 'bold 22px monospace'; ctx.fillText(`Time: ${Math.floor(this.elapsed)}s`, canvasW / 2, canvasH / 2 + 5); ctx.font = '18px monospace'; ctx.fillText(`Score: ${this.score}`, canvasW / 2, canvasH / 2 + 35); }
            else { ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 40px monospace'; ctx.fillText('TIME UP!', canvasW / 2, canvasH / 2 - 30); ctx.fillStyle = t.text + 'cc'; ctx.font = '18px monospace'; ctx.fillText('Could not escape in time', canvasW / 2, canvasH / 2 + 10); }
            ctx.fillStyle = t.text + 'aa'; ctx.font = '16px monospace'; ctx.fillText('Refresh to play again', canvasW / 2, canvasH / 2 + 70);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 3D MazeGame — Walk through a 3D maze
// ══════════════════════════════════════════════════════════════════════════
class MazeGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        this.mazeW = cfg.size;
        this.mazeH = cfg.size;
        this.visibility = cfg.visibility;
        this.timeLimit = cfg.timeLimit;
        this.timeLeft = this.timeLimit;
        this.elapsed = 0;
        this.won = false;

        // Physics — slower, tighter for maze
        this.moveSpeed = 5;
        this.jumpForce = 8;
        this.gravity = -25;
        this.cameraDistance = 8;
        this.cameraAngleY = 0.5;
        this.cameraSmoothing = 12;

        // Generate maze
        this.grid = generateMaze(this.mazeW, this.mazeH, this.rng);

        // Cell size in 3D world units
        this.cellSize3D = 4;
        const wallH = 3.5;
        const wallThick = 0.3;

        // Dark sky for maze atmosphere
        this.createSky(cfg.theme.skyTop, cfg.theme.skyBottom, cfg.theme.fogColor,
            this.visibility === 'fog' ? 8 : 30,
            this.visibility === 'fog' ? 25 : 100);

        // Floor
        const floorSize = Math.max(this.mazeW, this.mazeH) * this.cellSize3D + 10;
        this.createGroundPlane(cfg.theme.floorColor3d, floorSize);

        // Build walls
        const wallMat = new THREE.MeshStandardMaterial({ color: cfg.theme.wallColor3d, roughness: 0.8, metalness: 0.1 });
        const wallGeoH = new THREE.BoxGeometry(this.cellSize3D, wallH, wallThick); // horizontal wall (along X)
        const wallGeoV = new THREE.BoxGeometry(wallThick, wallH, this.cellSize3D); // vertical wall (along Z)

        this.wallColliders = [];

        for (let y = 0; y < this.mazeH; y++) {
            for (let x = 0; x < this.mazeW; x++) {
                const cell = this.grid[y][x];
                const cx = x * this.cellSize3D;
                const cz = y * this.cellSize3D;

                // North wall (top)
                if (!(cell & NN)) {
                    const mesh = new THREE.Mesh(wallGeoH, wallMat);
                    mesh.position.set(cx, wallH / 2, cz - this.cellSize3D / 2);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.scene.add(mesh);
                    this.wallColliders.push({
                        x: cx - this.cellSize3D / 2, y: 0, z: cz - this.cellSize3D / 2 - wallThick / 2,
                        w: this.cellSize3D, h: wallH, d: wallThick
                    });
                }

                // West wall (left)
                if (!(cell & WW)) {
                    const mesh = new THREE.Mesh(wallGeoV, wallMat);
                    mesh.position.set(cx - this.cellSize3D / 2, wallH / 2, cz);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.scene.add(mesh);
                    this.wallColliders.push({
                        x: cx - this.cellSize3D / 2 - wallThick / 2, y: 0, z: cz - this.cellSize3D / 2,
                        w: wallThick, h: wallH, d: this.cellSize3D
                    });
                }

                // South wall (bottom edge, only for bottom row)
                if (y === this.mazeH - 1 && !(cell & SS)) {
                    const mesh = new THREE.Mesh(wallGeoH, wallMat);
                    mesh.position.set(cx, wallH / 2, cz + this.cellSize3D / 2);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.scene.add(mesh);
                    this.wallColliders.push({
                        x: cx - this.cellSize3D / 2, y: 0, z: cz + this.cellSize3D / 2 - wallThick / 2,
                        w: this.cellSize3D, h: wallH, d: wallThick
                    });
                }

                // East wall (right edge, only for right column)
                if (x === this.mazeW - 1 && !(cell & EE)) {
                    const mesh = new THREE.Mesh(wallGeoV, wallMat);
                    mesh.position.set(cx + this.cellSize3D / 2, wallH / 2, cz);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.scene.add(mesh);
                    this.wallColliders.push({
                        x: cx + this.cellSize3D / 2 - wallThick / 2, y: 0, z: cz - this.cellSize3D / 2,
                        w: wallThick, h: wallH, d: this.cellSize3D
                    });
                }
            }
        }

        // Torch light at player position (for fog mode)
        if (this.visibility === 'fog') {
            this.torchLight = new THREE.PointLight(0xff9933, 2, 15);
            this.torchLight.position.set(0, 2, 0);
            this.scene.add(this.torchLight);

            // Reduce ambient for darker feel
            this.scene.children.forEach(c => {
                if (c.isHemisphereLight) c.intensity = 0.2;
                if (c.isAmbientLight) c.intensity = 0.1;
            });
            if (this.sunLight) this.sunLight.intensity = 0.3;
        }

        // Exit marker
        const exitX = (this.mazeW - 1) * this.cellSize3D;
        const exitZ = (this.mazeH - 1) * this.cellSize3D;
        const exitMat = new THREE.MeshStandardMaterial({
            color: cfg.theme.exitColor,
            emissive: cfg.theme.exitColor,
            emissiveIntensity: 0.5,
            roughness: 0.3,
        });
        this.exitMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), exitMat);
        this.exitMesh.position.set(exitX, 0.05, exitZ);
        this.scene.add(this.exitMesh);

        // Exit glow
        const exitLight = new THREE.PointLight(cfg.theme.exitColor, 1, 8);
        exitLight.position.set(exitX, 2, exitZ);
        this.scene.add(exitLight);

        this.exitPos = new THREE.Vector3(exitX, 0, exitZ);

        // Player starts at cell (0,0)
        this.playerPosition.set(0, 0, 0);

        // HUD
        this.createHUD();
    }

    update(dt) {
        this.elapsed += dt;

        // Timer
        if (this.timeLimit > 0 && !this.won) {
            this.timeLeft = this.timeLimit - this.elapsed;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.score = 0;
                this.endGame();
                return;
            }
        }

        // Wall collisions
        for (const wall of this.wallColliders) {
            if (this.checkBoxCollision(wall)) {
                this.resolveBoxCollision(wall);
            }
        }

        // Torch light follows player
        if (this.torchLight) {
            this.torchLight.position.set(
                this.playerPosition.x,
                2,
                this.playerPosition.z
            );
        }

        // Exit pulse
        if (this.exitMesh) {
            this.exitMesh.position.y = 0.05 + Math.sin(this.elapsed * 3) * 0.2;
            this.exitMesh.rotation.y = this.elapsed * 2;
        }

        // Check win
        const dx = this.playerPosition.x - this.exitPos.x;
        const dz = this.playerPosition.z - this.exitPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 1.5 && !this.won) {
            this.won = true;
            this.score = Math.max(1, Math.floor(this.timeLimit > 0 ? this.timeLeft : 1000 - this.elapsed));
            this.endGame();
        }

        // HUD
        if (this.hudInfoEl) {
            if (this.timeLimit > 0) {
                this.hudInfoEl.textContent = `Zeit: ${Math.ceil(this.timeLeft)}s`;
                this.hudInfoEl.style.color = this.timeLeft < 10 ? '#ff6b6b' : '';
            } else {
                this.hudInfoEl.textContent = `Zeit: ${Math.floor(this.elapsed)}s`;
            }
        }
        if (this.hudScoreEl) {
            this.hudScoreEl.textContent = `${this.mazeW}x${this.mazeH} Maze`;
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const sizes = [10, 15, 20];
    const visibilities = ['full', 'fog'];
    const timeLimits = [30, 60, 120];
    let seed = 1;

    for (const size of sizes) {
        for (const visibility of visibilities) {
            for (const timeLimit of timeLimits) {
                for (const theme of themes) {
                    const name = generateGameName('Maze', seed);
                    const is3D = seed % 2 === 0;
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Maze',
                        is3D,
                        config: { size, visibility, timeLimit, theme, seed, name: name + (is3D ? ' 3D' : '') },
                        thumbnail: generateThumbnail('Maze', { theme }, seed),
                    });
                    seed++;
                }
            }
        }
    }

    // Extra untimed variations
    for (const size of sizes) {
        for (const visibility of visibilities) {
            for (const theme of themes) {
                const name = generateGameName('Maze', seed);
                const is3D = seed % 2 === 0;
                variations.push({
                    name: name + (is3D ? ' 3D' : ''),
                    category: 'Maze',
                    is3D,
                    config: { size, visibility, timeLimit: 0, theme, seed, name: name + (is3D ? ' 3D' : '') },
                    thumbnail: generateThumbnail('Maze', { theme }, seed),
                });
                seed++;
            }
        }
    }
    return variations; // 144 + 48 = 192
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate3D('Maze', MazeGame, MazeGame3D, generateVariations);
