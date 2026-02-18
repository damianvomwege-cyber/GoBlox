// Seeded PRNG — mulberry32 (fast, deterministic, good distribution)
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

// ── Word pools ──────────────────────────────────────────────────────────

const adjectives = [
    'Cosmic', 'Neon', 'Turbo', 'Epic', 'Wild', 'Crystal', 'Shadow', 'Golden',
    'Pixel', 'Ultra', 'Mega', 'Super', 'Hyper', 'Atomic', 'Cyber', 'Mystic',
    'Thunder', 'Blazing', 'Frozen', 'Phantom', 'Royal', 'Stellar', 'Dark',
    'Infinite', 'Electric', 'Savage', 'Lucky', 'Ancient', 'Rapid', 'Mighty',
    'Crimson', 'Emerald', 'Sapphire', 'Ruby', 'Diamond', 'Iron', 'Ninja',
    'Pirate', 'Dragon', 'Phoenix', 'Titan', 'Storm', 'Lava', 'Ocean',
    'Jungle', 'Arctic', 'Desert', 'Galactic', 'Volcanic', 'Toxic',
    'Wicked', 'Noble', 'Rogue', 'Brave', 'Chaos', 'Primal', 'Astral',
    'Radiant', 'Spectral', 'Turquoise', 'Amber', 'Scarlet', 'Cobalt',
    'Nether', 'Celestial', 'Venom', 'Frost', 'Inferno', 'Tempest'
];

const suffixes = [
    'X', 'Pro', 'Deluxe', 'HD', 'Remastered', 'Plus', 'Ultra', 'Max',
    'Extreme', 'Legends', 'Quest', 'Rush', 'Blitz', 'Frenzy', 'Mania',
    'World', 'Zone', 'Arena', 'Masters', 'Champions', 'Heroes', 'Saga',
    'Wars', 'Clash', 'Dash', 'Run', '2000', '3000', 'Infinity', 'Prime',
    'Turbo', 'Force', 'Strike', 'Fury', 'Storm', 'Blast', 'Boom', 'Crash',
    'Remix', 'Royale', 'Rising', 'Unleashed', 'Evolved', 'Eclipse', 'Apex',
    'Overdrive', 'Reborn', 'Genesis', 'Frontier', 'Chronicle'
];

