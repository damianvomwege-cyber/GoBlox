import { Router } from './router.js';
import { Auth } from './auth.js';
import { renderLogin } from './pages/login.js';

const router = new Router();
const content = document.getElementById('content');
const sidebar = document.getElementById('sidebar');

function requireAuth(renderFn) {
    return (...args) => {
        if (!Auth.currentUser()) {
            router.navigate('#/login');
            return;
        }
        sidebar.classList.remove('hidden');
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

router
    .on('/login', () => {
        if (Auth.currentUser()) {
            router.navigate('#/home');
            return;
        }
        sidebar.classList.add('hidden');
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
    .resolve();

export { router };
