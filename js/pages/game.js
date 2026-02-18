import { GameRegistry } from '../games/loader.js';
import { Auth } from '../auth.js';
import { GoBux, GAME_PASSES, GOBUX_ICON } from '../gobux.js';
import { isMobile, getControlType, MobileControls, MobileControls3D } from '../games/mobile-controls.js';

let currentGame = null;
let currentGameData = null;
let scoreInterval = null;
let resizeHandler = null;
let mobileControls = null;

function cleanup() {
    if (mobileControls) {
        try { mobileControls.destroy(); } catch (e) { /* ignore */ }
        mobileControls = null;
    }
    if (currentGame) {
        try { currentGame.stop(); } catch (e) { /* ignore cleanup errors */ }
        currentGame = null;
    }
    if (scoreInterval) {
        clearInterval(scoreInterval);
        scoreInterval = null;
    }
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
    currentGameData = null;
}

function showGameError(containerEl, message) {
    containerEl.innerHTML = `
        <div class="game-error-box">
            <div class="game-error-icon">!</div>
            <h3>Fehler</h3>
            <p>${message}</p>
            <p class="text-secondary" style="font-size:0.8rem;">Versuche es mit "Neustart" oder gehe zurueck zum Katalog.</p>
        </div>
    `;
}

// ── Helpers for deterministic fake data ────────────────────────────
function hashId(id) {
    if (typeof id === 'string') {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
        return Math.abs(h);
    }
    let s = id * 2654435761;
    s = ((s >>> 16) ^ s) * 0x45d9f3b;
    return Math.abs((s >>> 16) ^ s);
}

function getPlayerCount(id) {
    return (hashId(id) % 5000) + 50;
}

function formatPlayerCount(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
}

function getTotalVisits(id) {
    return (hashId(id) % 900000) + 10000;
}

function formatVisits(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return n.toLocaleString('de-DE');
}

function getLikePercent(id) {
    let s = (typeof id === 'string') ? hashId(id) : id * 1664525 + 1013904223;
    s = ((s >>> 16) ^ s);
    return 60 + (Math.abs(s) % 40);
}

function getFavoriteCount(id) {
    return (hashId(id) % 50000) + 500;
}

function getCreatedDate(id) {
    const base = new Date(2024, 0, 1).getTime();
    const offset = (hashId(id) % 600) * 86400000;
    return new Date(base + offset);
}

