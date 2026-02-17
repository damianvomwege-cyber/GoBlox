import { Router } from './router.js';
import { Auth } from './auth.js';

const router = new Router();
const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');

let sidebarRendered = false;
let sidebarMod = null;
let navId = 0;

// Loaded module references for cleanup
const mods = {};

// ── Restore saved theme ─────────────────────────────────────────────
(function restoreTheme() {
    const user = Auth.currentUser();
    if (user) {
        const s = JSON.parse(localStorage.getItem(`goblox_settings_${user.id}`) || '{}');
        if (s.theme === 'light') document.body.classList.add('light-theme');
    }
})();

// ── CSS lazy loader ─────────────────────────────────────────────────
const cssLoaded = new Set();
function loadCSS(...paths) {
    return Promise.all(paths.map(href => {
        if (cssLoaded.has(href)) return Promise.resolve();
        cssLoaded.add(href);
        return new Promise(resolve => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = resolve;
            document.head.appendChild(link);
        });
    }));
}

// ── Loading spinner ─────────────────────────────────────────────────
function showLoading() {
    content.innerHTML = '<div class="page-loader"><div class="page-spinner"></div></div>';
}

// ── Page transition ─────────────────────────────────────────────────
function triggerPageTransition() {
    content.classList.remove('page-transition');
    void content.offsetWidth;
    content.classList.add('page-transition');
}

// ── Sidebar (lazy) ──────────────────────────────────────────────────
async function ensureSidebar() {
    if (!sidebarMod) {
        const [mod] = await Promise.all([
            import('./components/sidebar.js'),
            loadCSS('css/sidebar.css'),
        ]);
        sidebarMod = mod;
    }
    if (!sidebarRendered || !sidebar.querySelector('.sidebar-inner')) {
        sidebarMod.renderSidebar(sidebar, router);
        sidebarRendered = true;
    }
}

// ── Cleanup helpers ─────────────────────────────────────────────────
function cleanupGame() {
    if (mods.game?.renderGame?._cleanup) {
        mods.game.renderGame._cleanup();
        mods.game.renderGame._cleanup = null;
    }
}

function cleanupCreate() {
    if (mods.create?.renderCreate?._cleanup) {
        mods.create.renderCreate._cleanup();
        mods.create.renderCreate._cleanup = null;
    }
}

function cleanupAvatars() {
    mods.home?.renderHome?._cleanup?.();
    mods.profile?.renderProfile?._cleanup?.();
    mods.avatar?.cleanupPageAvatars?.();
}

function cleanupAll() {
    cleanupGame();
    cleanupCreate();
    cleanupAvatars();
}

// ── Catalog (lazy) ──────────────────────────────────────────────────
let catalogPromise = null;
function ensureCatalog() {
    if (!catalogPromise) {
        catalogPromise = import('./games/loader.js').then(m => m.initCatalog());
    }
    return catalogPromise;
}

// ── Stale navigation guard ──────────────────────────────────────────
function isStale(id) { return id !== navId; }

// ── Auth guard with lazy loading ────────────────────────────────────
function requireAuth(renderFn) {
    return async (...args) => {
        if (!Auth.currentUser()) {
            router.navigate('#/login');
            return;
        }
        const thisNav = ++navId;
        sidebar.classList.remove('hidden');
        content.style.padding = '2rem';
        showLoading();
        await ensureSidebar();
        if (isStale(thisNav)) return;
        sidebarMod.updateSidebarActive();
        triggerPageTransition();
        await renderFn(thisNav, ...args);
    };
}

// ── 404 page ────────────────────────────────────────────────────────
function render404() {
    content.innerHTML = `
        <div class="not-found-page animate-fade-in" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;">
            <div style="font-size:5rem;font-weight:900;color:var(--accent-primary);line-height:1;">404</div>
            <h2 style="margin-top:1rem;font-size:1.5rem;">Seite nicht gefunden</h2>
            <p class="text-secondary" style="margin-top:0.5rem;max-width:400px;">Die Seite existiert nicht oder wurde verschoben.</p>
            <a href="#/home" class="btn mt-3">Zurueck zur Startseite</a>
        </div>
    `;
}

