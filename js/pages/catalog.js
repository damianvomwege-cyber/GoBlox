import { GameRegistry } from '../games/loader.js';

// ── Category color mapping ──────────────────────────────────────────────
const CATEGORY_COLORS = {
    'Platformer':     { bg: '#6c63ff22', text: '#6c63ff', border: '#6c63ff55' },
    'Tycoon':         { bg: '#ffd70022', text: '#ffd700', border: '#ffd70055' },
    'Racing':         { bg: '#e74c3c22', text: '#e74c3c', border: '#e74c3c55' },
    'Tower Defense':  { bg: '#00cec922', text: '#00cec9', border: '#00cec955' },
    'Puzzle':         { bg: '#0984e322', text: '#0984e3', border: '#0984e355' },
    'Shooter':        { bg: '#d6303122', text: '#d63031', border: '#d6303155' },
    'Snake':          { bg: '#00b89422', text: '#00b894', border: '#00b89455' },
    'Breakout':       { bg: '#e8439322', text: '#e84393', border: '#e8439355' },
    'Memory':         { bg: '#a29bfe22', text: '#a29bfe', border: '#a29bfe55' },
    'Quiz':           { bg: '#fdcb6e22', text: '#fdcb6e', border: '#fdcb6e55' },
    'Maze':           { bg: '#636e7222', text: '#b2bec3', border: '#636e7255' },
    'Flappy':         { bg: '#55efc422', text: '#55efc4', border: '#55efc455' },
    'Tetris':         { bg: '#e74c3c22', text: '#f39c12', border: '#f39c1255' },
    'Whack-a-Mole':   { bg: '#e1705522', text: '#e17055', border: '#e1705555' },
    'Rhythm':         { bg: '#fd79a822', text: '#fd79a8', border: '#fd79a855' },
    'Fishing':        { bg: '#74b9ff22', text: '#74b9ff', border: '#74b9ff55' },
    'Cooking':        { bg: '#fab1a022', text: '#fab1a0', border: '#fab1a055' },
    'Farming':        { bg: '#6ab04c22', text: '#6ab04c', border: '#6ab04c55' },
    'Word':           { bg: '#dfe6e922', text: '#dfe6e9', border: '#dfe6e955' },
    'Drawing':        { bg: '#fd79a822', text: '#fd79a8', border: '#fd79a855' },
    'Survival':       { bg: '#2d343622', text: '#b2bec3', border: '#63727255' },
    'Simon Says':     { bg: '#f1c40f22', text: '#f1c40f', border: '#f1c40f55' },
    'Space':          { bg: '#4834d422', text: '#a29bfe', border: '#6c5ce755' },
    'Bubble Shooter': { bg: '#81ecec22', text: '#81ecec', border: '#00cec955' },
    'Catch':          { bg: '#fdcb6e22', text: '#fdcb6e', border: '#f39c1255' },
};

const DEFAULT_CATEGORY_COLOR = { bg: '#ffffff11', text: '#a0a0b0', border: '#ffffff22' };

function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

// ── Simulated player count (deterministic per game ID) ──────────────────
function getPlayerCount(gameId) {
    // Deterministic seeded value from game ID
    let s = gameId * 2654435761;
    s = ((s >>> 16) ^ s) * 0x45d9f3b;
    s = ((s >>> 16) ^ s);
    return (Math.abs(s) % 5000) + 1;
}

