// js/games/loader.js
// Import all templates to trigger their self-registration
import './templates/platformer.js';
import './templates/clicker.js';
import './templates/snake.js';
import './templates/breakout.js';
import './templates/flappy.js';
import './templates/racing.js';
import './templates/match3.js';
import './templates/memory.js';
import './templates/quiz.js';
import './templates/maze.js';
import './templates/shooter.js';
import './templates/tower-defense.js';
import './templates/tetris.js';
import './templates/whack.js';
import './templates/rhythm.js';
import './templates/fishing.js';
import './templates/cooking.js';
import './templates/farming.js';
import './templates/word.js';
import './templates/drawing.js';
import './templates/survival.js';
import './templates/simon.js';
import './templates/asteroid.js';
import './templates/bubble.js';
import './templates/catch.js';
import './templates/custom.js';

import { GameRegistry } from './registry.js';

// Build the catalog once all templates are registered
GameRegistry.buildCatalog();

export { GameRegistry };
