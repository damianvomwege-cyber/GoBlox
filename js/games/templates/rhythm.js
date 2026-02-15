import { BaseGame } from '../base-game.js';
import { GameRegistry } from '../registry.js';
import { generateGameName } from '../name-generator.js';
import { generateThumbnail } from '../thumbnail.js';

// ── Seeded PRNG ─────────────────────────────────────────────────────────
function mulberry32(seed) {
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
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e',
      lanes: ['#ff006e', '#00ff87', '#60efff', '#ffbe0b'], hitZone: '#ffffff' },
    { name: 'Retro',     primary: '#f72585', secondary: '#4cc9f0', bg: '#1a1a2e',
      lanes: ['#f72585', '#b5179e', '#4361ee', '#4cc9f0'], hitZone: '#ffffff' },
    { name: 'Ocean',     primary: '#0077b6', secondary: '#90e0ef', bg: '#03045e',
      lanes: ['#0096c7', '#00b4d8', '#48cae4', '#90e0ef'], hitZone: '#caf0f8' },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00',
      lanes: ['#ff0000', '#ff4500', '#ff8c00', '#ffd700'], hitZone: '#ffff00' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012',
      lanes: ['#ff69b4', '#ff1493', '#da70d6', '#ba55d3'], hitZone: '#ffffff' },
    { name: 'Matrix',    primary: '#00ff00', secondary: '#33ff33', bg: '#000a00',
      lanes: ['#00ff00', '#00cc00', '#009900', '#33ff33'], hitZone: '#00ff00' },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b',
      lanes: ['#00f5d4', '#00bbf9', '#9b5de5', '#f15bb5'], hitZone: '#ffffff' },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510',
      lanes: ['#ff6f61', '#ff9671', '#ffc75f', '#f9f871'], hitZone: '#ffffff' },
];

// ── Lane key mappings ───────────────────────────────────────────────────
const KEYS_4LANE = ['d', 'f', 'j', 'k'];
const KEYS_3LANE = ['d', ' ', 'k'];
const LABELS_4LANE = ['D', 'F', 'J', 'K'];
const LABELS_3LANE = ['D', 'SPC', 'K'];

