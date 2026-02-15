// js/pages/home.js
import { Auth } from '../auth.js';
import { GameRegistry } from '../games/loader.js';
import { create3DAvatar, registerPageAvatar } from '../components/avatar.js';
import { GoBux, GOBUX_ICON, GOBUX_ICON_LG } from '../gobux.js';

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces values in [0, 1).
 */
function seededRandom(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Get a daily seed based on today's date.
 */
function getDailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * Fisher-Yates shuffle with seeded RNG.
 */
function seededShuffle(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Category gradient colors
const CAT_GRADIENTS = [
    'linear-gradient(135deg, #6c63ff, #a29bfe)',
    'linear-gradient(135deg, #e94560, #fd79a8)',
    'linear-gradient(135deg, #00cec9, #81ecec)',
    'linear-gradient(135deg, #55efc4, #00b894)',
    'linear-gradient(135deg, #fdcb6e, #f39c12)',
    'linear-gradient(135deg, #e17055, #fab1a0)',
    'linear-gradient(135deg, #0984e3, #74b9ff)',
    'linear-gradient(135deg, #6ab04c, #badc58)',
    'linear-gradient(135deg, #d63031, #ff7675)',
    'linear-gradient(135deg, #a29bfe, #6c5ce7)',
    'linear-gradient(135deg, #fd79a8, #e84393)',
    'linear-gradient(135deg, #636e72, #b2bec3)',
];

// Track the active 3D avatar for cleanup
let homeAvatar3D = null;

export function renderHome(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    // Cleanup previous home avatar
    if (homeAvatar3D) {
        try { homeAvatar3D.dispose(); } catch (e) { /* ignore */ }
        homeAvatar3D = null;
    }

    const allGames = GameRegistry.getAllGames();
    const categories = GameRegistry.getCategories();

    // Featured games: seeded daily random selection of 10
    const rng = seededRandom(getDailySeed());
    const featured = seededShuffle(allGames, rng).slice(0, 10);

    // Recent games
    const recentGames = (user.recentGames || []).slice(0, 10);
    const recentGameObjects = recentGames
        .map(rg => {
            const game = GameRegistry.getGame(rg.gameId);
            return game ? { ...game, recentScore: rg.score, recentDate: rg.date } : null;
        })
        .filter(Boolean);

    container.innerHTML = `
        <div class="home-page animate-fade-in">
            <!-- Welcome Banner -->
            <div class="home-banner">
                <div class="home-banner-content">
                    <div class="home-banner-text">
                        <h1>Willkommen zurueck, <span class="text-gradient">${user.name}</span>!</h1>
                        <p class="text-secondary mt-1">Entdecke neue Spiele und fordere deine Freunde heraus.</p>
                        <a href="#/games" class="btn mt-2">Spiele entdecken</a>
                    </div>
                    <div class="home-banner-avatar">
                        <div id="home-avatar-3d" style="width:120px;height:180px;"></div>
                    </div>
                </div>
            </div>

            <!-- Featured Games -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Empfohlene Spiele</h2>
                    <a href="#/games" class="home-see-all">Alle anzeigen</a>
                </div>
                <div class="home-scroll-row" id="home-featured-row">
                    ${featured.map(g => gameCard(g)).join('')}
                </div>
            </section>

            <!-- Categories -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Kategorien</h2>
                </div>
                <div class="home-cat-grid">
                    ${categories.slice(0, 12).map((cat, i) => `
                        <div class="home-cat-card" data-category="${cat.name}" style="background:${CAT_GRADIENTS[i % CAT_GRADIENTS.length]};">
                            <div class="home-cat-name">${cat.name}</div>
                            <div class="home-cat-count">${cat.count} Spiele</div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- Recently Played -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Zuletzt gespielt</h2>
                </div>
                ${recentGameObjects.length > 0 ? `
                    <div class="home-scroll-row" id="home-recent-row">
                        ${recentGameObjects.map(g => gameCard(g)).join('')}
                    </div>
                ` : `
                    <div class="home-empty-row">
                        <p class="text-secondary">Spiel jetzt dein erstes Spiel!</p>
                        <a href="#/games" class="btn btn-sm mt-1">Los geht's</a>
                    </div>
                `}
            </section>

            <!-- Quick Stats -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Schnellstatistik</h2>
                </div>
                <div class="home-quick-stats">
                    <div class="home-quick-stat">
                        <div class="home-quick-stat-value" style="color:#ffd700;display:flex;align-items:center;justify-content:center;gap:0.3rem;">
                            ${GOBUX_ICON}
                            ${GoBux.getBalance(user.id).toLocaleString('de-DE')}
                        </div>
                        <div class="home-quick-stat-label">GoBux</div>
                    </div>
                    <div class="home-quick-stat">
                        <div class="home-quick-stat-value">${(user.gamesPlayed || 0).toLocaleString('de-DE')}</div>
                        <div class="home-quick-stat-label">Gespielt</div>
                    </div>
                    <div class="home-quick-stat">
                        <div class="home-quick-stat-value">${(user.totalScore || 0).toLocaleString('de-DE')}</div>
                        <div class="home-quick-stat-label">Gesamtpunkte</div>
                    </div>
                    <div class="home-quick-stat">
                        <div class="home-quick-stat-value">${(user.favorites || []).length}</div>
                        <div class="home-quick-stat-label">Favoriten</div>
                    </div>
                </div>
                <div class="home-gobux-tip">
                    <div class="home-gobux-tip-icon">${GOBUX_ICON_LG}</div>
                    <div class="home-gobux-tip-text">
                        <h4>GoBux verdienen</h4>
                        <p>Spiele Spiele um GoBux zu verdienen! Jedes Spiel bringt mindestens 1 GoBux. Erhalte Bonus-GoBux durch hohe Punktzahlen und spielspezifische Erfolge. Gib sie im <a href="#/store" style="color:#ffd700;text-decoration:underline;">Shop</a> fuer Game Passes aus!</p>
                    </div>
                </div>
            </section>
        </div>
    `;

    // Create 3D avatar in the welcome banner
    const avatarContainer = container.querySelector('#home-avatar-3d');
    if (avatarContainer) {
        homeAvatar3D = create3DAvatar(avatarContainer, user.avatar, {
            width: 120,
            height: 180,
            autoRotate: true,
            rotateSpeed: 0.008,
            enableControls: false,
        });
        registerPageAvatar(homeAvatar3D);
    }

    // Game card clicks
    container.querySelectorAll('.home-game-card').forEach(card => {
        card.addEventListener('click', () => {
            router.navigate(`#/game/${card.dataset.gameId}`);
        });
    });

    // Category card clicks — navigate to games page with category filter
    container.querySelectorAll('.home-cat-card').forEach(card => {
        card.addEventListener('click', () => {
            // Navigate to games page; the catalog page does not currently accept query params,
            // so we store the selected category and navigate.
            router.navigate('#/games');
        });
    });
}

// Expose cleanup so app.js can call it on navigation
renderHome._cleanup = function () {
    if (homeAvatar3D) {
        try { homeAvatar3D.dispose(); } catch (e) { /* ignore */ }
        homeAvatar3D = null;
    }
};

function gameCard(game) {
    return `
        <div class="home-game-card" data-game-id="${game.id}">
            <div class="home-game-thumb">
                <img src="${game.thumbnail}" alt="${game.name}" loading="lazy" />
            </div>
            <div class="home-game-name">${game.name}</div>
        </div>
    `;
}
