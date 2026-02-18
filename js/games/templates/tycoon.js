import { BaseGame3D, mulberry32 } from '../base-game-3d.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';
import * as THREE from 'three';

// ── Themes ──────────────────────────────────────────────────────────────
const themes = [
    { name: 'Fabrik',     primary: '#fdcb6e', secondary: '#e17055', skyTop: 0x87ceeb, skyBottom: 0xe0f7fa, fog: 0xccddee, ground: 0x6b8f4a, plotColor: 0x888888, dropperColor: 0x4a90d9, cubeColors: [0xff6b6b, 0xfeca57, 0x48dbfb, 0xff9ff3, 0x1dd1a1], buildingColor: 0x636e72 },
    { name: 'Pizzeria',   primary: '#e17055', secondary: '#fdcb6e', skyTop: 0xfdebd0, skyBottom: 0xfff8dc, fog: 0xfdebd0, ground: 0x8fbc8f, plotColor: 0xd2b48c, dropperColor: 0xcc4444, cubeColors: [0xff6347, 0xffd700, 0xff8c00, 0xdc143c, 0x228b22], buildingColor: 0x8b4513 },
    { name: 'Bergwerk',   primary: '#636e72', secondary: '#b2bec3', skyTop: 0x5d6d7e, skyBottom: 0x85929e, fog: 0x5d6d7e, ground: 0x6b6b4a, plotColor: 0x555555, dropperColor: 0x8b7355, cubeColors: [0xc0c0c0, 0xffd700, 0xb87333, 0x71797e, 0x00ced1], buildingColor: 0x4a4a4a },
    { name: 'Superheld',  primary: '#6c5ce7', secondary: '#a29bfe', skyTop: 0x2c3e50, skyBottom: 0x6c5ce7, fog: 0x2c3e50, ground: 0x2c3e50, plotColor: 0x444466, dropperColor: 0xe74c3c, cubeColors: [0xff0000, 0x0000ff, 0xffd700, 0x00ff00, 0xff00ff], buildingColor: 0x34495e },
    { name: 'Weltraum',   primary: '#00cec9', secondary: '#81ecec', skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e, ground: 0x1a1a3e, plotColor: 0x222244, dropperColor: 0x00cec9, cubeColors: [0x00ffff, 0xff00ff, 0x00ff00, 0xffff00, 0xff6600], buildingColor: 0x2d2d5e },
    { name: 'Dschungel',  primary: '#00b894', secondary: '#55efc4', skyTop: 0x4a9a6f, skyBottom: 0x81ecec, fog: 0x2d6a4f, ground: 0x2d6a4f, plotColor: 0x8b7355, dropperColor: 0x228b22, cubeColors: [0x00ff00, 0x32cd32, 0xadff2f, 0x7cfc00, 0x00fa9a], buildingColor: 0x5d4037 },
];

// ── Building definitions (unlocked progressively) ───────────────────────
const BUILDINGS = [
    { name: 'Huette',      cost: 50,     w: 3, h: 2, d: 3, color: 0x8b7355 },
    { name: 'Haus',        cost: 500,    w: 4, h: 3, d: 4, color: 0xb5651d },
    { name: 'Villa',       cost: 5000,   w: 5, h: 5, d: 5, color: 0xdaa520 },
    { name: 'Wolkenkratzer', cost: 50000, w: 4, h: 12, d: 4, color: 0x708090 },
    { name: 'Schloss',     cost: 500000, w: 8, h: 8, d: 8, color: 0xffd700 },
];

// ── Dropper tier definitions ────────────────────────────────────────────
const DROPPER_TIERS = [
    { name: 'Basis',       cost: 0,     value: 1,   interval: 2.0,  colorIdx: 0 },
    { name: 'Verbessert',  cost: 100,   value: 3,   interval: 1.5,  colorIdx: 1 },
    { name: 'Schnell',     cost: 1000,  value: 8,   interval: 1.0,  colorIdx: 2 },
    { name: 'Super',       cost: 10000, value: 25,  interval: 0.7,  colorIdx: 3 },
    { name: 'Ultra',       cost: 100000, value: 80, interval: 0.5,  colorIdx: 4 },
];

