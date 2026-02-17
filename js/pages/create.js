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
            } else if (template === 'platformer-2d') {
                buildEditorPlatformer2D(container, router, user, editingGameId);
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
            } else if (templateId === 'platformer-2d') {
                buildEditorPlatformer2D(container, router, user, null);
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

// ══════════════════════════════════════════════════════════════════════════
// 2D Platformer Level Editor
// ══════════════════════════════════════════════════════════════════════════

// ── 2D Themes (subset of platformer.js themes) ──
const THEMES_2D = [
    { name: 'Neon',     primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e' },
    { name: 'Lava',     primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00' },
    { name: 'Ocean',    primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e' },
    { name: 'Forest',   primary: '#2d6a4f', secondary: '#95d5b2', bg: '#081c15' },
    { name: 'Candy',    primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012' },
    { name: 'Midnight', primary: '#7b2ff7', secondary: '#c084fc', bg: '#0f0720' },
    { name: 'Retro',    primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e' },
    { name: 'Desert',   primary: '#e9c46a', secondary: '#f4a261', bg: '#1d1306' },
    { name: 'Arctic',   primary: '#a8dadc', secondary: '#f1faee', bg: '#0d1b2a' },
    { name: 'Toxic',    primary: '#aaff00', secondary: '#69ff36', bg: '#0a1500' },
    { name: 'Sunset',   primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510' },
    { name: 'Cyber',    primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b' },
];

// ── 2D Object type definitions ──
const OBJECTS_2D = {
    // Terrain
    platform:   { name: 'Plattform',     icon: '\u2583', cat: 'Terrain',   w: 120, h: 20,  color: '#4488cc' },
    ground:     { name: 'Boden',         icon: '\u2584', cat: 'Terrain',   w: 200, h: 30,  color: '#556644' },
    wall:       { name: 'Wand',          icon: '\u2503', cat: 'Terrain',   w: 20,  h: 80,  color: '#777777' },
    ramp:       { name: 'Rampe',         icon: '\u25e2', cat: 'Terrain',   w: 80,  h: 40,  color: '#998866' },
    // Gefahren
    spike:      { name: 'Stachel',       icon: '\u25b2', cat: 'Gefahren',  w: 20,  h: 20,  color: '#cc3333' },
    lava:       { name: 'Lava',          icon: '\ud83c\udf0b', cat: 'Gefahren',  w: 80,  h: 20,  color: '#ff4400' },
    kill_zone:  { name: 'Kill-Zone',     icon: '\ud83d\udfe5', cat: 'Gefahren',  w: 60,  h: 20,  color: '#ff2222' },
    // Gameplay
    spawn:      { name: 'Spawn',         icon: '\ud83d\udfe2', cat: 'Gameplay',  w: 24,  h: 36,  color: '#33cc33' },
    goal:       { name: 'Ziel',          icon: '\u2b50', cat: 'Gameplay',  w: 30,  h: 40,  color: '#ffcc00' },
    checkpoint: { name: 'Checkpoint',    icon: '\ud83d\udea9', cat: 'Gameplay',  w: 20,  h: 30,  color: '#ff8800' },
    bounce_pad: { name: 'Bounce Pad',    icon: '\u2191', cat: 'Gameplay',  w: 40,  h: 10,  color: '#ff9900' },
    // Items
    coin:       { name: 'Muenze',        icon: '\ud83e\ude99', cat: 'Items',     w: 14,  h: 14,  color: '#ffdd44' },
    gem:        { name: 'Edelstein',     icon: '\ud83d\udc8e', cat: 'Items',     w: 16,  h: 16,  color: '#4488ff' },
    star:       { name: 'Stern',         icon: '\u2b50', cat: 'Items',     w: 18,  h: 18,  color: '#ffaa00' },
    // Gegner
    enemy_patrol: { name: 'Patrouillen-Gegner', icon: '\ud83d\udc7e', cat: 'Gegner', w: 24, h: 24, color: '#cc2222',
        behaviors: { speed: { label: 'Speed', type: 'number', default: 2 }, range: { label: 'Reichweite', type: 'number', default: 100 } } },
    enemy_chase:  { name: 'Verfolger-Gegner',   icon: '\ud83d\udc79', cat: 'Gegner', w: 24, h: 24, color: '#880088',
        behaviors: { speed: { label: 'Speed', type: 'number', default: 3 }, range: { label: 'Reichweite', type: 'number', default: 120 } } },
};

const CATEGORIES_2D = ['Terrain', 'Gefahren', 'Gameplay', 'Items', 'Gegner'];

function buildEditorPlatformer2D(container, router, user, editingGameId) {
    // ── State ──
    let objects2D = [];       // { id, type, x, y, w, h, color, behaviors }
    let selectedId = null;
    let activeTool = null;    // type key from OBJECTS_2D
    let undoStack = [];
    let cameraX = 0;
    let gridSnap = 20;
    let animationFrameId = null;
    let activeTab = 'build'; // 'build' | 'script'

    // Mouse state
    let mouseWorldX = 0;
    let mouseWorldY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragObjOffsetX = 0;
    let dragObjOffsetY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panCameraStart = 0;
    let mouseDownPos = null;

    // Unique ID counter
    let nextId2D = 1;
    function uid2D() { return 'o2d_' + (nextId2D++); }

    // Game settings
    let gameSettings = {
        name: 'Mein Platformer',
        gravity: 1.0,
        scrollSpeed: 1.0,
        theme: { ...THEMES_2D[0] },
    };

    // Load existing game if editing
    if (editingGameId) {
        const saved = loadAllCreated();
        if (saved[editingGameId]) {
            const data = saved[editingGameId];
            if (data.settings) {
                gameSettings = { ...gameSettings, ...data.settings };
                if (data.settings.theme) gameSettings.theme = { ...data.settings.theme };
            }
        }
    }

    // ── Build HTML ──
    container.innerHTML = '';
    const editorEl = document.createElement('div');
    editorEl.className = 'editor-2d';

    const themeOptions = THEMES_2D.map((t, i) =>
        `<option value="${i}" ${t.name === gameSettings.theme.name ? 'selected' : ''}>${t.name}</option>`
    ).join('');

    editorEl.innerHTML = `
        <!-- Toolbar -->
        <div class="editor-toolbar">
            <button class="editor-btn" id="ed2d-back">\u2190 Zurueck</button>
            <div class="editor-toolbar-divider"></div>
            <div class="editor-tabs">
                <button class="editor-tab active" data-tab="build">Build</button>
                <button class="editor-tab" data-tab="script">Script</button>
            </div>
            <div class="editor-toolbar-divider"></div>
            <button class="editor-btn" id="ed2d-undo">Rueckgaengig</button>
            <button class="editor-btn btn-primary" id="ed2d-test">Testen</button>
            <button class="editor-btn" id="ed2d-save">Speichern</button>
            <button class="editor-btn btn-success" id="ed2d-publish">Veroeffentlichen</button>
            <div class="editor-toolbar-spacer"></div>
        </div>

        <!-- Body -->
        <div class="editor-body" id="ed2d-body">
            <!-- Palette -->
            <div class="editor-palette" id="ed2d-palette"></div>
            <!-- Canvas -->
            <div class="editor-canvas-wrap" id="ed2d-canvas-wrap">
                <canvas id="ed2d-canvas"></canvas>
                <div class="editor-mode-indicator" id="ed2d-mode"></div>
                <div class="editor-canvas-hint">Linksklick: Platzieren/Auswaehlen | Rechtsklick+Ziehen: Kamera | Mausrad: Scrollen</div>
            </div>
            <!-- Properties -->
            <div class="editor-props" id="ed2d-props">
                <div class="props-empty">
                    <div class="props-empty-icon">\ud83d\udd27</div>
                    <div>Objekt auswaehlen<br>um Eigenschaften zu bearbeiten</div>
                </div>
            </div>
        </div>

        <!-- Settings Bar -->
        <div class="editor-settings-bar" id="ed2d-settings">
            <div class="settings-field">
                <span class="settings-label">Name:</span>
                <input type="text" class="settings-input" id="ed2d-name" value="${gameSettings.name}" maxlength="40">
            </div>
            <div class="settings-field">
                <span class="settings-label">Gravitation:</span>
                <input type="range" class="settings-input" id="ed2d-gravity" min="0.3" max="2.0" step="0.1" value="${gameSettings.gravity}">
                <span class="settings-label" id="ed2d-gravity-val">${gameSettings.gravity}</span>
            </div>
            <div class="settings-field">
                <span class="settings-label">Scroll-Speed:</span>
                <input type="range" class="settings-input" id="ed2d-speed" min="0.5" max="3.0" step="0.1" value="${gameSettings.scrollSpeed}">
                <span class="settings-label" id="ed2d-speed-val">${gameSettings.scrollSpeed}</span>
            </div>
            <div class="settings-field">
                <span class="settings-label">Theme:</span>
                <select class="settings-input" id="ed2d-theme">${themeOptions}</select>
            </div>
        </div>
    `;
    document.body.appendChild(editorEl);

    // ── DOM Refs ──
    const paletteEl = editorEl.querySelector('#ed2d-palette');
    const canvasWrap = editorEl.querySelector('#ed2d-canvas-wrap');
    const canvas = editorEl.querySelector('#ed2d-canvas');
    const ctx = canvas.getContext('2d');
    const modeIndicator = editorEl.querySelector('#ed2d-mode');
    const propsEl = editorEl.querySelector('#ed2d-props');
    const bodyEl = editorEl.querySelector('#ed2d-body');

    // ── Script editor state ──
    let scriptPlaceholderEl = null;
    let scriptEditorInstance = null;
    let scriptEditorEl = null;

    // ── Build Palette ──
    function buildPalette() {
        let html = '';
        CATEGORIES_2D.forEach(cat => {
            const items = Object.entries(OBJECTS_2D).filter(([, t]) => t.cat === cat);
            if (!items.length) return;
            html += `<div class="palette-cat">${cat}</div>`;
            items.forEach(([key, t]) => {
                html += `<div class="palette-item" data-type="${key}">
                    <span class="palette-item-icon">${t.icon}</span>
                    <span class="palette-item-label">${t.name}</span>
                </div>`;
            });
        });
        paletteEl.innerHTML = html;
    }
    buildPalette();

    // Palette click handler
    paletteEl.addEventListener('click', e => {
        const item = e.target.closest('.palette-item');
        if (!item) return;
        const type = item.dataset.type;
        if (activeTool === type) {
            activeTool = null;
            paletteEl.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
            updateModeIndicator();
            return;
        }
        activeTool = type;
        paletteEl.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        deselectObject2D();
        updateModeIndicator();
    });

    // ── Tab handling ──
    editorEl.querySelectorAll('.editor-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            const tabName = tab.dataset.tab;
            editorEl.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tabName;

            if (tabName === 'script') {
                canvasWrap.style.display = 'none';
                paletteEl.style.display = 'none';
                propsEl.style.display = 'none';
                if (scriptPlaceholderEl) scriptPlaceholderEl.style.display = 'none';
                if (!scriptEditorInstance) {
                    // Lazy-load CSS for the script editor
                    if (!document.querySelector('link[href="css/script-editor.css"]')) {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = 'css/script-editor.css';
                        document.head.appendChild(link);
                    }
                    const { ScriptEditor } = await import('../editor/script-engine.js');
                    scriptEditorEl = document.createElement('div');
                    scriptEditorEl.className = 'script-editor';
                    scriptEditorEl.style.flex = '1';
                    bodyEl.appendChild(scriptEditorEl);
                    scriptEditorInstance = new ScriptEditor(scriptEditorEl, objects2D);
                    scriptEditorInstance.render();
                    // Load pending scripts from a previously loaded game
                    if (loadGame2D._pendingScripts) {
                        scriptEditorInstance.load(loadGame2D._pendingScripts);
                        loadGame2D._pendingScripts = null;
                    }
                } else {
                    // Refresh object selects in case objects changed in Build tab
                    scriptEditorInstance.refreshObjectSelects();
                }
                if (scriptEditorEl) scriptEditorEl.style.display = 'flex';
            } else {
                canvasWrap.style.display = '';
                paletteEl.style.display = '';
                propsEl.style.display = '';
                if (scriptPlaceholderEl) scriptPlaceholderEl.style.display = 'none';
                if (scriptEditorEl) scriptEditorEl.style.display = 'none';
            }
        });
    });

    // ── Mode indicator ──
    function updateModeIndicator() {
        if (activeTool) {
            modeIndicator.textContent = 'Platzieren: ' + OBJECTS_2D[activeTool].name;
            modeIndicator.classList.add('visible');
        } else {
            modeIndicator.classList.remove('visible');
        }
    }

    // ── Canvas sizing ──
    function resizeCanvas() {
        const rect = canvasWrap.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }
    resizeCanvas();

    // ── Coordinate helpers ──
    function canvasToWorld(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) + cameraX,
            y: (e.clientY - rect.top),
        };
    }

    function snapVal(v) {
        return Math.round(v / gridSnap) * gridSnap;
    }

    // ── Object management ──
    function addObject2D(type, x, y) {
        const def = OBJECTS_2D[type];
        if (!def) return null;
        const obj = {
            id: uid2D(),
            type,
            x: snapVal(x - def.w / 2),
            y: snapVal(y - def.h / 2),
            w: def.w,
            h: def.h,
            color: def.color,
            behaviors: {},
        };
        if (def.behaviors) {
            for (const [key, beh] of Object.entries(def.behaviors)) {
                obj.behaviors[key] = beh.default;
            }
        }
        objects2D.push(obj);
        pushUndo2D({ action: 'add', id: obj.id, data: { ...obj } });
        return obj;
    }

    function removeObject2D(id) {
        const idx = objects2D.findIndex(o => o.id === id);
        if (idx < 0) return;
        const obj = objects2D[idx];
        pushUndo2D({ action: 'remove', id: obj.id, data: { ...obj } });
        objects2D.splice(idx, 1);
        if (selectedId === id) {
            selectedId = null;
            renderProperties2D();
        }
    }

    function selectObject2D(id) {
        selectedId = id;
        activeTool = null;
        paletteEl.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
        updateModeIndicator();
        renderProperties2D();
    }

    function deselectObject2D() {
        selectedId = null;
        renderProperties2D();
    }

    function findObjectAt(wx, wy) {
        // Reverse order so top-most (last placed) is found first
        for (let i = objects2D.length - 1; i >= 0; i--) {
            const o = objects2D[i];
            if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) {
                return o;
            }
        }
        return null;
    }

    // ── Undo system ──
    function pushUndo2D(entry) {
        undoStack.push(entry);
        if (undoStack.length > 50) undoStack.shift();
    }

    function performUndo2D() {
        if (!undoStack.length) return;
        const entry = undoStack.pop();
        if (entry.action === 'add') {
            const idx = objects2D.findIndex(o => o.id === entry.id);
            if (idx >= 0) {
                objects2D.splice(idx, 1);
                if (selectedId === entry.id) { selectedId = null; renderProperties2D(); }
            }
        } else if (entry.action === 'remove') {
            objects2D.push({ ...entry.data });
        } else if (entry.action === 'move') {
            const obj = objects2D.find(o => o.id === entry.id);
            if (obj) {
                obj.x = entry.oldX;
                obj.y = entry.oldY;
                renderProperties2D();
            }
        }
    }

    // ── Properties Panel ──
    function renderProperties2D() {
        if (!selectedId) {
            propsEl.innerHTML = `<div class="props-empty"><div class="props-empty-icon">\ud83d\udd27</div><div>Objekt auswaehlen<br>um Eigenschaften zu bearbeiten</div></div>`;
            return;
        }
        const obj = objects2D.find(o => o.id === selectedId);
        if (!obj) { propsEl.innerHTML = ''; return; }

        const def = OBJECTS_2D[obj.type];
        let html = '';

        html += `<div class="props-title">${def.icon} ${def.name}</div>`;

        // Position
        html += `<div class="props-group"><div class="props-group-label">Position</div>`;
        html += `<div class="props-row"><span class="props-label">X</span><input type="number" class="props-input" id="p2d-x" value="${obj.x}" step="${gridSnap}"></div>`;
        html += `<div class="props-row"><span class="props-label">Y</span><input type="number" class="props-input" id="p2d-y" value="${obj.y}" step="${gridSnap}"></div>`;
        html += `</div>`;

        // Size
        html += `<div class="props-group"><div class="props-group-label">Groesse</div>`;
        html += `<div class="props-row"><span class="props-label">Breite</span><input type="number" class="props-input" id="p2d-w" value="${obj.w}" step="${gridSnap}" min="10"></div>`;
        html += `<div class="props-row"><span class="props-label">Hoehe</span><input type="number" class="props-input" id="p2d-h" value="${obj.h}" step="${gridSnap}" min="10"></div>`;
        html += `</div>`;

        // Color
        html += `<div class="props-group"><div class="props-group-label">Farbe</div>`;
        html += `<div class="props-row"><span class="props-label">C</span><input type="color" class="props-input" id="p2d-color" value="${obj.color}"></div>`;
        html += `</div>`;

        // Behaviors
        if (def.behaviors) {
            html += `<div class="props-group"><div class="props-group-label">Verhalten</div>`;
            for (const [key, beh] of Object.entries(def.behaviors)) {
                const val = obj.behaviors[key] !== undefined ? obj.behaviors[key] : beh.default;
                html += `<div class="props-row"><span class="props-label">${beh.label}</span><input type="${beh.type}" class="props-input" data-beh="${key}" value="${val}" step="0.1"></div>`;
            }
            html += `</div>`;
        }

        // Delete
        html += `<div class="props-group"><button class="props-delete-btn" id="p2d-delete">Objekt loeschen</button></div>`;

        propsEl.innerHTML = html;

        // Bind events
        const xInput = propsEl.querySelector('#p2d-x');
        const yInput = propsEl.querySelector('#p2d-y');
        const wInput = propsEl.querySelector('#p2d-w');
        const hInput = propsEl.querySelector('#p2d-h');
        const colorInput = propsEl.querySelector('#p2d-color');

        if (xInput) xInput.addEventListener('input', e => { obj.x = parseFloat(e.target.value) || 0; });
        if (yInput) yInput.addEventListener('input', e => { obj.y = parseFloat(e.target.value) || 0; });
        if (wInput) wInput.addEventListener('input', e => { obj.w = Math.max(10, parseFloat(e.target.value) || 10); });
        if (hInput) hInput.addEventListener('input', e => { obj.h = Math.max(10, parseFloat(e.target.value) || 10); });
        if (colorInput) colorInput.addEventListener('input', e => { obj.color = e.target.value; });

        // Behavior inputs
        propsEl.querySelectorAll('[data-beh]').forEach(input => {
            input.addEventListener('input', e => {
                const key = e.target.dataset.beh;
                const beh = def.behaviors[key];
                obj.behaviors[key] = beh.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            });
        });

        // Delete button
        const delBtn = propsEl.querySelector('#p2d-delete');
        if (delBtn) delBtn.addEventListener('click', () => removeObject2D(obj.id));
    }

    // ── Canvas Rendering ──
    function renderCanvas() {
        const W = canvas.width / window.devicePixelRatio;
        const H = canvas.height / window.devicePixelRatio;

        ctx.save();
        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = gameSettings.theme.bg;
        ctx.fillRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 0.5;
        const startX = Math.floor(cameraX / gridSnap) * gridSnap;
        for (let gx = startX; gx < cameraX + W + gridSnap; gx += gridSnap) {
            const sx = gx - cameraX;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, H);
            ctx.stroke();
        }
        for (let gy = 0; gy < H; gy += gridSnap) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(W, gy);
            ctx.stroke();
        }

        // Draw objects
        ctx.save();
        ctx.translate(-cameraX, 0);

        for (const obj of objects2D) {
            // Culling
            if (obj.x + obj.w < cameraX - 50 || obj.x > cameraX + W + 50) continue;
            drawObject2D(ctx, obj, 1.0);
        }

        // Selection highlight
        if (selectedId) {
            const sel = objects2D.find(o => o.id === selectedId);
            if (sel) {
                ctx.strokeStyle = '#33ff66';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(sel.x - 2, sel.y - 2, sel.w + 4, sel.h + 4);
                ctx.setLineDash([]);
            }
        }

        ctx.restore();

        // Ghost preview (drawn in screen coordinates)
        if (activeTool && OBJECTS_2D[activeTool]) {
            const def = OBJECTS_2D[activeTool];
            const gx = snapVal(mouseWorldX - def.w / 2);
            const gy = snapVal(mouseWorldY - def.h / 2);
            ctx.save();
            ctx.translate(-cameraX, 0);
            ctx.globalAlpha = 0.4;
            drawObject2D(ctx, { type: activeTool, x: gx, y: gy, w: def.w, h: def.h, color: def.color, behaviors: {} }, 0.4);
            ctx.globalAlpha = 1.0;
            ctx.restore();
        }

        ctx.restore();
    }

    function drawObject2D(ctx, obj, alpha) {
        const { type, x, y, w, h, color } = obj;
        const theme = gameSettings.theme;

        switch (type) {
            case 'platform':
            case 'ground': {
                // Solid fill + 4px accent bar on top + 3px side accents
                ctx.fillStyle = theme.secondary;
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = theme.primary;
                ctx.fillRect(x, y, w, 4);
                ctx.fillStyle = theme.primary + '60';
                ctx.fillRect(x, y, 3, h);
                ctx.fillRect(x + w - 3, y, 3, h);
                break;
            }
            case 'wall': {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = theme.primary + '40';
                ctx.fillRect(x, y, w, 3);
                ctx.fillRect(x, y + h - 3, w, 3);
                break;
            }
            case 'ramp': {
                // Right triangle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(x, y + h);
                ctx.lineTo(x + w, y + h);
                ctx.lineTo(x + w, y);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'spike': {
                // Triangle pointing up
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(x + w / 2, y);
                ctx.lineTo(x, y + h);
                ctx.lineTo(x + w, y + h);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'lava':
            case 'kill_zone': {
                // Glow effect (larger semi-transparent rect behind)
                ctx.fillStyle = color + '30';
                ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                break;
            }
            case 'spawn': {
                // Semi-transparent rect with border + "S" letter
                ctx.fillStyle = color + '44';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('S', x + w / 2, y + h / 2);
                break;
            }
            case 'goal': {
                // Solid rect with star symbol
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\u2605', x + w / 2, y + h / 2);
                break;
            }
            case 'checkpoint': {
                ctx.fillStyle = color + '66';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                // Small flag
                ctx.fillStyle = color;
                ctx.fillRect(x + 2, y + 2, w - 4, h / 3);
                break;
            }
            case 'bounce_pad': {
                // Rect with arrows
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\u2191\u2191\u2191', x + w / 2, y + h / 2);
                break;
            }
            case 'coin':
            case 'gem':
            case 'star': {
                // Circle with shine dot
                const cx = x + w / 2;
                const cy = y + h / 2;
                const r = Math.min(w, h) / 2;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
                // Shine dot
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'enemy_patrol':
            case 'enemy_chase': {
                // Rect body
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                // White eyes with black pupils
                const eyeW = w * 0.25;
                const eyeH = h * 0.25;
                const eyeY = y + h * 0.25;
                // Left eye
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x + w * 0.15, eyeY, eyeW, eyeH);
                // Right eye
                ctx.fillRect(x + w * 0.6, eyeY, eyeW, eyeH);
                // Pupils
                ctx.fillStyle = '#000000';
                const pupilW = eyeW * 0.5;
                const pupilH = eyeH * 0.5;
                ctx.fillRect(x + w * 0.15 + eyeW * 0.25, eyeY + eyeH * 0.25, pupilW, pupilH);
                ctx.fillRect(x + w * 0.6 + eyeW * 0.25, eyeY + eyeH * 0.25, pupilW, pupilH);

                // Patrol enemies show dashed range indicator
                if (type === 'enemy_patrol' && obj.behaviors && obj.behaviors.range) {
                    const range = obj.behaviors.range || 100;
                    ctx.strokeStyle = color + '55';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(x + w / 2 - range / 2, y + h / 2);
                    ctx.lineTo(x + w / 2 + range / 2, y + h / 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                break;
            }
            default: {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                break;
            }
        }
    }

    // ── Render loop ──
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        renderCanvas();
    }
    animate();

    // ── Mouse Interaction ──
    canvas.addEventListener('mousedown', e => {
        const world = canvasToWorld(e);

        if (e.button === 2) {
            // Right click: pan
            isPanning = true;
            panStartX = e.clientX;
            panCameraStart = cameraX;
            e.preventDefault();
            return;
        }

        if (e.button === 0) {
            mouseDownPos = { x: e.clientX, y: e.clientY };

            if (activeTool) {
                // Place object
                const toolType = activeTool;
                const newObj = addObject2D(toolType, world.x, world.y);
                if (newObj) {
                    // Select object but keep tool active for continued placement
                    selectedId = newObj.id;
                    renderProperties2D();
                    // Restore tool
                    activeTool = toolType;
                    paletteEl.querySelector(`[data-type="${toolType}"]`)?.classList.add('active');
                    updateModeIndicator();
                }
            } else {
                // Select or start drag
                const hit = findObjectAt(world.x, world.y);
                if (hit) {
                    if (selectedId === hit.id) {
                        // Start dragging selected object
                        isDragging = true;
                        dragStartX = hit.x;
                        dragStartY = hit.y;
                        dragObjOffsetX = world.x - hit.x;
                        dragObjOffsetY = world.y - hit.y;
                    } else {
                        selectObject2D(hit.id);
                        // Prepare for potential drag
                        isDragging = true;
                        dragStartX = hit.x;
                        dragStartY = hit.y;
                        dragObjOffsetX = world.x - hit.x;
                        dragObjOffsetY = world.y - hit.y;
                    }
                } else {
                    deselectObject2D();
                }
            }
        }
    });

    canvas.addEventListener('mousemove', e => {
        const world = canvasToWorld(e);
        mouseWorldX = world.x;
        mouseWorldY = world.y;

        if (isPanning) {
            const dx = e.clientX - panStartX;
            cameraX = panCameraStart - dx;
            return;
        }

        if (isDragging && selectedId) {
            const obj = objects2D.find(o => o.id === selectedId);
            if (obj) {
                obj.x = snapVal(world.x - dragObjOffsetX);
                obj.y = snapVal(world.y - dragObjOffsetY);
                renderProperties2D();
            }
        }
    });

    canvas.addEventListener('mouseup', e => {
        if (isPanning) {
            isPanning = false;
            return;
        }

        if (isDragging && selectedId) {
            const obj = objects2D.find(o => o.id === selectedId);
            if (obj && (obj.x !== dragStartX || obj.y !== dragStartY)) {
                pushUndo2D({ action: 'move', id: obj.id, oldX: dragStartX, oldY: dragStartY, newX: obj.x, newY: obj.y });
            }
            isDragging = false;
        }

        mouseDownPos = null;
    });

    // Mouse wheel: scroll camera horizontally
    canvas.addEventListener('wheel', e => {
        cameraX += e.deltaY;
        e.preventDefault();
    }, { passive: false });

    // Prevent context menu
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ── Keyboard shortcuts ──
    function onKeyDown2D(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
            e.preventDefault();
            removeObject2D(selectedId);
        }

        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            performUndo2D();
        }

        if (e.ctrlKey && e.key === 'd' && selectedId) {
            e.preventDefault();
            const obj = objects2D.find(o => o.id === selectedId);
            if (obj) {
                const dup = {
                    id: uid2D(),
                    type: obj.type,
                    x: obj.x + 40,
                    y: obj.y,
                    w: obj.w,
                    h: obj.h,
                    color: obj.color,
                    behaviors: { ...obj.behaviors },
                };
                objects2D.push(dup);
                pushUndo2D({ action: 'add', id: dup.id, data: { ...dup } });
                selectObject2D(dup.id);
            }
        }

        if (e.key === 'Escape') {
            if (activeTool) {
                activeTool = null;
                paletteEl.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
                updateModeIndicator();
            } else {
                deselectObject2D();
            }
        }
    }
    window.addEventListener('keydown', onKeyDown2D);

    // ── Settings change handlers ──
    const gravityInput = editorEl.querySelector('#ed2d-gravity');
    const gravityVal = editorEl.querySelector('#ed2d-gravity-val');
    const speedInput = editorEl.querySelector('#ed2d-speed');
    const speedVal = editorEl.querySelector('#ed2d-speed-val');
    const themeInput = editorEl.querySelector('#ed2d-theme');
    const nameInput = editorEl.querySelector('#ed2d-name');

    if (gravityInput) gravityInput.addEventListener('input', e => {
        gameSettings.gravity = parseFloat(e.target.value);
        if (gravityVal) gravityVal.textContent = gameSettings.gravity.toFixed(1);
    });
    if (speedInput) speedInput.addEventListener('input', e => {
        gameSettings.scrollSpeed = parseFloat(e.target.value);
        if (speedVal) speedVal.textContent = gameSettings.scrollSpeed.toFixed(1);
    });
    if (themeInput) themeInput.addEventListener('change', e => {
        const idx = parseInt(e.target.value);
        if (THEMES_2D[idx]) gameSettings.theme = { ...THEMES_2D[idx] };
    });
    if (nameInput) nameInput.addEventListener('input', e => {
        gameSettings.name = e.target.value.slice(0, 40);
    });

    // ── Save/Load ──
    function readSettings2D() {
        return {
            name: gameSettings.name,
            gravity: gameSettings.gravity,
            scrollSpeed: gameSettings.scrollSpeed,
            theme: { ...gameSettings.theme },
        };
    }

    function serializeObjects2D() {
        return objects2D.map(o => ({
            type: o.type,
            x: o.x,
            y: o.y,
            w: o.w,
            h: o.h,
            color: o.color,
            behaviors: { ...o.behaviors },
        }));
    }

    function saveGame2D() {
        const settings = readSettings2D();
        const objects = serializeObjects2D();
        const id = editingGameId || 'game_' + Date.now();
        const all = loadAllCreated();

        all[id] = {
            name: settings.name,
            template: 'platformer-2d',
            type: 'platformer',
            objects,
            settings,
            scripts: scriptEditorInstance ? scriptEditorInstance.serialize() : null,
            createdAt: all[id]?.createdAt || Date.now(),
            updatedAt: Date.now(),
            published: all[id]?.published || false,
            creatorId: user.id,
            creatorName: user.name,
        };

        saveAllCreated(all);
        editingGameId = id;
        showToast2D('Gespeichert!', 'success');
        return id;
    }

    function loadGame2D(gameId) {
        const all = loadAllCreated();
        const data = all[gameId];
        if (!data || data.template !== 'platformer-2d') return false;

        objects2D = [];
        if (data.objects) {
            data.objects.forEach(o => {
                objects2D.push({
                    id: uid2D(),
                    type: o.type,
                    x: o.x,
                    y: o.y,
                    w: o.w,
                    h: o.h,
                    color: o.color,
                    behaviors: { ...o.behaviors },
                });
            });
        }
        if (data.settings) {
            gameSettings.name = data.settings.name || 'Mein Platformer';
            gameSettings.gravity = data.settings.gravity || 1.0;
            gameSettings.scrollSpeed = data.settings.scrollSpeed || 1.0;
            if (data.settings.theme) gameSettings.theme = { ...data.settings.theme };

            // Update DOM inputs
            if (nameInput) nameInput.value = gameSettings.name;
            if (gravityInput) { gravityInput.value = gameSettings.gravity; if (gravityVal) gravityVal.textContent = gameSettings.gravity.toFixed(1); }
            if (speedInput) { speedInput.value = gameSettings.scrollSpeed; if (speedVal) speedVal.textContent = gameSettings.scrollSpeed.toFixed(1); }
            if (themeInput) {
                const idx = THEMES_2D.findIndex(t => t.name === gameSettings.theme.name);
                if (idx >= 0) themeInput.value = idx;
            }
        }
        // Restore scripts if the script editor is already initialized
        if (data.scripts && scriptEditorInstance) {
            scriptEditorInstance.load(data.scripts);
        }
        // Store scripts data for lazy loading (script editor may not exist yet)
        if (data.scripts) {
            loadGame2D._pendingScripts = data.scripts;
        }
        return true;
    }

    // Load existing if editing
    if (editingGameId) {
        loadGame2D(editingGameId);
    }

    // ── Toast ──
    function showToast2D(msg, type = '') {
        const toast = document.createElement('div');
        toast.className = 'create-toast' + (type ? ' toast-' + type : '');
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2600);
    }

    // ── Modal ──
    function showModal2D(title, text, confirmLabel, onConfirm) {
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

    // ── Publish ──
    function publishGame2D() {
        const hasSpawn = objects2D.some(o => o.type === 'spawn');
        if (!hasSpawn) {
            showToast2D('Du brauchst mindestens einen Spawn-Punkt!', 'error');
            return;
        }
        if (objects2D.length < 3) {
            showToast2D('Fuege mehr Objekte hinzu (mindestens 3)!', 'error');
            return;
        }

        showModal2D(
            'Spiel veroeffentlichen?',
            `Dein Spiel "${gameSettings.name}" wird im Katalog fuer alle sichtbar.`,
            'Veroeffentlichen',
            () => {
                const id = saveGame2D();
                const all = loadAllCreated();
                all[id].published = true;
                saveAllCreated(all);
                showToast2D('Spiel veroeffentlicht! Es ist jetzt im Katalog.', 'success');
            }
        );
    }

    // ── Toolbar handlers ──
    editorEl.querySelector('#ed2d-back').addEventListener('click', () => {
        cleanup2D();
        router.navigate('#/home');
    });
    editorEl.querySelector('#ed2d-undo').addEventListener('click', performUndo2D);
    editorEl.querySelector('#ed2d-test').addEventListener('click', async () => {
        saveGame2D();

        // ── Create fullscreen test overlay ──
        const overlay = document.createElement('div');
        overlay.className = 'editor-test-overlay';

        const bar = document.createElement('div');
        bar.className = 'editor-test-bar';
        bar.innerHTML = '<span>Test-Modus</span>';
        const exitBtn = document.createElement('button');
        exitBtn.textContent = 'Beenden (ESC)';
        bar.appendChild(exitBtn);

        const testCanvas = document.createElement('canvas');
        testCanvas.style.flex = '1';
        testCanvas.style.display = 'block';

        overlay.appendChild(bar);
        overlay.appendChild(testCanvas);
        document.body.appendChild(overlay);

        // Size the canvas to fill available space
        function sizeTestCanvas() {
            const barH = bar.offsetHeight;
            testCanvas.width = window.innerWidth;
            testCanvas.height = window.innerHeight - barH;
        }
        sizeTestCanvas();

        let testGame = null;
        let testResizeHandler = null;
        let testKeyHandler = null;

        function closeTestMode() {
            if (testGame) { testGame.stop(); testGame = null; }
            if (testResizeHandler) window.removeEventListener('resize', testResizeHandler);
            if (testKeyHandler) window.removeEventListener('keydown', testKeyHandler);
            overlay.remove();
        }

        // ESC to close
        testKeyHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeTestMode();
            }
        };
        window.addEventListener('keydown', testKeyHandler);

        // Button to close
        exitBtn.addEventListener('click', closeTestMode);

        // Resize handling
        testResizeHandler = () => sizeTestCanvas();
        window.addEventListener('resize', testResizeHandler);

        // Dynamically import and start the custom platformer
        try {
            const { CustomPlatformer2D } = await import('../games/templates/custom-platformer-2d.js');
            testGame = new CustomPlatformer2D(testCanvas, {
                theme: { ...gameSettings.theme },
                gravity: gameSettings.gravity,
                scrollSpeed: gameSettings.scrollSpeed,
                objects: objects2D.map(o => ({ ...o, behaviors: { ...o.behaviors } })),
            });
            testGame.start();
            testGame.onWin = () => {
                showToast2D('Ziel erreicht!', 'success');
            };
        } catch (err) {
            console.error('Test mode failed:', err);
            showToast2D('Fehler beim Starten des Test-Modus', '');
            closeTestMode();
        }
    });
    editorEl.querySelector('#ed2d-save').addEventListener('click', saveGame2D);
    editorEl.querySelector('#ed2d-publish').addEventListener('click', publishGame2D);

    // ── Resize handler ──
    function onResize2D() {
        resizeCanvas();
    }
    window.addEventListener('resize', onResize2D);

    // ── Cleanup ──
    function cleanup2D() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener('keydown', onKeyDown2D);
        window.removeEventListener('resize', onResize2D);
        if (scriptEditorInstance) {
            scriptEditorInstance.destroy();
            scriptEditorInstance = null;
            scriptEditorEl = null;
        }
        if (editorEl.parentNode) editorEl.remove();
    }

    renderCreate._cleanup = cleanup2D;
}
