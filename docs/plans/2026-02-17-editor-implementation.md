# Editor Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the GoBlox editor from a 3D-only obby builder into a multi-template game creation suite with live preview and visual scripting.

**Architecture:** Template selection screen leads into a template-specific Build tab (2D canvas for platformer, existing 3D editor for obby/shooter) plus a Script tab with a custom block-based visual scripting engine. Games are saved with a `template` field and played by the corresponding engine. The custom game player (`custom.js`) is extended to support 2D templates and script execution.

**Tech Stack:** Vanilla JS (ES6 modules), Three.js (3D), Canvas API (2D), CSS Grid, LocalStorage.

---

## Task 1: Template Selection Screen

**Files:**
- Modify: `js/pages/create.js` (entry point, lines 340-400)
- Modify: `css/create.css` (add template picker styles)

**Step 1: Add template picker HTML to renderCreate()**

At the top of `renderCreate()`, before the editor DOM is built, render a template selection screen. When a template is chosen, proceed to the editor.

```javascript
// In renderCreate(), replace the immediate editor build with:
function showTemplatePicker() {
    container.innerHTML = '';
    container.style.padding = '2rem';

    const TEMPLATES = [
        { id: 'obby-3d', name: 'Obby 3D', desc: 'Platziere Plattformen in einer 3D-Welt', icon: '🏗️', color: '#6c63ff' },
        { id: 'platformer-2d', name: 'Platformer 2D', desc: 'Baue ein Side-Scrolling Level', icon: '🎮', color: '#00ff87' },
        { id: 'shooter-3d', name: 'Shooter 3D', desc: 'Erstelle eine 3D Arena mit Gegnern', icon: '🔫', color: '#e94560' },
        { id: 'racing', name: 'Racing', desc: 'Designe eine Rennstrecke', icon: '🏎️', color: '#f0a030' },
        { id: 'snake', name: 'Snake', desc: 'Konfiguriere dein Snake-Spiel', icon: '🐍', color: '#44cc44' },
        { id: 'maze', name: 'Maze', desc: 'Baue ein Labyrinth mit Fallen', icon: '🔲', color: '#4ab4f0' },
    ];

    const wrap = document.createElement('div');
    wrap.className = 'template-picker';
    wrap.innerHTML = `
        <h1 class="template-picker-title">Neues Spiel erstellen</h1>
        <p class="template-picker-sub">Waehle einen Spieltyp als Grundlage</p>
        <div class="template-picker-grid">
            ${TEMPLATES.map(t => `
                <button class="template-card" data-template="${t.id}" style="--card-accent:${t.color}">
                    <div class="template-card-icon">${t.icon}</div>
                    <div class="template-card-name">${t.name}</div>
                    <div class="template-card-desc">${t.desc}</div>
                </button>
            `).join('')}
        </div>
        <div style="text-align:center;margin-top:1.5rem">
            <a href="#/home" class="admin-btn">Zurueck</a>
        </div>
    `;

    wrap.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const templateId = card.dataset.template;
            startEditor(templateId);
        });
    });

    container.appendChild(wrap);
}
```

**Step 2: Add template picker CSS to create.css**

```css
/* ── Template Picker ────────────────────────────────────────────── */
.template-picker {
    max-width: 900px;
    margin: 0 auto;
    animation: fadeIn 0.3s ease;
}
.template-picker-title {
    font-size: 2rem;
    font-weight: 800;
    text-align: center;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.25rem;
}
.template-picker-sub {
    text-align: center;
    color: var(--text-secondary);
    margin-bottom: 2rem;
}
.template-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
}
.template-card {
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: 14px;
    padding: 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}
.template-card:hover {
    border-color: var(--card-accent);
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.template-card-icon { font-size: 2.5rem; }
.template-card-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
}
.template-card-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
}
```

**Step 3: Wire up startEditor() to branch by template**

```javascript
function startEditor(templateId) {
    container.style.padding = '0';
    if (templateId === 'obby-3d' || templateId === 'shooter-3d') {
        buildEditor3D(templateId); // existing 3D editor logic
    } else if (templateId === 'platformer-2d') {
        buildEditorPlatformer2D();
    } else if (templateId === 'snake' || templateId === 'racing' || templateId === 'maze') {
        buildEditorRuleBased(templateId);
    }
}
```

The existing `renderCreate()` body (lines 380-1403) becomes `buildEditor3D()`. This is a refactor — extract the existing code into a named function.

**Step 4: Update data model — add `template` field to saved games**

In `saveGame()` (line 1025), add `template: currentTemplate` to the saved object alongside existing fields.

**Step 5: Verify and commit**

Navigate to `#/create`, confirm template picker shows. Click "Obby 3D" and confirm existing editor loads. Check that saved games include the `template` field.

```bash
git add js/pages/create.js css/create.css
git commit -m "feat(editor): add template selection screen"
```

---

## Task 2: Platformer 2D Level Editor — Canvas & Grid

**Files:**
- Modify: `js/pages/create.js` (add `buildEditorPlatformer2D()`)
- Modify: `css/create.css` (2D editor layout styles)

**Step 1: Create the 2D editor DOM layout**

```javascript
function buildEditorPlatformer2D() {
    // Editor state
    let objects2D = [];    // { id, type, x, y, w, h, color, behavior }
    let selectedId = null;
    let activeTool = null;
    let cameraX = 0;       // horizontal scroll offset
    let gridSnap = 20;     // snap to 20px grid
    let undoStack = [];
    let canvas, ctx;
    let gameSettings = {
        name: 'Mein Platformer',
        gravity: 1.0,
        scrollSpeed: 1.5,
        theme: themes[0], // from platformer.js themes
        skyColor: '#0a0a2e'
    };

    container.innerHTML = `
        <div class="editor-2d">
            <div class="editor-toolbar">
                <button class="editor-btn" id="ed2d-back">← Zurueck</button>
                <div class="editor-tabs">
                    <button class="editor-tab active" data-tab="build">Build</button>
                    <button class="editor-tab" data-tab="script">Script</button>
                </div>
                <div class="editor-toolbar-right">
                    <button class="editor-btn" id="ed2d-undo">Rueckgaengig</button>
                    <button class="editor-btn" id="ed2d-test">▶ Testen</button>
                    <button class="editor-btn primary" id="ed2d-save">Speichern</button>
                    <button class="editor-btn accent" id="ed2d-publish">Veroeffentlichen</button>
                </div>
            </div>
            <div class="editor-body" id="ed2d-build-tab">
                <div class="editor-palette" id="ed2d-palette"></div>
                <div class="editor-canvas-wrap">
                    <canvas id="ed2d-canvas"></canvas>
                    <div class="editor-canvas-hint">Rechtsklick + Ziehen = Scrollen | Mausrad = Zoom</div>
                </div>
                <div class="editor-props" id="ed2d-props">
                    <div class="editor-props-empty">Klicke ein Objekt zum Bearbeiten</div>
                </div>
            </div>
            <div class="editor-body hidden" id="ed2d-script-tab">
                <div class="script-placeholder">Visual Scripting (kommt in Phase 3)</div>
            </div>
            <div class="editor-settings-bar" id="ed2d-settings"></div>
        </div>
    `;
    // ... (continued in step 2)
}
```

