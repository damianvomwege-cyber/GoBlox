// js/games/loader.js — Lazy template loading
import { GameRegistry } from './registry.js';

let ready = false;
let loading = null;

/**
 * Dynamically import all game templates and build the catalog.
 * Templates self-register via side effects when imported.
 * Returns a promise that resolves when the catalog is ready.
 */
export function initCatalog() {
    if (ready) return Promise.resolve();
    if (loading) return loading;

    loading = Promise.all([
        import('./templates/platformer.js'),
        import('./templates/clicker.js'),
        import('./templates/snake.js'),
        import('./templates/breakout.js'),
        import('./templates/flappy.js'),
        import('./templates/racing.js'),
        import('./templates/match3.js'),
        import('./templates/memory.js'),
        import('./templates/quiz.js'),
        import('./templates/maze.js'),
        import('./templates/shooter.js'),
        import('./templates/tower-defense.js'),
        import('./templates/tetris.js'),
        import('./templates/whack.js'),
        import('./templates/rhythm.js'),
        import('./templates/fishing.js'),
        import('./templates/cooking.js'),
        import('./templates/farming.js'),
        import('./templates/word.js'),
        import('./templates/drawing.js'),
        import('./templates/survival.js'),
        import('./templates/simon.js'),
        import('./templates/asteroid.js'),
        import('./templates/bubble.js'),
        import('./templates/catch.js'),
        import('./templates/custom.js'),
    ]).then(() => {
        GameRegistry.buildCatalog();
        ready = true;
    });

    return loading;
}

export { GameRegistry };
