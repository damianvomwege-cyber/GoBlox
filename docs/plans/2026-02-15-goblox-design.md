# GoBlox — Game Platform Design

## Overview
GoBlox is a browser-based gaming platform with 5,000 playable games, user accounts, blocky avatars, and social features. Built as a pure HTML/CSS/JS web app with LocalStorage for persistence.

## Pages (8 total)
1. **Login/Register** — Name, birthday, password (no email). LocalStorage accounts.
2. **Home/Dashboard** — Featured games, recommendations, activity feed.
3. **Game Catalog** — 5,000 games as card grid. Filter by category, search bar.
4. **Game Page** — Canvas-based gameplay, fullscreen mode, back button.
5. **Profile** — Blocky avatar editor, stats, favorite games.
6. **Friends** — Add/remove friends, simulated online status.
7. **Settings** — Sound, theme (dark/light), language, delete account.
8. **Leaderboard** — Top players, most-played games, personal stats.

**Navigation:** Left sidebar with icons for all pages.

## Game Template System
~25 base templates with parameter variations = 5,000+ unique games.

| Template | Variations | ~Count |
|---|---|---|
| Platformer/Obby | Map layout, difficulty, obstacles, speed | 300 |
| Tycoon/Clicker | Theme, upgrade paths | 250 |
| Racing | Track, speed, opponents | 200 |
| Tower Defense | Waves, towers, map | 200 |
| Puzzle/Match-3 | Grid size, colors, time limit | 250 |
| Shooter (Top-Down) | Weapons, enemies, arena | 200 |
| Snake Variants | Speed, power-ups, map size | 150 |
| Breakout/Pong | Ball speed, paddle, bricks | 200 |
| Memory/Card | Card count, theme, time | 200 |
| Quiz/Trivia | Categories, difficulty | 200 |
| Maze/Labyrinth | Size, visibility, time | 200 |
| Flappy-Style | Gap size, speed, theme | 150 |
| Tetris-Style | Speed, grid, special blocks | 150 |
| Whack-a-Mole | Speed, targets, power-ups | 150 |
| Rhythm/Timing | BPM, patterns, difficulty | 150 |
| Fishing | Fish types, depth, equipment | 100 |
| Cooking | Recipes, time pressure, combos | 100 |
| Farming | Crops, seasons, upgrades | 100 |
| Word/Typing | Word length, speed, categories | 150 |
| Drawing/Art | Prompts, tools, time | 100 |
| Survival | Resources, enemies, maps | 200 |
| Simon Says | Sequence length, speed, colors | 100 |
| Asteroid/Space | Ship speed, asteroids, power-ups | 150 |
| Bubble Shooter | Colors, layouts, gravity | 150 |
| Catch/Dodge | Speed, object types, patterns | 150 |

Each game gets a unique generated name and color-scheme-based thumbnail.

## Avatar System
- Canvas-rendered blocky/pixel characters
- Customizable: skin color, shirt, pants, hair (5-6 styles), accessories (hat, glasses, etc.)
- Stored as JSON in LocalStorage

## Visual Style
- Dark background with vibrant primary colors
- Blue/purple gradient primary color
- Bold gaming-style typography
- Rounded cards with hover effects and shadows
- Smooth page transitions

## Tech Stack
- Pure HTML/CSS/JavaScript (no frameworks)
- Canvas API for games and avatar rendering
- LocalStorage for accounts, preferences, and game state
- CSS Grid/Flexbox for responsive layout
- Single Page Application with hash-based routing

## Data Storage (LocalStorage)
- `goblox_users` — Array of user accounts
- `goblox_current_user` — Currently logged-in user
- `goblox_friends_{userId}` — Friends list per user
- `goblox_stats_{userId}` — Game statistics per user
- `goblox_settings_{userId}` — User preferences
