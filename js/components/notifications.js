/* ===========================
   GoBlox - Toast Notification System
   =========================== */

let container = null;
let cssLoaded = false;
const DISMISS_TIME = 4000;

const ICONS = {
    success: '\u2713',
    error:   '\u2717',
    info:    'i',
    warning: '!',
};

const TITLES = {
    success: 'Erfolg',
    error:   'Fehler',
    info:    'Info',
    warning: 'Warnung',
};

function ensureCSS() {
    if (cssLoaded) return Promise.resolve();
    cssLoaded = true;
    return new Promise(resolve => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/notifications.css';
        link.onload = resolve;
        link.onerror = resolve;
        document.head.appendChild(link);
    });
}

function ensureContainer() {
    if (container && document.body.contains(container)) return;
    container = document.createElement('div');
    container.className = 'goblox-toast-container';
    document.body.appendChild(container);
}

function dismissToast(el) {
    if (el._dismissed) return;
    el._dismissed = true;
    el.classList.add('toast-hiding');
    setTimeout(() => el.remove(), 320);
}

function createToast(html, extraClass, duration = DISMISS_TIME) {
    ensureContainer();

    const toast = document.createElement('div');
    toast.className = `goblox-toast ${extraClass}`;
    toast.innerHTML = html + `
        <button class="toast-close" aria-label="Schliessen">\u2715</button>
        <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;

    toast.querySelector('.toast-close').addEventListener('click', (e) => {
        e.stopPropagation();
        dismissToast(toast);
    });
    toast.addEventListener('click', () => dismissToast(toast));

    // Limit to 5 toasts
    const toasts = container.querySelectorAll('.goblox-toast');
    if (toasts.length >= 5) {
        dismissToast(toasts[0]);
    }

    container.appendChild(toast);

    // Auto-dismiss
    toast._timeout = setTimeout(() => dismissToast(toast), duration);

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
        clearTimeout(toast._timeout);
        const prog = toast.querySelector('.toast-progress');
        if (prog) prog.style.animationPlayState = 'paused';
    });
    toast.addEventListener('mouseleave', () => {
        const prog = toast.querySelector('.toast-progress');
        if (prog) prog.style.animationPlayState = 'running';
        toast._timeout = setTimeout(() => dismissToast(toast), 2000);
    });

    return toast;
}

/**
 * Show a toast notification.
 * @param {string} message - The message to display
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - Notification type
 */
export async function notify(message, type = 'info') {
    await ensureCSS();
    const icon = ICONS[type] || ICONS.info;
    const title = TITLES[type] || TITLES.info;
    createToast(`
        <div class="toast-icon">${icon}</div>
        <div class="toast-body">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
    `, `toast-${type}`);
}

/**
 * Show a GoBux earned notification.
 * @param {number} amount - GoBux amount
 */
export async function notifyGoBux(amount) {
    await ensureCSS();
    const sign = amount >= 0 ? '+' : '';
    createToast(`
        <div class="toast-icon">\u{1FA99}</div>
        <div class="toast-body">
            <div class="toast-title">GoBux erhalten!</div>
            <div class="toast-message">
                <span class="toast-gobux-amount">${sign}${amount} GoBux</span>
            </div>
        </div>
    `, 'toast-gobux', 5000);
}

/**
 * Show a friend notification.
 * @param {string} friendName - Friend's name
 * @param {'request'|'accepted'|'online'} [action='request'] - Action type
 */
export async function notifyFriend(friendName, action = 'request') {
    await ensureCSS();

    const messages = {
        request: 'moechte dein Freund sein!',
        accepted: 'hat deine Anfrage angenommen!',
        online: 'ist jetzt online!',
    };

    let actionsHtml = '';
    if (action === 'request') {
        actionsHtml = `
            <div class="toast-friend-actions">
                <button class="toast-friend-btn accept">Annehmen</button>
                <button class="toast-friend-btn decline">Ablehnen</button>
            </div>
        `;
    }

    const toast = createToast(`
        <div class="toast-icon">\u{1F464}</div>
        <div class="toast-body">
            <div class="toast-title">${escapeHtml(friendName)}</div>
            <div class="toast-message">${messages[action] || messages.request}</div>
            ${actionsHtml}
        </div>
    `, 'toast-friend', action === 'request' ? 8000 : 4000);

    // Bind friend action buttons
    if (action === 'request') {
        const acceptBtn = toast.querySelector('.toast-friend-btn.accept');
        const declineBtn = toast.querySelector('.toast-friend-btn.decline');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notify(`${friendName} ist jetzt dein Freund!`, 'success');
                dismissToast(toast);
            });
        }
        if (declineBtn) {
            declineBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dismissToast(toast);
            });
        }
    }
}

/**
 * Show an achievement notification.
 * @param {string} title - Achievement title
 */
export async function notifyAchievement(title) {
    await ensureCSS();

    // Generate random sparkle positions
    const sparkles = Array.from({ length: 6 }, () => {
        const sx = (Math.random() - 0.5) * 60;
        const sy = (Math.random() - 0.5) * 60;
        return `<div class="toast-sparkle" style="--sx:${sx}px;--sy:${sy}px"></div>`;
    }).join('');

    createToast(`
        <div class="toast-icon">\u{1F3C6}</div>
        <div class="toast-body">
            <div class="toast-title">Erfolg freigeschaltet!</div>
            <div class="toast-message">${escapeHtml(title)}</div>
        </div>
        <div class="toast-achievement-sparkles">${sparkles}</div>
    `, 'toast-achievement', 6000);
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
