import { Router } from './router.js';
import { Auth } from './auth.js';
import { initTooltips } from './components/tooltip.js';

const router = new Router();
const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const topbar = document.getElementById('topbar');

let sidebarRendered = false;
let topbarRendered = false;
let sidebarMod = null;
let chatMod = null;
let chatInitialized = false;
let navId = 0;

// Loaded module references for cleanup
const mods = {};

// ── Initialize global systems ───────────────────────────────────────
initTooltips();

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

// ── Sidebar + Topbar (lazy) ─────────────────────────────────────────
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
    // Always re-render topbar (updates title, GoBux, etc.)
    if (topbar) {
        topbar.classList.remove('hidden');
        sidebarMod.renderTopbar(topbar, router);
        topbarRendered = true;
    }
}

// ── Chat (lazy) ────────────────────────────────────────────────────
async function ensureChat() {
    if (!chatMod) {
        const [mod] = await Promise.all([
            import('./components/chat.js'),
            loadCSS('css/chat.css'),
        ]);
        chatMod = mod;
    }
    if (!chatInitialized) {
        chatMod.initChat();
        chatInitialized = true;
    }
}

function destroyChatWidget() {
    if (chatMod) {
        chatMod.destroyChat();
        chatInitialized = false;
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

function cleanupAvatarEditor() {
    if (mods.avatarPage?.renderAvatar?._cleanup) {
        mods.avatarPage.renderAvatar._cleanup();
        mods.avatarPage.renderAvatar._cleanup = null;
    }
}

function cleanupAvatars() {
    mods.home?.renderHome?._cleanup?.();
    mods.profile?.renderProfile?._cleanup?.();
    mods.avatar?.cleanupPageAvatars?.();
    cleanupAvatarEditor();
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
        content.style.marginTop = '';
        content.style.marginLeft = '';
        showLoading();
        await ensureSidebar();
        ensureChat();
        if (isStale(thisNav)) return;
        sidebarMod.updateSidebarActive();
        triggerPageTransition();
        await renderFn(thisNav, ...args);
    };
}

// ── 404 page (enhanced) ─────────────────────────────────────────────
async function render404() {
    const [mod] = await Promise.all([
        import('./pages/not-found.js'),
        loadCSS('css/not-found.css'),
    ]);
    mod.renderNotFound(content);
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
        if (topbar) topbar.classList.add('hidden');
        if (sidebarMod) { sidebarMod.cleanupSidebar(); }
        destroyChatWidget();
        sidebarRendered = false;
        topbarRendered = false;
        content.style.padding = '0';
        content.style.marginTop = '0';
        content.style.marginLeft = '0';
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

    .on('/avatar', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod] = await Promise.all([
            import('./pages/avatar.js'),
            loadCSS('css/avatar.css'),
        ]);
        if (isStale(thisNav)) return;
        mods.avatarPage = mod;
        mod.renderAvatar(content, router);
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

    .on('/groups', requireAuth(async (thisNav) => {
        cleanupAll();
        const [mod] = await Promise.all([
            import('./pages/groups.js'),
            loadCSS('css/groups.css'),
        ]);
        if (isStale(thisNav)) return;
        mod.renderGroups(content, router);
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
        if (topbar) topbar.classList.add('hidden');
        if (sidebarMod) { sidebarMod.cleanupSidebar(); }
        sidebarRendered = false;
        topbarRendered = false;
        content.style.padding = '0';
        content.style.marginTop = '0';
        content.style.marginLeft = '0';
        ensureChat();
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
