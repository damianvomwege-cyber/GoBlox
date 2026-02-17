// js/pages/create.js — GoBlox 3D Game Builder
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Auth } from '../auth.js';

// ── Storage ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'goblox_created_games';

function loadAllCreated() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}
function saveAllCreated(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Object type definitions ──────────────────────────────────────────────
const OBJECT_TYPES = {
    // ── Terrain & Structure ──
    block: {
        name: 'Block', icon: '\u2b1b', category: 'Terrain',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.7 }));
            m.castShadow = true; m.receiveShadow = true; return m;
        },
        defaultScale: { x:2, y:2, z:2 }, defaultColor: '#888888',
    },
    ramp: {
        name: 'Rampe', icon: '\u25b3', category: 'Terrain',
        create: () => {
            const shape = new THREE.Shape();
            shape.moveTo(0,0); shape.lineTo(1,0); shape.lineTo(1,1); shape.closePath();
            const geo = new THREE.ExtrudeGeometry(shape, { depth:1, bevelEnabled:false });
            geo.center();
            const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#999999', roughness: 0.7 }));
            m.castShadow = true; m.receiveShadow = true; return m;
        },
        defaultScale: { x:2, y:2, z:2 }, defaultColor: '#999999',
    },
    cylinder: {
        name: 'Zylinder', icon: '\u25ef', category: 'Terrain',
        create: () => {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1,16), new THREE.MeshStandardMaterial({ color: '#aa8866', roughness: 0.7 }));
            m.castShadow = true; m.receiveShadow = true; return m;
        },
        defaultScale: { x:1, y:3, z:1 }, defaultColor: '#aa8866',
    },
    sphere: {
        name: 'Kugel', icon: '\u26ab', category: 'Terrain',
        create: () => {
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12), new THREE.MeshStandardMaterial({ color: '#7799aa', roughness: 0.6 }));
            m.castShadow = true; m.receiveShadow = true; return m;
        },
        defaultScale: { x:2, y:2, z:2 }, defaultColor: '#7799aa',
    },
    platform: {
        name: 'Plattform', icon: '\u2583', category: 'Terrain',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#66aa66', roughness: 0.8 }));
            m.castShadow = true; m.receiveShadow = true; return m;
        },
        defaultScale: { x:6, y:0.5, z:6 }, defaultColor: '#66aa66',
    },
    wall: {
        name: 'Wand', icon: '\u2503', category: 'Terrain',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#777777', roughness: 0.8 }));
            m.castShadow = true; m.receiveShadow = true; return m;
        },
        defaultScale: { x:4, y:4, z:0.5 }, defaultColor: '#777777',
    },
    floor_tile: {
        name: 'Boden', icon: '\u2b1c', category: 'Terrain',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#557755', roughness: 0.9 }));
            m.castShadow = true; m.receiveShadow = true; return m;
        },
        defaultScale: { x:4, y:0.2, z:4 }, defaultColor: '#557755',
    },

    // ── Gameplay ──
    spawn_point: {
        name: 'Spawn', icon: '\ud83d\udfe2', category: 'Gameplay',
        create: () => {
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,0.15,16), new THREE.MeshStandardMaterial({ color: '#33cc33', emissive: '#116611' }));
            g.add(base);
            const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2,0.6,8), new THREE.MeshStandardMaterial({ color: '#33ff33', emissive: '#00aa00' }));
            arrow.position.y = 0.5;
            g.add(arrow);
            return g;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#33cc33', noResize: true,
    },
    checkpoint: {
        name: 'Checkpoint', icon: '\ud83d\udea9', category: 'Gameplay',
        create: () => {
            const g = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.5,6), new THREE.MeshStandardMaterial({ color: '#cccccc' }));
            pole.position.y = 0.75; g.add(pole);
            const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.05), new THREE.MeshStandardMaterial({ color: '#ff8800', emissive: '#553300' }));
            flag.position.set(0.25,1.3,0); g.add(flag);
            return g;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#ff8800',
        behaviors: { checkpointNumber: { label: 'Nummer', type: 'number', default: 1 } },
    },
    goal: {
        name: 'Ziel', icon: '\u2b50', category: 'Gameplay',
        create: () => {
            const m = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.5, 0),
                new THREE.MeshStandardMaterial({ color: '#ffcc00', emissive: '#664400', metalness: 0.6, roughness: 0.3 })
            );
            m.castShadow = true; return m;
        },
        defaultScale: { x:1.5, y:1.5, z:1.5 }, defaultColor: '#ffcc00',
    },
    kill_zone: {
        name: 'Kill Zone', icon: '\ud83d\udfe5', category: 'Gameplay',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#ff2222', transparent: true, opacity: 0.45 }));
            return m;
        },
        defaultScale: { x:4, y:0.3, z:4 }, defaultColor: '#ff2222',
        behaviors: { damage: { label: 'Schaden', type: 'number', default: 100 } },
    },
    bounce_pad: {
        name: 'Bounce Pad', icon: '\ud83e\udd98', category: 'Gameplay',
        create: () => {
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.7,0.2,16), new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#553300' }));
            g.add(base);
            const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.3,8), new THREE.MeshStandardMaterial({ color: '#cccccc', metalness: 0.7 }));
            spring.position.y = 0.25; g.add(spring);
            return g;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#ff9900',
        behaviors: { bounceForce: { label: 'Kraft', type: 'number', default: 20 } },
    },
    speed_boost: {
        name: 'Speed Boost', icon: '\u26a1', category: 'Gameplay',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#00ccff', emissive: '#004466', transparent: true, opacity: 0.6 }));
            return m;
        },
        defaultScale: { x:2, y:0.15, z:3 }, defaultColor: '#00ccff',
        behaviors: { speedMultiplier: { label: 'Faktor', type: 'number', default: 2 } },
    },
    teleporter: {
        name: 'Teleporter', icon: '\ud83d\udd2e', category: 'Gameplay',
        create: () => {
            const m = new THREE.Mesh(
                new THREE.TorusGeometry(0.5, 0.12, 8, 24),
                new THREE.MeshStandardMaterial({ color: '#aa44ff', emissive: '#440066' })
            );
            m.rotation.x = Math.PI/2;
            m.castShadow = true; return m;
        },
        defaultScale: { x:1.5, y:1.5, z:1.5 }, defaultColor: '#aa44ff',
        behaviors: { linkedId: { label: 'Ziel-ID', type: 'text', default: '' } },
    },

    // ── Collectibles ──
    coin: {
        name: 'Muenze', icon: '\ud83e\ude99', category: 'Sammelbar',
        create: () => {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.06,16), new THREE.MeshStandardMaterial({ color: '#ffdd44', metalness: 0.7, roughness: 0.3 }));
            m.rotation.x = Math.PI/2; m.castShadow = true; return m;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#ffdd44',
        behaviors: { points: { label: 'Punkte', type: 'number', default: 1 } },
    },
    gem: {
        name: 'Edelstein', icon: '\ud83d\udc8e', category: 'Sammelbar',
        create: () => {
            const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.3,0), new THREE.MeshStandardMaterial({ color: '#4488ff', metalness: 0.5, roughness: 0.2 }));
            m.castShadow = true; return m;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#4488ff',
        behaviors: { points: { label: 'Punkte', type: 'number', default: 5 } },
    },
    star: {
        name: 'Stern', icon: '\u2b50', category: 'Sammelbar',
        create: () => {
            const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.35,0), new THREE.MeshStandardMaterial({ color: '#ffaa00', emissive: '#553300', metalness: 0.6, roughness: 0.3 }));
            m.castShadow = true; return m;
        },
        defaultScale: { x:1.2, y:1.2, z:1.2 }, defaultColor: '#ffaa00',
        behaviors: { points: { label: 'Punkte', type: 'number', default: 10 } },
    },
    key_item: {
        name: 'Schluessel', icon: '\ud83d\udd11', category: 'Sammelbar',
        create: () => {
            const g = new THREE.Group();
            const head = new THREE.Mesh(new THREE.TorusGeometry(0.15,0.04,6,12), new THREE.MeshStandardMaterial({ color: '#ffcc00', metalness: 0.8 }));
            g.add(head);
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.4,0.04), new THREE.MeshStandardMaterial({ color: '#ffcc00', metalness: 0.8 }));
            shaft.position.y = -0.3; g.add(shaft);
            return g;
        },
        defaultScale: { x:1.5, y:1.5, z:1.5 }, defaultColor: '#ffcc00',
    },
    health_pack: {
        name: 'Medkit', icon: '\u2764\ufe0f', category: 'Sammelbar',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4), new THREE.MeshStandardMaterial({ color: '#ff4444' }));
            m.castShadow = true; return m;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#ff4444',
        behaviors: { healAmount: { label: 'Heilung', type: 'number', default: 25 } },
    },

    // ── Enemies & NPCs ──
    patrol_enemy: {
        name: 'Patrouillen-Gegner', icon: '\ud83d\udc7e', category: 'Gegner',
        create: () => {
            const g = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.8,0.6), new THREE.MeshStandardMaterial({ color: '#cc2222' }));
            body.position.y = 0.4; body.castShadow = true; g.add(body);
            const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.06), new THREE.MeshStandardMaterial({ color: '#ffffff' }));
            eyeL.position.set(-0.15,0.6,0.31); g.add(eyeL);
            const eyeR = eyeL.clone(); eyeR.position.x = 0.15; g.add(eyeR);
            return g;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#cc2222',
        behaviors: {
            patrolDistance: { label: 'Distanz', type: 'number', default: 5 },
            speed: { label: 'Speed', type: 'number', default: 3 },
        },
    },
    chase_enemy: {
        name: 'Verfolger-Gegner', icon: '\ud83d\udc79', category: 'Gegner',
        create: () => {
            const g = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.9,0.7), new THREE.MeshStandardMaterial({ color: '#880088' }));
            body.position.y = 0.45; body.castShadow = true; g.add(body);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,6), new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#660000' }));
            eye.position.set(0,0.65,0.36); g.add(eye);
            return g;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#880088',
        behaviors: { speed: { label: 'Speed', type: 'number', default: 4 } },
    },
    turret: {
        name: 'Geschuetz', icon: '\ud83d\udd2b', category: 'Gegner',
        create: () => {
            const g = new THREE.Group();
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,0.3,8), new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.6 }));
            base.position.y = 0.15; g.add(base);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.6,6), new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.8 }));
            barrel.rotation.z = Math.PI/2; barrel.position.set(0.3,0.35,0); g.add(barrel);
            return g;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#555555',
        behaviors: {
            fireRate: { label: 'Feuerrate', type: 'number', default: 1 },
            range: { label: 'Reichweite', type: 'number', default: 15 },
        },
    },
    npc: {
        name: 'NPC', icon: '\ud83e\uddd1', category: 'Gegner',
        create: () => {
            const g = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.35), new THREE.MeshStandardMaterial({ color: '#4488cc' }));
            body.position.y = 0.35; body.castShadow = true; g.add(body);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4), new THREE.MeshStandardMaterial({ color: '#ffbb77' }));
            head.position.y = 0.9; head.castShadow = true; g.add(head);
            return g;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#4488cc',
        behaviors: { dialog: { label: 'Dialog', type: 'textarea', default: 'Hallo!' } },
    },

    // ── Environment ──
    tree: {
        name: 'Baum', icon: '\ud83c\udf33', category: 'Umgebung',
        create: () => {
            const g = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,1,6), new THREE.MeshStandardMaterial({ color: '#885533' }));
            trunk.position.y = 0.5; trunk.castShadow = true; g.add(trunk);
            const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.6,1,8), new THREE.MeshStandardMaterial({ color: '#228833' }));
            canopy.position.y = 1.4; canopy.castShadow = true; g.add(canopy);
            return g;
        },
        defaultScale: { x:1.5, y:1.5, z:1.5 }, defaultColor: '#228833',
    },
    rock: {
        name: 'Felsen', icon: '\ud83e\udea8', category: 'Umgebung',
        create: () => {
            const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5,0), new THREE.MeshStandardMaterial({ color: '#888877', roughness: 0.9 }));
            m.castShadow = true; m.receiveShadow = true; return m;
        },
        defaultScale: { x:1.5, y:1.2, z:1.5 }, defaultColor: '#888877',
    },
    light_source: {
        name: 'Licht', icon: '\ud83d\udca1', category: 'Umgebung',
        create: () => {
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.2,8,6), new THREE.MeshStandardMaterial({ color: '#ffffaa', emissive: '#ffffaa', emissiveIntensity: 1 }));
            return m;
        },
        defaultScale: { x:1, y:1, z:1 }, defaultColor: '#ffffaa',
    },
    water: {
        name: 'Wasser', icon: '\ud83c\udf0a', category: 'Umgebung',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#2266cc', transparent: true, opacity: 0.55 }));
            return m;
        },
        defaultScale: { x:6, y:0.3, z:6 }, defaultColor: '#2266cc',
    },
    lava: {
        name: 'Lava', icon: '\ud83c\udf0b', category: 'Umgebung',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#ff4400', emissive: '#881100', transparent: true, opacity: 0.7 }));
            return m;
        },
        defaultScale: { x:6, y:0.3, z:6 }, defaultColor: '#ff4400',
    },
    fence: {
        name: 'Zaun', icon: '\ud83e\uddf1', category: 'Umgebung',
        create: () => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: '#aa8855', roughness: 0.9 }));
            m.castShadow = true; return m;
        },
        defaultScale: { x:4, y:1.5, z:0.2 }, defaultColor: '#aa8855',
    },
};

