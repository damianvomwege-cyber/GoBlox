// ── Admin Dashboard ─────────────────────────────────────────────────────
// IP-restricted admin panel with analytics and content management.

const LS_KEYS = {
    users: 'goblox_users',
    currentUser: 'goblox_current_user',
    games: 'goblox_created_games',
    gobux: 'goblox_gobux',
    passes: 'goblox_passes',
    transactions: 'goblox_transactions',
    playCounts: 'goblox_play_counts',
};

// ── Helpers ──────────────────────────────────────────────────────────────

function byteSize(str) {
    return new Blob([str]).size;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

function timeAgo(ts) {
    if (!ts) return '—';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'gerade eben';
    if (mins < 60) return mins + ' Min.';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' Std.';
    const days = Math.floor(hrs / 24);
    return days + ' Tag' + (days !== 1 ? 'e' : '');
}

function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ── Data Accessors ───────────────────────────────────────────────────────

function getUsers() {
    return JSON.parse(localStorage.getItem(LS_KEYS.users) || '[]');
}

function getGames() {
    return JSON.parse(localStorage.getItem(LS_KEYS.games) || '{}');
}

function getGobux() {
    return JSON.parse(localStorage.getItem(LS_KEYS.gobux) || '{}');
}

function getPlayCounts() {
    return JSON.parse(localStorage.getItem(LS_KEYS.playCounts) || '{}');
}

function getTransactions() {
    return JSON.parse(localStorage.getItem(LS_KEYS.transactions) || '{}');
}

// ── Storage Analysis ────────────────────────────────────────────────────

function analyzeStorage() {
    const segments = [];
    const colors = ['#6c63ff', '#e94560', '#44cc44', '#f0a030', '#4ab4f0', '#c084fc', '#ff69b4'];
    let colorIdx = 0;
    let total = 0;

    for (const [label, key] of Object.entries(LS_KEYS)) {
        const raw = localStorage.getItem(key) || '';
        const size = byteSize(raw);
        total += size;
        segments.push({ label, key, size, color: colors[colorIdx++ % colors.length] });
    }

    // Settings + friends (dynamic keys)
    let otherSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!Object.values(LS_KEYS).includes(k)) {
            otherSize += byteSize(localStorage.getItem(k) || '');
        }
    }
    if (otherSize > 0) {
        total += otherSize;
        segments.push({ label: 'sonstige', key: '(diverse)', size: otherSize, color: '#888' });
    }

    return { segments, total };
}

// ── Render ───────────────────────────────────────────────────────────────

