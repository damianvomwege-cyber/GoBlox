import * as THREE from 'three';

// ── Seeded PRNG (shared utility) ────────────────────────────────────────
export function mulberry32(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Character colors ────────────────────────────────────────────────────
const CHAR = {
    skin: 0xffb347,
    shirt: 0x4a90d9,
    pants: 0x2c3e50,
    hair: 0x3d2b1f,
    eyes: 0xffffff,
    pupils: 0x111111,
    shoes: 0x1a1a2e,
};

/**
 * Build a blocky GoBlox character as a THREE.Group.
 * Total height ~2.4 units (head 0.6, torso 0.7, legs 0.7, hair 0.15, shoes overlap).
 */
export function buildCharacterModel() {
    const group = new THREE.Group();

    const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.55, 0.5);
    const head = new THREE.Mesh(headGeo, mat(CHAR.skin));
    head.position.y = 1.85;
    head.castShadow = true;
    head.name = 'head';
    group.add(head);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.54, 0.15, 0.54);
    const hair = new THREE.Mesh(hairGeo, mat(CHAR.hair));
    hair.position.y = 2.18;
    hair.castShadow = true;
    group.add(hair);

    // Eyes (two small white cubes on front face)
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.1, 0.04);
    const eyeMatW = mat(CHAR.eyes);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMatW);
    leftEye.position.set(-0.1, 1.9, 0.26);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMatW);
    rightEye.position.set(0.1, 1.9, 0.26);
    group.add(rightEye);

    // Pupils
    const pupilGeo = new THREE.BoxGeometry(0.05, 0.06, 0.02);
    const pupilMat = mat(CHAR.pupils);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.1, 1.88, 0.29);
    group.add(leftPupil);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.1, 1.88, 0.29);
    group.add(rightPupil);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.35);
    const torso = new THREE.Mesh(torsoGeo, mat(CHAR.shirt));
    torso.position.y = 1.2;
    torso.castShadow = true;
    group.add(torso);

    // Left arm
    const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.2);
    const leftArm = new THREE.Mesh(armGeo, mat(CHAR.skin));
    leftArm.position.set(-0.37, 1.25, 0);
    leftArm.castShadow = true;
    leftArm.name = 'leftArm';
    // Pivot at shoulder
    leftArm.geometry.translate(0, -0.3, 0);
    leftArm.position.y = 1.55;
    group.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeo.clone(), mat(CHAR.skin));
    rightArm.position.set(0.37, 1.25, 0);
    rightArm.castShadow = true;
    rightArm.name = 'rightArm';
    rightArm.geometry.translate(0, -0.3, 0);
    rightArm.position.y = 1.55;
    group.add(rightArm);

    // Left leg
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.25);
    const leftLeg = new THREE.Mesh(legGeo, mat(CHAR.pants));
    leftLeg.castShadow = true;
    leftLeg.name = 'leftLeg';
    leftLeg.geometry.translate(0, -0.3, 0);
    leftLeg.position.set(-0.13, 0.85, 0);
    group.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeo.clone(), mat(CHAR.pants));
    rightLeg.castShadow = true;
    rightLeg.name = 'rightLeg';
    rightLeg.geometry.translate(0, -0.3, 0);
    rightLeg.position.set(0.13, 0.85, 0);
    group.add(rightLeg);

    // Shoes (on legs)
    const shoeGeo = new THREE.BoxGeometry(0.22, 0.12, 0.3);
    const shoeMat = mat(CHAR.shoes);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.13, 0.26, 0.02);
    leftShoe.castShadow = true;
    leftShoe.name = 'leftShoe';
    group.add(leftShoe);
    const rightShoe = new THREE.Mesh(shoeGeo.clone(), shoeMat);
    rightShoe.position.set(0.13, 0.26, 0.02);
    rightShoe.castShadow = true;
    rightShoe.name = 'rightShoe';
    group.add(rightShoe);

    return group;
}

