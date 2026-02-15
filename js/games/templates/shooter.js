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
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', enemy: '#ff006e', bullet: '#ffff00', color3d: 0x00ff87, accent3d: 0x60efff, enemyColor: 0xff006e, skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e, ground: 0x161650 },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e', enemy: '#ff9f1c', bullet: '#ffffff', color3d: 0xf72585, accent3d: 0x4cc9f0, enemyColor: 0xff9f1c, skyTop: 0x1a1a2e, skyBottom: 0x2a2a4e, fog: 0x1a1a2e, ground: 0x15152a },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e', enemy: '#ff6b6b', bullet: '#caf0f8', color3d: 0x0077b6, accent3d: 0x90e0ef, enemyColor: 0xff6b6b, skyTop: 0x03045e, skyBottom: 0x0a0a4e, fog: 0x03045e, ground: 0x02033e },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', enemy: '#ff0000', bullet: '#ffff00', color3d: 0xff6b35, accent3d: 0xffd700, enemyColor: 0xff0000, skyTop: 0x1a0a00, skyBottom: 0x3a1a00, fog: 0x1a0a00, ground: 0x2a1500 },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', enemy: '#00ff7f', bullet: '#ffffff', color3d: 0xff69b4, accent3d: 0xffb6c1, enemyColor: 0x00ff7f, skyTop: 0xff69b4, skyBottom: 0x2b0012, fog: 0x2b0012, ground: 0x3b0022 },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', enemy: '#ff3333', bullet: '#00ff00', color3d: 0x00ff00, accent3d: 0x33ff33, enemyColor: 0xff3333, skyTop: 0x000a00, skyBottom: 0x001a00, fog: 0x000a00, ground: 0x001500 },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', enemy: '#fee440', bullet: '#00f5d4', color3d: 0x00f5d4, accent3d: 0xf15bb5, enemyColor: 0xfee440, skyTop: 0x10002b, skyBottom: 0x20104b, fog: 0x10002b, ground: 0x0a001b },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', enemy: '#6c5ce7', bullet: '#ffcc5c', color3d: 0xff6f61, accent3d: 0xffcc5c, enemyColor: 0x6c5ce7, skyTop: 0xff6f61, skyBottom: 0x1a0510, fog: 0x3a1520, ground: 0x2a0a15 },
];

