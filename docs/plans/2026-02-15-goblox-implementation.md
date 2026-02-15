# GoBlox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based gaming platform with 5,000 playable games, user accounts, blocky avatars, friends, leaderboards, and settings.

**Architecture:** Single Page Application with hash-based routing. ~25 canvas-based game templates with parameter variations generating 5,000 unique games. LocalStorage for all persistence. Modular JS with one file per game template.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Canvas API, LocalStorage, CSS Grid/Flexbox

---

## Phase 1: Foundation

### Task 1: Project Scaffold & Entry Point

**Files:**
- Create: `index.html`
- Create: `css/main.css`
- Create: `js/app.js`
- Create: `js/router.js`

**Step 1: Create index.html with SPA shell**

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GoBlox</title>
    <link rel="stylesheet" href="css/main.css">
</head>
<body>
    <div id="app">
        <nav id="sidebar" class="sidebar hidden"></nav>
        <main id="content"></main>
    </div>
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

**Step 2: Create CSS reset and base variables in `css/main.css`**

Define CSS custom properties for the dark gaming theme:
- `--bg-primary: #0f0f1a` (dark background)
- `--bg-secondary: #1a1a2e`
- `--bg-card: #16213e`
- `--accent-primary: #6c63ff` (purple)
- `--accent-secondary: #e94560` (red-pink)
- `--accent-gradient: linear-gradient(135deg, #6c63ff, #e94560)`
- `--text-primary: #ffffff`
- `--text-secondary: #a0a0b0`
- `--border-radius: 12px`
- Font: system-ui or 'Segoe UI'

Include base resets (box-sizing, margin 0, etc.), body full-height styling, `#app` as flex row, `#content` as flex-grow scroll area, `.sidebar` as fixed-width left column (240px), `.hidden` display none.

**Step 3: Create hash-based router in `js/router.js`**

```javascript
// js/router.js
export class Router {
    constructor() {
        this.routes = {};
        window.addEventListener('hashchange', () => this.resolve());
    }

    on(path, handler) {
        this.routes[path] = handler;
        return this;
    }

    resolve() {
        const hash = window.location.hash.slice(1) || '/';
        const [path, ...params] = hash.split('/').filter(Boolean);
        const route = '/' + (path || '');
        const handler = this.routes[route] || this.routes['/'];
        if (handler) handler(...params);
    }

    navigate(path) {
        window.location.hash = path;
    }
}
```

**Step 4: Create app.js entry point that initializes router**

```javascript
// js/app.js
import { Router } from './router.js';

const router = new Router();
const content = document.getElementById('content');

router
    .on('/', () => { content.innerHTML = '<h1>GoBlox</h1>'; })
    .resolve();
```

**Step 5: Verify** — Open `index.html` in browser. Dark background, "GoBlox" heading visible.

**Step 6: Commit** — `feat: project scaffold with SPA routing`

---

### Task 2: Auth Module (LocalStorage)

**Files:**
- Create: `js/auth.js`

**Step 1: Create auth module**

```javascript
// js/auth.js
const USERS_KEY = 'goblox_users';
const CURRENT_KEY = 'goblox_current_user';

export const Auth = {
    getUsers() {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    },

    register(name, birthday, password) {
        const users = this.getUsers();
        if (users.find(u => u.name.toLowerCase() === name.toLowerCase())) {
            return { error: 'Name ist schon vergeben!' };
        }
        const user = {
            id: crypto.randomUUID(),
            name,
            birthday,
            password, // Note: plain text, acceptable for LocalStorage-only demo
            avatar: { skin: '#ffb347', shirt: '#6c63ff', pants: '#333', hair: 0, accessory: 0 },
            createdAt: Date.now(),
            gamesPlayed: 0,
            totalScore: 0,
            favorites: []
        };
        users.push(user);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
        return { user };
    },

    login(name, password) {
        const users = this.getUsers();
        const user = users.find(u => u.name === name && u.password === password);
        if (!user) return { error: 'Name oder Passwort falsch!' };
        localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
        return { user };
    },

    currentUser() {
        return JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null');
    },

    logout() {
        localStorage.removeItem(CURRENT_KEY);
    },

    updateUser(updates) {
        const user = this.currentUser();
        if (!user) return;
        const updated = { ...user, ...updates };
        localStorage.setItem(CURRENT_KEY, JSON.stringify(updated));
        const users = this.getUsers().map(u => u.id === user.id ? updated : u);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return updated;
    },

    deleteAccount() {
        const user = this.currentUser();
        if (!user) return;
        const users = this.getUsers().filter(u => u.id !== user.id);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        this.logout();
    }
};
```

