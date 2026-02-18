// Seeded PRNG — same mulberry32 used in name-generator
function mulberry32(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
}

// ── Color palettes per category ─────────────────────────────────────────

const categoryPalettes = {
    'Platformer':      [['#ff6b6b', '#ee5a24'], ['#6c5ce7', '#a29bfe'], ['#00b894', '#00cec9']],
    'Tycoon':          [['#fdcb6e', '#e17055'], ['#00b894', '#55efc4'], ['#ffeaa7', '#fab1a0']],
    'Racing':          [['#e74c3c', '#c0392b'], ['#f39c12', '#e74c3c'], ['#2d3436', '#636e72']],
    'Tower Defense':   [['#6c5ce7', '#a29bfe'], ['#2d3436', '#636e72'], ['#00cec9', '#81ecec']],
    'Puzzle':          [['#0984e3', '#74b9ff'], ['#6c5ce7', '#a29bfe'], ['#00b894', '#55efc4']],
    'Shooter':         [['#d63031', '#ff7675'], ['#e17055', '#fab1a0'], ['#2d3436', '#636e72']],
    'Snake':           [['#00b894', '#55efc4'], ['#a3cb38', '#c7ecee'], ['#009432', '#6ab04c']],
    'Breakout':        [['#e84393', '#fd79a8'], ['#0984e3', '#74b9ff'], ['#fdcb6e', '#e17055']],
    'Memory':          [['#a29bfe', '#dfe6e9'], ['#fd79a8', '#e84393'], ['#74b9ff', '#0984e3']],
    'Quiz':            [['#fdcb6e', '#f39c12'], ['#e17055', '#d63031'], ['#6c5ce7', '#a29bfe']],
    'Maze':            [['#2d3436', '#636e72'], ['#6c5ce7', '#a29bfe'], ['#00cec9', '#81ecec']],
    'Flappy':          [['#00cec9', '#81ecec'], ['#55efc4', '#00b894'], ['#74b9ff', '#0984e3']],
    'Tetris':          [['#e74c3c', '#3498db'], ['#f39c12', '#2ecc71'], ['#9b59b6', '#e74c3c']],
    'Whack-a-Mole':    [['#e17055', '#fab1a0'], ['#fdcb6e', '#f39c12'], ['#00b894', '#55efc4']],
    'Rhythm':          [['#e84393', '#fd79a8'], ['#6c5ce7', '#a29bfe'], ['#00cec9', '#81ecec']],
    'Fishing':         [['#0984e3', '#74b9ff'], ['#00cec9', '#81ecec'], ['#636e72', '#b2bec3']],
    'Cooking':         [['#e17055', '#fdcb6e'], ['#d63031', '#ff7675'], ['#fab1a0', '#ffeaa7']],
    'Farming':         [['#00b894', '#55efc4'], ['#fdcb6e', '#e17055'], ['#6ab04c', '#badc58']],
    'Word':            [['#0984e3', '#dfe6e9'], ['#6c5ce7', '#a29bfe'], ['#fdcb6e', '#f39c12']],
    'Drawing':         [['#e84393', '#fd79a8'], ['#fdcb6e', '#6c5ce7'], ['#55efc4', '#0984e3']],
    'Survival':        [['#2d3436', '#636e72'], ['#d63031', '#e17055'], ['#6c5ce7', '#2d3436']],
    'Simon Says':      [['#e74c3c', '#f1c40f'], ['#2ecc71', '#3498db'], ['#e84393', '#fdcb6e']],
    'Space':           [['#2d3436', '#6c5ce7'], ['#0c2461', '#4834d4'], ['#130f40', '#6c5ce7']],
    'Bubble Shooter':  [['#e84393', '#fd79a8'], ['#00cec9', '#81ecec'], ['#a29bfe', '#6c5ce7']],
    'Catch':           [['#f39c12', '#fdcb6e'], ['#00b894', '#55efc4'], ['#0984e3', '#74b9ff']],
    'Obby':            [['#ff6b6b', '#feca57'], ['#00ff87', '#60efff'], ['#6c5ce7', '#a29bfe']],
};

const defaultPalette = [['#636e72', '#b2bec3'], ['#6c5ce7', '#a29bfe'], ['#e17055', '#fab1a0']];

// ── Drawing helpers ─────────────────────────────────────────────────────

function drawGradientBg(ctx, w, h, c1, c2) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
}

