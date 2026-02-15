import { GameRegistry } from '../games/loader.js';
import { Auth } from '../auth.js';

let currentGame = null;
let currentGameData = null;
let scoreInterval = null;
let resizeHandler = null;

function cleanup() {
    if (currentGame) {
        currentGame.stop();
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

export function renderGame(container, router, gameId) {
    // Cleanup any previous game
    cleanup();

    // Lookup the game
    const game = GameRegistry.getGame(gameId);
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

    // Check if this game is in the user's favorites
    const user = Auth.currentUser();
    const isFav = user && user.favorites && user.favorites.includes(game.id);

    container.innerHTML = `
        <div class="game-page">
            <!-- Top bar -->
            <div class="game-topbar">
                <button class="btn btn-sm btn-secondary game-back" id="game-back">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Zuruck
                </button>
                <span class="game-title" title="${game.name}">${game.name}</span>
                <span class="game-score" id="game-score">Score: 0</span>
            </div>

            <!-- Canvas area -->
            <div class="game-canvas-wrap" id="game-canvas-wrap">
                <canvas id="game-canvas"></canvas>
            </div>

            <!-- Bottom bar -->
            <div class="game-bottombar">
                <button class="btn btn-sm btn-secondary" id="game-fullscreen" title="Vollbild">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                    Vollbild
                </button>
                <button class="btn btn-sm btn-secondary" id="game-restart" title="Neustarten">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                    Neustart
                </button>
                <button class="btn btn-sm btn-secondary game-fav-btn ${isFav ? 'game-fav-active' : ''}" id="game-fav" title="Favorit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    Favorit
                </button>
            </div>

            <!-- Game over overlay (hidden by default) -->
            <div class="game-over-overlay hidden" id="game-over-overlay">
                <div class="game-over-box">
                    <h2 class="game-over-title">Game Over!</h2>
                    <p class="game-over-score" id="game-over-score">0</p>
                    <p class="game-over-label">Punkte</p>
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

    // ── Canvas sizing ───────────────────────────────────────────────────
    function sizeCanvas() {
        const rect = canvasWrap.getBoundingClientRect();
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
    }

    sizeCanvas();

    resizeHandler = () => {
        sizeCanvas();
    };
    window.addEventListener('resize', resizeHandler);

    // ── Start game ──────────────────────────────────────────────────────
    function startGame() {
        overlay.classList.add('hidden');

        if (currentGame) {
            currentGame.stop();
        }

        sizeCanvas();

        try {
            currentGame = GameRegistry.createGameInstance(game, canvas);
        } catch (err) {
            console.error('Failed to create game instance:', err);
            canvasWrap.innerHTML = `<p class="text-secondary" style="padding:2rem;">Fehler beim Laden des Spiels.</p>`;
            return;
        }

        // Set game over callback
        currentGame.onGameOver = (score) => {
            showGameOver(score);
        };

        currentGame.start();

        // Score polling
        if (scoreInterval) clearInterval(scoreInterval);
        scoreInterval = setInterval(() => {
            if (currentGame && !currentGame.gameOver) {
                scoreEl.textContent = `Score: ${currentGame.score}`;
            }
        }, 100);
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
        setTimeout(() => sizeCanvas(), 100);
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
