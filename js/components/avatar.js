// js/components/avatar.js
// 3D blocky avatar system using Three.js — Roblox/Minecraft style
// Also retains 2D fallback for performance-sensitive contexts (lists, etc.)

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Active renderer tracking (limit ~3 active) ───────────────────────
const activeRenderers = new Set();

function trackRenderer(renderer) {
    activeRenderers.add(renderer);
}

function untrackRenderer(renderer) {
    activeRenderers.delete(renderer);
}

// ─── Hair color palette ───────────────────────────────────────────────
const HAIR_COLORS = [
    null,        // 0: no hair
    '#3d2b1f',   // 1: short  — dark brown
    '#1a1a2e',   // 2: long   — near black
    '#e94560',   // 3: mohawk — red/pink
    '#f5a623',   // 4: curly  — golden
    '#6c63ff',   // 5: cap    — accent purple
];

// ─── Helper: darken hex color ─────────────────────────────────────────
function darken(hex, amount) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Helper: create material ──────────────────────────────────────────
function mat(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
}

function matFlat(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 });
}

// ─── Build 3D Character ───────────────────────────────────────────────
function buildCharacter(config) {
    const {
        skin = '#ffb347',
        shirt = '#6c63ff',
        pants = '#333333',
        hair = 0,
        accessory = 0
    } = config || {};

    const group = new THREE.Group();
    const disposables = []; // track geometries & materials for cleanup

    function addMesh(geometry, material, position) {
        disposables.push(geometry, material);
        const mesh = new THREE.Mesh(geometry, material);
        if (position) mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
        group.add(mesh);
        return mesh;
    }

    // ── Head ──
    const headGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const headMat = mat(skin);
    const head = addMesh(headGeo, headMat, { y: 3.05 });

    // ── Face details (on front of head) ──
    // Eyes — white backing
    const eyeWhiteGeo = new THREE.PlaneGeometry(0.22, 0.18);
    const eyeWhiteMat = matFlat('#ffffff');
    disposables.push(eyeWhiteGeo, eyeWhiteMat);

    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    leftEyeWhite.position.set(-0.22, 3.1, 0.601);
    group.add(leftEyeWhite);

    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo.clone(), eyeWhiteMat);
    rightEyeWhite.position.set(0.22, 3.1, 0.601);
    group.add(rightEyeWhite);

    // Pupils
    const pupilGeo = new THREE.PlaneGeometry(0.12, 0.12);
    const pupilMat = matFlat('#222222');
    disposables.push(pupilGeo, pupilMat);

    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.2, 3.08, 0.602);
    group.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeo.clone(), pupilMat);
    rightPupil.position.set(0.24, 3.08, 0.602);
    group.add(rightPupil);

    // Mouth
    const mouthGeo = new THREE.PlaneGeometry(0.3, 0.08);
    const mouthMat = matFlat(darken(skin, 40));
    disposables.push(mouthGeo, mouthMat);

    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 2.7, 0.601);
    group.add(mouth);

    // Small smile lines
    const smileGeo = new THREE.PlaneGeometry(0.06, 0.06);
    const smileMat = matFlat(darken(skin, 30));
    disposables.push(smileGeo, smileMat);

    const smileL = new THREE.Mesh(smileGeo, smileMat);
    smileL.position.set(-0.17, 2.72, 0.601);
    group.add(smileL);

    const smileR = new THREE.Mesh(smileGeo.clone(), smileMat);
    smileR.position.set(0.17, 2.72, 0.601);
    group.add(smileR);

    // ── Torso ──
    addMesh(
        new THREE.BoxGeometry(1.2, 1.5, 0.7),
        mat(shirt),
        { y: 1.7 }
    );

    // Shirt collar detail
    addMesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.72),
        mat(darken(shirt, 25)),
        { y: 2.4 }
    );

    // ── Right Arm ──
    addMesh(
        new THREE.BoxGeometry(0.5, 1.4, 0.5),
        mat(skin),
        { x: 0.85, y: 1.75 }
    );

    // Right hand (darker)
    addMesh(
        new THREE.BoxGeometry(0.5, 0.25, 0.5),
        mat(darken(skin, 18)),
        { x: 0.85, y: 1.12 }
    );

    // ── Left Arm ──
    addMesh(
        new THREE.BoxGeometry(0.5, 1.4, 0.5),
        mat(skin),
        { x: -0.85, y: 1.75 }
    );

    // Left hand (darker)
    addMesh(
        new THREE.BoxGeometry(0.5, 0.25, 0.5),
        mat(darken(skin, 18)),
        { x: -0.85, y: 1.12 }
    );

    // ── Right Leg ──
    addMesh(
        new THREE.BoxGeometry(0.5, 1.4, 0.5),
        mat(pants),
        { x: 0.3, y: 0.25 }
    );

    // Right shoe
    addMesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.55),
        mat(darken(pants, 35)),
        { x: 0.3, y: -0.35 }
    );

    // ── Left Leg ──
    addMesh(
        new THREE.BoxGeometry(0.5, 1.4, 0.5),
        mat(pants),
        { x: -0.3, y: 0.25 }
    );

    // Left shoe
    addMesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.55),
        mat(darken(pants, 35)),
        { x: -0.3, y: -0.35 }
    );

    // ── Hair ──
    buildHair(group, hair, disposables);

    // ── Accessory ──
    buildAccessory(group, accessory, disposables);

    // Center the character vertically so it sits nicely
    group.position.y = -1.5;

    return { group, disposables };
}

