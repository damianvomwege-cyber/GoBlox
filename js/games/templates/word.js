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
    { name: 'Terminal',  primary: '#00ff00', secondary: '#33ff33', bg: '#000a00', text: '#00ff00', match: '#00cc00', fail: '#ff3333' },
    { name: 'Ocean',     primary: '#0984e3', secondary: '#74b9ff', bg: '#03045e', text: '#90e0ef', match: '#00b4d8', fail: '#ff6b6b' },
    { name: 'Neon',      primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', text: '#60efff', match: '#00ff87', fail: '#ff006e' },
    { name: 'Sunset',    primary: '#ff6f61', secondary: '#ffcc5c', bg: '#1a0510', text: '#ffcc5c', match: '#ff6f61', fail: '#6c5ce7' },
    { name: 'Candy',     primary: '#ff69b4', secondary: '#ffb6c1', bg: '#2b0012', text: '#ffb6c1', match: '#ff69b4', fail: '#00ff7f' },
    { name: 'Cyber',     primary: '#00f5d4', secondary: '#f15bb5', bg: '#10002b', text: '#f15bb5', match: '#00f5d4', fail: '#fee440' },
    { name: 'Frost',     primary: '#a5b1c2', secondary: '#d1d8e0', bg: '#0a1628', text: '#d1d8e0', match: '#74b9ff', fail: '#ff4444' },
    { name: 'Lava',      primary: '#ff6b35', secondary: '#ffd700', bg: '#1a0a00', text: '#ffd700', match: '#ff6b35', fail: '#ffffff' },
];

// ── Word Lists ──────────────────────────────────────────────────────────
const wordSets = {
    english: [
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
        'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
        'how', 'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who', 'did',
        'come', 'make', 'like', 'time', 'just', 'know', 'take', 'people', 'into',
        'year', 'your', 'good', 'some', 'them', 'than', 'this', 'look', 'only',
        'give', 'most', 'find', 'here', 'thing', 'many', 'well', 'also', 'back',
        'after', 'use', 'work', 'first', 'even', 'want', 'because', 'these',
        'other', 'world', 'still', 'between', 'under', 'never', 'place', 'same',
        'another', 'think', 'house', 'again', 'small', 'large', 'group', 'begin',
        'country', 'every', 'school', 'change', 'always', 'during', 'story',
        'point', 'study', 'night', 'light', 'water', 'river', 'great', 'power',
        'system', 'number', 'strong', 'build', 'carry', 'follow', 'paper',
        'music', 'learn', 'plant', 'watch', 'earth', 'father', 'simple',
        'wonder', 'answer', 'before', 'second',
    ],
    german: [
        'und', 'der', 'die', 'das', 'ist', 'von', 'sie', 'den', 'mit', 'sich',
        'des', 'auf', 'ein', 'dem', 'nicht', 'eine', 'als', 'auch', 'nach',
        'wie', 'hat', 'bei', 'nur', 'noch', 'aus', 'aber', 'kann', 'wenn',
        'alle', 'sind', 'war', 'dann', 'ich', 'habe', 'ihr', 'oder', 'mehr',
        'will', 'sehr', 'hier', 'muss', 'zwei', 'sein', 'schon', 'doch',
        'weil', 'selbst', 'zeit', 'kein', 'lang', 'seit', 'ganz', 'erst',
        'leben', 'unter', 'immer', 'haus', 'welt', 'klein', 'teil', 'laut',
        'wasser', 'gehen', 'Stadt', 'Arbeit', 'gross', 'gegen', 'Schule',
        'Jahre', 'Mensch', 'Kinder', 'Abend', 'Morgen', 'danke', 'bitte',
        'heute', 'nacht', 'Bruder', 'Lehrer', 'Freund', 'Garten', 'Woche',
        'helfen', 'finden', 'fahren', 'lernen', 'kaufen', 'spielen', 'laufen',
        'denken', 'fragen', 'suchen', 'Anfang', 'Zimmer', 'Fenster', 'Hunger',
        'Sommer', 'Winter', 'Herbst', 'Montag', 'Kirche', 'Farbe', 'Blume',
        'Milch', 'Stein', 'Stimme', 'Wolke', 'Stern',
    ],
    code: [
        'var', 'let', 'const', 'function', 'return', 'class', 'import', 'export',
        'default', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
        'continue', 'new', 'this', 'super', 'extends', 'static', 'get', 'set',
        'async', 'await', 'try', 'catch', 'throw', 'finally', 'yield', 'typeof',
        'instanceof', 'void', 'delete', 'null', 'undefined', 'true', 'false',
        'console', 'log', 'error', 'warn', 'debug', 'map', 'filter', 'reduce',
        'forEach', 'find', 'some', 'every', 'includes', 'indexOf', 'splice',
        'slice', 'push', 'pop', 'shift', 'concat', 'join', 'split', 'replace',
        'match', 'test', 'length', 'toString', 'parseInt', 'parseFloat',
        'Promise', 'resolve', 'reject', 'then', 'fetch', 'json', 'stringify',
        'parse', 'Math', 'random', 'floor', 'ceil', 'round', 'max', 'min',
        'Array', 'Object', 'String', 'Number', 'Boolean', 'Symbol', 'Date',
        'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'Proxy', 'Reflect',
        'module', 'require', 'prototype', 'constructor', 'apply', 'call', 'bind',
        'addEventListener', 'querySelector', 'createElement', 'appendChild',
        'innerHTML', 'className', 'style', 'display', 'position', 'margin',
    ],
};