function formatDate(d) {
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getMaxPlayers(id) {
    const opts = [10, 15, 20, 25, 30, 50];
    return opts[hashId(id) % opts.length];
}

// Generate fake servers
function generateServers(id, maxPlayers) {
    const count = 3 + (hashId(id) % 5);
    const servers = [];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e84393', '#00cec9', '#fd79a8', '#6c5ce7', '#fdcb6e', '#ff7675', '#74b9ff', '#55efc4', '#fab1a0', '#a29bfe'];
    for (let i = 0; i < count; i++) {
        const seed = hashId(id + i * 7 + 13);
        const playerCount = 3 + (seed % (maxPlayers - 2));
        const avatars = [];
        for (let j = 0; j < Math.min(playerCount, 8); j++) {
            avatars.push(colors[(seed + j * 3) % colors.length]);
        }
        servers.push({
            name: `Server ${i + 1}`,
            players: playerCount,
            max: maxPlayers,
            avatars,
            ping: 20 + (seed % 80),
        });
    }
    return servers;
}

// Generate fake reviews
function generateReviews(id) {
    const names = ['CoolGamer42', 'PixelMaster', 'NeonNinja', 'StarRunner', 'BlockBuilder99', 'TurboTiger', 'FrostByte', 'LavaLord', 'DiamondDash', 'ShadowFox'];
    const positive = [
        'Super Spiel! Macht echt Spass!',
        'Eines der besten Spiele hier. Kann ich nur empfehlen!',
        'Mega cool, spiele ich jeden Tag.',
        'Die Grafik ist echt nice!',
        'Tolles Gameplay, weiter so!',
        'Bestes Spiel im Katalog!'
    ];
    const negative = [
        'Naja, es geht so.',
        'Könnte bessere Steuerung haben.',
        'Zu schwer fuer Anfaenger.',
    ];
    const reviews = [];
    const count = 3 + (hashId(id) % 4);
    for (let i = 0; i < count; i++) {
        const seed = hashId(id + i * 11 + 7);
        const isPositive = (seed % 100) < 75;
        reviews.push({
            name: names[(seed + i) % names.length],
            text: isPositive ? positive[seed % positive.length] : negative[seed % negative.length],
            positive: isPositive,
            time: `vor ${1 + (seed % 30)} Tagen`,
            color: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#00cec9'][(seed + i) % 6],
        });
    }
    return reviews;
}

// ── Genre tags ────────────────────────────────────────────────────
const GENRE_TAGS = {
    'Platformer': ['Action', 'Jump & Run'],
    'Snake': ['Arcade', 'Klassiker'],
    'Shooter': ['Action', 'FPS'],
    'Racing': ['Rennen', 'Geschwindigkeit'],
    'Flappy': ['Arcade', 'Casual'],
    'Maze': ['Puzzle', 'Labyrinth'],
    'Breakout': ['Arcade', 'Klassiker'],
    'Memory': ['Puzzle', 'Gehirn'],
    'Quiz': ['Wissen', 'Quiz'],
    'Tetris': ['Puzzle', 'Klassiker'],
    'Tower Defense': ['Strategie', 'Tower Defense'],
    'Survival': ['Ueberleben', 'Action'],
    'Fishing': ['Simulation', 'Entspannung'],
    'Cooking': ['Simulation', 'Kochen'],
    'Farming': ['Simulation', 'Aufbau'],
    'Rhythm': ['Musik', 'Rhythmus'],
    'Word': ['Wortspiel', 'Gehirn'],
    'Drawing': ['Kreativ', 'Zeichnen'],
    'Simon Says': ['Gedaechtnis', 'Casual'],
    'Space': ['Weltraum', 'Arcade'],
    'Bubble Shooter': ['Puzzle', 'Arcade'],
    'Catch': ['Arcade', 'Casual'],
    'Whack-a-Mole': ['Arcade', 'Reaktion'],
    'Match3': ['Puzzle', 'Match-3'],
    'Clicker': ['Idle', 'Clicker'],
    'Eigene Spiele': ['Benutzerdefiniert', 'Community'],
};

export function renderGame(container, router, gameId) {
    cleanup();

    // Lookup the game from registry
    let game = GameRegistry.getGame(gameId);
    let isCustomGame = false;
    let customGameData = null;

    if (!game) {
        const created = JSON.parse(localStorage.getItem('goblox_created_games') || '{}');
        customGameData = created[gameId];
        if (customGameData && customGameData.published) {
            isCustomGame = true;
            game = {
                id: gameId,
                name: customGameData.name || 'Benutzerdefiniertes Spiel',
                is3D: customGameData.template !== 'platformer-2d',
                category: 'Eigene Spiele',
                config: customGameData,
                templateName: null,
            };
        }
    }

    if (!game) {
        container.innerHTML = `
            <div class="gd-page animate-fade-in">
                <div class="gd-not-found">
                    <div class="gd-not-found-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                    </div>
                    <h2>Spiel nicht gefunden</h2>
                    <p>Dieses Spiel existiert nicht oder wurde entfernt.</p>
                    <button class="btn" id="gd-back-catalog">Zurueck zum Katalog</button>
                </div>
            </div>
        `;
        container.querySelector('#gd-back-catalog')?.addEventListener('click', () => router.navigate('#/games'));
        return;
    }

    currentGameData = game;
    const is3D = !!game.is3D;
    const mobile = isMobile();

    // Gather deterministic stats
    const playerCount = getPlayerCount(game.id);
    const totalVisits = getTotalVisits(game.id);
    const likePercent = getLikePercent(game.id);
    const favoriteCount = getFavoriteCount(game.id);
    const createdDate = getCreatedDate(game.id);
    const maxPlayers = getMaxPlayers(game.id);
    const servers = generateServers(game.id, maxPlayers);
    const reviews = generateReviews(game.id);
    const tags = GENRE_TAGS[game.category] || ['Spiel'];

    // Game colors for hero gradient
    const c1 = game.config?.theme?.primary || game.config?.color || '#00b06f';
    const c2 = game.config?.theme?.secondary || game.config?.accent || '#006644';

    // Auth & favorites
    const user = Auth.currentUser();
    const isFav = user && user.favorites && user.favorites.includes(game.id);
    const ownedPasses = user ? GoBux.getPasses(user.id) : [];

    // Similar games
    const allGames = GameRegistry.getAllGames();
    const similarGames = allGames
        .filter(g => g.category === game.category && g.id !== game.id)
        .slice(0, 12);

    // Game description
    const descriptions = {
        'Platformer': 'Springe ueber Hindernisse, sammle Muenzen und erreiche das Ziel! Ein klassisches Jump & Run Abenteuer.',
        'Snake': 'Steuere die Schlange und sammle Futter, um zu wachsen. Aber Vorsicht - beruehre nicht die Waende!',
        'Shooter': 'Besiege alle Gegner und ueberlebe so lange wie moeglich. Schiesst und ausweicht!',
        'Racing': 'Rasen auf der Strecke! Weiche Hindernissen aus und erreiche die hoechste Geschwindigkeit.',
        'Flappy': 'Tippe zum Fliegen und weiche den Roehren aus. Wie weit kommst du?',
        'Maze': 'Finde den Weg durch das Labyrinth zum Ausgang. Aber beeile dich!',
        'Breakout': 'Zerstoere alle Bloecke mit dem Ball. Klassisches Arcade-Gameplay!',
        'Memory': 'Finde alle passenden Kartenpaare. Trainiere dein Gedaechtnis!',
        'Quiz': 'Beantworte Fragen und teste dein Wissen in verschiedenen Kategorien.',
        'Tetris': 'Stapele die fallenden Bloecke und raeume komplette Reihen ab!',
        'Tower Defense': 'Baue Tuerme und verteidige deine Basis gegen Wellen von Gegnern!',
        'Survival': 'Ueberlebbe so lange wie moeglich gegen immer staerkere Gegner.',
        'Fishing': 'Angel verschiedene Fische und baue deine Sammlung aus.',
        'Cooking': 'Koche leckere Gerichte und bediene deine Kunden!',
        'Farming': 'Baue deine Farm auf, pflanze Gemuese und verdiene Geld!',
        'Rhythm': 'Druecke die Tasten im Rhythmus der Musik!',
        'Word': 'Finde die richtigen Woerter und loese die Raetsel!',
        'Drawing': 'Zeichne und male kreative Kunstwerke!',
        'Simon Says': 'Merke dir die Farbfolge und wiederhole sie korrekt!',
        'Space': 'Fliege durch das Weltall und bekaempfe Asteroiden!',
        'Bubble Shooter': 'Schiesse Blasen ab und raeume das Spielfeld!',
        'Catch': 'Fange die fallenden Gegenstaende und sammle Punkte!',
        'Whack-a-Mole': 'Schlage die Maulwuerfe so schnell wie moeglich!',
        'Eigene Spiele': 'Ein von der Community erstelltes Spiel. Viel Spass beim Spielen!',
    };
    const description = descriptions[game.category] || 'Ein spannendes Spiel auf GoBlox. Viel Spass beim Spielen!';

    // ── Render detail page ──────────────────────────────────────────
    container.innerHTML = `
        <div class="gd-page animate-fade-in" id="gd-page">
            <!-- DETAIL VIEW (shown before playing) -->
            <div class="gd-detail" id="gd-detail">
                <!-- Hero Section -->
                <div class="gd-hero" style="background: linear-gradient(135deg, ${c1}40, ${c2}20, var(--bg-primary));">
                    <div class="gd-hero-inner">
                        <div class="gd-hero-thumb">
                            ${game.thumbnail
                                ? `<img src="${game.thumbnail}" alt="${game.name}" />`
                                : `<div class="gd-hero-thumb-placeholder" style="background: linear-gradient(135deg, ${c1}, ${c2});">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                   </div>`
                            }
                        </div>
                        <div class="gd-hero-info">
                            <h1 class="gd-hero-title">${game.name}</h1>
                            <div class="gd-hero-creator">
                                <div class="gd-creator-avatar" style="background: ${c1};">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </div>
                                <span>Von <strong>${isCustomGame ? (customGameData?.creatorName || 'Unbekannt') : 'GoBlox'}</strong></span>
                            </div>
                            <div class="gd-hero-stats">
                                <div class="gd-stat">
                                    <span class="gd-stat-dot"></span>
                                    <span class="gd-stat-value">${formatPlayerCount(playerCount)}</span>
                                    <span class="gd-stat-label">Aktiv</span>
                                </div>
                                <div class="gd-stat-divider"></div>
                                <div class="gd-stat">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    <span class="gd-stat-value">${formatVisits(totalVisits)}</span>
                                    <span class="gd-stat-label">Besuche</span>
                                </div>
                                <div class="gd-stat-divider"></div>
                                <div class="gd-stat">
                                    <div class="gd-like-bar-mini">
                                        <div class="gd-like-fill-mini" style="width:${likePercent}%"></div>
                                    </div>
                                    <span class="gd-stat-value">${likePercent}%</span>
                                </div>
                                <div class="gd-stat-divider"></div>
                                <div class="gd-stat">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    <span class="gd-stat-value">${formatVisits(favoriteCount)}</span>
                                    <span class="gd-stat-label">Favoriten</span>
                                </div>
                            </div>
                            <div class="gd-hero-actions">
                                <button class="gd-play-btn" id="gd-play-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    Spielen
                                </button>
                                <button class="gd-fav-btn ${isFav ? 'gd-fav-active' : ''}" id="gd-fav-btn" title="Favorit">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                </button>
                                <button class="gd-share-btn" id="gd-share-btn" title="Teilen">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Content sections -->
                <div class="gd-content">
                    <!-- Description -->
                    <div class="gd-section">
                        <h3 class="gd-section-title">Beschreibung</h3>
                        <p class="gd-description">${description}</p>
                        <div class="gd-meta-grid">
                            <div class="gd-meta-item">
                                <span class="gd-meta-label">Max. Spieler</span>
                                <span class="gd-meta-value">${maxPlayers}</span>
                            </div>
                            <div class="gd-meta-item">
                                <span class="gd-meta-label">Erstellt</span>
                                <span class="gd-meta-value">${formatDate(createdDate)}</span>
                            </div>
                            <div class="gd-meta-item">
                                <span class="gd-meta-label">Aktualisiert</span>
                                <span class="gd-meta-value">${formatDate(new Date(createdDate.getTime() + 86400000 * (hashId(game.id) % 60)))}</span>
                            </div>
                            <div class="gd-meta-item">
                                <span class="gd-meta-label">Genre</span>
                                <div class="gd-tags">${tags.map(t => `<span class="gd-tag">${t}</span>`).join('')}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Voting Section -->
                    <div class="gd-section">
                        <h3 class="gd-section-title">Bewertung</h3>
                        <div class="gd-voting">
                            <div class="gd-vote-bar-wrap">
                                <button class="gd-vote-btn gd-vote-up" id="gd-vote-up">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg>
                                </button>
                                <div class="gd-vote-bar">
                                    <div class="gd-vote-fill" style="width:${likePercent}%"></div>
                                </div>
                                <button class="gd-vote-btn gd-vote-down" id="gd-vote-down">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 14h-3V4h3v10zm-5.6 0c.4 0 .6-.3.6-.6V4.6c0-.3-.3-.6-.6-.6H6L4 10.5V14h12.4z"/></svg>
                                </button>
                            </div>
                            <span class="gd-vote-label">${likePercent}% positiv</span>
                        </div>
                    </div>

                    <!-- Servers -->
                    <div class="gd-section">
                        <h3 class="gd-section-title">Server</h3>
                        <div class="gd-servers" id="gd-servers">
                            ${servers.map(s => `
                                <div class="gd-server-row">
                                    <div class="gd-server-info">
                                        <span class="gd-server-name">${s.name}</span>
                                        <span class="gd-server-count">${s.players}/${s.max} Spieler</span>
                                        <span class="gd-server-ping">${s.ping}ms</span>
                                    </div>
                                    <div class="gd-server-avatars">
                                        ${s.avatars.map(c => `<div class="gd-server-avatar" style="background:${c};"></div>`).join('')}
                                        ${s.players > s.avatars.length ? `<span class="gd-server-more">+${s.players - s.avatars.length}</span>` : ''}
                                    </div>
                                    <button class="gd-server-join" data-server="${s.name}">Beitreten</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Game Passes -->
                    <div class="gd-section">
                        <h3 class="gd-section-title">Game Passes</h3>
                        <div class="gd-passes" id="gd-passes">
                            ${GAME_PASSES.map(pass => {
                                const owned = ownedPasses.includes(pass.id);
                                return `
                                    <div class="gd-pass-card ${owned ? 'gd-pass-owned' : ''}" data-pass-id="${pass.id}">
                                        <div class="gd-pass-icon">${pass.icon}</div>
                                        <div class="gd-pass-info">
                                            <span class="gd-pass-name">${pass.name}</span>
                                            <span class="gd-pass-desc">${pass.description}</span>
                                        </div>
                                        ${owned
                                            ? `<div class="gd-pass-owned-badge">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                                Besitzt
                                               </div>`
                                            : `<button class="gd-pass-buy" data-pass-id="${pass.id}">
                                                ${GOBUX_ICON} ${pass.price}
                                               </button>`
                                        }
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Reviews -->
                    <div class="gd-section">
                        <h3 class="gd-section-title">Bewertungen</h3>
                        <div class="gd-reviews">
                            ${reviews.map(r => `
                                <div class="gd-review">
                                    <div class="gd-review-header">
                                        <div class="gd-review-avatar" style="background:${r.color};">${r.name[0]}</div>
                                        <div class="gd-review-meta">
                                            <span class="gd-review-name">${r.name}</span>
                                            <span class="gd-review-time">${r.time}</span>
                                        </div>
                                        <div class="gd-review-vote ${r.positive ? 'gd-review-positive' : 'gd-review-negative'}">
                                            ${r.positive
                                                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg>'
                                                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 14h-3V4h3v10zm-5.6 0c.4 0 .6-.3.6-.6V4.6c0-.3-.3-.6-.6-.6H6L4 10.5V14h12.4z"/></svg>'
                                            }
                                        </div>
                                    </div>
                                    <p class="gd-review-text">${r.text}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Similar Games -->
                    ${similarGames.length > 0 ? `
                    <div class="gd-section">
                        <h3 class="gd-section-title">Aehnliche Spiele</h3>
                        <div class="gd-similar" id="gd-similar">
                            ${similarGames.map(sg => `
                                <div class="gd-similar-card" data-game-id="${sg.id}">
                                    <div class="gd-similar-thumb">
                                        ${sg.thumbnail
                                            ? `<img src="${sg.thumbnail}" alt="${sg.name}" loading="lazy" />`
                                            : `<div class="gd-similar-placeholder" style="background:linear-gradient(135deg, ${sg.config?.theme?.primary || '#666'}, ${sg.config?.theme?.secondary || '#333'});"></div>`
                                        }
                                        <div class="gd-similar-players">
                                            <span class="gd-similar-dot"></span>
                                            ${formatPlayerCount(getPlayerCount(sg.id))}
                                        </div>
                                    </div>
                                    <div class="gd-similar-info">
                                        <span class="gd-similar-name">${sg.name}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- PLAY VIEW (shown when game is running) -->
            <div class="gd-play-view hidden" id="gd-play-view">
                <!-- Play top bar -->
                <div class="gd-play-topbar">
                    <div class="gd-play-topbar-left">
                        <span class="gd-play-title">${game.name}</span>
                    </div>
                    <div class="gd-play-topbar-center">
                        <span class="gd-play-score" id="gd-play-score">Score: 0</span>
                    </div>
                    <div class="gd-play-topbar-right">
                        <button class="gd-play-action-btn" id="gd-btn-fullscreen" title="Vollbild">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                        </button>
                        <button class="gd-play-action-btn" id="gd-btn-restart" title="Neustart">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        </button>
                        <button class="gd-leave-btn" id="gd-btn-leave">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            ${mobile ? '' : 'Verlassen'}
                        </button>
                    </div>
                </div>

                <!-- Canvas area -->
                <div class="gd-play-canvas" id="gd-play-canvas">
                    ${is3D
                        ? '<div id="game-3d-container" class="game-3d-container"></div>'
                        : '<canvas id="game-canvas"></canvas>'
                    }
                </div>

                <!-- Game Over Overlay -->
                <div class="game-over-overlay hidden" id="game-over-overlay">
                    <div class="game-over-box">
                        <h2 class="game-over-title">Game Over!</h2>
                        <p class="game-over-score" id="game-over-score">0</p>
                        <p class="game-over-label">Punkte</p>
                        <div class="gobux-reward hidden" id="gobux-reward">
                            <span class="gobux-reward-coin">${GOBUX_ICON}</span>
                            <span class="gobux-reward-text">Du hast <span class="gobux-reward-counter" id="gobux-reward-counter">0</span> GoBux verdient!</span>
                        </div>
                        <div class="game-over-actions">
                            <button class="btn" id="game-over-replay">Nochmal spielen</button>
                            <button class="btn btn-secondary" id="game-over-catalog">Zurueck zum Katalog</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // ── DOM refs ────────────────────────────────────────────────────
    const gdPage = container.querySelector('#gd-page');
    const detailView = container.querySelector('#gd-detail');
    const playView = container.querySelector('#gd-play-view');
    const canvas = container.querySelector('#game-canvas');
    const container3D = container.querySelector('#game-3d-container');
    const canvasWrap = container.querySelector('#gd-play-canvas');
    const scoreEl = container.querySelector('#gd-play-score');
    const overlay = container.querySelector('#game-over-overlay');
    const overScoreEl = container.querySelector('#game-over-score');

    // ── Show detail / play views ────────────────────────────────────
    function showDetail() {
        detailView.classList.remove('hidden');
        playView.classList.add('hidden');
    }

    function showPlayView() {
        detailView.classList.add('hidden');
        playView.classList.remove('hidden');
    }

    // ── Canvas sizing (2D only) ─────────────────────────────────────
    function sizeCanvas() {
        if (!canvas) return;
        const rect = canvasWrap.getBoundingClientRect();
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
    }

    if (!is3D) {
        resizeHandler = () => {
            if (!playView.classList.contains('hidden')) sizeCanvas();
        };
        window.addEventListener('resize', resizeHandler);
    }

    // ── Score polling ───────────────────────────────────────────────
    function startScorePolling() {
        if (scoreInterval) clearInterval(scoreInterval);
        scoreInterval = setInterval(() => {
            if (currentGame && !currentGame.gameOver) {
                scoreEl.textContent = `Score: ${currentGame.score}`;
            }
        }, 100);
    }

    // ── Finalize game start ─────────────────────────────────────────
    function finalizeGameStart() {
        currentGame.onGameOver = (score) => showGameOver(score);
        try {
            currentGame.start();
        } catch (err) {
            console.error('Game crashed on start:', err);
            showGameError(canvasWrap, 'Das Spiel ist unerwartet abgestuerzt.');
            currentGame = null;
            return;
        }
        if (mobile && currentGame) setupMobileControls();
        startScorePolling();
    }

    // ── Start custom game ───────────────────────────────────────────
    function startCustomGame() {
        if (customGameData.template === 'platformer-2d') {
            import('../games/templates/custom-platformer-2d.js').then(({ CustomPlatformer2D }) => {
                sizeCanvas();
                try {
                    currentGame = new CustomPlatformer2D(canvas, {
                        theme: customGameData.settings?.theme || { primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', name: 'Neon' },
                        gravity: customGameData.settings?.gravity || 1.0,
                        scrollSpeed: customGameData.settings?.scrollSpeed || 1.5,
                        objects: customGameData.objects || [],
                        scripts: customGameData.scripts || null,
                    });
                } catch (err) {
                    console.error('Failed to create custom 2D game:', err);
                    showGameError(canvasWrap, 'Das Spiel konnte nicht geladen werden.');
                    return;
                }
                finalizeGameStart();
            }).catch(err => {
                console.error('Failed to load CustomPlatformer2D module:', err);
                showGameError(canvasWrap, 'Das Spiel konnte nicht geladen werden.');
            });
        } else {
            import('../games/templates/custom.js').then(({ CustomGame3D }) => {
                container3D.innerHTML = '';
                try {
                    currentGame = new CustomGame3D(container3D, customGameData);
                } catch (err) {
                    console.error('Failed to create custom 3D game:', err);
                    showGameError(canvasWrap, 'Das 3D-Spiel konnte nicht geladen werden.');
                    return;
                }
                finalizeGameStart();
            }).catch(err => {
                console.error('Failed to load CustomGame3D module:', err);
                showGameError(canvasWrap, 'Das 3D-Spiel konnte nicht geladen werden.');
            });
        }
    }

    // ── Start game ──────────────────────────────────────────────────
    async function startGame() {
        showPlayView();
        overlay.classList.add('hidden');

        const rewardEl = container.querySelector('#gobux-reward');
        if (rewardEl) rewardEl.classList.add('hidden');

        if (mobileControls) {
            mobileControls.destroy();
            mobileControls = null;
        }

        if (currentGame) {
            currentGame.stop();
            currentGame = null;
        }

        if (isCustomGame) {
            startCustomGame();
            return;
        }

        if (is3D) {
            container3D.innerHTML = '';
            try {
                currentGame = await GameRegistry.createGameInstance(game, container3D);
            } catch (err) {
                console.error('Failed to create 3D game instance:', err);
                showGameError(canvasWrap, 'Das 3D-Spiel konnte nicht geladen werden.');
                return;
            }
        } else {
            sizeCanvas();
            try {
                currentGame = await GameRegistry.createGameInstance(game, canvas);
            } catch (err) {
                console.error('Failed to create game instance:', err);
                showGameError(canvasWrap, 'Das Spiel konnte nicht geladen werden.');
                return;
            }
        }

        finalizeGameStart();
    }

    // ── Mobile Controls ─────────────────────────────────────────────
    function setupMobileControls() {
        if (is3D) {
            const tmplName = game.templateName || (isCustomGame ? 'custom' : null);
            mobileControls = new MobileControls3D(container3D, currentGame, tmplName);
            mobileControls.setup();
        } else {
            const tmplName = game.templateName || (isCustomGame ? 'Platformer' : null);
            const controlType = getControlType(tmplName);
            mobileControls = new MobileControls(canvasWrap, currentGame, controlType);
            mobileControls.setup();
        }
    }

    // ── Game Over ───────────────────────────────────────────────────
    function showGameOver(score) {
        scoreEl.textContent = `Score: ${score}`;
        overScoreEl.textContent = score.toLocaleString('de-DE');
        overlay.classList.remove('hidden');

        const u = Auth.currentUser();
        if (u) {
            const recentGames = u.recentGames || [];
            recentGames.unshift({ gameId: game.id, name: game.name, score, date: Date.now() });
            if (recentGames.length > 20) recentGames.length = 20;

            Auth.updateUser({
                gamesPlayed: (u.gamesPlayed || 0) + 1,
                totalScore: (u.totalScore || 0) + score,
                recentGames
            });

            const category = game.category || '';
            const { earned, reason } = GoBux.calculateReward(category, score);
            GoBux.earn(u.id, earned, reason);

            const rewardEl = container.querySelector('#gobux-reward');
            const counterEl = container.querySelector('#gobux-reward-counter');
            if (rewardEl && counterEl) {
                rewardEl.classList.remove('hidden');
                let current = 0;
                const step = Math.max(1, Math.ceil(earned / 20));
                const counterInterval = setInterval(() => {
                    current += step;
                    if (current >= earned) {
                        current = earned;
                        clearInterval(counterInterval);
                    }
                    counterEl.textContent = current;
                }, 50);
            }

            const navBalance = document.querySelector('.topbar-gobux-amount') || document.querySelector('.sidebar-gobux-amount');
            if (navBalance) {
                navBalance.textContent = GoBux.getBalance(u.id).toLocaleString('de-DE');
            }
        }
    }

    // ── Event listeners ─────────────────────────────────────────────

    // Play button
    container.querySelector('#gd-play-btn')?.addEventListener('click', () => startGame());

    // Server join buttons
    container.querySelector('#gd-servers')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.gd-server-join');
        if (btn) startGame();
    });

    // Favorite button
    const favBtn = container.querySelector('#gd-fav-btn');
    favBtn?.addEventListener('click', () => {
        const u = Auth.currentUser();
        if (!u) return;
        let favs = u.favorites || [];
        const idx = favs.indexOf(game.id);
        if (idx >= 0) {
            favs.splice(idx, 1);
            favBtn.classList.remove('gd-fav-active');
            favBtn.querySelector('svg').setAttribute('fill', 'none');
        } else {
            favs.push(game.id);
            favBtn.classList.add('gd-fav-active');
            favBtn.querySelector('svg').setAttribute('fill', 'currentColor');
        }
        Auth.updateUser({ favorites: favs });
    });

    // Share button
    container.querySelector('#gd-share-btn')?.addEventListener('click', () => {
        const url = window.location.href;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                const btn = container.querySelector('#gd-share-btn');
                if (btn) {
                    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
                    setTimeout(() => {
                        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
                    }, 2000);
                }
            });
        }
    });

    // Vote buttons (visual only)
    container.querySelector('#gd-vote-up')?.addEventListener('click', function() {
        this.classList.toggle('gd-vote-active');
        container.querySelector('#gd-vote-down')?.classList.remove('gd-vote-active');
    });
    container.querySelector('#gd-vote-down')?.addEventListener('click', function() {
        this.classList.toggle('gd-vote-active');
        container.querySelector('#gd-vote-up')?.classList.remove('gd-vote-active');
    });

    // Game pass buy buttons
    container.querySelector('#gd-passes')?.addEventListener('click', (e) => {
        const buyBtn = e.target.closest('.gd-pass-buy');
        if (!buyBtn) return;

        const u = Auth.currentUser();
        if (!u) return;

        const passId = buyBtn.dataset.passId;
        const result = GoBux.buyPass(u.id, passId);

        if (result.error) {
            buyBtn.textContent = result.error;
            buyBtn.classList.add('gd-pass-buy-error');
            setTimeout(() => {
                const pass = GAME_PASSES.find(p => p.id === passId);
                buyBtn.innerHTML = `${GOBUX_ICON} ${pass.price}`;
                buyBtn.classList.remove('gd-pass-buy-error');
            }, 2000);
            return;
        }

        // Mark as owned
        const card = buyBtn.closest('.gd-pass-card');
        card.classList.add('gd-pass-owned');
        buyBtn.outerHTML = `
            <div class="gd-pass-owned-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Besitzt
            </div>
        `;

        // Update topbar balance
        const navBalance2 = document.querySelector('.topbar-gobux-amount') || document.querySelector('.sidebar-gobux-amount');
        if (navBalance2) {
            navBalance2.textContent = GoBux.getBalance(u.id).toLocaleString('de-DE');
        }
    });

    // Similar games
    container.querySelector('#gd-similar')?.addEventListener('click', (e) => {
        const card = e.target.closest('.gd-similar-card');
        if (card) {
            cleanup();
            router.navigate(`#/game/${card.dataset.gameId}`);
        }
    });

    // Play view controls
    container.querySelector('#gd-btn-fullscreen')?.addEventListener('click', () => {
        const el = canvasWrap;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        } else {
            (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el)?.catch(() => {});
        }
    });

    container.querySelector('#gd-btn-restart')?.addEventListener('click', () => startGame());

    container.querySelector('#gd-btn-leave')?.addEventListener('click', () => {
        if (currentGame) {
            try { currentGame.stop(); } catch (e) { /* ignore */ }
            currentGame = null;
        }
        if (scoreInterval) { clearInterval(scoreInterval); scoreInterval = null; }
        if (mobileControls) { try { mobileControls.destroy(); } catch(e) {} mobileControls = null; }
        showDetail();
    });

    // Game over buttons
    container.querySelector('#game-over-replay')?.addEventListener('click', () => startGame());
    container.querySelector('#game-over-catalog')?.addEventListener('click', () => {
        cleanup();
        router.navigate('#/games');
    });

    // Fullscreen change handler
    function onFullscreenChange() {
        setTimeout(() => {
            if (!is3D && !playView.classList.contains('hidden')) sizeCanvas();
        }, 100);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);

    // ── Cleanup ─────────────────────────────────────────────────────
    renderGame._cleanup = () => {
        cleanup();
        document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
}
