import { Auth } from '../auth.js';
import { GoBux, GOBUX_ICON } from '../gobux.js';

/* ===========================
   SVG Icons (Roblox-style, 24x24)
   =========================== */
const ICONS = {
    home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <polyline points="9 21 9 14 15 14 15 21"/>
    </svg>`,

    discover: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>`,

    create: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>`,

    avatar: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
    </svg>`,

    shop: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>`,

    settings: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`,

    logout: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>`,

    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`,

    bell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>`,

    chevronDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
    </svg>`,
};

/* ===========================
   Navigation Items
   =========================== */
const NAV_ITEMS = [
    { label: 'Home',       icon: ICONS.home,     href: '#/home' },
    { label: 'Entdecken',  icon: ICONS.discover,  href: '#/games' },
    { label: 'Erstellen',  icon: ICONS.create,    href: '#/create' },
    { label: 'Avatar',     icon: ICONS.avatar,    href: '#/avatar' },
    { label: 'Shop',       icon: ICONS.shop,      href: '#/store' },
];

/* ===========================
   Page title mapping
   =========================== */
const PAGE_TITLES = {
    '#/home':        'Home',
    '#/games':       'Entdecken',
    '#/create':      'Erstellen',
    '#/avatar':      'Avatar',
    '#/store':       'Shop',
    '#/profile':     'Profil',
    '#/friends':     'Freunde',
    '#/leaderboard': 'Rangliste',
    '#/settings':    'Einstellungen',
    '#/admin':       'Admin',
};

/* ===========================
   State
   =========================== */
let topbarDropdownOpen = false;
let topbarCleanupFn = null;

/* ===========================
   Get initial for avatar circle
   =========================== */
function getUserInitial(user) {
    return user?.name ? user.name.charAt(0).toUpperCase() : '?';
}

/* ===========================
   Get avatar color from user
   =========================== */
function getAvatarColor(user) {
    return user?.avatar?.skin || '#00b06f';
}

/* ===========================
   Get page title from hash
   =========================== */
