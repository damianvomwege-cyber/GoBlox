// js/components/avatar.js
// Reusable blocky pixel avatar renderer for GoBlox

/**
 * Draw a blocky pixel-art character.
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
    // Left leg
    const leftLegX = left + size / 2 - legW - legGap / 2;
    ctx.fillRect(leftLegX, legY, legW, legH);
    // Right leg
    const rightLegX = left + size / 2 + legGap / 2;
    ctx.fillRect(rightLegX, legY, legW, legH);

    // Shoe highlights
    ctx.fillStyle = darken(pants, 30);
    ctx.fillRect(leftLegX, legY + legH - u * 0.8, legW, u * 0.8);
    ctx.fillRect(rightLegX, legY + legH - u * 0.8, legW, u * 0.8);

    // ── Arms ──
    ctx.fillStyle = skin;
    // Left arm
    ctx.fillRect(torsoX - armW - u * 0.2, armY, armW, armH);
    // Right arm
    ctx.fillRect(torsoX + torsoW + u * 0.2, armY, armW, armH);

    // Hands (slightly darker skin)
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

    // Shirt detail: bottom edge
    ctx.fillRect(torsoX, torsoY + torsoH - u * 0.3, torsoW, u * 0.3);

    // ── Head ──
    ctx.fillStyle = skin;
    ctx.fillRect(headX, headY, headW, headH);

    // ── Face ──
    const eyeSize = Math.max(u * 0.5, 2);
    const eyeY = headY + headH * 0.4;
    const eyeOffsetX = headW * 0.22;

    // Eye whites
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(headX + headW / 2 - eyeOffsetX - eyeSize, eyeY, eyeSize * 2, eyeSize * 1.5);
    ctx.fillRect(headX + headW / 2 + eyeOffsetX - eyeSize, eyeY, eyeSize * 2, eyeSize * 1.5);

    // Pupils
    ctx.fillStyle = '#222222';
    ctx.fillRect(headX + headW / 2 - eyeOffsetX, eyeY + eyeSize * 0.2, eyeSize, eyeSize);
    ctx.fillRect(headX + headW / 2 + eyeOffsetX, eyeY + eyeSize * 0.2, eyeSize, eyeSize);

    // Mouth
    ctx.fillStyle = darken(skin, 35);
    const mouthW = headW * 0.2;
    const mouthH = Math.max(u * 0.3, 1.5);
    ctx.fillRect(headX + (headW - mouthW) / 2, headY + headH * 0.72, mouthW, mouthH);

    // ── Hair ──
    drawHair(ctx, hair, headX, headY, headW, headH, u, config);

    // ── Accessory ──
    drawAccessory(ctx, accessory, headX, headY, headW, headH, u, left, size);
}

function drawHair(ctx, hairStyle, hx, hy, hw, hh, u, config) {
    // Hair color derived from style
    const HAIR_COLORS = ['transparent', '#3d2314', '#1a1a2e', '#e94560', '#f5a623', '#6c63ff'];
    const hairColor = HAIR_COLORS[hairStyle] || '#3d2314';

    if (hairStyle === 0) return; // None

    ctx.fillStyle = hairColor;

    switch (hairStyle) {
        case 1: // Short flat top
            ctx.fillRect(hx - u * 0.3, hy - u * 0.8, hw + u * 0.6, u * 1.2);
            ctx.fillRect(hx - u * 0.3, hy, u * 0.8, hh * 0.3);
            ctx.fillRect(hx + hw - u * 0.5, hy, u * 0.8, hh * 0.3);
            break;
        case 2: // Long hair
            ctx.fillRect(hx - u * 0.4, hy - u * 0.8, hw + u * 0.8, u * 1.2);
            // Side hair hanging down
            ctx.fillRect(hx - u * 0.6, hy, u * 1, hh * 0.9);
            ctx.fillRect(hx + hw - u * 0.4, hy, u * 1, hh * 0.9);
            // Top volume
            ctx.fillRect(hx, hy - u * 0.4, hw, u * 0.6);
            break;
        case 3: // Mohawk
            ctx.fillRect(hx + hw * 0.3, hy - u * 2, hw * 0.4, u * 2.3);
            ctx.fillRect(hx + hw * 0.25, hy - u * 1.5, hw * 0.5, u * 0.8);
            ctx.fillRect(hx + hw * 0.35, hy - u * 2.5, hw * 0.3, u * 0.8);
            break;
        case 4: // Curly (blocks in a pattern)
            // Top row
            for (let i = 0; i < 5; i++) {
                const bx = hx - u * 0.3 + i * (hw + u * 0.6) / 5;
                const by = hy - u * 1 + (i % 2 === 0 ? 0 : -u * 0.4);
                ctx.fillRect(bx, by, (hw + u * 0.6) / 5 - u * 0.1, u * 1.3);
            }
            // Side curls
            ctx.fillRect(hx - u * 0.5, hy + u * 0.2, u * 0.8, hh * 0.4);
            ctx.fillRect(hx + hw - u * 0.3, hy + u * 0.2, u * 0.8, hh * 0.4);
            break;
        case 5: // Hat-hair (hair peeks out under a cap)
            // Hair peeking
            ctx.fillRect(hx - u * 0.3, hy + hh * 0.05, u * 0.8, hh * 0.25);
            ctx.fillRect(hx + hw - u * 0.5, hy + hh * 0.05, u * 0.8, hh * 0.25);
            // The cap itself
            ctx.fillStyle = '#e94560';
            ctx.fillRect(hx - u * 0.5, hy - u * 1, hw + u * 1, u * 1.4);
            // Brim
            ctx.fillRect(hx - u * 1, hy + u * 0.2, hw + u * 2, u * 0.5);
            break;
    }
}

function drawAccessory(ctx, acc, hx, hy, hw, hh, u, bodyLeft, bodySize) {
    if (acc === 0) return; // None

    switch (acc) {
        case 1: // Hat (top hat)
            ctx.fillStyle = '#2d2d44';
            // Brim
            ctx.fillRect(hx - u * 0.8, hy - u * 0.6, hw + u * 1.6, u * 0.6);
            // Top
            ctx.fillRect(hx + hw * 0.15, hy - u * 2.5, hw * 0.7, u * 2);
            // Band
            ctx.fillStyle = '#e94560';
            ctx.fillRect(hx + hw * 0.15, hy - u * 1.1, hw * 0.7, u * 0.4);
            break;
        case 2: // Glasses
            ctx.fillStyle = '#222222';
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = Math.max(u * 0.2, 1.5);
            const glassY = hy + hh * 0.33;
            const glassSize = hw * 0.2;
            // Left lens
            ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.fillRect(hx + hw * 0.15, glassY, glassSize, glassSize * 0.8);
            ctx.strokeStyle = '#222';
            ctx.strokeRect(hx + hw * 0.15, glassY, glassSize, glassSize * 0.8);
            // Right lens
            ctx.fillRect(hx + hw * 0.65 - glassSize, glassY, glassSize, glassSize * 0.8);
            ctx.strokeRect(hx + hw * 0.65 - glassSize, glassY, glassSize, glassSize * 0.8);
            // Bridge
            ctx.fillStyle = '#222';
            ctx.fillRect(hx + hw * 0.15 + glassSize, glassY + glassSize * 0.2, hw * 0.65 - glassSize * 2 - hw * 0.15, u * 0.2);
            // Arms
            ctx.fillRect(hx + hw * 0.05, glassY + glassSize * 0.2, hw * 0.1, u * 0.2);
            ctx.fillRect(hx + hw * 0.65, glassY + glassSize * 0.2, hw * 0.1, u * 0.2);
            break;
        case 3: // Headband
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(hx - u * 0.2, hy + hh * 0.15, hw + u * 0.4, u * 0.5);
            // Knot on side
            ctx.fillRect(hx + hw + u * 0.1, hy + hh * 0.1, u * 0.6, u * 1);
            break;
        case 4: // Crown
            ctx.fillStyle = '#ffd700';
            const crownY = hy - u * 1.5;
            const crownH = u * 1.5;
            const crownW = hw * 0.8;
            const crownX = hx + (hw - crownW) / 2;
            // Base
            ctx.fillRect(crownX, crownY + crownH * 0.4, crownW, crownH * 0.6);
            // Points
            const points = 5;
            const pw = crownW / points;
            for (let i = 0; i < points; i++) {
                ctx.fillRect(crownX + i * pw + pw * 0.2, crownY, pw * 0.6, crownH * 0.5);
            }
            // Gems
            ctx.fillStyle = '#e94560';
            ctx.fillRect(crownX + crownW * 0.45, crownY + crownH * 0.5, u * 0.4, u * 0.4);
            ctx.fillStyle = '#6c63ff';
            ctx.fillRect(crownX + crownW * 0.2, crownY + crownH * 0.5, u * 0.3, u * 0.3);
            ctx.fillRect(crownX + crownW * 0.7, crownY + crownH * 0.5, u * 0.3, u * 0.3);
            break;
        case 5: // Mask (blocky eye mask)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            const maskY = hy + hh * 0.28;
            const maskH = hh * 0.22;
            ctx.fillRect(hx - u * 0.3, maskY, hw + u * 0.6, maskH);
            // Eye holes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(hx + hw * 0.18, maskY + maskH * 0.2, hw * 0.2, maskH * 0.6);
            ctx.fillRect(hx + hw * 0.62, maskY + maskH * 0.2, hw * 0.2, maskH * 0.6);
            break;
    }
}

/**
 * Darken a hex color by a given amount.
 */
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

/**
 * Helper: render avatar onto a new canvas element and return it.
 * @param {Object} config - avatar config
 * @param {number} width - canvas width
 * @param {number} height - canvas height
 * @returns {HTMLCanvasElement}
 */
export function createAvatarCanvas(config, width = 80, height = 120) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const size = Math.min(width * 0.9, height * 0.55);
    drawAvatar(ctx, config, width / 2, (height - size * 1.5) / 2, size);
    return canvas;
}
