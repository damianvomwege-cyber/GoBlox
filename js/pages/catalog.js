import { GameRegistry } from '../games/loader.js';

// ── Category icon SVGs ──
const CATEGORY_ICONS = {
    'Platformer':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 19l2-8 3 4 4-8 3 6 2-4"/><rect x="2" y="18" width="20" height="3" rx="1.5"/></svg>',
    'Tycoon':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="3"/><path d="M6 6l2 2M16 6l-2 2M6 18l2-2M16 18l-2-2"/></svg>',
    'Racing':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3L2 12h3v8h14v-8h3L12 3z"/><path d="M14 20v-4h-4v4"/></svg>',
    'Tower Defense':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 21V8l4-5h8l4 5v13"/><path d="M4 8h16"/><rect x="9" y="13" width="6" height="8"/><path d="M7 3v2M12 3v2M17 3v2"/></svg>',
    'Puzzle':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h3a2 2 0 1 1 0-4h2v3a2 2 0 1 1 4 0V3h2a2 2 0 1 1 0 4h3v3a2 2 0 1 0 0 4v3h-3a2 2 0 1 0 0 4h-2v-3a2 2 0 1 0-4 0v3H7a2 2 0 1 0 0-4H4v-3a2 2 0 1 1 0-4V7z"/></svg>',
    'Shooter':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>',
    'Snake':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12c0-3 2-6 5-6s3 4 6 4 5-3 5-6"/><circle cx="18" cy="4" r="2" fill="currentColor"/></svg>',
    'Breakout':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="5" height="3" rx="1"/><rect x="10" y="3" width="5" height="3" rx="1"/><rect x="17" y="3" width="4" height="3" rx="1"/><rect x="3" y="8" width="5" height="3" rx="1"/><rect x="10" y="8" width="5" height="3" rx="1"/><rect x="8" y="19" width="8" height="2" rx="1"/><circle cx="12" cy="15" r="1.5"/></svg>',
    'Memory':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M7 7l0 0M17 7l0 0"/></svg>',
    'Quiz':           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 9c0-1.7 1.3-3 3-3s3 1.3 3 3c0 2-3 2-3 4"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>',
    'Maze':           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M6 2v8h4V6h4v8h-4v4h8v-4h-4V6h4"/></svg>',
    'Flappy':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="12" r="4"/><path d="M14 12l4-2v6l-4-2"/><circle cx="9" cy="11" r="1" fill="currentColor"/></svg>',
    'Tetris':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="13" width="5" height="5"/><rect x="8" y="13" width="5" height="5"/><rect x="8" y="8" width="5" height="5"/><rect x="13" y="16" width="5" height="5"/><rect x="13" y="11" width="5" height="5"/></svg>',
    'Whack-a-Mole':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="18" rx="8" ry="3"/><path d="M8 15V9a4 4 0 0 1 8 0v6"/><circle cx="10" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="10" r="1" fill="currentColor"/></svg>',
    'Rhythm':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    'Fishing':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 4l-4 8h6l-4 8"/><path d="M4 14c2-2 4 0 6-2s4 0 6-2"/></svg>',
    'Cooking':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 18h16v2H4zM4 18c0-4 3-6 3-10h10c0 4 3 6 3 10"/><path d="M12 4V2M9 5V4M15 5V4"/></svg>',
    'Farming':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22V12"/><path d="M8 12c0-6 4-10 4-10s4 4 4 10"/><path d="M5 22c0-3 3-5 7-5s7 2 7 5"/></svg>',
    'Word':           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
    'Drawing':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18"/></svg>',
    'Survival':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L8 8H3l3 6-3 6h5l4 6 4-6h5l-3-6 3-6h-5L12 2z"/></svg>',
    'Simon Says':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l7-7"/><path d="M12 12l7 7"/><path d="M12 12l-7 7"/><path d="M12 12L5 5"/></svg>',
    'Space':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7l3-7z"/></svg>',
    'Bubble Shooter': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="6" r="3"/><circle cx="16" cy="6" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><circle cx="12" cy="20" r="2"/></svg>',
    'Catch':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18h12v3H6z"/><circle cx="12" cy="8" r="4"/><path d="M8 14l-2 4M16 14l2 4"/></svg>',
    'Eigene Spiele':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>',
};

const DEFAULT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>';

function getCategoryIcon(category) {
    return CATEGORY_ICONS[category] || DEFAULT_ICON;
}