// ─── Hair Styles ──────────────────────────────────────────────────────
function buildHair(group, hairStyle, disposables) {
    if (hairStyle === 0) return;

    const hairColor = HAIR_COLORS[hairStyle] || '#3d2b1f';
    const hMat = mat(hairColor);
    disposables.push(hMat);

    function add(geo, pos) {
        disposables.push(geo);
        const mesh = new THREE.Mesh(geo, hMat);
        mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
        group.add(mesh);
        return mesh;
    }

    const headTop = 3.65; // top of head
    const headY = 3.05;

    switch (hairStyle) {
        case 1: // Short — flat box on top of head, slightly wider
            add(new THREE.BoxGeometry(1.35, 0.25, 1.35), { y: headTop + 0.05 });
            // Small side tufts
            add(new THREE.BoxGeometry(0.15, 0.4, 1.25), { x: -0.65, y: headTop - 0.15 });
            add(new THREE.BoxGeometry(0.15, 0.4, 1.25), { x: 0.65, y: headTop - 0.15 });
            break;

        case 2: // Long — extends from top down past head
            add(new THREE.BoxGeometry(1.35, 0.3, 1.35), { y: headTop + 0.05 });
            // Side curtains hanging down
            add(new THREE.BoxGeometry(0.18, 1.3, 1.3), { x: -0.68, y: headY - 0.1 });
            add(new THREE.BoxGeometry(0.18, 1.3, 1.3), { x: 0.68, y: headY - 0.1 });
            // Back hair
            add(new THREE.BoxGeometry(1.35, 1.4, 0.18), { z: -0.68, y: headY - 0.15 });
            break;

        case 3: // Mohawk — thin tall strip on top center
            add(new THREE.BoxGeometry(0.25, 0.9, 1.0), { y: headTop + 0.4 });
            add(new THREE.BoxGeometry(0.2, 0.6, 0.6), { y: headTop + 0.75 });
            break;

        case 4: // Curly — multiple small cubes on top
            const curlSize = 0.28;
            const curlPositions = [
                { x: -0.35, y: headTop + 0.18, z: -0.35 },
                { x: 0.0, y: headTop + 0.25, z: -0.4 },
                { x: 0.35, y: headTop + 0.18, z: -0.35 },
                { x: -0.4, y: headTop + 0.2, z: 0.0 },
                { x: 0.0, y: headTop + 0.3, z: 0.0 },
                { x: 0.4, y: headTop + 0.2, z: 0.0 },
                { x: -0.35, y: headTop + 0.18, z: 0.35 },
                { x: 0.0, y: headTop + 0.25, z: 0.4 },
                { x: 0.35, y: headTop + 0.18, z: 0.35 },
                // Lower side curls
                { x: -0.6, y: headY + 0.2, z: 0.0 },
                { x: 0.6, y: headY + 0.2, z: 0.0 },
            ];
            curlPositions.forEach(pos => {
                add(new THREE.BoxGeometry(curlSize, curlSize, curlSize), pos);
            });
            break;

        case 5: { // Cap — baseball cap style
            const capMat = mat('#e94560');
            disposables.push(capMat);

            // Cap dome
            const capGeo = new THREE.BoxGeometry(1.35, 0.35, 1.35);
            disposables.push(capGeo);
            const cap = new THREE.Mesh(capGeo, capMat);
            cap.position.set(0, headTop + 0.05, 0);
            group.add(cap);

            // Brim (front)
            const brimGeo = new THREE.BoxGeometry(1.3, 0.08, 0.5);
            disposables.push(brimGeo);
            const brim = new THREE.Mesh(brimGeo, capMat);
            brim.position.set(0, headTop - 0.18, 0.7);
            group.add(brim);

            // Hair peeking out
            add(new THREE.BoxGeometry(0.15, 0.35, 1.2), { x: -0.62, y: headY + 0.15 });
            add(new THREE.BoxGeometry(0.15, 0.35, 1.2), { x: 0.62, y: headY + 0.15 });
            break;
        }
    }
}

