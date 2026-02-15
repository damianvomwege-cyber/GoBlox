// js/pages/profile.js
import { Auth } from '../auth.js';
import { GameRegistry } from '../games/loader.js';
import { create3DAvatar, drawAvatar, registerPageAvatar } from '../components/avatar.js';

const SKIN_COLORS = ['#ffb347', '#f5d6ba', '#deb887', '#c68642', '#8d5524', '#4a2912', '#ffe0bd', '#f1c27d'];
const SHIRT_COLORS = ['#6c63ff', '#e94560', '#00cec9', '#55efc4', '#fdcb6e', '#fd79a8', '#636e72', '#ffffff'];
const PANTS_COLORS = ['#333333', '#1a1a2e', '#2d3436', '#6c5ce7', '#00b894', '#e17055', '#0984e3', '#b2bec3'];
const HAIR_STYLES = [0, 1, 2, 3, 4, 5];
const ACCESSORY_STYLES = [0, 1, 2, 3, 4, 5];
const HAIR_LABELS = ['Keine', 'Kurz', 'Lang', 'Mohawk', 'Lockig', 'Kappe'];
const ACCESSORY_LABELS = ['Keines', 'Hut', 'Brille', 'Stirnband', 'Krone', 'Maske'];

// Track the active 3D avatar for cleanup
let activeProfileAvatar = null;

