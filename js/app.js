import { Router } from './router.js';
import { Auth } from './auth.js';
import { renderLogin } from './pages/login.js';
import { renderSidebar, updateSidebarActive } from './components/sidebar.js';
import { GameRegistry } from './games/loader.js';
import { renderCatalog } from './pages/catalog.js';
import { renderGame } from './pages/game.js';

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

function showHome() {
    const user = Auth.currentUser();
    const totalGames = GameRegistry.getAllGames().length;
    content.innerHTML = `
        <div class="animate-fade-in">
            <h1>Willkommen, <span class="text-gradient">${user.name}</span>!</h1>
            <p class="text-secondary mt-2">Entdecke ${totalGames.toLocaleString('de-DE')} Spiele und spiele direkt los.</p>
            <div class="mt-4">
                <a href="#/games" class="btn btn-lg">Spiele entdecken</a>
            </div>
            ${user.gamesPlayed ? `
                <div class="mt-4" style="display:flex;gap:2rem;flex-wrap:wrap;">
                    <div class="card" style="min-width:160px;">
                        <div class="text-secondary" style="font-size:0.85rem;">Gespielt</div>
                        <div style="font-size:1.8rem;font-weight:800;">${user.gamesPlayed}</div>
                    </div>
                    <div class="card" style="min-width:160px;">
                        <div class="text-secondary" style="font-size:0.85rem;">Gesamtpunkte</div>
                        <div style="font-size:1.8rem;font-weight:800;">${(user.totalScore || 0).toLocaleString('de-DE')}</div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function showPlaceholder(title) {
    return () => {
        content.innerHTML = `
            <div class="animate-fade-in">
                <h1>${title}</h1>
                <p class="text-secondary mt-2">Diese Seite wird bald erstellt.</p>
            </div>
        `;
    };
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
        showHome();
    }))
    .on('/home', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        showHome();
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
        showPlaceholder('Profil')();
    }))
    .on('/friends', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        showPlaceholder('Freunde')();
    }))
    .on('/leaderboard', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        showPlaceholder('Rangliste')();
    }))
    .on('/settings', requireAuth(() => {
        cleanupGame();
        content.style.padding = '2rem';
        showPlaceholder('Einstellungen')();
    }))
    .resolve();

export { router };
