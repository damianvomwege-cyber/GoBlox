// js/pages/home.js — Roblox-style Homepage
import { Auth } from '../auth.js';
import { GameRegistry } from '../games/loader.js';
import { GoBux, GOBUX_ICON } from '../gobux.js';

/* ── Helpers ── */

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

function getLikePercent(gameId) {
    let s = gameId * 1664525 + 1013904223;
    s = ((s >>> 16) ^ s);
    return 60 + (Math.abs(s) % 40);
}

/* Thumbnail color palette for games without images */
const THUMB_COLORS = [
    ['#1a8a5c', '#0d6b42'], ['#c0392b', '#96281b'], ['#2980b9', '#1a5276'],
    ['#8e44ad', '#6c3483'], ['#d68910', '#b7950b'], ['#16a085', '#0e6655'],
    ['#e74c3c', '#c0392b'], ['#3498db', '#2471a3'], ['#27ae60', '#1e8449'],
    ['#e67e22', '#ca6f1e'], ['#9b59b6', '#7d3c98'], ['#2c3e50', '#1a252f'],
];

function thumbGradient(id) {
    const pair = THUMB_COLORS[id % THUMB_COLORS.length];
    return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

/* ── Cleanup state ── */
let _heroInterval = null;
let _searchTimeout = null;
let _listeners = [];

/* ── Game Card HTML ── */
function gameCard(game) {
    const players = getPlayerCount(game.id);
    const likePercent = getLikePercent(game.id);
    const hasThumbnail = game.thumbnail && !game.thumbnail.includes('undefined');
    return `
        <div class="hm-game-card" data-game-id="${game.id}">
            <div class="hm-game-thumb" style="background:${thumbGradient(game.id)}">
                ${hasThumbnail ? `<img src="${game.thumbnail}" alt="${game.name}" loading="lazy" />` : `
                <div class="hm-game-thumb-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)" stroke="none"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M10 8l6 4-6 4V8z" fill="rgba(255,255,255,0.6)"/></svg>
                </div>`}
            </div>
            <div class="hm-game-info">
                <div class="hm-game-name">${game.name}</div>
                <div class="hm-game-stats">
                    <span class="hm-game-players">
                        <span class="hm-dot"></span>
                        ${formatPlayerCount(players)} aktiv
                    </span>
                    <span class="hm-game-likes">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg>
                        ${likePercent}%
                    </span>
                </div>
            </div>
        </div>
    `;
}

/* ── Carousel Section HTML ── */
function carouselSection(title, games, linkHref, linkText, id) {
    if (!games || games.length === 0) return '';
    return `
        <section class="hm-carousel-section" id="${id}">
            <div class="hm-carousel-header">
                <h2 class="hm-carousel-title">${title}</h2>
                ${linkHref ? `<a href="${linkHref}" class="hm-carousel-link">${linkText || 'Alle anzeigen'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></a>` : ''}
            </div>
            <div class="hm-carousel-wrapper">
                <button class="hm-carousel-arrow hm-arrow-left" aria-label="Zurueck">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div class="hm-carousel-track">
                    ${games.map(g => gameCard(g)).join('')}
                </div>
                <button class="hm-carousel-arrow hm-arrow-right" aria-label="Weiter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>
        </section>
    `;
}

/* ── Main Render ── */
export function renderHome(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    const allGames = GameRegistry.getAllGames();
    const rng = seededRandom(getDailySeed());

    // Build data sets
    const shuffled = seededShuffle(allGames, rng);
    const heroGames = shuffled.slice(0, 5);
    const popular = [...allGames].sort((a, b) => getPlayerCount(b.id) - getPlayerCount(a.id)).slice(0, 20);
    const recommended = seededShuffle(allGames, seededRandom(getDailySeed() + 7)).slice(0, 20);
    const trending = seededShuffle(allGames, seededRandom(getDailySeed() + 42)).slice(0, 20);

    // Recent games
    const recentRaw = (user.recentGames || []).slice(0, 12);
    const recentGames = recentRaw
        .map(rg => {
            const game = GameRegistry.getGame(rg.gameId);
            return game ? { ...game, recentScore: rg.score } : null;
        })
        .filter(Boolean);

    // GoBux balance
    const balance = GoBux.getBalance(user.id);

    // Initial hero
    let heroIndex = 0;
    const hero = heroGames[heroIndex];
    const heroPlayers = getPlayerCount(hero.id);
    const heroLike = getLikePercent(hero.id);

    container.innerHTML = `
        <div class="hm-page animate-fade-in">
            <!-- Top Bar -->
            <div class="hm-topbar">
                <div class="hm-search-wrap">
                    <svg class="hm-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" class="hm-search-input" placeholder="Spiele durchsuchen..." />
                    <div class="hm-search-results hidden"></div>
                </div>
                <div class="hm-topbar-right">
                    <div class="hm-gobux-badge" title="GoBux Guthaben">
                        ${GOBUX_ICON}
                        <span class="hm-gobux-amount">${balance.toLocaleString('de-DE')}</span>
                    </div>
                    <button class="hm-notif-btn" title="Benachrichtigungen">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        <span class="hm-notif-dot"></span>
                    </button>
                </div>
            </div>

            <!-- Hero Banner -->
            <div class="hm-hero" data-game-id="${hero.id}">
                <div class="hm-hero-bg" style="background:${thumbGradient(hero.id)}">
                    ${hero.thumbnail ? `<img class="hm-hero-img" src="${hero.thumbnail}" alt="${hero.name}" />` : ''}
                </div>
                <div class="hm-hero-overlay">
                    <div class="hm-hero-content">
                        <span class="hm-hero-badge">Empfohlen</span>
                        <h1 class="hm-hero-title">${hero.name}</h1>
                        <p class="hm-hero-desc">${hero.category}</p>
                        <div class="hm-hero-meta">
                            <span class="hm-hero-players">
                                <span class="hm-dot hm-dot-lg"></span>
                                ${formatPlayerCount(heroPlayers)} spielen
                            </span>
                            <span class="hm-hero-likes">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg>
                                ${heroLike}%
                            </span>
                        </div>
                        <button class="hm-hero-play-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            Jetzt spielen
                        </button>
                    </div>
                    <div class="hm-hero-dots">
                        ${heroGames.map((_, i) => `<button class="hm-hero-dot-btn ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join('')}
                    </div>
                </div>
            </div>

            <!-- Carousels -->
            ${carouselSection('Weiterspielen', recentGames, null, null, 'hm-continue')}
            ${carouselSection('Beliebt', popular, '#/games', 'Alle anzeigen', 'hm-popular')}
            ${carouselSection('Empfohlen fuer dich', recommended, '#/games', 'Alle anzeigen', 'hm-recommended')}
            ${carouselSection('Trending', trending, '#/games', 'Alle anzeigen', 'hm-trending')}
        </div>
    `;

    /* ── Event Wiring ── */

    // Helper: add event + track for cleanup
    function on(el, evt, fn) {
        if (!el) return;
        el.addEventListener(evt, fn);
        _listeners.push({ el, evt, fn });
    }

    // Hero click / play button
    const heroEl = container.querySelector('.hm-hero');
    const heroPlayBtn = container.querySelector('.hm-hero-play-btn');
    on(heroPlayBtn, 'click', (e) => {
        e.stopPropagation();
        router.navigate(`#/game/${heroEl.dataset.gameId}`);
    });
    on(heroEl, 'click', () => {
        router.navigate(`#/game/${heroEl.dataset.gameId}`);
    });

    // Hero banner rotation
    function updateHero(index) {
        heroIndex = index;
        const g = heroGames[index];
        const pl = getPlayerCount(g.id);
        const lk = getLikePercent(g.id);

        heroEl.dataset.gameId = g.id;
        const bg = heroEl.querySelector('.hm-hero-bg');
        bg.style.background = thumbGradient(g.id);
        const img = heroEl.querySelector('.hm-hero-img');
        if (img && g.thumbnail) {
            img.src = g.thumbnail;
            img.alt = g.name;
        }

        heroEl.querySelector('.hm-hero-title').textContent = g.name;
        heroEl.querySelector('.hm-hero-desc').textContent = g.category;
        heroEl.querySelector('.hm-hero-players').innerHTML =
            `<span class="hm-dot hm-dot-lg"></span> ${formatPlayerCount(pl)} spielen`;
        heroEl.querySelector('.hm-hero-likes').innerHTML =
            `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg> ${lk}%`;

        // Update dots
        heroEl.querySelectorAll('.hm-hero-dot-btn').forEach((d, i) => {
            d.classList.toggle('active', i === index);
        });

        // Animate
        const content = heroEl.querySelector('.hm-hero-content');
        content.style.animation = 'none';
        content.offsetHeight; // reflow
        content.style.animation = 'hmHeroFadeIn 0.4s ease forwards';
    }

    // Hero dot buttons
    heroEl.querySelectorAll('.hm-hero-dot-btn').forEach(btn => {
        on(btn, 'click', (e) => {
            e.stopPropagation();
            updateHero(parseInt(btn.dataset.index));
            resetHeroTimer();
        });
    });

    // Auto-rotate hero
    function resetHeroTimer() {
        if (_heroInterval) clearInterval(_heroInterval);
        _heroInterval = setInterval(() => {
            updateHero((heroIndex + 1) % heroGames.length);
        }, 6000);
    }
    resetHeroTimer();

    // Game card clicks
    container.querySelectorAll('.hm-game-card').forEach(card => {
        on(card, 'click', () => {
            router.navigate(`#/game/${card.dataset.gameId}`);
        });
    });

    // Carousel arrow buttons
    container.querySelectorAll('.hm-carousel-wrapper').forEach(wrapper => {
        const track = wrapper.querySelector('.hm-carousel-track');
        const leftBtn = wrapper.querySelector('.hm-arrow-left');
        const rightBtn = wrapper.querySelector('.hm-arrow-right');
        const scrollAmount = 600;

        function updateArrowVisibility() {
            const { scrollLeft, scrollWidth, clientWidth } = track;
            leftBtn.classList.toggle('hm-arrow-hidden', scrollLeft <= 5);
            rightBtn.classList.toggle('hm-arrow-hidden', scrollLeft + clientWidth >= scrollWidth - 5);
        }

        on(leftBtn, 'click', () => {
            track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        on(rightBtn, 'click', () => {
            track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
        on(track, 'scroll', updateArrowVisibility);

        // Initial state
        updateArrowVisibility();
    });

    // Search
    const searchInput = container.querySelector('.hm-search-input');
    const searchResults = container.querySelector('.hm-search-results');

    on(searchInput, 'input', () => {
        clearTimeout(_searchTimeout);
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }
        _searchTimeout = setTimeout(() => {
            const results = GameRegistry.searchGames(query).slice(0, 8);
            if (results.length === 0) {
                searchResults.innerHTML = `<div class="hm-search-empty">Keine Spiele gefunden</div>`;
            } else {
                searchResults.innerHTML = results.map(g => `
                    <div class="hm-search-item" data-game-id="${g.id}">
                        <div class="hm-search-item-thumb" style="background:${thumbGradient(g.id)}">
                            ${g.thumbnail ? `<img src="${g.thumbnail}" alt="" loading="lazy" />` : ''}
                        </div>
                        <div class="hm-search-item-info">
                            <div class="hm-search-item-name">${g.name}</div>
                            <div class="hm-search-item-meta">
                                <span class="hm-dot"></span>
                                ${formatPlayerCount(getPlayerCount(g.id))} aktiv
                                &middot; ${g.category}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            searchResults.classList.remove('hidden');

            // Wire search result clicks
            searchResults.querySelectorAll('.hm-search-item').forEach(item => {
                item.addEventListener('click', () => {
                    router.navigate(`#/game/${item.dataset.gameId}`);
                });
            });
        }, 200);
    });

    // Close search on outside click
    on(document, 'click', (e) => {
        if (!e.target.closest('.hm-search-wrap')) {
            searchResults.classList.add('hidden');
        }
    });

    // GoBux badge click -> store
    const gobuxBadge = container.querySelector('.hm-gobux-badge');
    on(gobuxBadge, 'click', () => {
        router.navigate('#/store');
    });

    // Notification bell (no-op for now, visual only)
    const notifBtn = container.querySelector('.hm-notif-btn');
    on(notifBtn, 'click', () => {
        // Could open a notification panel in the future
    });
}

/* ── Cleanup ── */
renderHome._cleanup = function () {
    if (_heroInterval) {
        clearInterval(_heroInterval);
        _heroInterval = null;
    }
    if (_searchTimeout) {
        clearTimeout(_searchTimeout);
        _searchTimeout = null;
    }
    _listeners.forEach(({ el, evt, fn }) => {
        try { el.removeEventListener(evt, fn); } catch (e) { /* ignore */ }
    });
    _listeners = [];
};