// ── Category order ──
const CATEGORIES = ['Terrain', 'Gameplay', 'Sammelbar', 'Gegner', 'Umgebung'];

// ── Template definitions ──
const TEMPLATES = [
    { id: 'obby-3d',      name: 'Obby 3D',        icon: '\ud83c\udfd7\ufe0f', desc: '3D-Hindernisparcours mit Plattformen und Fallen',     accent: '#00b06f', editor: '3d' },
    { id: 'platformer-2d', name: 'Platformer 2D',  icon: '\ud83c\udfae',       desc: '2D-Jump-and-Run mit Levels und Power-Ups',            accent: '#4488ff', editor: '2d' },
    { id: 'shooter-3d',    name: 'Shooter 3D',     icon: '\ud83d\udd2b',       desc: '3D-Arena-Shooter mit Gegnern und Waffen',             accent: '#e94560', editor: '3d' },
    { id: 'racing',        name: 'Racing',          icon: '\ud83c\udfce\ufe0f', desc: 'Rennspiel mit Strecken und Fahrzeugen',               accent: '#ff9900', editor: '2d' },
    { id: 'snake',         name: 'Snake',           icon: '\ud83d\udc0d',       desc: 'Klassisches Snake-Spiel mit eigenen Levels',          accent: '#33cc33', editor: '2d' },
    { id: 'maze',          name: 'Maze',            icon: '\ud83e\uddf1',       desc: 'Labyrinth-Spiel mit Raetseln und Geheimnissen',       accent: '#aa44ff', editor: '2d' },
];