function formatPlayerCount(count) {
    if (count >= 1000) {
        return (count / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return count.toString();
}

// ── Debounce helper ─────────────────────────────────────────────────────
function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

// ── State ───────────────────────────────────────────────────────────────
let allGames = [];
let filteredGames = [];
let displayedCount = 0;
const BATCH_SIZE = 60;
let activeCategory = null;
let searchQuery = '';
let sortMode = 'popular';
let cleanupFns = [];

// ── Render ──────────────────────────────────────────────────────────────
export function renderCatalog(container, router) {
    // Cleanup previous instance
    cleanup();

    allGames = GameRegistry.getAllGames();
    const categories = GameRegistry.getCategories();

    container.innerHTML = `
        <div class="catalog-page animate-fade-in">
            <!-- Search bar -->
            <div class="catalog-search-wrap">
                <svg class="catalog-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

            <!-- Sort and count row -->
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

            <!-- Loading sentinel for infinite scroll -->
            <div class="catalog-loader" id="catalog-loader">
                <div class="catalog-spinner"></div>
            </div>
        </div>
    `;

    // DOM refs
    const searchInput = container.querySelector('#catalog-search');
    const categoriesRow = container.querySelector('#catalog-categories');
    const sortSelect = container.querySelector('#catalog-sort');
    const grid = container.querySelector('#catalog-grid');
    const loader = container.querySelector('#catalog-loader');
    const countEl = container.querySelector('#catalog-count');

    // Reset state
    activeCategory = null;
    searchQuery = '';
    sortMode = 'popular';
    displayedCount = 0;

    // ── Filter + Sort logic ─────────────────────────────────────────────
    function applyFilters() {
        let games = allGames;

        // Category filter
        if (activeCategory) {
            games = games.filter(g => g.category === activeCategory);
        }

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            games = games.filter(g =>
                g.name.toLowerCase().includes(q) ||
                g.category.toLowerCase().includes(q)
            );
        }

        // Sort
        if (sortMode === 'alpha') {
            games = [...games].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortMode === 'category') {
            games = [...games].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        } else {
            // Popular: sort by simulated player count desc
            games = [...games].sort((a, b) => getPlayerCount(b.id) - getPlayerCount(a.id));
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
        if (displayedCount >= filteredGames.length) {
            loader.style.display = 'none';
        } else {
            loader.style.display = 'flex';
        }
    }

    // ── Render a batch of cards ─────────────────────────────────────────
    function loadMore() {
        const end = Math.min(displayedCount + BATCH_SIZE, filteredGames.length);
        const fragment = document.createDocumentFragment();

        for (let i = displayedCount; i < end; i++) {
            const game = filteredGames[i];
            const card = createGameCard(game);
            fragment.appendChild(card);
        }

        grid.appendChild(fragment);
        displayedCount = end;
        updateLoaderVisibility();
    }

    function createGameCard(game) {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        card.dataset.gameId = game.id;

        const catColor = getCategoryColor(game.category);
        const players = getPlayerCount(game.id);

        card.innerHTML = `
            <div class="catalog-card-thumb">
                <img src="${game.thumbnail}" alt="${game.name}" loading="lazy" />
            </div>
            <div class="catalog-card-info">
                <div class="catalog-card-name" title="${game.name}">${game.name}</div>
                <div class="catalog-card-meta">
                    <span class="catalog-card-badge" style="background:${catColor.bg};color:${catColor.text};border:1px solid ${catColor.border}">
                        ${game.category}
                    </span>
                    <span class="catalog-card-players">${formatPlayerCount(players)} spielen</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            router.navigate(`#/game/${game.id}`);
        });

        return card;
    }

    // ── Event: Search ───────────────────────────────────────────────────
    const onSearch = debounce((e) => {
        searchQuery = e.target.value.trim();
        applyFilters();
    }, 300);
    searchInput.addEventListener('input', onSearch);

    // ── Event: Category pills ───────────────────────────────────────────
    function onCategoryClick(e) {
        const pill = e.target.closest('.catalog-pill');
        if (!pill) return;

        categoriesRow.querySelectorAll('.catalog-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.dataset.category || null;
        applyFilters();
    }
    categoriesRow.addEventListener('click', onCategoryClick);

    // ── Event: Sort ─────────────────────────────────────────────────────
    function onSortChange(e) {
        sortMode = e.target.value;
        applyFilters();
    }
    sortSelect.addEventListener('change', onSortChange);

    // ── Infinite scroll via IntersectionObserver ─────────────────────────
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && displayedCount < filteredGames.length) {
            loadMore();
        }
    }, { rootMargin: '200px' });
    observer.observe(loader);

    // ── Cleanup registration ────────────────────────────────────────────
    cleanupFns.push(() => {
        searchInput.removeEventListener('input', onSearch);
        categoriesRow.removeEventListener('click', onCategoryClick);
        sortSelect.removeEventListener('change', onSortChange);
        observer.disconnect();
    });

    // Initial load
    applyFilters();
}

function cleanup() {
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
}
