import { Router } from './router.js';
import { Auth } from './auth.js';
import { renderLogin } from './pages/login.js';
import { renderSidebar, updateSidebarActive } from './components/sidebar.js';
import { GameRegistry } from './games/loader.js';
import { renderCatalog } from './pages/catalog.js';
import { renderGame } from './pages/game.js';
import { renderHome } from './pages/home.js';
import { renderProfile } from './pages/profile.js';
import { renderFriends } from './pages/friends.js';
import { renderLeaderboard } from './pages/leaderboard.js';
import { renderSettings } from './pages/settings.js';

const router = new Router();
const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');

let sidebarRendered = false;

// ── Restore saved theme on app start ─────────────────────────────────
(function restoreTheme() {
    const user = Auth.currentUser();
    if (user) {
        const settings = JSON.parse(localStorage.getItem(`goblox_settings_${user.id}`) || '{}');
        if (settings.theme === 'light') {
            document.body.classList.add('light-theme');
        }
    }
})();

// ── Page transition helper ───────────────────────────────────────────
function triggerPageTransition() {
    content.classList.remove('page-transition');
    // Force reflow so the browser restarts the animation
    void content.offsetWidth;
    content.classList.add('page-transition');
}

function ensureSidebar() {
    if (!sidebarRendered || !sidebar.querySelector('.sidebar-inner')) {
        renderSidebar(sidebar, router);
        sidebarRendered = true;
    }
}

function requireAuth(renderFn) {
    return (...args) => {
        if (!Auth.currentUser()) {
            router.navigate('#/login');
            return;
        }
        sidebar.classList.remove('hidden');
        ensureSidebar();
        updateSidebarActive();
        triggerPageTransition();
        renderFn(...args);
    };
}

function cleanupGame() {
    if (renderGame._cleanup) {
        renderGame._cleanup();
        renderGame._cleanup = null;
    }
}

// ── 404 Page ─────────────────────────────────────────────────────────
function render404(container) {
    container.innerHTML = `
        <div class="not-found-page animate-fade-in" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;">
            <div style="font-size:5rem;font-weight:900;background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;">404</div>
            <h2 style="margin-top:1rem;font-size:1.5rem;">Seite nicht gefunden</h2>
            <p class="text-secondary" style="margin-top:0.5rem;max-width:400px;">
                Die Seite, die du suchst, existiert nicht oder wurde verschoben.
            </p>
            <a href="#/home" class="btn mt-3">Zurueck zur Startseite</a>
        </div>
    `;
}

router
    .on('/login', () => {
        cleanupGame();
        if (Auth.currentUser()) {
            router.navigate('#/home');
            return;
        }
        sidebar.classList.add('hidden');
        sidebarRendered = false;
        content.style.padding = '0';
        triggerPageTransition();
        renderLogin(content, router);
    })
    .on('/', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        renderHome(content, router);
    }))
    .on('/home', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        renderHome(content, router);
    }))
    .on('/games', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        renderCatalog(content, router);
    }))
    .on('/game', requireAuth((...params) => {
        content.style.padding = '2rem';
        renderGame(content, router, ...params);
    }))
    .on('/profile', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        renderProfile(content, router);
    }))
    .on('/friends', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        renderFriends(content, router);
    }))
    .on('/leaderboard', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        renderLeaderboard(content, router);
    }))
    .on('/settings', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        renderSettings(content, router);
    }))
    .on('*', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        render404(content);
    }))
    .resolve();

export { router };