// ══════════════════════════════════════════════════════════════════════════
// 2D ShooterGame (original, kept intact)
// ══════════════════════════════════════════════════════════════════════════
class ShooterGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32_2d(cfg.seed || 1);
        const W = this.canvas.width; const H = this.canvas.height;
        const arenaSizes = { small: 0.7, medium: 0.85, large: 1.0 };
        const scale = arenaSizes[cfg.arenaSize] || 0.85;
        this.arenaW = Math.floor(W * scale); this.arenaH = Math.floor(H * scale);
        this.arenaX = Math.floor((W - this.arenaW) / 2); this.arenaY = Math.floor((H - this.arenaH) / 2);
        const speedMap = { slow: 60, medium: 100, fast: 150 };
        this.enemyBaseSpeed = speedMap[cfg.enemySpeed] || 100;
        const spawnMap = { slow: 0.8, medium: 1.5, fast: 2.5 };
        this.spawnRate = spawnMap[cfg.spawnRate] || 1.5;
        this.spawnTimer = 0; this.spawnInterval = 1 / this.spawnRate;
        this.playerSize = 16; this.playerX = W / 2; this.playerY = H / 2; this.playerSpeed = 200;
        this.lives = 3; this.invincible = false; this.invincibleTimer = 0; this.invincibleDuration = 1.5;
        this.mouseX = W / 2; this.mouseY = 0; this.walkAnim = 0;
        this.bullets = []; this.bulletSpeed = 450; this.bulletRadius = 4; this.shootCooldown = 0; this.shootRate = 0.15;
        this.enemies = []; this.enemyIdCounter = 0; this.elapsed = 0; this.particles = [];
    }
    spawnEnemy() {
        const W = this.canvas.width; const H = this.canvas.height;
        const edge = Math.floor(this.rng() * 4); let x, y;
        switch (edge) { case 0: x = this.rng() * W; y = -20; break; case 1: x = this.rng() * W; y = H + 20; break; case 2: x = -20; y = this.rng() * H; break; default: x = W + 20; y = this.rng() * H; break; }
        const roll = this.rng(); let type, size, speed, hp, points;
        if (roll < 0.1) { type = 'big'; size = 20; speed = this.enemyBaseSpeed * 0.5; hp = 3; points = 30; }
        else if (roll < 0.3) { type = 'fast'; size = 8; speed = this.enemyBaseSpeed * 1.8; hp = 1; points = 20; }
        else { type = 'normal'; size = 12; speed = this.enemyBaseSpeed; hp = 1; points = 10; }
        speed *= 1 + this.elapsed * 0.02;
        this.enemies.push({ id: this.enemyIdCounter++, x, y, size, speed, hp, type, points });
    }
    update(dt) {
        this.elapsed += dt; const W = this.canvas.width; const H = this.canvas.height;
        if (this.invincible) { this.invincibleTimer -= dt; if (this.invincibleTimer <= 0) this.invincible = false; }
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) dx += 1;
        if (dx !== 0 || dy !== 0) { const len = Math.sqrt(dx*dx+dy*dy); dx/=len; dy/=len; this.playerX+=dx*this.playerSpeed*dt; this.playerY+=dy*this.playerSpeed*dt; this.walkAnim+=dt*6; }
        const ps = this.playerSize;
        this.playerX = Math.max(this.arenaX+ps, Math.min(this.arenaX+this.arenaW-ps, this.playerX));
        this.playerY = Math.max(this.arenaY+ps, Math.min(this.arenaY+this.arenaH-ps, this.playerY));
        this.shootCooldown -= dt; if (this.shootCooldown < 0) this.shootCooldown = 0;
        if (this.keys[' '] && this.shootCooldown <= 0) this.fireBullet();
        this.spawnTimer += dt;
        const effectiveInterval = this.spawnInterval / (1 + this.elapsed * 0.015);
        if (this.spawnTimer >= effectiveInterval) { this.spawnTimer -= effectiveInterval; this.spawnEnemy(); }
        for (let i = this.bullets.length-1; i >= 0; i--) { const b = this.bullets[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; if (b.x<-20||b.x>W+20||b.y<-20||b.y>H+20) this.bullets.splice(i,1); }
        for (const e of this.enemies) { const edx=this.playerX-e.x; const edy=this.playerY-e.y; const dist=Math.sqrt(edx*edx+edy*edy); if(dist>1){e.x+=(edx/dist)*e.speed*dt; e.y+=(edy/dist)*e.speed*dt;} }
        for (let bi=this.bullets.length-1; bi>=0; bi--) { const b=this.bullets[bi]; for(let ei=this.enemies.length-1;ei>=0;ei--){ const e=this.enemies[ei]; const ddx=b.x-e.x;const ddy=b.y-e.y;const dist=Math.sqrt(ddx*ddx+ddy*ddy); if(dist<e.size+this.bulletRadius){e.hp--;this.bullets.splice(bi,1);if(e.hp<=0){this.score+=e.points;for(let p=0;p<6;p++){this.particles.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*200,vy:(Math.random()-0.5)*200,life:0.4,maxLife:0.4,color:this.theme.enemy,size:e.size*0.3});}this.enemies.splice(ei,1);}break;} } }
        if (!this.invincible) { for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];const ddx=this.playerX-e.x;const ddy=this.playerY-e.y;const dist=Math.sqrt(ddx*ddx+ddy*ddy);if(dist<ps+e.size){this.lives--;this.enemies.splice(i,1);for(let p=0;p<8;p++){this.particles.push({x:this.playerX,y:this.playerY,vx:(Math.random()-0.5)*300,vy:(Math.random()-0.5)*300,life:0.5,maxLife:0.5,color:this.theme.primary,size:3});}if(this.lives<=0){this.endGame();return;}this.invincible=true;this.invincibleTimer=this.invincibleDuration;break;}} }
        for (let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)this.particles.splice(i,1);}
    }
    fireBullet() { const adx=this.mouseX-this.playerX;const ady=this.mouseY-this.playerY;const dist=Math.sqrt(adx*adx+ady*ady);if(dist<1)return;this.bullets.push({x:this.playerX,y:this.playerY,vx:(adx/dist)*this.bulletSpeed,vy:(ady/dist)*this.bulletSpeed});this.shootCooldown=this.shootRate; }
    onClick(x, y) { if(this.gameOver)return;this.mouseX=x;this.mouseY=y;if(this.shootCooldown<=0)this.fireBullet(); }
    onMouseMove(x, y) { this.mouseX=x;this.mouseY=y; }
    onKeyDown(key) { if(key===' '&&!this.gameOver&&this.shootCooldown<=0)this.fireBullet(); }
    render() {
        const ctx=this.ctx;const W=this.canvas.width;const H=this.canvas.height;const t=this.theme;
        ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);
        ctx.strokeStyle=t.primary+'40';ctx.lineWidth=2;ctx.strokeRect(this.arenaX,this.arenaY,this.arenaW,this.arenaH);
        ctx.strokeStyle=t.primary+'0a';ctx.lineWidth=1;
        for(let x=this.arenaX;x<this.arenaX+this.arenaW;x+=40){ctx.beginPath();ctx.moveTo(x,this.arenaY);ctx.lineTo(x,this.arenaY+this.arenaH);ctx.stroke();}
        for(let y=this.arenaY;y<this.arenaY+this.arenaH;y+=40){ctx.beginPath();ctx.moveTo(this.arenaX,y);ctx.lineTo(this.arenaX+this.arenaW,y);ctx.stroke();}
        ctx.fillStyle=t.bullet;for(const b of this.bullets){ctx.beginPath();ctx.arc(b.x,b.y,this.bulletRadius,0,Math.PI*2);ctx.fill();}
        for(const e of this.enemies){if(e.type==='big'){ctx.fillStyle=t.enemy;ctx.fillRect(e.x-e.size,e.y-e.size,e.size*2,e.size*2);ctx.fillStyle=t.enemy+'60';ctx.fillRect(e.x-e.size*0.5,e.y-e.size*0.5,e.size,e.size);}else if(e.type==='fast'){ctx.fillStyle=t.enemy;ctx.beginPath();const angle=Math.atan2(this.playerY-e.y,this.playerX-e.x);ctx.moveTo(e.x+Math.cos(angle)*e.size,e.y+Math.sin(angle)*e.size);ctx.lineTo(e.x+Math.cos(angle+2.4)*e.size,e.y+Math.sin(angle+2.4)*e.size);ctx.lineTo(e.x+Math.cos(angle-2.4)*e.size,e.y+Math.sin(angle-2.4)*e.size);ctx.closePath();ctx.fill();}else{ctx.fillStyle=t.enemy;ctx.beginPath();ctx.arc(e.x,e.y,e.size,0,Math.PI*2);ctx.fill();const angle=Math.atan2(this.playerY-e.y,this.playerX-e.x);ctx.fillStyle=t.bg;ctx.beginPath();ctx.arc(e.x+Math.cos(angle)*e.size*0.4,e.y+Math.sin(angle)*e.size*0.4,e.size*0.25,0,Math.PI*2);ctx.fill();}}
        const blink=this.invincible&&Math.floor(this.invincibleTimer*10)%2===0;
        if(!blink){const aimDx=this.mouseX-this.playerX;const aimDy=this.mouseY-this.playerY;const aimDist=Math.sqrt(aimDx*aimDx+aimDy*aimDy);if(aimDist>1){ctx.strokeStyle=t.primary+'30';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(this.playerX,this.playerY);ctx.lineTo(this.playerX+(aimDx/aimDist)*40,this.playerY+(aimDy/aimDist)*40);ctx.stroke();ctx.setLineDash([]);}const charDir=this.mouseX>=this.playerX?'right':'left';drawCharacter(ctx,this.playerX,this.playerY,this.playerSize*2.2,charDir,'pistol',this.walkAnim);}
        for(const p of this.particles){const alpha=p.life/p.maxLife;ctx.globalAlpha=alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size||3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
        ctx.fillStyle=t.primary;ctx.font='bold 20px monospace';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(`Score: ${this.score}`,12,12);
        ctx.fillStyle=t.secondary;ctx.font='bold 16px monospace';ctx.textAlign='right';for(let i=0;i<this.lives;i++){ctx.beginPath();ctx.arc(W-20-i*24,22,8,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle=t.secondary+'80';ctx.font='13px monospace';ctx.textAlign='center';ctx.fillText(`Enemies: ${this.enemies.length}`,W/2,15);
        if(this.score===0&&this.elapsed<3){ctx.fillStyle=t.secondary+'aa';ctx.font='13px monospace';ctx.textAlign='center';ctx.fillText('WASD to move, Click/Space to shoot',W/2,H-12);}
        if(this.gameOver){ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);ctx.fillStyle=t.primary;ctx.font='bold 44px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('GAME OVER',W/2,H/2-30);ctx.fillStyle=t.secondary;ctx.font='bold 26px monospace';ctx.fillText(`Score: ${this.score}`,W/2,H/2+15);ctx.font='16px monospace';ctx.fillText(`Survived: ${Math.floor(this.elapsed)}s`,W/2,H/2+48);ctx.fillStyle=t.secondary+'aa';ctx.font='16px monospace';ctx.fillText('Refresh to play again',W/2,H/2+80);}
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 3D ShooterGame — Third-person arena shooter
// ══════════════════════════════════════════════════════════════════════════
class ShooterGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        // Physics
        this.moveSpeed = 10;
        this.jumpForce = 10;
        this.gravity = -25;
        this.cameraDistance = 10;
        this.cameraAngleY = 0.4;

        // Arena
        const sizeMap = { small: 25, medium: 40, large: 55 };
        this.arenaSize = sizeMap[cfg.arenaSize] || 40;

        // Sky
        this.createSky(cfg.theme.skyTop, cfg.theme.skyBottom, cfg.theme.fog, 30, 150);

        // Ground
        this.createGroundPlane(cfg.theme.ground, this.arenaSize * 2);

        // Arena walls
        const wallMat = new THREE.MeshStandardMaterial({ color: cfg.theme.color3d, roughness: 0.7, metalness: 0.1, transparent: true, opacity: 0.4 });
        const wallH = 4;
        const halfArena = this.arenaSize / 2;
        const wallGeoX = new THREE.BoxGeometry(this.arenaSize, wallH, 0.5);
        const wallGeoZ = new THREE.BoxGeometry(0.5, wallH, this.arenaSize);

        const walls = [
            { geo: wallGeoX, pos: [0, wallH/2, -halfArena] },
            { geo: wallGeoX, pos: [0, wallH/2, halfArena] },
            { geo: wallGeoZ, pos: [-halfArena, wallH/2, 0] },
            { geo: wallGeoZ, pos: [halfArena, wallH/2, 0] },
        ];
        this.wallBoxes = [];
        for (const w of walls) {
            const mesh = new THREE.Mesh(w.geo, wallMat);
            mesh.position.set(...w.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        }

        // Game state
        this.lives = 3;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.elapsed = 0;

        // Enemies
        this.enemies3D = [];
        const speedMap = { slow: 3, medium: 5, fast: 8 };
        this.enemyBaseSpeed = speedMap[cfg.enemySpeed] || 5;
        const spawnMap = { slow: 2.5, medium: 1.5, fast: 0.8 };
        this.spawnInterval = spawnMap[cfg.spawnRate] || 1.5;
        this.spawnTimer = 0;
        this.enemyMat = new THREE.MeshStandardMaterial({ color: cfg.theme.enemyColor, roughness: 0.6 });

        // Bullets
        this.bullets3D = [];
        this.bulletSpeed = 40;
        this.shootCooldown = 0;
        this.shootRate = 0.2;
        this.bulletMat = new THREE.MeshStandardMaterial({ color: cfg.theme.accent3d, emissive: cfg.theme.accent3d, emissiveIntensity: 0.5 });
        this.bulletGeo = new THREE.SphereGeometry(0.15, 8, 8);

        // HUD
        this.createHUD();
        this.createCrosshair();

        // Lives display
        this.livesEl = document.createElement('div');
        this.livesEl.className = 'game-3d-lives';
        this.updateLivesDisplay();
        if (this.hudEl) this.hudEl.appendChild(this.livesEl);

        // Player start
        this.playerPosition.set(0, 0, 0);
    }

    updateLivesDisplay() {
        let html = '';
        for (let i = 0; i < 3; i++) {
            html += `<div class="game-3d-life-dot ${i >= this.lives ? 'lost' : ''}"></div>`;
        }
        this.livesEl.innerHTML = html;
    }

    spawnEnemy() {
        const halfA = this.arenaSize / 2 - 2;
        const side = Math.floor(this.rng() * 4);
        let x, z;
        switch (side) {
            case 0: x = -halfA; z = (this.rng() - 0.5) * this.arenaSize; break;
            case 1: x = halfA; z = (this.rng() - 0.5) * this.arenaSize; break;
            case 2: z = -halfA; x = (this.rng() - 0.5) * this.arenaSize; break;
            default: z = halfA; x = (this.rng() - 0.5) * this.arenaSize; break;
        }

        const roll = this.rng();
        let size, speed, hp, points;
        if (roll < 0.1) { size = 1.2; speed = this.enemyBaseSpeed * 0.5; hp = 3; points = 30; }
        else if (roll < 0.3) { size = 0.5; speed = this.enemyBaseSpeed * 1.8; hp = 1; points = 20; }
        else { size = 0.8; speed = this.enemyBaseSpeed; hp = 1; points = 10; }

        speed *= 1 + this.elapsed * 0.01;

        const geo = new THREE.BoxGeometry(size, size * 1.5, size);
        const mesh = new THREE.Mesh(geo, this.enemyMat);
        mesh.position.set(x, size * 0.75, z);
        mesh.castShadow = true;
        this.scene.add(mesh);

        // Eyes (two small white cubes)
        const eyeGeo = new THREE.BoxGeometry(size * 0.15, size * 0.15, size * 0.05);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-size * 0.15, size * 0.3, size * 0.51);
        mesh.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(size * 0.15, size * 0.3, size * 0.51);
        mesh.add(rightEye);

        this.enemies3D.push({ mesh, x, z, size, speed, hp, points, height: size * 1.5 });
    }

    onClick(e) {
        if (this.gameOver || !this.pointerLocked) return;
        if (this.shootCooldown <= 0) {
            this.fireBullet();
        }
    }

    onKeyDown(code) {
        if (code === 'Space' && !this.gameOver && this.shootCooldown <= 0) {
            this.fireBullet();
        }
    }

    fireBullet() {
        // Shoot in the direction the camera is facing
        const dir = new THREE.Vector3(0, 0, 1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngleX);

        const mesh = new THREE.Mesh(this.bulletGeo, this.bulletMat);
        mesh.position.copy(this.playerPosition);
        mesh.position.y += 1.2; // shoot from chest height
        mesh.position.add(dir.clone().multiplyScalar(1)); // start slightly forward
        this.scene.add(mesh);

        this.bullets3D.push({
            mesh,
            vx: dir.x * this.bulletSpeed,
            vy: 0,
            vz: dir.z * this.bulletSpeed,
            life: 3,
        });

        this.shootCooldown = this.shootRate;
    }

    update(dt) {
        this.elapsed += dt;

        // Invincibility
        if (this.invincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) this.invincible = false;
            // Blink player
            if (this.playerModel) {
                this.playerModel.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
            }
        } else if (this.playerModel) {
            this.playerModel.visible = true;
        }

        // Clamp player to arena
        const halfA = this.arenaSize / 2 - 1;
        this.playerPosition.x = Math.max(-halfA, Math.min(halfA, this.playerPosition.x));
        this.playerPosition.z = Math.max(-halfA, Math.min(halfA, this.playerPosition.z));

        // Shoot cooldown
        this.shootCooldown -= dt;
        if (this.shootCooldown < 0) this.shootCooldown = 0;

        // Auto-fire with space held
        if (this.keys['Space'] && this.shootCooldown <= 0 && this.pointerLocked) {
            this.fireBullet();
        }

        // Spawn enemies
        this.spawnTimer += dt;
        const effectiveInterval = this.spawnInterval / (1 + this.elapsed * 0.01);
        if (this.spawnTimer >= effectiveInterval) {
            this.spawnTimer -= effectiveInterval;
            this.spawnEnemy();
        }

        // Update bullets
        for (let i = this.bullets3D.length - 1; i >= 0; i--) {
            const b = this.bullets3D[i];
            b.mesh.position.x += b.vx * dt;
            b.mesh.position.y += b.vy * dt;
            b.mesh.position.z += b.vz * dt;
            b.life -= dt;

            if (b.life <= 0 || Math.abs(b.mesh.position.x) > halfA + 5 || Math.abs(b.mesh.position.z) > halfA + 5) {
                this.scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                this.bullets3D.splice(i, 1);
            }
        }

        // Update enemies
        for (let i = this.enemies3D.length - 1; i >= 0; i--) {
            const e = this.enemies3D[i];
            const dx = this.playerPosition.x - e.mesh.position.x;
            const dz = this.playerPosition.z - e.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 0.5) {
                e.mesh.position.x += (dx / dist) * e.speed * dt;
                e.mesh.position.z += (dz / dist) * e.speed * dt;
                // Face player
                e.mesh.lookAt(this.playerPosition.x, e.mesh.position.y, this.playerPosition.z);
            }

            // Bullet-enemy collision
            for (let bi = this.bullets3D.length - 1; bi >= 0; bi--) {
                const b = this.bullets3D[bi];
                const bdx = b.mesh.position.x - e.mesh.position.x;
                const bdz = b.mesh.position.z - e.mesh.position.z;
                const bdy = b.mesh.position.y - e.mesh.position.y;
                const bdist = Math.sqrt(bdx * bdx + bdz * bdz + bdy * bdy);
                if (bdist < e.size + 0.3) {
                    e.hp--;
                    this.scene.remove(b.mesh);
                    b.mesh.geometry.dispose();
                    this.bullets3D.splice(bi, 1);
                    if (e.hp <= 0) {
                        this.score += e.points;
                        this.scene.remove(e.mesh);
                        e.mesh.geometry.dispose();
                        this.enemies3D.splice(i, 1);
                        this.updateHUDScore(this.score);
                    }
                    break;
                }
            }
        }

        // Enemy-player collision
        if (!this.invincible) {
            for (let i = this.enemies3D.length - 1; i >= 0; i--) {
                const e = this.enemies3D[i];
                const dx = this.playerPosition.x - e.mesh.position.x;
                const dz = this.playerPosition.z - e.mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < e.size + this.playerRadius + 0.3) {
                    this.lives--;
                    this.scene.remove(e.mesh);
                    e.mesh.geometry.dispose();
                    this.enemies3D.splice(i, 1);
                    this.updateLivesDisplay();

                    if (this.lives <= 0) {
                        this.endGame();
                        return;
                    }
                    this.invincible = true;
                    this.invincibleTimer = 1.5;
                    break;
                }
            }
        }

        // HUD
        if (this.hudInfoEl) {
            this.hudInfoEl.textContent = `Gegner: ${this.enemies3D.length}`;
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const enemySpeeds = ['slow', 'medium', 'fast'];
    const spawnRates = ['slow', 'medium', 'fast'];
    const arenaSizes = ['small', 'medium', 'large'];
    let seed = 1;

    for (const theme of themes) {
        for (const enemySpeed of enemySpeeds) {
            for (const spawnRate of spawnRates) {
                const arenaSize = arenaSizes[seed % arenaSizes.length];
                const name = generateGameName('Shooter', seed);
                const is3D = seed % 2 === 0;
                variations.push({
                    name: name + (is3D ? ' 3D' : ''),
                    category: 'Shooter',
                    is3D,
                    config: { enemySpeed, spawnRate, arenaSize, theme, seed, name: name + (is3D ? ' 3D' : '') },
                    thumbnail: generateThumbnail('Shooter', { theme }, seed)
                });
                seed++;
            }
        }
    }

    for (const theme of themes) {
        for (const arenaSize of arenaSizes) {
            for (const enemySpeed of enemySpeeds) {
                for (const spawnRate of spawnRates) {
                    if (arenaSize === arenaSizes[seed % arenaSizes.length]) { seed++; continue; }
                    const name = generateGameName('Shooter', seed);
                    const is3D = seed % 2 === 0;
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Shooter',
                        is3D,
                        config: { enemySpeed, spawnRate, arenaSize, theme, seed, name: name + (is3D ? ' 3D' : '') },
                        thumbnail: generateThumbnail('Shooter', { theme }, seed)
                    });
                    seed++;
                }
            }
        }
    }

    while (variations.length < 200) {
        const theme = themes[seed % themes.length];
        const enemySpeed = enemySpeeds[seed % enemySpeeds.length];
        const spawnRate = spawnRates[(seed + 1) % spawnRates.length];
        const arenaSize = arenaSizes[(seed + 2) % arenaSizes.length];
        const name = generateGameName('Shooter', seed);
        const is3D = seed % 2 === 0;
        variations.push({
            name: name + (is3D ? ' 3D' : ''),
            category: 'Shooter',
            is3D,
            config: { enemySpeed, spawnRate, arenaSize, theme, seed, name: name + (is3D ? ' 3D' : '') },
            thumbnail: generateThumbnail('Shooter', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate3D('Shooter', ShooterGame, ShooterGame3D, generateVariations);