**Step 2: Implement 2D object types for the palette**

```javascript
const OBJECTS_2D = {
    // Terrain
    platform:     { name: 'Plattform', icon: '▬', cat: 'Terrain', w: 120, h: 20, color: '#60efff' },
    ground:       { name: 'Boden', icon: '▰', cat: 'Terrain', w: 200, h: 30, color: '#60efff' },
    wall:         { name: 'Wand', icon: '▮', cat: 'Terrain', w: 20, h: 80, color: '#60efff' },
    ramp:         { name: 'Rampe', icon: '◢', cat: 'Terrain', w: 80, h: 40, color: '#60efff' },
    // Hazards
    spike:        { name: 'Stachel', icon: '▲', cat: 'Gefahren', w: 20, h: 20, color: '#ff4444' },
    lava:         { name: 'Lava', icon: '🔥', cat: 'Gefahren', w: 80, h: 20, color: '#ff6b35' },
    kill_zone:    { name: 'Todeszone', icon: '☠', cat: 'Gefahren', w: 60, h: 20, color: '#ff0000' },
    // Gameplay
    spawn:        { name: 'Spawn', icon: '⚑', cat: 'Gameplay', w: 24, h: 36, color: '#00ff87' },
    goal:         { name: 'Ziel', icon: '★', cat: 'Gameplay', w: 30, h: 40, color: '#ffd700' },
    checkpoint:   { name: 'Checkpoint', icon: '⚐', cat: 'Gameplay', w: 20, h: 30, color: '#4ab4f0' },
    bounce_pad:   { name: 'Sprungfeld', icon: '⬆', cat: 'Gameplay', w: 40, h: 10, color: '#ff69b4' },
    // Collectibles
    coin:         { name: 'Muenze', icon: '●', cat: 'Items', w: 14, h: 14, color: '#ffd700' },
    gem:          { name: 'Edelstein', icon: '◆', cat: 'Items', w: 16, h: 16, color: '#c084fc' },
    star:         { name: 'Stern', icon: '★', cat: 'Items', w: 18, h: 18, color: '#ffcc00' },
    // Enemies
    enemy_patrol: { name: 'Patrouille', icon: '👾', cat: 'Gegner', w: 24, h: 24, color: '#e94560', behaviors: { speed: { label: 'Speed', type: 'number', default: 60 }, range: { label: 'Reichweite', type: 'number', default: 100 } } },
    enemy_chase:  { name: 'Verfolger', icon: '👹', cat: 'Gegner', w: 24, h: 24, color: '#ff4444', behaviors: { speed: { label: 'Speed', type: 'number', default: 80 }, range: { label: 'Sichtweite', type: 'number', default: 200 } } },
};
```

**Step 3: Render palette with categories**

```javascript
function renderPalette2D() {
    const palette = document.getElementById('ed2d-palette');
    const cats = {};
    for (const [key, def] of Object.entries(OBJECTS_2D)) {
        (cats[def.cat] = cats[def.cat] || []).push({ key, ...def });
    }
    let html = '';
    for (const [cat, items] of Object.entries(cats)) {
        html += `<div class="palette-cat">${cat}</div>`;
        for (const item of items) {
            html += `<button class="palette-item" data-tool="${item.key}">
                <span class="palette-icon">${item.icon}</span>
                <span class="palette-label">${item.name}</span>
            </button>`;
        }
    }
    palette.innerHTML = html;
    palette.querySelectorAll('.palette-item').forEach(btn => {
        btn.addEventListener('click', () => {
            palette.querySelectorAll('.palette-item').forEach(b => b.classList.remove('active'));
            if (activeTool === btn.dataset.tool) {
                activeTool = null;
            } else {
                activeTool = btn.dataset.tool;
                btn.classList.add('active');
            }
            selectedId = null;
            renderProperties2D();
        });
    });
}
```

**Step 4: Set up canvas with proper sizing and render loop**

```javascript
canvas = document.getElementById('ed2d-canvas');
ctx = canvas.getContext('2d');

function resizeCanvas() {
    const wrap = canvas.parentElement;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function render2D() {
    const W = canvas.width, H = canvas.height;

    // Background (matches actual game)
    ctx.fillStyle = gameSettings.theme.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const startX = Math.floor(cameraX / gridSnap) * gridSnap;
    for (let x = startX; x < cameraX + W; x += gridSnap) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSnap) {
        ctx.beginPath(); ctx.moveTo(cameraX, y); ctx.lineTo(cameraX + W, y); ctx.stroke();
    }

    // Render objects (live preview matching actual game rendering)
    for (const obj of objects2D) {
        renderObject2D(ctx, obj, obj.id === selectedId);
    }

    // Ghost preview for active tool
    if (activeTool && ghostPos) {
        ctx.globalAlpha = 0.4;
        const def = OBJECTS_2D[activeTool];
        ctx.fillStyle = def.color;
        ctx.fillRect(ghostPos.x, ghostPos.y, def.w, def.h);
        ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Selection highlight
    if (selectedId) {
        const obj = objects2D.find(o => o.id === selectedId);
        if (obj) {
            ctx.save();
            ctx.translate(-cameraX, 0);
            ctx.strokeStyle = '#00ff87';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(obj.x - 2, obj.y - 2, obj.w + 4, obj.h + 4);
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    animFrame = requestAnimationFrame(render2D);
}
render2D();
```

**Step 5: Verify and commit**

Navigate to `#/create`, pick "Platformer 2D". Confirm:
- Canvas renders with dark background and grid
- Palette shows all object categories
- Selecting a tool highlights it

```bash
git add js/pages/create.js css/create.css
git commit -m "feat(editor): platformer 2D canvas, grid, and palette"
```

---

## Task 3: Platformer 2D — Object Placement & Manipulation

**Files:**
- Modify: `js/pages/create.js` (mouse handlers, object CRUD)

**Step 1: Implement mouse interaction for placement and selection**