**Step 2: Verify** — Import in app.js, call `Auth.register('test', '2000-01-01', '123')` from console, check LocalStorage in DevTools.

**Step 3: Commit** — `feat: auth module with register/login/logout`

---

### Task 3: Login/Register Page

**Files:**
- Create: `js/pages/login.js`
- Create: `css/login.css`

**Step 1: Create login page renderer**

Build a page with:
- GoBlox logo/title at top (large, gradient text)
- Two tabs: "Anmelden" / "Registrieren"
- Register form: Name input, Birthday date-picker, Password input, Confirm Password, "Registrieren" button
- Login form: Name input, Password input, "Anmelden" button
- Error message area (red text)
- On success: `router.navigate('/home')`

Style with glass-morphism card centered on dark background. Inputs with dark backgrounds, light borders, white text. Button with gradient accent.

**Step 2: Wire into router in app.js**

```javascript
import { renderLogin } from './pages/login.js';
import { Auth } from './auth.js';

// Guard: redirect to login if not authenticated
function requireAuth(renderFn) {
    return (...args) => {
        if (!Auth.currentUser()) {
            router.navigate('/login');
            return;
        }
        document.getElementById('sidebar').classList.remove('hidden');
        renderFn(...args);
    };
}

router
    .on('/login', () => {
        document.getElementById('sidebar').classList.add('hidden');
        renderLogin(content, router);
    })
    .on('/', requireAuth(() => { /* home page placeholder */ }))
    .resolve();
```

**Step 3: Verify** — Register an account, see redirect to home. Refresh, still logged in. Logout, redirected to login.

**Step 4: Commit** — `feat: login/register page with form validation`

---

### Task 4: Sidebar Navigation

**Files:**
- Create: `js/components/sidebar.js`
- Create: `css/sidebar.css`

**Step 1: Create sidebar component**

Sidebar contains (top to bottom):
- GoBlox logo (small)
- User avatar (small canvas) + username
- Divider
- Nav items with SVG icons: Home, Spiele, Profil, Freunde, Rangliste, Einstellungen
- Bottom: Logout button

Each nav item is an `<a href="#/route">` with icon + label. Active item highlighted with accent color + left border.

**Step 2: Style sidebar**

Dark background (`--bg-secondary`), fixed width 240px, full height, flex column. Nav items: padding, hover effect, transition. Active state: left 3px accent border, brighter text.

**Step 3: Wire into app.js** — Call `renderSidebar()` after login, update active state on route change.

**Step 4: Verify** — Sidebar shows after login, navigation works, active state updates.

**Step 5: Commit** — `feat: sidebar navigation with icons and active states`

---

## Phase 2: Game Engine

### Task 5: Game Registry & Template Base Class

**Files:**
- Create: `js/games/registry.js`
- Create: `js/games/base-game.js`

**Step 1: Create base game class**

```javascript
// js/games/base-game.js
export class BaseGame {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.running = false;
        this.score = 0;
        this.animationFrame = null;
    }

    start() {
        this.running = true;
        this.init();
        this.loop();
    }

    stop() {
        this.running = false;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    }

    loop() {
        if (!this.running) return;
        this.update();
        this.render();
        this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    // Override in subclasses:
    init() {}
    update() {}
    render() {}
    onKeyDown(key) {}
    onKeyUp(key) {}
    onClick(x, y) {}
}
```

