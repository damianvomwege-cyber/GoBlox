// js/pages/groups.js
import { Auth } from '../auth.js';
import { Groups } from '../groups.js';
import { GoBux, GOBUX_ICON } from '../gobux.js';

const CREATE_COST = 100;

const EMOJI_OPTIONS = [
    '\ud83c\udfd7\ufe0f', '\u26a1', '\ud83c\udfa8', '\u2694\ufe0f', '\ud83e\udde9', '\ud83c\udfb5', '\ud83c\udff0', '\ud83c\udf3f',
    '\ud83d\udc7e', '\ud83d\ude80', '\ud83c\udf73', '\ud83c\udfc6', '\ud83e\udee7', '\ud83e\ude82', '\ud83c\udf1f', '\ud83c\udfae',
    '\ud83d\udd25', '\ud83d\udc8e', '\ud83c\udf0d', '\ud83c\udfaf', '\ud83e\uddd1\u200d\ud83d\ude80', '\ud83d\udee1\ufe0f', '\ud83c\udfa4', '\ud83d\udcda',
    '\ud83d\udc51', '\ud83c\udfc0', '\u26bd', '\ud83c\udfb2', '\ud83c\udf08', '\ud83d\udd2e', '\ud83e\udd16', '\ud83c\udf81',
];

// Deterministic "player count" for fake games in the games tab
function fakePlayerCount(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }
    return (Math.abs(h) % 3000) + 50;
}

function formatPlayerCount(count) {
    if (count >= 1000) return (count / 1000).toFixed(1).replace('.0', '') + 'K';
    return count.toString();
}

