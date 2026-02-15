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
    { name: 'Wasteland', primary: '#a0522d', secondary: '#d2b48c', bg: '#1a1008', enemy: '#ff4444', resource: '#44ff88', grid: '#2a1a08', color3d: 0xa0522d, accent3d: 0xd2b48c, enemyColor: 0xff4444, resourceColor: 0x44ff88, skyTop: 0x87a0b0, skyBottom: 0x3a2a08, fog: 0x5a4a28, ground: 0x8a7a48 },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', enemy: '#ff006e', resource: '#00ffcc', grid: '#161650', color3d: 0x00ff87, accent3d: 0x60efff, enemyColor: 0xff006e, resourceColor: 0x00ffcc, skyTop: 0x0a0a2e, skyBottom: 0x161650, fog: 0x0a0a2e, ground: 0x161650 },
    { name: 'Arctic',    primary: '#88ccff', secondary: '#ddeeff', bg: '#0a1628', enemy: '#ff6666', resource: '#66ffaa', grid: '#102030', color3d: 0x88ccff, accent3d: 0xddeeff, enemyColor: 0xff6666, resourceColor: 0x66ffaa, skyTop: 0x87ceeb, skyBottom: 0x0a1628, fog: 0x5d8baa, ground: 0xc8d8dc },
    { name: 'Jungle',    primary: '#33cc33', secondary: '#66ff66', bg: '#0a1a0a', enemy: '#ff3300', resource: '#ffff33', grid: '#0e220e', color3d: 0x33cc33, accent3d: 0x66ff66, enemyColor: 0xff3300, resourceColor: 0xffff33, skyTop: 0x4a9a6f, skyBottom: 0x0a1a0a, fog: 0x1a3a2a, ground: 0x2a6a2f },
    { name: 'Lava',      primary: '#ff6600', secondary: '#ffaa33', bg: '#1a0800', enemy: '#ff0033', resource: '#33ff99', grid: '#2a1200', color3d: 0xff6600, accent3d: 0xffaa33, enemyColor: 0xff0033, resourceColor: 0x33ff99, skyTop: 0x1a0a00, skyBottom: 0x3a1a00, fog: 0x1a0a00, ground: 0x3a2a15 },
    { name: 'Cyber',     primary: '#cc33ff', secondary: '#ff66ff', bg: '#0f0020', enemy: '#ff3366', resource: '#33ffcc', grid: '#180030', color3d: 0xcc33ff, accent3d: 0xff66ff, enemyColor: 0xff3366, resourceColor: 0x33ffcc, skyTop: 0x10002b, skyBottom: 0x20104b, fog: 0x10002b, ground: 0x0a001b },
    { name: 'Ocean',     primary: '#0099cc', secondary: '#66ccee', bg: '#030820', enemy: '#ff4466', resource: '#66ff88', grid: '#051030', color3d: 0x0099cc, accent3d: 0x66ccee, enemyColor: 0xff4466, resourceColor: 0x66ff88, skyTop: 0x03045e, skyBottom: 0x0a0a4e, fog: 0x03045e, ground: 0x1a5a6a },
    { name: 'Midnight',  primary: '#6666cc', secondary: '#9999ee', bg: '#08080f', enemy: '#ff5555', resource: '#55ff99', grid: '#10101a', color3d: 0x6666cc, accent3d: 0x9999ee, enemyColor: 0xff5555, resourceColor: 0x55ff99, skyTop: 0x0f0720, skyBottom: 0x1f1740, fog: 0x0f0720, ground: 0x1a1a3a },
];