// ─── Accessory Styles ─────────────────────────────────────────────────
function buildAccessory(group, accessory, disposables) {
    if (accessory === 0) return;

    const headTop = 3.65;
    const headY = 3.05;

    function add(geo, material, pos) {
        disposables.push(geo, material);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
        group.add(mesh);
        return mesh;
    }

    switch (accessory) {
        case 1: { // Hat — cylinder top hat
            const hatMat = mat('#2d2d44');
            const bandMat = mat('#e94560');

            // Brim
            add(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 16), hatMat, { y: headTop + 0.1 });
            // Crown
            add(new THREE.CylinderGeometry(0.55, 0.55, 0.8, 16), hatMat, { y: headTop + 0.55 });
            // Band
            add(new THREE.CylinderGeometry(0.57, 0.57, 0.12, 16), bandMat, { y: headTop + 0.22 });
            break;
        }

        case 2: { // Glasses — rectangular frames on face
            const frameMat = mat('#222222');
            const lensMat = new THREE.MeshStandardMaterial({
                color: '#88ccff',
                transparent: true,
                opacity: 0.35,
                roughness: 0.3,
                metalness: 0.1,
            });
            disposables.push(lensMat);

            const fz = 0.62; // z position (front of head)

            // Left lens frame
            add(new THREE.BoxGeometry(0.32, 0.24, 0.05), frameMat, { x: -0.25, y: headY + 0.1, z: fz });
            // Right lens frame
            add(new THREE.BoxGeometry(0.32, 0.24, 0.05), frameMat, { x: 0.25, y: headY + 0.1, z: fz });
            // Bridge
            add(new THREE.BoxGeometry(0.18, 0.05, 0.05), frameMat, { x: 0, y: headY + 0.12, z: fz });
            // Left arm
            add(new THREE.BoxGeometry(0.05, 0.05, 0.6), frameMat, { x: -0.42, y: headY + 0.12, z: 0.32 });
            // Right arm
            add(new THREE.BoxGeometry(0.05, 0.05, 0.6), frameMat, { x: 0.42, y: headY + 0.12, z: 0.32 });

            // Lens fills
            add(new THREE.PlaneGeometry(0.28, 0.2), lensMat, { x: -0.25, y: headY + 0.1, z: fz + 0.026 });
            add(new THREE.PlaneGeometry(0.28, 0.2), lensMat, { x: 0.25, y: headY + 0.1, z: fz + 0.026 });
            break;
        }

        case 3: { // Headband — thin band around head
            const bandMat = mat('#ff6b6b');

            // Front
            add(new THREE.BoxGeometry(1.25, 0.15, 0.05), bandMat, { y: headY + 0.35, z: 0.6 });
            // Back
            add(new THREE.BoxGeometry(1.25, 0.15, 0.05), bandMat, { y: headY + 0.35, z: -0.6 });
            // Left
            add(new THREE.BoxGeometry(0.05, 0.15, 1.2), bandMat, { x: -0.62, y: headY + 0.35 });
            // Right
            add(new THREE.BoxGeometry(0.05, 0.15, 1.2), bandMat, { x: 0.62, y: headY + 0.35 });
            // Knot on right side
            add(new THREE.BoxGeometry(0.18, 0.25, 0.18), bandMat, { x: 0.72, y: headY + 0.35, z: 0.0 });
            break;
        }

        case 4: { // Crown — gold spiky shape on top
            const crownMat = mat('#ffd700');
            const gemRedMat = mat('#e94560');
            const gemBlueMat = mat('#6c63ff');

            // Base band
            add(new THREE.BoxGeometry(1.1, 0.2, 1.1), crownMat, { y: headTop + 0.15 });

            // Five points
            const pointPositions = [
                { x: -0.4, z: 0 },
                { x: 0.4, z: 0 },
                { x: 0, z: -0.4 },
                { x: 0, z: 0.4 },
                { x: 0, z: 0 },
            ];
            pointPositions.forEach((p, i) => {
                const h = i === 4 ? 0.45 : 0.3;
                add(
                    new THREE.BoxGeometry(0.18, h, 0.18),
                    crownMat,
                    { x: p.x, y: headTop + 0.25 + h / 2, z: p.z }
                );
            });

            // Center gem
            add(new THREE.BoxGeometry(0.12, 0.12, 0.06), gemRedMat, { y: headTop + 0.2, z: 0.56 });
            // Side gems
            add(new THREE.BoxGeometry(0.1, 0.1, 0.06), gemBlueMat, { x: -0.3, y: headTop + 0.2, z: 0.56 });
            add(new THREE.BoxGeometry(0.1, 0.1, 0.06), gemBlueMat, { x: 0.3, y: headTop + 0.2, z: 0.56 });
            break;
        }

        case 5: { // Mask — flat box on lower face
            const maskMat = new THREE.MeshStandardMaterial({
                color: '#111111',
                roughness: 0.6,
                metalness: 0.05,
                transparent: true,
                opacity: 0.9,
            });
            disposables.push(maskMat);

            // Mask body
            add(new THREE.BoxGeometry(1.25, 0.4, 0.15), maskMat, { y: headY + 0.05, z: 0.58 });
            // Eye slits (white)
            const slitMat = matFlat('#ffffff');
            add(new THREE.PlaneGeometry(0.24, 0.12), slitMat, { x: -0.25, y: headY + 0.1, z: 0.66 });
            add(new THREE.PlaneGeometry(0.24, 0.12), slitMat, { x: 0.25, y: headY + 0.1, z: 0.66 });
            break;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Creates a 3D avatar in the given container element.
 * Returns an object with { dispose(), updateConfig(newConfig), setRotation(angle), renderer }
 *
 * @param {HTMLElement} container - DOM element to render into
 * @param {Object} config - Avatar config: { skin, shirt, pants, hair, accessory }
 * @param {Object} [options] - { width, height, autoRotate, rotateSpeed, background, enableControls }
 */
export function create3DAvatar(container, config, options = {}) {
    const {
        width = 200,
        height = 300,
        autoRotate = true,
        rotateSpeed = 0.008,
        background = 'transparent',
        enableControls = false,
    } = options;

    // ── Scene ──
    const scene = new THREE.Scene();
    if (background !== 'transparent') {
        scene.background = new THREE.Color(background);
    }

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 8);
    camera.lookAt(0, 0.8, 0);

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: background === 'transparent',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Style the canvas to fit
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.borderRadius = '12px';
    container.appendChild(renderer.domElement);

    trackRenderer(renderer);

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(3, 6, 4);
    scene.add(dirLight);

    // Subtle fill light from the other side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // ── Build Character ──
    let character = buildCharacter(config);
    scene.add(character.group);

    // ── Orbit Controls (optional) ──
    let controls = null;
    if (enableControls) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.target.set(0, 0.8, 0);
        controls.minPolarAngle = Math.PI * 0.25;
        controls.maxPolarAngle = Math.PI * 0.65;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = rotateSpeed * 200; // OrbitControls uses different scale
        controls.update();
    }

    // ── Animation Loop ──
    let disposed = false;
    let animationId = null;
    let manualRotation = 0;

    function animate() {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);

        if (controls) {
            controls.update();
        } else if (autoRotate && character.group) {
            manualRotation += rotateSpeed;
            character.group.rotation.y = manualRotation;
        }

        renderer.render(scene, camera);
    }
    animate();

    // ── Control Object ──
    const control = {
        renderer,

        dispose() {
            disposed = true;
            if (animationId != null) {
                cancelAnimationFrame(animationId);
            }
            if (controls) {
                controls.dispose();
            }
            // Dispose character geometries/materials
            disposeCharacter(character);
            // Dispose renderer
            renderer.dispose();
            untrackRenderer(renderer);
            // Remove canvas from DOM
            if (renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        },

        updateConfig(newConfig) {
            // Remove old character
            scene.remove(character.group);
            disposeCharacter(character);
            // Build new
            character = buildCharacter(newConfig);
            character.group.rotation.y = manualRotation;
            scene.add(character.group);
        },

        setRotation(angle) {
            manualRotation = angle;
            if (character.group) {
                character.group.rotation.y = angle;
            }
        },

        getCanvas() {
            return renderer.domElement;
        },
    };

    return control;
}

