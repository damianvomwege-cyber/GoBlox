// js/games/loader.js — Phased template loading for faster initial render
import { GameRegistry } from './registry.js';

let phase1Ready = false;
let phase2Ready = false;
let phase1Loading = null;
let phase2Loading = null;

// Phase 1: Most popular templates — loaded first for fast catalog display
const PHASE1_TEMPLATES = [
    () => import('./templates/platformer.js'),
    () => import('./templates/snake.js'),
    () => import('./templates/shooter.js'),
    () => import('./templates/racing.js'),
    () => import('./templates/flappy.js'),
    () => import('./templates/maze.js'),
    () => import('./templates/breakout.js'),
    () => import('./templates/clicker.js'),
    () => import('./templates/obby.js'),
    () => import('./templates/tycoon.js'),
];

// Phase 2: Remaining templates — loaded in background batches
const PHASE2_TEMPLATES = [
    () => import('./templates/match3.js'),
    () => import('./templates/memory.js'),
    () => import('./templates/quiz.js'),
    () => import('./templates/tower-defense.js'),
    () => import('./templates/tetris.js'),
    () => import('./templates/whack.js'),
    () => import('./templates/rhythm.js'),
    () => import('./templates/fishing.js'),
    () => import('./templates/cooking.js'),
    () => import('./templates/farming.js'),
    () => import('./templates/word.js'),
    () => import('./templates/drawing.js'),
    () => import('./templates/survival.js'),
    () => import('./templates/simon.js'),
    () => import('./templates/asteroid.js'),
    () => import('./templates/bubble.js'),
    () => import('./templates/catch.js'),
    () => import('./templates/custom.js'),
];

/**
 * Phase 1: Load essential templates and build initial catalog.
 * Returns a promise that resolves when the initial catalog is ready.
 * Phase 2 templates are loaded in the background after phase 1 completes.
 */
export function initCatalog() {
    if (phase1Ready) return Promise.resolve();
    if (phase1Loading) return phase1Loading;

    phase1Loading = Promise.all(PHASE1_TEMPLATES.map(fn => fn())).then(() => {
        GameRegistry.buildCatalog();
        phase1Ready = true;

        // Start phase 2 in background (non-blocking)
        if (!phase2Loading) {
            phase2Loading = loadPhase2();
        }
    });

    return phase1Loading;
}

/**
 * Load remaining templates in small batches to avoid blocking the main thread.
 * Rebuilds the catalog after each batch so new games appear progressively.
 */
async function loadPhase2() {
    const BATCH_SIZE = 4;
    for (let i = 0; i < PHASE2_TEMPLATES.length; i += BATCH_SIZE) {
        const batch = PHASE2_TEMPLATES.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(fn => fn()));
        // Rebuild catalog after each batch so new games appear
        GameRegistry.buildCatalog();
    }
    phase2Ready = true;
}

/**
 * Ensure ALL templates are loaded (both phases).
 * Use this when you need the complete catalog (e.g., before playing a game
 * whose template may not be in phase 1).
 */
export function ensureAllTemplates() {
    if (phase2Ready) return Promise.resolve();
    if (phase2Loading) return phase2Loading;
    // If phase 1 hasn't started, start everything
    if (!phase1Loading) {
        return initCatalog().then(() => phase2Loading);
    }
    return phase1Loading.then(() => phase2Loading);
}

export { GameRegistry };