const categoryNouns = {
    'Platformer':      ['Obby', 'Jump', 'Parkour', 'Runner', 'Bounce', 'Leap', 'Climber', 'Hopper', 'Vault', 'Springboard'],
    'Tycoon':          ['Tycoon', 'Empire', 'Factory', 'Business', 'Mogul', 'Corp', 'Magnate', 'Venture', 'Fortune', 'Market'],
    'Racing':          ['Racer', 'Speed', 'Drift', 'Race', 'Sprint', 'Velocity', 'Grand Prix', 'Circuit', 'Turbo', 'Rally'],
    'Tower Defense':   ['Tower', 'Defense', 'Fortress', 'Bastion', 'Siege', 'Rampart', 'Citadel', 'Guardian', 'Sentinel', 'Barricade'],
    'Puzzle':          ['Puzzle', 'Brain', 'Logic', 'Enigma', 'Riddle', 'Mind', 'Cipher', 'Labyrinth', 'Conundrum', 'Tiles'],
    'Shooter':         ['Blaster', 'Shooter', 'Gunner', 'Sniper', 'Arsenal', 'Barrage', 'Bullet', 'Recoil', 'Trigger', 'Cannon'],
    'Snake':           ['Snake', 'Serpent', 'Slither', 'Viper', 'Cobra', 'Python', 'Mamba', 'Worm', 'Coil', 'Fang'],
    'Breakout':        ['Breakout', 'Bricks', 'Smash', 'Shatter', 'Demolish', 'Crusher', 'Paddle', 'Rebound', 'Block', 'Ricochet'],
    'Memory':          ['Memory', 'Match', 'Recall', 'Pairs', 'Flip', 'Remember', 'Cards', 'Twin', 'Mirror', 'Echo'],
    'Quiz':            ['Quiz', 'Trivia', 'Brainiac', 'Scholar', 'Genius', 'IQ', 'Challenge', 'Showdown', 'Whiz', 'Expert'],
    'Maze':            ['Maze', 'Labyrinth', 'Dungeon', 'Path', 'Escape', 'Corridor', 'Passage', 'Wander', 'Navigate', 'Tunnel'],
    'Flappy':          ['Flap', 'Wing', 'Bird', 'Soar', 'Glide', 'Flutter', 'Swoop', 'Hover', 'Avian', 'Feather'],
    'Tetris':          ['Blocks', 'Stack', 'Tetro', 'Grid', 'Cascade', 'Columns', 'Drop', 'Layer', 'Mosaic', 'Pieces'],
    'Whack-a-Mole':    ['Whack', 'Bonk', 'Smack', 'Mole', 'Hammer', 'Pop', 'Bash', 'Bop', 'Thwack', 'Pound'],
    'Rhythm':          ['Beat', 'Rhythm', 'Melody', 'Groove', 'Tempo', 'Harmony', 'Pulse', 'Vibe', 'Jam', 'Cadence'],
    'Fishing':         ['Fisher', 'Catch', 'Angler', 'Reel', 'Tackle', 'Hook', 'Cast', 'Lure', 'Harbor', 'Marina'],
    'Cooking':         ['Chef', 'Kitchen', 'Cook', 'Recipe', 'Grill', 'Bakery', 'Feast', 'Flavor', 'Sizzle', 'Brunch'],
    'Farming':         ['Farm', 'Harvest', 'Ranch', 'Garden', 'Crop', 'Plow', 'Meadow', 'Homestead', 'Orchard', 'Pasture'],
    'Word':            ['Word', 'Letter', 'Spell', 'Vocab', 'Script', 'Lexicon', 'Syllable', 'Scrabble', 'Text', 'Prose'],
    'Drawing':         ['Draw', 'Sketch', 'Canvas', 'Brush', 'Doodle', 'Pencil', 'Palette', 'Stroke', 'Ink', 'Art'],
    'Survival':        ['Survival', 'Outlast', 'Endure', 'Wasteland', 'Bunker', 'Refuge', 'Haven', 'Stranded', 'Last Stand', 'Persist'],
    'Simon Says':      ['Simon', 'Mimic', 'Follow', 'Pattern', 'Repeat', 'Sequence', 'Copy', 'Echo', 'Mirror', 'Recall'],
    'Space':           ['Galaxy', 'Orbit', 'Asteroid', 'Nebula', 'Starship', 'Cosmos', 'Rocket', 'Nova', 'Planet', 'Void'],
    'Bubble Shooter':  ['Bubble', 'Pop', 'Orb', 'Sphere', 'Fizz', 'Marble', 'Globe', 'Float', 'Splash', 'Burst'],
    'Catch':           ['Catch', 'Grab', 'Collect', 'Gather', 'Snatch', 'Bucket', 'Basket', 'Scoop', 'Net', 'Clutch'],
    'Obby':            ['Obby', 'Parkour', 'Hindernislauf', 'Kurs', 'Sprint', 'Sprung', 'Lauf', 'Klettern', 'Strecke', 'Challenge'],
};

// Fallback nouns for any unknown category
const genericNouns = ['Game', 'Challenge', 'Adventure', 'Battle', 'Mission', 'Action', 'Quest', 'Trial', 'Contest', 'Rally'];

// ── Generator ───────────────────────────────────────────────────────────

export function generateGameName(category, seed) {
    const rng = mulberry32(seed);

    const adj = pick(adjectives, rng);
    const nouns = categoryNouns[category] || genericNouns;
    const noun = pick(nouns, rng);

    // ~50 % chance of appending a suffix for extra variety
    const useSuffix = rng() > 0.5;
    const suffix = useSuffix ? ' ' + pick(suffixes, rng) : '';

    return `${adj} ${noun}${suffix}`;
}