// ── Category color mapping ──
const CATEGORY_COLORS = {
    'Platformer':     { grad1: '#1a8a5c', grad2: '#0e5e3a' },
    'Tycoon':         { grad1: '#d68910', grad2: '#a36a08' },
    'Racing':         { grad1: '#c0392b', grad2: '#8e2c1f' },
    'Tower Defense':  { grad1: '#16a085', grad2: '#0e7060' },
    'Puzzle':         { grad1: '#2980b9', grad2: '#1c5a85' },
    'Shooter':        { grad1: '#e74c3c', grad2: '#a33529' },
    'Snake':          { grad1: '#1e8449', grad2: '#145c32' },
    'Breakout':       { grad1: '#8e44ad', grad2: '#6a337f' },
    'Memory':         { grad1: '#6c5ce7', grad2: '#4a3db5' },
    'Quiz':           { grad1: '#d68910', grad2: '#a36a08' },
    'Maze':           { grad1: '#636e72', grad2: '#3d4447' },
    'Flappy':         { grad1: '#27ae60', grad2: '#1a7a42' },
    'Tetris':         { grad1: '#e67e22', grad2: '#b36318' },
    'Whack-a-Mole':   { grad1: '#e74c3c', grad2: '#a33529' },
    'Rhythm':         { grad1: '#9b59b6', grad2: '#6f3e82' },
    'Fishing':        { grad1: '#2980b9', grad2: '#1c5a85' },
    'Cooking':        { grad1: '#e67e22', grad2: '#b36318' },
    'Farming':        { grad1: '#27ae60', grad2: '#1a7a42' },
    'Word':           { grad1: '#6c5ce7', grad2: '#4a3db5' },
    'Drawing':        { grad1: '#9b59b6', grad2: '#6f3e82' },
    'Survival':       { grad1: '#2c3e50', grad2: '#1a252f' },
    'Simon Says':     { grad1: '#d68910', grad2: '#a36a08' },
    'Space':          { grad1: '#6c5ce7', grad2: '#352e73' },
    'Bubble Shooter': { grad1: '#16a085', grad2: '#0e7060' },
    'Catch':          { grad1: '#d68910', grad2: '#a36a08' },
    'Eigene Spiele':  { grad1: '#f39c12', grad2: '#c57f0a' },
};

const DEFAULT_CATEGORY = { grad1: '#555', grad2: '#333' };

function getCategoryGradient(category) {
    return CATEGORY_COLORS[category] || DEFAULT_CATEGORY;
}

// Deterministic player count from game ID
function getPlayerCount(gameId) {
    if (typeof gameId === 'string') {
        let hash = 0;
        for (let i = 0; i < gameId.length; i++) {
            hash = ((hash << 5) - hash + gameId.charCodeAt(i)) | 0;
        }
        return (Math.abs(hash) % 200) + 5;
    }
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
    if (typeof gameId === 'string') {
        let hash = 0;
        for (let i = 0; i < gameId.length; i++) {
            hash = ((hash << 5) - hash + gameId.charCodeAt(i)) | 0;
        }
        return 70 + (Math.abs(hash) % 30);
    }
    let s = gameId * 1664525 + 1013904223;
    s = ((s >>> 16) ^ s);
    return 60 + (Math.abs(s) % 40);
}

// Debounce
function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

// ── Load published custom games from localStorage ──
function getCustomGames() {
    try {
        const created = JSON.parse(localStorage.getItem('goblox_created_games') || '{}');
        return Object.entries(created)
            .filter(([_, g]) => g.published)
            .map(([id, g]) => ({
                id: id,
                name: g.name || 'Benutzerdefiniertes Spiel',
                category: 'Eigene Spiele',
                description: g.template === 'platformer-2d' ? 'Benutzerdefinierter Platformer' : 'Benutzerdefiniertes 3D Spiel',
                is3D: g.template !== 'platformer-2d',
                isCustom: true,
                creatorName: g.creatorName || 'Unbekannt',
                thumbnail: null,
                templateType: g.template,
            }));
    } catch (e) {
        return [];
    }
}

// State
let allGames = [];
let filteredGames = [];
let displayedCount = 0;
const BATCH_SIZE = 60;
let activeCategory = null;
let searchQuery = '';
let sortMode = 'popular';
let cleanupFns = [];

export function renderCatalog(container, router) {
    cleanup();

    container.innerHTML = `
        <div class="catalog-loading animate-fade-in">
            <div class="catalog-loading-spinner"></div>
            <div class="catalog-loading-text">Spiele werden geladen...</div>
        </div>
    `;

    requestAnimationFrame(() => {
        renderCatalogContent(container, router);
    });
}

