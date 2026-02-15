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
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', path: '#1a1a4e', tower: '#00ff87', enemy: '#ff006e' },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e', path: '#2a2a4e', tower: '#4cc9f0', enemy: '#f72585' },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e', path: '#0a0a7e', tower: '#90e0ef', enemy: '#ff6b6b' },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', path: '#2a1a10', tower: '#ffd700', enemy: '#ff0000' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', path: '#3b0022', tower: '#ffb6c1', enemy: '#00ff7f' },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', path: '#001a00', tower: '#33ff33', enemy: '#ff3333' },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', path: '#20003b', tower: '#00f5d4', enemy: '#fee440' },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', path: '#2a1520', tower: '#ffcc5c', enemy: '#6c5ce7' },
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

                variations.push({
                    name: generateGameName('Tower Defense', seed),
                    category: 'Tower Defense',
                    config: {
                        pathLayout,
                        waveCount,
                        towerTypes,
                        enemySpeed,
                        theme,
                        seed
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
                    variations.push({
                        name: generateGameName('Tower Defense', seed),
                        category: 'Tower Defense',
                        config: {
                            pathLayout,
                            waveCount,
                            towerTypes,
                            enemySpeed,
                            theme,
                            seed
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
GameRegistry.registerTemplate('TowerDefense', TowerDefenseGame, generateVariations);