// ── Current template state ──
let currentTemplate = null;

// ── Unique ID generator ──
let _nextUid = 1;
function uid() { return 'obj_' + (_nextUid++); }

// ══════════════════════════════════════════════════════════════════════════
// Main render function
// ══════════════════════════════════════════════════════════════════════════

export function renderCreate(container, router) {
    const user = Auth.currentUser();
    if (!user) { router.navigate('#/login'); return; }

    // Check if we are editing an existing game
    const hashParts = window.location.hash.split('/');
    let editingGameId = null;
    if (hashParts.length > 2) {
        editingGameId = hashParts[2];
        const saved = loadAllCreated();
        if (saved[editingGameId]) {
            const data = saved[editingGameId];
            const template = data.template || 'obby-3d';
            currentTemplate = template;
            const tmpl = TEMPLATES.find(t => t.id === template);
            if (tmpl && tmpl.editor === '3d') {
                buildEditor3D(container, router, user, editingGameId);
            } else {
                showPlaceholder(container, router, template);
            }
            return;
        }
    }

    // Show template picker
    showTemplatePicker(container, router, user);
}

// ══════════════════════════════════════════════════════════════════════════
// Template Picker
// ══════════════════════════════════════════════════════════════════════════

function showTemplatePicker(container, router, user) {
    container.innerHTML = `
        <div class="template-picker">
            <div class="template-picker-header">
                <h1 class="template-picker-title">Neues Spiel erstellen</h1>
                <p class="template-picker-subtitle">Waehle einen Spieltyp</p>
            </div>
            <div class="template-picker-grid">
                ${TEMPLATES.map(t => `
                    <div class="template-card" data-template="${t.id}" style="--card-accent: ${t.accent}">
                        <div class="template-card-icon">${t.icon}</div>
                        <div class="template-card-name">${t.name}</div>
                        <div class="template-card-desc">${t.desc}</div>
                    </div>
                `).join('')}
            </div>
            <button class="template-picker-back" id="template-back">Zurueck</button>
        </div>
    `;

    // Back button
    container.querySelector('#template-back').addEventListener('click', () => {
        router.navigate('#/home');
    });

    // Card click handlers
    container.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const templateId = card.dataset.template;
            const tmpl = TEMPLATES.find(t => t.id === templateId);
            if (!tmpl) return;

            currentTemplate = templateId;

            if (tmpl.editor === '3d') {
                buildEditor3D(container, router, user, null);
            } else {
                showPlaceholder(container, router, templateId);
            }
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Placeholder for templates not yet implemented
// ══════════════════════════════════════════════════════════════════════════

function showPlaceholder(container, router, templateId) {
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    container.innerHTML = `
        <div class="template-picker">
            <div class="template-picker-header">
                <div class="template-card-icon" style="font-size:3rem;margin-bottom:1rem">${tmpl ? tmpl.icon : '\ud83d\udee0\ufe0f'}</div>
                <h1 class="template-picker-title">${tmpl ? tmpl.name : templateId}</h1>
                <p class="template-picker-subtitle">Dieser Editor wird bald verfuegbar!</p>
            </div>
            <button class="template-picker-back" id="placeholder-back">Zurueck</button>
        </div>
    `;

    container.querySelector('#placeholder-back').addEventListener('click', () => {
        const user = Auth.currentUser();
        if (user) {
            showTemplatePicker(container, router, user);
        } else {
            router.navigate('#/home');
        }
    });
}

// ══════════════════════════════════════════════════════════════════════════
// 3D Editor (existing editor, refactored into function)
// ══════════════════════════════════════════════════════════════════════════

function buildEditor3D(container, router, user, editingGameId) {
    // ── State ──
    let scene, camera, renderer, controls, raycaster, mouse, gridHelper;
    let groundPlane;
    let placedObjects = []; // { id, type, mesh, position, rotation, scale, color, behavior }
    let selectedId = null;
    let activeTool = null; // type key from OBJECT_TYPES when placing
    let ghostMesh = null;
    let undoStack = [];
    let isDragging = false;
    let dragOffset = new THREE.Vector3();
    let isTestMode = false;
    let animationFrameId = null;

    // Game settings
    let gameSettings = {
        name: 'Mein Spiel',
        type: 'obby',
        timeLimit: 0,
        winCondition: 'goal',
        gravity: 1,
        skyColor: '#87ceeb',
    };

    // Load settings from existing game if editing
    if (editingGameId) {
        const saved = loadAllCreated();
        if (saved[editingGameId]) {
            const data = saved[editingGameId];
            gameSettings = { ...gameSettings, ...data.settings };
        }
    }

    // ── Build HTML ──
    container.innerHTML = '';
    const editorEl = document.createElement('div');
    editorEl.className = 'create-editor';
    editorEl.innerHTML = `
        <!-- Toolbar -->
        <div class="create-toolbar">
            <span class="create-toolbar-logo" id="create-back-logo">GoBlox</span>
            <div class="create-toolbar-divider"></div>
            <button class="tb-btn" id="tb-save">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Speichern
            </button>
            <button class="tb-btn tb-primary" id="tb-test">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Testen
            </button>
            <button class="tb-btn tb-success" id="tb-publish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Veroeffentlichen
            </button>
            <div class="create-toolbar-divider"></div>
            <button class="tb-btn" id="tb-undo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 105.36-9.36L1 10"/></svg>
                Rueckgaengig
            </button>
            <div class="create-toolbar-spacer"></div>
            <button class="tb-btn tb-danger" id="tb-exit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Beenden
            </button>
        </div>

        <!-- Body: Palette | Viewport | Properties -->
        <div class="create-body">
            <!-- Left: Object Palette -->
            <div class="create-palette" id="create-palette"></div>

            <!-- Center: 3D Viewport -->
            <div class="create-viewport" id="create-viewport">
                <div class="create-mode-indicator" id="mode-indicator">Platzieren: Block</div>
                <div class="create-viewport-hint">Rechtsklick: Kamera drehen | Scrollen: Zoom | Linksklick: Platzieren/Auswaehlen</div>
            </div>

            <!-- Right: Properties Panel -->
            <div class="create-properties" id="create-properties">
                <div class="props-empty">
                    <div class="props-empty-icon">\ud83d\udd27</div>
                    <div>Objekt auswaehlen<br>um Eigenschaften zu bearbeiten</div>
                </div>
            </div>
        </div>

        <!-- Bottom: Game Settings -->
        <div class="create-settings" id="create-settings">
            <div class="settings-field">
                <span class="settings-label">Name:</span>
                <input type="text" class="settings-input" id="set-name" value="${gameSettings.name}">
            </div>
            <div class="settings-field">
                <span class="settings-label">Typ:</span>
                <select class="settings-input" id="set-type">
                    <option value="obby" ${gameSettings.type==='obby'?'selected':''}>Obby / Platformer</option>
                    <option value="shooter" ${gameSettings.type==='shooter'?'selected':''}>Shooter Arena</option>
                    <option value="survival" ${gameSettings.type==='survival'?'selected':''}>Survival</option>
                    <option value="freeroam" ${gameSettings.type==='freeroam'?'selected':''}>Free Roam</option>
                    <option value="race" ${gameSettings.type==='race'?'selected':''}>Race</option>
                </select>
            </div>
            <div class="settings-field">
                <span class="settings-label">Zeitlimit:</span>
                <select class="settings-input" id="set-time">
                    <option value="0" ${gameSettings.timeLimit===0?'selected':''}>Unbegrenzt</option>
                    <option value="60" ${gameSettings.timeLimit===60?'selected':''}>60s</option>
                    <option value="120" ${gameSettings.timeLimit===120?'selected':''}>120s</option>
                    <option value="300" ${gameSettings.timeLimit===300?'selected':''}>300s</option>
                </select>
            </div>
            <div class="settings-field">
                <span class="settings-label">Gewinn:</span>
                <select class="settings-input" id="set-win">
                    <option value="goal" ${gameSettings.winCondition==='goal'?'selected':''}>Ziel erreichen</option>
                    <option value="collect" ${gameSettings.winCondition==='collect'?'selected':''}>Alles sammeln</option>
                    <option value="survive" ${gameSettings.winCondition==='survive'?'selected':''}>Zeit ueberleben</option>
                    <option value="kill_all" ${gameSettings.winCondition==='kill_all'?'selected':''}>Alle Gegner besiegen</option>
                    <option value="none" ${gameSettings.winCondition==='none'?'selected':''}>Keine</option>
                </select>
            </div>
            <div class="settings-field">
                <span class="settings-label">Gravitation:</span>
                <input type="range" class="settings-input" id="set-gravity" min="0.3" max="3" step="0.1" value="${gameSettings.gravity}">
            </div>
            <div class="settings-field">
                <span class="settings-label">Himmel:</span>
                <input type="color" class="settings-input" id="set-sky" value="${gameSettings.skyColor}">
            </div>
        </div>
    `;
    document.body.appendChild(editorEl);

    // ── Build Palette ──
    const paletteEl = editorEl.querySelector('#create-palette');
    CATEGORIES.forEach(cat => {
        const items = Object.entries(OBJECT_TYPES).filter(([,t]) => t.category === cat);
        if (!items.length) return;
        let html = `<div class="palette-category"><div class="palette-category-title">${cat}</div>`;
        items.forEach(([key, t]) => {
            html += `<div class="palette-item" data-type="${key}"><span class="palette-item-icon">${t.icon}</span><span class="palette-item-name">${t.name}</span></div>`;
        });
        html += '</div>';
        paletteEl.insertAdjacentHTML('beforeend', html);
    });

    // Palette click handler
    paletteEl.addEventListener('click', e => {
        const item = e.target.closest('.palette-item');
        if (!item) return;
        const type = item.dataset.type;
        if (activeTool === type) {
            // Deselect
            activeTool = null;
            paletteEl.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
            removeGhost();
            updateModeIndicator();
            return;
        }
        activeTool = type;
        paletteEl.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        deselectObject();
        updateModeIndicator();
        createGhost(type);
    });

    // ── Init Three.js ──
    const viewportEl = editorEl.querySelector('#create-viewport');
    const modeIndicator = editorEl.querySelector('#mode-indicator');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(gameSettings.skyColor);

    camera = new THREE.PerspectiveCamera(60, viewportEl.clientWidth / viewportEl.clientHeight, 0.1, 500);
    camera.position.set(15, 12, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(viewportEl.clientWidth, viewportEl.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    viewportEl.insertBefore(renderer.domElement, viewportEl.firstChild);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.mouseButtons = {
        LEFT: null, // We handle left click ourselves
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.target.set(0, 0, 0);
    controls.update();

    // Lighting
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x444422, 0.6);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0x606060, 0.5);
    scene.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(30, 50, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Grid
    gridHelper = new THREE.GridHelper(100, 100, 0x444466, 0x222233);
    scene.add(gridHelper);

    // Ground plane for raycasting
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.9 });
    groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.receiveShadow = true;
    groundPlane.name = '__ground__';
    scene.add(groundPlane);

    // Axis helper
    const axisHelper = new THREE.AxesHelper(2);
    axisHelper.position.set(-48, 0.01, -48);
    scene.add(axisHelper);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // ── Load existing game data if editing ──
    if (editingGameId) {
        const saved = loadAllCreated();
        if (saved[editingGameId] && saved[editingGameId].objects) {
            saved[editingGameId].objects.forEach(objData => {
                addObjectFromData(objData);
            });
        }
    }

    // ── Ghost (preview) mesh ──
    function createGhost(type) {
        removeGhost();
        const typeDef = OBJECT_TYPES[type];
        if (!typeDef) return;
        ghostMesh = typeDef.create();
        const ds = typeDef.defaultScale;
        ghostMesh.scale.set(ds.x, ds.y, ds.z);
        setMeshOpacity(ghostMesh, 0.4);
        ghostMesh.name = '__ghost__';
        scene.add(ghostMesh);
    }

    function removeGhost() {
        if (ghostMesh) {
            scene.remove(ghostMesh);
            disposeMesh(ghostMesh);
            ghostMesh = null;
        }
    }

    function setMeshOpacity(obj, opacity) {
        obj.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.transparent = true;
                child.material.opacity = opacity;
            }
        });
    }

    // ── Mode indicator ──
    function updateModeIndicator() {
        if (activeTool) {
            modeIndicator.textContent = 'Platzieren: ' + OBJECT_TYPES[activeTool].name;
            modeIndicator.classList.add('visible');
        } else {
            modeIndicator.classList.remove('visible');
        }
    }

    // ── Snap to grid ──
    function snap(v) {
        return Math.round(v);
    }

    // ── Raycast helpers ──
    function getMouseIntersection(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        // Raycast against ground + placed objects
        const targets = [groundPlane, ...placedObjects.map(o => o.mesh)];
        const hits = raycaster.intersectObjects(targets, true);
        return hits.length > 0 ? hits[0] : null;
    }

    function getGroundIntersection(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObject(groundPlane);
        return hits.length > 0 ? hits[0] : null;
    }

    function findPlacedObjectFromHit(hit) {
        if (!hit || !hit.object) return null;
        // Walk up to find the placed object's root mesh
        let obj = hit.object;
        while (obj && obj.parent) {
            const found = placedObjects.find(p => p.mesh === obj);
            if (found) return found;
            if (obj.parent === scene) break;
            obj = obj.parent;
        }
        return null;
    }

    // ── Object placement ──
    function addObject(type, position) {
        const typeDef = OBJECT_TYPES[type];
        if (!typeDef) return null;

        const mesh = typeDef.create();
        const ds = typeDef.defaultScale;
        mesh.scale.set(ds.x, ds.y, ds.z);
        mesh.position.set(snap(position.x), position.y, snap(position.z));

        // Adjust Y so objects sit on the ground / surface
        if (type !== 'spawn_point' && type !== 'light_source') {
            mesh.position.y = Math.max(0, snap(position.y));
        }

        scene.add(mesh);

        const objData = {
            id: uid(),
            type,
            mesh,
            position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: ds.x, y: ds.y, z: ds.z },
            color: typeDef.defaultColor,
            behavior: {},
        };

        // Default behaviors
        if (typeDef.behaviors) {
            for (const [key, beh] of Object.entries(typeDef.behaviors)) {
                objData.behavior[key] = beh.default;
            }
        }

        placedObjects.push(objData);

        // Undo
        pushUndo({ action: 'add', id: objData.id, data: serializeObject(objData) });

        return objData;
    }

    function addObjectFromData(data) {
        const typeDef = OBJECT_TYPES[data.type];
        if (!typeDef) return;

        const mesh = typeDef.create();
        mesh.position.set(data.position.x, data.position.y, data.position.z);
        mesh.rotation.set(
            (data.rotation?.x || 0) * Math.PI / 180,
            (data.rotation?.y || 0) * Math.PI / 180,
            (data.rotation?.z || 0) * Math.PI / 180
        );
        mesh.scale.set(data.scale?.x || 1, data.scale?.y || 1, data.scale?.z || 1);

        // Apply color
        if (data.color) {
            applyColorToMesh(mesh, data.color);
        }

        scene.add(mesh);

        const objData = {
            id: uid(),
            type: data.type,
            mesh,
            position: { ...data.position },
            rotation: { x: data.rotation?.x || 0, y: data.rotation?.y || 0, z: data.rotation?.z || 0 },
            scale: { x: data.scale?.x || 1, y: data.scale?.y || 1, z: data.scale?.z || 1 },
            color: data.color || typeDef.defaultColor,
            behavior: { ...data.behavior },
        };

        placedObjects.push(objData);
        return objData;
    }

    function removeObject(id) {
        const idx = placedObjects.findIndex(o => o.id === id);
        if (idx < 0) return;
        const obj = placedObjects[idx];
        pushUndo({ action: 'remove', id: obj.id, data: serializeObject(obj) });
        scene.remove(obj.mesh);
        disposeMesh(obj.mesh);
        placedObjects.splice(idx, 1);
        if (selectedId === id) {
            selectedId = null;
            renderProperties();
        }
    }

    function disposeMesh(mesh) {
        mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
    }

    function applyColorToMesh(mesh, color) {
        const c = new THREE.Color(color);
        mesh.traverse(child => {
            if (child.isMesh && child.material) {
                // Only color the "main" parts, preserve white eyes etc
                if (child.material.color) {
                    child.material.color.set(c);
                }
            }
        });
    }

    // ── Selection ──
    let selectionOutline = null;

    function selectObject(id) {
        deselectObject();
        const obj = placedObjects.find(o => o.id === id);
        if (!obj) return;
        selectedId = id;

        // Create outline box
        const box = new THREE.Box3().setFromObject(obj.mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const outlineGeo = new THREE.BoxGeometry(size.x + 0.1, size.y + 0.1, size.z + 0.1);
        const outlineMat = new THREE.MeshBasicMaterial({
            color: 0x00b06f,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
        });
        selectionOutline = new THREE.Mesh(outlineGeo, outlineMat);
        selectionOutline.position.copy(center);
        selectionOutline.name = '__outline__';
        scene.add(selectionOutline);

        // Deactivate palette tool
        activeTool = null;
        paletteEl.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
        removeGhost();
        updateModeIndicator();

        renderProperties();
    }

    function deselectObject() {
        selectedId = null;
        if (selectionOutline) {
            scene.remove(selectionOutline);
            selectionOutline.geometry.dispose();
            selectionOutline.material.dispose();
            selectionOutline = null;
        }
        renderProperties();
    }

    function updateSelectionOutline() {
        if (!selectedId || !selectionOutline) return;
        const obj = placedObjects.find(o => o.id === selectedId);
        if (!obj) return;
        const box = new THREE.Box3().setFromObject(obj.mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        selectionOutline.position.copy(center);
        selectionOutline.scale.set(1, 1, 1);
        selectionOutline.geometry.dispose();
        selectionOutline.geometry = new THREE.BoxGeometry(size.x + 0.1, size.y + 0.1, size.z + 0.1);
    }

    // ── Properties Panel ──
    const propsEl = editorEl.querySelector('#create-properties');

    function renderProperties() {
        if (!selectedId) {
            propsEl.innerHTML = `<div class="props-empty"><div class="props-empty-icon">\ud83d\udd27</div><div>Objekt auswaehlen<br>um Eigenschaften zu bearbeiten</div></div>`;
            return;
        }
        const obj = placedObjects.find(o => o.id === selectedId);
        if (!obj) { propsEl.innerHTML = ''; return; }

        const typeDef = OBJECT_TYPES[obj.type];
        let html = '';

        // Header
        html += `<div class="props-section"><div class="props-section-title">${typeDef.icon} ${typeDef.name} (${obj.id})</div></div>`;

        // Position
        html += `<div class="props-section"><div class="props-section-title">Position</div>`;
        html += propRow('X', 'pos-x', obj.position.x);
        html += propRow('Y', 'pos-y', obj.position.y);
        html += propRow('Z', 'pos-z', obj.position.z);
        html += `</div>`;

        // Rotation
        html += `<div class="props-section"><div class="props-section-title">Rotation</div>`;
        html += propRow('X', 'rot-x', obj.rotation.x, 0);
        html += propRow('Y', 'rot-y', obj.rotation.y, 0);
        html += propRow('Z', 'rot-z', obj.rotation.z, 0);
        html += `</div>`;

        // Scale
        if (!typeDef.noResize) {
            html += `<div class="props-section"><div class="props-section-title">Skalierung</div>`;
            html += propRow('X', 'scl-x', obj.scale.x, 0.1);
            html += propRow('Y', 'scl-y', obj.scale.y, 0.1);
            html += propRow('Z', 'scl-z', obj.scale.z, 0.1);
            html += `</div>`;
        }

        // Color
        html += `<div class="props-section"><div class="props-section-title">Farbe</div>`;
        html += `<div class="props-row"><span class="props-label">C</span><input type="color" class="props-input" id="prop-color" value="${obj.color}"></div>`;
        html += `</div>`;

        // Behaviors
        if (typeDef.behaviors) {
            html += `<div class="props-section"><div class="props-section-title">Verhalten</div>`;
            for (const [key, beh] of Object.entries(typeDef.behaviors)) {
                const val = obj.behavior[key] !== undefined ? obj.behavior[key] : beh.default;
                if (beh.type === 'textarea') {
                    html += `<div class="props-full-row"><span class="props-label">${beh.label}</span><textarea class="props-input" data-beh="${key}">${val}</textarea></div>`;
                } else {
                    html += `<div class="props-row"><span class="props-label" style="width:auto;min-width:50px">${beh.label}</span><input type="${beh.type}" class="props-input" data-beh="${key}" value="${val}" step="${beh.type==='number'?'0.1':''}"></div>`;
                }
            }
            html += `</div>`;
        }

        // Delete
        html += `<div class="props-section"><button class="props-delete-btn" id="prop-delete">Objekt loeschen</button></div>`;

        propsEl.innerHTML = html;

        // Bind events
        bindPropInput('pos-x', v => { obj.position.x = v; obj.mesh.position.x = v; updateSelectionOutline(); });
        bindPropInput('pos-y', v => { obj.position.y = v; obj.mesh.position.y = v; updateSelectionOutline(); });
        bindPropInput('pos-z', v => { obj.position.z = v; obj.mesh.position.z = v; updateSelectionOutline(); });
        bindPropInput('rot-x', v => { obj.rotation.x = v; obj.mesh.rotation.x = v * Math.PI/180; updateSelectionOutline(); });
        bindPropInput('rot-y', v => { obj.rotation.y = v; obj.mesh.rotation.y = v * Math.PI/180; updateSelectionOutline(); });
        bindPropInput('rot-z', v => { obj.rotation.z = v; obj.mesh.rotation.z = v * Math.PI/180; updateSelectionOutline(); });
        if (!typeDef.noResize) {
            bindPropInput('scl-x', v => { obj.scale.x = v; obj.mesh.scale.x = v; updateSelectionOutline(); });
            bindPropInput('scl-y', v => { obj.scale.y = v; obj.mesh.scale.y = v; updateSelectionOutline(); });
            bindPropInput('scl-z', v => { obj.scale.z = v; obj.mesh.scale.z = v; updateSelectionOutline(); });
        }

        const colorInput = propsEl.querySelector('#prop-color');
        if (colorInput) {
            colorInput.addEventListener('input', e => {
                obj.color = e.target.value;
                applyColorToMesh(obj.mesh, obj.color);
            });
        }

        // Behavior inputs
        propsEl.querySelectorAll('[data-beh]').forEach(input => {
            input.addEventListener('input', e => {
                const key = e.target.dataset.beh;
                const beh = typeDef.behaviors[key];
                obj.behavior[key] = beh.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            });
        });

        // Delete button
        const delBtn = propsEl.querySelector('#prop-delete');
        if (delBtn) delBtn.addEventListener('click', () => removeObject(obj.id));
    }

    function propRow(label, id, value, step) {
        const s = step !== undefined ? step : 0.5;
        return `<div class="props-row"><span class="props-label">${label}</span><input type="number" class="props-input" id="prop-${id}" value="${parseFloat(value.toFixed(2))}" step="${s}"></div>`;
    }

    function bindPropInput(suffix, callback) {
        const el = propsEl.querySelector('#prop-' + suffix);
        if (!el) return;
        el.addEventListener('change', e => {
            callback(parseFloat(e.target.value) || 0);
        });
    }

    // ── Undo system ──
    function pushUndo(entry) {
        undoStack.push(entry);
        if (undoStack.length > 50) undoStack.shift();
    }

    function performUndo() {
        if (!undoStack.length) return;
        const entry = undoStack.pop();
        if (entry.action === 'add') {
            // Undo add: remove the object
            const idx = placedObjects.findIndex(o => o.id === entry.id);
            if (idx >= 0) {
                const obj = placedObjects[idx];
                scene.remove(obj.mesh);
                disposeMesh(obj.mesh);
                placedObjects.splice(idx, 1);
                if (selectedId === entry.id) {
                    selectedId = null;
                    renderProperties();
                }
            }
        } else if (entry.action === 'remove') {
            // Undo remove: re-add the object
            addObjectFromData({ ...entry.data, id: entry.id });
        }
    }

    // ── Serialize ──
    function serializeObject(obj) {
        return {
            type: obj.type,
            position: { ...obj.position },
            rotation: { ...obj.rotation },
            scale: { ...obj.scale },
            color: obj.color,
            behavior: { ...obj.behavior },
        };
    }

    function serializeAll() {
        return placedObjects.map(serializeObject);
    }

    function readSettings() {
        const nameInput = editorEl.querySelector('#set-name');
        const typeInput = editorEl.querySelector('#set-type');
        const timeInput = editorEl.querySelector('#set-time');
        const winInput = editorEl.querySelector('#set-win');
        const gravInput = editorEl.querySelector('#set-gravity');
        const skyInput = editorEl.querySelector('#set-sky');
        return {
            name: nameInput?.value || 'Mein Spiel',
            type: typeInput?.value || 'obby',
            timeLimit: parseInt(timeInput?.value) || 0,
            winCondition: winInput?.value || 'goal',
            gravity: parseFloat(gravInput?.value) || 1,
            skyColor: skyInput?.value || '#87ceeb',
        };
    }

    // ── Save ──
    function saveGame() {
        const settings = readSettings();
        const objects = serializeAll();
        const id = editingGameId || 'game_' + Date.now();
        const all = loadAllCreated();

        all[id] = {
            name: settings.name,
            type: settings.type,
            template: currentTemplate || 'obby-3d',
            objects,
            settings,
            createdAt: all[id]?.createdAt || Date.now(),
            updatedAt: Date.now(),
            published: all[id]?.published || false,
            creatorId: user.id,
            creatorName: user.name,
        };

        saveAllCreated(all);
        editingGameId = id;
        showToast('Spiel gespeichert!', 'success');
        return id;
    }

    // ── Publish ──
    function publishGame() {
        // Validate
        const hasSpawn = placedObjects.some(o => o.type === 'spawn_point');
        if (!hasSpawn) {
            showToast('Du brauchst mindestens einen Spawn-Punkt!', 'error');
            return;
        }
        if (placedObjects.length < 3) {
            showToast('Fuege mehr Objekte hinzu (mindestens 3)!', 'error');
            return;
        }

        // Show confirmation modal
        showModal(
            'Spiel veroeffentlichen?',
            `Dein Spiel "${readSettings().name}" wird im Katalog fuer alle sichtbar. Das kostet 0 GoBux.`,
            'Veroeffentlichen',
            () => {
                const id = saveGame();
                const all = loadAllCreated();
                all[id].published = true;
                saveAllCreated(all);
                showToast('Spiel veroeffentlicht! Es ist jetzt im Katalog.', 'success');
            }
        );
    }

    // ── Test Mode ──
    function enterTestMode() {
        if (isTestMode) return;
        isTestMode = true;

        // Save current state
        saveGame();

        // Create test overlay
        const overlay = document.createElement('div');
        overlay.className = 'create-test-overlay';
        overlay.id = 'test-overlay';

        const exitBtn = document.createElement('button');
        exitBtn.className = 'test-exit-btn';
        exitBtn.textContent = 'Test beenden';
        overlay.appendChild(exitBtn);

        const container3d = document.createElement('div');
        container3d.style.cssText = 'width:100%;height:100%;';
        overlay.appendChild(container3d);

        document.body.appendChild(overlay);

        // Dynamically import and run the custom game template
        import('../games/templates/custom.js').then(({ CustomGame3D }) => {
            const settings = readSettings();
            const objects = serializeAll();

            const gameConfig = {
                name: settings.name,
                settings,
                objects,
            };

            const testGame = new CustomGame3D(container3d, gameConfig);
            testGame.onGameOver = (score) => {
                // Show score in a HUD item
                const hud = overlay.querySelector('.create-test-hud') || document.createElement('div');
                hud.className = 'create-test-hud';
                hud.innerHTML = `<div class="create-test-hud-item">Game Over! Score: ${score}</div>`;
                overlay.appendChild(hud);
            };
            testGame.start();

            exitBtn.addEventListener('click', () => {
                testGame.stop();
                overlay.remove();
                isTestMode = false;
            });
        }).catch(err => {
            console.error('Test mode error:', err);
            overlay.remove();
            isTestMode = false;
            showToast('Fehler beim Starten des Tests!', 'error');
        });
    }

    // ── Toast ──
    function showToast(msg, type = '') {
        const toast = document.createElement('div');
        toast.className = 'create-toast' + (type ? ' toast-' + type : '');
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2600);
    }

    // ── Modal ──
    function showModal(title, text, confirmLabel, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'create-modal-overlay';
        overlay.innerHTML = `
            <div class="create-modal">
                <h3>${title}</h3>
                <p>${text}</p>
                <div class="create-modal-actions">
                    <button class="modal-cancel">Abbrechen</button>
                    <button class="modal-primary">${confirmLabel}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('.modal-primary').addEventListener('click', () => {
            overlay.remove();
            onConfirm();
        });
    }

    // ── Viewport mouse events ──
    let mouseDownPos = null;
    let mouseDownButton = -1;

    renderer.domElement.addEventListener('mousedown', e => {
        if (e.button === 0) {
            mouseDownPos = { x: e.clientX, y: e.clientY };
            mouseDownButton = 0;

            // Check if clicking on a placed object for dragging
            if (!activeTool && selectedId) {
                const hit = getMouseIntersection(e);
                const found = hit ? findPlacedObjectFromHit(hit) : null;
                if (found && found.id === selectedId) {
                    isDragging = true;
                    controls.enabled = false;
                    const groundHit = getGroundIntersection(e);
                    if (groundHit) {
                        dragOffset.set(
                            found.mesh.position.x - snap(groundHit.point.x),
                            0,
                            found.mesh.position.z - snap(groundHit.point.z)
                        );
                    }
                    e.preventDefault();
                }
            }
        }
    });

    renderer.domElement.addEventListener('mousemove', e => {
        // Ghost preview follows cursor
        if (activeTool && ghostMesh) {
            const hit = getGroundIntersection(e);
            if (hit) {
                ghostMesh.position.set(snap(hit.point.x), 0, snap(hit.point.z));
            }
        }

        // Dragging selected object
        if (isDragging && selectedId) {
            const groundHit = getGroundIntersection(e);
            if (groundHit) {
                const obj = placedObjects.find(o => o.id === selectedId);
                if (obj) {
                    obj.mesh.position.x = snap(groundHit.point.x) + dragOffset.x;
                    obj.mesh.position.z = snap(groundHit.point.z) + dragOffset.z;
                    obj.position.x = obj.mesh.position.x;
                    obj.position.z = obj.mesh.position.z;
                    updateSelectionOutline();
                    renderProperties();
                }
            }
        }
    });

    renderer.domElement.addEventListener('mouseup', e => {
        if (e.button === 0 && mouseDownPos) {
            const dx = e.clientX - mouseDownPos.x;
            const dy = e.clientY - mouseDownPos.y;
            const moved = Math.sqrt(dx * dx + dy * dy);

            if (isDragging) {
                isDragging = false;
                controls.enabled = true;
            } else if (moved < 5) {
                // This was a click, not a drag
                handleLeftClick(e);
            }
        }
        mouseDownPos = null;
        mouseDownButton = -1;
    });

    function handleLeftClick(e) {
        if (activeTool) {
            // Place an object
            const groundHit = getGroundIntersection(e);
            if (groundHit) {
                const newObj = addObject(activeTool, groundHit.point);
                if (newObj) {
                    selectObject(newObj.id);
                    // Keep placing same type — re-select palette
                    const type = newObj.type;
                    activeTool = type;
                    paletteEl.querySelector(`[data-type="${type}"]`)?.classList.add('active');
                    updateModeIndicator();
                    createGhost(type);
                }
            }
        } else {
            // Select or deselect
            const hit = getMouseIntersection(e);
            const found = hit ? findPlacedObjectFromHit(hit) : null;
            if (found) {
                selectObject(found.id);
            } else {
                deselectObject();
            }
        }
    }

    // Prevent context menu on viewport
    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

    // ── Keyboard shortcuts ──
    function onKeyDown(e) {
        if (isTestMode) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
            e.preventDefault();
            removeObject(selectedId);
        }

        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            performUndo();
        }

        if (e.ctrlKey && e.key === 'd' && selectedId) {
            e.preventDefault();
            duplicateSelected();
        }

        if (e.key === 'Escape') {
            if (activeTool) {
                activeTool = null;
                paletteEl.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
                removeGhost();
                updateModeIndicator();
            } else {
                deselectObject();
            }
        }
    }

    function duplicateSelected() {
        const obj = placedObjects.find(o => o.id === selectedId);
        if (!obj) return;
        const data = serializeObject(obj);
        data.position.x += 2;
        const newObj = addObjectFromData(data);
        if (newObj) selectObject(newObj.id);
    }

    window.addEventListener('keydown', onKeyDown);

    // ── Settings change handlers ──
    const skyInput = editorEl.querySelector('#set-sky');
    if (skyInput) {
        skyInput.addEventListener('input', e => {
            scene.background = new THREE.Color(e.target.value);
        });
    }

    // ── Toolbar handlers ──
    editorEl.querySelector('#tb-save').addEventListener('click', saveGame);
    editorEl.querySelector('#tb-test').addEventListener('click', enterTestMode);
    editorEl.querySelector('#tb-publish').addEventListener('click', publishGame);
    editorEl.querySelector('#tb-undo').addEventListener('click', performUndo);
    editorEl.querySelector('#tb-exit').addEventListener('click', () => {
        cleanup();
        router.navigate('#/home');
    });
    editorEl.querySelector('#create-back-logo').addEventListener('click', () => {
        cleanup();
        router.navigate('#/home');
    });

    // ── Resize handler ──
    function onResize() {
        if (!renderer || !camera) return;
        const w = viewportEl.clientWidth;
        const h = viewportEl.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // ── Render loop ──
    let clock = new THREE.Clock();

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        const dt = clock.getDelta();

        controls.update();

        // Animate collectibles (subtle bob/rotate)
        placedObjects.forEach(obj => {
            if (['coin','gem','star','key_item','goal'].includes(obj.type)) {
                const t = clock.elapsedTime;
                obj.mesh.rotation.y += dt * 1.5;
                // Small bob
                const baseY = obj.position.y;
                obj.mesh.position.y = baseY + Math.sin(t * 2 + obj.mesh.position.x) * 0.1;
            }
            if (obj.type === 'spawn_point') {
                obj.mesh.rotation.y += dt * 0.8;
            }
            if (obj.type === 'teleporter') {
                obj.mesh.rotation.z += dt * 1.2;
            }
        });

        // Animate selection outline pulse
        if (selectionOutline) {
            const t = clock.elapsedTime;
            selectionOutline.material.opacity = 0.3 + Math.sin(t * 3) * 0.2;
        }

        renderer.render(scene, camera);
    }

    animate();

    // ── Cleanup function ──
    function cleanup() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', onResize);
        if (renderer) renderer.dispose();
        if (controls) controls.dispose();
        // Remove placed objects
        placedObjects.forEach(obj => disposeMesh(obj.mesh));
        placedObjects = [];
        // Remove DOM
        if (editorEl.parentNode) editorEl.remove();
        // Remove any test overlay
        const testOverlay = document.getElementById('test-overlay');
        if (testOverlay) testOverlay.remove();
    }

    // Store cleanup for external use
    renderCreate._cleanup = cleanup;
}