function renderCatalogContent(container, router) {
    // Registry games + custom games
    const registryGames = GameRegistry.getAllGames();
    const customGames = getCustomGames();
    allGames = [...registryGames, ...customGames];

    // Build categories including custom games
    const categories = GameRegistry.getCategories();
    if (customGames.length > 0) {
        categories.push({ name: 'Eigene Spiele', count: customGames.length });
    }

    container.innerHTML = `
        <div class="catalog-page animate-fade-in">
            <!-- Header -->
            <div class="catalog-header">
                <h1 class="catalog-title">Entdecken</h1>
                <div class="catalog-search-wrap">
                    <svg class="catalog-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="7"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input type="text" class="catalog-search" placeholder="Erlebnisse suchen..." id="catalog-search" autocomplete="off" />
                    <svg class="catalog-search-clear hidden" id="catalog-search-clear" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                    </svg>
                </div>
            </div>

            <!-- Category filter pills (horizontal scroll) -->
            <div class="catalog-categories-wrap">
                <div class="catalog-categories" id="catalog-categories">
                    <button class="catalog-pill active" data-category="">Alle</button>
                    ${categories.map(c => `
                        <button class="catalog-pill" data-category="${c.name}">
                            ${c.name}
                            <span class="catalog-pill-count">${c.count}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Sort toolbar -->
            <div class="catalog-toolbar">
                <span class="catalog-count" id="catalog-count"></span>
                <div class="catalog-sort-wrap">
                    <label class="catalog-sort-label">Sortieren:</label>
                    <select class="catalog-sort" id="catalog-sort">
                        <option value="popular">Beliebt</option>
                        <option value="top">Am besten bewertet</option>
                        <option value="alpha">A - Z</option>
                        <option value="category">Kategorie</option>
                    </select>
                </div>
            </div>

            <!-- Game card grid -->
            <div class="catalog-grid" id="catalog-grid"></div>

            <!-- Load more / infinite scroll sentinel -->
            <div class="catalog-load-more" id="catalog-load-more">
                <button class="catalog-load-more-btn" id="catalog-load-more-btn">
                    <div class="catalog-spinner"></div>
                    <span>Mehr laden</span>
                </button>
            </div>

            <!-- Empty state -->
            <div class="catalog-empty hidden" id="catalog-empty">
                <svg class="catalog-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                <p class="catalog-empty-text">Keine Spiele gefunden</p>
                <p class="catalog-empty-sub">Versuche einen anderen Suchbegriff oder eine andere Kategorie.</p>
            </div>
        </div>
    `;

    const searchInput = container.querySelector('#catalog-search');
    const searchClear = container.querySelector('#catalog-search-clear');
    const categoriesRow = container.querySelector('#catalog-categories');
    const sortSelect = container.querySelector('#catalog-sort');
    const grid = container.querySelector('#catalog-grid');
    const loadMoreWrap = container.querySelector('#catalog-load-more');
    const loadMoreBtn = container.querySelector('#catalog-load-more-btn');
    const countEl = container.querySelector('#catalog-count');
    const emptyEl = container.querySelector('#catalog-empty');

    activeCategory = null;
    searchQuery = '';
    sortMode = 'popular';
    displayedCount = 0;

    function applyFilters() {
        let games = allGames;

        if (activeCategory) {
            games = games.filter(g => g.category === activeCategory);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            games = games.filter(g =>
                g.name.toLowerCase().includes(q) ||
                g.category.toLowerCase().includes(q) ||
                (g.creatorName && g.creatorName.toLowerCase().includes(q))
            );
        }

        if (sortMode === 'alpha') {
            games = [...games].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortMode === 'category') {
            games = [...games].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        } else if (sortMode === 'top') {
            games = [...games].sort((a, b) => getLikePercent(b.id) - getLikePercent(a.id));
        } else {
            // Popular: custom games go to the front, then by player count
            games = [...games].sort((a, b) => {
                if (a.isCustom && !b.isCustom) return -1;
                if (!a.isCustom && b.isCustom) return 1;
                return getPlayerCount(b.id) - getPlayerCount(a.id);
            });
        }

        filteredGames = games;
        displayedCount = 0;
        grid.innerHTML = '';
        updateCount();
        loadMore();
        updateLoadMoreVisibility();
        updateEmptyState();
    }

    function updateCount() {
        const total = filteredGames.length;
        countEl.textContent = `${total.toLocaleString('de-DE')} ${total === 1 ? 'Spiel' : 'Spiele'}`;
    }

    function updateLoadMoreVisibility() {
        const hasMore = displayedCount < filteredGames.length;
        loadMoreWrap.style.display = hasMore ? 'flex' : 'none';
    }

    function updateEmptyState() {
        if (filteredGames.length === 0) {
            emptyEl.classList.remove('hidden');
            grid.style.display = 'none';
        } else {
            emptyEl.classList.add('hidden');
            grid.style.display = '';
        }
    }

    function loadMore() {
        const end = Math.min(displayedCount + BATCH_SIZE, filteredGames.length);
        const fragment = document.createDocumentFragment();

        for (let i = displayedCount; i < end; i++) {
            fragment.appendChild(createGameCard(filteredGames[i], i));
        }

        grid.appendChild(fragment);
        displayedCount = end;
        updateLoadMoreVisibility();
    }

    function createGameCard(game, index) {
        const card = document.createElement('div');
        card.className = 'rblx-card';
        if (game.isCustom) card.classList.add('rblx-card--custom');
        card.dataset.gameId = game.id;

        // Stagger animation
        card.style.animationDelay = `${Math.min(index % BATCH_SIZE, 20) * 25}ms`;

        const players = getPlayerCount(game.id);
        const likePercent = getLikePercent(game.id);
        const catGrad = getCategoryGradient(game.category);
        const icon = getCategoryIcon(game.category);
        const hasThumbnail = game.thumbnail && !game.isCustom;

        card.innerHTML = `
            <div class="rblx-card__thumb">
                ${hasThumbnail
                    ? `<img class="rblx-card__img" src="${game.thumbnail}" alt="${game.name}" loading="lazy" decoding="async" />`
                    : `<div class="rblx-card__gradient" style="background: linear-gradient(145deg, ${catGrad.grad1}, ${catGrad.grad2});">
                           <div class="rblx-card__icon">${icon}</div>
                       </div>`
                }
                ${game.is3D ? '<span class="rblx-card__badge-3d">3D</span>' : ''}
            </div>
            <div class="rblx-card__body">
                <div class="rblx-card__title" title="${game.name}">${game.name}</div>
                <div class="rblx-card__stats">
                    <span class="rblx-card__players">
                        <span class="rblx-card__dot"></span>
                        ${formatPlayerCount(players)} aktiv
                    </span>
                    <span class="rblx-card__likes">
                        <svg class="rblx-card__like-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2 20h2V10H2v10zm20-9a2 2 0 0 0-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 2 7.59 7.59C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                        </svg>
                        ${likePercent}%
                    </span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            router.navigate(`#/game/${game.id}`);
        });

        return card;
    }

    // ── Search ──
    const onSearch = debounce((e) => {
        searchQuery = e.target.value.trim();
        searchClear.classList.toggle('hidden', !searchQuery);
        applyFilters();
    }, 250);
    searchInput.addEventListener('input', onSearch);

    function onSearchClear() {
        searchInput.value = '';
        searchQuery = '';
        searchClear.classList.add('hidden');
        searchInput.focus();
        applyFilters();
    }
    searchClear.addEventListener('click', onSearchClear);

    // ── Categories ──
    function onCategoryClick(e) {
        const pill = e.target.closest('.catalog-pill');
        if (!pill) return;
        categoriesRow.querySelectorAll('.catalog-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.dataset.category || null;
        applyFilters();

        // Scroll pill into view
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    categoriesRow.addEventListener('click', onCategoryClick);

    // ── Sort ──
    function onSortChange(e) {
        sortMode = e.target.value;
        applyFilters();
    }
    sortSelect.addEventListener('change', onSortChange);

    // ── Load More button ──
    function onLoadMoreClick() {
        loadMore();
    }
    loadMoreBtn.addEventListener('click', onLoadMoreClick);

    // ── Infinite scroll (intersection observer) ──
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && displayedCount < filteredGames.length) {
            loadMore();
        }
    }, { rootMargin: '400px' });
    observer.observe(loadMoreWrap);

    cleanupFns.push(() => {
        searchInput.removeEventListener('input', onSearch);
        searchClear.removeEventListener('click', onSearchClear);
        categoriesRow.removeEventListener('click', onCategoryClick);
        sortSelect.removeEventListener('change', onSortChange);
        loadMoreBtn.removeEventListener('click', onLoadMoreClick);
        observer.disconnect();
    });

    applyFilters();
}

function cleanup() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
}