**Step 2: Create game registry**

```javascript
// js/games/registry.js
// Registry maps template names to { class, generateVariations() }
// generateVariations() returns array of { id, name, config, category, thumbnail }
// Each template generates ~150-300 variations

const templates = {};
const allGames = [];

export const GameRegistry = {
    registerTemplate(name, templateClass, variationGenerator) {
        templates[name] = { class: templateClass, generator: variationGenerator };
    },

    buildCatalog() {
        allGames.length = 0;
        let id = 1;
        for (const [name, tmpl] of Object.entries(templates)) {
            const variations = tmpl.generator();
            for (const v of variations) {
                allGames.push({ ...v, id: id++, templateName: name });
            }
        }
        return allGames;
    },

    getAllGames() {
        if (allGames.length === 0) this.buildCatalog();
        return allGames;
    },

    getGame(id) {
        return this.getAllGames().find(g => g.id === id);
    },

    createGameInstance(game, canvas) {
        const tmpl = templates[game.templateName];
        return new tmpl.class(canvas, game.config);
    },

    getCategories() {
        return [...new Set(this.getAllGames().map(g => g.category))];
    }
};
```

**Step 3: Commit** — `feat: base game class and game registry`

---

### Task 6-30: Game Templates (25 templates)

For each template, create `js/games/templates/<name>.js` that:
1. Extends `BaseGame`
2. Implements `init()`, `update()`, `render()`, keyboard/mouse handlers
3. Exports a variation generator function producing ~150-300 configs
4. Registers itself with `GameRegistry`

**Implement templates in this order (each is a separate task/commit):**

### Task 6: Platformer/Obby Template
**File:** `js/games/templates/platformer.js`

Side-scrolling platformer. Player jumps across platforms, avoids obstacles.
- Config params: `platformDensity`, `gapSize`, `gravity`, `speed`, `theme` (colors), `obstacles` (spikes/moving)
- Controls: Arrow keys / WASD, Space to jump
- Score: distance traveled
- ~300 variations by combining 5 themes x 4 difficulties x 3 speeds x 5 map seeds

### Task 7: Tycoon/Clicker Template
**File:** `js/games/templates/clicker.js`

Click to earn currency, buy upgrades that auto-generate currency.
- Config params: `theme` (Pizza, Space, Farm, Ocean, Candy...), `upgradePaths`, `baseRate`, `upgradeCount`
- Controls: Mouse click
- Score: total currency
- ~250 variations by combining 10 themes x 5 upgrade sets x 5 difficulty curves

### Task 8: Racing Template
**File:** `js/games/templates/racing.js`

Top-down racing. Car drives forward, dodge obstacles, stay on track.
- Config params: `trackWidth`, `speed`, `obstacleFrequency`, `curves`, `theme`
- Controls: Left/Right arrows
- Score: distance / time
- ~200 variations

### Task 9: Tower Defense Template
**File:** `js/games/templates/tower-defense.js`

Enemies walk a path, player places towers to stop them.
- Config params: `pathLayout`, `waveCount`, `towerTypes`, `enemySpeed`, `theme`
- Controls: Mouse click to place towers
- Score: waves survived
- ~200 variations

### Task 10: Match-3 Puzzle Template
**File:** `js/games/templates/match3.js`

Swap adjacent tiles to match 3+ in a row.
- Config params: `gridSize`, `colorCount`, `timeLimit`, `targetScore`, `theme`
- Controls: Mouse click + drag
- Score: matches made
- ~250 variations

### Task 11: Top-Down Shooter Template
**File:** `js/games/templates/shooter.js`

