import { Router } from './router.js';
import { Auth } from './auth.js';
import { renderLogin } from './pages/login.js';
import { renderSidebar, updateSidebarActive } from './components/sidebar.js';

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

function showHome() {
    const user = Auth.currentUser();
    content.innerHTML = `
        <div class="animate-fade-in">
            <h1>Willkommen, <span class="text-gradient">${user.name}</span>!</h1>
            <p class="text-secondary mt-2">Hier entsteht bald deine Startseite.</p>
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
        content.style.padding = '2rem';
        showHome();
    }))
    .on('/home', requireAuth(() => {
        content.style.padding = '2rem';
        showHome();
    }))
    .on('/games', requireAuth(() => {
        content.style.padding = '2rem';
        showPlaceholder('Spiele')();
    }))
    .on('/profile', requireAuth(() => {
        content.style.padding = '2rem';
        showPlaceholder('Profil')();
    }))
    .on('/friends', requireAuth(() => {
        content.style.padding = '2rem';
        showPlaceholder('Freunde')();
    }))
    .on('/leaderboard', requireAuth(() => {
        content.style.padding = '2rem';
        showPlaceholder('Rangliste')();
    }))
    .on('/settings', requireAuth(() => {
        content.style.padding = '2rem';
        showPlaceholder('Einstellungen')();
    }))
    .resolve();

export { router };
