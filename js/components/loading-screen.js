/* ===========================
   GoBlox - Game Loading Screen
   =========================== */

let screenEl = null;
let messageInterval = null;
let tipInterval = null;
let cssLoaded = false;

const MESSAGES = [
    'Spiel wird geladen...',
    'Welt wird aufgebaut...',
    'Spieler werden verbunden...',
    'Texturen werden geladen...',
    'Objekte werden platziert...',
    'Fast fertig...',
];

const TIPS = [
    'Tipp: Druecke ESC um das Spiel zu verlassen.',
    'Tipp: Du kannst Spiele zu deinen Favoriten hinzufuegen!',
    'Tipp: Besuche den Store fuer neue Items!',
    'Tipp: Lade Freunde ein um zusammen zu spielen!',
    'Tipp: Erstelle eigene Spiele im Editor!',
    'Tipp: Passe deinen Avatar im Profil an!',
];

function ensureCSS() {
    if (cssLoaded) return Promise.resolve();
    cssLoaded = true;
    return new Promise(resolve => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/loading-screen.css';
        link.onload = resolve;
        link.onerror = resolve;
        document.head.appendChild(link);
    });
}

function createDots(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += '<div class="ls-dot"></div>';
    }
    return html;
}

/**
 * Show the loading screen for a game.
 * @param {string} gameTitle - Name of the game
 * @param {{ bg?: string, icon?: string }} [gameColors] - Optional colors/icon
 * @returns {Promise<void>}
 */
export async function showLoadingScreen(gameTitle, gameColors = {}) {
    await ensureCSS();

    // Remove existing if any
    hideLoadingScreen(true);

    const bg = gameColors.bg || '#1a1a2e';
    const icon = gameColors.icon || '\u{1F3AE}';

    screenEl = document.createElement('div');
    screenEl.className = 'goblox-loading-screen';
    screenEl.innerHTML = `
        <div class="ls-particles">${createDots(15)}</div>
        <div class="ls-content">
            <div class="ls-game-info">
                <div class="ls-game-thumb" style="background:${bg}">${icon}</div>
                <div class="ls-game-title">${escapeHtml(gameTitle)}</div>
            </div>
            <div class="ls-logo">
                <div class="ls-logo-block">G</div>
                <div class="ls-logo-text">GoBlox</div>
            </div>
            <div class="ls-progress-wrap">
                <div class="ls-progress-bar">
                    <div class="ls-progress-fill" id="ls-progress-fill"></div>
                </div>
                <div class="ls-progress-text">
                    <span class="ls-message">${MESSAGES[0]}</span>
                    <span class="ls-percent">0%</span>
                </div>
            </div>
        </div>
        <div class="ls-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div>
    `;

    document.body.appendChild(screenEl);

    // Cycle loading messages
    let msgIndex = 0;
    messageInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % MESSAGES.length;
        const msgEl = screenEl?.querySelector('.ls-message');
        if (msgEl) {
            msgEl.style.animation = 'none';
            void msgEl.offsetWidth;
            msgEl.style.animation = '';
            msgEl.textContent = MESSAGES[msgIndex];
        }
    }, 2500);

    // Cycle tips
    tipInterval = setInterval(() => {
        const tipEl = screenEl?.querySelector('.ls-tip');
        if (tipEl) {
            tipEl.style.animation = 'none';
            void tipEl.offsetWidth;
            tipEl.style.animation = '';
            tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
        }
    }, 5000);
}

/**
 * Update the progress bar.
 * @param {number} percent - 0 to 100
 */
export function updateProgress(percent) {
    if (!screenEl) return;
    const clamped = Math.min(100, Math.max(0, percent));
    const fill = screenEl.querySelector('#ls-progress-fill');
    const pctText = screenEl.querySelector('.ls-percent');
    if (fill) fill.style.width = clamped + '%';
    if (pctText) pctText.textContent = Math.round(clamped) + '%';
}

/**
 * Hide and remove the loading screen.
 * @param {boolean} [instant=false] - Skip fade animation
 */
export function hideLoadingScreen(instant = false) {
    if (messageInterval) { clearInterval(messageInterval); messageInterval = null; }
    if (tipInterval) { clearInterval(tipInterval); tipInterval = null; }

    if (!screenEl) return;

    if (instant) {
        screenEl.remove();
        screenEl = null;
        return;
    }

    screenEl.classList.add('ls-hiding');
    const el = screenEl;
    screenEl = null;
    setTimeout(() => el.remove(), 450);
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