export function renderProfile(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    // Dispose previous 3D avatar if it exists
    if (activeProfileAvatar) {
        try { activeProfileAvatar.dispose(); } catch (e) { /* ignore */ }
        activeProfileAvatar = null;
    }

    // Working copy of avatar config
    const avatarConfig = { ...(user.avatar || { skin: '#ffb347', shirt: '#6c63ff', pants: '#333333', hair: 0, accessory: 0 }) };

    // Build favorite games list
    const favGames = (user.favorites || [])
        .map(id => GameRegistry.getGame(id))
        .filter(Boolean);

    const memberSince = new Date(user.createdAt).toLocaleDateString('de-DE', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    container.innerHTML = `
        <div class="profile-page animate-fade-in">
            <h1>Profil</h1>
            <p class="text-secondary mb-3">Passe deinen Avatar an und sieh dir deine Statistiken an.</p>

            <div class="profile-editor">
                <!-- Left: Avatar Preview -->
                <div class="profile-preview-col">
                    <div class="profile-preview-card">
                        <div id="profile-avatar-3d" style="width:300px;height:400px;"></div>
                        <div class="profile-preview-name">${user.name}</div>
                    </div>
                </div>

                <!-- Right: Customization -->
                <div class="profile-customize-col">
                    <!-- Skin color -->
                    <div class="profile-section">
                        <h4 class="profile-section-title">Hautfarbe</h4>
                        <div class="profile-color-row" id="profile-skin-row">
                            ${SKIN_COLORS.map(c => `
                                <button class="profile-color-circle ${avatarConfig.skin === c ? 'selected' : ''}"
                                    data-type="skin" data-color="${c}" style="background:${c};" title="${c}"></button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Shirt color -->
                    <div class="profile-section">
                        <h4 class="profile-section-title">Shirt-Farbe</h4>
                        <div class="profile-color-row" id="profile-shirt-row">
                            ${SHIRT_COLORS.map(c => `
                                <button class="profile-color-circle ${avatarConfig.shirt === c ? 'selected' : ''}"
                                    data-type="shirt" data-color="${c}" style="background:${c};" title="${c}"></button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Pants color -->
                    <div class="profile-section">
                        <h4 class="profile-section-title">Hosen-Farbe</h4>
                        <div class="profile-color-row" id="profile-pants-row">
                            ${PANTS_COLORS.map(c => `
                                <button class="profile-color-circle ${avatarConfig.pants === c ? 'selected' : ''}"
                                    data-type="pants" data-color="${c}" style="background:${c};" title="${c}"></button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Hair style -->
                    <div class="profile-section">
                        <h4 class="profile-section-title">Frisur</h4>
                        <div class="profile-style-row" id="profile-hair-row">
                            ${HAIR_STYLES.map(h => `
                                <div class="profile-style-option ${avatarConfig.hair === h ? 'selected' : ''}" data-type="hair" data-value="${h}">
                                    <canvas class="profile-mini-avatar" data-hair="${h}" width="50" height="75"></canvas>
                                    <span class="profile-style-label">${HAIR_LABELS[h]}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Accessory -->
                    <div class="profile-section">
                        <h4 class="profile-section-title">Accessoire</h4>
                        <div class="profile-style-row" id="profile-acc-row">
                            ${ACCESSORY_STYLES.map(a => `
                                <div class="profile-style-option ${avatarConfig.accessory === a ? 'selected' : ''}" data-type="accessory" data-value="${a}">
                                    <canvas class="profile-mini-avatar" data-acc="${a}" width="50" height="75"></canvas>
                                    <span class="profile-style-label">${ACCESSORY_LABELS[a]}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <button class="btn mt-3" id="profile-save-btn">Speichern</button>
                    <span class="profile-save-msg" id="profile-save-msg"></span>
                </div>
            </div>

            <!-- Stats -->
            <div class="profile-stats mt-4">
                <h3 class="mb-2">Statistiken</h3>
                <div class="profile-stats-grid">
                    <div class="profile-stat-card">
                        <div class="profile-stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="3"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="6" y1="12" x2="10" y2="12"/></svg>
                        </div>
                        <div class="profile-stat-value">${(user.gamesPlayed || 0).toLocaleString('de-DE')}</div>
                        <div class="profile-stat-label">Spiele gespielt</div>
                    </div>
                    <div class="profile-stat-card">
                        <div class="profile-stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </div>
                        <div class="profile-stat-value">${(user.totalScore || 0).toLocaleString('de-DE')}</div>
                        <div class="profile-stat-label">Gesamtpunkte</div>
                    </div>
                    <div class="profile-stat-card">
                        <div class="profile-stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#55efc4" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <div class="profile-stat-value">${memberSince}</div>
                        <div class="profile-stat-label">Mitglied seit</div>
                    </div>
                    <div class="profile-stat-card">
                        <div class="profile-stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fdcb6e" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </div>
                        <div class="profile-stat-value">${(user.favorites || []).length}</div>
                        <div class="profile-stat-label">Favoriten</div>
                    </div>
                </div>
            </div>

            <!-- Favorite Games -->
            ${favGames.length > 0 ? `
                <div class="profile-favorites mt-4">
                    <h3 class="mb-2">Lieblingsspiele</h3>
                    <div class="profile-fav-scroll">
                        ${favGames.map(g => `
                            <div class="profile-fav-card" data-game-id="${g.id}">
                                <div class="profile-fav-thumb">
                                    <img src="${g.thumbnail}" alt="${g.name}" loading="lazy" />
                                </div>
                                <div class="profile-fav-name">${g.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    // ── Create 3D avatar preview with OrbitControls ──
    const avatarContainer = container.querySelector('#profile-avatar-3d');
    if (avatarContainer) {
        activeProfileAvatar = create3DAvatar(avatarContainer, avatarConfig, {
            width: 300,
            height: 400,
            autoRotate: true,
            rotateSpeed: 0.005,
            enableControls: true,
        });
        registerPageAvatar(activeProfileAvatar);
    }

    // ── Draw mini avatars for hair styles (still 2D for performance) ──
    container.querySelectorAll('#profile-hair-row .profile-mini-avatar').forEach(c => {
        const hairVal = parseInt(c.dataset.hair);
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, 50, 75);
        drawAvatar(ctx, { ...avatarConfig, hair: hairVal }, 25, 5, 30);
    });

    // ── Draw mini avatars for accessories (still 2D for performance) ──
    container.querySelectorAll('#profile-acc-row .profile-mini-avatar').forEach(c => {
        const accVal = parseInt(c.dataset.acc);
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, 50, 75);
        drawAvatar(ctx, { ...avatarConfig, accessory: accVal }, 25, 5, 30);
    });

    // ── Helper to update the 3D preview ──
    function update3DPreview() {
        if (activeProfileAvatar) {
            activeProfileAvatar.updateConfig(avatarConfig);
        }
    }

    // ── Color selection handlers ──
    function handleColorClick(e) {
        const btn = e.target.closest('.profile-color-circle');
        if (!btn) return;
        const type = btn.dataset.type;
        const color = btn.dataset.color;
        avatarConfig[type] = color;

        // Update selection ring
        btn.parentElement.querySelectorAll('.profile-color-circle').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        update3DPreview();
        redrawMiniAvatars();
    }

    container.querySelector('#profile-skin-row').addEventListener('click', handleColorClick);
    container.querySelector('#profile-shirt-row').addEventListener('click', handleColorClick);
    container.querySelector('#profile-pants-row').addEventListener('click', handleColorClick);

    // ── Hair style selection ──
    container.querySelector('#profile-hair-row').addEventListener('click', (e) => {
        const opt = e.target.closest('.profile-style-option');
        if (!opt) return;
        const val = parseInt(opt.dataset.value);
        avatarConfig.hair = val;
        container.querySelectorAll('#profile-hair-row .profile-style-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        update3DPreview();
    });

    // ── Accessory selection ──
    container.querySelector('#profile-acc-row').addEventListener('click', (e) => {
        const opt = e.target.closest('.profile-style-option');
        if (!opt) return;
        const val = parseInt(opt.dataset.value);
        avatarConfig.accessory = val;
        container.querySelectorAll('#profile-acc-row .profile-style-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        update3DPreview();
    });

    function redrawMiniAvatars() {
        container.querySelectorAll('#profile-hair-row .profile-mini-avatar').forEach(c => {
            const hairVal = parseInt(c.dataset.hair);
            const ctx = c.getContext('2d');
            ctx.clearRect(0, 0, 50, 75);
            drawAvatar(ctx, { ...avatarConfig, hair: hairVal }, 25, 5, 30);
        });
        container.querySelectorAll('#profile-acc-row .profile-mini-avatar').forEach(c => {
            const accVal = parseInt(c.dataset.acc);
            const ctx = c.getContext('2d');
            ctx.clearRect(0, 0, 50, 75);
            drawAvatar(ctx, { ...avatarConfig, accessory: accVal }, 25, 5, 30);
        });
    }

    // ── Save button ──
    container.querySelector('#profile-save-btn').addEventListener('click', () => {
        Auth.updateUser({ avatar: { ...avatarConfig } });
        const msg = container.querySelector('#profile-save-msg');
        msg.textContent = 'Gespeichert!';
        msg.classList.add('visible');
        setTimeout(() => msg.classList.remove('visible'), 2000);
    });

    // ── Favorite game click → navigate ──
    container.querySelectorAll('.profile-fav-card').forEach(card => {
        card.addEventListener('click', () => {
            router.navigate(`#/game/${card.dataset.gameId}`);
        });
    });
}

// Expose cleanup so app.js can call it on navigation
renderProfile._cleanup = function () {
    if (activeProfileAvatar) {
        try { activeProfileAvatar.dispose(); } catch (e) { /* ignore */ }
        activeProfileAvatar = null;
    }
};
