// js/pages/leaderboard.js
import { Auth } from '../auth.js';
import { GameRegistry } from '../games/loader.js';
import { drawAvatar } from '../components/avatar.js';

const PLAY_COUNTS_KEY = 'goblox_play_counts';

function getPlayCounts() {
    return JSON.parse(localStorage.getItem(PLAY_COUNTS_KEY) || '{}');
}

export function renderLeaderboard(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    let activeTab = 'players';

    function render() {
        container.innerHTML = `
            <div class="lb-page animate-fade-in">
                <h1>Rangliste</h1>
                <p class="text-secondary mb-3">Sieh dir an, wer die besten Spieler sind.</p>

                <!-- Tabs -->
                <div class="lb-tabs">
                    <button class="lb-tab ${activeTab === 'players' ? 'active' : ''}" data-tab="players">Top Spieler</button>
                    <button class="lb-tab ${activeTab === 'games' ? 'active' : ''}" data-tab="games">Meistgespielt</button>
                    <button class="lb-tab ${activeTab === 'stats' ? 'active' : ''}" data-tab="stats">Meine Stats</button>
                </div>

                <!-- Tab Content -->
                <div class="lb-content" id="lb-content"></div>
            </div>
        `;

        // Tab click
        container.querySelectorAll('.lb-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                activeTab = tab.dataset.tab;
                render();
            });
        });

        const contentEl = container.querySelector('#lb-content');

        switch (activeTab) {
            case 'players': renderPlayersTab(contentEl); break;
            case 'games': renderGamesTab(contentEl, router); break;
            case 'stats': renderStatsTab(contentEl); break;
        }
    }

    function renderPlayersTab(el) {
        const users = Auth.getUsers().sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

        if (users.length === 0) {
            el.innerHTML = '<p class="text-secondary" style="padding:2rem;text-align:center;">Keine Spieler gefunden.</p>';
            return;
        }

        el.innerHTML = `
            <div class="lb-players-list">
                ${users.map((u, i) => {
                    const rank = i + 1;
                    const isMe = u.id === user.id;
                    const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
                    return `
                        <div class="lb-player-row ${isMe ? 'lb-player-me' : ''}">
                            <div class="lb-player-rank ${rankClass}">${rank <= 3 ? getMedalSvg(rank) : rank}</div>
                            <canvas class="lb-player-avatar" data-user-idx="${i}" width="40" height="60"></canvas>
                            <div class="lb-player-name">${u.name}${isMe ? ' <span class="lb-you-badge">Du</span>' : ''}</div>
                            <div class="lb-player-score">${(u.totalScore || 0).toLocaleString('de-DE')} Pkt.</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Draw avatars
        el.querySelectorAll('.lb-player-avatar').forEach(c => {
            const idx = parseInt(c.dataset.userIdx);
            const u = users[idx];
            if (u && u.avatar) {
                const ctx = c.getContext('2d');
                drawAvatar(ctx, u.avatar, 20, 3, 24);
            }
        });
    }

    function renderGamesTab(el, router) {
        const playCounts = getPlayCounts();
        const entries = Object.entries(playCounts)
            .map(([gameId, count]) => {
                const game = GameRegistry.getGame(gameId);
                return game ? { game, count } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        if (entries.length === 0) {
            el.innerHTML = `
                <div class="lb-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5" style="opacity:0.4;">
                        <rect x="2" y="6" width="20" height="12" rx="3"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="6" y1="12" x2="10" y2="12"/>
                    </svg>
                    <p>Noch keine Spiele gespielt.</p>
                </div>
            `;
            return;
        }

        el.innerHTML = `
            <div class="lb-games-grid">
                ${entries.map(({ game, count }) => `
                    <div class="lb-game-card" data-game-id="${game.id}">
                        <div class="lb-game-thumb">
                            <img src="${game.thumbnail}" alt="${game.name}" loading="lazy" />
                        </div>
                        <div class="lb-game-info">
                            <div class="lb-game-name">${game.name}</div>
                            <div class="lb-game-plays">${count.toLocaleString('de-DE')}x gespielt</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        el.querySelectorAll('.lb-game-card').forEach(card => {
            card.addEventListener('click', () => {
                router.navigate(`#/game/${card.dataset.gameId}`);
            });
        });
    }

    function renderStatsTab(el) {
        const gamesPlayed = user.gamesPlayed || 0;
        const totalScore = user.totalScore || 0;
        const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
        const recentGames = user.recentGames || [];

        // Games per category
        const catCounts = {};
        recentGames.forEach(rg => {
            const game = GameRegistry.getGame(rg.gameId);
            if (game) {
                catCounts[game.category] = (catCounts[game.category] || 0) + 1;
            }
        });
        const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const maxCatCount = catEntries.length > 0 ? catEntries[0][1] : 1;

        el.innerHTML = `
            <!-- Personal stat cards -->
            <div class="lb-stats-cards">
                <div class="lb-stat-card">
                    <div class="lb-stat-value">${gamesPlayed.toLocaleString('de-DE')}</div>
                    <div class="lb-stat-label">Spiele gespielt</div>
                </div>
                <div class="lb-stat-card">
                    <div class="lb-stat-value">${totalScore.toLocaleString('de-DE')}</div>
                    <div class="lb-stat-label">Gesamtpunkte</div>
                </div>
                <div class="lb-stat-card">
                    <div class="lb-stat-value">${avgScore.toLocaleString('de-DE')}</div>
                    <div class="lb-stat-label">Durchschnitt pro Spiel</div>
                </div>
            </div>

            <!-- Category bar chart -->
            ${catEntries.length > 0 ? `
                <div class="lb-cat-chart mt-3">
                    <h4 class="mb-2">Spiele pro Kategorie</h4>
                    <div class="lb-bars">
                        ${catEntries.map(([cat, count]) => {
                            const pct = Math.round((count / maxCatCount) * 100);
                            return `
                                <div class="lb-bar-row">
                                    <span class="lb-bar-label">${cat}</span>
                                    <div class="lb-bar-track">
                                        <div class="lb-bar-fill" style="width:${pct}%"></div>
                                    </div>
                                    <span class="lb-bar-count">${count}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Recent games -->
            ${recentGames.length > 0 ? `
                <div class="lb-recent mt-3">
                    <h4 class="mb-2">Zuletzt gespielt</h4>
                    <div class="lb-recent-list">
                        ${recentGames.slice(0, 10).map(rg => {
                            const dateStr = new Date(rg.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                            return `
                                <div class="lb-recent-row">
                                    <span class="lb-recent-name">${rg.name}</span>
                                    <span class="lb-recent-score">${(rg.score || 0).toLocaleString('de-DE')} Pkt.</span>
                                    <span class="lb-recent-date">${dateStr}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div class="lb-empty mt-3">
                    <p>Noch keine Spiele gespielt. Starte jetzt!</p>
                </div>
            `}
        `;
    }

    render();
}

function getMedalSvg(rank) {
    const colors = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };
    const color = colors[rank];
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1">
        <circle cx="12" cy="14" r="7" fill="${color}" opacity="0.2" stroke="${color}"/>
        <circle cx="12" cy="14" r="5" fill="${color}" opacity="0.4"/>
        <text x="12" y="17" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff" stroke="none">${rank}</text>
    </svg>`;
}