function disposeCharacter(character) {
    if (!character) return;
    character.disposables.forEach(item => {
        if (item && typeof item.dispose === 'function') {
            item.dispose();
        }
    });
    // Also traverse group children
    character.group.traverse(child => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    });
}

/**
 * For backward compatibility — renders a 2D snapshot of the 3D avatar to a canvas.
 * Creates an offscreen 3D render, takes a snapshot, returns as a plain canvas element.
 * Used for places that still need a 2D canvas (friends list, leaderboard, etc.)
 *
 * @param {Object} config - Avatar config
 * @param {number} [width=80]
 * @param {number} [height=120]
 * @returns {HTMLCanvasElement}
 */
export function createAvatarCanvas(config, width = 80, height = 120) {
    // Use the 2D fallback for reliability and performance in list contexts
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const size = Math.min(width * 0.9, height * 0.55);
    drawAvatar(ctx, config, width / 2, (height - size * 1.5) / 2, size);
    return canvas;
}

// ═══════════════════════════════════════════════════════════════════════
// 2D FALLBACK — Original pixel-art avatar renderer (kept for compat)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Draw a blocky pixel-art character on a 2D canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - { skin, shirt, pants, hair (0-5), accessory (0-5) }
 * @param {number} x - Center X
 * @param {number} y - Top Y
 * @param {number} size - Bounding box width (height = size * 1.5)
 */
