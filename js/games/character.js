// js/games/character.js
// Reusable 2D blocky character renderer for canvas games (Roblox-style)

// Standard character colors (fixed, same for everyone)
export const CHAR = {
    skin: '#ffb347',
    shirt: '#4a90d9',
    pants: '#2c3e50',
    hair: '#3d2b1f',
    eyes: '#ffffff',
    pupils: '#111111',
    shoes: '#1a1a2e',
    mouth: '#d4873a',
};

// Items per game category
export const GAME_ITEMS = {
    'Platformer': 'none',
    'Shooter': 'pistol',
    'Survival': 'sword',
    'Racing': 'helmet',
    'Space': 'laser',
    'Snake': 'none',
    'Flappy': 'cape',
    'Maze': 'torch',
    'Catch': 'basket',
    'Tower Defense': 'wrench',
    'Obby': 'none',
    'Tycoon': 'wrench',
    'Fishing': 'rod',
    'Farming': 'hoe',
    'Cooking': 'spatula',
};

/**
 * Draw the standard GoBlox character on a 2D canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - center X position
 * @param {number} y - center Y position (center of character)
 * @param {number} size - total height of character
 * @param {string} direction - 'right', 'left', 'down' (front), 'up' (back)
 * @param {string} item - item name ('pistol', 'sword', 'none', etc.)
 * @param {number} [animFrame=0] - animation frame (0-1 for walk cycle)
 */
