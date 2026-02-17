import { GameRegistry } from '../games/loader.js';
import { Auth } from '../auth.js';
import { GoBux, GOBUX_ICON } from '../gobux.js';
import { isMobile, getControlType, MobileControls, MobileControls3D } from '../games/mobile-controls.js';

let currentGame = null;
let currentGameData = null;
let scoreInterval = null;
let resizeHandler = null;
let mobileControls = null;

function cleanup() {
    if (mobileControls) {
        try { mobileControls.destroy(); } catch (e) { /* ignore */ }
        mobileControls = null;
    }
    if (currentGame) {
        try { currentGame.stop(); } catch (e) { /* ignore cleanup errors */ }
        currentGame = null;
    }
    if (scoreInterval) {
        clearInterval(scoreInterval);
        scoreInterval = null;
    }
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
    currentGameData = null;
}

function showGameError(containerEl, message) {
    containerEl.innerHTML = `
        <div class="game-error-box">
            <div class="game-error-icon">!</div>
            <h3>Fehler</h3>
            <p>${message}</p>
            <p class="text-secondary" style="font-size:0.8rem;">Versuche es mit "Neustart" oder gehe zurueck zum Katalog.</p>
        </div>
    `;
}

export function renderGame(container, router, gameId) {
    // Cleanup any previous game
    cleanup();

    // Lookup the game from registry first
    let game = GameRegistry.getGame(gameId);
    let isCustomGame = false;
    let customGameData = null;

    // If not found in registry, check custom games in localStorage
    if (!game) {
        const created = JSON.parse(localStorage.getItem('goblox_created_games') || '{}');
        customGameData = created[gameId];
        if (customGameData && customGameData.published) {
            isCustomGame = true;
            game = {
                id: gameId,
                name: customGameData.name || 'Benutzerdefiniertes Spiel',
                is3D: customGameData.template !== 'platformer-2d',
                category: 'Eigene Spiele',
                config: customGameData,
                templateName: null,
            };
        }
    }

    if (!game) {
        container.innerHTML = `
            <div class="game-page animate-fade-in">
                <div class="game-topbar">
                    <button class="btn btn-sm btn-secondary game-back" id="game-back">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Zuruck
                    </button>
                    <span class="game-title">Spiel nicht gefunden</span>
                    <span></span>
                </div>
                <div class="game-canvas-wrap" style="display:flex;align-items:center;justify-content:center;">
                    <p class="text-secondary">Dieses Spiel existiert nicht.</p>
                </div>
            </div>
        `;
        container.querySelector('#game-back')?.addEventListener('click', () => {
            router.navigate('#/games');
        });
        return;
    }

    currentGameData = game;
    const is3D = !!game.is3D;
    const mobile = isMobile();

    // Check if this game is in the user's favorites
    const user = Auth.currentUser();
    const isFav = user && user.favorites && user.favorites.includes(game.id);

    container.innerHTML = `
        <div class="game-page ${mobile ? 'game-page-mobile' : ''}">
            <!-- Top bar -->
            <div class="game-topbar">
                <button class="btn btn-sm btn-secondary game-back" id="game-back">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    ${mobile ? '' : 'Zuruck'}
                </button>
                <span class="game-title" title="${game.name}">${game.name}</span>
                <span class="game-score" id="game-score">Score: 0</span>
            </div>

            <!-- Canvas/3D area -->
            <div class="game-canvas-wrap" id="game-canvas-wrap">
                ${is3D
                    ? '<div id="game-3d-container" class="game-3d-container"></div>'
                    : '<canvas id="game-canvas"></canvas>'
                }
            </div>

            <!-- Bottom bar -->
            <div class="game-bottombar">
                <button class="btn btn-sm btn-secondary" id="game-fullscreen" title="Vollbild">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                    ${mobile ? '' : 'Vollbild'}
                </button>
                <button class="btn btn-sm btn-secondary" id="game-restart" title="Neustarten">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                    ${mobile ? '' : 'Neustart'}
                </button>
                <button class="btn btn-sm btn-secondary game-fav-btn ${isFav ? 'game-fav-active' : ''}" id="game-fav" title="Favorit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    ${mobile ? '' : 'Favorit'}
                </button>
            </div>

            <!-- Game over overlay (hidden by default) -->
            <div class="game-over-overlay hidden" id="game-over-overlay">
                <div class="game-over-box">
                    <h2 class="game-over-title">Game Over!</h2>
                    <p class="game-over-score" id="game-over-score">0</p>
                    <p class="game-over-label">Punkte</p>
                    <div class="gobux-reward hidden" id="gobux-reward">
                        <span class="gobux-reward-coin">${GOBUX_ICON}</span>
                        <span class="gobux-reward-text">Du hast <span class="gobux-reward-counter" id="gobux-reward-counter">0</span> GoBux verdient!</span>
                    </div>
                    <div class="game-over-actions">
                        <button class="btn" id="game-over-replay">Nochmal spielen</button>
                        <button class="btn btn-secondary" id="game-over-catalog">Zuruck zum Katalog</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // DOM refs
    const canvas = container.querySelector('#game-canvas');
    const container3D = container.querySelector('#game-3d-container');
    const canvasWrap = container.querySelector('#game-canvas-wrap');
    const scoreEl = container.querySelector('#game-score');
    const backBtn = container.querySelector('#game-back');
    const fullscreenBtn = container.querySelector('#game-fullscreen');
    const restartBtn = container.querySelector('#game-restart');
    const favBtn = container.querySelector('#game-fav');
    const overlay = container.querySelector('#game-over-overlay');
    const overScoreEl = container.querySelector('#game-over-score');
    const replayBtn = container.querySelector('#game-over-replay');
    const catalogBtn = container.querySelector('#game-over-catalog');

    // ── Canvas sizing (2D only) ─────────────────────────────────────────
    function sizeCanvas() {
        if (!canvas) return;
        const rect = canvasWrap.getBoundingClientRect();
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
    }

    if (!is3D) {
        sizeCanvas();
        resizeHandler = () => sizeCanvas();
        window.addEventListener('resize', resizeHandler);
    }

    // ── Helper: start score polling ──────────────────────────────────────
    function startScorePolling() {
        if (scoreInterval) clearInterval(scoreInterval);
        scoreInterval = setInterval(() => {
            if (currentGame && !currentGame.gameOver) {
                scoreEl.textContent = `Score: ${currentGame.score}`;
            }
        }, 100);
    }

    // ── Helper: finalize game instance after creation ────────────────────
    function finalizeGameStart() {
        currentGame.onGameOver = (score) => {
            showGameOver(score);
        };

        try {
            currentGame.start();
        } catch (err) {
            console.error('Game crashed on start:', err);
            showGameError(canvasWrap, 'Das Spiel ist unerwartet abgestuerzt.');
            currentGame = null;
            return;
        }

        // Set up mobile controls after game starts
        if (mobile && currentGame) {
            setupMobileControls();
        }

        startScorePolling();
    }

    // ── Start custom game (2D platformer or 3D obby) ────────────────────
    function startCustomGame() {
        if (customGameData.template === 'platformer-2d') {
            // 2D custom platformer
            import('../games/templates/custom-platformer-2d.js').then(({ CustomPlatformer2D }) => {
                sizeCanvas();
                try {
                    currentGame = new CustomPlatformer2D(canvas, {
                        theme: customGameData.settings?.theme || { primary: '#00ff87', secondary: '#60efff', bg: '#0a0a2e', name: 'Neon' },
                        gravity: customGameData.settings?.gravity || 1.0,
                        scrollSpeed: customGameData.settings?.scrollSpeed || 1.5,
                        objects: customGameData.objects || [],
                        scripts: customGameData.scripts || null,
                    });
                } catch (err) {
                    console.error('Failed to create custom 2D game:', err);
                    showGameError(canvasWrap, 'Das Spiel konnte nicht geladen werden.');
                    return;
                }
                finalizeGameStart();
            }).catch(err => {
                console.error('Failed to load CustomPlatformer2D module:', err);
                showGameError(canvasWrap, 'Das Spiel konnte nicht geladen werden.');
            });
        } else {
            // 3D custom game (obby-3d or similar)
            import('../games/templates/custom.js').then(({ CustomGame3D }) => {
                container3D.innerHTML = '';
                try {
                    currentGame = new CustomGame3D(container3D, customGameData);
                } catch (err) {
                    console.error('Failed to create custom 3D game:', err);
                    showGameError(canvasWrap, 'Das 3D-Spiel konnte nicht geladen werden.');
                    return;
                }
                finalizeGameStart();
            }).catch(err => {
                console.error('Failed to load CustomGame3D module:', err);
                showGameError(canvasWrap, 'Das 3D-Spiel konnte nicht geladen werden.');
            });
        }
    }

    // ── Start game ──────────────────────────────────────────────────────
    async function startGame() {
        overlay.classList.add('hidden');
        // Hide GoBux reward from previous round
        const rewardEl = container.querySelector('#gobux-reward');
        if (rewardEl) rewardEl.classList.add('hidden');

        // Cleanup previous mobile controls
        if (mobileControls) {
            mobileControls.destroy();
            mobileControls = null;
        }

        if (currentGame) {
            currentGame.stop();
            currentGame = null;
        }

        // ── Custom game path ──
        if (isCustomGame) {
            startCustomGame();
            return;
        }

        // ── Registry game path ──
        if (is3D) {
            // Clear container for fresh 3D game
            container3D.innerHTML = '';

            try {
                currentGame = await GameRegistry.createGameInstance(game, container3D);
            } catch (err) {
                console.error('Failed to create 3D game instance:', err);
                showGameError(canvasWrap, 'Das 3D-Spiel konnte nicht geladen werden.');
                return;
            }
        } else {
            sizeCanvas();

            try {
                currentGame = await GameRegistry.createGameInstance(game, canvas);
            } catch (err) {
                console.error('Failed to create game instance:', err);
                showGameError(canvasWrap, 'Das Spiel konnte nicht geladen werden.');
                return;
            }
        }

        finalizeGameStart();
    }

    // ── Mobile Controls Setup ────────────────────────────────────────────
    function setupMobileControls() {
        if (is3D) {
            // 3D games get joystick + camera touch + jump
            const tmplName = game.templateName || (isCustomGame ? 'custom' : null);
            mobileControls = new MobileControls3D(container3D, currentGame, tmplName);
            mobileControls.setup();
        } else {
            // 2D games get controls based on template type
            // Custom platformer-2d games use 'Platformer' control type (tap)
            const tmplName = game.templateName || (isCustomGame ? 'Platformer' : null);
            const controlType = getControlType(tmplName);
            mobileControls = new MobileControls(canvasWrap, currentGame, controlType);
            mobileControls.setup();
        }
    }

    // ── Game Over ───────────────────────────────────────────────────────
    function showGameOver(score) {
        scoreEl.textContent = `Score: ${score}`;
        overScoreEl.textContent = score.toLocaleString('de-DE');
        overlay.classList.remove('hidden');

        // Update user stats
        const u = Auth.currentUser();
        if (u) {
            const recentGames = u.recentGames || [];
            // Add to recent, keep last 20
            recentGames.unshift({ gameId: game.id, name: game.name, score, date: Date.now() });
            if (recentGames.length > 20) recentGames.length = 20;

            Auth.updateUser({
                gamesPlayed: (u.gamesPlayed || 0) + 1,
                totalScore: (u.totalScore || 0) + score,
                recentGames
            });

            // Calculate and award GoBux
            const category = game.category || '';
            const { earned, reason } = GoBux.calculateReward(category, score);
            GoBux.earn(u.id, earned, reason);

            // Show GoBux reward animation
            const rewardEl = container.querySelector('#gobux-reward');
            const counterEl = container.querySelector('#gobux-reward-counter');
            if (rewardEl && counterEl) {
                rewardEl.classList.remove('hidden');
                // Animate the counter counting up
                let current = 0;
                const step = Math.max(1, Math.ceil(earned / 20));
                const counterInterval = setInterval(() => {
                    current += step;
                    if (current >= earned) {
                        current = earned;
                        clearInterval(counterInterval);
                    }
                    counterEl.textContent = current;
                }, 50);
            }

            // Update sidebar balance if visible
            const sidebarBalance = document.querySelector('.sidebar-gobux-amount');
            if (sidebarBalance) {
                sidebarBalance.textContent = GoBux.getBalance(u.id).toLocaleString('de-DE');
            }
        }
    }

    // ── Event: Back ─────────────────────────────────────────────────────
    backBtn.addEventListener('click', () => {
        cleanup();
        router.navigate('#/games');
    });

    // ── Event: Fullscreen ───────────────────────────────────────────────
    fullscreenBtn.addEventListener('click', () => {
        const el = canvasWrap;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        } else {
            (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)
                ?.call(el)
                ?.catch(() => {});
        }
    });

    // Re-size canvas on fullscreen change
    function onFullscreenChange() {
        // Small delay to let the browser settle
        setTimeout(() => {
            if (!is3D) sizeCanvas();
        }, 100);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);

    // ── Event: Restart ──────────────────────────────────────────────────
    restartBtn.addEventListener('click', () => {
        startGame();
    });

    // ── Event: Favorite ─────────────────────────────────────────────────
    favBtn.addEventListener('click', () => {
        const u = Auth.currentUser();
        if (!u) return;

        let favs = u.favorites || [];
        const idx = favs.indexOf(game.id);
        if (idx >= 0) {
            favs.splice(idx, 1);
            favBtn.classList.remove('game-fav-active');
            favBtn.querySelector('svg').setAttribute('fill', 'none');
        } else {
            favs.push(game.id);
            favBtn.classList.add('game-fav-active');
            favBtn.querySelector('svg').setAttribute('fill', 'currentColor');
        }
        Auth.updateUser({ favorites: favs });
    });

    // ── Event: Replay ───────────────────────────────────────────────────
    replayBtn.addEventListener('click', () => {
        startGame();
    });

    // ── Event: Back to catalog ──────────────────────────────────────────
    catalogBtn.addEventListener('click', () => {
        cleanup();
        router.navigate('#/games');
    });

    // ── Cleanup on navigation ───────────────────────────────────────────
    // Store cleanup for external callers (router navigation)
    renderGame._cleanup = () => {
        cleanup();
        document.removeEventListener('fullscreenchange', onFullscreenChange);
    };

    // Start!
    startGame();
}
