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
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', path: '#1a1a4e', tower: '#00ff87', enemy: '#ff006e', path3d: 0x1a1a4e, ground3d: 0x0a0a2e, tower3d: 0x00ff87, enemy3d: 0xff006e, skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e', path: '#2a2a4e', tower: '#4cc9f0', enemy: '#f72585', path3d: 0x2a2a4e, ground3d: 0x1a1a2e, tower3d: 0x4cc9f0, enemy3d: 0xf72585, skyTop: 0x1a1a2e, skyBottom: 0x2a2a4e, fog: 0x1a1a2e },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e', path: '#0a0a7e', tower: '#90e0ef', enemy: '#ff6b6b', path3d: 0x0a0a7e, ground3d: 0x03045e, tower3d: 0x90e0ef, enemy3d: 0xff6b6b, skyTop: 0x03045e, skyBottom: 0x0a0a5e, fog: 0x03045e },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', path: '#2a1a10', tower: '#ffd700', enemy: '#ff0000', path3d: 0x2a1a10, ground3d: 0x1a0a00, tower3d: 0xffd700, enemy3d: 0xff0000, skyTop: 0x1a0a00, skyBottom: 0x3a1a00, fog: 0x1a0a00 },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', path: '#3b0022', tower: '#ffb6c1', enemy: '#00ff7f', path3d: 0x3b0022, ground3d: 0x2b0012, tower3d: 0xffb6c1, enemy3d: 0x00ff7f, skyTop: 0xff69b4, skyBottom: 0x2b0012, fog: 0x2b0012 },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', path: '#001a00', tower: '#33ff33', enemy: '#ff3333', path3d: 0x001a00, ground3d: 0x000a00, tower3d: 0x33ff33, enemy3d: 0xff3333, skyTop: 0x000a00, skyBottom: 0x001a00, fog: 0x000a00 },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', path: '#20003b', tower: '#00f5d4', enemy: '#fee440', path3d: 0x20003b, ground3d: 0x10002b, tower3d: 0x00f5d4, enemy3d: 0xfee440, skyTop: 0x10002b, skyBottom: 0x20104b, fog: 0x10002b },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', path: '#2a1520', tower: '#ffcc5c', enemy: '#6c5ce7', path3d: 0x2a1520, ground3d: 0x1a0510, tower3d: 0xffcc5c, enemy3d: 0x6c5ce7, skyTop: 0xff6f61, skyBottom: 0x1a0510, fog: 0x3a1520 },
];

// ── Path generators ─────────────────────────────────────────────────────
function generateZigzagPath(W, H) {
    const points = [];
    const margin = 50;
    const rows = 5;
    const rowH = (H - margin * 2) / (rows - 1);

    for (let i = 0; i < rows; i++) {
        const y = margin + i * rowH;
        if (i % 2 === 0) {
            points.push({ x: -10, y });
            points.push({ x: W - margin, y });
        } else {
            points.push({ x: W - margin, y });
            points.push({ x: margin, y });
        }
    }
    // Exit
    points.push({ x: W + 10, y: margin + (rows - 1) * rowH });
    return points;
}

function generateSCurvePath(W, H) {
    const points = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = t * W;
        const y = H / 2 + Math.sin(t * Math.PI * 2.5) * (H * 0.3);
        points.push({ x, y });
    }
    return points;
}

function generateSpiralPath(W, H) {
    const points = [];
    const cx = W / 2;
    const cy = H / 2;
    const segments = 60;
    const maxR = Math.min(W, H) * 0.45;

    // Entrance from left
    points.push({ x: -10, y: cy });
    points.push({ x: cx - maxR, y: cy });

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 3;
        const r = maxR * (1 - t * 0.7);
        points.push({
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r
        });
    }
    return points;
}

const pathGenerators = [generateZigzagPath, generateSCurvePath, generateSpiralPath];

// ── Tower types ─────────────────────────────────────────────────────────
const TOWER_DEFS = {
    basic:  { name: 'Basic',  cost: 50,  range: 80,  damage: 1,  fireRate: 1.0,  color: '#ffffff', splash: false },
    fast:   { name: 'Fast',   cost: 75,  range: 60,  damage: 0.5, fireRate: 2.5, color: '#ffff00', splash: false },
    splash: { name: 'Splash', cost: 120, range: 70,  damage: 2,  fireRate: 0.5,  color: '#ff6600', splash: true },
};