// ── RhythmGame ──────────────────────────────────────────────────────────
class RhythmGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Lane count
        this.laneCount = cfg.laneCount || 4;
        this.laneKeys = this.laneCount === 3 ? KEYS_3LANE : KEYS_4LANE;
        this.laneLabels = this.laneCount === 3 ? LABELS_3LANE : LABELS_4LANE;

        // Layout
        const totalLaneWidth = Math.min(W * 0.7, this.laneCount * 70);
        this.laneWidth = totalLaneWidth / this.laneCount;
        this.laneStartX = (W - totalLaneWidth) / 2;
        this.hitZoneY = H - 80;
        this.noteRadius = this.laneWidth * 0.3;

        // Timing
        const bpmMap = { slow: 100, medium: 140, fast: 180 };
        this.bpm = bpmMap[cfg.bpm] || 140;
        this.beatInterval = 60 / this.bpm;

        // Difficulty (note density)
        const difficultyMap = { sparse: 0.25, medium: 0.45, dense: 0.65 };
        this.noteDensity = difficultyMap[cfg.difficulty] || 0.45;

        // Duration
        this.gameDuration = cfg.duration || 45;
        this.elapsed = 0;

        // Note travel time (seconds from spawn to hit zone)
        this.travelTime = 1.5;

        // Generate notes (seeded pattern)
        this.notes = this.generateNotePattern();
        this.nextNoteIndex = 0;
        this.activeNotes = [];

        // Timing windows (seconds)
        this.perfectWindow = 0.05;
        this.goodWindow = 0.12;
        this.missWindow = 0.2;

        // Scoring
        this.combo = 0;
        this.maxCombo = 0;
        this.perfects = 0;
        this.goods = 0;
        this.misses = 0;

        // Lane press state (for visual feedback)
        this.lanePressed = new Array(this.laneCount).fill(false);

        // Feedback messages
        this.feedbackText = '';
        this.feedbackColor = '';
        this.feedbackTimer = 0;

        // Particles
        this.particles = [];
    }

    generateNotePattern() {
        const notes = [];
        const totalBeats = Math.floor(this.gameDuration / this.beatInterval);

        // Generate rhythmic patterns using seeded RNG
        for (let beat = 2; beat < totalBeats - 2; beat++) {
            const time = beat * this.beatInterval;

            // Base probability per lane per beat
            for (let lane = 0; lane < this.laneCount; lane++) {
                let probability = this.noteDensity;

                // Create rhythmic patterns
                // Strong beats (every 4th)
                if (beat % 4 === 0) probability *= 1.5;
                // Off-beats are less common
                if (beat % 2 === 1) probability *= 0.6;
                // Vary across lanes for interest
                if ((beat + lane) % 3 === 0) probability *= 1.3;

                // Avoid too many simultaneous notes
                const notesAtTime = notes.filter(n => Math.abs(n.time - time) < 0.01).length;
                if (notesAtTime >= 2) continue;

                if (this.rng() < probability * 0.3) {
                    notes.push({
                        time,
                        lane,
                        hit: false,
                        missed: false,
                    });
                }
            }
        }

        // Sort by time
        notes.sort((a, b) => a.time - b.time);

        // Ensure minimum spacing between notes in same lane
        const minSpacing = this.beatInterval * 0.5;
        const filtered = [];
        const lastTimePerLane = new Array(this.laneCount).fill(-999);

        for (const note of notes) {
            if (note.time - lastTimePerLane[note.lane] >= minSpacing) {
                filtered.push(note);
                lastTimePerLane[note.lane] = note.time;
            }
        }

        return filtered;
    }

    getLaneX(lane) {
        return this.laneStartX + lane * this.laneWidth + this.laneWidth / 2;
    }

    getNoteY(note) {
        const timeUntilHit = note.time - this.elapsed;
        const progress = 1 - (timeUntilHit / this.travelTime);
        return progress * this.hitZoneY;
    }

    showFeedback(text, color) {
        this.feedbackText = text;
        this.feedbackColor = color;
        this.feedbackTimer = 0.5;
    }

    hitNote(lane) {
        // Find the closest un-hit note in this lane near the hit zone
        let bestNote = null;
        let bestDiff = Infinity;

        for (const note of this.activeNotes) {
            if (note.lane !== lane || note.hit || note.missed) continue;
            const diff = Math.abs(note.time - this.elapsed);
            if (diff < bestDiff && diff < this.missWindow) {
                bestDiff = diff;
                bestNote = note;
            }
        }

        if (!bestNote) return;

        bestNote.hit = true;

        const laneX = this.getLaneX(lane);
        const laneColor = this.theme.lanes[lane % this.theme.lanes.length];

        if (bestDiff <= this.perfectWindow) {
            // Perfect
            this.score += 100;
            this.perfects++;
            this.combo++;
            this.showFeedback('PERFECT', '#ffff00');

            // Big particles
            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    x: laneX, y: this.hitZoneY,
                    vx: (Math.random() - 0.5) * 300,
                    vy: -Math.random() * 300,
                    life: 0.5, maxLife: 0.5,
                    color: laneColor,
                });
            }
        } else if (bestDiff <= this.goodWindow) {
            // Good
            this.score += 50;
            this.goods++;
            this.combo++;
            this.showFeedback('GOOD', this.theme.primary);

            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: laneX, y: this.hitZoneY,
                    vx: (Math.random() - 0.5) * 200,
                    vy: -Math.random() * 200,
                    life: 0.3, maxLife: 0.3,
                    color: laneColor,
                });
            }
        } else {
            // Still within miss window - count as miss
            bestNote.hit = false;
            return;
        }

        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // Combo bonus
        if (this.combo > 0 && this.combo % 10 === 0) {
            this.score += 50;
        }
    }

    update(dt) {
        this.elapsed += dt;

        // Check game end
        if (this.elapsed >= this.gameDuration) {
            this.endGame();
            return;
        }

        // Feedback timer
        if (this.feedbackTimer > 0) {
            this.feedbackTimer -= dt;
        }

        // Spawn notes that are about to become visible
        while (this.nextNoteIndex < this.notes.length) {
            const note = this.notes[this.nextNoteIndex];
            if (note.time - this.elapsed <= this.travelTime) {
                this.activeNotes.push(note);
                this.nextNoteIndex++;
            } else {
                break;
            }
        }

        // Check for missed notes (passed hit zone)
        for (const note of this.activeNotes) {
            if (!note.hit && !note.missed && this.elapsed - note.time > this.missWindow) {
                note.missed = true;
                this.misses++;
                this.combo = 0;
                this.showFeedback('MISS', '#ff3333');
            }
        }

        // Remove old notes that are well past the hit zone
        this.activeNotes = this.activeNotes.filter(n => {
            return this.elapsed - n.time < 1.0;
        });

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 400 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onKeyDown(key) {
        if (this.gameOver) return;

        const lowerKey = key.toLowerCase();

        for (let i = 0; i < this.laneCount; i++) {
            if (lowerKey === this.laneKeys[i] || (this.laneKeys[i] === ' ' && key === ' ')) {
                this.lanePressed[i] = true;
                this.hitNote(i);
                return;
            }
        }

        // Also support arrow keys for 4-lane
        if (this.laneCount === 4) {
            const arrowMap = { 'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3 };
            if (key in arrowMap) {
                const lane = arrowMap[key];
                this.lanePressed[lane] = true;
                this.hitNote(lane);
            }
        }
    }

    onKeyUp(key) {
        const lowerKey = key.toLowerCase();

        for (let i = 0; i < this.laneCount; i++) {
            if (lowerKey === this.laneKeys[i] || (this.laneKeys[i] === ' ' && key === ' ')) {
                this.lanePressed[i] = false;
                return;
            }
        }

        if (this.laneCount === 4) {
            const arrowMap = { 'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3 };
            if (key in arrowMap) {
                this.lanePressed[arrowMap[key]] = false;
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const t = this.theme;

        // Background
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, W, H);

        const totalLaneWidth = this.laneCount * this.laneWidth;

        // Lane backgrounds
        for (let i = 0; i < this.laneCount; i++) {
            const lx = this.laneStartX + i * this.laneWidth;
            const laneColor = t.lanes[i % t.lanes.length];

            // Lane bg
            ctx.fillStyle = this.lanePressed[i] ? laneColor + '20' : '#ffffff06';
            ctx.fillRect(lx, 0, this.laneWidth, H);

            // Lane separator
            ctx.strokeStyle = '#ffffff15';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx, H);
            ctx.stroke();
        }

        // Right border
        ctx.strokeStyle = '#ffffff15';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.laneStartX + totalLaneWidth, 0);
        ctx.lineTo(this.laneStartX + totalLaneWidth, H);
        ctx.stroke();

        // Hit zone line
        ctx.strokeStyle = t.hitZone;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.laneStartX, this.hitZoneY);
        ctx.lineTo(this.laneStartX + totalLaneWidth, this.hitZoneY);
        ctx.stroke();

        // Hit zone glow
        ctx.fillStyle = t.hitZone + '10';
        ctx.fillRect(this.laneStartX, this.hitZoneY - 15, totalLaneWidth, 30);

        // Hit zone targets
        for (let i = 0; i < this.laneCount; i++) {
            const lx = this.getLaneX(i);
            const laneColor = t.lanes[i % t.lanes.length];

            // Target circle
            ctx.strokeStyle = this.lanePressed[i] ? laneColor : laneColor + '60';
            ctx.lineWidth = this.lanePressed[i] ? 3 : 2;
            ctx.beginPath();
            ctx.arc(lx, this.hitZoneY, this.noteRadius, 0, Math.PI * 2);
            ctx.stroke();

            if (this.lanePressed[i]) {
                ctx.fillStyle = laneColor + '40';
                ctx.beginPath();
                ctx.arc(lx, this.hitZoneY, this.noteRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Key label
            ctx.fillStyle = laneColor + '80';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(this.laneLabels[i], lx, this.hitZoneY + this.noteRadius + 8);
        }

        // Notes
        for (const note of this.activeNotes) {
            if (note.hit || note.missed) continue;

            const nx = this.getLaneX(note.lane);
            const ny = this.getNoteY(note);
            const laneColor = t.lanes[note.lane % t.lanes.length];

            if (ny < -this.noteRadius || ny > H + this.noteRadius) continue;

            // Note glow
            ctx.fillStyle = laneColor + '30';
            ctx.beginPath();
            ctx.arc(nx, ny, this.noteRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Note body
            ctx.fillStyle = laneColor;
            ctx.beginPath();
            ctx.arc(nx, ny, this.noteRadius, 0, Math.PI * 2);
            ctx.fill();

            // Shine
            ctx.fillStyle = '#ffffff40';
            ctx.beginPath();
            ctx.arc(nx - this.noteRadius * 0.25, ny - this.noteRadius * 0.25, this.noteRadius * 0.35, 0, Math.PI * 2);
            ctx.fill();
        }

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Feedback text
        if (this.feedbackTimer > 0) {
            const scale = 1 + (0.5 - this.feedbackTimer) * 0.3;
            ctx.globalAlpha = Math.min(1, this.feedbackTimer * 4);
            ctx.fillStyle = this.feedbackColor;
            ctx.font = `bold ${Math.floor(24 * scale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.feedbackText, W / 2, this.hitZoneY - 50);
            ctx.globalAlpha = 1;
        }

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Combo
        if (this.combo > 1) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.combo} COMBO`, W / 2, 12);
        }

        // Timer / progress
        const progress = this.elapsed / this.gameDuration;
        ctx.fillStyle = t.secondary + '40';
        ctx.fillRect(W - 120, 12, 100, 8);
        ctx.fillStyle = t.primary;
        ctx.fillRect(W - 120, 12, 100 * progress, 8);

        ctx.fillStyle = t.secondary;
        ctx.font = '13px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.ceil(this.gameDuration - this.elapsed)}s`, W - 12, 24);

        // Stats panel (right side)
        const statsX = this.laneStartX + totalLaneWidth + 16;
        if (statsX + 60 < W) {
            ctx.fillStyle = t.primary + '80';
            ctx.font = '11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`Perfect: ${this.perfects}`, statsX, H / 2 - 20);
            ctx.fillText(`Good: ${this.goods}`, statsX, H / 2);
            ctx.fillText(`Miss: ${this.misses}`, statsX, H / 2 + 20);
        }

        // Instructions
        if (this.elapsed < 3 && this.score === 0) {
            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            const keys = this.laneLabels.join(', ');
            ctx.fillText(`Press ${keys} when notes reach the line`, W / 2, H - 16);
        }

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('SONG COMPLETE', W / 2, H / 2 - 50);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 - 5);

            ctx.font = '16px monospace';
            ctx.fillText(`Perfect: ${this.perfects}  Good: ${this.goods}  Miss: ${this.misses}`, W / 2, H / 2 + 30);
            ctx.fillText(`Max Combo: ${this.maxCombo}`, W / 2, H / 2 + 55);

            // Grade
            const totalNotes = this.perfects + this.goods + this.misses;
            let grade = 'F';
            if (totalNotes > 0) {
                const accuracy = (this.perfects + this.goods * 0.5) / totalNotes;
                if (accuracy >= 0.95) grade = 'S';
                else if (accuracy >= 0.9) grade = 'A';
                else if (accuracy >= 0.8) grade = 'B';
                else if (accuracy >= 0.6) grade = 'C';
                else if (accuracy >= 0.4) grade = 'D';
            }

            ctx.fillStyle = grade === 'S' ? '#ffff00' : t.primary;
            ctx.font = 'bold 48px monospace';
            ctx.fillText(grade, W / 2, H / 2 + 95);

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '14px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 130);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const bpms = ['slow', 'medium', 'fast'];
    const laneCounts = [3, 4];
    const difficulties = ['sparse', 'medium', 'dense'];
    const durations = [30, 45, 60];
    let seed = 1;

    for (const theme of themes) {
        for (const bpm of bpms) {
            for (const laneCount of laneCounts) {
                const difficulty = difficulties[seed % difficulties.length];
                const duration = durations[seed % durations.length];

                variations.push({
                    name: generateGameName('Rhythm', seed),
                    category: 'Rhythm',
                    config: {
                        bpm,
                        laneCount,
                        difficulty,
                        duration,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Rhythm', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 3 * 2 = 48 base

    // Add combos with explicit difficulty and duration
    for (const theme of themes) {
        for (const difficulty of difficulties) {
            for (const duration of durations) {
                const bpm = bpms[seed % bpms.length];
                const laneCount = laneCounts[seed % laneCounts.length];

                variations.push({
                    name: generateGameName('Rhythm', seed),
                    category: 'Rhythm',
                    config: {
                        bpm,
                        laneCount,
                        difficulty,
                        duration,
                        theme,
                        seed
                    },
                    thumbnail: generateThumbnail('Rhythm', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // + 8 * 3 * 3 = 72 => 120

    // Top up to ~150
    while (variations.length < 150) {
        const theme = themes[seed % themes.length];
        const bpm = bpms[seed % bpms.length];
        const laneCount = laneCounts[seed % laneCounts.length];
        const difficulty = difficulties[(seed + 1) % difficulties.length];
        const duration = durations[(seed + 2) % durations.length];

        variations.push({
            name: generateGameName('Rhythm', seed),
            category: 'Rhythm',
            config: { bpm, laneCount, difficulty, duration, theme, seed },
            thumbnail: generateThumbnail('Rhythm', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Rhythm', RhythmGame, generateVariations);