function drawDotPattern(ctx, w, h, rng) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 30; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const r = 2 + rng() * 6;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Category-specific icon drawers ──────────────────────────────────────

const iconDrawers = {
    'Platformer'(ctx, w, h, rng) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        // Platforms
        ctx.fillRect(20, 150, 60, 8);
        ctx.fillRect(70, 120, 60, 8);
        ctx.fillRect(120, 90, 60, 8);
        // Character (little square with eyes)
        ctx.fillRect(30, 130, 16, 18);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(33, 134, 4, 4);
        ctx.fillRect(40, 134, 4, 4);
    },

    'Tycoon'(ctx, w, h, rng) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        // Dollar / coin stack
        const cx = 100, cy = 90;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(cx, cy + i * 14, 30, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // $ symbol
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', cx, cy + 10);
    },

    'Racing'(ctx, w, h, rng) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        // Road
        ctx.beginPath();
        ctx.moveTo(60, 200);
        ctx.lineTo(90, 40);
        ctx.lineTo(110, 40);
        ctx.lineTo(140, 200);
        ctx.fill();
        // Dashes
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(100, 180);
        ctx.lineTo(100, 50);
        ctx.stroke();
        ctx.setLineDash([]);
        // Car shape
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(88, 130, 24, 40);
        ctx.fillRect(84, 145, 32, 15);
    },

    'Tower Defense'(ctx, w, h, rng) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        // Tower
        ctx.fillRect(85, 60, 30, 80);
        ctx.fillRect(78, 50, 44, 14);
        // Crenellations
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(78 + i * 12, 40, 8, 12);
        }
        // Ground
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(20, 140, 160, 6);
        // Arrows
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const x = 130 + i * 8;
            const y = 80 + i * 15;
            ctx.beginPath();
            ctx.moveTo(115, 75);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    },

    'Puzzle'(ctx, w, h, rng) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        // Grid
        const sz = 30, ox = 40, oy = 50;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                ctx.strokeRect(ox + c * sz, oy + r * sz, sz, sz);
                if (rng() > 0.4) {
                    ctx.fillStyle = `rgba(255,255,255,${0.15 + rng() * 0.25})`;
                    ctx.fillRect(ox + c * sz, oy + r * sz, sz, sz);
                }
            }
        }
        // Question mark
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', 145, 110);
    },

    'Shooter'(ctx, w, h, rng) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        const cx = 100, cy = 95;
        // Crosshair
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy);
        ctx.lineTo(cx + 40, cy);
        ctx.moveTo(cx, cy - 40);
        ctx.lineTo(cx, cy + 40);
        ctx.stroke();
        // Center dot
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
    },

    'Snake'(ctx, w, h, rng) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Zigzag body
        ctx.beginPath();
        ctx.moveTo(40, 150);
        ctx.lineTo(70, 110);
        ctx.lineTo(100, 150);
        ctx.lineTo(130, 80);
        ctx.lineTo(155, 60);
        ctx.stroke();
        // Head
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(155, 60, 10, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(158, 57, 3, 0, Math.PI * 2);
        ctx.fill();
        // Apple
        ctx.fillStyle = 'rgba(255,100,100,0.9)';
        ctx.beginPath();
        ctx.arc(60, 70, 8, 0, Math.PI * 2);
        ctx.fill();
    },

    'Breakout'(ctx, w, h, rng) {
        // Brick rows
        const colors = ['rgba(255,100,100,0.8)', 'rgba(255,200,100,0.8)', 'rgba(100,255,100,0.8)', 'rgba(100,200,255,0.8)'];
        for (let r = 0; r < 4; r++) {
            ctx.fillStyle = colors[r];
            for (let c = 0; c < 5; c++) {
                ctx.fillRect(24 + c * 32, 30 + r * 16, 28, 12);
            }
        }
        // Paddle
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(70, 160, 60, 10);
        // Ball
        ctx.beginPath();
        ctx.arc(100, 140, 6, 0, Math.PI * 2);
        ctx.fill();
    },

    'Memory'(ctx, w, h, rng) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        const sz = 36, gap = 8, ox = 28, oy = 40;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const x = ox + c * (sz + gap);
                const y = oy + r * (sz + gap);
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.beginPath();
                ctx.roundRect(x, y, sz, sz, 4);
                ctx.fill();
                ctx.stroke();
                // One card "flipped" to show star
                if (r === 1 && c === 1) {
                    ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    ctx.font = '20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('\u2605', x + sz / 2, y + sz / 2 + 7);
                }
                // Question marks on others
                if (!(r === 1 && c === 1)) {
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('?', x + sz / 2, y + sz / 2 + 5);
                }
            }
        }
    },

    'Quiz'(ctx, w, h, rng) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?!', 100, 110);
        // Answer bubbles
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.roundRect(30, 135, 60, 24, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(110, 135, 60, 24, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '12px sans-serif';
        ctx.fillText('A', 60, 152);
        ctx.fillText('B', 140, 152);
    },

    'Maze'(ctx, w, h, rng) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        // Simple maze lines
        const walls = [
            [30, 30, 30, 100], [30, 30, 80, 30],
            [80, 30, 80, 70], [50, 70, 80, 70],
            [50, 70, 50, 130], [50, 130, 120, 130],
            [120, 70, 120, 130], [120, 70, 170, 70],
            [170, 70, 170, 160], [80, 160, 170, 160],
            [80, 100, 80, 160], [30, 100, 80, 100]
        ];
        walls.forEach(([x1, y1, x2, y2]) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
        // Player dot
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(55, 50, 6, 0, Math.PI * 2);
        ctx.fill();
    },

    'Flappy'(ctx, w, h, rng) {
        // Pipes
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(70, 0, 24, 65);
        ctx.fillRect(70, 120, 24, 80);
        ctx.fillRect(140, 0, 24, 90);
        ctx.fillRect(140, 145, 24, 55);
        // Bird body
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(50, 90, 14, 10, -0.15, 0, Math.PI * 2);
        ctx.fill();
        // Wing
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.ellipse(46, 86, 10, 5, -0.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(58, 87, 3, 0, Math.PI * 2);
        ctx.fill();
    },

    'Tetris'(ctx, w, h, rng) {
        const colors = ['rgba(255,100,100,0.7)', 'rgba(100,200,255,0.7)', 'rgba(255,200,100,0.7)', 'rgba(100,255,100,0.7)', 'rgba(200,100,255,0.7)'];
        const sz = 18;
        const ox = 55, oy = 30;
        // Stacked blocks
        const grid = [
            [0, 0, 1, 1, 0, 0],
            [0, 1, 1, 0, 0, 0],
            [0, 1, 0, 0, 2, 0],
            [1, 1, 0, 2, 2, 0],
            [1, 1, 3, 2, 4, 4],
            [3, 3, 3, 0, 4, 4],
            [3, 0, 0, 5, 5, 0],
            [0, 5, 5, 5, 0, 0],
        ];
        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    ctx.fillStyle = colors[cell - 1];
                    ctx.fillRect(ox + c * sz, oy + r * sz, sz - 1, sz - 1);
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(ox + c * sz, oy + r * sz, sz - 1, sz - 1);
                }
            });
        });
    },

    'Whack-a-Mole'(ctx, w, h, rng) {
        // Holes
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        const holes = [[50, 120], [100, 120], [150, 120], [75, 155], [125, 155]];
        holes.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.ellipse(x, y, 20, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        // Mole popping up from center
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.ellipse(100, 100, 16, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(94, 95, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(106, 95, 3, 0, Math.PI * 2);
        ctx.fill();
        // Hammer
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.save();
        ctx.translate(150, 60);
        ctx.rotate(0.4);
        ctx.fillRect(-8, -20, 16, 20);
        ctx.fillRect(-3, 0, 6, 30);
        ctx.restore();
    },

    'Rhythm'(ctx, w, h, rng) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        // Staff lines
        for (let i = 0; i < 5; i++) {
            const y = 65 + i * 12;
            ctx.beginPath();
            ctx.moveTo(25, y);
            ctx.lineTo(175, y);
            ctx.stroke();
        }
        // Notes
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        const notes = [[50, 77], [80, 89], [110, 71], [140, 83], [160, 65]];
        notes.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.ellipse(x, y, 6, 5, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 5, y);
            ctx.lineTo(x + 5, y - 25);
            ctx.stroke();
        });
    },

    'Fishing'(ctx, w, h, rng) {
        // Water
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(0, 110, 200, 90);
        // Waves
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < 200; x += 5) {
            ctx.lineTo(x, 110 + Math.sin(x * 0.06) * 4);
        }
        ctx.stroke();
        // Rod
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(50, 100);
        ctx.lineTo(120, 30);
        ctx.stroke();
        // Line
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(120, 30);
        ctx.lineTo(130, 140);
        ctx.stroke();
        // Fish
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.ellipse(130, 145, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(142, 145);
        ctx.lineTo(152, 138);
        ctx.lineTo(152, 152);
        ctx.closePath();
        ctx.fill();
    },

    'Cooking'(ctx, w, h, rng) {
        // Pan
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(100, 110, 45, 20, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Pan handle
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(145, 110);
        ctx.lineTo(180, 100);
        ctx.stroke();
        // Steam
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const sx = 80 + i * 20;
            ctx.moveTo(sx, 88);
            ctx.quadraticCurveTo(sx + 5, 70, sx - 2, 55);
            ctx.stroke();
        }
        // Chef hat
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(100, 30, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(85, 30, 30, 15);
    },

    'Farming'(ctx, w, h, rng) {
        // Ground
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, 130, 200, 70);
        // Furrows
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const y = 140 + i * 14;
            ctx.beginPath();
            ctx.moveTo(30, y);
            ctx.lineTo(170, y);
            ctx.stroke();
        }
        // Crops / sprouts
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const x = 45 + i * 28;
            ctx.beginPath();
            ctx.moveTo(x, 128);
            ctx.lineTo(x, 108);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(x - 5, 108, 5, 3, -0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x + 5, 110, 5, 3, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        // Sun
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(160, 40, 18, 0, Math.PI * 2);
        ctx.fill();
    },

    'Word'(ctx, w, h, rng) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('W O R D', 100, 80);
        // Letter tiles
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        const letters = ['G', 'A', 'M', 'E'];
        letters.forEach((l, i) => {
            const x = 40 + i * 35;
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.roundRect(x, 100, 28, 32, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText(l, x + 14, 122);
        });
    },

    'Drawing'(ctx, w, h, rng) {
        // Pencil
        ctx.save();
        ctx.translate(100, 95);
        ctx.rotate(-0.6);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(-5, -50, 10, 70);
        ctx.fillStyle = 'rgba(255,200,100,0.9)';
        ctx.beginPath();
        ctx.moveTo(-5, 20);
        ctx.lineTo(5, 20);
        ctx.lineTo(0, 32);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Scribble
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(110, 130);
        ctx.quadraticCurveTo(130, 100, 150, 130);
        ctx.quadraticCurveTo(170, 160, 160, 140);
        ctx.stroke();
    },

    'Survival'(ctx, w, h, rng) {
        // Heart / health
        ctx.fillStyle = 'rgba(255,100,100,0.85)';
        ctx.beginPath();
        ctx.moveTo(100, 80);
        ctx.bezierCurveTo(100, 70, 80, 55, 70, 70);
        ctx.bezierCurveTo(55, 90, 100, 115, 100, 115);
        ctx.bezierCurveTo(100, 115, 145, 90, 130, 70);
        ctx.bezierCurveTo(120, 55, 100, 70, 100, 80);
        ctx.fill();
        // Health bar
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(45, 140, 110, 10);
        ctx.fillStyle = 'rgba(255,100,100,0.8)';
        ctx.fillRect(45, 140, 70, 10);
    },

    'Simon Says'(ctx, w, h, rng) {
        const colors = [
            'rgba(255,80,80,0.8)', 'rgba(80,80,255,0.8)',
            'rgba(80,255,80,0.8)', 'rgba(255,255,80,0.8)'
        ];
        const cx = 100, cy = 95, r = 50;
        // Four quadrants
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
            ctx.closePath();
            ctx.fill();
        }
        // Center circle
        ctx.fillStyle = 'rgba(30,30,30,0.7)';
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fill();
    },

    'Space'(ctx, w, h, rng) {
        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let i = 0; i < 20; i++) {
            const x = rng() * w;
            const y = rng() * h;
            const s = 1 + rng() * 2;
            ctx.beginPath();
            ctx.arc(x, y, s, 0, Math.PI * 2);
            ctx.fill();
        }
        // Rocket
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.moveTo(100, 40);
        ctx.lineTo(115, 90);
        ctx.lineTo(120, 130);
        ctx.lineTo(80, 130);
        ctx.lineTo(85, 90);
        ctx.closePath();
        ctx.fill();
        // Fins
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(80, 120);
        ctx.lineTo(65, 140);
        ctx.lineTo(80, 130);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(120, 120);
        ctx.lineTo(135, 140);
        ctx.lineTo(120, 130);
        ctx.closePath();
        ctx.fill();
        // Flame
        ctx.fillStyle = 'rgba(255,200,50,0.8)';
        ctx.beginPath();
        ctx.moveTo(90, 130);
        ctx.quadraticCurveTo(100, 165, 110, 130);
        ctx.fill();
    },

    'Bubble Shooter'(ctx, w, h, rng) {
        const bubbleColors = [
            'rgba(255,100,100,0.7)', 'rgba(100,100,255,0.7)',
            'rgba(100,255,100,0.7)', 'rgba(255,255,100,0.7)',
            'rgba(255,100,255,0.7)', 'rgba(100,255,255,0.7)'
        ];
        // Bubble grid
        for (let r = 0; r < 4; r++) {
            const offset = r % 2 === 0 ? 0 : 12;
            for (let c = 0; c < 6 - (r % 2); c++) {
                const x = 38 + offset + c * 24;
                const y = 35 + r * 22;
                ctx.fillStyle = pick(bubbleColors, rng);
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fill();
                // Shine
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.beginPath();
                ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Aiming bubble at bottom
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(100, 170, 10, 0, Math.PI * 2);
        ctx.fill();
        // Aim line
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(100, 160);
        ctx.lineTo(80, 120);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    'Obby'(ctx, w, h, rng) {
        // Obstacle course platforms at different heights
        const colors = ['rgba(255,100,100,0.8)', 'rgba(100,200,255,0.8)', 'rgba(255,200,100,0.8)', 'rgba(100,255,100,0.8)', 'rgba(200,100,255,0.8)'];
        const platforms = [
            [20, 160, 50, 10], [60, 135, 40, 10], [95, 110, 45, 10],
            [130, 85, 35, 10], [155, 55, 40, 10],
        ];
        platforms.forEach(([x, y, w2, h2], i) => {
            ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(x, y, w2, h2);
        });
        // Checkpoint flag on last platform
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(170, 55);
        ctx.lineTo(170, 25);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,255,100,0.8)';
        ctx.fillRect(170, 25, 15, 10);
        // Kill brick (red spinner)
        ctx.fillStyle = 'rgba(255,50,50,0.7)';
        ctx.save();
        ctx.translate(80, 125);
        ctx.rotate(0.5);
        ctx.fillRect(-12, -4, 24, 8);
        ctx.restore();
        // Character jumping
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(45, 118, 10, 14);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(48, 121, 3, 3);
        ctx.fillRect(52, 121, 3, 3);
    },

    'Catch'(ctx, w, h, rng) {
        // Falling objects
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        const items = [[50, 40], [90, 70], [140, 30], [120, 100], [60, 90]];
        items.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        });
        // Basket / bucket
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(70, 145);
        ctx.lineTo(78, 175);
        ctx.lineTo(122, 175);
        ctx.lineTo(130, 145);
        ctx.stroke();
        // Handle
        ctx.beginPath();
        ctx.arc(100, 145, 20, Math.PI, 0);
        ctx.stroke();
    }
};

// ── Fallback generic icon ───────────────────────────────────────────────

function drawGenericIcon(ctx, w, h, rng) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u25B6', w / 2, h / 2);
}

// ── Vignette overlay ────────────────────────────────────────────────────

function drawVignette(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
}

// ── Main export ─────────────────────────────────────────────────────────

export function generateThumbnail(category, config, seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const rng = mulberry32(seed);

    // Pick palette — use config theme colors if available, else category palette
    let c1, c2;
    if (config && config.theme && config.theme.primary && config.theme.secondary) {
        c1 = config.theme.primary;
        c2 = config.theme.secondary;
    } else {
        const palettes = categoryPalettes[category] || defaultPalette;
        const pal = pick(palettes, rng);
        c1 = pal[0];
        c2 = pal[1];
    }

    // Background gradient
    drawGradientBg(ctx, 200, 200, c1, c2);

    // Subtle dot pattern for texture
    drawDotPattern(ctx, 200, 200, rng);

    // Category-specific icon
    const drawer = iconDrawers[category] || drawGenericIcon;
    drawer(ctx, 200, 200, rng);

    // Vignette for depth
    drawVignette(ctx, 200, 200);

    return canvas.toDataURL('image/png');
}
