import { GameRegistry } from '../games/loader.js';

// ── Category color mapping ──
const CATEGORY_COLORS = {
    'Platformer':     { bg: '#1a8a5c22', text: '#1a8a5c' },
    'Tycoon':         { bg: '#d6891022', text: '#d68910' },
    'Racing':         { bg: '#c0392b22', text: '#c0392b' },
    'Tower Defense':  { bg: '#16a08522', text: '#16a085' },
    'Puzzle':         { bg: '#2980b922', text: '#2980b9' },
    'Shooter':        { bg: '#e74c3c22', text: '#e74c3c' },
    'Snake':          { bg: '#1e844922', text: '#1e8449' },
    'Breakout':       { bg: '#8e44ad22', text: '#8e44ad' },
    'Memory':         { bg: '#6c5ce722', text: '#6c5ce7' },
    'Quiz':           { bg: '#d6891022', text: '#d68910' },
    'Maze':           { bg: '#636e7222', text: '#b2bec3' },
    'Flappy':         { bg: '#27ae6022', text: '#27ae60' },
    'Tetris':         { bg: '#e67e2222', text: '#e67e22' },
    'Whack-a-Mole':   { bg: '#e74c3c22', text: '#e74c3c' },
    'Rhythm':         { bg: '#9b59b622', text: '#9b59b6' },
    'Fishing':        { bg: '#2980b922', text: '#2980b9' },
    'Cooking':        { bg: '#e67e2222', text: '#e67e22' },
    'Farming':        { bg: '#27ae6022', text: '#27ae60' },
    'Word':           { bg: '#bdc3c722', text: '#bdc3c7' },
    'Drawing':        { bg: '#9b59b622', text: '#9b59b6' },
    'Survival':       { bg: '#2c3e5022', text: '#95a5a6' },
    'Simon Says':     { bg: '#d6891022', text: '#d68910' },
    'Space':          { bg: '#6c5ce722', text: '#6c5ce7' },
    'Bubble Shooter': { bg: '#16a08522', text: '#16a085' },
    'Catch':          { bg: '#d6891022', text: '#d68910' },
    'Eigene Spiele':  { bg: '#f39c1222', text: '#f39c12' },
};

const DEFAULT_CATEGORY_COLOR = { bg: '#ffffff11', text: '#bdbebe' };

function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

