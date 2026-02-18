/* ===========================
   GoBlox - 404 Not Found Page
   =========================== */

const FUN_MESSAGES = [
    'Ups! Da ist wohl ein Block verloren gegangen.',
    'Hier gibt es nichts zu sehen...',
    'Dieser Ort existiert nur in deiner Fantasie!',
    'Selbst unser bester Sucher konnte diese Seite nicht finden.',
    'Ein Block zu weit gesprungen!',
    'Diese Welt wurde noch nicht gebaut.',
    'Error 404: Block nicht gefunden!',
    'Jemand hat vergessen, diesen Raum zu bauen.',
];

export function renderNotFound(container) {
    const funMsg = FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)];

    container.innerHTML = `
        <div class="not-found-page">
            <div class="nf-blocks">
                <div class="nf-block"></div>
                <div class="nf-block"></div>
                <div class="nf-block"></div>
                <div class="nf-block"></div>
                <div class="nf-block"></div>
            </div>

            <div class="nf-numbers">
                <span class="nf-num">4</span>
                <span class="nf-num">0</span>
                <span class="nf-num">4</span>
            </div>

            <div class="nf-face">
                <div class="nf-eye nf-eye-left"></div>
                <div class="nf-eye nf-eye-right"></div>
                <div class="nf-mouth"></div>
                <div class="nf-tear"></div>
            </div>

            <div class="nf-title">Diese Seite existiert nicht</div>
            <div class="nf-subtitle">Die Seite, die du suchst, wurde verschoben oder existiert nicht mehr.</div>
            <div class="nf-fun-message">${funMsg}</div>

            <a href="#/home" class="nf-back-btn">
                <span>\u2190</span>
                Zurueck zur Startseite
            </a>
        </div>
    `;
}