// ── Route: Home ─────────────────────────────────────────────────────
async function renderHomePage(thisNav) {
    cleanupAll();
    const [mod] = await Promise.all([
        import('./pages/home.js'),
        loadCSS('css/home.css', 'css/store.css'),
        ensureCatalog(),
    ]);
    if (isStale(thisNav)) return;
    mods.home = mod;
    mod.renderHome(content, router);
}

// ── Routes ──────────────────────────────────────────────────────────
router
    .on('/login', async () => {
        const thisNav = ++navId;
        cleanupAll();
        if (Auth.currentUser()) { router.navigate('#/home'); return; }
        sidebar.classList.add('hidden');
        if (sidebarMod) { sidebarMod.cleanupSidebar(); }
        sidebarRendered = false;
        content.style.padding = '0';
        showLoading();
        const [mod] = await Promise.all([
            import('./pages/login.js'),
            loadCSS('css/login.css'),
        ]);
        if (isStale(thisNav)) return;
        triggerPageTransition();
        mod.renderLogin(content, router);
    })

    .on('/', requireAuth(renderHomePage))
    .on('/home', requireAuth(renderHomePage))

    .on('/games', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod] = await Promise.all([
            import('./pages/catalog.js'),
            loadCSS('css/catalog.css'),
            ensureCatalog(),
        ]);
        if (isStale(thisNav)) return;
        mod.renderCatalog(content, router);
    }))

    .on('/game', requireAuth(async (thisNav, ...params) => {
        cleanupCreate();
        cleanupAvatars();
        const [mod] = await Promise.all([
            import('./pages/game.js'),
            loadCSS('css/game.css', 'css/game-3d.css', 'css/mobile-controls.css', 'css/store.css'),
            ensureCatalog(),
        ]);
        if (isStale(thisNav)) return;
        mods.game = mod;
        mod.renderGame(content, router, ...params);
    }))

    .on('/profile', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod, avatarMod] = await Promise.all([
            import('./pages/profile.js'),
            import('./components/avatar.js'),
            loadCSS('css/profile.css'),
        ]);
        if (isStale(thisNav)) return;
        mods.profile = mod;
        mods.avatar = avatarMod;
        mod.renderProfile(content, router);
    }))

    .on('/friends', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod] = await Promise.all([
            import('./pages/friends.js'),
            loadCSS('css/friends.css'),
        ]);
        if (isStale(thisNav)) return;
        mod.renderFriends(content, router);
    }))

    .on('/leaderboard', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod] = await Promise.all([
            import('./pages/leaderboard.js'),
            loadCSS('css/leaderboard.css'),
        ]);
        if (isStale(thisNav)) return;
        mod.renderLeaderboard(content, router);
    }))

    .on('/store', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod] = await Promise.all([
            import('./pages/store.js'),
            loadCSS('css/store.css'),
        ]);
        if (isStale(thisNav)) return;
        mod.renderStore(content, router);
    }))

    .on('/settings', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod] = await Promise.all([
            import('./pages/settings.js'),
            loadCSS('css/settings.css'),
        ]);
        if (isStale(thisNav)) return;
        mod.renderSettings(content, router);
    }))

    .on('/admin', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod] = await Promise.all([
            import('./pages/admin.js'),
            loadCSS('css/admin.css'),
        ]);
        if (isStale(thisNav)) return;
        mod.renderAdmin(content, router);
    }))

    .on('/create', async (...params) => {
        if (!Auth.currentUser()) { router.navigate('#/login'); return; }
        const thisNav = ++navId;
        cleanupCreate();
        cleanupGame();
        cleanupAvatars();
        sidebar.classList.add('hidden');
        if (sidebarMod) { sidebarMod.cleanupSidebar(); }
        sidebarRendered = false;
        content.style.padding = '0';
        showLoading();
        const [mod] = await Promise.all([
            import('./pages/create.js'),
            loadCSS('css/create.css'),
        ]);
        if (isStale(thisNav)) return;
        mods.create = mod;
        mod.renderCreate(content, router, ...params);
    })

    .on('*', requireAuth(async (thisNav) => {
        cleanupAll();
        if (isStale(thisNav)) return;
        render404();
    }))

    .resolve();

export { router };