Player in center, enemies approach from edges. Shoot to survive.
- Config params: `enemySpeed`, `spawnRate`, `weaponType`, `arenaSize`, `theme`
- Controls: WASD move, mouse aim + click shoot
- Score: enemies defeated
- ~200 variations

### Task 12: Snake Template
**File:** `js/games/templates/snake.js`

Classic snake. Eat food, grow, don't hit walls or yourself.
- Config params: `speed`, `gridSize`, `wallMode` (wrap/die), `powerUps`, `theme`
- Controls: Arrow keys
- Score: length
- ~150 variations

### Task 13: Breakout Template
**File:** `js/games/templates/breakout.js`

Paddle + ball, break bricks. Classic Breakout/Arkanoid.
- Config params: `brickLayout`, `ballSpeed`, `paddleSize`, `powerUps`, `theme`
- Controls: Mouse move / Arrow keys
- Score: bricks broken
- ~200 variations

### Task 14: Memory Card Template
**File:** `js/games/templates/memory.js`

Flip cards to find matching pairs.
- Config params: `gridSize`, `pairCount`, `timeLimit`, `theme` (animals, emojis, shapes, space)
- Controls: Mouse click
- Score: pairs found / time
- ~200 variations

### Task 15: Quiz/Trivia Template
**File:** `js/games/templates/quiz.js`

Multiple choice questions. Answer correctly for points.
- Config params: `category` (math, geography, science, general, gaming), `difficulty`, `questionCount`, `timePerQuestion`
- Controls: Mouse click on answer
- Score: correct answers
- ~200 variations

### Task 16: Maze Template
**File:** `js/games/templates/maze.js`

Navigate through a generated maze to reach the exit.
- Config params: `size`, `visibility` (full/fog), `timeLimit`, `theme`
- Controls: Arrow keys / WASD
- Score: time to complete
- ~200 variations

### Task 17: Flappy-Style Template
**File:** `js/games/templates/flappy.js`

Tap/click to flap, avoid pipes/obstacles.
- Config params: `gapSize`, `pipeSpeed`, `gravity`, `theme`
- Controls: Space / Click
- Score: pipes passed
- ~150 variations

### Task 18: Tetris-Style Template
**File:** `js/games/templates/tetris.js`

Falling blocks, complete rows to clear.
- Config params: `speed`, `gridWidth`, `gridHeight`, `pieceSet`, `theme`
- Controls: Arrow keys, Space to drop
- Score: rows cleared
- ~150 variations

### Task 19: Whack-a-Mole Template
**File:** `js/games/templates/whack.js`

Moles pop up, click to whack them before they hide.
- Config params: `holeCount`, `popupSpeed`, `duration`, `decoyChance`, `theme`
- Controls: Mouse click
- Score: moles whacked
- ~150 variations

### Task 20: Rhythm/Timing Template
**File:** `js/games/templates/rhythm.js`

Notes fall, press keys when they hit the line.
- Config params: `bpm`, `laneCount`, `notePattern`, `difficulty`, `theme`
- Controls: DFJK keys (4 lanes)
- Score: perfect/good/miss hits
- ~150 variations

### Task 21: Fishing Template
**File:** `js/games/templates/fishing.js`

Cast line, wait for bite, click at right time to catch fish.
- Config params: `fishTypes`, `depth`, `difficulty`, `timeLimit`, `theme`
- Controls: Mouse click (timing)
- Score: fish caught / value
- ~100 variations

### Task 22: Cooking Template
**File:** `js/games/templates/cooking.js`

Drag ingredients to pot in correct order, time cooking.
- Config params: `recipes`, `timePressure`, `ingredientCount`, `theme`
- Controls: Mouse drag
- Score: dishes completed
- ~100 variations

### Task 23: Farming Template
**File:** `js/games/templates/farming.js`

Plant crops, water, harvest. Manage grid of farm plots.
- Config params: `plotCount`, `cropTypes`, `growSpeed`, `seasons`, `theme`
- Controls: Mouse click
- Score: harvest value
- ~100 variations

