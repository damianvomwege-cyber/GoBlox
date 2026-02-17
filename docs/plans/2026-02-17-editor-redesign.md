# GoBlox Editor Redesign — Template-Based Game Creation + Visual Scripting

**Date:** 2026-02-17
**Status:** Approved

## Problem

The current editor only creates 3D obby-style games (placing objects in a 3D world). GoBlox has 26 different game templates (platformer, shooter, racing, snake, etc.), but users cannot create games of these types. The editor needs to become a full game creation suite.

## Solution

A template-based creation system where users choose a game type, build levels with type-specific tools, and add custom logic with visual scripting blocks.

## Approach

Custom Block Engine (no external dependencies like Blockly). All blocks are purpose-built for GoBlox game mechanics, styled to match the dark theme.

## Target Templates (Phase 1)

1. **Platformer 2D** — 2D level editor with platforms, enemies, items
2. **Platformer 3D / Obby** — Existing 3D editor (enhanced)
3. **Shooter 3D** — 3D editor + weapons, enemy waves
4. **Racing** — Track editor with curves, obstacles, checkpoints
5. **Snake** — Rule-based settings editor
6. **Maze** — Maze generator with manual editing

## Editor UI

### Creation Flow

1. User clicks "Create" → Template selection screen with previews
2. User picks template → Editor opens with two tabs: **Build** and **Script**
3. Build tab: Template-specific level editor
4. Script tab: Full-screen visual block scripting
5. Live Preview: Exact in-game rendering (not just a schematic view)

### Build Tab Layout

```
┌──────────┬────────────────────────────┬──────────┐
│ PALETTE  │      LEVEL CANVAS          │PROPERTIES│
│ (left)   │  (center, scrollable)      │ (right)  │
│          │                            │          │
│ Template │  Live preview matching     │ Selected │
│ specific │  actual game rendering     │ object   │
│ objects  │                            │ settings │
└──────────┴────────────────────────────┴──────────┘
```

### Script Tab Layout

```
┌──────────┬────────────────────────────────────────┐
│ BLOCK    │        SCRIPT CANVAS                   │
│ PALETTE  │                                        │
│          │  Drag & drop blocks                    │
│ Events   │  Snap connections                      │
│ Actions  │  Zoom & pan                            │
│ Logic    │                                        │
│ Variables│  ┌──────────────────────────────────┐  │
│ Loops    │  │  OBJECT LIST (bottom-right)      │  │
│ Functions│  │  All placed objects for reference │  │
│          │  └──────────────────────────────────┘  │
└──────────┴────────────────────────────────────────┘
```

### Live Preview

The Build tab uses the actual game engine for rendering (not a simplified schematic). For Platformer 2D, the canvas shows the level exactly as it will appear in-game, with the same colors, parallax, and platform styles. A "Test" button runs the game inline with full controls.

## Block System

### Categories

**Events (yellow/gold, hat-shaped):**
- When game starts
- When player touches [object]
- When player leaves [object]
- When key [W/A/S/D/Space/E] pressed
- When timer [X] seconds expires
- When variable [X] changes
- When score [>=/<=/==] [value]
- When object [A] touches object [B]

**Actions (blue, standard puzzle):**
- Move [object] to position [X,Y,Z]
- Move [object] by [X,Y,Z] (relative)
- Rotate/scale [object]
- Show/hide [object]
- Change color of [object]
- Destroy [object]
- Spawn [object-type] at [X,Y,Z]
- Teleport player to [object/position]
- Give player [X] points
- Play sound [name]
- Show message [text]
- Wait [X] seconds
- Win / Lose game

**Conditions (orange, hexagonal input):**
- If [variable] [>=/<=/==/!=] [value]
- If player on ground
- If [object] visible
- If random [X]% chance
- AND / OR / NOT connectors

**Variables (green, rounded input):**
- Set [variable] to [value]
- Change [variable] by [value]
- Create variable (Number, Boolean, Text)

**Loops (purple, C-shaped wrap):**
- Repeat [X] times
- Repeat while [condition]
- For each object of type [type]

**Functions (pink):**
- Define function [name] (hat-shaped)
- Call function [name] (standard)

## Data Model

```json
{
  "id": "game_123456",
  "name": "My Platformer",
  "template": "platformer-2d",
  "settings": {
    "gravity": 1.0,
    "scrollSpeed": 1.5,
    "theme": { "primary": "#00ff87", "bg": "#0a0a2e" }
  },
  "level": {
    "objects": [
      { "type": "platform", "x": 0, "y": 400, "w": 200, "h": 20 },
      { "type": "coin", "x": 120, "y": 350, "id": "coin_1" },
      { "type": "enemy-patrol", "x": 300, "y": 380, "range": 100 }
    ]
  },
  "scripts": [
    {
      "id": "script_1",
      "trigger": { "type": "on_touch", "target": "coin_1" },
      "actions": [
        { "type": "add_score", "value": 10 },
        { "type": "destroy", "target": "self" }
      ]
    }
  ],
  "published": false,
  "creatorId": "user_abc",
  "createdAt": 1708000000000
}
```

## Script Runtime

1. On game start: register all script triggers as event listeners
2. During gameplay: when trigger fires, execute actions sequentially
3. Variables stored in `scriptState` object
4. Loops capped at 10,000 iterations (infinite loop protection)
5. `wait` actions use async scheduling

## Implementation Phases

### Phase 1: Template Selection & Data Structure
- Template selection screen with previews
- New data format (template + level + scripts)
- Router and storage updates

### Phase 2: Platformer 2D Level Editor
- 2D canvas with grid and live game-engine preview
- Place platforms, enemies, items via drag & drop
- Properties panel for object settings
- Scrolling for long levels
- Inline test mode using actual Platformer engine

### Phase 3: Visual Scripting Engine
- Block rendering (DOM-based, snap connections)
- Drag & drop with collision detection
- Block palette with all categories
- Script ↔ JSON serialization
- Script runtime for in-game execution

### Phase 4: Additional Template Editors
- Shooter 3D (extend existing 3D editor)
- Racing (track spline editor)
- Snake (rule settings editor)
- Maze (maze generator + manual editing)

### Phase 5: Polish
- Undo/redo for all editors
- Keyboard shortcuts
- Mobile optimization
- Tutorial/onboarding hints