// ── Upgrade definitions ─────────────────────────────────────────────────
const UPGRADE_TYPES = {
    conveyorSpeed: { baseCost: 50,   costMulti: 2.5, maxLevel: 10, label: 'Foerderband' },
    collectorMulti: { baseCost: 200,  costMulti: 3.0, maxLevel: 10, label: 'Sammler' },
    dropperSpeed:  { baseCost: 150,  costMulti: 2.8, maxLevel: 10, label: 'Dropper' },
};

// ══════════════════════════════════════════════════════════════════════════
// TycoonGame — Build, Earn, Upgrade
// ══════════════════════════════════════════════════════════════════════════
class TycoonGame extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 99);
        this.tycoonName = cfg.theme.name;

        // Camera/physics for tycoon (more zoomed out, slower movement)
        this.moveSpeed = 7;
        this.jumpForce = 10;
        this.gravity = -25;
        this.cameraDistance = 18;
        this.cameraAngleY = 0.6;
        this.cameraAngleX = Math.PI * 0.75;
        this.cameraSmoothing = 8;

        // Economy state
        this.money = 0;
        this.moneyPerSecond = 0;
        this.totalEarned = 0;
        this.rebirthCount = 0;
        this.rebirthMultiplier = 1;

        // Dropper state
        this.droppers = [];
        this.currentDropperTier = 0;
        this.dropperTimer = 0;

        // Upgrade levels
        this.upgrades = {
            conveyorSpeed: 0,
            collectorMulti: 0,
            dropperSpeed: 0,
        };

        // Buildings unlocked
        this.unlockedBuildings = [];

        // Dropped cubes in the world
        this.cubes = [];
        this.cubePool = []; // reuse cubes

        // Floating money text meshes
        this.floatingTexts = [];

        // Load saved progress
        this.loadSave();

        // ── Build the world ──
        this.createSky(cfg.theme.skyTop, cfg.theme.skyBottom, cfg.theme.fog, 60, 200);
        this.createGroundPlane(cfg.theme.ground, 200);

        // Build the tycoon plot
        this.buildPlot();

        // Build existing upgrade pads
        this.buildUpgradePads();

        // Rebuild any saved buildings
        this.rebuildUnlockedBuildings();

        // Set up the first dropper if none exist
        if (this.droppers.length === 0) {
            this.addDropper(DROPPER_TIERS[0]);
        }

        // Player start
        this.playerPosition.set(0, 0, 8);

        // HUD
        this.createTycoonHUD();

        // Auto-save interval
        this._saveInterval = setInterval(() => this.saveTycoon(), 10000);
    }

    // ── Save / Load ──────────────────────────────────────────────────────

    getSaveKey() {
        return `goblox_tycoon_${this.config.seed}`;
    }

    loadSave() {
        try {
            const data = JSON.parse(localStorage.getItem(this.getSaveKey()));
            if (data) {
                this.money = data.money || 0;
                this.totalEarned = data.totalEarned || 0;
                this.rebirthCount = data.rebirthCount || 0;
                this.rebirthMultiplier = 1 + this.rebirthCount * 0.5;
                this.currentDropperTier = data.currentDropperTier || 0;
                this.upgrades = data.upgrades || this.upgrades;
                this.unlockedBuildings = data.unlockedBuildings || [];
            }
        } catch (e) { /* ignore */ }
    }

    saveTycoon() {
        try {
            localStorage.setItem(this.getSaveKey(), JSON.stringify({
                money: this.money,
                totalEarned: this.totalEarned,
                rebirthCount: this.rebirthCount,
                currentDropperTier: this.currentDropperTier,
                upgrades: this.upgrades,
                unlockedBuildings: this.unlockedBuildings.map(b => b.name),
            }));
        } catch (e) { /* ignore */ }
    }

    stop() {
        this.saveTycoon();
        if (this._saveInterval) clearInterval(this._saveInterval);
        super.stop();
    }

    // ── Plot Construction ────────────────────────────────────────────────

    buildPlot() {
        const theme = this.theme;

        // Main plot floor
        const plotGeo = new THREE.BoxGeometry(30, 0.3, 30);
        const plotMat = new THREE.MeshStandardMaterial({ color: theme.plotColor, roughness: 0.9 });
        this.plotMesh = new THREE.Mesh(plotGeo, plotMat);
        this.plotMesh.position.set(0, 0.15, 0);
        this.plotMesh.receiveShadow = true;
        this.scene.add(this.plotMesh);

        // Plot border
        const borderMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.4, metalness: 0.5 });
        const borders = [
            { pos: [0, 0.3, -15], size: [30, 0.3, 0.3] },
            { pos: [0, 0.3, 15], size: [30, 0.3, 0.3] },
            { pos: [-15, 0.3, 0], size: [0.3, 0.3, 30] },
            { pos: [15, 0.3, 0], size: [0.3, 0.3, 30] },
        ];
        for (const b of borders) {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(...b.size),
                borderMat
            );
            mesh.position.set(...b.pos);
            mesh.castShadow = true;
            this.scene.add(mesh);
        }

        // Dropper machine (at the back of the plot)
        this.buildDropperMachine();

        // Conveyor belt (visual)
        this.buildConveyor();

        // Collector (at end of conveyor)
        this.buildCollector();
    }

    buildDropperMachine() {
        const theme = this.theme;
        const dropperGroup = new THREE.Group();

        // Machine body
        const bodyMat = new THREE.MeshStandardMaterial({
            color: theme.dropperColor,
            roughness: 0.4,
            metalness: 0.3,
        });
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(3, 4, 3),
            bodyMat
        );
        body.position.set(0, 2, -10);
        body.castShadow = true;
        dropperGroup.add(body);

        // Funnel top
        const funnelMat = new THREE.MeshStandardMaterial({
            color: theme.dropperColor,
            roughness: 0.3,
            metalness: 0.4,
        });
        const funnel = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 1.2, 1.5, 8),
            funnelMat
        );
        funnel.position.set(0, 4.5, -10);
        funnel.castShadow = true;
        dropperGroup.add(funnel);

        // Chute (where cubes drop out)
        const chute = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.5, 1),
            new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 })
        );
        chute.position.set(0, 0.5, -8);
        dropperGroup.add(chute);

        this.dropperMachineGroup = dropperGroup;
        this.scene.add(dropperGroup);
    }

    buildConveyor() {
        // Belt from dropper to collector
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.4 });
        const belt = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.2, 14),
            beltMat
        );
        belt.position.set(0, 0.4, -1);
        belt.receiveShadow = true;
        this.scene.add(belt);

        // Belt sides
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5 });
        const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 14), sideMat);
        leftSide.position.set(-1.1, 0.5, -1);
        leftSide.castShadow = true;
        this.scene.add(leftSide);
        const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 14), sideMat);
        rightSide.position.set(1.1, 0.5, -1);
        rightSide.castShadow = true;
        this.scene.add(rightSide);

        // Animated stripes on belt
        this.beltStripes = [];
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0x888800, roughness: 0.3 });
        for (let i = 0; i < 7; i++) {
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(1.8, 0.05, 0.15),
                stripeMat
            );
            stripe.position.set(0, 0.52, -7.5 + i * 2);
            this.scene.add(stripe);
            this.beltStripes.push(stripe);
        }
    }

    buildCollector() {
        const collectorMat = new THREE.MeshStandardMaterial({
            color: 0x22aa44,
            emissive: 0x22aa44,
            emissiveIntensity: 0.2,
            roughness: 0.3,
            metalness: 0.4,
        });
        const collector = new THREE.Mesh(
            new THREE.BoxGeometry(3, 2, 2),
            collectorMat
        );
        collector.position.set(0, 1, 6);
        collector.castShadow = true;
        this.scene.add(collector);

        // $ sign on collector (small box arrangement)
        const signMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.5 });
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 0.1),
            signMat
        );
        sign.position.set(0, 1.5, 7.05);
        this.scene.add(sign);

        // Collector zone (cubes that reach here get converted)
        this.collectorZone = { x: -1.5, y: 0, z: 5, w: 3, h: 2, d: 2 };

        // Glow light
        this.collectorLight = new THREE.PointLight(0x22aa44, 1, 10);
        this.collectorLight.position.set(0, 2, 6);
        this.scene.add(this.collectorLight);
    }

    // ── Upgrade Pads ─────────────────────────────────────────────────────

    buildUpgradePads() {
        this.upgradePads = [];

        const padDefs = [
            // Dropper upgrades (left side)
            { type: 'newDropper', x: -10, z: -8, label: 'Neuer Dropper' },
            { type: 'dropperSpeed', x: -10, z: -4, label: 'Dropper Tempo' },
            // Conveyor upgrades (right side)
            { type: 'conveyorSpeed', x: 10, z: -4, label: 'Foerderband Tempo' },
            // Collector upgrades (near collector)
            { type: 'collectorMulti', x: 10, z: 4, label: 'Sammler Bonus' },
            // Buildings (behind)
            { type: 'building', x: -10, z: 8, label: 'Gebaeude' },
            // Rebirth (far corner)
            { type: 'rebirth', x: 10, z: 10, label: 'Wiedergeburt' },
        ];

        for (const def of padDefs) {
            this.createPad(def);
        }
    }

    createPad(def) {
        const padMat = new THREE.MeshStandardMaterial({
            color: 0x44aaff,
            emissive: 0x44aaff,
            emissiveIntensity: 0.15,
            roughness: 0.3,
            transparent: true,
            opacity: 0.85,
        });
        const padGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16);
        const mesh = new THREE.Mesh(padGeo, padMat);
        mesh.position.set(def.x, 0.4, def.z);
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Label billboard (simple box with color indicator)
        const labelMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.3,
        });
        const label = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.5, 0.1),
            labelMat
        );
        label.position.set(def.x, 2.5, def.z);
        this.scene.add(label);

        const collider = { x: def.x - 1.5, y: 0, z: def.z - 1.5, w: 3, h: 2.5, d: 3 };

        this.upgradePads.push({
            ...def,
            mesh,
            collider,
            cooldown: 0,
        });
    }

    // ── Dropper Logic ────────────────────────────────────────────────────

    addDropper(tier) {
        this.droppers.push({ ...tier });
    }

    getDropInterval() {
        const base = DROPPER_TIERS[this.currentDropperTier].interval;
        const speedLevel = this.upgrades.dropperSpeed;
        return base * Math.pow(0.85, speedLevel);
    }

    getCubeValue() {
        const base = DROPPER_TIERS[this.currentDropperTier].value;
        const multiLevel = this.upgrades.collectorMulti;
        return Math.floor(base * Math.pow(1.5, multiLevel) * this.rebirthMultiplier);
    }

    getConveyorSpeed() {
        return 3 + this.upgrades.conveyorSpeed * 1.0;
    }

    spawnCube() {
        const tier = DROPPER_TIERS[this.currentDropperTier];
        const colors = this.theme.cubeColors;
        const color = colors[tier.colorIdx % colors.length];

        let cube;
        if (this.cubePool.length > 0) {
            cube = this.cubePool.pop();
            cube.mesh.material.color.setHex(color);
            cube.mesh.visible = true;
        } else {
            const size = 0.5 + Math.min(this.currentDropperTier * 0.1, 0.3);
            const geo = new THREE.BoxGeometry(size, size, size);
            const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            this.scene.add(mesh);
            cube = { mesh };
        }

        cube.mesh.position.set(
            (Math.random() - 0.5) * 0.8,
            3.5,
            -8
        );
        cube.vy = 0;
        cube.onBelt = false;
        cube.value = this.getCubeValue();
        cube.collected = false;

        this.cubes.push(cube);
    }

    // ── Upgrade Costs ────────────────────────────────────────────────────

    getUpgradeCost(type) {
        if (type === 'newDropper') {
            const nextTier = this.currentDropperTier + 1;
            if (nextTier >= DROPPER_TIERS.length) return Infinity;
            return DROPPER_TIERS[nextTier].cost;
        }
        if (type === 'building') {
            const nextIdx = this.unlockedBuildings.length;
            if (nextIdx >= BUILDINGS.length) return Infinity;
            return BUILDINGS[nextIdx].cost;
        }
        if (type === 'rebirth') {
            return Math.floor(100000 * Math.pow(5, this.rebirthCount));
        }
        const upgDef = UPGRADE_TYPES[type];
        if (!upgDef) return Infinity;
        const lvl = this.upgrades[type] || 0;
        if (lvl >= upgDef.maxLevel) return Infinity;
        return Math.floor(upgDef.baseCost * Math.pow(upgDef.costMulti, lvl));
    }

    tryPurchase(type) {
        const cost = this.getUpgradeCost(type);
        if (this.money < cost) return false;

        this.money -= cost;

        if (type === 'newDropper') {
            this.currentDropperTier++;
            this.droppers = [DROPPER_TIERS[this.currentDropperTier]];
            // Update dropper machine color
            this.dropperMachineGroup.children.forEach(child => {
                if (child.material && child.material.color) {
                    const colors = this.theme.cubeColors;
                    child.material.color.setHex(colors[this.currentDropperTier % colors.length]);
                }
            });
        } else if (type === 'building') {
            const bIdx = this.unlockedBuildings.length;
            const bDef = BUILDINGS[bIdx];
            this.unlockedBuildings.push(bDef);
            this.spawnBuilding(bDef, bIdx);
        } else if (type === 'rebirth') {
            this.performRebirth();
        } else {
            this.upgrades[type] = (this.upgrades[type] || 0) + 1;
        }

        this.saveTycoon();
        return true;
    }

    performRebirth() {
        this.rebirthCount++;
        this.rebirthMultiplier = 1 + this.rebirthCount * 0.5;
        this.money = 0;
        this.totalEarned = 0;
        this.currentDropperTier = 0;
        this.droppers = [DROPPER_TIERS[0]];
        this.upgrades = { conveyorSpeed: 0, collectorMulti: 0, dropperSpeed: 0 };

        // Remove buildings
        for (const b of this.unlockedBuildings) {
            if (b._mesh) {
                this.scene.remove(b._mesh);
            }
        }
        this.unlockedBuildings = [];

        // Clear cubes
        for (const c of this.cubes) {
            c.mesh.visible = false;
            this.cubePool.push(c);
        }
        this.cubes = [];

        this.saveTycoon();
    }

    // ── Buildings ────────────────────────────────────────────────────────

    spawnBuilding(bDef, index) {
        // Position buildings along the right side of the plot
        const bx = 6 + (index % 3) * 4;
        const bz = -8 + Math.floor(index / 3) * 6;

        const mat = new THREE.MeshStandardMaterial({
            color: bDef.color || this.theme.buildingColor,
            roughness: 0.5,
            metalness: 0.2,
        });
        const geo = new THREE.BoxGeometry(bDef.w, bDef.h, bDef.d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(bx, bDef.h / 2 + 0.3, bz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        bDef._mesh = mesh;

        // Roof
        if (bDef.h < 6) {
            const roofMat = new THREE.MeshStandardMaterial({ color: 0xbb4444, roughness: 0.6 });
            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(bDef.w * 0.7, bDef.h * 0.3, 4),
                roofMat
            );
            roof.position.set(bx, bDef.h + 0.3 + bDef.h * 0.15, bz);
            roof.rotation.y = Math.PI / 4;
            roof.castShadow = true;
            this.scene.add(roof);
        }

        // Windows (small bright boxes)
        const windowMat = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 0.5,
        });
        const wCount = Math.min(Math.floor(bDef.h / 2), 5);
        for (let wy = 0; wy < wCount; wy++) {
            for (let side = -1; side <= 1; side += 2) {
                const win = new THREE.Mesh(
                    new THREE.BoxGeometry(0.4, 0.5, 0.1),
                    windowMat
                );
                win.position.set(
                    bx + side * (bDef.w / 2 - 0.3),
                    1.5 + wy * (bDef.h / (wCount + 1)),
                    bz + bDef.d / 2 + 0.06
                );
                this.scene.add(win);
            }
        }
    }

    rebuildUnlockedBuildings() {
        // Re-create building meshes from saved names
        const savedNames = this.unlockedBuildings.map(b => typeof b === 'string' ? b : b.name);
        this.unlockedBuildings = [];
        for (const name of savedNames) {
            const bDef = BUILDINGS.find(b => b.name === name);
            if (bDef) {
                this.unlockedBuildings.push({ ...bDef });
                this.spawnBuilding(this.unlockedBuildings[this.unlockedBuildings.length - 1], this.unlockedBuildings.length - 1);
            }
        }
    }

    // ── Floating Money Text ──────────────────────────────────────────────

    spawnMoneyText(x, y, z, amount) {
        // Use a simple mesh to represent the floating number
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff44,
            transparent: true,
            opacity: 1,
        });
        const geo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);

        this.floatingTexts.push({
            mesh,
            vy: 2,
            life: 1.0,
            amount,
        });
    }

    // ── HUD ──────────────────────────────────────────────────────────────

    createTycoonHUD() {
        this.hudEl = document.createElement('div');
        this.hudEl.className = 'game-3d-hud';
        this.hudEl.style.cssText = 'pointer-events:none;position:absolute;top:0;left:0;width:100%;padding:12px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-start;font-family:monospace;z-index:10;';
        this.hudEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:4px;">
                <div id="tyc-money" style="color:#ffd700;font-size:20px;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,0.5);">0 GoBux</div>
                <div id="tyc-mps" style="color:#44ff44;font-size:14px;text-shadow:0 2px 4px rgba(0,0,0,0.5);">+0/s</div>
                <div id="tyc-rebirth" style="color:#c084fc;font-size:12px;text-shadow:0 2px 4px rgba(0,0,0,0.5);display:none;"></div>
            </div>
            <div id="tyc-info" style="color:#fff;font-size:13px;text-align:right;text-shadow:0 2px 4px rgba(0,0,0,0.5);max-width:220px;">
                <div id="tyc-prompt" style="color:#aaa;font-size:12px;">Laufe ueber die leuchtenden Felder zum Kaufen!</div>
            </div>
        `;
        this.container.appendChild(this.hudEl);

        this.moneyEl = this.hudEl.querySelector('#tyc-money');
        this.mpsEl = this.hudEl.querySelector('#tyc-mps');
        this.rebirthEl = this.hudEl.querySelector('#tyc-rebirth');
        this.promptEl = this.hudEl.querySelector('#tyc-prompt');
    }

    // ── Game Update ──────────────────────────────────────────────────────

    update(dt) {
        const time = this.clock.elapsedTime;

        // ── Dropper spawning ──
        this.dropperTimer += dt;
        const interval = this.getDropInterval();
        if (this.dropperTimer >= interval) {
            this.dropperTimer -= interval;
            this.spawnCube();
        }

        // ── Update cubes ──
        const convSpeed = this.getConveyorSpeed();
        for (let i = this.cubes.length - 1; i >= 0; i--) {
            const c = this.cubes[i];
            if (c.collected) continue;

            if (!c.onBelt) {
                // Falling from dropper
                c.vy -= 20 * dt;
                c.mesh.position.y += c.vy * dt;
                if (c.mesh.position.y <= 0.7) {
                    c.mesh.position.y = 0.7;
                    c.onBelt = true;
                    c.vy = 0;
                }
            } else {
                // Moving along conveyor toward collector (positive Z)
                c.mesh.position.z += convSpeed * dt;
                // Slight wobble
                c.mesh.rotation.x += dt * 2;
                c.mesh.rotation.z += dt * 1.5;
            }

            // Check if reached collector
            if (c.onBelt && c.mesh.position.z >= 5) {
                c.collected = true;
                c.mesh.visible = false;
                this.cubePool.push(c);
                this.cubes.splice(i, 1);

                // Add money
                const earned = c.value;
                this.money += earned;
                this.totalEarned += earned;

                // Floating text
                this.spawnMoneyText(
                    c.mesh.position.x + (Math.random() - 0.5),
                    2.5,
                    c.mesh.position.z,
                    earned
                );
            }
        }

        // ── Animate belt stripes ──
        for (const stripe of this.beltStripes) {
            stripe.position.z += convSpeed * dt;
            if (stripe.position.z > 6) stripe.position.z -= 14;
        }

        // ── Floating money texts ──
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.mesh.position.y += ft.vy * dt;
            ft.life -= dt;
            ft.mesh.material.opacity = Math.max(0, ft.life);
            if (ft.life <= 0) {
                this.scene.remove(ft.mesh);
                ft.mesh.geometry.dispose();
                ft.mesh.material.dispose();
                this.floatingTexts.splice(i, 1);
            }
        }

        // ── Upgrade pad interactions ──
        for (const pad of this.upgradePads) {
            pad.cooldown -= dt;

            // Pulse animation
            const pulse = 0.15 + Math.sin(time * 3 + pad.x) * 0.1;
            pad.mesh.material.emissiveIntensity = pulse;

            // Check player collision
            if (pad.cooldown <= 0 && this.checkBoxCollision(pad.collider)) {
                if (this.tryPurchase(pad.type)) {
                    pad.cooldown = 1.0; // prevent rapid purchases
                    // Flash effect
                    pad.mesh.material.emissiveIntensity = 1.0;
                }
            }
        }

        // ── Collector glow ──
        if (this.collectorLight) {
            this.collectorLight.intensity = 0.8 + Math.sin(time * 4) * 0.4;
        }

        // ── Dropper machine animation ──
        if (this.dropperMachineGroup) {
            const funnel = this.dropperMachineGroup.children[1];
            if (funnel) {
                funnel.rotation.y += dt * 0.5;
            }
        }

        // ── Compute money per second ──
        const cubeValue = this.getCubeValue();
        const dropsPerSecond = 1 / this.getDropInterval();
        this.moneyPerSecond = Math.floor(cubeValue * dropsPerSecond);

        // ── Keep player on plot ──
        this.playerPosition.x = Math.max(-14, Math.min(14, this.playerPosition.x));
        this.playerPosition.z = Math.max(-14, Math.min(14, this.playerPosition.z));

        // ── Update HUD ──
        this.updateTycoonHUD();
    }

    getGroundY() {
        return 0;
    }

    updateTycoonHUD() {
        if (this.moneyEl) {
            this.moneyEl.textContent = `${this.formatMoney(this.money)} GoBux`;
        }
        if (this.mpsEl) {
            this.mpsEl.textContent = `+${this.formatMoney(this.moneyPerSecond)}/s`;
        }
        if (this.rebirthEl) {
            if (this.rebirthCount > 0) {
                this.rebirthEl.style.display = 'block';
                this.rebirthEl.textContent = `Wiedergeburt x${this.rebirthCount} (${this.rebirthMultiplier.toFixed(1)}x)`;
            }
        }

        // Show prompt based on nearest pad
        if (this.promptEl) {
            let nearestPad = null;
            let nearestDist = Infinity;
            for (const pad of this.upgradePads) {
                const dx = this.playerPosition.x - pad.x;
                const dz = this.playerPosition.z - pad.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < nearestDist && dist < 5) {
                    nearestDist = dist;
                    nearestPad = pad;
                }
            }

            if (nearestPad) {
                const cost = this.getUpgradeCost(nearestPad.type);
                if (cost === Infinity) {
                    this.promptEl.textContent = `${nearestPad.label}: MAX`;
                    this.promptEl.style.color = '#888';
                } else {
                    const canAfford = this.money >= cost;
                    this.promptEl.textContent = `${nearestPad.label}: ${this.formatMoney(cost)} GoBux`;
                    this.promptEl.style.color = canAfford ? '#44ff44' : '#ff6666';
                }
            } else {
                this.promptEl.textContent = 'Laufe ueber die leuchtenden Felder zum Kaufen!';
                this.promptEl.style.color = '#aaa';
            }
        }
    }

    formatMoney(amount) {
        if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
        if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
        return Math.floor(amount).toString();
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    let seed = 6000; // unique seed range

    for (const theme of themes) {
        for (let variant = 0; variant < 2; variant++) {
            const name = generateGameName('Tycoon', seed);
            variations.push({
                name,
                category: 'Tycoon',
                is3D: true,
                config: {
                    theme,
                    seed,
                    name,
                },
                thumbnail: generateThumbnail('Tycoon', { theme }, seed),
            });
            seed++;
        }
    }
    return variations; // 6 * 2 = 12
}

// ── Registration ────────────────────────────────────────────────────────
// Tycoon is 3D only — pass null for 2D class
GameRegistry.registerTemplate3D('Tycoon', null, TycoonGame, generateVariations);