### Task 24: Word/Typing Template
**File:** `js/games/templates/word.js`

Words fall from top, type them before they hit bottom.
- Config params: `wordLength`, `fallSpeed`, `wordSet` (english, german, code), `theme`
- Controls: Keyboard typing
- Score: words completed
- ~150 variations

### Task 25: Drawing Template
**File:** `js/games/templates/drawing.js`

Draw the prompted object, simple drawing canvas with timer.
- Config params: `prompts`, `timeLimit`, `tools`, `theme`
- Controls: Mouse draw
- Score: completion (self-scored)
- ~100 variations

### Task 26: Survival Template
**File:** `js/games/templates/survival.js`

Top-down survival. Collect resources, avoid enemies, survive as long as possible.
- Config params: `mapSize`, `resourceDensity`, `enemyTypes`, `spawnRate`, `theme`
- Controls: WASD + mouse
- Score: time survived
- ~200 variations

### Task 27: Simon Says Template
**File:** `js/games/templates/simon.js`

Repeat the color/sound sequence. Gets longer each round.
- Config params: `colorCount`, `speed`, `maxRounds`, `theme`
- Controls: Mouse click on colored pads
- Score: rounds completed
- ~100 variations

### Task 28: Asteroid/Space Template
**File:** `js/games/templates/asteroid.js`

Spaceship dodges/shoots asteroids in space.
- Config params: `shipSpeed`, `asteroidCount`, `asteroidSpeed`, `powerUps`, `theme`
- Controls: Arrow keys + Space to shoot
- Score: asteroids destroyed
- ~150 variations

### Task 29: Bubble Shooter Template
**File:** `js/games/templates/bubble.js`

Aim and shoot bubbles to match 3+ same color.
- Config params: `colorCount`, `layout`, `bubbleSpeed`, `theme`
- Controls: Mouse aim + click
- Score: bubbles cleared
- ~150 variations

### Task 30: Catch/Dodge Template
**File:** `js/games/templates/catch.js`

Move character left/right to catch falling good items, dodge bad ones.
- Config params: `itemSpeed`, `itemTypes`, `playerSpeed`, `theme`
- Controls: Arrow keys / Mouse
- Score: items caught
- ~150 variations

**Each template commit message:** `feat: add <template-name> game template`

---

## Phase 3: Game Catalog & Game Page

### Task 31: Game Name & Thumbnail Generator

**Files:**
- Create: `js/games/name-generator.js`
- Create: `js/games/thumbnail.js`

**Step 1: Create name generator**

Generates unique game names by combining:
- Adjectives: "Cosmic", "Neon", "Turbo", "Epic", "Wild", "Crystal", "Shadow", "Golden", "Pixel", "Ultra"...
- Category nouns: "Obby", "Tycoon", "Racer", "Blaster", "Quest"...
- Suffixes: "X", "Pro", "Deluxe", "2000", "HD", "Remastered", Roman numerals...

Each variation generator should use this to create unique names for each game instance.

**Step 2: Create thumbnail generator**

Small canvas-rendered icons (200x200) using the game's theme colors and simple shapes representing the genre (e.g., car for racing, sword for combat, puzzle piece for puzzle). Generate as data URLs for fast rendering.

**Step 3: Commit** — `feat: game name and thumbnail generators`

---

### Task 32: Game Catalog Page

**Files:**
- Create: `js/pages/catalog.js`
- Create: `css/catalog.css`

**Step 1: Build catalog page**

Layout:
- Top bar: Search input + category filter dropdown
- Grid of game cards (CSS Grid, responsive: 2-6 columns)
- Each card: thumbnail, game name, category badge, simulated player count
- Infinite scroll or paginated (show 50 at a time, load more on scroll)
- Click card → navigate to `#/game/{id}`

**Step 2: Implement search and filter**