// ── WordGame ────────────────────────────────────────────────────────────
class WordGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);

        const W = this.canvas.width;
        const H = this.canvas.height;

        // Word length filter
        const lengthMap = { short: [3, 4], medium: [4, 6], long: [5, 8] };
        this.wordLengthRange = lengthMap[cfg.wordLength] || [4, 6];

        // Fall speed
        const speedMap = { slow: 30, medium: 50, fast: 75 };
        this.baseFallSpeed = speedMap[cfg.fallSpeed] || 50;

        // Word set
        const allWords = wordSets[cfg.wordSet] || wordSets.english;
        this.wordPool = allWords.filter(w =>
            w.length >= this.wordLengthRange[0] && w.length <= this.wordLengthRange[1]
        );
        // Ensure enough words
        if (this.wordPool.length < 20) {
            this.wordPool = allWords.slice(0, 60);
        }

        // Active falling words
        this.fallingWords = [];

        // Current typed input
        this.currentInput = '';

        // Active target (the word being typed)
        this.activeTarget = null;

        // Spawn timing
        this.spawnTimer = 0;
        this.spawnInterval = 2.5;

        // Difficulty ramp
        this.elapsed = 0;
        this.difficultyLevel = 1;

        // Lives
        this.lives = 3;

        // Stats
        this.wordsCompleted = 0;
        this.longestWord = '';
        this.combo = 0;
        this.maxCombo = 0;

        // Particles
        this.particles = [];

        // Danger zone Y
        this.dangerY = H - 40;

        // Spawn first word immediately
        this.spawnWord();
    }

    spawnWord() {
        const W = this.canvas.width;
        const word = this.wordPool[Math.floor(this.rng() * this.wordPool.length)];

        // Calculate width needed
        const charW = 16;
        const wordPxW = word.length * charW + 20;
        const x = 20 + this.rng() * (W - wordPxW - 40);

        // Speed increases with difficulty
        const speedMult = 1 + this.difficultyLevel * 0.15;
        const speed = this.baseFallSpeed * speedMult * (0.8 + this.rng() * 0.4);

        this.fallingWords.push({
            word: word.toLowerCase(),
            x,
            y: -20,
            speed,
            matched: 0, // how many chars matched
        });
    }

    findTarget() {
        if (this.currentInput.length === 0) {
            this.activeTarget = null;
            return;
        }

        // Find the first word that starts with current input
        const input = this.currentInput.toLowerCase();
        let bestMatch = null;
        let bestY = -Infinity;

        for (const fw of this.fallingWords) {
            if (fw.word.startsWith(input) && fw.y > bestY) {
                bestMatch = fw;
                bestY = fw.y;
            }
        }

        this.activeTarget = bestMatch;
        if (bestMatch) {
            bestMatch.matched = this.currentInput.length;
        }
    }

    update(dt) {
        if (this.lives <= 0) return;

        this.elapsed += dt;

        // Increase difficulty over time
        this.difficultyLevel = 1 + Math.floor(this.elapsed / 15);

        // Spawn words
        this.spawnTimer += dt;
        const effectiveInterval = Math.max(0.8, this.spawnInterval - this.difficultyLevel * 0.15);
        const maxWords = Math.min(8, 3 + Math.floor(this.difficultyLevel / 2));

        if (this.spawnTimer >= effectiveInterval && this.fallingWords.length < maxWords) {
            this.spawnTimer = 0;
            this.spawnWord();
        }

        // Update falling words
        for (let i = this.fallingWords.length - 1; i >= 0; i--) {
            const fw = this.fallingWords[i];
            fw.y += fw.speed * dt;

            // Reached bottom
            if (fw.y >= this.dangerY) {
                this.fallingWords.splice(i, 1);
                this.lives--;
                this.combo = 0;

                if (this.activeTarget === fw) {
                    this.activeTarget = null;
                    this.currentInput = '';
                }

                // Fail particles
                this.particles.push({
                    x: fw.x + fw.word.length * 8,
                    y: this.dangerY,
                    vx: 0, vy: -30,
                    life: 1.0, maxLife: 1.0,
                    color: this.theme.fail,
                    text: 'MISS!',
                });

                if (this.lives <= 0) {
                    this.endGame();
                    return;
                }
            }
        }

        // Update match highlighting
        for (const fw of this.fallingWords) {
            if (fw !== this.activeTarget) {
                fw.matched = 0;
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (!p.text) p.vy += 100 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    onKeyDown(key) {
        if (this.gameOver) return;
        if (this.lives <= 0) return;

        if (key === 'Backspace') {
            this.currentInput = this.currentInput.slice(0, -1);
            this.findTarget();
            return;
        }

        if (key === 'Escape') {
            this.currentInput = '';
            this.activeTarget = null;
            return;
        }

        // Only handle single printable characters
        if (key.length !== 1) return;

        this.currentInput += key.toLowerCase();
        this.findTarget();

        // Check if word completed
        if (this.activeTarget && this.currentInput.toLowerCase() === this.activeTarget.word) {
            const word = this.activeTarget;
            const idx = this.fallingWords.indexOf(word);
            if (idx !== -1) {
                this.fallingWords.splice(idx, 1);
            }

            // Score
            this.wordsCompleted++;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            if (word.word.length > this.longestWord.length) this.longestWord = word.word;

            const basePoints = word.word.length * 5;
            const comboBonus = Math.min(this.combo, 10) * 3;
            const speedBonus = Math.floor((this.dangerY - word.y) / this.dangerY * 10);
            const points = basePoints + comboBonus + speedBonus;
            this.score += points;

            // Success particles
            const wordCenterX = word.x + word.word.length * 8;
            for (let i = 0; i < word.word.length; i++) {
                this.particles.push({
                    x: word.x + i * 16 + 10,
                    y: word.y,
                    vx: (this.rng() - 0.5) * 100,
                    vy: -this.rng() * 120 - 30,
                    life: 0.5, maxLife: 0.5,
                    color: this.theme.match,
                });
            }
            this.particles.push({
                x: wordCenterX, y: word.y - 15,
                vx: 0, vy: -40,
                life: 0.8, maxLife: 0.8,
                color: this.theme.primary,
                text: `+${points}`,
            });

            this.currentInput = '';
            this.activeTarget = null;
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

        // Background grid (subtle)
        ctx.strokeStyle = t.primary + '08';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (let y = 0; y < H; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Danger zone
        ctx.fillStyle = t.fail + '15';
        ctx.fillRect(0, this.dangerY, W, H - this.dangerY);
        ctx.strokeStyle = t.fail + '40';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, this.dangerY);
        ctx.lineTo(W, this.dangerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Falling words
        for (const fw of this.fallingWords) {
            const isTarget = fw === this.activeTarget;
            const charW = 16;
            const wordW = fw.word.length * charW;
            const boxPad = 6;

            // Word background
            ctx.fillStyle = isTarget ? t.primary + '20' : '#ffffff08';
            ctx.beginPath();
            ctx.roundRect(fw.x - boxPad, fw.y - 14, wordW + boxPad * 2, 28, 4);
            ctx.fill();

            if (isTarget) {
                ctx.strokeStyle = t.primary + '60';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(fw.x - boxPad, fw.y - 14, wordW + boxPad * 2, 28, 4);
                ctx.stroke();
            }

            // Draw each character
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            for (let i = 0; i < fw.word.length; i++) {
                if (isTarget && i < fw.matched) {
                    ctx.fillStyle = t.match;
                } else {
                    ctx.fillStyle = t.text;
                }
                ctx.fillText(fw.word[i], fw.x + i * charW, fw.y);
            }

            // Progress indicator for target
            if (isTarget && fw.matched > 0) {
                ctx.fillStyle = t.match + '60';
                ctx.fillRect(fw.x - boxPad, fw.y + 12, (fw.matched / fw.word.length) * (wordW + boxPad * 2), 3);
            }
        }

        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            if (p.text) {
                ctx.fillStyle = p.color;
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // Input display at bottom
        ctx.fillStyle = '#00000080';
        ctx.beginPath();
        ctx.roundRect(W / 2 - 120, H - 35, 240, 30, 6);
        ctx.fill();

        ctx.strokeStyle = t.primary + '60';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(W / 2 - 120, H - 35, 240, 30, 6);
        ctx.stroke();

        ctx.fillStyle = t.text;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayText = this.currentInput || (this.wordsCompleted === 0 ? 'type to begin...' : '');
        ctx.fillStyle = this.currentInput ? t.primary : t.text + '40';
        ctx.fillText(displayText, W / 2, H - 20);

        // Cursor blink
        if (this.currentInput.length > 0) {
            const cursorBlink = Math.sin(performance.now() * 0.006) > 0;
            if (cursorBlink) {
                const textW = ctx.measureText(this.currentInput).width;
                ctx.fillStyle = t.primary;
                ctx.fillRect(W / 2 + textW / 2 + 2, H - 30, 2, 18);
            }
        }

        // HUD - Score
        ctx.fillStyle = t.primary;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 12, 12);

        // Words completed
        ctx.fillStyle = t.secondary;
        ctx.font = '13px monospace';
        ctx.fillText(`Words: ${this.wordsCompleted}`, 12, 38);

        // Combo
        if (this.combo > 1) {
            ctx.fillStyle = t.match;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Combo x${this.combo}!`, W / 2, 12);
        }

        // Lives
        ctx.fillStyle = t.fail;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const heartsStr = '\u2764'.repeat(this.lives) + '\u2661'.repeat(Math.max(0, 3 - this.lives));
        ctx.fillText(heartsStr, W - 12, 12);

        // Level
        ctx.fillStyle = t.secondary + '80';
        ctx.font = '12px monospace';
        ctx.fillText(`Lvl ${this.difficultyLevel}`, W - 12, 35);

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 50);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 26px monospace';
            ctx.fillText(`Score: ${this.score}`, W / 2, H / 2 - 5);

            ctx.font = '16px monospace';
            ctx.fillText(`Words: ${this.wordsCompleted}`, W / 2, H / 2 + 30);
            ctx.fillText(`Max Combo: ${this.maxCombo}`, W / 2, H / 2 + 52);
            if (this.longestWord) {
                ctx.fillText(`Longest: "${this.longestWord}"`, W / 2, H / 2 + 74);
            }

            ctx.fillStyle = t.secondary + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 106);
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const wordLengths = ['short', 'medium', 'long'];
    const fallSpeeds = ['slow', 'medium', 'fast'];
    const wordSetNames = ['english', 'german', 'code'];
    let seed = 1;

    for (const theme of themes) {
        for (const wordLength of wordLengths) {
            for (const wordSet of wordSetNames) {
                const fallSpeed = fallSpeeds[seed % fallSpeeds.length];

                variations.push({
                    name: generateGameName('Word', seed),
                    category: 'Word',
                    config: { wordLength, fallSpeed, wordSet, theme, seed },
                    thumbnail: generateThumbnail('Word', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // 8 * 3 * 3 = 72

    // Add more combos with explicit fall speeds
    for (const theme of themes) {
        for (const fallSpeed of fallSpeeds) {
            for (const wordLength of wordLengths) {
                const wordSet = wordSetNames[seed % wordSetNames.length];

                variations.push({
                    name: generateGameName('Word', seed),
                    category: 'Word',
                    config: { wordLength, fallSpeed, wordSet, theme, seed },
                    thumbnail: generateThumbnail('Word', { theme }, seed)
                });
                seed++;
            }
        }
    }
    // + 72 = 144

    // Top up to ~150
    while (variations.length < 150) {
        const theme = themes[seed % themes.length];
        const wordLength = wordLengths[seed % wordLengths.length];
        const fallSpeed = fallSpeeds[(seed + 1) % fallSpeeds.length];
        const wordSet = wordSetNames[(seed + 2) % wordSetNames.length];

        variations.push({
            name: generateGameName('Word', seed),
            category: 'Word',
            config: { wordLength, fallSpeed, wordSet, theme, seed },
            thumbnail: generateThumbnail('Word', { theme }, seed)
        });
        seed++;
    }

    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Word', WordGame, generateVariations);