// ══════════════════════════════════════════════════════════════════════════
// 2D SurvivalGame (original, kept intact but compressed)
// ══════════════════════════════════════════════════════════════════════════
class SurvivalGame extends BaseGame {
    init() {
        const cfg = this.config; this.theme = cfg.theme; this.rng = mulberry32_2d(cfg.seed || 1);
        const W = this.canvas.width; const H = this.canvas.height;
        const mapSizes = { small: 1.0, medium: 1.5, large: 2.0 };
        this.mapScale = mapSizes[cfg.mapSize] || 1.5; this.mapW = W * this.mapScale; this.mapH = H * this.mapScale;
        this.player = { x: this.mapW/2, y: this.mapH/2, radius: 12, speed: 180, hp: 100, maxHp: 100, shieldTimer: 0, direction: 'right', walkAnim: 0 };
        this.camX = 0; this.camY = 0;
        const densityMap = { sparse: 6, normal: 12, abundant: 20 };
        this.maxResources = densityMap[cfg.resourceDensity] || 12;
        this.resources = []; for (let i = 0; i < this.maxResources; i++) this.spawnResource();
        this.enemies = []; this.enemyTypes = cfg.enemyTypes || 2;
        const spawnRateMap = { slow: 2.5, medium: 1.5, fast: 0.8 };
        this.baseSpawnInterval = spawnRateMap[cfg.spawnRate] || 1.5;
        this.spawnTimer = this.baseSpawnInterval; this.timeSurvived = 0; this.particles = []; this.damageCooldown = 0;
    }
    spawnResource() {
        const type = this.rng() < 0.25 ? 'shield' : 'health';
        this.resources.push({ x: 30+this.rng()*(this.mapW-60), y: 30+this.rng()*(this.mapH-60), type, radius: 8, bobPhase: this.rng()*Math.PI*2 });
    }
    spawnEnemy() {
        const W = this.canvas.width; const H = this.canvas.height;
        const side = Math.floor(this.rng()*4); let x, y;
        switch(side){ case 0:x=this.camX-30;y=this.camY+this.rng()*H;break; case 1:x=this.camX+W+30;y=this.camY+this.rng()*H;break; case 2:x=this.camX+this.rng()*W;y=this.camY-30;break; default:x=this.camX+this.rng()*W;y=this.camY+H+30;break; }
        const typeIndex = Math.floor(this.rng()*this.enemyTypes);
        const types = [{ speed:60,radius:10,hp:1,color:this.theme.enemy },{ speed:90,radius:7,hp:1,color:'#ff8800' },{ speed:40,radius:16,hp:2,color:'#cc0044' }];
        const t = types[typeIndex]||types[0]; const speedMult = 1+this.timeSurvived/120;
        this.enemies.push({ x,y, speed:t.speed*speedMult, radius:t.radius, hp:t.hp, color:t.color });
    }
    update(dt) {
        const W=this.canvas.width;const H=this.canvas.height;const p=this.player;
        this.timeSurvived+=dt;
        let dx=0,dy=0;
        if(this.keys['w']||this.keys['W']||this.keys['ArrowUp'])dy-=1;
        if(this.keys['s']||this.keys['S']||this.keys['ArrowDown'])dy+=1;
        if(this.keys['a']||this.keys['A']||this.keys['ArrowLeft'])dx-=1;
        if(this.keys['d']||this.keys['D']||this.keys['ArrowRight'])dx+=1;
        if(dx!==0||dy!==0){const len=Math.sqrt(dx*dx+dy*dy);dx/=len;dy/=len;p.x+=dx*p.speed*dt;p.y+=dy*p.speed*dt;p.walkAnim+=dt*6;if(Math.abs(dx)>Math.abs(dy)){p.direction=dx>0?'right':'left';}else{p.direction=dy>0?'down':'up';}}
        p.x=Math.max(p.radius,Math.min(this.mapW-p.radius,p.x));p.y=Math.max(p.radius,Math.min(this.mapH-p.radius,p.y));
        this.camX=Math.max(0,Math.min(this.mapW-W,p.x-W/2));this.camY=Math.max(0,Math.min(this.mapH-H,p.y-H/2));
        if(p.shieldTimer>0)p.shieldTimer-=dt;if(this.damageCooldown>0)this.damageCooldown-=dt;
        for(let i=this.resources.length-1;i>=0;i--){const r=this.resources[i];const rdx=p.x-r.x;const rdy=p.y-r.y;const dist=Math.sqrt(rdx*rdx+rdy*rdy);if(dist<p.radius+r.radius){if(r.type==='health'){p.hp=Math.min(p.maxHp,p.hp+10);this.score+=5;}else{p.shieldTimer=3;this.score+=10;}for(let j=0;j<6;j++){this.particles.push({x:r.x,y:r.y,vx:(this.rng()-0.5)*150,vy:(this.rng()-0.5)*150,life:0.5,maxLife:0.5,color:r.type==='health'?this.theme.resource:'#66ccff'});}this.resources.splice(i,1);this.spawnResource();}}
        const spawnInterval=Math.max(0.3,this.baseSpawnInterval-this.timeSurvived/60);this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=spawnInterval;const count=1+Math.floor(this.timeSurvived/30);for(let i=0;i<count;i++)this.spawnEnemy();}
        for(let i=this.enemies.length-1;i>=0;i--){const e=this.enemies[i];const edx=p.x-e.x;const edy=p.y-e.y;const elen=Math.sqrt(edx*edx+edy*edy);if(elen>0){e.x+=(edx/elen)*e.speed*dt;e.y+=(edy/elen)*e.speed*dt;}if(elen<p.radius+e.radius){if(p.shieldTimer>0){for(let j=0;j<4;j++){this.particles.push({x:e.x,y:e.y,vx:(this.rng()-0.5)*120,vy:(this.rng()-0.5)*120,life:0.4,maxLife:0.4,color:'#66ccff'});}this.enemies.splice(i,1);this.score+=15;continue;}if(this.damageCooldown<=0){p.hp-=15;this.damageCooldown=0.5;for(let j=0;j<3;j++){this.particles.push({x:p.x,y:p.y,vx:(this.rng()-0.5)*100,vy:(this.rng()-0.5)*100,life:0.3,maxLife:0.3,color:'#ff4444'});}if(p.hp<=0){p.hp=0;this.endGame();return;}}}if(e.x<-100||e.x>this.mapW+100||e.y<-100||e.y>this.mapH+100)this.enemies.splice(i,1);}
        const prevSec=Math.floor(this.timeSurvived-dt);const curSec=Math.floor(this.timeSurvived);if(curSec>prevSec)this.score+=curSec-prevSec;
        for(let i=this.particles.length-1;i>=0;i--){const pt=this.particles[i];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.life-=dt;if(pt.life<=0)this.particles.splice(i,1);}
    }
    render() {
        const ctx=this.ctx;const W=this.canvas.width;const H=this.canvas.height;const t=this.theme;const p=this.player;
        ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H);
        ctx.save();ctx.translate(-this.camX,-this.camY);
        ctx.strokeStyle=t.grid;ctx.lineWidth=1;const gridStep=40;const startGX=Math.floor(this.camX/gridStep)*gridStep;const startGY=Math.floor(this.camY/gridStep)*gridStep;
        for(let gx=startGX;gx<this.camX+W+gridStep;gx+=gridStep){ctx.beginPath();ctx.moveTo(gx,this.camY);ctx.lineTo(gx,this.camY+H);ctx.stroke();}
        for(let gy=startGY;gy<this.camY+H+gridStep;gy+=gridStep){ctx.beginPath();ctx.moveTo(this.camX,gy);ctx.lineTo(this.camX+W,gy);ctx.stroke();}
        ctx.strokeStyle=t.primary+'40';ctx.lineWidth=3;ctx.strokeRect(0,0,this.mapW,this.mapH);
        for(const r of this.resources){const bob=Math.sin(r.bobPhase+this.timeSurvived*3)*3;ctx.fillStyle=(r.type==='health'?t.resource:'#66ccff')+'30';ctx.beginPath();ctx.arc(r.x,r.y+bob,r.radius*2,0,Math.PI*2);ctx.fill();if(r.type==='health'){ctx.fillStyle=t.resource;ctx.save();ctx.translate(r.x,r.y+bob);ctx.rotate(Math.PI/4);ctx.fillRect(-r.radius*0.6,-r.radius*0.6,r.radius*1.2,r.radius*1.2);ctx.restore();}else{ctx.fillStyle='#66ccff';ctx.beginPath();ctx.arc(r.x,r.y+bob,r.radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#003366';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',r.x,r.y+bob);}}
        for(const e of this.enemies){ctx.fillStyle=e.color+'30';ctx.beginPath();ctx.arc(e.x,e.y,e.radius*1.6,0,Math.PI*2);ctx.fill();ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000000aa';const eyeOff=e.radius*0.3;const eyeR=e.radius*0.2;ctx.beginPath();ctx.arc(e.x-eyeOff,e.y-eyeOff,eyeR,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(e.x+eyeOff,e.y-eyeOff,eyeR,0,Math.PI*2);ctx.fill();}
        if(p.shieldTimer>0){const alpha=Math.min(1,p.shieldTimer)*0.4;ctx.strokeStyle=`rgba(100,200,255,${alpha})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.radius+8,0,Math.PI*2);ctx.stroke();}
        if(this.damageCooldown>0.3)ctx.globalAlpha=0.5;
        drawCharacter(ctx,p.x,p.y,p.radius*2.8,p.direction,'sword',p.walkAnim);ctx.globalAlpha=1;
        for(const pt of this.particles){const alpha=pt.life/pt.maxLife;ctx.globalAlpha=alpha;ctx.fillStyle=pt.color;ctx.beginPath();ctx.arc(pt.x,pt.y,3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
        ctx.restore();
        const hbX=12,hbY=12,hbW=150,hbH=16;ctx.fillStyle='#333333';ctx.fillRect(hbX,hbY,hbW,hbH);const hpFrac=p.hp/p.maxHp;const hpColor=hpFrac>0.5?'#44cc44':hpFrac>0.25?'#cccc44':'#cc4444';ctx.fillStyle=hpColor;ctx.fillRect(hbX,hbY,hbW*hpFrac,hbH);ctx.strokeStyle='#ffffffaa';ctx.lineWidth=1;ctx.strokeRect(hbX,hbY,hbW,hbH);ctx.fillStyle='#ffffff';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`HP: ${Math.ceil(p.hp)}`,hbX+hbW/2,hbY+hbH/2);
        if(p.shieldTimer>0){ctx.fillStyle='#66ccff';ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(`SHIELD ${Math.ceil(p.shieldTimer)}s`,hbX,hbY+hbH+6);}
        ctx.fillStyle=t.primary;ctx.font='bold 20px monospace';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText(`Score: ${this.score}`,W-12,12);ctx.fillStyle=t.secondary+'cc';ctx.font='14px monospace';ctx.fillText(`Time: ${Math.floor(this.timeSurvived)}s`,W-12,36);ctx.fillStyle=t.enemy||'#ff4444';ctx.font='12px monospace';ctx.fillText(`Enemies: ${this.enemies.length}`,W-12,56);
        if(this.timeSurvived<3){ctx.fillStyle=t.secondary+'aa';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText('WASD to move — Collect resources — Avoid enemies!',W/2,H-16);}
        if(this.gameOver){ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);ctx.fillStyle=t.primary;ctx.font='bold 44px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('GAME OVER',W/2,H/2-40);ctx.fillStyle=t.secondary;ctx.font='bold 26px monospace';ctx.fillText(`Score: ${this.score}`,W/2,H/2+5);ctx.font='18px monospace';ctx.fillText(`Survived: ${Math.floor(this.timeSurvived)}s`,W/2,H/2+38);ctx.fillStyle=t.secondary+'aa';ctx.font='16px monospace';ctx.fillText('Refresh to play again',W/2,H/2+75);}
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 3D SurvivalGame — Open field with resources and enemies
// ══════════════════════════════════════════════════════════════════════════
class SurvivalGame3D extends BaseGame3D {
    async init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        // Physics
        this.moveSpeed = 8;
        this.jumpForce = 10;
        this.gravity = -25;
        this.cameraDistance = 12;
        this.cameraAngleY = 0.45;

        // Map size
        const mapSizes = { small: 40, medium: 60, large: 80 };
        this.mapSize = mapSizes[cfg.mapSize] || 60;

        // Sky
        this.createSky(cfg.theme.skyTop, cfg.theme.skyBottom, cfg.theme.fog, 30, 150);

        // Ground
        this.createGroundPlane(cfg.theme.ground, this.mapSize * 2);

        // Player state
        this.hp = 100;
        this.maxHp = 100;
        this.shieldTimer = 0;
        this.damageCooldown = 0;
        this.timeSurvived = 0;

        // Resources
        const densityMap = { sparse: 8, normal: 15, abundant: 25 };
        this.maxResources = densityMap[cfg.resourceDensity] || 15;
        this.resources3D = [];
        this.resourceMat = new THREE.MeshStandardMaterial({ color: cfg.theme.resourceColor, emissive: cfg.theme.resourceColor, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.5 });
        this.shieldMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x66ccff, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.5 });

        for (let i = 0; i < this.maxResources; i++) {
            this.spawnResource();
        }

        // Obstacles (trees and rocks)
        this.obstacles = [];
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d6a2d, roughness: 0.8 });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
        const halfMap = this.mapSize / 2;

        for (let i = 0; i < 20; i++) {
            const x = (this.rng() - 0.5) * this.mapSize * 0.9;
            const z = (this.rng() - 0.5) * this.mapSize * 0.9;

            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue; // Keep spawn clear

            if (this.rng() < 0.6) {
                // Tree: cylinder trunk + sphere canopy
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 8), trunkMat);
                trunk.position.set(x, 1, z);
                trunk.castShadow = true;
                this.scene.add(trunk);

                const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), treeMat);
                canopy.position.set(x, 2.8, z);
                canopy.castShadow = true;
                this.scene.add(canopy);

                this.obstacles.push({ x: x - 0.5, y: 0, z: z - 0.5, w: 1, h: 4, d: 1 });
            } else {
                // Rock: sphere
                const size = 0.5 + this.rng() * 1;
                const rock = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 6), rockMat);
                rock.position.set(x, size * 0.5, z);
                rock.castShadow = true;
                this.scene.add(rock);

                this.obstacles.push({ x: x - size, y: 0, z: z - size, w: size * 2, h: size * 2, d: size * 2 });
            }
        }

        // Enemies
        this.enemies3D = [];
        this.enemyTypes = cfg.enemyTypes || 2;
        const spawnRateMap = { slow: 3, medium: 1.8, fast: 1 };
        this.baseSpawnInterval = spawnRateMap[cfg.spawnRate] || 1.8;
        this.spawnTimer = this.baseSpawnInterval;
        this.enemyMat = new THREE.MeshStandardMaterial({ color: cfg.theme.enemyColor, roughness: 0.6 });

        // HUD
        this.createHUD();
        this.createHealthBar(this.maxHp);

        // Player start
        this.playerPosition.set(0, 0, 0);
    }

    spawnResource() {
        const halfMap = this.mapSize / 2 - 3;
        const type = this.rng() < 0.25 ? 'shield' : 'health';
        const x = (this.rng() - 0.5) * this.mapSize * 0.9;
        const z = (this.rng() - 0.5) * this.mapSize * 0.9;

        const geo = type === 'health'
            ? new THREE.OctahedronGeometry(0.4)
            : new THREE.SphereGeometry(0.4, 8, 8);
        const mesh = new THREE.Mesh(geo, type === 'health' ? this.resourceMat : this.shieldMat);
        mesh.position.set(x, 1.2, z);
        mesh.castShadow = true;
        this.scene.add(mesh);

        this.resources3D.push({ mesh, type, phase: this.rng() * Math.PI * 2, baseY: 1.2 });
    }

    spawnEnemy() {
        const halfMap = this.mapSize / 2;
        const side = Math.floor(this.rng() * 4);
        let x, z;
        switch (side) {
            case 0: x = -halfMap; z = (this.rng() - 0.5) * this.mapSize; break;
            case 1: x = halfMap; z = (this.rng() - 0.5) * this.mapSize; break;
            case 2: z = -halfMap; x = (this.rng() - 0.5) * this.mapSize; break;
            default: z = halfMap; x = (this.rng() - 0.5) * this.mapSize; break;
        }

        const typeIndex = Math.floor(this.rng() * this.enemyTypes);
        const speeds = [3, 5, 2.5];
        const sizes = [0.6, 0.4, 1.0];
        const speed = (speeds[typeIndex] || 3) * (1 + this.timeSurvived / 120);
        const size = sizes[typeIndex] || 0.6;

        const geo = new THREE.BoxGeometry(size, size * 1.5, size);
        const mesh = new THREE.Mesh(geo, this.enemyMat);
        mesh.position.set(x, size * 0.75, z);
        mesh.castShadow = true;
        this.scene.add(mesh);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(size * 0.15, size * 0.15, size * 0.05);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-size * 0.15, size * 0.3, size * 0.51);
        mesh.add(lEye);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(size * 0.15, size * 0.3, size * 0.51);
        mesh.add(rEye);

        this.enemies3D.push({ mesh, speed, size, radius: size * 0.7 });
    }

    update(dt) {
        this.timeSurvived += dt;

        // Clamp player to map
        const halfMap = this.mapSize / 2 - 1;
        this.playerPosition.x = Math.max(-halfMap, Math.min(halfMap, this.playerPosition.x));
        this.playerPosition.z = Math.max(-halfMap, Math.min(halfMap, this.playerPosition.z));

        // Obstacle collision
        for (const obs of this.obstacles) {
            if (this.checkBoxCollision(obs)) {
                this.resolveBoxCollision(obs);
            }
        }

        // Shield
        if (this.shieldTimer > 0) this.shieldTimer -= dt;
        if (this.damageCooldown > 0) this.damageCooldown -= dt;

        // Resource bobbing + collection
        const time = this.clock.elapsedTime;
        for (let i = this.resources3D.length - 1; i >= 0; i--) {
            const r = this.resources3D[i];
            r.mesh.position.y = r.baseY + Math.sin(time * 3 + r.phase) * 0.3;
            r.mesh.rotation.y = time * 2;

            // Collection check
            const dx = this.playerPosition.x - r.mesh.position.x;
            const dz = this.playerPosition.z - r.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 1.5) {
                if (r.type === 'health') {
                    this.hp = Math.min(this.maxHp, this.hp + 10);
                    this.score += 5;
                } else {
                    this.shieldTimer = 3;
                    this.score += 10;
                }
                this.scene.remove(r.mesh);
                r.mesh.geometry.dispose();
                this.resources3D.splice(i, 1);
                this.spawnResource();
                this.updateHUDScore(this.score);
                this.updateHealthBar(this.hp);
            }
        }

        // Enemy spawning
        const spawnInterval = Math.max(0.4, this.baseSpawnInterval - this.timeSurvived / 60);
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = spawnInterval;
            const count = 1 + Math.floor(this.timeSurvived / 30);
            for (let i = 0; i < count; i++) this.spawnEnemy();
        }

        // Enemy AI
        for (let i = this.enemies3D.length - 1; i >= 0; i--) {
            const e = this.enemies3D[i];
            const dx = this.playerPosition.x - e.mesh.position.x;
            const dz = this.playerPosition.z - e.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 0.5) {
                e.mesh.position.x += (dx / dist) * e.speed * dt;
                e.mesh.position.z += (dz / dist) * e.speed * dt;
                e.mesh.lookAt(this.playerPosition.x, e.mesh.position.y, this.playerPosition.z);
            }

            // Player collision
            if (dist < e.radius + this.playerRadius + 0.3) {
                if (this.shieldTimer > 0) {
                    // Destroy on shield
                    this.scene.remove(e.mesh);
                    e.mesh.geometry.dispose();
                    this.enemies3D.splice(i, 1);
                    this.score += 15;
                    this.updateHUDScore(this.score);
                    continue;
                }
                if (this.damageCooldown <= 0) {
                    this.hp -= 15;
                    this.damageCooldown = 0.5;
                    this.updateHealthBar(this.hp);
                    if (this.hp <= 0) {
                        this.hp = 0;
                        this.endGame();
                        return;
                    }
                }
            }

            // Remove far enemies
            if (Math.abs(e.mesh.position.x) > halfMap + 20 || Math.abs(e.mesh.position.z) > halfMap + 20) {
                this.scene.remove(e.mesh);
                e.mesh.geometry.dispose();
                this.enemies3D.splice(i, 1);
            }
        }

        // Score: 1 per second survived
        const prevSec = Math.floor(this.timeSurvived - dt);
        const curSec = Math.floor(this.timeSurvived);
        if (curSec > prevSec) {
            this.score += curSec - prevSec;
            this.updateHUDScore(this.score);
        }

        // HUD info
        if (this.hudInfoEl) {
            this.hudInfoEl.innerHTML = `Zeit: ${Math.floor(this.timeSurvived)}s<br>Gegner: ${this.enemies3D.length}`;
        }

        // Damage blink
        if (this.playerModel) {
            this.playerModel.visible = this.damageCooldown <= 0.3 || Math.floor(this.damageCooldown * 10) % 2 === 0;
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const mapSizes = ['small', 'medium', 'large'];
    const densities = ['sparse', 'normal', 'abundant'];
    const enemyTypeCounts = [1, 2, 3];
    const spawnRates = ['slow', 'medium', 'fast'];
    let seed = 1;

    for (const mapSize of mapSizes) {
        for (const resourceDensity of densities) {
            for (const enemyTypes of enemyTypeCounts) {
                for (const theme of themes) {
                    const spawnRate = spawnRates[seed % spawnRates.length];
                    const name = generateGameName('Survival', seed);
                    const is3D = seed % 2 === 0;
                    variations.push({
                        name: name + (is3D ? ' 3D' : ''),
                        category: 'Survival',
                        is3D,
                        config: { mapSize, resourceDensity, enemyTypes, spawnRate, theme, seed, name: name + (is3D ? ' 3D' : '') },
                        thumbnail: generateThumbnail('Survival', { theme }, seed),
                    });
                    seed++;
                }
            }
        }
    }
    return variations; // 3 * 3 * 3 * 8 = 216
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate3D('Survival', SurvivalGame, SurvivalGame3D, generateVariations);
