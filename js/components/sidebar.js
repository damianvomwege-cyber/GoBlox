import { Auth } from '../auth.js';
import { drawAvatar } from './avatar.js';

/* ===========================
   SVG Icons (20x20, stroke-based)
   =========================== */
const ICONS = {
    home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <polyline points="9 21 9 14 15 14 15 21"/>
    </svg>`,

    games: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="3"/>
        <line x1="8" y1="10" x2="8" y2="14"/>
        <line x1="6" y1="12" x2="10" y2="12"/>
        <circle cx="16" cy="10" r="0.5" fill="currentColor"/>
        <circle cx="18" cy="12" r="0.5" fill="currentColor"/>
    </svg>`,

    profile: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
    </svg>`,

    friends: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="8" r="3.5"/>
        <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>
        <circle cx="17.5" cy="8" r="2.5"/>
        <path d="M18 15h1.5a4 4 0 0 1 4 4v2"/>
    </svg>`,

    leaderboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9H3V5a1 1 0 0 1 1-1h2"/>
        <path d="M18 9h3V5a1 1 0 0 0-1-1h-2"/>
        <path d="M6 9a6 6 0 0 0 12 0V3H6v6z"/>
        <path d="M12 15v3"/>
        <path d="M8 21h8"/>
        <path d="M8 18h8"/>
    </svg>`,

    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>`,

    logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>`
};

/* ===========================
   Navigation Items
   =========================== */
const NAV_ITEMS = [
    { label: 'Home',          icon: ICONS.home,        href: '#/home' },
    { label: 'Spiele',        icon: ICONS.games,       href: '#/games' },
    { label: 'Profil',        icon: ICONS.profile,     href: '#/profile' },
    { label: 'Freunde',       icon: ICONS.friends,     href: '#/friends' },
    { label: 'Rangliste',     icon: ICONS.leaderboard, href: '#/leaderboard' },
    { label: 'Einstellungen', icon: ICONS.settings,    href: '#/settings' },
];

/* ===========================
   Draw Mini Avatar on Canvas
   Uses the shared avatar component
   =========================== */
function drawMiniAvatar(canvas) {
    const user = Auth.currentUser();
    if (!user) return;

    const ctx = canvas.getContext('2d');
    const size = 40;
    canvas.width = size;
    canvas.height = size;

    const avatar = user.avatar || { skin: '#ffb347', shirt: '#6c63ff', pants: '#333', hair: 0, accessory: 0 };

    // Background circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(108, 99, 255, 0.2)';
    ctx.fill();

    // Draw the avatar using the shared component
    drawAvatar(ctx, avatar, size / 2, 3, 22);
}

/* ===========================
   Render Sidebar
   =========================== */
export function renderSidebar(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    const currentHash = window.location.hash || '#/home';

    const navItemsHTML = NAV_ITEMS.map(item => {
        const isActive = currentHash === item.href || currentHash.startsWith(item.href + '/');
        return `
            <a href="${item.href}" class="sidebar-nav-item${isActive ? ' active' : ''}" data-route="${item.href}">
                <span class="sidebar-nav-icon">${item.icon}</span>
                <span class="sidebar-nav-label">${item.label}</span>
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <div class="sidebar-inner">
            <!-- Logo -->
            <a href="#/home" class="sidebar-logo">
                <span class="sidebar-logo-text">GoBlox</span>
            </a>

            <!-- User Info -->
            <div class="sidebar-user">
                <canvas class="sidebar-avatar" width="40" height="40"></canvas>
                <span class="sidebar-username">${user.name}</span>
            </div>

            <!-- Divider -->
            <div class="sidebar-divider"></div>

            <!-- Navigation -->
            <nav class="sidebar-nav">
                ${navItemsHTML}
            </nav>

            <!-- Spacer -->
            <div class="sidebar-spacer"></div>

            <!-- Logout -->
            <button class="sidebar-logout" id="sidebar-logout-btn">
                <span class="sidebar-nav-icon">${ICONS.logout}</span>
                <span class="sidebar-nav-label">Abmelden</span>
            </button>
        </div>
    `;

    // Draw the mini avatar
    const avatarCanvas = container.querySelector('.sidebar-avatar');
    if (avatarCanvas) {
        drawMiniAvatar(avatarCanvas);
    }

    // Logout handler
    const logoutBtn = container.querySelector('#sidebar-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            Auth.logout();
            router.navigate('#/login');
        });
    }
}

/* ===========================
   Update Active Nav Item
   =========================== */
export function updateSidebarActive() {
    const currentHash = window.location.hash || '#/home';
    const navItems = document.querySelectorAll('.sidebar-nav-item');

    navItems.forEach(item => {
        const route = item.dataset.route;
        // Match exact route, sub-routes, and also #/game → #/games
        const isActive = route === currentHash
            || currentHash.startsWith(route + '/')
            || (route === '#/games' && currentHash.startsWith('#/game/'));
        if (isActive) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}