function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    const months = Math.floor(days / 30);
    return `vor ${months} Monat${months !== 1 ? 'en' : ''}`;
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function getInitials(name) {
    return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function showToast(container, message, type = 'success') {
    const existing = document.querySelector('.groups-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `groups-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ── Some fake game data for the games tab ──
const FAKE_GAMES = [
    { name: 'Lava Obby', icon: '\ud83c\udf0b', category: 'Platformer' },
    { name: 'Speed Race 3D', icon: '\ud83c\udfc1', category: 'Racing' },
    { name: 'Tower Battle', icon: '\ud83c\udff0', category: 'Tower Defense' },
    { name: 'Snake Arena', icon: '\ud83d\udc0d', category: 'Snake' },
    { name: 'Block Breaker', icon: '\ud83e\uddf1', category: 'Breakout' },
    { name: 'Memory Master', icon: '\ud83e\udde0', category: 'Memory' },
    { name: 'Wissens-Quiz', icon: '\ud83d\udca1', category: 'Quiz' },
    { name: 'Labyrinth X', icon: '\ud83e\udded', category: 'Maze' },
    { name: 'Flappy Vogel', icon: '\ud83d\udc26', category: 'Flappy' },
    { name: 'Tetris Turm', icon: '\ud83d\udfe6', category: 'Tetris' },
    { name: 'Maulwurf Jagd', icon: '\ud83e\udda6', category: 'Whack-a-Mole' },
    { name: 'Beat Runner', icon: '\ud83c\udfb6', category: 'Rhythm' },
    { name: 'Fisch Abenteuer', icon: '\ud83c\udfa3', category: 'Fishing' },
    { name: 'Koch Arena', icon: '\ud83e\uddd1\u200d\ud83c\udf73', category: 'Cooking' },
    { name: 'Bauernhof Sim', icon: '\ud83c\udf3e', category: 'Farming' },
    { name: 'Wort Puzzle', icon: '\ud83d\udcdd', category: 'Word' },
    { name: 'Mal Studio', icon: '\ud83d\udd8c\ufe0f', category: 'Drawing' },
    { name: 'Survival Island', icon: '\ud83c\udfdd\ufe0f', category: 'Survival' },
    { name: 'Asteroid Blaster', icon: '\u2604\ufe0f', category: 'Space' },
    { name: 'Bubble Pop', icon: '\ud83e\udee7', category: 'Bubble Shooter' },
];

// Deterministic subset of games for a group
function getGroupGames(groupId) {
    let hash = 0;
    for (let i = 0; i < groupId.length; i++) {
        hash = ((hash << 5) - hash + groupId.charCodeAt(i)) | 0;
    }
    const count = 4 + (Math.abs(hash) % 5); // 4-8 games
    const shuffled = [...FAKE_GAMES];
    // Fisher-Yates with seeded pseudo-random
    let seed = Math.abs(hash);
    for (let i = shuffled.length - 1; i > 0; i--) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const j = seed % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}


// ═══════════════════════════════════════════════════════════════
//  Main Render
// ═══════════════════════════════════════════════════════════════

export function renderGroups(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    let currentView = 'list'; // 'list' or 'detail'
    let currentGroupId = null;
    let activeTab = 'wall';
    let searchQuery = '';

    function render() {
        if (currentView === 'detail' && currentGroupId) {
            renderDetail();
        } else {
            renderList();
        }
    }

    // ─── List View ───────────────────────────────────────────────

    function renderList() {
        const allGroups = Groups.getAll();
        const myGroups = Groups.getUserGroups(user.id);
        const query = searchQuery.toLowerCase();

        const filteredGroups = query
            ? allGroups.filter(g =>
                g.name.toLowerCase().includes(query) ||
                g.description.toLowerCase().includes(query)
            )
            : allGroups;

        const filteredMyGroups = query
            ? myGroups.filter(g =>
                g.name.toLowerCase().includes(query) ||
                g.description.toLowerCase().includes(query)
            )
            : myGroups;

        const discoverGroups = filteredGroups.filter(
            g => !myGroups.find(mg => mg.id === g.id)
        );

        container.innerHTML = `
            <div class="groups-page animate-fade-in">
                <!-- Header -->
                <div class="groups-header">
                    <h1>Gruppen</h1>
                    <button class="btn" id="groups-create-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Gruppe erstellen
                    </button>
                </div>
                <p class="text-secondary mb-3">Tritt Gruppen bei, triff Spieler und teile deine Erfolge.</p>

                <!-- Search -->
                <div class="groups-search-wrap">
                    <svg class="groups-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input type="text" class="groups-search" id="groups-search" placeholder="Gruppen suchen..." autocomplete="off" value="${searchQuery}" />
                </div>

                <!-- My Groups -->
                ${filteredMyGroups.length > 0 ? `
                    <div class="groups-section">
                        <div class="groups-section-header">
                            <h2>Meine Gruppen</h2>
                            <span class="groups-section-count">${filteredMyGroups.length}</span>
                        </div>
                        <div class="groups-grid">
                            ${filteredMyGroups.map(g => renderGroupCard(g, true)).join('')}
                        </div>
                    </div>
                ` : (query ? '' : `
                    <div class="groups-section">
                        <div class="groups-section-header">
                            <h2>Meine Gruppen</h2>
                        </div>
                        <div class="groups-empty">
                            <div class="groups-empty-icon">\ud83d\udc65</div>
                            <p>Du bist noch keiner Gruppe beigetreten.</p>
                        </div>
                    </div>
                `)}

                <!-- Discover -->
                <div class="groups-section">
                    <div class="groups-section-header">
                        <h2>Entdecke Gruppen</h2>
                        <span class="groups-section-count">${discoverGroups.length}</span>
                    </div>
                    ${discoverGroups.length > 0 ? `
                        <div class="groups-grid">
                            ${discoverGroups.map(g => renderGroupCard(g, false)).join('')}
                        </div>
                    ` : `
                        <div class="groups-empty">
                            <div class="groups-empty-icon">\ud83d\udd0d</div>
                            <p>${query ? 'Keine Gruppen gefunden.' : 'Keine weiteren Gruppen verfuegbar.'}</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        // ── Event: Search ──
        const searchInput = container.querySelector('#groups-search');
        let searchTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                searchQuery = e.target.value.trim();
                renderList();
            }, 250);
        });
        searchInput.focus();
        // Restore cursor position
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);

        // ── Event: Create group ──
        container.querySelector('#groups-create-btn').addEventListener('click', () => {
            openCreateModal();
        });

        // ── Event: Card clicks ──
        container.querySelectorAll('.groups-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Ignore if the join button was clicked
                if (e.target.closest('.groups-card-join')) return;
                currentGroupId = card.dataset.groupId;
                currentView = 'detail';
                activeTab = 'wall';
                render();
            });
        });

        // ── Event: Join buttons ──
        container.querySelectorAll('.groups-card-join').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                const isMember = btn.classList.contains('joined');

                if (isMember) {
                    const result = Groups.leave(user.id, groupId);
                    if (result.error) {
                        showToast(container, result.error, 'error');
                    } else {
                        showToast(container, 'Gruppe verlassen');
                    }
                } else {
                    const result = Groups.join(user.id, groupId);
                    if (result.error) {
                        showToast(container, result.error, 'error');
                    } else {
                        showToast(container, 'Gruppe beigetreten!');
                    }
                }
                renderList();
            });
        });
    }

    function renderGroupCard(group, isMember) {
        return `
            <div class="groups-card" data-group-id="${group.id}">
                <div class="groups-card-banner">${group.icon}</div>
                <div class="groups-card-body">
                    <div class="groups-card-name">${escapeHtml(group.name)}</div>
                    <div class="groups-card-desc">${escapeHtml(group.description)}</div>
                    <div class="groups-card-footer">
                        <div class="groups-card-members">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            ${group.members.length} Mitglieder
                        </div>
                        <button class="groups-card-join ${isMember ? 'joined' : ''}" data-group-id="${group.id}">
                            ${isMember ? 'Beigetreten' : 'Beitreten'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── Detail View ─────────────────────────────────────────────

    function renderDetail() {
        const group = Groups.getById(currentGroupId);
        if (!group) {
            currentView = 'list';
            render();
            return;
        }

        const role = Groups.getUserRole(currentGroupId, user.id);
        const isMember = role !== null;
        const isOwner = role === 'owner';
        const isAdmin = role === 'admin';
        const isStaff = isOwner || isAdmin;

        container.innerHTML = `
            <div class="groups-page animate-fade-in">
                <!-- Back -->
                <button class="groups-back-btn" id="groups-back">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Zurueck zu Gruppen
                </button>

                <!-- Hero -->
                <div class="groups-detail-hero">
                    <div class="groups-detail-banner">${group.icon}</div>
                    <div class="groups-detail-info">
                        <div class="groups-detail-text">
                            <div class="groups-detail-name">${escapeHtml(group.name)}</div>
                            <div class="groups-detail-desc">${escapeHtml(group.description)}</div>
                            <div class="groups-detail-stats">
                                <div class="groups-detail-stat">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    ${group.members.length} Mitglieder
                                </div>
                                <div class="groups-detail-stat">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    Erstellt am ${formatDate(group.created)}
                                </div>
                                <div class="groups-detail-stat">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    ${group.posts.length} Beitraege
                                </div>
                            </div>
                        </div>
                        <div class="groups-detail-actions">
                            ${isOwner ? `
                                <span class="groups-owner-badge">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                                    Eigentuemer
                                </span>
                                <button class="btn btn-sm btn-secondary" id="groups-edit-btn">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Bearbeiten
                                </button>
                            ` : isMember ? `
                                <button class="btn btn-sm groups-leave-btn" id="groups-leave-btn">Verlassen</button>
                            ` : `
                                <button class="btn btn-sm" id="groups-join-btn">Beitreten</button>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="groups-tabs">
                    <button class="groups-tab ${activeTab === 'wall' ? 'active' : ''}" data-tab="wall">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px;margin-right:4px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Wall
                    </button>
                    <button class="groups-tab ${activeTab === 'members' ? 'active' : ''}" data-tab="members">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px;margin-right:4px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        Mitglieder
                    </button>
                    <button class="groups-tab ${activeTab === 'games' ? 'active' : ''}" data-tab="games">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px;margin-right:4px;"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="17" cy="10" r="1"/><circle cx="15" cy="13" r="1"/></svg>
                        Spiele
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="groups-tab-content" id="groups-tab-content"></div>
            </div>
        `;

        // Render active tab
        const tabContent = container.querySelector('#groups-tab-content');
        if (activeTab === 'wall') renderWallTab(tabContent, group, isMember, isStaff);
        else if (activeTab === 'members') renderMembersTab(tabContent, group, isOwner);
        else if (activeTab === 'games') renderGamesTab(tabContent, group, router);

        // ── Event: Back ──
        container.querySelector('#groups-back').addEventListener('click', () => {
            currentView = 'list';
            currentGroupId = null;
            render();
        });

        // ── Event: Tab clicks ──
        container.querySelectorAll('.groups-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                activeTab = tab.dataset.tab;
                renderDetail();
            });
        });

        // ── Event: Join ──
        const joinBtn = container.querySelector('#groups-join-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                const result = Groups.join(user.id, currentGroupId);
                if (result.error) {
                    showToast(container, result.error, 'error');
                } else {
                    showToast(container, 'Gruppe beigetreten!');
                    renderDetail();
                }
            });
        }

        // ── Event: Leave ──
        const leaveBtn = container.querySelector('#groups-leave-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                const result = Groups.leave(user.id, currentGroupId);
                if (result.error) {
                    showToast(container, result.error, 'error');
                } else {
                    showToast(container, 'Gruppe verlassen');
                    renderDetail();
                }
            });
        }

        // ── Event: Edit ──
        const editBtn = container.querySelector('#groups-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                openEditModal(group);
            });
        }
    }

    // ─── Wall Tab ────────────────────────────────────────────────

    function renderWallTab(tabContent, group, isMember, isStaff) {
        const posts = Groups.getPosts(currentGroupId);

        tabContent.innerHTML = `
            ${isMember ? `
                <div class="groups-wall-input-wrap">
                    <textarea class="groups-wall-input" id="groups-wall-input" placeholder="Schreibe etwas an die Wall..." maxlength="500"></textarea>
                    <button class="btn groups-wall-submit" id="groups-wall-submit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        Posten
                    </button>
                </div>
            ` : `
                <div style="background:var(--bg-card);border-radius:var(--border-radius);padding:0.85rem 1.15rem;margin-bottom:1.5rem;border:1px solid rgba(255,255,255,0.05);text-align:center;">
                    <span class="text-secondary" style="font-size:0.85rem;">Tritt der Gruppe bei, um an die Wall zu posten.</span>
                </div>
            `}

            ${posts.length === 0 ? `
                <div class="groups-wall-empty">
                    <div class="groups-wall-empty-icon">\ud83d\udcac</div>
                    <p>Noch keine Beitraege. Schreibe den ersten!</p>
                </div>
            ` : posts.map(post => {
                const postRole = Groups.getUserRole(currentGroupId, post.userId);
                const liked = post.likes.includes(user.id);
                const canDelete = post.userId === user.id || isStaff;

                return `
                    <div class="groups-post">
                        <div class="groups-post-header">
                            <div class="groups-post-author-wrap">
                                <div class="groups-post-avatar">${getInitials(post.userName)}</div>
                                <span class="groups-post-author">${escapeHtml(post.userName)}</span>
                                ${postRole === 'owner' ? '<span class="groups-post-role role-owner">Owner</span>' : ''}
                                ${postRole === 'admin' ? '<span class="groups-post-role role-admin">Admin</span>' : ''}
                            </div>
                            <span class="groups-post-time">${timeAgo(post.timestamp)}</span>
                        </div>
                        <div class="groups-post-text">${escapeHtml(post.text)}</div>
                        <div class="groups-post-actions">
                            <button class="groups-post-like-btn ${liked ? 'liked' : ''}" data-post-id="${post.id}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                                </svg>
                                ${post.likes.length > 0 ? post.likes.length : ''}
                            </button>
                            ${canDelete ? `
                                <button class="groups-post-delete-btn" data-post-id="${post.id}">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                    Loeschen
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        `;

        // ── Event: Post submit ──
        const wallInput = tabContent.querySelector('#groups-wall-input');
        const wallSubmit = tabContent.querySelector('#groups-wall-submit');

        if (wallSubmit) {
            wallSubmit.addEventListener('click', () => {
                const text = wallInput.value.trim();
                if (!text) return;

                const result = Groups.addPost(currentGroupId, user.id, text);
                if (result.error) {
                    showToast(container, result.error, 'error');
                    return;
                }
                renderDetail();
            });
        }

        if (wallInput) {
            wallInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    wallSubmit.click();
                }
            });
        }

        // ── Event: Like buttons ──
        tabContent.querySelectorAll('.groups-post-like-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Groups.toggleLike(currentGroupId, btn.dataset.postId, user.id);
                renderDetail();
            });
        });

        // ── Event: Delete buttons ──
        tabContent.querySelectorAll('.groups-post-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Groups.deletePost(currentGroupId, btn.dataset.postId, user.id);
                showToast(container, 'Beitrag geloescht');
                renderDetail();
            });
        });
    }

    // ─── Members Tab ─────────────────────────────────────────────

    function renderMembersTab(tabContent, group, isOwner) {
        const members = Groups.getMembers(currentGroupId);
        const allUsers = Auth.getUsers();

        // Sort: owner first, then admins, then members
        const roleOrder = { owner: 0, admin: 1, member: 2 };
        const sorted = [...members].sort((a, b) => (roleOrder[a.role] || 2) - (roleOrder[b.role] || 2));

        tabContent.innerHTML = `
            <div class="groups-members-list">
                ${sorted.map(m => {
                    const memberUser = allUsers.find(u => u.id === m.userId);
                    const displayName = memberUser ? memberUser.name : (m.userId.startsWith('seed_') ? getSeedName(m.userId) : 'Unbekannt');

                    const roleLabelMap = { owner: 'Eigentuemer', admin: 'Admin', member: 'Mitglied' };

                    return `
                        <div class="groups-member-card">
                            <div class="groups-member-left">
                                <div class="groups-member-avatar avatar-${m.role}">${getInitials(displayName)}</div>
                                <div>
                                    <div class="groups-member-name">${escapeHtml(displayName)}</div>
                                    <div class="groups-member-meta">
                                        <span class="groups-member-role-badge role-${m.role}">${roleLabelMap[m.role]}</span>
                                        <span class="groups-member-joined">Beigetreten ${formatDate(m.joined)}</span>
                                    </div>
                                </div>
                            </div>
                            ${isOwner && m.role !== 'owner' ? `
                                <div class="groups-member-actions">
                                    ${m.role === 'member' ? `
                                        <button class="groups-member-action-btn promote" data-user-id="${m.userId}" data-action="promote">Befoerdern</button>
                                    ` : `
                                        <button class="groups-member-action-btn demote" data-user-id="${m.userId}" data-action="demote">Degradieren</button>
                                    `}
                                    <button class="groups-member-action-btn kick" data-user-id="${m.userId}" data-action="kick">Entfernen</button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // ── Event: Member actions ──
        tabContent.querySelectorAll('.groups-member-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const targetUserId = btn.dataset.userId;

                if (action === 'promote') {
                    const result = Groups.setRole(currentGroupId, targetUserId, 'admin');
                    if (result.error) {
                        showToast(container, result.error, 'error');
                    } else {
                        showToast(container, 'Zum Admin befoerdert!');
                    }
                } else if (action === 'demote') {
                    const result = Groups.setRole(currentGroupId, targetUserId, 'member');
                    if (result.error) {
                        showToast(container, result.error, 'error');
                    } else {
                        showToast(container, 'Zum Mitglied degradiert');
                    }
                } else if (action === 'kick') {
                    const result = Groups.leave(targetUserId, currentGroupId);
                    if (result.error) {
                        showToast(container, result.error, 'error');
                    } else {
                        showToast(container, 'Mitglied entfernt');
                    }
                }

                renderDetail();
            });
        });
    }

    // ─── Games Tab ───────────────────────────────────────────────

    function renderGamesTab(tabContent, group, router) {
        const games = getGroupGames(group.id);

        tabContent.innerHTML = `
            <div class="groups-games-grid">
                ${games.map(g => {
                    const players = fakePlayerCount(group.id + g.name);
                    return `
                        <div class="groups-game-card" data-game-name="${g.name}">
                            <div class="groups-game-thumb">${g.icon}</div>
                            <div class="groups-game-info">
                                <div class="groups-game-name">${g.name}</div>
                                <div class="groups-game-players">
                                    <span class="dot"></span>
                                    ${formatPlayerCount(players)} aktiv
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Clicking game cards navigates to the game catalog
        tabContent.querySelectorAll('.groups-game-card').forEach(card => {
            card.addEventListener('click', () => {
                router.navigate('#/games');
            });
        });
    }

    // ─── Create Group Modal ──────────────────────────────────────

    function openCreateModal() {
        let selectedEmoji = '\ud83c\udfae';
        let nameVal = '';
        let descVal = '';

        const overlay = document.createElement('div');
        overlay.className = 'groups-modal-overlay';

        function renderModal() {
            const balance = GoBux.getBalance(user.id);
            const canAfford = balance >= CREATE_COST;

            overlay.innerHTML = `
                <div class="groups-modal">
                    <div class="groups-modal-header">
                        <h2>Gruppe erstellen</h2>
                        <button class="groups-modal-close" id="groups-modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                    <div class="groups-modal-body">
                        <!-- Name -->
                        <div class="groups-form-group">
                            <label class="groups-form-label">Gruppenname</label>
                            <input type="text" class="groups-form-input" id="groups-form-name" placeholder="z.B. Die Baumeister" maxlength="40" value="${escapeHtml(nameVal)}" />
                        </div>

                        <!-- Description -->
                        <div class="groups-form-group">
                            <label class="groups-form-label">Beschreibung</label>
                            <textarea class="groups-form-input" id="groups-form-desc" placeholder="Beschreibe deine Gruppe..." maxlength="200">${escapeHtml(descVal)}</textarea>
                        </div>

                        <!-- Emoji Picker -->
                        <div class="groups-form-group">
                            <label class="groups-form-label">Gruppen-Icon</label>
                            <div class="groups-emoji-picker" id="groups-emoji-picker">
                                ${EMOJI_OPTIONS.map(e => `
                                    <button class="groups-emoji-option ${e === selectedEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Preview -->
                        <div class="groups-preview-section">
                            <div class="groups-preview-label">Vorschau</div>
                            <div class="groups-preview-card">
                                <div class="groups-preview-banner">${selectedEmoji}</div>
                                <div class="groups-preview-body">
                                    <div class="groups-preview-name">${nameVal ? escapeHtml(nameVal) : 'Gruppenname'}</div>
                                    <div class="groups-preview-desc">${descVal ? escapeHtml(descVal) : 'Beschreibung...'}</div>
                                    <div class="groups-preview-footer">
                                        <span class="groups-preview-members">1 Mitglied</span>
                                        <span class="groups-preview-cost">${GOBUX_ICON} ${CREATE_COST} GoBux</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="groups-modal-footer">
                        <div class="groups-modal-error" id="groups-modal-error"></div>
                        <button class="btn groups-create-btn" id="groups-modal-submit" ${!canAfford ? 'disabled' : ''}>
                            ${GOBUX_ICON}
                            ${canAfford ? `Erstellen (${CREATE_COST} GoBux)` : 'Nicht genug GoBux'}
                        </button>
                    </div>
                </div>
            `;

            // ── Close ──
            overlay.querySelector('#groups-modal-close').addEventListener('click', () => {
                overlay.remove();
            });

            // ── Click outside ──
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });

            // ── Name input ──
            const nameInput = overlay.querySelector('#groups-form-name');
            nameInput.addEventListener('input', (e) => {
                nameVal = e.target.value;
                renderModal();
                // Refocus and restore cursor
                const newInput = overlay.querySelector('#groups-form-name');
                newInput.focus();
                newInput.setSelectionRange(nameVal.length, nameVal.length);
            });

            // ── Description input ──
            const descInput = overlay.querySelector('#groups-form-desc');
            descInput.addEventListener('input', (e) => {
                descVal = e.target.value;
                renderModal();
                const newInput = overlay.querySelector('#groups-form-desc');
                newInput.focus();
                newInput.setSelectionRange(descVal.length, descVal.length);
            });

            // ── Emoji picker ──
            overlay.querySelector('#groups-emoji-picker').addEventListener('click', (e) => {
                const opt = e.target.closest('.groups-emoji-option');
                if (!opt) return;
                selectedEmoji = opt.dataset.emoji;
                renderModal();
            });

            // ── Submit ──
            overlay.querySelector('#groups-modal-submit').addEventListener('click', () => {
                const errorEl = overlay.querySelector('#groups-modal-error');

                if (!nameVal.trim()) {
                    errorEl.textContent = 'Bitte gib einen Gruppennamen ein.';
                    return;
                }
                if (!descVal.trim()) {
                    errorEl.textContent = 'Bitte gib eine Beschreibung ein.';
                    return;
                }

                // Charge GoBux
                const spendResult = GoBux.spend(user.id, CREATE_COST, `Gruppe erstellt: ${nameVal.trim()}`);
                if (spendResult.error) {
                    errorEl.textContent = spendResult.error;
                    return;
                }

                const result = Groups.create(user.id, {
                    name: nameVal,
                    description: descVal,
                    icon: selectedEmoji,
                });

                if (result.error) {
                    // Refund if creation failed
                    GoBux.earn(user.id, CREATE_COST, 'Rueckerstattung: Gruppenerstellung fehlgeschlagen');
                    errorEl.textContent = result.error;
                    return;
                }

                overlay.remove();
                showToast(container, 'Gruppe erstellt!');
                currentGroupId = result.group.id;
                currentView = 'detail';
                activeTab = 'wall';
                render();
            });

            // ── Escape key ──
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }

        renderModal();
        document.body.appendChild(overlay);

        // Focus name input
        requestAnimationFrame(() => {
            const nameInput = overlay.querySelector('#groups-form-name');
            if (nameInput) nameInput.focus();
        });
    }

    // ─── Edit Group Modal ────────────────────────────────────────

    function openEditModal(group) {
        let selectedEmoji = group.icon;
        let nameVal = group.name;
        let descVal = group.description;

        const overlay = document.createElement('div');
        overlay.className = 'groups-modal-overlay';

        function renderModal() {
            overlay.innerHTML = `
                <div class="groups-modal">
                    <div class="groups-modal-header">
                        <h2>Gruppe bearbeiten</h2>
                        <button class="groups-modal-close" id="groups-modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                    <div class="groups-modal-body">
                        <!-- Name -->
                        <div class="groups-form-group">
                            <label class="groups-form-label">Gruppenname</label>
                            <input type="text" class="groups-form-input" id="groups-edit-name" maxlength="40" value="${escapeHtml(nameVal)}" />
                        </div>

                        <!-- Description -->
                        <div class="groups-form-group">
                            <label class="groups-form-label">Beschreibung</label>
                            <textarea class="groups-form-input" id="groups-edit-desc" maxlength="200">${escapeHtml(descVal)}</textarea>
                        </div>

                        <!-- Emoji Picker -->
                        <div class="groups-form-group">
                            <label class="groups-form-label">Gruppen-Icon</label>
                            <div class="groups-emoji-picker" id="groups-emoji-picker">
                                ${EMOJI_OPTIONS.map(e => `
                                    <button class="groups-emoji-option ${e === selectedEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Preview -->
                        <div class="groups-preview-section">
                            <div class="groups-preview-label">Vorschau</div>
                            <div class="groups-preview-card">
                                <div class="groups-preview-banner">${selectedEmoji}</div>
                                <div class="groups-preview-body">
                                    <div class="groups-preview-name">${escapeHtml(nameVal)}</div>
                                    <div class="groups-preview-desc">${escapeHtml(descVal)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="groups-modal-footer">
                        <div class="groups-modal-error" id="groups-modal-error"></div>
                        <button class="btn groups-create-btn" id="groups-modal-save">Speichern</button>
                    </div>
                </div>
            `;

            // ── Close ──
            overlay.querySelector('#groups-modal-close').addEventListener('click', () => {
                overlay.remove();
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });

            // ── Name input ──
            const nameInput = overlay.querySelector('#groups-edit-name');
            nameInput.addEventListener('input', (e) => {
                nameVal = e.target.value;
                renderModal();
                const newInput = overlay.querySelector('#groups-edit-name');
                newInput.focus();
                newInput.setSelectionRange(nameVal.length, nameVal.length);
            });

            // ── Description input ──
            const descInput = overlay.querySelector('#groups-edit-desc');
            descInput.addEventListener('input', (e) => {
                descVal = e.target.value;
                renderModal();
                const newInput = overlay.querySelector('#groups-edit-desc');
                newInput.focus();
                newInput.setSelectionRange(descVal.length, descVal.length);
            });

            // ── Emoji picker ──
            overlay.querySelector('#groups-emoji-picker').addEventListener('click', (e) => {
                const opt = e.target.closest('.groups-emoji-option');
                if (!opt) return;
                selectedEmoji = opt.dataset.emoji;
                renderModal();
            });

            // ── Save ──
            overlay.querySelector('#groups-modal-save').addEventListener('click', () => {
                const errorEl = overlay.querySelector('#groups-modal-error');

                const result = Groups.updateGroup(group.id, user.id, {
                    name: nameVal,
                    description: descVal,
                    icon: selectedEmoji,
                });

                if (result.error) {
                    errorEl.textContent = result.error;
                    return;
                }

                overlay.remove();
                showToast(container, 'Gruppe aktualisiert!');
                renderDetail();
            });

            // ── Escape key ──
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }

        renderModal();
        document.body.appendChild(overlay);
    }

    // ─── Start ───────────────────────────────────────────────────

    render();
}

// ── Utility: Generate names for seed users ──
function getSeedName(seedId) {
    const names = {
        'seed_owner_1': 'BauMeisterMax', 'seed_owner_2': 'SpeedySara', 'seed_owner_3': 'DesignDani',
        'seed_owner_4': 'KriegerKlaus', 'seed_owner_5': 'PuzzlePaul', 'seed_owner_6': 'MelodyMia',
        'seed_owner_7': 'TurmTina', 'seed_owner_8': 'FarmerFritz', 'seed_owner_9': 'RetroRudi',
        'seed_owner_10': 'AstroAlex', 'seed_owner_11': 'KochKarl', 'seed_owner_12': 'QuizQueen',
        'seed_owner_13': 'BubbleBen', 'seed_owner_14': 'FlapperFinn', 'seed_owner_15': 'HelferHans',
        'seed_m1': 'KreativKarl', 'seed_m2': 'BauerBernd', 'seed_m3': 'BlockBasti',
        'seed_m4': 'ObbyOlga', 'seed_m5': 'RennRita', 'seed_m6': 'TurboTom',
        'seed_m7': 'BlitzBianca', 'seed_m8': 'FixFelix', 'seed_m9': 'SprintStefan',
        'seed_m10': 'FlashFiona', 'seed_m11': 'MalerMoritz', 'seed_m12': 'BuntBella',
        'seed_m13': 'ScharfSchuetze', 'seed_m14': 'PanzerPaula', 'seed_m15': 'KampfKai',
        'seed_m16': 'StrategeSven', 'seed_m17': 'SchutzSchulz', 'seed_m18': 'HeldenHilde',
        'seed_m19': 'MutigMike', 'seed_m20': 'TapferTheo', 'seed_m21': 'DenkerDirk',
        'seed_m22': 'LogikLuise', 'seed_m23': 'RaetselRosa', 'seed_m24': 'BeatBjorn',
        'seed_m25': 'TurmTobi', 'seed_m26': 'WachWilli', 'seed_m27': 'MauerMax',
        'seed_m28': 'SchutzSonja', 'seed_m29': 'BollwerkBen', 'seed_m30': 'GruenGreta',
        'seed_m31': 'ErntErik', 'seed_m32': 'ArcadeAnna', 'seed_m33': 'PixelPeter',
        'seed_m34': 'ClassicClara', 'seed_m35': 'JoystickJan', 'seed_m36': 'GameGabi',
        'seed_m37': 'HighscoreHans', 'seed_m38': 'SternStella', 'seed_m39': 'KometKurt',
        'seed_m40': 'ChefCecilia', 'seed_m41': 'WissenWerner', 'seed_m42': 'FrageFrida',
        'seed_m43': 'AntwortAnton', 'seed_m44': 'SchlauSara', 'seed_m45': 'PopPeter',
        'seed_m46': 'PlatzPia', 'seed_m47': 'FlugFelicia', 'seed_m48': 'HochHugo',
        'seed_m49': 'SpringSimon', 'seed_m50': 'GuideGreta', 'seed_m51': 'HilfeHenri',
        'seed_m52': 'NeuNina', 'seed_m53': 'StartStefan', 'seed_m54': 'LernLisa',
        'seed_m55': 'TippThomas', 'seed_m56': 'FreshFrank', 'seed_m57': 'NeulingNadine',
        'seed_m58': 'EntdeckerEva',
    };
    return names[seedId] || 'Spieler';
}

// ── Utility: Escape HTML to prevent XSS ──
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