// ── BaseGame3D ──────────────────────────────────────────────────────────
export class BaseGame3D {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.running = false;
        this.score = 0;
        this.gameOver = false;
        this.animationFrame = null;

        // Player state
        this.playerPosition = new THREE.Vector3(0, 0, 0);
        this.playerVelocity = new THREE.Vector3(0, 0, 0);
        this.playerOnGround = true;
        this.moveSpeed = 8;
        this.jumpForce = 12;
        this.gravity = -25;
        this.playerHeight = 2.4; // character model height
        this.playerRadius = 0.3;
        this.playerYaw = 0; // the direction the player faces

        // Camera state
        this.cameraAngleX = 0;   // horizontal (yaw)
        this.cameraAngleY = 0.3; // vertical (pitch, looking slightly down)
        this.cameraDistance = 10;
        this.cameraHeight = 5;
        this.cameraSensitivity = 0.003;
        this.cameraSmoothing = 8;

        // Input state
        this.keys = {};
        this.mouseMovement = { x: 0, y: 0 };
        this.pointerLocked = false;

        // Bound handlers
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp = this._handleKeyUp.bind(this);
        this._onMouseMove = this._handleMouseMove.bind(this);
        this._onClick = this._handleClick.bind(this);
        this._onPointerLockChange = this._handlePointerLockChange.bind(this);
        this._onResize = this._handleResize.bind(this);
        this._onContextMenu = (e) => e.preventDefault();
    }

    // ── Lifecycle ────────────────────────────────────────────────────────

    async start() {
        this.showLoading();
        this.setupRenderer();
        this.setupLighting();
        this.setupPlayer();
        this.setupCamera();
        this.setupInput();
        await this.init(); // subclass builds the world
        this.hideLoading();
        this.running = true;
        this.gameOver = false;
        this.score = 0;
        this.clock.start();
        this.loop();
    }

    stop() {
        this.running = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.cleanupInput();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.remove();
            }
        }
        // Remove loading/HUD overlays
        const loading = this.container.querySelector('.game-3d-loading');
        if (loading) loading.remove();
        const hud = this.container.querySelector('.game-3d-hud');
        if (hud) hud.remove();
        const lockMsg = this.container.querySelector('.game-3d-lock-msg');
        if (lockMsg) lockMsg.remove();

        // Exit pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    // Override in subclasses
    async init() {}
    update(dt) {}
    onGameOver(score) {}

    // ── Renderer ─────────────────────────────────────────────────────────

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);
    }

    // ── Lighting ─────────────────────────────────────────────────────────

    setupLighting() {
        // Hemisphere light (sky/ground)
        const hemi = new THREE.HemisphereLight(0x87ceeb, 0x444422, 0.6);
        this.scene.add(hemi);

        // Ambient light
        const ambient = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambient);

        // Directional light (sun) with shadows
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.position.set(30, 50, 30);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 1;
        this.sunLight.shadow.camera.far = 150;
        this.sunLight.shadow.camera.left = -40;
        this.sunLight.shadow.camera.right = 40;
        this.sunLight.shadow.camera.top = 40;
        this.sunLight.shadow.camera.bottom = -40;
        this.sunLight.shadow.bias = -0.001;
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);
    }

    // ── Player ───────────────────────────────────────────────────────────

    setupPlayer() {
        this.playerModel = buildCharacterModel();
        this.playerModel.position.copy(this.playerPosition);
        this.playerModel.castShadow = true;
        this.scene.add(this.playerModel);

        // Animation state
        this.walkAnimTime = 0;
        this.isWalking = false;
    }

    // ── Camera ───────────────────────────────────────────────────────────

    setupCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.updateCameraPosition(true); // instant placement
    }

    updateCameraPosition(instant = false) {
        // Desired camera position based on angles and distance
        const targetX = this.playerPosition.x - Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;
        const targetY = this.playerPosition.y + this.playerHeight * 0.7 + Math.sin(this.cameraAngleY) * this.cameraDistance;
        const targetZ = this.playerPosition.z - Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;

        if (instant) {
            this.camera.position.set(targetX, targetY, targetZ);
        } else {
            // Smooth lerp
            const dt = this.clock.getDelta ? 0.016 : 0.016; // fallback
            const t = 1 - Math.exp(-this.cameraSmoothing * 0.016);
            this.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), t);
        }

        // Look at player (slightly above ground level)
        const lookTarget = new THREE.Vector3(
            this.playerPosition.x,
            this.playerPosition.y + this.playerHeight * 0.6,
            this.playerPosition.z
        );
        this.camera.lookAt(lookTarget);
    }

    // ── Input ────────────────────────────────────────────────────────────

    setupInput() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        this.container.addEventListener('mousemove', this._onMouseMove);
        this.container.addEventListener('click', this._onClick);
        this.container.addEventListener('contextmenu', this._onContextMenu);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        window.addEventListener('resize', this._onResize);

        // Show click-to-play message
        this.lockMsg = document.createElement('div');
        this.lockMsg.className = 'game-3d-lock-msg';
        this.lockMsg.textContent = 'Klicken zum Spielen';
        this.container.appendChild(this.lockMsg);
    }

    cleanupInput() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this.container.removeEventListener('mousemove', this._onMouseMove);
        this.container.removeEventListener('click', this._onClick);
        this.container.removeEventListener('contextmenu', this._onContextMenu);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        window.removeEventListener('resize', this._onResize);
    }

    _handleKeyDown(e) {
        this.keys[e.code] = true;
        // Prevent page scroll on space/arrows
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
        this.onKeyDown(e.code);
    }

    _handleKeyUp(e) {
        this.keys[e.code] = false;
        this.onKeyUp(e.code);
    }

    _handleMouseMove(e) {
        if (this.pointerLocked) {
            this.mouseMovement.x += e.movementX || 0;
            this.mouseMovement.y += e.movementY || 0;
        }
    }

    _handleClick(e) {
        if (!this.pointerLocked && !this.gameOver) {
            this.container.requestPointerLock();
        }
        this.onClick(e);
    }

    _handlePointerLockChange() {
        this.pointerLocked = document.pointerLockElement === this.container;
        if (this.lockMsg) {
            this.lockMsg.style.display = this.pointerLocked ? 'none' : 'flex';
        }
    }

    _handleResize() {
        if (!this.renderer || !this.camera) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    // Override in subclasses for custom key handling
    onKeyDown(code) {}
    onKeyUp(code) {}
    onClick(e) {}

    // ── Loading Screen ───────────────────────────────────────────────────

    showLoading() {
        const gameName = this.config?.name || this.config?.theme?.name || 'GoBlox 3D';
        this.loadingEl = document.createElement('div');
        this.loadingEl.className = 'game-3d-loading';
        this.loadingEl.innerHTML = `
            <div class="game-3d-loading-logo">G</div>
            <div class="game-3d-loading-title">${gameName}</div>
            <div class="game-3d-loading-bar-wrap">
                <div class="game-3d-loading-bar"></div>
            </div>
            <div class="game-3d-loading-tip">WASD zum Bewegen, Maus zum Umschauen</div>
        `;
        this.container.appendChild(this.loadingEl);

        // Animate the bar
        const bar = this.loadingEl.querySelector('.game-3d-loading-bar');
        let progress = 0;
        this._loadingInterval = setInterval(() => {
            progress = Math.min(progress + 5 + Math.random() * 10, 90);
            bar.style.width = progress + '%';
        }, 80);
    }

    hideLoading() {
        if (this._loadingInterval) {
            clearInterval(this._loadingInterval);
            this._loadingInterval = null;
        }
        if (this.loadingEl) {
            const bar = this.loadingEl.querySelector('.game-3d-loading-bar');
            if (bar) bar.style.width = '100%';
            setTimeout(() => {
                this.loadingEl.classList.add('fade-out');
                setTimeout(() => {
                    if (this.loadingEl && this.loadingEl.parentNode) {
                        this.loadingEl.remove();
                    }
                }, 500);
            }, 200);
        }
    }

    // ── HUD ──────────────────────────────────────────────────────────────

    createHUD() {
        this.hudEl = document.createElement('div');
        this.hudEl.className = 'game-3d-hud';
        this.hudEl.innerHTML = `
            <div class="game-3d-score" id="hud-score">Score: 0</div>
            <div class="game-3d-info" id="hud-info"></div>
        `;
        this.container.appendChild(this.hudEl);
        this.hudScoreEl = this.hudEl.querySelector('#hud-score');
        this.hudInfoEl = this.hudEl.querySelector('#hud-info');
    }

    updateHUDScore(score) {
        if (this.hudScoreEl) {
            this.hudScoreEl.textContent = `Score: ${score}`;
        }
    }

    createHealthBar(maxHp) {
        this.maxHp = maxHp;
        this.healthBarEl = document.createElement('div');
        this.healthBarEl.className = 'game-3d-health';
        this.healthBarEl.innerHTML = `
            <div class="game-3d-health-fill" id="hud-health-fill"></div>
            <span class="game-3d-health-text" id="hud-health-text">HP: ${maxHp}</span>
        `;
        if (this.hudEl) {
            this.hudEl.appendChild(this.healthBarEl);
        }
        this.healthFillEl = this.healthBarEl.querySelector('#hud-health-fill');
        this.healthTextEl = this.healthBarEl.querySelector('#hud-health-text');
    }

    updateHealthBar(hp) {
        if (this.healthFillEl) {
            const frac = Math.max(0, hp / this.maxHp);
            this.healthFillEl.style.width = (frac * 100) + '%';
            if (frac > 0.5) this.healthFillEl.style.background = '#44cc44';
            else if (frac > 0.25) this.healthFillEl.style.background = '#cccc44';
            else this.healthFillEl.style.background = '#cc4444';
        }
        if (this.healthTextEl) {
            this.healthTextEl.textContent = `HP: ${Math.ceil(hp)}`;
        }
    }

    createCrosshair() {
        this.crosshairEl = document.createElement('div');
        this.crosshairEl.className = 'game-3d-crosshair';
        this.crosshairEl.innerHTML = '+';
        this.container.appendChild(this.crosshairEl);
    }

    // ── Player Physics & Movement ────────────────────────────────────────

    updatePlayer(dt) {
        if (this.gameOver) return;

        // Read WASD input
        let moveX = 0;
        let moveZ = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ -= 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX += 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX -= 1;

        // Movement relative to camera direction
        const camYaw = this.cameraAngleX;
        const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        const right = new THREE.Vector3(-Math.cos(camYaw), 0, Math.sin(camYaw));

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(forward, moveZ);
        moveDir.addScaledVector(right, moveX);

        this.isWalking = moveDir.lengthSq() > 0.01;
        if (this.isWalking) {
            moveDir.normalize();
            this.playerVelocity.x = moveDir.x * this.moveSpeed;
            this.playerVelocity.z = moveDir.z * this.moveSpeed;

            // Rotate player to face movement direction
            this.playerYaw = Math.atan2(moveDir.x, moveDir.z);
        } else {
            this.playerVelocity.x = 0;
            this.playerVelocity.z = 0;
        }

        // Jump
        if ((this.keys['Space']) && this.playerOnGround) {
            this.playerVelocity.y = this.jumpForce;
            this.playerOnGround = false;
        }

        // Gravity
        this.playerVelocity.y += this.gravity * dt;

        // Apply velocity
        this.playerPosition.x += this.playerVelocity.x * dt;
        this.playerPosition.y += this.playerVelocity.y * dt;
        this.playerPosition.z += this.playerVelocity.z * dt;

        // Ground collision (override in subclass for custom floors)
        const groundY = this.getGroundY(this.playerPosition.x, this.playerPosition.z);
        if (this.playerPosition.y <= groundY) {
            this.playerPosition.y = groundY;
            this.playerVelocity.y = 0;
            this.playerOnGround = true;
        }

        // Update model position
        this.playerModel.position.copy(this.playerPosition);

        // Smooth player rotation
        const targetRot = this.playerYaw;
        let currentRot = this.playerModel.rotation.y;
        // Shortest angle
        let diff = targetRot - currentRot;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerModel.rotation.y += diff * Math.min(1, dt * 12);

        // Walk animation
        this.animateCharacter(dt);
    }

    /**
     * Override in subclass for custom ground heights / platform collision.
     * Returns the Y position of the ground at (x, z).
     */
    getGroundY(x, z) {
        return 0;
    }

    animateCharacter(dt) {
        if (!this.playerModel) return;

        const leftArm = this.playerModel.getObjectByName('leftArm');
        const rightArm = this.playerModel.getObjectByName('rightArm');
        const leftLeg = this.playerModel.getObjectByName('leftLeg');
        const rightLeg = this.playerModel.getObjectByName('rightLeg');

        if (this.isWalking) {
            this.walkAnimTime += dt * 8;
            const swing = Math.sin(this.walkAnimTime) * 0.6;

            if (leftArm) leftArm.rotation.x = swing;
            if (rightArm) rightArm.rotation.x = -swing;
            if (leftLeg) leftLeg.rotation.x = -swing;
            if (rightLeg) rightLeg.rotation.x = swing;
        } else {
            // Idle bob
            this.walkAnimTime += dt * 2;
            const bob = Math.sin(this.walkAnimTime) * 0.05;

            if (leftArm) leftArm.rotation.x = bob;
            if (rightArm) rightArm.rotation.x = -bob;
            if (leftLeg) leftLeg.rotation.x = 0;
            if (rightLeg) rightLeg.rotation.x = 0;

            // Subtle body bob
            if (this.playerModel) {
                this.playerModel.position.y = this.playerPosition.y + Math.sin(this.walkAnimTime) * 0.02;
            }
        }
    }

    // ── Camera Update ────────────────────────────────────────────────────

    updateCamera(dt) {
        // Apply mouse movement to camera angles
        if (this.pointerLocked) {
            this.cameraAngleX += this.mouseMovement.x * this.cameraSensitivity;
            this.cameraAngleY -= this.mouseMovement.y * this.cameraSensitivity;
            // Clamp vertical angle
            this.cameraAngleY = Math.max(-0.2, Math.min(1.2, this.cameraAngleY));
        }
        this.mouseMovement.x = 0;
        this.mouseMovement.y = 0;

        // Compute desired position
        const targetPos = new THREE.Vector3(
            this.playerPosition.x - Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance,
            this.playerPosition.y + this.playerHeight * 0.7 + Math.sin(this.cameraAngleY) * this.cameraDistance,
            this.playerPosition.z - Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance
        );

        // Smooth follow
        const t = 1 - Math.exp(-this.cameraSmoothing * dt);
        this.camera.position.lerp(targetPos, t);

        // Look at player
        const lookTarget = new THREE.Vector3(
            this.playerPosition.x,
            this.playerPosition.y + this.playerHeight * 0.6,
            this.playerPosition.z
        );
        this.camera.lookAt(lookTarget);

        // Move sun shadow camera to follow player
        if (this.sunLight) {
            this.sunLight.position.set(
                this.playerPosition.x + 30,
                this.playerPosition.y + 50,
                this.playerPosition.z + 30
            );
            this.sunLight.target.position.copy(this.playerPosition);
        }
    }

    // ── AABB Collision Helper ────────────────────────────────────────────

    /**
     * Check if player AABB overlaps with a box.
     * box = { x, y, z, w, h, d } (center + half-extents conceptually; here x,y,z = min corner, w,h,d = full size)
     */
    checkBoxCollision(box) {
        const px = this.playerPosition.x;
        const py = this.playerPosition.y;
        const pz = this.playerPosition.z;
        const pr = this.playerRadius;
        const ph = this.playerHeight;

        return (
            px + pr > box.x &&
            px - pr < box.x + box.w &&
            py < box.y + box.h &&
            py + ph > box.y &&
            pz + pr > box.z &&
            pz - pr < box.z + box.d
        );
    }

    /**
     * Resolve player collision with a static AABB, pushing player out.
     */
    resolveBoxCollision(box) {
        const px = this.playerPosition.x;
        const py = this.playerPosition.y;
        const pz = this.playerPosition.z;
        const pr = this.playerRadius;
        const ph = this.playerHeight;

        // Player AABB
        const pMinX = px - pr, pMaxX = px + pr;
        const pMinY = py, pMaxY = py + ph;
        const pMinZ = pz - pr, pMaxZ = pz + pr;

        // Box AABB
        const bMinX = box.x, bMaxX = box.x + box.w;
        const bMinY = box.y, bMaxY = box.y + box.h;
        const bMinZ = box.z, bMaxZ = box.z + box.d;

        // Overlap on each axis
        const overlapX1 = pMaxX - bMinX;
        const overlapX2 = bMaxX - pMinX;
        const overlapY1 = pMaxY - bMinY;
        const overlapY2 = bMaxY - pMinY;
        const overlapZ1 = pMaxZ - bMinZ;
        const overlapZ2 = bMaxZ - pMinZ;

        const minOverlapX = overlapX1 < overlapX2 ? -overlapX1 : overlapX2;
        const minOverlapY = overlapY1 < overlapY2 ? -overlapY1 : overlapY2;
        const minOverlapZ = overlapZ1 < overlapZ2 ? -overlapZ1 : overlapZ2;

        const absX = Math.abs(minOverlapX);
        const absY = Math.abs(minOverlapY);
        const absZ = Math.abs(minOverlapZ);

        if (absY < absX && absY < absZ) {
            this.playerPosition.y += minOverlapY;
            if (minOverlapY > 0) {
                // Landing on top
                this.playerVelocity.y = 0;
                this.playerOnGround = true;
            } else {
                // Hitting from below
                this.playerVelocity.y = 0;
            }
        } else if (absX < absZ) {
            this.playerPosition.x += minOverlapX;
            this.playerVelocity.x = 0;
        } else {
            this.playerPosition.z += minOverlapZ;
            this.playerVelocity.z = 0;
        }
    }

    // ── Sky ──────────────────────────────────────────────────────────────

    createSky(topColor = 0x87ceeb, bottomColor = 0xe0f7fa, fogColor = 0xccddee, fogNear = 50, fogFar = 200) {
        // Gradient sky dome
        const skyGeo = new THREE.SphereGeometry(400, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(topColor) },
                bottomColor: { value: new THREE.Color(bottomColor) },
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false,
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        // Fog
        this.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    }

    // ── Ground Plane ─────────────────────────────────────────────────────

    createGroundPlane(color = 0x4a8f4a, size = 200) {
        const groundGeo = new THREE.PlaneGeometry(size, size);
        const groundMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.9,
            metalness: 0.0,
        });
        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);
    }

    // ── Game Loop ────────────────────────────────────────────────────────

    loop() {
        if (!this.running) return;

        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.gameOver) {
            this.updatePlayer(dt);
            this.updateCamera(dt);
            this.update(dt);
        }

        this.renderer.render(this.scene, this.camera);
        this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    // ── End Game ─────────────────────────────────────────────────────────

    endGame() {
        this.gameOver = true;
        // Exit pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        this.onGameOver(this.score);
    }
}
