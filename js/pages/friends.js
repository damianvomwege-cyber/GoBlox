// js/pages/friends.js
import { Auth } from '../auth.js';
import { Friends } from '../friends.js';
import { drawAvatar } from '../components/avatar.js';

export function renderFriends(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    function render() {
        const friends = Friends.getFriends(user.id);

        container.innerHTML = `
            <div class="friends-page animate-fade-in">
                <h1>Freunde</h1>
                <p class="text-secondary mb-3">Verwalte deine Freundesliste.</p>

                <!-- Add Friend -->
                <div class="friends-add-section">
                    <div class="friends-add-wrap">
                        <div class="friends-search-wrap">
                            <svg class="friends-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input type="text" class="input friends-search-input" id="friends-search" placeholder="Spielername eingeben..." autocomplete="off" />
                            <div class="friends-dropdown hidden" id="friends-dropdown"></div>
                        </div>
                        <button class="btn" id="friends-add-btn">Hinzufuegen</button>
                    </div>
                    <div class="friends-add-error" id="friends-add-error"></div>
                </div>

                <!-- Friends List -->
                <div class="friends-list" id="friends-list">
                    ${friends.length === 0 ? `
                        <div class="friends-empty">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4;">
                                <circle cx="9" cy="8" r="3.5"/>
                                <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>
                                <circle cx="17.5" cy="8" r="2.5"/>
                                <path d="M18 15h1.5a4 4 0 0 1 4 4v2"/>
                            </svg>
                            <p>Noch keine Freunde. Fuege Spieler hinzu!</p>
                        </div>
                    ` : friends.map(f => {
                        const online = Friends.isOnline(f.id);
                        return `
                            <div class="friends-card">
                                <div class="friends-card-left">
                                    <div class="friends-card-avatar-wrap">
                                        <canvas class="friends-card-avatar" data-friend-id="${f.id}" width="50" height="75"></canvas>
                                        <span class="friends-status-dot ${online ? 'online' : 'offline'}"></span>
                                    </div>
                                    <div class="friends-card-info">
                                        <div class="friends-card-name">${f.name}</div>
                                        <div class="friends-card-status ${online ? 'text-online' : ''}">${online ? 'Online' : 'Offline'}</div>
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-secondary friends-remove-btn" data-friend-id="${f.id}">Entfernen</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // Draw friend avatars
        container.querySelectorAll('.friends-card-avatar').forEach(c => {
            const friendId = c.dataset.friendId;
            const friend = friends.find(f => f.id === friendId);
            if (friend && friend.avatar) {
                const ctx = c.getContext('2d');
                drawAvatar(ctx, friend.avatar, 25, 5, 30);
            }
        });

        // ── Search dropdown ──
        const searchInput = container.querySelector('#friends-search');
        const dropdown = container.querySelector('#friends-dropdown');
        const errorEl = container.querySelector('#friends-add-error');
        let selectedName = '';

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            errorEl.textContent = '';
            if (query.length < 1) {
                dropdown.classList.add('hidden');
                return;
            }
            const allUsers = Auth.getUsers();
            const friendIds = Friends.getFriendIds(user.id);
            const matches = allUsers.filter(u =>
                u.id !== user.id &&
                !friendIds.includes(u.id) &&
                u.name.toLowerCase().includes(query)
            ).slice(0, 8);

            if (matches.length === 0) {
                dropdown.classList.add('hidden');
                return;
            }

            dropdown.innerHTML = matches.map(u => `
                <div class="friends-dropdown-item" data-name="${u.name}">${u.name}</div>
            `).join('');
            dropdown.classList.remove('hidden');
        });

        // Dropdown item click
        dropdown?.addEventListener('click', (e) => {
            const item = e.target.closest('.friends-dropdown-item');
            if (!item) return;
            selectedName = item.dataset.name;
            searchInput.value = selectedName;
            dropdown.classList.add('hidden');
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.friends-search-wrap')) {
                dropdown?.classList.add('hidden');
            }
        });

        // ── Add friend ──
        container.querySelector('#friends-add-btn').addEventListener('click', () => {
            const name = searchInput.value.trim();
            if (!name) {
                errorEl.textContent = 'Bitte gib einen Namen ein.';
                return;
            }
            const result = Friends.addFriend(user.id, name);
            if (result.error) {
                errorEl.textContent = result.error;
                return;
            }
            // Re-render
            render();
        });

        // Enter key to add
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                container.querySelector('#friends-add-btn').click();
            }
        });

        // ── Remove friend ──
        container.querySelectorAll('.friends-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Friends.removeFriend(user.id, btn.dataset.friendId);
                render();
            });
        });
    }

    render();
}
