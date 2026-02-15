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

function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
}

function shuffle(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Themes ──────────────────────────────────────────────────────────────
const themes = [
    { name: 'Classic',  primary: '#fdcb6e', secondary: '#f39c12', bg: '#1a0a2e', card: '#2a1a3e', correct: '#00b894', wrong: '#d63031', text: '#ffffff' },
    { name: 'Ocean',    primary: '#00b4d8', secondary: '#90e0ef', bg: '#03045e', card: '#0a1a5e', correct: '#00b894', wrong: '#e74c3c', text: '#caf0f8' },
    { name: 'Neon',     primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', card: '#161650', correct: '#00ff87', wrong: '#ff006e', text: '#ffffff' },
    { name: 'Rose',     primary: '#e84393', secondary: '#fd79a8', bg: '#2d0018', card: '#3d1028', correct: '#55efc4', wrong: '#d63031', text: '#ffffff' },
    { name: 'Mint',     primary: '#00b894', secondary: '#55efc4', bg: '#0a2e1a', card: '#1a3e2a', correct: '#feca57', wrong: '#e74c3c', text: '#dfe6e9' },
    { name: 'Sunset',   primary: '#e17055', secondary: '#fab1a0', bg: '#2d1b0e', card: '#3d2b1e', correct: '#00b894', wrong: '#d63031', text: '#ffffff' },
    { name: 'Royal',    primary: '#6c5ce7', secondary: '#a29bfe', bg: '#1a0a2e', card: '#2a1a4e', correct: '#00b894', wrong: '#e74c3c', text: '#dfe6e9' },
    { name: 'Arctic',   primary: '#74b9ff', secondary: '#dfe6e9', bg: '#0c1021', card: '#1c2031', correct: '#1dd1a1', wrong: '#ff6b6b', text: '#dfe6e9' },
];

// ── Question Generators ─────────────────────────────────────────────────

function generateMathQuestions(rng, difficulty, count) {
    const questions = [];
    for (let i = 0; i < count; i++) {
        let q, answer, wrongs;

        if (difficulty === 'easy') {
            const a = Math.floor(rng() * 20) + 1;
            const b = Math.floor(rng() * 20) + 1;
            if (rng() > 0.5) {
                q = `${a} + ${b} = ?`;
                answer = a + b;
            } else {
                const big = Math.max(a, b);
                const small = Math.min(a, b);
                q = `${big} - ${small} = ?`;
                answer = big - small;
            }
        } else if (difficulty === 'medium') {
            const a = Math.floor(rng() * 12) + 2;
            const b = Math.floor(rng() * 12) + 2;
            if (rng() > 0.5) {
                q = `${a} x ${b} = ?`;
                answer = a * b;
            } else {
                const prod = a * b;
                q = `${prod} / ${a} = ?`;
                answer = b;
            }
        } else {
            // hard
            const type = rng();
            if (type < 0.33) {
                const a = Math.floor(rng() * 50) + 10;
                const b = Math.floor(rng() * 50) + 10;
                q = `${a} + ${b} = ?`;
                answer = a + b;
            } else if (type < 0.66) {
                const a = Math.floor(rng() * 15) + 2;
                const b = Math.floor(rng() * 15) + 2;
                q = `${a} x ${b} = ?`;
                answer = a * b;
            } else {
                const a = Math.floor(rng() * 12) + 2;
                q = `${a}^2 = ?`;
                answer = a * a;
            }
        }

        // Generate wrong answers
        wrongs = new Set();
        while (wrongs.size < 3) {
            const offset = Math.floor(rng() * 10) + 1;
            const wrong = rng() > 0.5 ? answer + offset : Math.max(0, answer - offset);
            if (wrong !== answer) wrongs.add(wrong);
        }

        const choices = shuffle([answer, ...wrongs], rng);
        questions.push({
            question: q,
            choices: choices.map(String),
            correctIndex: choices.indexOf(answer),
        });
    }
    return questions;
}

function generateGeographyQuestions(rng, difficulty, count) {
    const capitals = [
        ['France', 'Paris'], ['Germany', 'Berlin'], ['Japan', 'Tokyo'], ['Italy', 'Rome'],
        ['Spain', 'Madrid'], ['Brazil', 'Brasilia'], ['Canada', 'Ottawa'], ['Australia', 'Canberra'],
        ['Mexico', 'Mexico City'], ['Egypt', 'Cairo'], ['India', 'New Delhi'], ['China', 'Beijing'],
        ['Russia', 'Moscow'], ['Argentina', 'Buenos Aires'], ['South Korea', 'Seoul'],
        ['Turkey', 'Ankara'], ['Thailand', 'Bangkok'], ['Sweden', 'Stockholm'],
        ['Norway', 'Oslo'], ['Poland', 'Warsaw'], ['Greece', 'Athens'], ['Portugal', 'Lisbon'],
        ['Kenya', 'Nairobi'], ['Peru', 'Lima'], ['Colombia', 'Bogota'],
    ];
    const continents = [
        ['Brazil', 'South America'], ['France', 'Europe'], ['Japan', 'Asia'],
        ['Australia', 'Oceania'], ['Egypt', 'Africa'], ['Canada', 'North America'],
        ['India', 'Asia'], ['Argentina', 'South America'], ['Germany', 'Europe'],
        ['Nigeria', 'Africa'], ['Mexico', 'North America'], ['China', 'Asia'],
        ['Italy', 'Europe'], ['Peru', 'South America'], ['Kenya', 'Africa'],
    ];

    const questions = [];
    const allCapitals = shuffle(capitals, rng);

    for (let i = 0; i < count; i++) {
        if ((difficulty === 'easy' || rng() > 0.4) && i < allCapitals.length) {
            // Capital question
            const [country, capital] = allCapitals[i % allCapitals.length];
            const wrongCaps = capitals
                .filter(c => c[1] !== capital)
                .map(c => c[1]);
            const wrongs = shuffle(wrongCaps, rng).slice(0, 3);
            const choices = shuffle([capital, ...wrongs], rng);
            questions.push({
                question: `What is the capital of ${country}?`,
                choices,
                correctIndex: choices.indexOf(capital),
            });
        } else {
            // Continent question
            const [country, continent] = pick(continents, rng);
            const allContinents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
            const wrongs = shuffle(allContinents.filter(c => c !== continent), rng).slice(0, 3);
            const choices = shuffle([continent, ...wrongs], rng);
            questions.push({
                question: `Which continent is ${country} in?`,
                choices,
                correctIndex: choices.indexOf(continent),
            });
        }
    }
    return questions;
}

function generateScienceQuestions(rng, difficulty, count) {
    const easyQs = [
        { q: 'What planet is closest to the Sun?', a: 'Mercury', w: ['Venus', 'Earth', 'Mars'] },
        { q: 'What is H2O commonly known as?', a: 'Water', w: ['Oxygen', 'Hydrogen', 'Salt'] },
        { q: 'Which planet is known as the Red Planet?', a: 'Mars', w: ['Venus', 'Jupiter', 'Saturn'] },
        { q: 'What gas do plants absorb?', a: 'Carbon Dioxide', w: ['Oxygen', 'Nitrogen', 'Helium'] },
        { q: 'How many planets are in our solar system?', a: '8', w: ['7', '9', '10'] },
        { q: 'What is the largest planet?', a: 'Jupiter', w: ['Saturn', 'Neptune', 'Uranus'] },
        { q: 'What force keeps us on the ground?', a: 'Gravity', w: ['Magnetism', 'Friction', 'Inertia'] },
        { q: 'What is the chemical symbol for gold?', a: 'Au', w: ['Ag', 'Go', 'Gd'] },
        { q: 'What gas do humans breathe in?', a: 'Oxygen', w: ['Nitrogen', 'CO2', 'Helium'] },
        { q: 'What is the nearest star to Earth?', a: 'The Sun', w: ['Proxima Centauri', 'Sirius', 'Polaris'] },
        { q: 'What is the boiling point of water?', a: '100 C', w: ['90 C', '110 C', '80 C'] },
        { q: 'Which element has symbol Fe?', a: 'Iron', w: ['Gold', 'Silver', 'Copper'] },
    ];
    const medQs = [
        { q: 'What is the speed of light (approx)?', a: '300,000 km/s', w: ['150,000 km/s', '500,000 km/s', '1,000,000 km/s'] },
        { q: 'Which planet has the most moons?', a: 'Saturn', w: ['Jupiter', 'Uranus', 'Neptune'] },
        { q: 'What is the chemical formula for table salt?', a: 'NaCl', w: ['KCl', 'NaOH', 'HCl'] },
        { q: 'What type of rock is formed by cooling lava?', a: 'Igneous', w: ['Sedimentary', 'Metamorphic', 'Limestone'] },
        { q: 'What is the atomic number of Carbon?', a: '6', w: ['8', '12', '4'] },
        { q: 'What gas makes up most of Earth\'s atmosphere?', a: 'Nitrogen', w: ['Oxygen', 'CO2', 'Argon'] },
        { q: 'How many bones does an adult human have?', a: '206', w: ['186', '216', '300'] },
        { q: 'What is the smallest particle of an element?', a: 'Atom', w: ['Molecule', 'Proton', 'Cell'] },
        { q: 'What planet has the Great Red Spot?', a: 'Jupiter', w: ['Mars', 'Neptune', 'Saturn'] },
        { q: 'What is the powerhouse of the cell?', a: 'Mitochondria', w: ['Nucleus', 'Ribosome', 'Golgi'] },
        { q: 'What element does O represent?', a: 'Oxygen', w: ['Osmium', 'Oganesson', 'Gold'] },
        { q: 'What is absolute zero in Celsius?', a: '-273', w: ['-100', '-200', '-300'] },
    ];
    const hardQs = [
        { q: 'What is Avogadro\'s number (approx)?', a: '6.02 x 10^23', w: ['3.14 x 10^23', '6.02 x 10^20', '9.81 x 10^23'] },
        { q: 'Which subatomic particle has no charge?', a: 'Neutron', w: ['Proton', 'Electron', 'Quark'] },
        { q: 'What is the unit of electrical resistance?', a: 'Ohm', w: ['Volt', 'Ampere', 'Watt'] },
        { q: 'What is the half-life of Carbon-14 (approx)?', a: '5,730 years', w: ['1,000 years', '10,000 years', '50,000 years'] },
        { q: 'What is the most abundant element in the universe?', a: 'Hydrogen', w: ['Helium', 'Oxygen', 'Carbon'] },
        { q: 'What is Planck\'s constant used in?', a: 'Quantum mechanics', w: ['Relativity', 'Thermodynamics', 'Optics'] },
        { q: 'DNA stands for?', a: 'Deoxyribonucleic acid', w: ['Dinucleic acid', 'Dioxynucleic acid', 'Deoxyribo acid'] },
        { q: 'What is the SI unit of force?', a: 'Newton', w: ['Pascal', 'Joule', 'Watt'] },
        { q: 'What phenomenon causes stars to twinkle?', a: 'Atmospheric refraction', w: ['Stellar rotation', 'Light pollution', 'Solar wind'] },
        { q: 'Which vitamin is produced by sunlight?', a: 'Vitamin D', w: ['Vitamin C', 'Vitamin A', 'Vitamin B12'] },
    ];

    const pool = difficulty === 'easy' ? easyQs : difficulty === 'medium' ? medQs : hardQs;
    const selected = shuffle(pool, rng).slice(0, count);

    return selected.map(item => {
        const choices = shuffle([item.a, ...item.w], rng);
        return {
            question: item.q,
            choices,
            correctIndex: choices.indexOf(item.a),
        };
    });
}

function generateGeneralQuestions(rng, difficulty, count) {
    const allQs = [
        { q: 'How many colors are in a rainbow?', a: '7', w: ['5', '6', '8'] },
        { q: 'What is the largest ocean?', a: 'Pacific', w: ['Atlantic', 'Indian', 'Arctic'] },
        { q: 'How many legs does a spider have?', a: '8', w: ['6', '10', '12'] },
        { q: 'What color do you get mixing red and blue?', a: 'Purple', w: ['Green', 'Orange', 'Brown'] },
        { q: 'What is the tallest animal?', a: 'Giraffe', w: ['Elephant', 'Horse', 'Ostrich'] },
        { q: 'How many days in a leap year?', a: '366', w: ['365', '364', '367'] },
        { q: 'What is the hardest natural substance?', a: 'Diamond', w: ['Gold', 'Iron', 'Quartz'] },
        { q: 'Which animal is known as the King of the Jungle?', a: 'Lion', w: ['Tiger', 'Elephant', 'Gorilla'] },
        { q: 'How many sides does a hexagon have?', a: '6', w: ['5', '7', '8'] },
        { q: 'What is the fastest land animal?', a: 'Cheetah', w: ['Lion', 'Horse', 'Gazelle'] },
        { q: 'What color is an emerald?', a: 'Green', w: ['Blue', 'Red', 'Purple'] },
        { q: 'How many continents are there?', a: '7', w: ['5', '6', '8'] },
        { q: 'What is the smallest country in the world?', a: 'Vatican City', w: ['Monaco', 'San Marino', 'Malta'] },
        { q: 'Which is the longest river?', a: 'Nile', w: ['Amazon', 'Mississippi', 'Yangtze'] },
        { q: 'How many hours in a day?', a: '24', w: ['12', '20', '36'] },
        { q: 'What shape has 3 sides?', a: 'Triangle', w: ['Square', 'Pentagon', 'Circle'] },
        { q: 'Which sense do ears provide?', a: 'Hearing', w: ['Sight', 'Taste', 'Touch'] },
        { q: 'What is the square root of 144?', a: '12', w: ['10', '14', '11'] },
        { q: 'How many months have 31 days?', a: '7', w: ['6', '5', '8'] },
        { q: 'What animal has a pouch?', a: 'Kangaroo', w: ['Bear', 'Monkey', 'Dog'] },
    ];

    const selected = shuffle(allQs, rng).slice(0, count);
    return selected.map(item => {
        const choices = shuffle([item.a, ...item.w], rng);
        return {
            question: item.q,
            choices,
            correctIndex: choices.indexOf(item.a),
        };
    });
}

function generateGamingQuestions(rng, difficulty, count) {
    const allQs = [
        { q: 'What is the best-selling video game of all time?', a: 'Minecraft', w: ['Tetris', 'GTA V', 'Wii Sports'] },
        { q: 'What company created Mario?', a: 'Nintendo', w: ['Sega', 'Sony', 'Atari'] },
        { q: 'What game features a character named Link?', a: 'Zelda', w: ['Mario', 'Final Fantasy', 'Metroid'] },
        { q: 'What year was the first PlayStation released?', a: '1994', w: ['1992', '1996', '1998'] },
        { q: 'What is the main character in Sonic?', a: 'Hedgehog', w: ['Fox', 'Rabbit', 'Echidna'] },
        { q: 'What game has creepers and endermen?', a: 'Minecraft', w: ['Terraria', 'Roblox', 'Fortnite'] },
        { q: 'How many squares on a chess board?', a: '64', w: ['32', '48', '72'] },
        { q: 'What shape is a Tetris T-piece?', a: 'T-shape', w: ['L-shape', 'S-shape', 'O-shape'] },
        { q: 'What game features a Battle Royale on an island?', a: 'Fortnite', w: ['Minecraft', 'Roblox', 'Call of Duty'] },
        { q: 'What is the name of Mario\'s brother?', a: 'Luigi', w: ['Wario', 'Toad', 'Yoshi'] },
        { q: 'In Pac-Man, what do you eat?', a: 'Dots', w: ['Stars', 'Coins', 'Rings'] },
        { q: 'What genre is Street Fighter?', a: 'Fighting', w: ['Racing', 'Puzzle', 'RPG'] },
        { q: 'What color is Pikachu?', a: 'Yellow', w: ['Red', 'Blue', 'Green'] },
        { q: 'How many cards in a standard deck?', a: '52', w: ['48', '54', '56'] },
        { q: 'What game uses a portal gun?', a: 'Portal', w: ['Half-Life', 'Doom', 'Halo'] },
        { q: 'What company made Roblox?', a: 'Roblox Corporation', w: ['Epic Games', 'Mojang', 'Valve'] },
        { q: 'In chess, which piece can only move diagonally?', a: 'Bishop', w: ['Rook', 'Knight', 'King'] },
        { q: 'What does RPG stand for?', a: 'Role-Playing Game', w: ['Real Player Game', 'Random Play Game', 'Run Play Go'] },
        { q: 'What is the currency in Fortnite?', a: 'V-Bucks', w: ['Coins', 'Gems', 'Robux'] },
        { q: 'What platform is Xbox made by?', a: 'Microsoft', w: ['Sony', 'Nintendo', 'Sega'] },
    ];

    const selected = shuffle(allQs, rng).slice(0, count);
    return selected.map(item => {
        const choices = shuffle([item.a, ...item.w], rng);
        return {
            question: item.q,
            choices,
            correctIndex: choices.indexOf(item.a),
        };
    });
}

// ── QuizGame ────────────────────────────────────────────────────────────
class QuizGame extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.rng = mulberry32(cfg.seed || 1);
        this.questionCount = cfg.questionCount;
        this.timePerQuestion = cfg.timePerQuestion; // 0 = unlimited
        this.quizCategory = cfg.category;
        this.difficulty = cfg.difficulty;

        // Generate questions
        switch (this.quizCategory) {
            case 'math':
                this.questions = generateMathQuestions(this.rng, this.difficulty, this.questionCount);
                break;
            case 'geography':
                this.questions = generateGeographyQuestions(this.rng, this.difficulty, this.questionCount);
                break;
            case 'science':
                this.questions = generateScienceQuestions(this.rng, this.difficulty, this.questionCount);
                break;
            case 'gaming':
                this.questions = generateGamingQuestions(this.rng, this.difficulty, this.questionCount);
                break;
            default:
                this.questions = generateGeneralQuestions(this.rng, this.difficulty, this.questionCount);
                break;
        }

        // State
        this.currentQ = 0;
        this.answered = false;
        this.selectedAnswer = -1;
        this.correctCount = 0;
        this.showDelay = 0;
        this.questionTimeLeft = this.timePerQuestion;

        // Button rects for click detection
        this.buttonRects = [];

        // Hover state
        this.hoverIndex = -1;

        // Particles
        this.particles = [];
    }

    getCurrentQuestion() {
        if (this.currentQ < this.questions.length) {
            return this.questions[this.currentQ];
        }
        return null;
    }

    update(dt) {
        const q = this.getCurrentQuestion();
        if (!q) return;

        // After answering, wait before next question
        if (this.answered) {
            this.showDelay -= dt;
            if (this.showDelay <= 0) {
                this.currentQ++;
                if (this.currentQ >= this.questions.length) {
                    this.score = this.correctCount;
                    this.endGame();
                    return;
                }
                this.answered = false;
                this.selectedAnswer = -1;
                this.questionTimeLeft = this.timePerQuestion;
                this.hoverIndex = -1;
            }
        } else if (this.timePerQuestion > 0) {
            // Countdown per question
            this.questionTimeLeft -= dt;
            if (this.questionTimeLeft <= 0) {
                // Auto-wrong
                this.questionTimeLeft = 0;
                this.selectAnswer(-1); // timeout = wrong
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    selectAnswer(index) {
        if (this.answered) return;
        const q = this.getCurrentQuestion();
        if (!q) return;

        this.answered = true;
        this.selectedAnswer = index;
        this.showDelay = 1.5;

        if (index === q.correctIndex) {
            this.correctCount++;
            this.score = this.correctCount;

            // Correct particles
            const W = this.canvas.width;
            const H = this.canvas.height;
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: W / 2, y: H / 2,
                    vx: (Math.random() - 0.5) * 300,
                    vy: -100 - Math.random() * 200,
                    life: 0.8, maxLife: 0.8,
                    color: this.theme.correct,
                });
            }
        }
    }

    onClick(mx, my) {
        if (this.gameOver || this.answered) return;

        for (let i = 0; i < this.buttonRects.length; i++) {
            const r = this.buttonRects[i];
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                this.selectAnswer(i);
                return;
            }
        }
    }

    onMouseMove(mx, my) {
        if (this.gameOver || this.answered) {
            this.hoverIndex = -1;
            return;
        }
        this.hoverIndex = -1;
        for (let i = 0; i < this.buttonRects.length; i++) {
            const r = this.buttonRects[i];
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                this.hoverIndex = i;
                break;
            }
        }
    }

    onKeyDown(key) {
        if (this.gameOver || this.answered) return;
        const idx = parseInt(key) - 1;
        if (idx >= 0 && idx < 4) {
            this.selectAnswer(idx);
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

        const q = this.getCurrentQuestion();

        if (!this.gameOver && q) {
            // Progress bar
            const progW = W - 40;
            const progH = 6;
            const progX = 20;
            const progY = 16;
            ctx.fillStyle = t.card;
            ctx.beginPath();
            ctx.roundRect(progX, progY, progW, progH, 3);
            ctx.fill();
            ctx.fillStyle = t.primary;
            const fill = ((this.currentQ) / this.questions.length) * progW;
            ctx.beginPath();
            ctx.roundRect(progX, progY, Math.max(fill, 3), progH, 3);
            ctx.fill();

            // Question number
            ctx.fillStyle = t.text + '99';
            ctx.font = '14px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`Q${this.currentQ + 1}/${this.questions.length}`, 20, 30);

            // Score
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`Score: ${this.correctCount}`, W - 20, 28);

            // Timer per question
            if (this.timePerQuestion > 0 && !this.answered) {
                const timeStr = Math.ceil(this.questionTimeLeft) + 's';
                ctx.fillStyle = this.questionTimeLeft < 5 ? '#ff6b6b' : t.text;
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(timeStr, W / 2, 30);
            }

            // Question text (centered, word-wrapped)
            ctx.fillStyle = t.text;
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const questionY = H * 0.28;
            const maxW = W - 60;
            this.wrapText(ctx, q.question, W / 2, questionY, maxW, 26);

            // Answer buttons
            this.buttonRects = [];
            const btnW = W - 60;
            const btnH = 48;
            const btnGap = 12;
            const startY = H * 0.44;

            for (let i = 0; i < q.choices.length; i++) {
                const bx = 30;
                const by = startY + i * (btnH + btnGap);
                this.buttonRects.push({ x: bx, y: by, w: btnW, h: btnH });

                // Button background
                let bgColor = t.card;
                if (this.answered) {
                    if (i === q.correctIndex) {
                        bgColor = t.correct;
                    } else if (i === this.selectedAnswer && i !== q.correctIndex) {
                        bgColor = t.wrong;
                    }
                } else if (i === this.hoverIndex) {
                    bgColor = t.primary + '40';
                }

                ctx.fillStyle = bgColor;
                ctx.beginPath();
                ctx.roundRect(bx, by, btnW, btnH, 10);
                ctx.fill();

                // Button border
                ctx.strokeStyle = this.answered && i === q.correctIndex ? t.correct : t.primary + '60';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(bx, by, btnW, btnH, 10);
                ctx.stroke();

                // Number label
                ctx.fillStyle = t.text + '80';
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${i + 1}`, bx + 14, by + btnH / 2);

                // Answer text
                ctx.fillStyle = t.text;
                ctx.font = '16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(q.choices[i], W / 2, by + btnH / 2);
            }

            // Feedback text
            if (this.answered) {
                ctx.font = 'bold 18px monospace';
                ctx.textAlign = 'center';
                if (this.selectedAnswer === q.correctIndex) {
                    ctx.fillStyle = t.correct;
                    ctx.fillText('Correct!', W / 2, startY + 4 * (btnH + btnGap) + 10);
                } else {
                    ctx.fillStyle = t.wrong;
                    ctx.fillText(this.selectedAnswer === -1 ? 'Time\'s up!' : 'Wrong!', W / 2, startY + 4 * (btnH + btnGap) + 10);
                }
            }

            // Controls hint
            if (this.currentQ === 0 && !this.answered) {
                ctx.fillStyle = t.text + '66';
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Click or press 1-4 to answer', W / 2, H - 10);
            }
        }

        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Game Over
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = t.primary;
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('QUIZ COMPLETE', W / 2, H / 2 - 50);

            ctx.fillStyle = t.secondary;
            ctx.font = 'bold 28px monospace';
            ctx.fillText(`${this.correctCount}/${this.questions.length}`, W / 2, H / 2);

            const pct = Math.round((this.correctCount / this.questions.length) * 100);
            ctx.font = '18px monospace';
            ctx.fillText(`${pct}% correct`, W / 2, H / 2 + 35);

            // Rating
            let rating = 'Keep trying!';
            if (pct >= 90) rating = 'Genius!';
            else if (pct >= 70) rating = 'Great job!';
            else if (pct >= 50) rating = 'Not bad!';
            ctx.fillStyle = t.primary;
            ctx.font = 'bold 20px monospace';
            ctx.fillText(rating, W / 2, H / 2 + 65);

            ctx.fillStyle = t.text + 'aa';
            ctx.font = '16px monospace';
            ctx.fillText('Refresh to play again', W / 2, H / 2 + 100);
        }
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lineY = y;
        const lines = [];

        for (const word of words) {
            const testLine = line ? line + ' ' + word : word;
            if (ctx.measureText(testLine).width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // Center vertically
        const totalH = lines.length * lineHeight;
        lineY = y - totalH / 2 + lineHeight / 2;

        for (const l of lines) {
            ctx.fillText(l, x, lineY);
            lineY += lineHeight;
        }
    }
}

// ── Variation Generator ─────────────────────────────────────────────────
function generateVariations() {
    const variations = [];
    const categories = ['math', 'geography', 'science', 'general', 'gaming'];
    const difficulties = ['easy', 'medium', 'hard'];
    const questionCounts = [10, 15, 20];
    const timesPerQuestion = [10, 15, 0]; // 0 = unlimited
    let seed = 1;

    for (const category of categories) {
        for (const difficulty of difficulties) {
            // Pick a subset of configs per category/difficulty to keep count reasonable
            const qCount = pick(questionCounts, mulberry32(seed));
            const tpq = pick(timesPerQuestion, mulberry32(seed + 1));
            for (const theme of themes) {
                variations.push({
                    name: generateGameName('Quiz', seed),
                    category: 'Quiz',
                    config: {
                        category,
                        difficulty,
                        questionCount: qCount,
                        timePerQuestion: tpq,
                        theme,
                        seed,
                    },
                    thumbnail: generateThumbnail('Quiz', { theme }, seed),
                });
                seed++;
            }
        }
    }
    // 5 * 3 * 8 = 120 — add more by varying question count + time
    for (const category of categories) {
        for (const qCount of questionCounts) {
            for (const theme of themes.slice(0, 4)) {
                variations.push({
                    name: generateGameName('Quiz', seed),
                    category: 'Quiz',
                    config: {
                        category,
                        difficulty: pick(difficulties, mulberry32(seed)),
                        questionCount: qCount,
                        timePerQuestion: pick(timesPerQuestion, mulberry32(seed + 1)),
                        theme,
                        seed,
                    },
                    thumbnail: generateThumbnail('Quiz', { theme }, seed),
                });
                seed++;
            }
        }
    }
    // 120 + 60 = 180 — add a final batch
    for (const theme of themes) {
        for (const category of categories) {
            variations.push({
                name: generateGameName('Quiz', seed),
                category: 'Quiz',
                config: {
                    category,
                    difficulty: pick(difficulties, mulberry32(seed)),
                    questionCount: pick(questionCounts, mulberry32(seed + 1)),
                    timePerQuestion: pick(timesPerQuestion, mulberry32(seed + 2)),
                    theme,
                    seed,
                },
                thumbnail: generateThumbnail('Quiz', { theme }, seed),
            });
            seed++;
        }
    }
    // 180 + 40 = 220
    return variations;
}

// ── Registration ────────────────────────────────────────────────────────
GameRegistry.registerTemplate('Quiz', QuizGame, generateVariations);