export function drawAvatar(ctx, config, x, y, size) {
    const {
        skin = '#ffb347',
        shirt = '#6c63ff',
        pants = '#333333',
        hair = 0,
        accessory = 0
    } = config || {};

    const h = size * 1.5;
    const left = x - size / 2;
    const top = y;

    const u = size / 10; // unit

    // Proportions
    const headW = size * 0.6;
    const headH = h * 0.3;
    const headX = left + (size - headW) / 2;
    const headY = top + h * 0.05;

    const torsoW = size * 0.5;
    const torsoH = h * 0.28;
    const torsoX = left + (size - torsoW) / 2;
    const torsoY = headY + headH + u * 0.5;

    const armW = size * 0.12;
    const armH = torsoH * 0.85;
    const armY = torsoY + u * 0.3;

    const legW = size * 0.18;
    const legH = h * 0.25;
    const legY = torsoY + torsoH + u * 0.3;
    const legGap = size * 0.04;

    // Shadow under character
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(left + size / 2, top + h - u * 0.3, size * 0.3, u * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Legs ──
    ctx.fillStyle = pants;
    const leftLegX = left + size / 2 - legW - legGap / 2;
    ctx.fillRect(leftLegX, legY, legW, legH);
    const rightLegX = left + size / 2 + legGap / 2;
    ctx.fillRect(rightLegX, legY, legW, legH);

    // Shoe highlights
    ctx.fillStyle = darken(pants, 30);
    ctx.fillRect(leftLegX, legY + legH - u * 0.8, legW, u * 0.8);
    ctx.fillRect(rightLegX, legY + legH - u * 0.8, legW, u * 0.8);

    // ── Arms ──
    ctx.fillStyle = skin;
    ctx.fillRect(torsoX - armW - u * 0.2, armY, armW, armH);
    ctx.fillRect(torsoX + torsoW + u * 0.2, armY, armW, armH);

    // Hands
    ctx.fillStyle = darken(skin, 15);
    const handH = armH * 0.2;
    ctx.fillRect(torsoX - armW - u * 0.2, armY + armH - handH, armW, handH);
    ctx.fillRect(torsoX + torsoW + u * 0.2, armY + armH - handH, armW, handH);

    // ── Torso ──
    ctx.fillStyle = shirt;
    ctx.fillRect(torsoX, torsoY, torsoW, torsoH);

    // Shirt detail: collar
    ctx.fillStyle = darken(shirt, 20);
    const collarW = torsoW * 0.35;
    ctx.fillRect(torsoX + (torsoW - collarW) / 2, torsoY, collarW, u * 0.5);
    ctx.fillRect(torsoX, torsoY + torsoH - u * 0.3, torsoW, u * 0.3);

    // ── Head ──
    ctx.fillStyle = skin;
    ctx.fillRect(headX, headY, headW, headH);

    // ── Face ──
    const eyeSize = Math.max(u * 0.5, 2);
    const eyeY2 = headY + headH * 0.4;
    const eyeOffsetX = headW * 0.22;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(headX + headW / 2 - eyeOffsetX - eyeSize, eyeY2, eyeSize * 2, eyeSize * 1.5);
    ctx.fillRect(headX + headW / 2 + eyeOffsetX - eyeSize, eyeY2, eyeSize * 2, eyeSize * 1.5);

    ctx.fillStyle = '#222222';
    ctx.fillRect(headX + headW / 2 - eyeOffsetX, eyeY2 + eyeSize * 0.2, eyeSize, eyeSize);
    ctx.fillRect(headX + headW / 2 + eyeOffsetX, eyeY2 + eyeSize * 0.2, eyeSize, eyeSize);

    // Mouth
    ctx.fillStyle = darken(skin, 35);
    const mouthW = headW * 0.2;
    const mouthH2 = Math.max(u * 0.3, 1.5);
    ctx.fillRect(headX + (headW - mouthW) / 2, headY + headH * 0.72, mouthW, mouthH2);

    // ── Hair ──
    drawHair2D(ctx, hair, headX, headY, headW, headH, u);

    // ── Accessory ──
    drawAccessory2D(ctx, accessory, headX, headY, headW, headH, u, left, size);
}

function drawHair2D(ctx, hairStyle, hx, hy, hw, hh, u) {
    const HAIR_COLORS_2D = ['transparent', '#3d2314', '#1a1a2e', '#e94560', '#f5a623', '#6c63ff'];
    const hairColor = HAIR_COLORS_2D[hairStyle] || '#3d2314';

    if (hairStyle === 0) return;

    ctx.fillStyle = hairColor;

    switch (hairStyle) {
        case 1:
            ctx.fillRect(hx - u * 0.3, hy - u * 0.8, hw + u * 0.6, u * 1.2);
            ctx.fillRect(hx - u * 0.3, hy, u * 0.8, hh * 0.3);
            ctx.fillRect(hx + hw - u * 0.5, hy, u * 0.8, hh * 0.3);
            break;
        case 2:
            ctx.fillRect(hx - u * 0.4, hy - u * 0.8, hw + u * 0.8, u * 1.2);
            ctx.fillRect(hx - u * 0.6, hy, u * 1, hh * 0.9);
            ctx.fillRect(hx + hw - u * 0.4, hy, u * 1, hh * 0.9);
            ctx.fillRect(hx, hy - u * 0.4, hw, u * 0.6);
            break;
        case 3:
            ctx.fillRect(hx + hw * 0.3, hy - u * 2, hw * 0.4, u * 2.3);
            ctx.fillRect(hx + hw * 0.25, hy - u * 1.5, hw * 0.5, u * 0.8);
            ctx.fillRect(hx + hw * 0.35, hy - u * 2.5, hw * 0.3, u * 0.8);
            break;
        case 4:
            for (let i = 0; i < 5; i++) {
                const bx = hx - u * 0.3 + i * (hw + u * 0.6) / 5;
                const by = hy - u * 1 + (i % 2 === 0 ? 0 : -u * 0.4);
                ctx.fillRect(bx, by, (hw + u * 0.6) / 5 - u * 0.1, u * 1.3);
            }
            ctx.fillRect(hx - u * 0.5, hy + u * 0.2, u * 0.8, hh * 0.4);
            ctx.fillRect(hx + hw - u * 0.3, hy + u * 0.2, u * 0.8, hh * 0.4);
            break;
        case 5:
            ctx.fillRect(hx - u * 0.3, hy + hh * 0.05, u * 0.8, hh * 0.25);
            ctx.fillRect(hx + hw - u * 0.5, hy + hh * 0.05, u * 0.8, hh * 0.25);
            ctx.fillStyle = '#e94560';
            ctx.fillRect(hx - u * 0.5, hy - u * 1, hw + u * 1, u * 1.4);
            ctx.fillRect(hx - u * 1, hy + u * 0.2, hw + u * 2, u * 0.5);
            break;
    }
}

function drawAccessory2D(ctx, acc, hx, hy, hw, hh, u, bodyLeft, bodySize) {
    if (acc === 0) return;

    switch (acc) {
        case 1:
            ctx.fillStyle = '#2d2d44';
            ctx.fillRect(hx - u * 0.8, hy - u * 0.6, hw + u * 1.6, u * 0.6);
            ctx.fillRect(hx + hw * 0.15, hy - u * 2.5, hw * 0.7, u * 2);
            ctx.fillStyle = '#e94560';
            ctx.fillRect(hx + hw * 0.15, hy - u * 1.1, hw * 0.7, u * 0.4);
            break;
        case 2: {
            ctx.fillStyle = '#222222';
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = Math.max(u * 0.2, 1.5);
            const glassY = hy + hh * 0.33;
            const glassSize = hw * 0.2;
            ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.fillRect(hx + hw * 0.15, glassY, glassSize, glassSize * 0.8);
            ctx.strokeStyle = '#222';
            ctx.strokeRect(hx + hw * 0.15, glassY, glassSize, glassSize * 0.8);
            ctx.fillRect(hx + hw * 0.65 - glassSize, glassY, glassSize, glassSize * 0.8);
            ctx.strokeRect(hx + hw * 0.65 - glassSize, glassY, glassSize, glassSize * 0.8);
            ctx.fillStyle = '#222';
            ctx.fillRect(hx + hw * 0.15 + glassSize, glassY + glassSize * 0.2, hw * 0.65 - glassSize * 2 - hw * 0.15, u * 0.2);
            ctx.fillRect(hx + hw * 0.05, glassY + glassSize * 0.2, hw * 0.1, u * 0.2);
            ctx.fillRect(hx + hw * 0.65, glassY + glassSize * 0.2, hw * 0.1, u * 0.2);
            break;
        }
        case 3:
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(hx - u * 0.2, hy + hh * 0.15, hw + u * 0.4, u * 0.5);
            ctx.fillRect(hx + hw + u * 0.1, hy + hh * 0.1, u * 0.6, u * 1);
            break;
        case 4: {
            ctx.fillStyle = '#ffd700';
            const crownY = hy - u * 1.5;
            const crownH = u * 1.5;
            const crownW = hw * 0.8;
            const crownX = hx + (hw - crownW) / 2;
            ctx.fillRect(crownX, crownY + crownH * 0.4, crownW, crownH * 0.6);
            const points = 5;
            const pw = crownW / points;
            for (let i = 0; i < points; i++) {
                ctx.fillRect(crownX + i * pw + pw * 0.2, crownY, pw * 0.6, crownH * 0.5);
            }
            ctx.fillStyle = '#e94560';
            ctx.fillRect(crownX + crownW * 0.45, crownY + crownH * 0.5, u * 0.4, u * 0.4);
            ctx.fillStyle = '#6c63ff';
            ctx.fillRect(crownX + crownW * 0.2, crownY + crownH * 0.5, u * 0.3, u * 0.3);
            ctx.fillRect(crownX + crownW * 0.7, crownY + crownH * 0.5, u * 0.3, u * 0.3);
            break;
        }
        case 5: {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            const maskY = hy + hh * 0.28;
            const maskH = hh * 0.22;
            ctx.fillRect(hx - u * 0.3, maskY, hw + u * 0.6, maskH);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(hx + hw * 0.18, maskY + maskH * 0.2, hw * 0.2, maskH * 0.6);
            ctx.fillRect(hx + hw * 0.62, maskY + maskH * 0.2, hw * 0.2, maskH * 0.6);
            break;
        }
    }
}

// ─── Global cleanup helper for navigation ─────────────────────────────
// Pages can register their 3D avatar instances here for cleanup
const _pageAvatars = [];

export function registerPageAvatar(avatarControl) {
    _pageAvatars.push(avatarControl);
}

export function cleanupPageAvatars() {
    while (_pageAvatars.length > 0) {
        const av = _pageAvatars.pop();
        try {
            av.dispose();
        } catch (e) {
            // silently ignore disposal errors
        }
    }
}