export function drawCharacter(ctx, x, y, size, direction = 'right', item = 'none', animFrame = 0) {
    ctx.save();

    const s = size; // total height
    const halfS = s / 2;

    // Proportions (relative to size)
    const headH = s * 0.30;
    const headW = s * 0.26;
    const torsoH = s * 0.25;
    const torsoW = s * 0.22;
    const armW = s * 0.08;
    const armH = s * 0.22;
    const legW = s * 0.09;
    const legH = s * 0.22;
    const shoeH = s * 0.05;
    const hairH = s * 0.06;

    // Y offsets from top of character
    const topY = y - halfS;
    const hairY = topY;
    const headY = topY + hairH;
    const torsoY = headY + headH;
    const armY = torsoY;
    const legY = torsoY + torsoH;

    const facing = direction === 'left' ? -1 : 1;
    const isSide = direction === 'left' || direction === 'right';
    const isFront = direction === 'down';

    // Walk animation - leg offsets
    const walkOffset = Math.sin(animFrame * Math.PI * 2) * legH * 0.2;

    if (isSide) {
        // ── SIDE VIEW ──
        const cx = x; // center x

        // Back arm (behind body)
        ctx.fillStyle = CHAR.skin;
        const backArmX = cx - facing * torsoW * 0.1;
        ctx.fillRect(backArmX - armW / 2, armY, armW, armH);
        // Back hand
        ctx.fillStyle = '#e0963a';
        ctx.fillRect(backArmX - armW / 2, armY + armH - armW, armW, armW);

        // Legs
        ctx.fillStyle = CHAR.pants;
        const legCx = cx;
        // Back leg
        ctx.fillRect(legCx - legW * 0.7, legY - walkOffset, legW, legH);
        // Back shoe
        ctx.fillStyle = CHAR.shoes;
        ctx.fillRect(legCx - legW * 0.7, legY + legH - shoeH - walkOffset, legW, shoeH);

        // Front leg
        ctx.fillStyle = CHAR.pants;
        ctx.fillRect(legCx - legW * 0.3, legY + walkOffset, legW, legH);
        // Front shoe
        ctx.fillStyle = CHAR.shoes;
        ctx.fillRect(legCx - legW * 0.3, legY + legH - shoeH + walkOffset, legW, shoeH);

        // Torso
        ctx.fillStyle = CHAR.shirt;
        ctx.fillRect(cx - torsoW / 2, torsoY, torsoW, torsoH);
        // Shirt collar
        ctx.fillStyle = '#3a78b8';
        ctx.fillRect(cx - torsoW * 0.2, torsoY, torsoW * 0.4, s * 0.03);

        // Head
        ctx.fillStyle = CHAR.skin;
        const headCx = cx;
        ctx.fillRect(headCx - headW / 2, headY, headW, headH);

        // Hair (top of head)
        ctx.fillStyle = CHAR.hair;
        ctx.fillRect(headCx - headW / 2 - s * 0.01, hairY, headW + s * 0.02, hairH + s * 0.02);
        // Side hair tuft
        ctx.fillRect(headCx - facing * headW * 0.45, headY, headW * 0.12, headH * 0.35);

        // Eye (on facing side)
        const eyeX = headCx + facing * headW * 0.15;
        const eyeY = headY + headH * 0.35;
        const eyeW = s * 0.05;
        const eyeH = s * 0.06;
        ctx.fillStyle = CHAR.eyes;
        ctx.fillRect(eyeX - eyeW / 2, eyeY, eyeW, eyeH);
        // Pupil
        ctx.fillStyle = CHAR.pupils;
        const pupilS = eyeW * 0.55;
        ctx.fillRect(eyeX - pupilS / 2 + facing * pupilS * 0.2, eyeY + eyeH * 0.25, pupilS, pupilS);

        // Mouth
        ctx.fillStyle = CHAR.mouth;
        ctx.fillRect(headCx + facing * headW * 0.08, headY + headH * 0.7, s * 0.04, s * 0.02);

        // Front arm (holds item)
        ctx.fillStyle = CHAR.skin;
        const frontArmX = cx + facing * torsoW * 0.15;
        let frontArmAngle = 0;

        // Angle arm based on item
        if (item === 'pistol' || item === 'laser') {
            frontArmAngle = -0.4; // angled forward
        } else if (item === 'sword') {
            frontArmAngle = -0.6;
        } else if (item === 'torch') {
            frontArmAngle = -0.8;
        } else if (item === 'rod') {
            frontArmAngle = -0.5;
        } else if (item === 'hoe' || item === 'spatula' || item === 'wrench') {
            frontArmAngle = -0.3;
        }

        if (frontArmAngle !== 0 && item !== 'none') {
            ctx.save();
            ctx.translate(frontArmX, armY);
            ctx.rotate(facing < 0 ? -frontArmAngle : frontArmAngle);
            ctx.fillStyle = CHAR.skin;
            ctx.fillRect(-armW / 2, 0, armW, armH);
            ctx.fillStyle = '#e0963a';
            ctx.fillRect(-armW / 2, armH - armW, armW, armW);

            // Draw item at hand position
            drawItemAtHand(ctx, 0, armH - armW / 2, s, item, facing);
            ctx.restore();
        } else {
            ctx.fillStyle = CHAR.skin;
            ctx.fillRect(frontArmX - armW / 2, armY, armW, armH);
            ctx.fillStyle = '#e0963a';
            ctx.fillRect(frontArmX - armW / 2, armY + armH - armW, armW, armW);
        }

        // Cape (if item is cape, draw behind character)
        if (item === 'cape') {
            drawCape(ctx, cx, torsoY, torsoW, torsoH, s, facing, animFrame);
        }

        // Helmet (drawn on top of head)
        if (item === 'helmet') {
            drawHelmet(ctx, headCx, hairY, headW, headH, hairH, s);
        }
    } else {
        // ── FRONT / BACK VIEW ──
        const cx = x;

        // Legs
        ctx.fillStyle = CHAR.pants;
        const legGap = s * 0.02;
        ctx.fillRect(cx - legW - legGap / 2, legY - walkOffset, legW, legH);
        ctx.fillRect(cx + legGap / 2, legY + walkOffset, legW, legH);
        // Shoes
        ctx.fillStyle = CHAR.shoes;
        ctx.fillRect(cx - legW - legGap / 2, legY + legH - shoeH - walkOffset, legW, shoeH);
        ctx.fillRect(cx + legGap / 2, legY + legH - shoeH + walkOffset, legW, shoeH);

        // Arms
        ctx.fillStyle = CHAR.skin;
        const armGap = torsoW / 2 + s * 0.01;
        ctx.fillRect(cx - armGap - armW, armY, armW, armH);
        ctx.fillRect(cx + armGap, armY, armW, armH);
        // Hands
        ctx.fillStyle = '#e0963a';
        ctx.fillRect(cx - armGap - armW, armY + armH - armW, armW, armW);
        ctx.fillRect(cx + armGap, armY + armH - armW, armW, armW);

        // Torso
        ctx.fillStyle = CHAR.shirt;
        ctx.fillRect(cx - torsoW / 2, torsoY, torsoW, torsoH);
        // Collar
        ctx.fillStyle = '#3a78b8';
        ctx.fillRect(cx - torsoW * 0.2, torsoY, torsoW * 0.4, s * 0.03);

        // Head
        ctx.fillStyle = CHAR.skin;
        ctx.fillRect(cx - headW / 2, headY, headW, headH);

        // Hair
        ctx.fillStyle = CHAR.hair;
        ctx.fillRect(cx - headW / 2 - s * 0.01, hairY, headW + s * 0.02, hairH + s * 0.02);

        if (isFront) {
            // Front face - two eyes
            const eyeSpacing = headW * 0.22;
            const eyeY = headY + headH * 0.35;
            const eyeW = s * 0.05;
            const eyeH = s * 0.06;
            // Left eye
            ctx.fillStyle = CHAR.eyes;
            ctx.fillRect(cx - eyeSpacing - eyeW / 2, eyeY, eyeW, eyeH);
            ctx.fillRect(cx + eyeSpacing - eyeW / 2, eyeY, eyeW, eyeH);
            // Pupils
            ctx.fillStyle = CHAR.pupils;
            const pupilS = eyeW * 0.55;
            ctx.fillRect(cx - eyeSpacing, eyeY + eyeH * 0.25, pupilS, pupilS);
            ctx.fillRect(cx + eyeSpacing, eyeY + eyeH * 0.25, pupilS, pupilS);
            // Mouth
            ctx.fillStyle = CHAR.mouth;
            ctx.fillRect(cx - s * 0.025, headY + headH * 0.72, s * 0.05, s * 0.02);
        }
        // Back view: no face, just hair on back
        if (direction === 'up') {
            ctx.fillStyle = CHAR.hair;
            ctx.fillRect(cx - headW / 2 - s * 0.01, headY, headW + s * 0.02, headH * 0.4);
        }

        // Item in right hand (front view)
        if (item !== 'none' && item !== 'cape' && item !== 'helmet') {
            const handX = cx + armGap + armW / 2;
            ctx.save();
            ctx.translate(handX, armY + armH - armW / 2);
            drawItemAtHand(ctx, 0, 0, s, item, 1);
            ctx.restore();
        }

        if (item === 'cape') {
            drawCape(ctx, cx, torsoY, torsoW, torsoH, s, 1, animFrame);
        }
        if (item === 'helmet') {
            drawHelmet(ctx, cx, hairY, headW, headH, hairH, s);
        }
    }

    ctx.restore();
}

