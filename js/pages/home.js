// js/pages/home.js
import { Auth } from '../auth.js';
import { GameRegistry } from '../games/loader.js';
import { create3DAvatar, registerPageAvatar } from '../components/avatar.js';
import { GoBux, GOBUX_ICON, GOBUX_ICON_LG } from '../gobux.js';

/**
 * Seeded pseudo-random number generator (mulberry32).
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

function getDailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededShuffle(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Deterministic player count from game ID
function getPlayerCount(gameId) {
    let s = gameId * 2654435761;
    s = ((s >>> 16) ^ s) * 0x45d9f3b;
    s = ((s >>> 16) ^ s);
    return (Math.abs(s) % 5000) + 50;
}

function formatPlayerCount(count) {
    if (count >= 1000) return (count / 1000).toFixed(1).replace('.0', '') + 'K';
    return count.toString();
}

// Deterministic like percentage
function getLikePercent(gameId) {
    let s = gameId * 1664525 + 1013904223;
    s = ((s >>> 16) ^ s);
    return 60 + (Math.abs(s) % 40); // 60-99%
}

// Category gradients (darker, more saturated)
const CAT_GRADIENTS = [
    'linear-gradient(135deg, #1a8a5c, #0d6b42)',
    'linear-gradient(135deg, #c0392b, #96281b)',
    'linear-gradient(135deg, #2980b9, #1a5276)',
    'linear-gradient(135deg, #8e44ad, #6c3483)',
    'linear-gradient(135deg, #d68910, #b7950b)',
    'linear-gradient(135deg, #16a085, #0e6655)',
    'linear-gradient(135deg, #2c3e50, #1a252f)',
    'linear-gradient(135deg, #e74c3c, #c0392b)',
    'linear-gradient(135deg, #3498db, #2471a3)',
    'linear-gradient(135deg, #27ae60, #1e8449)',
    'linear-gradient(135deg, #e67e22, #ca6f1e)',
    'linear-gradient(135deg, #9b59b6, #7d3c98)',
];

let homeAvatar3D = null;

export function renderHome(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    if (homeAvatar3D) {
        try { homeAvatar3D.dispose(); } catch (e) { /* ignore */ }
        homeAvatar3D = null;
    }

    const allGames = GameRegistry.getAllGames();
    const categories = GameRegistry.getCategories();

    const rng = seededRandom(getDailySeed());
    const featured = seededShuffle(allGames, rng).slice(0, 12);
    const heroGame = featured[0];

    // Popular games (sorted by player count)
    const popular = [...allGames].sort((a, b) => getPlayerCount(b.id) - getPlayerCount(a.id)).slice(0, 12);

    // Recent games
    const recentGames = (user.recentGames || []).slice(0, 10);
    const recentGameObjects = recentGames
        .map(rg => {
            const game = GameRegistry.getGame(rg.gameId);
            return game ? { ...game, recentScore: rg.score } : null;
        })
        .filter(Boolean);

    const heroPlayers = getPlayerCount(heroGame.id);
    const heroLike = getLikePercent(heroGame.id);

    container.innerHTML = `
        <div class="home-page animate-fade-in">
            <!-- Hero Banner -->
            <div class="home-hero" data-game-id="${heroGame.id}">
                <img class="home-hero-img" src="${heroGame.thumbnail}" alt="${heroGame.name}" />
                <div class="home-hero-overlay">
                    <div class="home-hero-badge">Empfohlen</div>
                    <div class="home-hero-title">${heroGame.name}</div>
                    <div class="home-hero-meta">
                        <span class="home-hero-playing">
                            <span class="home-hero-dot"></span>
                            ${formatPlayerCount(heroPlayers)} spielen
                        </span>
                        <span class="home-hero-like">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg>
                            ${heroLike}%
                        </span>
                        <span>${heroGame.category}</span>
                    </div>
                </div>
            </div>

            ${recentGameObjects.length > 0 ? `
            <!-- Continue Playing -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Weiterspielen</h2>
                </div>
                <div class="home-scroll-row">
                    ${recentGameObjects.map(g => gameCard(g)).join('')}
                </div>
            </section>
            ` : ''}

            <!-- Popular -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Beliebt</h2>
                    <a href="#/games" class="home-see-all">Alle anzeigen</a>
                </div>
                <div class="home-scroll-row">
                    ${popular.map(g => gameCard(g)).join('')}
                </div>
            </section>

            <!-- Featured Games -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Empfohlen fuer dich</h2>
                    <a href="#/games" class="home-see-all">Alle anzeigen</a>
                </div>
                <div class="home-scroll-row">
                    ${featured.slice(1).map(g => gameCard(g)).join('')}
                </div>
            </section>

            <!-- Categories -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Kategorien</h2>
                </div>
                <div class="home-cat-grid">
                    ${categories.slice(0, 8).map((cat, i) => `
                        <div class="home-cat-card" data-category="${cat.name}" style="background:${CAT_GRADIENTS[i % CAT_GRADIENTS.length]};">
                            <div class="home-cat-name">${cat.name}</div>
                            <div class="home-cat-count">${cat.count} Spiele</div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- Quick Stats -->
            <section class="home-section">
                <div class="home-section-header">
                    <h2>Deine Statistiken</h2>
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
                        <p>Spiele Spiele um GoBux zu verdienen! Gib sie im <a href="#/store" style="color:#ffd700;text-decoration:underline;">Shop</a> fuer Game Passes aus!</p>
                    </div>
                </div>
            </section>
        </div>
    `;

    // Hero click
    const hero = container.querySelector('.home-hero');
    if (hero) {
        hero.addEventListener('click', () => {
            router.navigate(`#/game/${hero.dataset.gameId}`);
        });
    }

    // Game card clicks
    container.querySelectorAll('.home-game-card').forEach(card => {
        card.addEventListener('click', () => {
            router.navigate(`#/game/${card.dataset.gameId}`);
        });
    });

    // Category card clicks
    container.querySelectorAll('.home-cat-card').forEach(card => {
        card.addEventListener('click', () => {
            router.navigate('#/games');
        });
    });
}

renderHome._cleanup = function () {
    if (homeAvatar3D) {
        try { homeAvatar3D.dispose(); } catch (e) { /* ignore */ }
        homeAvatar3D = null;
    }
};

function gameCard(game) {
    const players = getPlayerCount(game.id);
    const likePercent = getLikePercent(game.id);
    return `
        <div class="home-game-card" data-game-id="${game.id}">
            <div class="home-game-thumb">
                <img src="${game.thumbnail}" alt="${game.name}" loading="lazy" />
            </div>
            <div class="home-game-info">
                <div class="home-game-name">${game.name}</div>
                <div class="home-game-meta">
                    <span class="home-game-playing">
                        <span class="home-game-dot"></span>
                        ${formatPlayerCount(players)}
                    </span>
                    <span class="home-game-like">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg>
                        ${likePercent}%
                    </span>
                </div>
            </div>
        </div>
    `;
}
