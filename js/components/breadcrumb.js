/* ===========================
   GoBlox - Breadcrumb Navigation
   =========================== */

let cssLoaded = false;

function ensureCSS() {
    if (cssLoaded) return;
    cssLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/breadcrumb.css';
    document.head.appendChild(link);
}

/**
 * Render a breadcrumb navigation into the given content container.
 * Prepends the breadcrumb before existing content.
 *
 * @param {Array<{label: string, href?: string}>} segments - Breadcrumb path segments
 * @param {HTMLElement} [container] - Container to prepend into (defaults to #content)
 */
export function updateBreadcrumb(segments, container) {
    ensureCSS();

    const target = container || document.getElementById('content');
    if (!target) return;

    // Remove existing breadcrumb
    const existing = target.querySelector('.goblox-breadcrumb');
    if (existing) existing.remove();

    if (!segments || segments.length === 0) return;

    const nav = document.createElement('nav');
    nav.className = 'goblox-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');

    // Home icon
    const homeSegment = document.createElement('a');
    homeSegment.className = 'breadcrumb-segment';
    homeSegment.href = '#/home';
    homeSegment.innerHTML = '<span class="breadcrumb-home-icon">\u{1F3E0}</span>';
    homeSegment.setAttribute('data-tooltip', 'Startseite');
    nav.appendChild(homeSegment);

    segments.forEach((seg, i) => {
        // Separator
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-separator';
        sep.textContent = '\u203A'; // ›
        nav.appendChild(sep);

        const isLast = i === segments.length - 1;

        if (isLast) {
            const span = document.createElement('span');
            span.className = 'breadcrumb-segment breadcrumb-current';
            span.textContent = seg.label;
            nav.appendChild(span);
        } else {
            const a = document.createElement('a');
            a.className = 'breadcrumb-segment';
            a.href = seg.href || '#/home';
            a.textContent = seg.label;
            nav.appendChild(a);
        }
    });

    target.prepend(nav);
}

/**
 * Build breadcrumb segments from the current route hash.
 * @returns {Array<{label: string, href: string}>}
 */
export function breadcrumbFromRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);

    const LABELS = {
        home:        'Startseite',
        games:       'Entdecken',
        game:        'Spiel',
        avatar:      'Avatar',
        profile:     'Profil',
        friends:     'Freunde',
        leaderboard: 'Bestenliste',
        store:       'Store',
        settings:    'Einstellungen',
        create:      'Erstellen',
        admin:       'Admin',
    };

    const segments = [];
    let path = '#';

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        path += '/' + part;
        const label = LABELS[part] || decodeURIComponent(part);
        segments.push({ label, href: path });
    }

    return segments;
}