function getPageTitle() {
    const hash = window.location.hash || '#/home';
    // Handle #/game/... paths
    if (hash.startsWith('#/game/')) return 'Spiel';
    // Match exact or first segment
    const base = '#/' + (hash.split('/')[1] || 'home');
    return PAGE_TITLES[base] || 'GoBlox';
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
            <a href="${item.href}" class="sidebar-nav-item${isActive ? ' active' : ''}" data-route="${item.href}" title="${item.label}">
                <span class="sidebar-nav-icon">${item.icon}</span>
                <span class="sidebar-nav-label">${item.label}</span>
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <div class="sidebar-inner">
            <!-- Logo -->
            <a href="#/home" class="sidebar-logo">
                <div class="sidebar-logo-icon">G</div>
            </a>

            <!-- Navigation -->
            <nav class="sidebar-nav">
                ${navItemsHTML}
            </nav>

            <!-- Spacer -->
            <div class="sidebar-spacer"></div>

            <!-- Bottom actions -->
            <div class="sidebar-bottom">
                <a href="#/settings" class="sidebar-nav-item sidebar-bottom-item${currentHash === '#/settings' ? ' active' : ''}" data-route="#/settings" title="Einstellungen">
                    <span class="sidebar-nav-icon">${ICONS.settings}</span>
                    <span class="sidebar-nav-label">Settings</span>
                </a>
                <button class="sidebar-nav-item sidebar-bottom-item sidebar-logout-btn" id="sidebar-logout-btn" title="Logout">
                    <span class="sidebar-nav-icon">${ICONS.logout}</span>
                    <span class="sidebar-nav-label">Logout</span>
                </button>
            </div>
        </div>
    `;

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
   Render Topbar
   =========================== */
export function renderTopbar(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    // Cleanup previous
    cleanupTopbar();

    const balance = GoBux.getBalance(user.id).toLocaleString('de-DE');
    const initial = getUserInitial(user);
    const avatarColor = getAvatarColor(user);
    const pageTitle = getPageTitle();

    container.innerHTML = `
        <div class="topbar-inner">
            <!-- Left: Page title -->
            <div class="topbar-left">
                <h1 class="topbar-title">${pageTitle}</h1>
            </div>

            <!-- Center: Search -->
            <div class="topbar-center">
                <div class="topbar-search">
                    <span class="topbar-search-icon">${ICONS.search}</span>
                    <input type="text" class="topbar-search-input" placeholder="Spiele suchen..." id="topbar-search-input" />
                </div>
            </div>

            <!-- Right: GoBux, Notifications, User -->
            <div class="topbar-right">
                <!-- GoBux -->
                <a href="#/store" class="topbar-gobux" title="GoBux">
                    ${GOBUX_ICON}
                    <span class="topbar-gobux-amount">${balance}</span>
                </a>

                <!-- Notifications -->
                <button class="topbar-icon-btn topbar-bell" title="Benachrichtigungen">
                    ${ICONS.bell}
                    <span class="topbar-badge">3</span>
                </button>

                <!-- User dropdown -->
                <div class="topbar-user" id="topbar-user-trigger">
                    <div class="topbar-avatar" style="background-color: ${avatarColor};">
                        ${initial}
                    </div>
                    <span class="topbar-username">${user.name}</span>
                    <span class="topbar-chevron">${ICONS.chevronDown}</span>
                </div>

                <!-- Dropdown menu -->
                <div class="topbar-dropdown" id="topbar-dropdown">
                    <a href="#/profile" class="topbar-dropdown-item">
                        ${ICONS.avatar}
                        <span>Profil</span>
                    </a>
                    <a href="#/friends" class="topbar-dropdown-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="9" cy="8" r="3.5"/>
                            <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>
                            <circle cx="17.5" cy="8" r="2.5"/>
                            <path d="M18 15h1.5a4 4 0 0 1 4 4v2"/>
                        </svg>
                        <span>Freunde</span>
                    </a>
                    <a href="#/leaderboard" class="topbar-dropdown-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 9H3V5a1 1 0 0 1 1-1h2"/>
                            <path d="M18 9h3V5a1 1 0 0 0-1-1h-2"/>
                            <path d="M6 9a6 6 0 0 0 12 0V3H6v6z"/>
                            <path d="M12 15v3"/>
                            <path d="M8 21h8"/>
                            <path d="M8 18h8"/>
                        </svg>
                        <span>Rangliste</span>
                    </a>
                    <div class="topbar-dropdown-divider"></div>
                    <a href="#/settings" class="topbar-dropdown-item">
                        ${ICONS.settings}
                        <span>Einstellungen</span>
                    </a>
                    <button class="topbar-dropdown-item topbar-dropdown-logout" id="topbar-logout-btn">
                        ${ICONS.logout}
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // --- Event listeners ---
    const userTrigger = container.querySelector('#topbar-user-trigger');
    const dropdown = container.querySelector('#topbar-dropdown');
    const logoutBtn = container.querySelector('#topbar-logout-btn');
    const searchInput = container.querySelector('#topbar-search-input');

    // Toggle dropdown
    function toggleDropdown(e) {
        e.stopPropagation();
        topbarDropdownOpen = !topbarDropdownOpen;
        dropdown.classList.toggle('open', topbarDropdownOpen);
    }

    // Close dropdown on outside click
    function closeDropdown(e) {
        if (topbarDropdownOpen && !dropdown.contains(e.target) && !userTrigger.contains(e.target)) {
            topbarDropdownOpen = false;
            dropdown.classList.remove('open');
        }
    }

    // Search on Enter
    function handleSearch(e) {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                router.navigate('#/games');
                // Dispatch a custom event so the catalog can pick it up
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('goblox-search', { detail: { query } }));
                }, 100);
            }
        }
    }

    userTrigger.addEventListener('click', toggleDropdown);
    document.addEventListener('click', closeDropdown);
    searchInput.addEventListener('keydown', handleSearch);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            topbarDropdownOpen = false;
            Auth.logout();
            router.navigate('#/login');
        });
    }

    // Store cleanup reference
    topbarCleanupFn = () => {
        userTrigger.removeEventListener('click', toggleDropdown);
        document.removeEventListener('click', closeDropdown);
        searchInput.removeEventListener('keydown', handleSearch);
    };
}

/* ===========================
   Update Active Nav Item
   =========================== */
export function updateSidebarActive() {
    const currentHash = window.location.hash || '#/home';
    const navItems = document.querySelectorAll('.sidebar-nav-item');

    navItems.forEach(item => {
        const route = item.dataset.route;
        if (!route) return;
        const isActive = route === currentHash
            || currentHash.startsWith(route + '/')
            || (route === '#/games' && currentHash.startsWith('#/game/'));
        item.classList.toggle('active', isActive);
    });

    // Update topbar title
    const titleEl = document.querySelector('.topbar-title');
    if (titleEl) {
        titleEl.textContent = getPageTitle();
    }

    // Update topbar GoBux
    const user = Auth.currentUser();
    if (user) {
        const amountEl = document.querySelector('.topbar-gobux-amount');
        if (amountEl) {
            amountEl.textContent = GoBux.getBalance(user.id).toLocaleString('de-DE');
        }
    }
}

/* ===========================
   Cleanup
   =========================== */
function cleanupTopbar() {
    if (topbarCleanupFn) {
        topbarCleanupFn();
        topbarCleanupFn = null;
    }
    topbarDropdownOpen = false;
}

export function cleanupSidebar() {
    cleanupTopbar();
}