- Search: filter by game name (debounced input)
- Category filter: dropdown with all categories from `GameRegistry.getCategories()`
- Sort: Popular, Newest, Alphabetical

**Step 3: Style** — Cards with hover scale transform, gradient overlay on thumbnail, category color badges.

**Step 4: Verify** — Catalog shows 5,000 games, search works, filter works, pagination works.

**Step 5: Commit** — `feat: game catalog page with search and filters`

---

### Task 33: Game Play Page

**Files:**
- Create: `js/pages/game.js`
- Create: `css/game.css`

**Step 1: Build game page**

Layout:
- Top bar: Back button, game name, score display
- Full-width canvas (responsive sizing)
- Bottom: Fullscreen button, restart button
- Game Over overlay: score, "Nochmal" button, "Zurück" button

**Step 2: Wire game lifecycle**

```javascript
export function renderGame(container, router, gameId) {
    const game = GameRegistry.getGame(parseInt(gameId));
    // ... create canvas, instantiate game, handle start/stop/restart
}
```

**Step 3: Track game stats** — On game over, update user's `gamesPlayed` and `totalScore` in Auth.

**Step 4: Verify** — Navigate to a game, plays correctly, score updates, can go back.

**Step 5: Commit** — `feat: game play page with score tracking`

---

## Phase 4: Social & Profile

### Task 34: Avatar Editor

**Files:**
- Create: `js/components/avatar.js`
- Create: `js/pages/profile.js`
- Create: `css/profile.css`

**Step 1: Create avatar renderer**

Canvas-based function that draws a blocky pixel character from config:
```javascript
export function drawAvatar(ctx, config, x, y, size) {
    // Draw blocky character: head, body, arms, legs
    // config: { skin, shirt, pants, hair, accessory }
}
```

**Step 2: Build profile page**

- Large avatar preview (canvas)
- Color pickers: skin, shirt, pants
- Hair style selector (6 options, shown as small previews)
- Accessory selector: None, Hat, Glasses, Headband, Crown, Mask
- Stats section: Games played, total score, member since, favorites
- "Speichern" button → updates user via `Auth.updateUser()`

**Step 3: Verify** — Change avatar colors, save, see changes in sidebar.

**Step 4: Commit** — `feat: profile page with avatar editor`

---

### Task 35: Friends System

**Files:**
- Create: `js/friends.js`
- Create: `js/pages/friends.js`
- Create: `css/friends.css`

**Step 1: Create friends module**

LocalStorage-based friends list per user:
```javascript
// Key: goblox_friends_{userId}
// Value: [{ userId, addedAt }]
// Since this is local-only, "friends" are other registered users on same browser
```

**Step 2: Build friends page**

- "Freund hinzufügen" input (search by name from registered users)
- Friends list: avatar, name, simulated online status (random), "Entfernen" button
- Empty state: "Noch keine Freunde" message

**Step 3: Verify** — Register 2 accounts, add as friends, see in list.

**Step 4: Commit** — `feat: friends system with add/remove`

---

### Task 36: Leaderboard Page

**Files:**
- Create: `js/pages/leaderboard.js`
- Create: `css/leaderboard.css`

**Step 1: Build leaderboard page**

Tabs: "Top Spieler" | "Meistgespielt" | "Meine Stats"

- Top Spieler: sorted users by totalScore, show rank/avatar/name/score
- Meistgespielt: top games by play count (tracked in LocalStorage)
- Meine Stats: personal breakdown - games per category, best scores, time played

Style: Table/list with rank numbers, gold/silver/bronze for top 3.

**Step 2: Verify** — Play some games, see stats update on leaderboard.

**Step 3: Commit** — `feat: leaderboard with top players and stats`

---

### Task 37: Settings Page

**Files:**
- Create: `js/pages/settings.js`
- Create: `css/settings.css`

**Step 1: Build settings page**

