// js/games/templates/custom.js — Plays user-created games from the builder
import * as THREE from 'three';
import { BaseGame3D, buildCharacterModel } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateThumbnail } from '../thumbnail.js';

// ── Storage ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'goblox_created_games';

function loadAllCreated() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

// ══════════════════════════════════════════════════════════════════════════
// CustomGame3D — plays a user-created game
// ══════════════════════════════════════════════════════════════════════════

export class CustomGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.settings = cfg.settings || {};
        this.objects = cfg.objects || [];
        this.collectibles = [];
        this.enemies = [];
        this.killZones = [];
        this.bouncePads = [];
        this.speedBoosts = [];
        this.teleporters = [];
        this.npcs = [];
        this.checkpoints = [];
        this.playerHp = 100;
        this.maxHp = 100;
        this.collectedCount = 0;
        this.totalCollectibles = 0;
        this.totalEnemies = 0;
        this.enemiesKilled = 0;
        this.timeSurvived = 0;
        this.speedBoostTimer = 0;
        this.baseMoveSpeed = this.moveSpeed;
        this.lastCheckpointPos = null;
        this.npcDialogEl = null;
        this.activeBoosts = [];
        this.projectiles = [];

        // Apply gravity
        if (this.settings.gravity) {
            this.gravity = -25 * this.settings.gravity;
        }

        // Sky
        const skyColor = this.settings.skyColor || '#87ceeb';
        this.createSky(
            new THREE.Color(skyColor).getHex(),
            0xe0f7fa, 0xccddee, 60, 250
        );

        // Ground
        this.createGroundPlane(0x3a5a3a, 200);

        // Build the scene from objects
        this.buildScene();

        // HUD
        this.createHUD();
        this.createHealthBar(this.maxHp);

        // Time limit
        this.timeLimit = this.settings.timeLimit || 0;

        // Dialog element
        this.npcDialogEl = document.createElement('div');
        this.npcDialogEl.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;border-radius:10px;font-size:0.9rem;display:none;z-index:20;max-width:400px;text-align:center;pointer-events:none;';
        this.container.appendChild(this.npcDialogEl);
    }

    buildScene() {
        let spawnPos = null;

        this.objects.forEach(data => {
            const mesh = this.createObjectMesh(data);
            if (!mesh) return;

            mesh.position.set(data.position.x, data.position.y, data.position.z);
            if (data.rotation) {
                mesh.rotation.set(
                    (data.rotation.x || 0) * Math.PI / 180,
                    (data.rotation.y || 0) * Math.PI / 180,
                    (data.rotation.z || 0) * Math.PI / 180
                );
            }
            if (data.scale) {
                mesh.scale.set(data.scale.x || 1, data.scale.y || 1, data.scale.z || 1);
            }
            if (data.color) {
                this.applyColor(mesh, data.color);
            }

            this.scene.add(mesh);

            const beh = data.behavior || {};
            const type = data.type;

            // Classify objects
            if (type === 'spawn_point') {
                spawnPos = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
            } else if (['block','ramp','cylinder','sphere','platform','wall','floor_tile','fence'].includes(type)) {
                // Static collision: compute AABB
                const box3 = new THREE.Box3().setFromObject(mesh);
                const min = box3.min;
                const max = box3.max;
                this._staticBoxes = this._staticBoxes || [];
                this._staticBoxes.push({
                    x: min.x, y: min.y, z: min.z,
                    w: max.x - min.x, h: max.y - min.y, d: max.z - min.z,
                    mesh
                });
            } else if (['coin','gem','star','key_item','health_pack'].includes(type)) {
                this.collectibles.push({ mesh, type, data, collected: false });
                this.totalCollectibles++;
            } else if (type === 'goal') {
                this._goalMesh = mesh;
            } else if (type === 'kill_zone' || type === 'lava') {
                const box3 = new THREE.Box3().setFromObject(mesh);
                this.killZones.push({ box: { x: box3.min.x, y: box3.min.y, z: box3.min.z, w: box3.max.x-box3.min.x, h: box3.max.y-box3.min.y, d: box3.max.z-box3.min.z }, damage: beh.damage || 100 });
            } else if (type === 'water') {
                const box3 = new THREE.Box3().setFromObject(mesh);
                this.killZones.push({ box: { x: box3.min.x, y: box3.min.y, z: box3.min.z, w: box3.max.x-box3.min.x, h: box3.max.y-box3.min.y, d: box3.max.z-box3.min.z }, damage: 100, isWater: true });
            } else if (type === 'bounce_pad') {
                const box3 = new THREE.Box3().setFromObject(mesh);
                this.bouncePads.push({ box: { x: box3.min.x, y: box3.min.y, z: box3.min.z, w: box3.max.x-box3.min.x, h: box3.max.y-box3.min.y+0.5, d: box3.max.z-box3.min.z }, force: beh.bounceForce || 20 });
            } else if (type === 'speed_boost') {
                const box3 = new THREE.Box3().setFromObject(mesh);
                this.speedBoosts.push({ box: { x: box3.min.x, y: box3.min.y, z: box3.min.z, w: box3.max.x-box3.min.x, h: box3.max.y-box3.min.y+0.5, d: box3.max.z-box3.min.z }, multiplier: beh.speedMultiplier || 2 });
            } else if (type === 'teleporter') {
                this.teleporters.push({ mesh, linkedId: beh.linkedId || '', position: new THREE.Vector3(data.position.x, data.position.y, data.position.z) });
            } else if (type === 'checkpoint') {
                this.checkpoints.push({ mesh, number: beh.checkpointNumber || 1, position: new THREE.Vector3(data.position.x, data.position.y, data.position.z) });
            } else if (type === 'patrol_enemy') {
                const enemy = {
                    mesh, type: 'patrol',
                    startX: data.position.x,
                    patrolDist: beh.patrolDistance || 5,
                    speed: beh.speed || 3,
                    direction: 1,
                    hp: 2,
                };
                this.enemies.push(enemy);
                this.totalEnemies++;
            } else if (type === 'chase_enemy') {
                const enemy = {
                    mesh, type: 'chase',
                    speed: beh.speed || 4,
                    hp: 3,
                };
                this.enemies.push(enemy);
                this.totalEnemies++;
            } else if (type === 'turret') {
                const enemy = {
                    mesh, type: 'turret',
                    fireRate: beh.fireRate || 1,
                    range: beh.range || 15,
                    fireCooldown: 0,
                    hp: 5,
                };
                this.enemies.push(enemy);
                this.totalEnemies++;
            } else if (type === 'npc') {
                this.npcs.push({ mesh, dialog: beh.dialog || 'Hallo!', position: new THREE.Vector3(data.position.x, data.position.y, data.position.z) });
            }
        });

        // Set spawn position
        if (spawnPos) {
            this.playerPosition.copy(spawnPos);
            this.playerPosition.y += 0.5;
            this.lastCheckpointPos = spawnPos.clone();
        }
    }

    createObjectMesh(data) {
        const type = data.type;
        // Basic mesh creation based on type
        switch (type) {
            case 'block':
            case 'platform':
            case 'wall':
            case 'floor_tile':
            case 'fence':
                return this._box(data.color || '#888888');
            case 'ramp': {
                const shape = new THREE.Shape();
                shape.moveTo(0,0); shape.lineTo(1,0); shape.lineTo(1,1); shape.closePath();
                const geo = new THREE.ExtrudeGeometry(shape, { depth:1, bevelEnabled:false });
                geo.center();
                const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: data.color || '#999999', roughness: 0.7 }));
                m.castShadow = true; m.receiveShadow = true; return m;
            }
            case 'cylinder':
                return new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1,16), new THREE.MeshStandardMaterial({ color: data.color || '#aa8866', roughness: 0.7 }));
            case 'sphere':
                return new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12), new THREE.MeshStandardMaterial({ color: data.color || '#7799aa', roughness: 0.6 }));
            case 'spawn_point': {
                const g = new THREE.Group();
                const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,0.15,16), new THREE.MeshStandardMaterial({ color: '#33cc33', emissive: '#116611' }));
                g.add(base);
                const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2,0.6,8), new THREE.MeshStandardMaterial({ color: '#33ff33', emissive: '#00aa00' }));
                arrow.position.y = 0.5; g.add(arrow);
                return g;
            }
            case 'checkpoint': {
                const g = new THREE.Group();
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.5,6), new THREE.MeshStandardMaterial({ color: '#cccccc' }));
                pole.position.y = 0.75; g.add(pole);
                const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.05), new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#553300' }));
                flag.position.set(0.25,1.3,0); g.add(flag);
                return g;
            }
            case 'goal':
                return new THREE.Mesh(new THREE.OctahedronGeometry(0.5,0), new THREE.MeshStandardMaterial({ color: '#ffcc00', emissive: '#664400', metalness: 0.6, roughness: 0.3 }));
            case 'kill_zone':
                return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: data.color || '#ff2222', transparent: true, opacity: 0.45 }));
            case 'bounce_pad': {
                const g = new THREE.Group();
                const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.7,0.2,16), new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#553300' }));
                g.add(base);
                const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.3,8), new THREE.MeshStandardMaterial({ color: '#cccccc', metalness: 0.7 }));
                spring.position.y = 0.25; g.add(spring);
                return g;
            }
            case 'speed_boost':
                return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#00ccff', emissive: '#004466', transparent: true, opacity: 0.6 }));
            case 'teleporter':
                return new THREE.Mesh(new THREE.TorusGeometry(0.5,0.12,8,24), new THREE.MeshStandardMaterial({ color: '#aa44ff', emissive: '#440066' }));
            case 'coin':
                return new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.06,16), new THREE.MeshStandardMaterial({ color: '#ffdd44', metalness: 0.7, roughness: 0.3 }));
            case 'gem':
                return new THREE.Mesh(new THREE.OctahedronGeometry(0.3,0), new THREE.MeshStandardMaterial({ color: '#4488ff', metalness: 0.5, roughness: 0.2 }));
            case 'star':
                return new THREE.Mesh(new THREE.OctahedronGeometry(0.35,0), new THREE.MeshStandardMaterial({ color: '#ffaa00', emissive: '#553300', metalness: 0.6, roughness: 0.3 }));
            case 'key_item': {
                const g = new THREE.Group();
                const head = new THREE.Mesh(new THREE.TorusGeometry(0.15,0.04,6,12), new THREE.MeshStandardMaterial({ color: '#ffcc00', metalness: 0.8 }));
                g.add(head);
                const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.4,0.04), new THREE.MeshStandardMaterial({ color: '#ffcc00', metalness: 0.8 }));
                shaft.position.y = -0.3; g.add(shaft);
                return g;
            }
            case 'health_pack':
                return new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4), new THREE.MeshStandardMaterial({ color: '#ff4444' }));
            case 'patrol_enemy': {
                const g = new THREE.Group();
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.8,0.6), new THREE.MeshStandardMaterial({ color: data.color || '#cc2222' }));
                body.position.y = 0.4; body.castShadow = true; g.add(body);
                const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.06), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
                eyeL.position.set(-0.15,0.6,0.31); g.add(eyeL);
                const eyeR = eyeL.clone(); eyeR.position.x = 0.15; g.add(eyeR);
                return g;
            }
            case 'chase_enemy': {
                const g = new THREE.Group();
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.9,0.7), new THREE.MeshStandardMaterial({ color: data.color || '#880088' }));
                body.position.y = 0.45; body.castShadow = true; g.add(body);
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,6), new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#660000' }));
                eye.position.set(0,0.65,0.36); g.add(eye);
                return g;
            }
            case 'turret': {
                const g = new THREE.Group();
                const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,0.3,8), new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.6 }));
                base.position.y = 0.15; g.add(base);
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.6,6), new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.8 }));
                barrel.rotation.z = Math.PI/2; barrel.position.set(0.3,0.35,0); g.add(barrel);
                return g;
            }
            case 'npc': {
                const g = new THREE.Group();
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.35), new THREE.MeshStandardMaterial({ color: data.color || '#4488cc' }));
                body.position.y = 0.35; body.castShadow = true; g.add(body);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4), new THREE.MeshStandardMaterial({ color: '#ffbb77' }));
                head.position.y = 0.9; head.castShadow = true; g.add(head);
                return g;
            }
            case 'tree': {
                const g = new THREE.Group();
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,1,6), new THREE.MeshStandardMaterial({ color: '#885533' }));
                trunk.position.y = 0.5; trunk.castShadow = true; g.add(trunk);
                const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.6,1,8), new THREE.MeshStandardMaterial({ color: data.color || '#228833' }));
                canopy.position.y = 1.4; canopy.castShadow = true; g.add(canopy);
                return g;
            }
            case 'rock':
                return new THREE.Mesh(new THREE.DodecahedronGeometry(0.5,0), new THREE.MeshStandardMaterial({ color: data.color || '#888877', roughness: 0.9 }));
            case 'light_source': {
                const m = new THREE.Mesh(new THREE.SphereGeometry(0.2,8,6), new THREE.MeshStandardMaterial({ color: '#ffffaa', emissive: '#ffffaa', emissiveIntensity: 1 }));
                // Add actual point light
                const light = new THREE.PointLight(0xffffaa, 1.5, 15);
                light.position.copy(m.position);
                m.add(light);
                return m;
            }
            case 'water':
                return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#2266cc', transparent: true, opacity: 0.55 }));
            case 'lava':
                return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#ff4400', emissive: '#881100', transparent: true, opacity: 0.7 }));
            default:
                return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#888888' }));
        }
    }

    _box(color) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
        m.castShadow = true; m.receiveShadow = true; return m;
    }

    applyColor(mesh, color) {
        const c = new THREE.Color(color);
        mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                child.material.color.set(c);
            }
        });
    }

    // ── Ground / Collision ──
    getGroundY(x, z) {
        // Check static boxes for standing on top
        let maxY = 0;
        if (this._staticBoxes) {
            for (const box of this._staticBoxes) {
                const px = this.playerPosition.x;
                const pz = this.playerPosition.z;
                const pr = this.playerRadius;
                if (px + pr > box.x && px - pr < box.x + box.w &&
                    pz + pr > box.z && pz - pr < box.z + box.d) {
                    const topY = box.y + box.h;
                    if (this.playerPosition.y >= topY - 0.1 && topY > maxY) {
                        maxY = topY;
                    }
                }
            }
        }
        return maxY;
    }

    // ── Update loop ──
    update(dt) {
        this.timeSurvived += dt;

        // Update HUD
        this.score = this.collectedCount * 10 + Math.floor(this.timeSurvived);
        this.updateHUDScore(this.score);
        this.updateHealthBar(this.playerHp);

        // Time limit
        if (this.timeLimit > 0) {
            const remaining = Math.max(0, this.timeLimit - this.timeSurvived);
            if (this.hudInfoEl) {
                this.hudInfoEl.textContent = `Zeit: ${Math.ceil(remaining)}s`;
            }
            if (remaining <= 0) {
                if (this.settings.winCondition === 'survive') {
                    this.score += 500;
                }
                this.endGame();
                return;
            }
        }

        // Speed boost timer
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
            if (this.speedBoostTimer <= 0) {
                this.moveSpeed = this.baseMoveSpeed;
            }
        }

        // Static box collisions
        if (this._staticBoxes) {
            for (const box of this._staticBoxes) {
                if (this.checkBoxCollision(box)) {
                    this.resolveBoxCollision(box);
                }
            }
        }

        // Collectibles
        this.updateCollectibles(dt);

        // Kill zones
        this.updateKillZones(dt);

        // Bounce pads
        this.updateBouncePads();

        // Speed boosts
        this.updateSpeedBoosts();

        // Teleporters
        this.updateTeleporters();

        // Enemies
        this.updateEnemies(dt);

        // NPCs
        this.updateNPCs();

        // Goal
        this.updateGoal();

        // Projectiles
        this.updateProjectiles(dt);

        // Animate collectibles
        this.animateCollectibles(dt);

        // Fall death
        if (this.playerPosition.y < -20) {
            this.respawnPlayer();
        }

        // Win conditions
        this.checkWinCondition();
    }

    updateCollectibles(dt) {
        const pr = this.playerRadius + 0.5;
        for (const c of this.collectibles) {
            if (c.collected) continue;
            const dx = this.playerPosition.x - c.mesh.position.x;
            const dy = (this.playerPosition.y + 1) - c.mesh.position.y;
            const dz = this.playerPosition.z - c.mesh.position.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < pr) {
                c.collected = true;
                c.mesh.visible = false;
                this.collectedCount++;

                const beh = c.data.behavior || {};
                if (c.type === 'health_pack') {
                    this.playerHp = Math.min(this.maxHp, this.playerHp + (beh.healAmount || 25));
                } else {
                    this.score += (beh.points || 1) * 10;
                }
            }
        }
    }

    updateKillZones(dt) {
        for (const kz of this.killZones) {
            if (this.checkBoxCollision(kz.box)) {
                this.playerHp -= kz.damage * dt;
                if (this.playerHp <= 0) {
                    this.playerHp = 0;
                    this.endGame();
                    return;
                }
            }
        }
    }

    updateBouncePads() {
        for (const bp of this.bouncePads) {
            if (this.checkBoxCollision(bp.box)) {
                this.playerVelocity.y = bp.force;
                this.playerOnGround = false;
            }
        }
    }

    updateSpeedBoosts() {
        for (const sb of this.speedBoosts) {
            if (this.checkBoxCollision(sb.box)) {
                this.moveSpeed = this.baseMoveSpeed * sb.multiplier;
                this.speedBoostTimer = 2;
            }
        }
    }

    updateTeleporters() {
        const pr = this.playerRadius + 0.8;
        for (const tp of this.teleporters) {
            const dx = this.playerPosition.x - tp.position.x;
            const dy = (this.playerPosition.y + 1) - tp.position.y;
            const dz = this.playerPosition.z - tp.position.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < pr && tp.linkedId) {
                // Find target teleporter
                const target = this.teleporters.find(t => {
                    // Match by linked ID — we match the linkedId of this teleporter
                    // to teleporters whose own id-like position matches
                    return t !== tp && t.linkedId === tp.linkedId;
                });
                if (target) {
                    this.playerPosition.copy(target.position);
                    this.playerPosition.y += 1;
                    break;
                }
            }
        }
    }

    updateEnemies(dt) {
        const playerPos = this.playerPosition;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.hp <= 0) {
                this.scene.remove(e.mesh);
                this.enemies.splice(i, 1);
                this.enemiesKilled++;
                this.score += 50;
                continue;
            }

            if (e.type === 'patrol') {
                // Move back and forth
                e.mesh.position.x += e.speed * e.direction * dt;
                if (Math.abs(e.mesh.position.x - e.startX) > e.patrolDist) {
                    e.direction *= -1;
                }
            } else if (e.type === 'chase') {
                // Chase player
                const dx = playerPos.x - e.mesh.position.x;
                const dz = playerPos.z - e.mesh.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist > 0.5 && dist < 25) {
                    e.mesh.position.x += (dx/dist) * e.speed * dt;
                    e.mesh.position.z += (dz/dist) * e.speed * dt;
                    // Face player
                    e.mesh.rotation.y = Math.atan2(dx, dz);
                }
            } else if (e.type === 'turret') {
                // Fire at player if in range
                const dx = playerPos.x - e.mesh.position.x;
                const dz = playerPos.z - e.mesh.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist < e.range) {
                    // Rotate to face player
                    e.mesh.rotation.y = Math.atan2(dx, dz);
                    e.fireCooldown -= dt;
                    if (e.fireCooldown <= 0) {
                        e.fireCooldown = 1 / e.fireRate;
                        this.fireProjectile(e.mesh.position, playerPos);
                    }
                }
            }

            // Check if player contacts enemy (damage)
            const edx = playerPos.x - e.mesh.position.x;
            const edy = (playerPos.y + 1) - e.mesh.position.y;
            const edz = playerPos.z - e.mesh.position.z;
            const eDist = Math.sqrt(edx*edx + edy*edy + edz*edz);
            if (eDist < 1.2) {
                // Player jumps on top = kill
                if (this.playerVelocity.y < -2 && playerPos.y > e.mesh.position.y + 0.5) {
                    e.hp--;
                    this.playerVelocity.y = 10;
                } else {
                    // Take damage
                    this.playerHp -= 20 * dt;
                    if (this.playerHp <= 0) {
                        this.playerHp = 0;
                        this.endGame();
                        return;
                    }
                }
            }
        }
    }

    fireProjectile(from, target) {
        const dir = new THREE.Vector3(target.x - from.x, (target.y + 1) - from.y, target.z - from.z).normalize();
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 6, 4),
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 })
        );
        mesh.position.copy(from);
        mesh.position.y += 0.35;
        this.scene.add(mesh);
        this.projectiles.push({ mesh, dir, speed: 15, life: 3 });
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.mesh.position.addScaledVector(p.dir, p.speed * dt);
            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }
            // Check hit player
            const dx = this.playerPosition.x - p.mesh.position.x;
            const dy = (this.playerPosition.y + 1) - p.mesh.position.y;
            const dz = this.playerPosition.z - p.mesh.position.z;
            if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.5) {
                this.playerHp -= 15;
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                if (this.playerHp <= 0) {
                    this.playerHp = 0;
                    this.endGame();
                }
            }
        }
    }

    updateNPCs() {
        let showDialog = false;
        let dialogText = '';
        for (const npc of this.npcs) {
            const dx = this.playerPosition.x - npc.position.x;
            const dz = this.playerPosition.z - npc.position.z;
            if (Math.sqrt(dx*dx + dz*dz) < 3) {
                showDialog = true;
                dialogText = npc.dialog;
                break;
            }
        }
        if (this.npcDialogEl) {
            this.npcDialogEl.style.display = showDialog ? 'block' : 'none';
            this.npcDialogEl.textContent = dialogText;
        }
    }

    updateGoal() {
        if (!this._goalMesh) return;
        this._goalMesh.rotation.y += 0.02;
        const dx = this.playerPosition.x - this._goalMesh.position.x;
        const dy = (this.playerPosition.y + 1) - this._goalMesh.position.y;
        const dz = this.playerPosition.z - this._goalMesh.position.z;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 2) {
            if (this.settings.winCondition === 'goal' || this.settings.winCondition === 'none') {
                this.score += 1000;
                this.endGame();
            }
        }
    }

    updateCheckpoints() {
        for (const cp of this.checkpoints) {
            const dx = this.playerPosition.x - cp.position.x;
            const dz = this.playerPosition.z - cp.position.z;
            if (Math.sqrt(dx*dx + dz*dz) < 2) {
                this.lastCheckpointPos = cp.position.clone();
            }
        }
    }

    animateCollectibles(dt) {
        const t = this.clock.elapsedTime;
        this.collectibles.forEach(c => {
            if (c.collected) return;
            c.mesh.rotation.y += dt * 2;
            c.mesh.position.y = c.data.position.y + Math.sin(t * 2 + c.mesh.position.x) * 0.15;
        });
    }

    respawnPlayer() {
        if (this.lastCheckpointPos) {
            this.playerPosition.copy(this.lastCheckpointPos);
            this.playerPosition.y += 1;
        } else {
            this.playerPosition.set(0, 1, 0);
        }
        this.playerVelocity.set(0, 0, 0);
        this.playerHp -= 20;
        if (this.playerHp <= 0) {
            this.playerHp = 0;
            this.endGame();
        }
    }

    checkWinCondition() {
        const wc = this.settings.winCondition;
        if (wc === 'collect' && this.totalCollectibles > 0 && this.collectedCount >= this.totalCollectibles) {
            this.score += 500;
            this.endGame();
        }
        if (wc === 'kill_all' && this.totalEnemies > 0 && this.enemiesKilled >= this.totalEnemies) {
            this.score += 500;
            this.endGame();
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Register published custom games with GameRegistry
// ══════════════════════════════════════════════════════════════════════════

function registerCustomGames() {
    const allCreated = loadAllCreated();
    const publishedGames = Object.entries(allCreated)
        .filter(([, data]) => data.published)
        .map(([gameId, data]) => data);

    if (publishedGames.length === 0) return;

    GameRegistry.registerTemplate3D('custom', null, CustomGame3D, () => {
        return publishedGames.map(data => {
            const typeNames = {
                obby: 'Obby',
                shooter: 'Shooter',
                survival: 'Survival',
                freeroam: 'Free Roam',
                race: 'Race',
            };
            return {
                name: data.name || 'Benutzerspiel',
                category: 'Community',
                is3D: true,
                badge: 'User Created',
                thumbnail: generateThumbnail({ name: data.name, category: 'Community' }, 0),
                config: {
                    name: data.name,
                    settings: data.settings,
                    objects: data.objects,
                },
                description: `Erstellt von ${data.creatorName || 'Unbekannt'} | ${typeNames[data.type] || data.type} | ${(data.objects || []).length} Objekte`,
            };
        });
    });
}

// Register on load
registerCustomGames();