export async function renderAdmin(container, router) {
    container.innerHTML = `<div class="admin-gate">
        <div class="spinner"></div>
        <span style="color:var(--text-secondary)">Zugriff wird geprueft...</span>
    </div>`;

    // Check IP
    let allowed = false;
    let myIp = '?';
    try {
        const [authRes, ipRes] = await Promise.all([
            fetch('/api/check-admin'),
            fetch('/api/my-ip'),
        ]);
        allowed = authRes.ok;
        if (ipRes.ok) {
            const ipData = await ipRes.json();
            myIp = ipData.ip || '?';
        }
    } catch {
        // Network error — deny
    }

    if (!allowed) {
        container.innerHTML = `<div class="admin-denied">
            <div class="icon">&#128274;</div>
            <h2>Zugriff verweigert</h2>
            <p>Deine IP (${escHtml(myIp)}) ist nicht fuer den Admin-Bereich freigeschaltet.</p>
            <a href="#/home" class="admin-btn primary" style="margin-top:0.5rem">Zurueck</a>
        </div>`;
        return;
    }

    // Gather data
    const users = getUsers();
    const games = getGames();
    const gameList = Object.entries(games);
    const gobux = getGobux();
    const playCounts = getPlayCounts();
    const storage = analyzeStorage();
    const totalPlays = Object.values(playCounts).reduce((a, b) => a + b, 0);
    const publishedGames = gameList.filter(([, g]) => g.published);

    container.innerHTML = `<div class="admin-page">
        <!-- Header -->
        <div class="admin-header">
            <h1>Admin Dashboard</h1>
            <div class="admin-header-actions">
                <span class="admin-badge">IP: ${escHtml(myIp)}</span>
                <button class="admin-btn" id="admin-export">Export Backup</button>
                <button class="admin-btn" id="admin-import">Import Backup</button>
                <input type="file" id="admin-import-file" accept=".json" style="display:none">
            </div>
        </div>

        <!-- Stats -->
        <div class="admin-stats">
            <div class="admin-stat-card">
                <span class="label">Benutzer</span>
                <span class="value">${users.length}</span>
                <span class="sub">registrierte Accounts</span>
            </div>
            <div class="admin-stat-card">
                <span class="label">Erstellte Spiele</span>
                <span class="value">${gameList.length}</span>
                <span class="sub">${publishedGames.length} veroeffentlicht</span>
            </div>
            <div class="admin-stat-card">
                <span class="label">Gespielte Runden</span>
                <span class="value">${totalPlays}</span>
                <span class="sub">alle Spiele zusammen</span>
            </div>
            <div class="admin-stat-card">
                <span class="label">Speicher</span>
                <span class="value">${formatBytes(storage.total)}</span>
                <span class="sub">von ~5 MB LocalStorage</span>
            </div>
        </div>

        <!-- Storage Breakdown -->
        <div class="admin-section">
            <div class="admin-section-header" data-section="storage">
                <h2>Speicher-Analyse</h2>
                <span class="toggle">&#9660;</span>
            </div>
            <div class="admin-section-body">
                <div class="admin-storage-bar">
                    ${storage.segments.map(s => {
                        const pct = storage.total > 0 ? (s.size / storage.total * 100) : 0;
                        return `<div class="admin-storage-segment" style="width:${pct}%;background:${s.color}" title="${s.label}: ${formatBytes(s.size)}"></div>`;
                    }).join('')}
                </div>
                <div class="admin-storage-legend">
                    ${storage.segments.map(s =>
                        `<span class="admin-storage-legend-item">
                            <span class="admin-storage-legend-dot" style="background:${s.color}"></span>
                            ${escHtml(s.label)} (${formatBytes(s.size)})
                        </span>`
                    ).join('')}
                </div>
            </div>
        </div>

        <!-- Users Table -->
        <div class="admin-section">
            <div class="admin-section-header" data-section="users">
                <h2>Benutzer <span class="count">${users.length}</span></h2>
                <span class="toggle">&#9660;</span>
            </div>
            <div class="admin-section-body">
                ${users.length === 0
                    ? '<div class="admin-empty">Keine Benutzer vorhanden</div>'
                    : `<table class="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th class="hide-mobile">ID</th>
                                <th>Gobux</th>
                                <th class="hide-mobile">Erstellt</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => {
                                const bal = gobux[u.id] || 0;
                                const userGames = gameList.filter(([, g]) => g.creatorId === u.id).length;
                                return `<tr>
                                    <td><strong>${escHtml(u.name)}</strong><br><span class="mono" style="font-size:0.7rem">${userGames} Spiele</span></td>
                                    <td class="hide-mobile mono">${escHtml(u.id?.substring(0, 8) || '—')}...</td>
                                    <td>${bal}</td>
                                    <td class="hide-mobile">${u.createdAt ? timeAgo(u.createdAt) : '—'}</td>
                                    <td class="actions">
                                        <button class="admin-btn danger admin-delete-user" data-id="${escHtml(u.id)}">Loeschen</button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        </div>

        <!-- Games Table -->
        <div class="admin-section">
            <div class="admin-section-header" data-section="games">
                <h2>Erstellte Spiele <span class="count">${gameList.length}</span></h2>
                <span class="toggle">&#9660;</span>
            </div>
            <div class="admin-section-body">
                ${gameList.length === 0
                    ? '<div class="admin-empty">Keine Spiele vorhanden</div>'
                    : `<table class="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Typ</th>
                                <th class="hide-mobile">Objekte</th>
                                <th class="hide-mobile">Ersteller</th>
                                <th>Status</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${gameList.map(([id, g]) => {
                                const objCount = g.objects?.length || 0;
                                const plays = playCounts[id] || 0;
                                return `<tr>
                                    <td><strong>${escHtml(g.name || 'Unbenannt')}</strong><br><span class="mono" style="font-size:0.7rem">${plays} Plays</span></td>
                                    <td>${escHtml(g.type || '—')}</td>
                                    <td class="hide-mobile">${objCount}</td>
                                    <td class="hide-mobile">${escHtml(g.creatorName || '—')}</td>
                                    <td>${g.published
                                        ? '<span style="color:#44cc44;font-weight:600">Live</span>'
                                        : '<span style="color:var(--text-secondary)">Entwurf</span>'
                                    }</td>
                                    <td class="actions">
                                        <button class="admin-btn admin-play-game" data-id="${escHtml(id)}">Spielen</button>
                                        <button class="admin-btn danger admin-delete-game" data-id="${escHtml(id)}">Loeschen</button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        </div>

        <!-- Play Counts -->
        <div class="admin-section collapsed">
            <div class="admin-section-header" data-section="plays">
                <h2>Spielstatistiken <span class="count">${Object.keys(playCounts).length}</span></h2>
                <span class="toggle">&#9660;</span>
            </div>
            <div class="admin-section-body">
                ${Object.keys(playCounts).length === 0
                    ? '<div class="admin-empty">Noch keine Spieldaten</div>'
                    : `<table class="admin-table">
                        <thead>
                            <tr><th>Spiel</th><th>Runden</th></tr>
                        </thead>
                        <tbody>
                            ${Object.entries(playCounts)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 50)
                                .map(([id, count]) => {
                                    const game = games[id];
                                    const name = game?.name || id.substring(0, 20);
                                    return `<tr>
                                        <td>${escHtml(name)}</td>
                                        <td><strong>${count}</strong></td>
                                    </tr>`;
                                }).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        </div>

        <!-- Danger Zone -->
        <div class="admin-section collapsed">
            <div class="admin-section-header" data-section="danger">
                <h2 style="color:var(--accent-secondary)">Gefahrenzone</h2>
                <span class="toggle">&#9660;</span>
            </div>
            <div class="admin-section-body" style="padding:1.25rem;display:flex;flex-wrap:wrap;gap:0.75rem">
                <button class="admin-btn danger" id="admin-clear-games">Alle Spiele loeschen</button>
                <button class="admin-btn danger" id="admin-clear-stats">Statistiken zuruecksetzen</button>
                <button class="admin-btn danger" id="admin-clear-all">Alles loeschen (komplett)</button>
            </div>
        </div>
    </div>`;

    // ── Event Handlers ──────────────────────────────────────────────────

    // Section toggle
    container.querySelectorAll('.admin-section-header').forEach(h => {
        h.addEventListener('click', () => {
            h.closest('.admin-section').classList.toggle('collapsed');
        });
    });

    // Export
    container.querySelector('#admin-export')?.addEventListener('click', () => {
        const backup = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith('goblox_')) {
                backup[k] = localStorage.getItem(k);
            }
        }
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `goblox-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import
    const importBtn = container.querySelector('#admin-import');
    const importFile = container.querySelector('#admin-import-file');
    importBtn?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                const keys = Object.keys(data).filter(k => k.startsWith('goblox_'));
                if (keys.length === 0) {
                    alert('Keine goblox-Daten in dieser Datei gefunden.');
                    return;
                }
                if (!confirm(`${keys.length} Schluessel importieren? Bestehende Daten werden ueberschrieben.`)) return;
                keys.forEach(k => localStorage.setItem(k, data[k]));
                renderAdmin(container, router);
            } catch {
                alert('Fehler beim Lesen der Datei.');
            }
        };
        reader.readAsText(file);
    });

    // Delete user
    container.querySelectorAll('.admin-delete-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.dataset.id;
            const users = getUsers();
            const user = users.find(u => u.id === userId);
            if (!confirm(`Benutzer "${user?.name || userId}" wirklich loeschen?`)) return;
            const updated = users.filter(u => u.id !== userId);
            localStorage.setItem(LS_KEYS.users, JSON.stringify(updated));
            // Also remove their games
            const games = getGames();
            for (const [gid, g] of Object.entries(games)) {
                if (g.creatorId === userId) delete games[gid];
            }
            localStorage.setItem(LS_KEYS.games, JSON.stringify(games));
            renderAdmin(container, router);
        });
    });

    // Delete game
    container.querySelectorAll('.admin-delete-game').forEach(btn => {
        btn.addEventListener('click', () => {
            const gameId = btn.dataset.id;
            const games = getGames();
            const name = games[gameId]?.name || gameId;
            if (!confirm(`Spiel "${name}" wirklich loeschen?`)) return;
            delete games[gameId];
            localStorage.setItem(LS_KEYS.games, JSON.stringify(games));
            renderAdmin(container, router);
        });
    });

    // Play game
    container.querySelectorAll('.admin-play-game').forEach(btn => {
        btn.addEventListener('click', () => {
            router.navigate(`#/game?id=${btn.dataset.id}&custom=1`);
        });
    });

    // Danger zone
    container.querySelector('#admin-clear-games')?.addEventListener('click', () => {
        if (!confirm('ALLE erstellten Spiele loeschen?')) return;
        localStorage.setItem(LS_KEYS.games, '{}');
        renderAdmin(container, router);
    });

    container.querySelector('#admin-clear-stats')?.addEventListener('click', () => {
        if (!confirm('Alle Spielstatistiken zuruecksetzen?')) return;
        localStorage.setItem(LS_KEYS.playCounts, '{}');
        renderAdmin(container, router);
    });

    container.querySelector('#admin-clear-all')?.addEventListener('click', () => {
        if (!confirm('WIRKLICH ALLES loeschen? Das kann nicht rueckgaengig gemacht werden!')) return;
        if (!confirm('Bist du SICHER? Alle Benutzer, Spiele, Einstellungen werden geloescht.')) return;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith('goblox_')) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        renderAdmin(container, router);
    });
}