// ── Draw an item at the character's hand position ──
// Called in local (arm) coordinate space: (0,0) = hand center
function drawItemAtHand(ctx, hx, hy, size, item, facing) {
    const s = size;
    const f = facing;

    switch (item) {
        case 'pistol': {
            // L-shaped gun
            ctx.fillStyle = '#333333';
            // Barrel
            ctx.fillRect(hx + f * s * 0.01, hy - s * 0.015, f * s * 0.12, s * 0.03);
            // Handle
            ctx.fillRect(hx - s * 0.01, hy, s * 0.025, s * 0.06);
            // Barrel tip
            ctx.fillStyle = '#555555';
            ctx.fillRect(hx + f * s * 0.11, hy - s * 0.02, f * s * 0.02, s * 0.04);
            break;
        }
        case 'sword': {
            // Blade pointing up
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(hx - s * 0.01, hy - s * 0.18, s * 0.02, s * 0.18);
            // Tip
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(hx - s * 0.005, hy - s * 0.2, s * 0.01, s * 0.03);
            // Guard
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(hx - s * 0.03, hy - s * 0.01, s * 0.06, s * 0.02);
            // Handle
            ctx.fillStyle = '#654321';
            ctx.fillRect(hx - s * 0.008, hy, s * 0.016, s * 0.05);
            break;
        }
        case 'laser': {
            // Futuristic barrel
            ctx.fillStyle = '#444466';
            ctx.fillRect(hx + f * s * 0.01, hy - s * 0.02, f * s * 0.14, s * 0.04);
            // Glow
            ctx.fillStyle = '#4488ff';
            ctx.fillRect(hx + f * s * 0.13, hy - s * 0.015, f * s * 0.03, s * 0.03);
            // Handle
            ctx.fillStyle = '#333355';
            ctx.fillRect(hx - s * 0.01, hy, s * 0.025, s * 0.05);
            // Glow effect
            ctx.fillStyle = 'rgba(68, 136, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(hx + f * s * 0.15, hy, s * 0.03, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'torch': {
            // Stick
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(hx - s * 0.01, hy - s * 0.14, s * 0.02, s * 0.16);
            // Flame
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(hx, hy - s * 0.16, s * 0.03, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(hx, hy - s * 0.17, s * 0.02, 0, Math.PI * 2);
            ctx.fill();
            // Glow
            ctx.fillStyle = 'rgba(255, 150, 0, 0.15)';
            ctx.beginPath();
            ctx.arc(hx, hy - s * 0.16, s * 0.07, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'basket': {
            // Rounded U-shape below hand
            ctx.fillStyle = '#c8a050';
            ctx.beginPath();
            ctx.moveTo(hx - s * 0.05, hy);
            ctx.lineTo(hx - s * 0.04, hy + s * 0.06);
            ctx.lineTo(hx + s * 0.04, hy + s * 0.06);
            ctx.lineTo(hx + s * 0.05, hy);
            ctx.closePath();
            ctx.fill();
            // Rim
            ctx.fillStyle = '#a08030';
            ctx.fillRect(hx - s * 0.055, hy - s * 0.005, s * 0.11, s * 0.015);
            // Weave lines
            ctx.strokeStyle = '#a08030';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(hx - s * 0.03, hy + s * 0.025);
            ctx.lineTo(hx + s * 0.03, hy + s * 0.025);
            ctx.stroke();
            break;
        }
        case 'rod': {
            // Long thin line
            ctx.strokeStyle = '#8B6914';
            ctx.lineWidth = Math.max(1, s * 0.01);
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(hx + f * s * 0.25, hy - s * 0.2);
            ctx.stroke();
            // Line from tip
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(hx + f * s * 0.25, hy - s * 0.2);
            ctx.lineTo(hx + f * s * 0.25, hy + s * 0.05);
            ctx.stroke();
            // Hook
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(hx + f * s * 0.25, hy + s * 0.06, s * 0.015, 0, Math.PI);
            ctx.stroke();
            break;
        }
        case 'hoe': {
            // Handle (stick)
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(hx - s * 0.008, hy - s * 0.16, s * 0.016, s * 0.18);
            // Blade (flat triangle at top)
            ctx.fillStyle = '#888888';
            ctx.fillRect(hx - s * 0.04, hy - s * 0.17, s * 0.08, s * 0.025);
            break;
        }
        case 'spatula': {
            // Handle
            ctx.fillStyle = '#333333';
            ctx.fillRect(hx - s * 0.006, hy - s * 0.12, s * 0.012, s * 0.14);
            // Flat head
            ctx.fillStyle = '#888888';
            ctx.fillRect(hx - s * 0.025, hy - s * 0.15, s * 0.05, s * 0.04);
            // Slots in spatula
            ctx.fillStyle = '#666666';
            ctx.fillRect(hx - s * 0.015, hy - s * 0.14, s * 0.006, s * 0.02);
            ctx.fillRect(hx + s * 0.005, hy - s * 0.14, s * 0.006, s * 0.02);
            break;
        }
        case 'wrench': {
            // Handle
            ctx.fillStyle = '#888888';
            ctx.fillRect(hx - s * 0.008, hy - s * 0.12, s * 0.016, s * 0.14);
            // Wrench head (open jaw)
            ctx.fillStyle = '#aaaaaa';
            ctx.fillRect(hx - s * 0.025, hy - s * 0.15, s * 0.05, s * 0.02);
            ctx.fillRect(hx - s * 0.025, hy - s * 0.15, s * 0.01, s * 0.04);
            ctx.fillRect(hx + s * 0.015, hy - s * 0.15, s * 0.01, s * 0.04);
            break;
        }
    }
}

// ── Draw cape behind character ──
function drawCape(ctx, cx, torsoY, torsoW, torsoH, s, facing, animFrame) {
    const capeW = s * 0.2;
    const capeH = s * 0.3;
    const capeX = cx - facing * torsoW * 0.3;
    const capeWave = Math.sin(animFrame * Math.PI * 2) * s * 0.02;

    ctx.fillStyle = '#cc2244';
    ctx.beginPath();
    ctx.moveTo(capeX, torsoY);
    ctx.lineTo(capeX - facing * capeW * 0.3, torsoY + capeH + capeWave);
    ctx.lineTo(capeX - facing * capeW, torsoY + capeH * 0.9 + capeWave);
    ctx.lineTo(capeX - facing * capeW * 0.5, torsoY + s * 0.03);
    ctx.closePath();
    ctx.fill();

    // Cape inner shade
    ctx.fillStyle = '#aa1133';
    ctx.beginPath();
    ctx.moveTo(capeX - facing * capeW * 0.15, torsoY + s * 0.05);
    ctx.lineTo(capeX - facing * capeW * 0.35, torsoY + capeH * 0.85 + capeWave);
    ctx.lineTo(capeX - facing * capeW * 0.75, torsoY + capeH * 0.8 + capeWave);
    ctx.lineTo(capeX - facing * capeW * 0.45, torsoY + s * 0.06);
    ctx.closePath();
    ctx.fill();
}

// ── Draw helmet on head ──
function drawHelmet(ctx, headCx, hairY, headW, headH, hairH, s) {
    // Dome covering top of head (replaces hair)
    ctx.fillStyle = '#cc3333';
    const helmetW = headW + s * 0.04;
    const helmetH = hairH + headH * 0.55;
    ctx.beginPath();
    ctx.moveTo(headCx - helmetW / 2, hairY + helmetH);
    ctx.lineTo(headCx - helmetW / 2, hairY + helmetH * 0.3);
    ctx.quadraticCurveTo(headCx, hairY - s * 0.02, headCx + helmetW / 2, hairY + helmetH * 0.3);
    ctx.lineTo(headCx + helmetW / 2, hairY + helmetH);
    ctx.closePath();
    ctx.fill();

    // Visor
    ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
    const visorY = hairY + helmetH * 0.5;
    ctx.fillRect(headCx - headW * 0.4, visorY, headW * 0.8, headH * 0.15);

    // Stripe
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(headCx - s * 0.01, hairY + s * 0.01, s * 0.02, helmetH * 0.9);
}

/**
 * Draw just an item (for HUD/UI use).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - center X
 * @param {number} y - center Y
 * @param {number} size - bounding size
 * @param {string} itemName
 */
export function drawItem(ctx, x, y, size, itemName) {
    ctx.save();
    ctx.translate(x, y);
    drawItemAtHand(ctx, 0, 0, size * 2, itemName, 1);
    ctx.restore();
}