```javascript
let ghostPos = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let isPanning = false;
let panStartX = 0;
let uidCounter = 0;

function snap(v) { return Math.round(v / gridSnap) * gridSnap; }
function uid() { return 'obj_' + (++uidCounter) + '_' + Date.now(); }

function canvasToWorld(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left + cameraX,
        y: e.clientY - rect.top
    };
}

function objectAt(wx, wy) {
    // Reverse order for top-most first
    for (let i = objects2D.length - 1; i >= 0; i--) {
        const o = objects2D[i];
        if (wx >= o.x && wx <= o.x + o.w && wy >= o.y && wy <= o.y + o.h) return o;
    }
    return null;
}

canvas.addEventListener('mousedown', (e) => {
    const { x, y } = canvasToWorld(e);

    if (e.button === 2) {
        // Right-click: pan
        isPanning = true;
        panStartX = e.clientX + cameraX;
        e.preventDefault();
        return;
    }

    if (activeTool) {
        // Place new object
        const def = OBJECTS_2D[activeTool];
        const obj = {
            id: uid(),
            type: activeTool,
            x: snap(x - def.w / 2),
            y: snap(y - def.h / 2),
            w: def.w,
            h: def.h,
            color: def.color,
            behavior: {}
        };
        if (def.behaviors) {
            for (const [k, v] of Object.entries(def.behaviors)) {
                obj.behavior[k] = v.default;
            }
        }
        objects2D.push(obj);
        undoStack.push({ action: 'add', id: obj.id, data: { ...obj } });
        selectedId = obj.id;
        renderProperties2D();
        return;
    }

    // Try to select/drag existing object
    const hit = objectAt(x, y);
    if (hit) {
        selectedId = hit.id;
        isDragging = true;
        dragOffset.x = x - hit.x;
        dragOffset.y = y - hit.y;
        renderProperties2D();
    } else {
        selectedId = null;
        renderProperties2D();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const { x, y } = canvasToWorld(e);

    if (isPanning) {
        cameraX = panStartX - e.clientX;
        return;
    }

    if (activeTool) {
        const def = OBJECTS_2D[activeTool];
        ghostPos = { x: snap(x - def.w / 2), y: snap(y - def.h / 2) };
        return;
    }

    if (isDragging && selectedId) {
        const obj = objects2D.find(o => o.id === selectedId);
        if (obj) {
            obj.x = snap(x - dragOffset.x);
            obj.y = snap(y - dragOffset.y);
        }
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDragging && selectedId) {
        // Record position for undo
        isDragging = false;
        renderProperties2D();
    }
    isPanning = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Scroll to zoom (not needed for 2D, use for horizontal scroll)
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraX += e.deltaY;
}, { passive: false });
```

**Step 2: Implement keyboard shortcuts**

```javascript
window.addEventListener('keydown', (e) => {
    if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedId) {
            const idx = objects2D.findIndex(o => o.id === selectedId);
            if (idx >= 0) {
                const removed = objects2D.splice(idx, 1)[0];
                undoStack.push({ action: 'remove', id: removed.id, data: { ...removed } });
                selectedId = null;
                renderProperties2D();
            }
        }
    }
    if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault();
        performUndo2D();
    }
    if (e.ctrlKey && e.code === 'KeyD') {
        e.preventDefault();
        if (selectedId) {
            const obj = objects2D.find(o => o.id === selectedId);
            if (obj) {
                const dup = { ...obj, id: uid(), x: obj.x + 40, behavior: { ...obj.behavior } };
                objects2D.push(dup);
                undoStack.push({ action: 'add', id: dup.id, data: { ...dup } });
                selectedId = dup.id;
                renderProperties2D();
            }
        }
    }
    if (e.code === 'Escape') {
        activeTool = null;
        ghostPos = null;
        selectedId = null;
        document.querySelectorAll('.palette-item').forEach(b => b.classList.remove('active'));
        renderProperties2D();
    }
});
```

**Step 3: Implement undo**

```javascript
function performUndo2D() {
    if (undoStack.length === 0) return;
    const entry = undoStack.pop();
    if (entry.action === 'add') {
        const idx = objects2D.findIndex(o => o.id === entry.id);
        if (idx >= 0) objects2D.splice(idx, 1);
        if (selectedId === entry.id) { selectedId = null; renderProperties2D(); }
    } else if (entry.action === 'remove') {
        objects2D.push({ ...entry.data });
    }
}
```

**Step 4: Verify and commit**

Test: place platforms, coins, enemies. Drag objects. Undo. Delete. Duplicate with Ctrl+D. Right-click pan. Scroll with mouse wheel.

```bash
git add js/pages/create.js
git commit -m "feat(editor): 2D object placement, selection, drag, undo"
```

---

## Task 4: Platformer 2D — Properties Panel & Settings Bar

**Files:**
- Modify: `js/pages/create.js` (properties panel rendering)

**Step 1: Implement renderProperties2D()**

```javascript
function renderProperties2D() {
    const panel = document.getElementById('ed2d-props');
    if (!selectedId) {
        panel.innerHTML = '<div class="editor-props-empty">Klicke ein Objekt zum Bearbeiten</div>';
        return;
    }
    const obj = objects2D.find(o => o.id === selectedId);
    if (!obj) return;
    const def = OBJECTS_2D[obj.type];

    let html = `<h3 class="props-title">${def.icon} ${def.name}</h3>`;
    html += `<div class="props-group"><label>Position</label>
        <div class="props-row">
            <span>X</span><input type="number" data-prop="x" value="${obj.x}" step="${gridSnap}">
            <span>Y</span><input type="number" data-prop="y" value="${obj.y}" step="${gridSnap}">
        </div></div>`;
    html += `<div class="props-group"><label>Groesse</label>
        <div class="props-row">
            <span>B</span><input type="number" data-prop="w" value="${obj.w}" step="${gridSnap}" min="10">
            <span>H</span><input type="number" data-prop="h" value="${obj.h}" step="${gridSnap}" min="10">
        </div></div>`;
    html += `<div class="props-group"><label>Farbe</label>
        <input type="color" data-prop="color" value="${obj.color}"></div>`;

    // Behavior properties
    if (def.behaviors) {
        for (const [key, beh] of Object.entries(def.behaviors)) {
            const val = obj.behavior[key] ?? beh.default;
            html += `<div class="props-group"><label>${beh.label}</label>
                <input type="${beh.type}" data-beh="${key}" value="${val}"></div>`;
        }
    }

    html += `<button class="admin-btn danger" id="ed2d-delete" style="margin-top:1rem;width:100%">Loeschen</button>`;
    panel.innerHTML = html;

    // Bind inputs
    panel.querySelectorAll('input[data-prop]').forEach(inp => {
        inp.addEventListener('input', () => {
            const prop = inp.dataset.prop;
            if (prop === 'color') { obj.color = inp.value; }
            else { obj[prop] = parseFloat(inp.value) || 0; }
        });
    });
    panel.querySelectorAll('input[data-beh]').forEach(inp => {
        inp.addEventListener('input', () => {
            obj.behavior[inp.dataset.beh] = parseFloat(inp.value) || inp.value;
        });
    });
    panel.querySelector('#ed2d-delete')?.addEventListener('click', () => {
        const idx = objects2D.findIndex(o => o.id === selectedId);
        if (idx >= 0) {
            const removed = objects2D.splice(idx, 1)[0];
            undoStack.push({ action: 'remove', id: removed.id, data: { ...removed } });
            selectedId = null;
            renderProperties2D();
        }
    });
}
```