// ── TowerDefenseGame ────────────────────────────────────────────────────
class TowerDefenseGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Generate path
        const pathGen = pathGenerators[cfg.pathLayout % pathGenerators.length] || pathGenerators[0];
        this.path = pathGen(W, H);

        // Smooth path into segments with even spacing
        this.pathSegments = this.computePathSegments();

        // Wave config
        this.totalWaves = cfg.waveCount || 20;
        this.currentWave = 0;
        this.waveTimer = 3; // countdown before first wave
        this.waveActive = false;
        this.waveEnemiesLeft = 0;
        this.waveSpawnTimer = 0;
        this.waveBetweenTimer = 0;

        // Enemy speed
        const speedMap = { slow: 50, medium: 80, fast: 120 };
        this.enemyBaseSpeed = speedMap[cfg.enemySpeed] || 80;

        // Tower types available
        this.availableTowers = cfg.towerTypes === 2
            ? ['basic', 'fast']
            : ['basic', 'fast', 'splash'];
        this.selectedTower = 'basic';

        // Game state
        this.currency = 200;
        this.health = 20;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.enemyIdCounter = 0;

        // Placement preview
        this.hoverX = 0;
        this.hoverY = 0;
        this.canPlace = false;

        // UI button regions (for tower selection)
        this.towerButtons = this.availableTowers.map((type, i) => ({
            type,
            x: 10 + i * 90,
            y: H - 44,
            w: 80,
            h: 36,
        }));
    }

    computePathSegments() {
        // Convert path points into evenly-spaced positions
        const segments = [];
        for (let i = 0; i < this.path.length - 1; i++) {
            const p0 = this.path[i];
            const p1 = this.path[i + 1];
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.max(1, Math.floor(dist / 5));
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                segments.push({
                    x: p0.x + dx * t,
                    y: p0.y + dy * t,
                });
            }
        }
        // Add final point
        segments.push(this.path[this.path.length - 1]);
        return segments;
    }

    isNearPath(x, y, minDist) {
        for (let i = 0; i < this.path.length - 1; i++) {
            const p0 = this.path[i];
            const p1 = this.path[i + 1];
            const dist = this.pointToSegmentDist(x, y, p0.x, p0.y, p1.x, p1.y);
            if (dist < minDist) return true;
        }
        return false;
    }

    pointToSegmentDist(px, py, ax, ay, bx, by) {
        const dx = bx - ax;
        const dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
        let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = ax + t * dx;
        const projY = ay + t * dy;
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }

    canPlaceTower(x, y) {
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Must be on screen and not too close to edges
        if (x < 20 || x > W - 20 || y < 20 || y > H - 60) return false;

        // Must be near path (adjacent) but not ON the path
        const onPath = this.isNearPath(x, y, 18);
        const nearPath = this.isNearPath(x, y, 50);
        if (onPath || !nearPath) return false;

        // Must not overlap existing tower
        for (const t of this.towers) {
            const dx = t.x - x;
            const dy = t.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) return false;
        }

        return true;
    }

    spawnWaveEnemy() {
        const wave = this.currentWave;
        const speedMult = 1 + wave * 0.08;
        const hpMult = 1 + wave * 0.3;

        // Enemy types vary by wave
        const roll = this.rng();
        let hp, speed, size, points, color;
        if (wave > 5 && roll < 0.15) {
            // Tank
            hp = 8 * hpMult;
            speed = this.enemyBaseSpeed * 0.5 * speedMult;
            size = 14;
            points = 30;
            color = '#ff4444';
        } else if (wave > 3 && roll < 0.35) {
            // Fast
            hp = 1 * hpMult;
            speed = this.enemyBaseSpeed * 1.6 * speedMult;
            size = 6;
            points = 15;
            color = '#ffff44';
        } else {
            // Normal
            hp = 2 * hpMult;
            speed = this.enemyBaseSpeed * speedMult;
            size = 10;
            points = 10;
            color = this.theme.enemy;
        }

        this.enemies.push({
            id: this.enemyIdCounter++,
            pathIndex: 0,
            x: this.pathSegments[0].x,
            y: this.pathSegments[0].y,
            hp,
            maxHp: hp,
            speed,
            size,
            points,
            color,
        });
    }

    startWave() {
        this.currentWave++;
        this.waveActive = true;
        this.waveEnemiesLeft = 5 + this.currentWave * 3;
        this.waveSpawnTimer = 0;
    }

    update(dt) {
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Wave management
        if (!this.waveActive) {
            this.waveTimer -= dt;
            if (this.waveTimer <= 0) {
                if (this.currentWave < this.totalWaves) {
                    this.startWave();
                } else if (this.enemies.length === 0) {
                    // Won all waves
                    this.score += this.health * 50;
                    this.endGame();
                    return;
                }
            }
        } else {
            // Spawn enemies in wave
            if (this.waveEnemiesLeft > 0) {
                this.waveSpawnTimer += dt;
                const spawnInterval = Math.max(0.3, 1.0 - this.currentWave * 0.03);
                if (this.waveSpawnTimer >= spawnInterval) {
                    this.waveSpawnTimer -= spawnInterval;
                    this.spawnWaveEnemy();
                    this.waveEnemiesLeft--;
                }
            } else if (this.enemies.length === 0) {
                // Wave complete
                this.waveActive = false;
                this.waveTimer = 3;
                this.currency += 25 + this.currentWave * 5;
            }
        }

        // Move enemies along path
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const moveAmount = e.speed * dt;
            let remaining = moveAmount;

            while (remaining > 0 && e.pathIndex < this.pathSegments.length - 1) {
                const target = this.pathSegments[e.pathIndex + 1];
                const dx = target.x - e.x;
                const dy = target.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= remaining) {
                    e.x = target.x;
                    e.y = target.y;
                    e.pathIndex++;
                    remaining -= dist;
                } else {
                    e.x += (dx / dist) * remaining;
                    e.y += (dy / dist) * remaining;
                    remaining = 0;
                }
            }

            // Reached the end
            if (e.pathIndex >= this.pathSegments.length - 1) {
                this.health--;
                this.enemies.splice(i, 1);
                if (this.health <= 0) {
                    this.score = this.currentWave;
                    this.endGame();
                    return;
                }
            }
        }

        // Tower shooting
        for (const tower of this.towers) {
            tower.cooldown -= dt;
            if (tower.cooldown > 0) continue;

            // Find nearest enemy in range
            let nearest = null;
            let nearestDist = Infinity;
            for (const e of this.enemies) {
                const dx = e.x - tower.x;
                const dy = e.y - tower.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= tower.range && dist < nearestDist) {
                    nearest = e;
                    nearestDist = dist;
                }
            }

            if (nearest) {
                tower.cooldown = 1 / tower.fireRate;
                tower.targetAngle = Math.atan2(nearest.y - tower.y, nearest.x - tower.x);

                this.projectiles.push({
                    x: tower.x,
                    y: tower.y,
                    targetId: nearest.id,
                    speed: 300,
                    damage: tower.damage,
                    splash: tower.splash,
                    color: tower.color,
                });
            }
        }

        // Move projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const target = this.enemies.find(e => e.id === p.targetId);

            if (!target) {
                this.projectiles.splice(i, 1);
                continue;
            }

            const dx = target.x - p.x;
            const dy = target.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 8) {
                // Hit
                target.hp -= p.damage;
                if (target.hp <= 0) {
                    this.score += target.points;
                    this.currency += Math.floor(target.points / 2);
                    // Death particles
                    for (let k = 0; k < 5; k++) {
                        this.particles.push({
                            x: target.x, y: target.y,
                            vx: (Math.random() - 0.5) * 150,
                            vy: (Math.random() - 0.5) * 150,
                            life: 0.3, maxLife: 0.3,
                            color: target.color,
                        });
                    }
                    const idx = this.enemies.indexOf(target);
                    if (idx !== -1) this.enemies.splice(idx, 1);
                }

                // Splash damage
                if (p.splash) {
                    for (const e of this.enemies) {
                        if (e === target) continue;
                        const sdx = e.x - p.x;
                        const sdy = e.y - p.y;
                        if (Math.sqrt(sdx * sdx + sdy * sdy) < 40) {
                            e.hp -= p.damage * 0.5;
                            if (e.hp <= 0) {
                                this.score += e.points;
                                this.currency += Math.floor(e.points / 2);
                                const eidx = this.enemies.indexOf(e);
                                if (eidx !== -1) this.enemies.splice(eidx, 1);
                            }
                        }
                    }
                    // Splash particle
                    this.particles.push({
                        x: p.x, y: p.y,
                        vx: 0, vy: 0,
                        life: 0.2, maxLife: 0.2,
                        color: '#ff880060',
                        size: 40, type: 'splash',
                    });
                }

                this.projectiles.splice(i, 1);
                continue;
            }

            const speed = p.speed * dt;
            p.x += (dx / dist) * speed;
            p.y += (dy / dist) * speed;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += (p.vx || 0) * dt;
            p.y += (p.vy || 0) * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update placement preview
        this.canPlace = this.canPlaceTower(this.hoverX, this.hoverY);
    }

    onClick(x, y) {
        if (this.gameOver) return;

        const H = this.canvas.height;

        // Check tower selection buttons
        for (const btn of this.towerButtons) {
            if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                this.selectedTower = btn.type;
                return;
            }
        }

        // Try to place tower
        if (y < H - 55 && this.canPlaceTower(x, y)) {
            const def = TOWER_DEFS[this.selectedTower];
            if (this.currency >= def.cost) {
                this.currency -= def.cost;
                this.towers.push({
                    x, y,
                    type: this.selectedTower,
                    range: def.range,
                    damage: def.damage,
                    fireRate: def.fireRate,
                    splash: def.splash,
                    color: def.color,
                    cooldown: 0,
                    targetAngle: 0,
                });
            }
        }
    }

    onMouseMove(x, y) {
        this.hoverX = x;
        this.hoverY = y;
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        // Draw path
        if (this.path.length > 1) {
            ctx.strokeStyle = t.path;
            ctx.lineWidth = 30;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x, this.path[i].y);
            }
            ctx.stroke();

            // Path center line
            ctx.strokeStyle = t.primary + '15';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x, this.path[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Towers
        for (const tower of this.towers) {
            // Range circle (subtle)
            ctx.strokeStyle = t.primary + '15';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
            ctx.stroke();

            // Tower base
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, 14, 0, Math.PI * 2);
            ctx.fill();

            // Tower color ring
            ctx.strokeStyle = tower.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, 14, 0, Math.PI * 2);
            ctx.stroke();

            // Barrel
            ctx.strokeStyle = tower.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(
                tower.x + Math.cos(tower.targetAngle) * 16,
                tower.y + Math.sin(tower.targetAngle) * 16
            );
            ctx.stroke();
        }

        // Placement preview
        if (!this.gameOver && this.hoverY < H - 55) {
            const def = TOWER_DEFS[this.selectedTower];
            const canAfford = this.currency >= def.cost;
            const canPlaceHere = this.canPlace && canAfford;

            ctx.globalAlpha = 0.4;
            ctx.fillStyle = canPlaceHere ? t.primary : '#ff0000';
            ctx.beginPath();
            ctx.arc(this.hoverX, this.hoverY, 14, 0, Math.PI * 2);
            ctx.fill();

            if (canPlaceHere) {
                ctx.strokeStyle = t.primary + '40';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.hoverX, this.hoverY, def.range, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Enemies
        for (const e of this.enemies) {
            // Health bar background
            ctx.fillStyle = '#333333';
            ctx.fillRect(e.x - e.size, e.y - e.size - 6, e.size * 2, 3);
            // Health bar fill
            const hpFrac = Math.max(0, e.hp / e.maxHp);
            ctx.fillStyle = hpFrac > 0.5 ? '#00ff00' : hpFrac > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(e.x - e.size, e.y - e.size - 6, e.size * 2 * hpFrac, 3);

            // Enemy body
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Projectiles
        for (const p of this.projectiles) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            if (p.type === 'splash') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, (p.size || 3) * (1 - alpha * 0.5), 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // UI bar at bottom
        ctx.fillStyle = '#111111ee';
        ctx.fillRect(0, H - 52, W, 52);
        ctx.strokeStyle = t.primary + '40';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H - 52);
        ctx.lineTo(W, H - 52);
        ctx.stroke();

        // Tower selection buttons
        for (const btn of this.towerButtons) {
            const def = TOWER_DEFS[btn.type];
            const selected = this.selectedTower === btn.type;
            const canAfford = this.currency >= def.cost;

            ctx.fillStyle = selected ? t.primary + '40' : '#222222';
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 4);
            ctx.fill();

            if (selected) {
                ctx.strokeStyle = t.primary;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 4);
                ctx.stroke();
            }

            ctx.fillStyle = canAfford ? '#ffffff' : '#666666';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(def.name, btn.x + btn.w / 2, btn.y + 4);
            ctx.font = '10px monospace';
            ctx.fillText(`$${def.cost}`, btn.x + btn.w / 2, btn.y + 18);
        }

        // HUD - top
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Wave: ${this.currentWave}/${this.totalWaves}`, 12, 12);

        ctx.fillStyle = t.secondary;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`$${this.currency}`, W / 2, 12);

        // Health
        ctx.fillStyle = this.health > 10 ? '#00ff00' : this.health > 5 ? '#ffff00' : '#ff0000';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`HP: ${this.health}`, W - 12, 12);

        // Score
        ctx.fillStyle = t.secondary + '80';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${this.score}`, 12, 34);

        // Wave countdown
        if (!this.waveActive && this.currentWave < this.totalWaves) {
            ctx.fillStyle = t.secondary + 'cc';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Next wave in ${Math.ceil(this.waveTimer)}...`, W / 2, 34);
        }

        // Instructions
        if (this.currentWave === 0 && this.towers.length === 0) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Click near the path to place towers', W / 2, H / 2);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            const won = this.health > 0;
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(won ? 'VICTORY!' : 'GAME OVER', W / 2, H / 2 - 30);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 + 15);

            ctx.font = '16px monospace';
            ctx.fillText(`Waves: ${this.currentWave}/${this.totalWaves}`, W / 2, H / 2 + 48);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 80);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 3D Tower Defense — overhead isometric view
// ══════════════════════════════════════════════════════════════════════════

// 3D path generators (on XZ plane, world units)
function generateZigzagPath3D(size) {
    const points = [];
    const margin = 2;
    const rows = 5;
    const rowD = (size - margin * 2) / (rows - 1);

    for (let i = 0; i < rows; i++) {
        const z = margin + i * rowD;
        if (i % 2 === 0) {
            points.push({ x: -1, z });
            points.push({ x: size - margin, z });
        } else {
            points.push({ x: size - margin, z });
            points.push({ x: margin, z });
        }
    }
    points.push({ x: size + 1, z: margin + (rows - 1) * rowD });
    return points;
}

function generateSCurvePath3D(size) {
    const points = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = t * size;
        const z = size / 2 + Math.sin(t * Math.PI * 2.5) * (size * 0.35);
        points.push({ x, z });
    }
    return points;
}

function generateSpiralPath3D(size) {
    const points = [];
    const cx = size / 2;
    const cz = size / 2;
    const segments = 60;
    const maxR = size * 0.42;

    points.push({ x: -1, z: cz });
    points.push({ x: cx - maxR, z: cz });

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 3;
        const r = maxR * (1 - t * 0.7);
        points.push({ x: cx + Math.cos(angle) * r, z: cz + Math.sin(angle) * r });
    }
    return points;
}

const pathGenerators3D = [generateZigzagPath3D, generateSCurvePath3D, generateSpiralPath3D];

// 3D Tower types
const TOWER_DEFS_3D = {
    basic:  { name: 'Basic',  cost: 50,  range: 5,  damage: 1,   fireRate: 1.0, color: 0xffffff, splash: false },
    fast:   { name: 'Fast',   cost: 75,  range: 4,  damage: 0.5, fireRate: 2.5, color: 0xffff00, splash: false },
    splash: { name: 'Splash', cost: 120, range: 4.5, damage: 2,  fireRate: 0.5, color: 0xff6600, splash: true },
};

class TowerDefenseGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32_3d(cfg.seed || 1);

        // Arena size in world units
        this.arenaSize = 30;

        // Disable default player model and physics
        this.playerModel.visible = false;
        this.gravity = 0;
        this.moveSpeed = 0;

        // Camera pan state
        this.camTargetX = this.arenaSize / 2;
        this.camTargetZ = this.arenaSize / 2;
        this.camZoom = 25;

        // Generate path
        const pathGen = pathGenerators3D[cfg.pathLayout % pathGenerators3D.length] || pathGenerators3D[0];
        this.path3D = pathGen(this.arenaSize);
        this.pathSegments3D = this.computePathSegments3D();

        // Wave config
        this.totalWaves = cfg.waveCount || 20;
        this.currentWave = 0;
        this.waveTimer = 3;
        this.waveActive = false;
        this.waveEnemiesLeft = 0;
        this.waveSpawnTimer = 0;

        // Enemy speed
        const speedMap = { slow: 3, medium: 5, fast: 8 };
        this.enemyBaseSpeed = speedMap[cfg.enemySpeed] || 5;

        // Tower types
        this.availableTowers = cfg.towerTypes === 2
            ? ['basic', 'fast']
            : ['basic', 'fast', 'splash'];
        this.selectedTower = 'basic';

        // Game state
        this.currency = 200;
        this.health = 20;
        this.towers3D = [];
        this.enemies3D = [];
        this.projectiles3D = [];
        this.enemyIdCounter = 0;

        // Raycaster for click placement
        this.raycaster = new THREE.Raycaster();
        this.mouseNDC = new THREE.Vector2();

        // Build world
        this.createSky(cfg.theme.skyTop || 0x0a0a2e, cfg.theme.skyBottom || 0x161650, cfg.theme.fog || 0x0a0a2e, 30, 120);
        this.buildArena();
        this.buildPath();

        // HUD
        this.createHUD();
        this.createTowerSelectionHUD();

        // Remove pointer lock — we need normal mouse
        if (this.lockMsg) this.lockMsg.style.display = 'none';
    }

    buildArena() {
        const t = this.theme;
        const groundGeo = new THREE.PlaneGeometry(this.arenaSize + 10, this.arenaSize + 10);
        const groundMat = new THREE.MeshStandardMaterial({ color: t.ground3d || 0x0a0a2e, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(this.arenaSize / 2, 0, this.arenaSize / 2);
        ground.receiveShadow = true;
        ground.name = 'ground';
        this.scene.add(ground);
        this.groundPlane = ground;
    }

    buildPath() {
        const t = this.theme;
        // Draw path as a series of raised tiles
        const tileGeo = new THREE.BoxGeometry(1.2, 0.15, 1.2);
        const tileMat = new THREE.MeshStandardMaterial({
            color: t.path3d || 0x1a1a4e,
            roughness: 0.6,
            metalness: 0.1,
            emissive: t.path3d || 0x1a1a4e,
            emissiveIntensity: 0.1,
        });

        // Use InstancedMesh for path tiles
        const tileCount = this.pathSegments3D.length;
        const pathTiles = new THREE.InstancedMesh(tileGeo, tileMat, Math.min(tileCount, 500));
        pathTiles.receiveShadow = true;

        const dummy = new THREE.Object3D();
        const stride = Math.max(1, Math.floor(tileCount / 500));
        let idx = 0;
        for (let i = 0; i < tileCount && idx < 500; i += stride) {
            const seg = this.pathSegments3D[i];
            dummy.position.set(seg.x, 0.08, seg.z);
            dummy.updateMatrix();
            pathTiles.setMatrixAt(idx++, dummy.matrix);
        }
        pathTiles.count = idx;
        pathTiles.instanceMatrix.needsUpdate = true;
        this.scene.add(pathTiles);
    }

    computePathSegments3D() {
        const segments = [];
        for (let i = 0; i < this.path3D.length - 1; i++) {
            const p0 = this.path3D[i];
            const p1 = this.path3D[i + 1];
            const dx = p1.x - p0.x;
            const dz = p1.z - p0.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const steps = Math.max(1, Math.floor(dist / 0.3));
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                segments.push({ x: p0.x + dx * t, z: p0.z + dz * t });
            }
        }
        segments.push(this.path3D[this.path3D.length - 1]);
        return segments;
    }

    isNearPath3D(x, z, minDist) {
        for (let i = 0; i < this.path3D.length - 1; i++) {
            const p0 = this.path3D[i];
            const p1 = this.path3D[i + 1];
            const dist = this.pointToSegmentDist3D(x, z, p0.x, p0.z, p1.x, p1.z);
            if (dist < minDist) return true;
        }
        return false;
    }

    pointToSegmentDist3D(px, pz, ax, az, bx, bz) {
        const dx = bx - ax;
        const dz = bz - az;
        const lenSq = dx * dx + dz * dz;
        if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);
        let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = ax + t * dx;
        const projZ = az + t * dz;
        return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2);
    }

    canPlaceTower3D(x, z) {
        if (x < 0 || x > this.arenaSize || z < 0 || z > this.arenaSize) return false;

        const onPath = this.isNearPath3D(x, z, 1.2);
        const nearPath = this.isNearPath3D(x, z, 3.5);
        if (onPath || !nearPath) return false;

        for (const tw of this.towers3D) {
            const dx = tw.x - x;
            const dz = tw.z - z;
            if (Math.sqrt(dx * dx + dz * dz) < 2) return false;
        }
        return true;
    }

    createTowerSelectionHUD() {
        this.towerHudEl = document.createElement('div');
        this.towerHudEl.className = 'game-3d-hud';
        this.towerHudEl.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto;';

        for (const type of this.availableTowers) {
            const def = TOWER_DEFS_3D[type];
            const btn = document.createElement('button');
            btn.style.cssText = 'padding:6px 14px;font:bold 12px monospace;border:2px solid #555;border-radius:6px;cursor:pointer;background:#222;color:#fff;';
            btn.textContent = `${def.name} $${def.cost}`;
            btn.dataset.type = type;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedTower = type;
                this.updateTowerButtons();
            });
            this.towerHudEl.appendChild(btn);
        }
        this.container.appendChild(this.towerHudEl);
        this.updateTowerButtons();

        // Health/wave info
        this.tdInfoEl = document.createElement('div');
        this.tdInfoEl.className = 'game-3d-hud';
        this.tdInfoEl.style.cssText = 'position:absolute;top:8px;right:12px;font:bold 14px monospace;color:#fff;text-align:right;pointer-events:none;';
        this.container.appendChild(this.tdInfoEl);

        // Currency
        this.tdCurrencyEl = document.createElement('div');
        this.tdCurrencyEl.className = 'game-3d-hud';
        this.tdCurrencyEl.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);font:bold 16px monospace;color:#ffd700;pointer-events:none;';
        this.container.appendChild(this.tdCurrencyEl);
    }

    updateTowerButtons() {
        if (!this.towerHudEl) return;
        const buttons = this.towerHudEl.querySelectorAll('button');
        buttons.forEach(btn => {
            const type = btn.dataset.type;
            const isSelected = type === this.selectedTower;
            const def = TOWER_DEFS_3D[type];
            const canAfford = this.currency >= def.cost;
            btn.style.borderColor = isSelected ? '#00ff87' : '#555';
            btn.style.background = isSelected ? '#003322' : '#222';
            btn.style.color = canAfford ? '#fff' : '#666';
        });
    }

    onClick(e) {
        if (this.gameOver) return;

        // Raycast to ground plane
        const rect = this.container.getBoundingClientRect();
        this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouseNDC, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundPlane);
        if (intersects.length === 0) return;

        const pt = intersects[0].point;
        const wx = pt.x;
        const wz = pt.z;

        if (this.canPlaceTower3D(wx, wz)) {
            const def = TOWER_DEFS_3D[this.selectedTower];
            if (this.currency >= def.cost) {
                this.currency -= def.cost;
                this.placeTower3D(wx, wz, this.selectedTower);
                this.updateTowerButtons();
            }
        }
    }

    placeTower3D(x, z, type) {
        const def = TOWER_DEFS_3D[type];

        // Tower mesh: cylinder base + barrel
        const group = new THREE.Group();
        const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.0, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.3 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.5;
        base.castShadow = true;
        group.add(base);

        // Ring
        const ringGeo = new THREE.TorusGeometry(0.55, 0.08, 8, 16);
        const ringMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.3, emissive: def.color, emissiveIntensity: 0.3 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.9;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
        const barrelMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.3 });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.set(0, 0.9, 0.4);
        barrel.rotation.x = Math.PI / 2;
        barrel.name = 'barrel';
        group.add(barrel);

        group.position.set(x, 0, z);
        this.scene.add(group);

        this.towers3D.push({
            x, z, type, group,
            range: def.range,
            damage: def.damage,
            fireRate: def.fireRate,
            splash: def.splash,
            color: def.color,
            cooldown: 0,
            targetAngle: 0,
        });
    }

    spawnWaveEnemy3D() {
        const wave = this.currentWave;
        const speedMult = 1 + wave * 0.08;
        const hpMult = 1 + wave * 0.3;

        const roll = this.rng();
        let hp, speed, size, points, color;
        if (wave > 5 && roll < 0.15) {
            hp = 8 * hpMult; speed = this.enemyBaseSpeed * 0.5 * speedMult;
            size = 0.6; points = 30; color = 0xff4444;
        } else if (wave > 3 && roll < 0.35) {
            hp = 1 * hpMult; speed = this.enemyBaseSpeed * 1.6 * speedMult;
            size = 0.25; points = 15; color = 0xffff44;
        } else {
            hp = 2 * hpMult; speed = this.enemyBaseSpeed * speedMult;
            size = 0.4; points = 10; color = this.theme.enemy3d || 0xff006e;
        }

        // Enemy mesh: sphere
        const enemyGeo = new THREE.SphereGeometry(size, 8, 8);
        const enemyMat = new THREE.MeshStandardMaterial({
            color, roughness: 0.3, metalness: 0.2,
            emissive: color, emissiveIntensity: 0.2,
        });
        const mesh = new THREE.Mesh(enemyGeo, enemyMat);
        mesh.castShadow = true;
        const start = this.pathSegments3D[0];
        mesh.position.set(start.x, size + 0.1, start.z);
        this.scene.add(mesh);

        // Health bar (small plane above enemy)
        const hpBgGeo = new THREE.PlaneGeometry(1, 0.1);
        const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
        const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
        hpBg.position.set(start.x, size * 2 + 0.5, start.z);
        hpBg.rotation.x = -Math.PI / 4;
        this.scene.add(hpBg);

        const hpFillGeo = new THREE.PlaneGeometry(1, 0.1);
        const hpFillMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        const hpFill = new THREE.Mesh(hpFillGeo, hpFillMat);
        hpFill.position.set(start.x, size * 2 + 0.52, start.z);
        hpFill.rotation.x = -Math.PI / 4;
        this.scene.add(hpFill);

        this.enemies3D.push({
            id: this.enemyIdCounter++,
            pathIndex: 0,
            x: start.x, z: start.z,
            hp, maxHp: hp, speed, size, points, color,
            mesh, hpBg, hpFill,
        });
    }

    startWave3D() {
        this.currentWave++;
        this.waveActive = true;
        this.waveEnemiesLeft = 5 + this.currentWave * 3;
        this.waveSpawnTimer = 0;
    }

    updatePlayer(dt) {
        // Override: WASD pans camera instead of player
        if (this.gameOver) return;
        const panSpeed = 15;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.camTargetZ -= panSpeed * dt;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.camTargetZ += panSpeed * dt;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.camTargetX -= panSpeed * dt;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.camTargetX += panSpeed * dt;

        // Clamp
        this.camTargetX = Math.max(-5, Math.min(this.arenaSize + 5, this.camTargetX));
        this.camTargetZ = Math.max(-5, Math.min(this.arenaSize + 5, this.camTargetZ));
    }

    updateCamera(dt) {
        // Isometric overhead view
        const targetPos = new THREE.Vector3(
            this.camTargetX + this.camZoom * 0.5,
            this.camZoom,
            this.camTargetZ + this.camZoom * 0.5
        );
        const t = 1 - Math.exp(-5 * dt);
        this.camera.position.lerp(targetPos, t);
        this.camera.lookAt(this.camTargetX, 0, this.camTargetZ);

        if (this.sunLight) {
            this.sunLight.position.set(this.camTargetX + 20, 40, this.camTargetZ + 20);
            this.sunLight.target.position.set(this.camTargetX, 0, this.camTargetZ);
        }
    }

    update(dt) {
        if (this.gameOver) return;

        // Wave management
        if (!this.waveActive) {
            this.waveTimer -= dt;
            if (this.waveTimer <= 0) {
                if (this.currentWave < this.totalWaves) {
                    this.startWave3D();
                } else if (this.enemies3D.length === 0) {
                    this.score += this.health * 50;
                    this.endGame();
                    return;
                }
            }
        } else {
            if (this.waveEnemiesLeft > 0) {
                this.waveSpawnTimer += dt;
                const spawnInterval = Math.max(0.3, 1.0 - this.currentWave * 0.03);
                if (this.waveSpawnTimer >= spawnInterval) {
                    this.waveSpawnTimer -= spawnInterval;
                    this.spawnWaveEnemy3D();
                    this.waveEnemiesLeft--;
                }
            } else if (this.enemies3D.length === 0) {
                this.waveActive = false;
                this.waveTimer = 3;
                this.currency += 25 + this.currentWave * 5;
                this.updateTowerButtons();
            }
        }

        // Move enemies along path
        for (let i = this.enemies3D.length - 1; i >= 0; i--) {
            const e = this.enemies3D[i];
            const moveAmount = e.speed * dt;
            let remaining = moveAmount;

            while (remaining > 0 && e.pathIndex < this.pathSegments3D.length - 1) {
                const target = this.pathSegments3D[e.pathIndex + 1];
                const dx = target.x - e.x;
                const dz = target.z - e.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist <= remaining) {
                    e.x = target.x;
                    e.z = target.z;
                    e.pathIndex++;
                    remaining -= dist;
                } else {
                    e.x += (dx / dist) * remaining;
                    e.z += (dz / dist) * remaining;
                    remaining = 0;
                }
            }

            // Update mesh position
            e.mesh.position.set(e.x, e.size + 0.1, e.z);
            e.hpBg.position.set(e.x, e.size * 2 + 0.5, e.z);
            e.hpFill.position.set(e.x, e.size * 2 + 0.52, e.z);

            // Update health bar
            const hpFrac = Math.max(0, e.hp / e.maxHp);
            e.hpFill.scale.x = hpFrac;
            e.hpFill.position.x = e.x - (1 - hpFrac) * 0.5;

            // Reached the end
            if (e.pathIndex >= this.pathSegments3D.length - 1) {
                this.health--;
                this.removeEnemy3D(i);
                if (this.health <= 0) {
                    this.score = this.currentWave;
                    this.endGame();
                    return;
                }
            }
        }

        // Tower shooting
        for (const tower of this.towers3D) {
            tower.cooldown -= dt;
            if (tower.cooldown > 0) continue;

            let nearest = null;
            let nearestDist = Infinity;
            for (const e of this.enemies3D) {
                const dx = e.x - tower.x;
                const dz = e.z - tower.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist <= tower.range && dist < nearestDist) {
                    nearest = e;
                    nearestDist = dist;
                }
            }

            if (nearest) {
                tower.cooldown = 1 / tower.fireRate;
                const angle = Math.atan2(nearest.x - tower.x, nearest.z - tower.z);

                // Rotate barrel
                tower.group.rotation.y = angle;

                // Spawn projectile
                const projGeo = new THREE.SphereGeometry(0.1, 6, 6);
                const projMat = new THREE.MeshBasicMaterial({ color: tower.color });
                const proj = new THREE.Mesh(projGeo, projMat);
                proj.position.set(tower.x, 0.9, tower.z);
                this.scene.add(proj);

                this.projectiles3D.push({
                    mesh: proj,
                    targetId: nearest.id,
                    speed: 20,
                    damage: tower.damage,
                    splash: tower.splash,
                    color: tower.color,
                });
            }
        }

        // Move projectiles
        for (let i = this.projectiles3D.length - 1; i >= 0; i--) {
            const p = this.projectiles3D[i];
            const target = this.enemies3D.find(e => e.id === p.targetId);

            if (!target) {
                this.scene.remove(p.mesh);
                this.projectiles3D.splice(i, 1);
                continue;
            }

            const dx = target.x - p.mesh.position.x;
            const dz = target.z - p.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 0.5) {
                // Hit
                target.hp -= p.damage;
                if (target.hp <= 0) {
                    this.score += target.points;
                    this.currency += Math.floor(target.points / 2);
                    const idx = this.enemies3D.indexOf(target);
                    if (idx !== -1) this.removeEnemy3D(idx);
                    this.updateTowerButtons();
                }

                // Splash
                if (p.splash) {
                    for (let ei = this.enemies3D.length - 1; ei >= 0; ei--) {
                        const e = this.enemies3D[ei];
                        if (e === target) continue;
                        const sdx = e.x - p.mesh.position.x;
                        const sdz = e.z - p.mesh.position.z;
                        if (Math.sqrt(sdx * sdx + sdz * sdz) < 2.5) {
                            e.hp -= p.damage * 0.5;
                            if (e.hp <= 0) {
                                this.score += e.points;
                                this.currency += Math.floor(e.points / 2);
                                this.removeEnemy3D(ei);
                                this.updateTowerButtons();
                            }
                        }
                    }
                }

                this.scene.remove(p.mesh);
                this.projectiles3D.splice(i, 1);
                continue;
            }

            const moveAmt = p.speed * dt;
            p.mesh.position.x += (dx / dist) * moveAmt;
            p.mesh.position.z += (dz / dist) * moveAmt;
        }

        // Update HUD
        this.updateHUDScore(this.score);
        if (this.tdInfoEl) {
            const hpColor = this.health > 10 ? '#00ff00' : this.health > 5 ? '#ffff00' : '#ff0000';
            const waveInfo = !this.waveActive && this.currentWave < this.totalWaves
                ? `<div style="color:#aaa;font-size:12px;">Next: ${Math.ceil(this.waveTimer)}s</div>` : '';
            this.tdInfoEl.innerHTML = `<div>Wave: ${this.currentWave}/${this.totalWaves}</div><div style="color:${hpColor}">HP: ${this.health}</div>${waveInfo}`;
        }
        if (this.tdCurrencyEl) {
            this.tdCurrencyEl.textContent = `$${this.currency}`;
        }
    }

    removeEnemy3D(index) {
        const e = this.enemies3D[index];
        this.scene.remove(e.mesh);
        this.scene.remove(e.hpBg);
        this.scene.remove(e.hpFill);
        this.enemies3D.splice(index, 1);
    }

    stop() {
        // Clean up tower defense specific HUD elements
        if (this.towerHudEl && this.towerHudEl.parentNode) this.towerHudEl.remove();
        if (this.tdInfoEl && this.tdInfoEl.parentNode) this.tdInfoEl.remove();
        if (this.tdCurrencyEl && this.tdCurrencyEl.parentNode) this.tdCurrencyEl.remove();
        super.stop();
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const pathLayouts = [0, 1, 2];
    const waveCounts = [10, 20, 30];
    const towerTypeCounts = [2, 3];
    const enemySpeeds = ['slow', 'medium', 'fast'];
    let seed = 1;

    for (const theme of themes) {
        for (const pathLayout of pathLayouts) {
            for (const waveCount of waveCounts) {
                const towerTypes = towerTypeCounts[seed % towerTypeCounts.length];
                const enemySpeed = enemySpeeds[seed % enemySpeeds.length];
                const is3D = seed % 2 === 0;
                const name = generateGameName('Tower Defense', seed);

                variations.push({
                    name: name + (is3D ? ' 3D' : ''),
                    category: 'Tower Defense',
                    is3D,
                    config: {
                        pathLayout,
                        waveCount,
                        towerTypes,
                        enemySpeed,
                        theme,
                        seed,
                        name: name + (is3D ? ' 3D' : ''),
                    },
                    thumbnail: generateThumbnail('Tower Defense', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 3 * 3 = 72 base

    // Additional combos
    for (const theme of themes) {
        for (const towerTypes of towerTypeCounts) {
            for (const enemySpeed of enemySpeeds) {
                for (const waveCount of waveCounts) {
                    const pathLayout = pathLayouts[seed % pathLayouts.length];
                    const is3D = seed % 2 === 0;
                    const name = generateGameName('Tower Defense', seed);
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Tower Defense',
                        is3D,
                        config: {
                            pathLayout,
                            waveCount,
                            towerTypes,
                            enemySpeed,
                            theme,
                            seed,
                            name: name + (is3D ? ' 3D' : ''),
                        },
                        thumbnail: generateThumbnail('Tower Defense', { theme }, seed)
                    });
                    seed++;
                }
            }
        }
    }
    // + 8 * 2 * 3 * 3 = 144 => 216 total

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate3D('TowerDefense', TowerDefenseGame, TowerDefenseGame3D, generateVariations);
