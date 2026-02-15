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
        renderFn(...args);
    };
}

function cleanupGame() {
    if (renderGame._cleanup) {
        renderGame._cleanup();
        renderGame._cleanup = null;
    }
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
    .resolve();

export { router };