**Step 2: Implement settings bar**

```javascript
function renderSettingsBar2D() {
    const bar = document.getElementById('ed2d-settings');
    bar.innerHTML = `
        <label>Name <input type="text" id="ed2d-name" value="${gameSettings.name}" maxlength="40"></label>
        <label>Gravitation <input type="range" id="ed2d-gravity" min="0.3" max="2" step="0.1" value="${gameSettings.gravity}">
            <span id="ed2d-gravity-val">${gameSettings.gravity}</span></label>
        <label>Scroll-Speed <input type="range" id="ed2d-speed" min="0.5" max="3" step="0.1" value="${gameSettings.scrollSpeed}">
            <span id="ed2d-speed-val">${gameSettings.scrollSpeed}</span></label>
        <label>Theme <select id="ed2d-theme">
            ${themes.map((t, i) => `<option value="${i}" ${t === gameSettings.theme ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select></label>
    `;
    bar.querySelector('#ed2d-name').addEventListener('input', e => gameSettings.name = e.target.value);
    bar.querySelector('#ed2d-gravity').addEventListener('input', e => {
        gameSettings.gravity = parseFloat(e.target.value);
        bar.querySelector('#ed2d-gravity-val').textContent = e.target.value;
    });
    bar.querySelector('#ed2d-speed').addEventListener('input', e => {
        gameSettings.scrollSpeed = parseFloat(e.target.value);
        bar.querySelector('#ed2d-speed-val').textContent = e.target.value;
    });
    bar.querySelector('#ed2d-theme').addEventListener('change', e => {
        gameSettings.theme = themes[parseInt(e.target.value)];
    });
}
```

**Step 3: Verify and commit**

Select an object, confirm properties show. Change position/size/color, confirm live update on canvas. Change settings, confirm they persist.

```bash
git add js/pages/create.js
git commit -m "feat(editor): 2D properties panel and game settings bar"
```

---

## Task 5: Platformer 2D — Live Preview Rendering

**Files:**
- Modify: `js/pages/create.js` (renderObject2D function)

**Step 1: Implement game-accurate object rendering**

The 2D canvas should render objects exactly as they appear in the actual game. This means using the same visual style as the Platformer2D template.

```javascript
function renderObject2D(ctx, obj, isSelected) {
    const t = gameSettings.theme;

    switch (obj.type) {
        case 'platform':
        case 'ground':
            // Match PlatformerGame render: solid + accent top
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = t.primary;
            ctx.fillRect(obj.x, obj.y, obj.w, 4);
            ctx.fillStyle = t.primary + '60';
            ctx.fillRect(obj.x, obj.y, 3, obj.h);
            ctx.fillRect(obj.x + obj.w - 3, obj.y, 3, obj.h);
            break;

        case 'wall':
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = t.primary;
            ctx.fillRect(obj.x, obj.y, obj.w, 3);
            break;

        case 'spike':
            ctx.fillStyle = obj.color;
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + obj.h);
            ctx.lineTo(obj.x + obj.w / 2, obj.y);
            ctx.lineTo(obj.x + obj.w, obj.y + obj.h);
            ctx.closePath();
            ctx.fill();
            break;

        case 'lava':
        case 'kill_zone':
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            // Animated glow
            ctx.fillStyle = obj.color + '40';
            ctx.fillRect(obj.x - 2, obj.y - 4, obj.w + 4, obj.h + 4);
            break;

        case 'coin':
        case 'gem':
        case 'star':
            ctx.fillStyle = obj.color;
            ctx.beginPath();
            ctx.arc(obj.x + obj.w / 2, obj.y + obj.h / 2, obj.w / 2, 0, Math.PI * 2);
            ctx.fill();
            // Shine
            ctx.fillStyle = '#ffffff40';
            ctx.beginPath();
            ctx.arc(obj.x + obj.w / 2 - 2, obj.y + obj.h / 2 - 2, obj.w / 5, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'spawn':
            ctx.fillStyle = obj.color + '40';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = obj.color;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('S', obj.x + obj.w / 2, obj.y + obj.h / 2 + 5);
            break;

        case 'goal':
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('★', obj.x + obj.w / 2, obj.y + obj.h / 2 + 6);
            break;

        case 'checkpoint':
            ctx.fillStyle = obj.color + '60';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = obj.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            break;

        case 'bounce_pad':
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = '#ffffff80';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('↑↑↑', obj.x + obj.w / 2, obj.y + obj.h / 2 + 4);
            break;

        case 'enemy_patrol':
        case 'enemy_chase':
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(obj.x + 4, obj.y + 6, 6, 6);
            ctx.fillRect(obj.x + obj.w - 10, obj.y + 6, 6, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(obj.x + 6, obj.y + 8, 3, 3);
            ctx.fillRect(obj.x + obj.w - 8, obj.y + 8, 3, 3);
            // Patrol range indicator
            if (obj.type === 'enemy_patrol' && obj.behavior.range) {
                ctx.strokeStyle = obj.color + '30';
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(obj.x - obj.behavior.range / 2, obj.y, obj.w + obj.behavior.range, obj.h);
                ctx.setLineDash([]);
            }
            break;

        case 'ramp':
            ctx.fillStyle = obj.color;
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y + obj.h);
            ctx.lineTo(obj.x + obj.w, obj.y);
            ctx.lineTo(obj.x + obj.w, obj.y + obj.h);
            ctx.closePath();
            ctx.fill();
            break;

        default:
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    }
}
```

**Step 2: Verify and commit**

Place various objects. Confirm they render with game-accurate visuals (platforms have accent edges, spikes are triangular, enemies have eyes, patrol range shows dashed lines).

```bash
git add js/pages/create.js
git commit -m "feat(editor): game-accurate 2D object rendering"
```

---

## Task 6: Platformer 2D — Save, Load & Test Mode

**Files:**
- Modify: `js/pages/create.js` (save/load/test)
- Modify: `js/games/templates/custom.js` (add 2D custom game player)

**Step 1: Implement save/load for 2D levels**

```javascript
function saveGame2D() {
    const all = JSON.parse(localStorage.getItem('goblox_created_games') || '{}');
    const id = currentGameId || ('game_' + Date.now());
    currentGameId = id;

    all[id] = {
        name: gameSettings.name,
        template: 'platformer-2d',
        type: 'platformer',
        objects: objects2D.map(o => ({ ...o })),
        settings: { ...gameSettings, theme: { ...gameSettings.theme } },
        createdAt: all[id]?.createdAt || Date.now(),
        updatedAt: Date.now(),
        published: all[id]?.published || false,
        creatorId: Auth.currentUser()?.id,
        creatorName: Auth.currentUser()?.name,
    };

    localStorage.setItem('goblox_created_games', JSON.stringify(all));
    showToast('Gespeichert!');
}

function loadGame2D(gameId) {
    const all = JSON.parse(localStorage.getItem('goblox_created_games') || '{}');
    const game = all[gameId];
    if (!game || game.template !== 'platformer-2d') return false;

    currentGameId = gameId;
    objects2D = game.objects.map(o => ({ ...o, behavior: { ...o.behavior } }));
    gameSettings = { ...game.settings, theme: { ...game.settings.theme } };
    uidCounter = objects2D.length;
    renderSettingsBar2D();
    renderProperties2D();
    return true;
}
```

**Step 2: Implement inline test mode**

The test mode creates a real PlatformerGame instance that uses the user's level data instead of procedurally generated platforms.

```javascript
async function testGame2D() {
    saveGame2D();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'editor-test-overlay';
    overlay.innerHTML = `
        <div class="editor-test-bar">
            <span>Test-Modus</span>
            <button class="admin-btn" id="ed2d-exit-test">Beenden (ESC)</button>
        </div>
        <canvas id="ed2d-test-canvas"></canvas>
    `;
    container.appendChild(overlay);

    const testCanvas = overlay.querySelector('#ed2d-test-canvas');
    const rect = overlay.getBoundingClientRect();
    testCanvas.width = rect.width;
    testCanvas.height = rect.height - 40;

    // Create a custom PlatformerGame that uses our level data
    const { CustomPlatformer2D } = await import('../games/templates/custom-platformer-2d.js');
    const testGame = new CustomPlatformer2D(testCanvas, {
        theme: gameSettings.theme,
        gravity: gameSettings.gravity,
        speed: gameSettings.scrollSpeed,
        objects: objects2D,
    });

    testGame.start();
    testGame.onGameOver = () => {};

    const exitTest = () => {
        testGame.stop();
        overlay.remove();
    };
    overlay.querySelector('#ed2d-exit-test').addEventListener('click', exitTest);
    window.addEventListener('keydown', function esc(e) {
        if (e.code === 'Escape') { exitTest(); window.removeEventListener('keydown', esc); }
    });
}
```

**Step 3: Create custom-platformer-2d.js game player**

Create a new file that extends the base PlatformerGame to use user-placed objects instead of procedural generation.

```javascript
// js/games/templates/custom-platformer-2d.js
import { BaseGame } from '../base-game.js';
import { drawCharacter } from '../character.js';

export class CustomPlatformer2D extends BaseGame {
    init() {
        const cfg = this.config;
        this.theme = cfg.theme;
        this.gravity = cfg.gravity || 1;
        this.scrollSpeed = cfg.speed || 1.5;

        const W = this.canvas.width;
        const H = this.canvas.height;

        this.playerW = 24;
        this.playerH = 36;
        this.playerX = 0;
        this.playerY = 0;
        this.playerVY = 0;
        this.isGrounded = false;
        this.walkAnim = 0;
        this.distance = 0;
        this.cameraX = 0;
        this.particles = [];

        // Build level from user objects
        this.platforms = [];
        this.hazards = [];
        this.collectibles = [];
        this.enemies = [];
        this.bouncePads = [];
        this.goalObj = null;
        this.checkpoints = [];

        for (const obj of cfg.objects) {
            switch (obj.type) {
                case 'platform': case 'ground': case 'wall': case 'ramp':
                    this.platforms.push({ ...obj });
                    break;
                case 'spike': case 'lava': case 'kill_zone':
                    this.hazards.push({ ...obj });
                    break;
                case 'coin': case 'gem': case 'star':
                    this.collectibles.push({ ...obj, collected: false });
                    break;
                case 'enemy_patrol': case 'enemy_chase':
                    this.enemies.push({ ...obj, origX: obj.x, dir: 1 });
                    break;
                case 'bounce_pad':
                    this.bouncePads.push({ ...obj });
                    break;
                case 'goal':
                    this.goalObj = { ...obj };
                    break;
                case 'spawn':
                    this.playerX = obj.x;
                    this.playerY = obj.y - this.playerH;
                    break;
                case 'checkpoint':
                    this.checkpoints.push({ ...obj });
                    break;
            }
        }
        this.spawnX = this.playerX;
        this.spawnY = this.playerY;
        this.cameraX = Math.max(0, this.playerX - W * 0.3);
    }

    update(dt) {
        // ... (standard platformer physics using this.platforms for collision)
        // Similar to PlatformerGame.update() but using user-placed objects
        // instead of procedural ones, and auto-scroll is optional
    }

    render() {
        // ... (renders using the same visual style as renderObject2D)
    }

    onKeyDown(key) {
        if ((key === ' ' || key === 'ArrowUp' || key === 'w') && this.isGrounded) {
            this.playerVY = -this.gravity * 600;
            this.isGrounded = false;
        }
    }
}
```

**Step 4: Verify and commit**

Place a spawn point, some platforms, coins, and a goal. Click "Test". Confirm the game plays with the exact objects placed in the editor.

```bash
git add js/pages/create.js js/games/templates/custom-platformer-2d.js
git commit -m "feat(editor): 2D save/load, test mode with custom platformer player"
```

---

## Task 7: Visual Scripting — Block Rendering Engine

**Files:**
- Create: `js/editor/script-engine.js` (block rendering, drag & drop)
- Create: `css/script-editor.css` (block styles)
- Modify: `js/pages/create.js` (wire up Script tab)

**Step 1: Define block data structures**

```javascript
// js/editor/script-engine.js

const BLOCK_CATS = {
    events:    { label: 'Events',     color: '#d4a017' },
    actions:   { label: 'Aktionen',   color: '#4a90d9' },
    logic:     { label: 'Logik',      color: '#e07030' },
    variables: { label: 'Variablen',  color: '#44aa44' },
    loops:     { label: 'Schleifen',  color: '#9b59b6' },
    functions: { label: 'Funktionen', color: '#e74c8b' },
};

const BLOCK_DEFS = {
    // Events
    on_start:    { cat: 'events', label: 'Wenn Spiel startet', isHat: true, inputs: [] },
    on_touch:    { cat: 'events', label: 'Wenn Spieler {obj} beruehrt', isHat: true, inputs: [{ key: 'obj', type: 'object' }] },
    on_key:      { cat: 'events', label: 'Wenn Taste {key} gedrueckt', isHat: true, inputs: [{ key: 'key', type: 'dropdown', options: ['W','A','S','D','Space','E'] }] },
    on_timer:    { cat: 'events', label: 'Wenn {secs} Sekunden vergangen', isHat: true, inputs: [{ key: 'secs', type: 'number', default: 5 }] },
    on_var:      { cat: 'events', label: 'Wenn {var} sich aendert', isHat: true, inputs: [{ key: 'var', type: 'variable' }] },
    on_score:    { cat: 'events', label: 'Wenn Score {op} {val}', isHat: true, inputs: [{ key: 'op', type: 'dropdown', options: ['>=','<=','=='] }, { key: 'val', type: 'number', default: 100 }] },

    // Actions
    move_to:     { cat: 'actions', label: 'Bewege {obj} zu {x} {y}', inputs: [{ key: 'obj', type: 'object' }, { key: 'x', type: 'number' }, { key: 'y', type: 'number' }] },
    show_hide:   { cat: 'actions', label: '{action} {obj}', inputs: [{ key: 'action', type: 'dropdown', options: ['Zeige','Verstecke'] }, { key: 'obj', type: 'object' }] },
    destroy:     { cat: 'actions', label: 'Zerstoere {obj}', inputs: [{ key: 'obj', type: 'object' }] },
    add_score:   { cat: 'actions', label: 'Gib {pts} Punkte', inputs: [{ key: 'pts', type: 'number', default: 10 }] },
    show_msg:    { cat: 'actions', label: 'Zeige Nachricht {text}', inputs: [{ key: 'text', type: 'text', default: 'Hallo!' }] },
    wait:        { cat: 'actions', label: 'Warte {secs} Sekunden', inputs: [{ key: 'secs', type: 'number', default: 1 }] },
    teleport:    { cat: 'actions', label: 'Teleportiere Spieler zu {obj}', inputs: [{ key: 'obj', type: 'object' }] },
    play_sound:  { cat: 'actions', label: 'Spiele Sound {snd}', inputs: [{ key: 'snd', type: 'dropdown', options: ['collect','jump','hit','win','lose','click'] }] },
    win_game:    { cat: 'actions', label: 'Spiel gewonnen!', inputs: [] },
    lose_game:   { cat: 'actions', label: 'Spiel verloren!', inputs: [] },
    change_color:{ cat: 'actions', label: 'Aendere Farbe von {obj} zu {color}', inputs: [{ key: 'obj', type: 'object' }, { key: 'color', type: 'color', default: '#ff0000' }] },

    // Logic
    if_cond:     { cat: 'logic', label: 'Wenn {var} {op} {val}', isC: true, inputs: [{ key: 'var', type: 'variable' }, { key: 'op', type: 'dropdown', options: ['>=','<=','==','!='] }, { key: 'val', type: 'number' }] },
    if_else:     { cat: 'logic', label: 'Wenn {var} {op} {val} sonst', isC: true, hasElse: true, inputs: [{ key: 'var', type: 'variable' }, { key: 'op', type: 'dropdown', options: ['>=','<=','==','!='] }, { key: 'val', type: 'number' }] },
    if_random:   { cat: 'logic', label: 'Wenn zufaellig {pct}% Chance', isC: true, inputs: [{ key: 'pct', type: 'number', default: 50 }] },

    // Variables
    set_var:     { cat: 'variables', label: 'Setze {var} auf {val}', inputs: [{ key: 'var', type: 'variable' }, { key: 'val', type: 'number' }] },
    change_var:  { cat: 'variables', label: 'Aendere {var} um {val}', inputs: [{ key: 'var', type: 'variable' }, { key: 'val', type: 'number', default: 1 }] },

    // Loops
    repeat_n:    { cat: 'loops', label: 'Wiederhole {n} mal', isC: true, inputs: [{ key: 'n', type: 'number', default: 10 }] },
    repeat_while:{ cat: 'loops', label: 'Wiederhole solange {var} {op} {val}', isC: true, inputs: [{ key: 'var', type: 'variable' }, { key: 'op', type: 'dropdown', options: ['>=','<=','==','!='] }, { key: 'val', type: 'number' }] },

    // Functions
    def_func:    { cat: 'functions', label: 'Definiere {name}', isHat: true, inputs: [{ key: 'name', type: 'text', default: 'meineFunktion' }] },
    call_func:   { cat: 'functions', label: 'Rufe {name} auf', inputs: [{ key: 'name', type: 'text', default: 'meineFunktion' }] },
};
```

**Step 2: Build the ScriptEditor class (DOM-based blocks)**

```javascript
export class ScriptEditor {
    constructor(containerEl, objectList) {
        this.container = containerEl;
        this.objectList = objectList;    // reference to placed objects for dropdowns
        this.scripts = [];                // placed block chains
        this.variables = [];              // user-defined variables
        this.panX = 0;
        this.panY = 0;
        this.dragging = null;
    }

    render() {
        this.container.innerHTML = `
            <div class="script-palette" id="script-palette"></div>
            <div class="script-canvas" id="script-canvas">
                <div class="script-blocks" id="script-blocks"></div>
            </div>
            <div class="script-objects" id="script-objects"></div>
        `;
        this.paletteEl = this.container.querySelector('#script-palette');
        this.canvasEl = this.container.querySelector('#script-canvas');
        this.blocksEl = this.container.querySelector('#script-blocks');
        this.objectsEl = this.container.querySelector('#script-objects');

        this.renderPalette();
        this.renderBlocks();
        this.renderObjectList();
        this.setupDragDrop();
    }

    renderPalette() { /* render block categories and items */ }
    renderBlocks() { /* render placed block chains on canvas */ }
    renderObjectList() { /* list all placed objects for reference */ }
    setupDragDrop() { /* drag from palette to canvas, snap logic */ }

    // Creates a DOM element for a single block
    createBlockEl(blockType, values = {}) {
        const def = BLOCK_DEFS[blockType];
        const cat = BLOCK_CATS[def.cat];
        const el = document.createElement('div');
        el.className = `script-block ${def.isHat ? 'hat' : ''} ${def.isC ? 'c-block' : ''}`;
        el.style.setProperty('--block-color', cat.color);
        el.dataset.type = blockType;

        // Parse label with {input} placeholders
        let labelHtml = def.label.replace(/\{(\w+)\}/g, (_, key) => {
            const inp = def.inputs.find(i => i.key === key);
            if (!inp) return key;
            const val = values[key] ?? inp.default ?? '';
            if (inp.type === 'dropdown') {
                return `<select class="block-input" data-key="${key}">
                    ${inp.options.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}
                </select>`;
            }
            if (inp.type === 'number') return `<input class="block-input" type="number" data-key="${key}" value="${val}" style="width:50px">`;
            if (inp.type === 'text') return `<input class="block-input" type="text" data-key="${key}" value="${val}" style="width:100px">`;
            if (inp.type === 'color') return `<input class="block-input" type="color" data-key="${key}" value="${val}">`;
            if (inp.type === 'object') return `<select class="block-input" data-key="${key}">
                <option value="">Waehle...</option>
                ${this.objectList.map(o => `<option value="${o.id}" ${o.id === val ? 'selected' : ''}>${OBJECTS_2D?.[o.type]?.name || o.type} #${o.id.slice(-4)}</option>`).join('')}
            </select>`;
            if (inp.type === 'variable') return `<select class="block-input" data-key="${key}">
                ${this.variables.map(v => `<option ${v === val ? 'selected' : ''}>${v}</option>`).join('')}
            </select>`;
            return key;
        });

        el.innerHTML = labelHtml;

        if (def.isC) {
            // C-shaped block: add inner slot for nested blocks
            const slot = document.createElement('div');
            slot.className = 'block-slot';
            el.appendChild(slot);
        }

        return el;
    }

    serialize() {
        // Convert placed blocks to JSON for saving
        return this.scripts.map(chain => ({
            id: chain.id,
            blocks: chain.blocks.map(b => ({
                type: b.type,
                values: b.values,
                children: b.children?.map(c => ({ type: c.type, values: c.values })) || []
            }))
        }));
    }

    load(scriptData) {
        // Restore blocks from JSON
        this.scripts = scriptData || [];
        this.renderBlocks();
    }
}
```

**Step 3: Verify and commit**

Switch to Script tab. Confirm palette shows all block categories. Drag a block to the canvas.

```bash
git add js/editor/script-engine.js css/script-editor.css js/pages/create.js
git commit -m "feat(editor): visual scripting block engine with palette and canvas"
```

---

## Task 8: Visual Scripting — Drag & Drop and Snap Logic

**Files:**
- Modify: `js/editor/script-engine.js` (drag, drop, snap)

This task implements the core interaction: dragging blocks from the palette, snapping them together vertically, and nesting blocks inside C-shaped blocks.

**Key mechanics:**
- Drag from palette = clone a new block instance
- Drag on canvas = reposition block
- Snap zone: 20px proximity below another block = snap and connect
- C-blocks have a slot that accepts inner blocks
- Hat blocks (events) can only be at the top of a chain

**Step 1: Implement drag & drop system**

```javascript
setupDragDrop() {
    let dragEl = null;
    let dragData = null;
    let offsetX = 0, offsetY = 0;

    // Drag from palette
    this.paletteEl.addEventListener('mousedown', (e) => {
        const blockEl = e.target.closest('.script-block-proto');
        if (!blockEl) return;
        const type = blockEl.dataset.type;
        dragData = { type, values: {}, isNew: true };
        dragEl = this.createBlockEl(type);
        dragEl.classList.add('dragging');
        dragEl.style.position = 'absolute';
        dragEl.style.zIndex = '1000';
        this.canvasEl.appendChild(dragEl);
        offsetX = dragEl.offsetWidth / 2;
        offsetY = 12;
        updatePos(e);
    });

    // Drag existing block on canvas
    this.blocksEl.addEventListener('mousedown', (e) => {
        const blockEl = e.target.closest('.script-block');
        if (!blockEl || e.target.closest('.block-input')) return;
        // detach from chain, start dragging
        dragEl = blockEl;
        dragData = { type: blockEl.dataset.type, existing: true };
        dragEl.classList.add('dragging');
        const rect = dragEl.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
    });

    const updatePos = (e) => {
        if (!dragEl) return;
        const rect = this.canvasEl.getBoundingClientRect();
        dragEl.style.left = (e.clientX - rect.left - offsetX + this.panX) + 'px';
        dragEl.style.top = (e.clientY - rect.top - offsetY + this.panY) + 'px';
        this.highlightSnapTarget(dragEl);
    };

    window.addEventListener('mousemove', updatePos);

    window.addEventListener('mouseup', () => {
        if (!dragEl) return;
        dragEl.classList.remove('dragging');
        this.trySnap(dragEl, dragData);
        dragEl = null;
        dragData = null;
        this.clearSnapHighlights();
    });
}
```

**Step 2: Implement snap detection**

```javascript
trySnap(el, data) {
    const elRect = el.getBoundingClientRect();
    const threshold = 20;

    // Find nearest snap point
    const chains = this.blocksEl.querySelectorAll('.script-chain');
    for (const chain of chains) {
        const blocks = chain.querySelectorAll(':scope > .script-block');
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock) {
            const lastRect = lastBlock.getBoundingClientRect();
            // Check snap below last block
            if (Math.abs(elRect.top - lastRect.bottom) < threshold &&
                Math.abs(elRect.left - lastRect.left) < threshold * 2) {
                // Snap! Append to chain
                chain.appendChild(el);
                return;
            }
        }
        // Check C-block slots
        const slots = chain.querySelectorAll('.block-slot');
        for (const slot of slots) {
            const slotRect = slot.getBoundingClientRect();
            if (Math.abs(elRect.top - slotRect.top) < threshold &&
                Math.abs(elRect.left - slotRect.left) < threshold * 2) {
                slot.appendChild(el);
                return;
            }
        }
    }

    // No snap — create new chain (only if hat/event block, or allow floating)
    const def = BLOCK_DEFS[data.type];
    if (def.isHat || !data.isNew) {
        const chain = document.createElement('div');
        chain.className = 'script-chain';
        chain.style.left = el.style.left;
        chain.style.top = el.style.top;
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        chain.appendChild(el);
        this.blocksEl.appendChild(chain);
    }
}
```

**Step 3: Verify and commit**

Drag event block to canvas (creates chain). Drag action block near bottom of event (snaps). Drag condition C-block, nest action inside it.

```bash
git add js/editor/script-engine.js
git commit -m "feat(editor): block drag & drop with snap connections"
```

---

## Task 9: Visual Scripting — Runtime Execution

**Files:**
- Create: `js/editor/script-runtime.js` (executes scripts during gameplay)
- Modify: `js/games/templates/custom-platformer-2d.js` (integrate runtime)

**Step 1: Create ScriptRuntime class**

```javascript
// js/editor/script-runtime.js
export class ScriptRuntime {
    constructor(game, scripts, objects) {
        this.game = game;
        this.scripts = scripts;
        this.objects = objects;   // reference to level objects
        this.variables = {};
        this.functions = {};
        this.timers = [];
        this.maxIterations = 10000;
    }

    init() {
        for (const chain of this.scripts) {
            const trigger = chain.blocks[0];
            const actions = chain.blocks.slice(1);
            this.registerTrigger(trigger, actions);
        }
    }

    registerTrigger(trigger, actions) {
        switch (trigger.type) {
            case 'on_start':
                this.executeActions(actions);
                break;
            case 'on_touch':
                this.game._scriptTouches = this.game._scriptTouches || {};
                this.game._scriptTouches[trigger.values.obj] = () => this.executeActions(actions);
                break;
            case 'on_timer':
                const secs = parseFloat(trigger.values.secs) || 1;
                setTimeout(() => this.executeActions(actions), secs * 1000);
                break;
            case 'on_key':
                this.game._scriptKeys = this.game._scriptKeys || {};
                this.game._scriptKeys[trigger.values.key] = () => this.executeActions(actions);
                break;
            case 'on_score':
                this.game._scriptScoreChecks = this.game._scriptScoreChecks || [];
                this.game._scriptScoreChecks.push({
                    op: trigger.values.op,
                    val: parseFloat(trigger.values.val),
                    actions, fired: false
                });
                break;
            case 'def_func':
                this.functions[trigger.values.name] = actions;
                break;
        }
    }

    async executeActions(actions) {
        for (const action of actions) {
            await this.executeOne(action);
        }
    }

    async executeOne(block) {
        const v = block.values;
        switch (block.type) {
            case 'add_score':
                this.game.score += parseFloat(v.pts) || 0;
                break;
            case 'show_msg':
                this.game.showMessage?.(v.text || '');
                break;
            case 'wait':
                await new Promise(r => setTimeout(r, (parseFloat(v.secs) || 1) * 1000));
                break;
            case 'destroy':
                this.game.destroyObject?.(v.obj);
                break;
            case 'win_game':
                this.game.endGame?.();
                break;
            case 'lose_game':
                this.game.endGame?.();
                break;
            case 'set_var':
                this.variables[v.var] = parseFloat(v.val) || 0;
                break;
            case 'change_var':
                this.variables[v.var] = (this.variables[v.var] || 0) + (parseFloat(v.val) || 0);
                break;
            case 'call_func':
                if (this.functions[v.name]) {
                    await this.executeActions(this.functions[v.name]);
                }
                break;
            case 'if_cond':
                if (this.evalCondition(v.var, v.op, v.val) && block.children) {
                    await this.executeActions(block.children);
                }
                break;
            case 'repeat_n':
                const n = Math.min(parseFloat(v.n) || 1, this.maxIterations);
                for (let i = 0; i < n; i++) {
                    if (block.children) await this.executeActions(block.children);
                }
                break;
            case 'teleport':
                this.game.teleportPlayerTo?.(v.obj);
                break;
            case 'change_color':
                this.game.changeObjectColor?.(v.obj, v.color);
                break;
        }
    }

    evalCondition(varName, op, val) {
        const a = this.variables[varName] || 0;
        const b = parseFloat(val) || 0;
        switch (op) {
            case '>=': return a >= b;
            case '<=': return a <= b;
            case '==': return a === b;
            case '!=': return a !== b;
            default: return false;
        }
    }

    // Called each frame by the game
    update(dt) {
        // Check score triggers
        if (this.game._scriptScoreChecks) {
            for (const check of this.game._scriptScoreChecks) {
                if (!check.fired && this.evalCondition('_score', check.op, check.val)) {
                    check.fired = true;
                    this.executeActions(check.actions);
                }
            }
            this.variables['_score'] = this.game.score;
        }
    }
}
```

**Step 2: Integrate runtime into custom-platformer-2d.js**

In the game's `init()`, if `config.scripts` exists, create a `ScriptRuntime` and call `runtime.init()`. In `update()`, call `runtime.update(dt)`. On collision with objects that have script triggers, fire `_scriptTouches[objId]()`.

**Step 3: Verify and commit**

Create a script: "When game starts → Give 100 points". Test game. Confirm score starts at 100.

```bash
git add js/editor/script-runtime.js js/games/templates/custom-platformer-2d.js
git commit -m "feat(editor): visual scripting runtime with event triggers and actions"
```

---

## Task 10: Wire Everything Together & Polish

**Files:**
- Modify: `js/pages/create.js` (tab switching, cleanup, edit existing)
- Modify: `js/app.js` (route params for template)
- Modify: `js/games/templates/custom.js` (detect template type, use correct player)

**Step 1: Tab switching between Build and Script**

Wire the tab buttons to toggle between `#ed2d-build-tab` and `#ed2d-script-tab`. When switching to Script tab, initialize the `ScriptEditor` with the current `objects2D` list. When switching back, the blocks persist.

**Step 2: Update custom.js to handle 2D templates**

```javascript
// In custom.js, detect template type
if (gameData.template === 'platformer-2d') {
    const { CustomPlatformer2D } = await import('./custom-platformer-2d.js');
    return new CustomPlatformer2D(canvas, gameData);
}
```

**Step 3: Update routing for edit mode**

When navigating to `#/create/game_123`, detect the game's `template` field and open the correct editor (2D or 3D).

**Step 4: Full integration test**

1. Create → pick Platformer 2D
2. Place spawn, platforms, coins, goal
3. Switch to Script tab, add "When Spieler Coin beruehrt → Gib 10 Punkte"
4. Click Test → verify game plays with correct objects and scripts
5. Save → navigate away → come back → verify all data loads
6. Publish → confirm appears in catalog
7. Play from catalog → verify full game works

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(editor): complete platformer 2D editor with visual scripting"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Template selection screen | create.js, create.css |
| 2 | Platformer 2D canvas & grid | create.js, create.css |
| 3 | Object placement & manipulation | create.js |
| 4 | Properties panel & settings bar | create.js |
| 5 | Live preview rendering | create.js |
| 6 | Save, load & test mode | create.js, custom-platformer-2d.js |
| 7 | Block rendering engine | script-engine.js, script-editor.css |
| 8 | Drag & drop and snap logic | script-engine.js |
| 9 | Script runtime execution | script-runtime.js, custom-platformer-2d.js |
| 10 | Integration & polish | create.js, custom.js, app.js |