Sections:
- **Sound:** Master volume slider (0-100), stored in settings
- **Theme:** Toggle Dark/Light mode (CSS class on body)
- **Sprache:** Dropdown DE/EN (future-proof, currently DE only)
- **Account:** "Account löschen" button with confirm dialog → `Auth.deleteAccount()`

**Step 2: Persist settings** — `goblox_settings_{userId}` in LocalStorage.

**Step 3: Verify** — Toggle theme, adjust volume, delete account works.

**Step 4: Commit** — `feat: settings page with theme and account management`

---

## Phase 5: Home & Polish

### Task 38: Home/Dashboard Page

**Files:**
- Create: `js/pages/home.js`
- Create: `css/home.css`

**Step 1: Build home page**

Layout sections:
- **Welcome banner:** "Willkommen zurück, {name}!" with avatar
- **Featured Games:** Horizontal scroll row of 10 highlighted games (random selection, changes daily based on date seed)
- **Kategorien:** Grid of category cards with icons, each linking to catalog filtered by that category
- **Zuletzt gespielt:** Row of recently played games (tracked in LocalStorage)
- **Empfohlen:** Random selection of games from categories user hasn't tried yet

**Step 2: Style** — Hero banner with gradient, horizontal scroll with snap, category cards with colored icons.

**Step 3: Verify** — Home shows personalized content, clicking games/categories navigates correctly.

**Step 4: Commit** — `feat: home dashboard with featured games and categories`

---

### Task 39: Final Polish & Integration

**Files:**
- Modify: all CSS files
- Modify: `js/app.js`

**Step 1: Add page transitions** — Fade in/out on route change.

**Step 2: Add loading states** — Skeleton screens while game catalog loads.

**Step 3: Responsive design** — Sidebar collapses to bottom bar on mobile. Game cards adjust grid columns.

**Step 4: Error handling** — 404 page for unknown routes, error boundaries for game crashes.

**Step 5: Final test** — Register account, customize avatar, browse catalog, play 3+ different game types, add friend, check leaderboard, change settings, logout, login again.

**Step 6: Commit** — `feat: polish with transitions, responsive design, and error handling`

---

## File Structure Summary

```
GoBlox/
├── index.html
├── css/
│   ├── main.css
│   ├── login.css
│   ├── sidebar.css
│   ├── catalog.css
│   ├── game.css
│   ├── profile.css
│   ├── friends.css
│   ├── leaderboard.css
│   ├── settings.css
│   └── home.css
├── js/
│   ├── app.js
│   ├── router.js
│   ├── auth.js
│   ├── friends.js
│   ├── components/
│   │   ├── sidebar.js
│   │   └── avatar.js
│   ├── pages/
│   │   ├── login.js
│   │   ├── home.js
│   │   ├── catalog.js
│   │   ├── game.js
│   │   ├── profile.js
│   │   ├── friends.js
│   │   ├── leaderboard.js
│   │   └── settings.js
│   └── games/
│       ├── base-game.js
│       ├── registry.js
│       ├── name-generator.js
│       ├── thumbnail.js
│       └── templates/
│           ├── platformer.js
│           ├── clicker.js
│           ├── racing.js
│           ├── tower-defense.js
│           ├── match3.js
│           ├── shooter.js
│           ├── snake.js
│           ├── breakout.js
│           ├── memory.js
│           ├── quiz.js
│           ├── maze.js
│           ├── flappy.js
│           ├── tetris.js
│           ├── whack.js
│           ├── rhythm.js
│           ├── fishing.js
│           ├── cooking.js
│           ├── farming.js
│           ├── word.js
│           ├── drawing.js
│           ├── survival.js
│           ├── simon.js
│           ├── asteroid.js
│           ├── bubble.js
│           └── catch.js
└── docs/
    └── plans/
        ├── 2026-02-15-goblox-design.md
        └── 2026-02-15-goblox-implementation.md
```
