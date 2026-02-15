// js/pages/profile.js
import { Auth } from '../auth.js';
import { GameRegistry } from '../games/loader.js';
import { create3DAvatar, registerPageAvatar } from '../components/avatar.js';

// Standard character config (fixed, same for everyone)
const STANDARD_AVATAR = {
    skin: '#ffb347',
    shirt: '#4a90d9',
    pants: '#2c3e50',
    hair: 1,
    accessory: 0,
};

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
            <p class="text-secondary mb-3">Dein Standard-GoBlox-Charakter und deine Statistiken.</p>

            <div class="profile-editor">
                <!-- Left: Avatar Preview -->
                <div class="profile-preview-col">
                    <div class="profile-preview-card">
                        <div id="profile-avatar-3d" style="width:300px;height:400px;"></div>
                        <div class="profile-preview-name">${user.name}</div>
                        <div class="profile-standard-label">Standard GoBlox Charakter</div>
                    </div>
                </div>

                <!-- Right: Character Info + Stats -->
                <div class="profile-customize-col">
                    <div class="profile-section">
                        <h4 class="profile-section-title">Charakter</h4>
                        <p class="text-secondary" style="font-size:0.9rem; margin-bottom: 1rem;">
                            Jeder Spieler hat den gleichen GoBlox-Charakter. In verschiedenen Spielen
                            traegt dein Charakter passende Gegenstaende: eine Pistole im Shooter,
                            ein Schwert im Survival, eine Fackel im Labyrinth und mehr!
                        </p>
                    </div>

                    <!-- Stats -->
                    <div class="profile-section">
                        <h4 class="profile-section-title">Statistiken</h4>
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

    // ── Create 3D avatar preview with standard config ──
    const avatarContainer = container.querySelector('#profile-avatar-3d');
    if (avatarContainer) {
        activeProfileAvatar = create3DAvatar(avatarContainer, STANDARD_AVATAR, {
            width: 300,
            height: 400,
            autoRotate: true,
            rotateSpeed: 0.005,
            enableControls: true,
        });
        registerPageAvatar(activeProfileAvatar);
    }

    // ── Favorite game click -> navigate ──
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