// Deterministic player count from game ID
function getPlayerCount(gameId) {
    // Custom games use string IDs — hash the string for a numeric seed
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
                thumbnail: null,  // no thumbnail for custom games
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
            <!-- Search bar -->
            <div class="catalog-search-wrap">
                <svg class="catalog-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" class="catalog-search" placeholder="Spiele suchen..." id="catalog-search" autocomplete="off" />
            </div>

            <!-- Category filter pills -->
            <div class="catalog-categories" id="catalog-categories">
                <button class="catalog-pill active" data-category="">Alle</button>
                ${categories.map(c => `
                    <button class="catalog-pill" data-category="${c.name}">
                        ${c.name} <span class="catalog-pill-count">${c.count}</span>
                    </button>
                `).join('')}
            </div>

            <!-- Sort and count -->
            <div class="catalog-toolbar">
                <span class="catalog-count" id="catalog-count"></span>
                <div class="catalog-sort-wrap">
                    <select class="catalog-sort" id="catalog-sort">
                        <option value="popular">Beliebt</option>
                        <option value="alpha">A-Z</option>
                        <option value="category">Kategorie</option>
                    </select>
                </div>
            </div>

            <!-- Game card grid -->
            <div class="catalog-grid" id="catalog-grid"></div>

            <!-- Loading sentinel -->
            <div class="catalog-loader" id="catalog-loader">
                <div class="catalog-spinner"></div>
            </div>
        </div>
    `;

    const searchInput = container.querySelector('#catalog-search');
    const categoriesRow = container.querySelector('#catalog-categories');
    const sortSelect = container.querySelector('#catalog-sort');
    const grid = container.querySelector('#catalog-grid');
    const loader = container.querySelector('#catalog-loader');
    const countEl = container.querySelector('#catalog-count');

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
        } else {
            // Popular: custom games go to the front, then by player count
            games = [...games].sort((a, b) => {
                // Custom games first when no filter
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
        updateLoaderVisibility();
    }

    function updateCount() {
        const total = filteredGames.length;
        countEl.textContent = `${total.toLocaleString('de-DE')} Spiele`;
    }

    function updateLoaderVisibility() {
        loader.style.display = displayedCount >= filteredGames.length ? 'none' : 'flex';
    }

    function loadMore() {
        const end = Math.min(displayedCount + BATCH_SIZE, filteredGames.length);
        const fragment = document.createDocumentFragment();

        for (let i = displayedCount; i < end; i++) {
            fragment.appendChild(createGameCard(filteredGames[i]));
        }

        grid.appendChild(fragment);
        displayedCount = end;
        updateLoaderVisibility();
    }

    function createGameCard(game) {
        const card = document.createElement('div');
        card.className = 'catalog-card' + (game.isCustom ? ' catalog-card-custom' : '');
        card.dataset.gameId = game.id;

        const players = getPlayerCount(game.id);
        const likePercent = getLikePercent(game.id);
        const catColor = getCategoryColor(game.category);

        if (game.isCustom) {
            // Custom game card with generated placeholder thumb
            const templateLabel = game.templateType === 'platformer-2d' ? '2D Platformer' : '3D Obby';
            const accentColor = game.templateType === 'platformer-2d' ? '#00ff87' : '#60efff';
            card.innerHTML = `
                <div class="catalog-card-thumb catalog-card-thumb-custom" style="background: linear-gradient(135deg, ${accentColor}33, ${accentColor}11);">
                    <div class="catalog-card-custom-icon" style="color:${accentColor};">
                        ${game.templateType === 'platformer-2d'
                            ? '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 16v-4l2-2 2 2 2-4 2 4"/></svg>'
                            : '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
                        }
                    </div>
                    <span class="catalog-card-custom-badge">${templateLabel}</span>
                </div>
                <div class="catalog-card-info">
                    <div class="catalog-card-name" title="${game.name}">${game.name}</div>
                    <div class="catalog-card-meta">
                        <span class="catalog-card-creator">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            ${game.creatorName}
                        </span>
                        <span class="catalog-card-like">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg>
                            ${likePercent}%
                        </span>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="catalog-card-thumb">
                    <img src="${game.thumbnail}" alt="${game.name}" loading="lazy" />
                </div>
                <div class="catalog-card-info">
                    <div class="catalog-card-name" title="${game.name}">${game.name}</div>
                    <div class="catalog-card-meta">
                        <span class="catalog-card-players">
                            <span class="catalog-card-dot"></span>
                            ${formatPlayerCount(players)}
                        </span>
                        <span class="catalog-card-like">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 10h3v10H2V10zm5.6 0c-.4 0-.6.3-.6.6v8.8c0 .3.3.6.6.6H18l2-6.5V10H7.6z"/></svg>
                            ${likePercent}%
                        </span>
                    </div>
                </div>
            `;
        }

        card.addEventListener('click', () => {
            router.navigate(`#/game/${game.id}`);
        });

        return card;
    }

    const onSearch = debounce((e) => {
        searchQuery = e.target.value.trim();
        applyFilters();
    }, 300);
    searchInput.addEventListener('input', onSearch);

    function onCategoryClick(e) {
        const pill = e.target.closest('.catalog-pill');
        if (!pill) return;
        categoriesRow.querySelectorAll('.catalog-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.dataset.category || null;
        applyFilters();
    }
    categoriesRow.addEventListener('click', onCategoryClick);

    function onSortChange(e) {
        sortMode = e.target.value;
        applyFilters();
    }
    sortSelect.addEventListener('change', onSortChange);

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && displayedCount < filteredGames.length) {
            loadMore();
        }
    }, { rootMargin: '200px' });
    observer.observe(loader);

    cleanupFns.push(() => {
        searchInput.removeEventListener('input', onSearch);
        categoriesRow.removeEventListener('click', onCategoryClick);
        sortSelect.removeEventListener('change', onSortChange);
        observer.disconnect();
    });

    applyFilters();
}

function cleanup() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
}
