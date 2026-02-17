// js/editor/script-engine.js — GoBlox Visual Scripting Block Engine

// ── Block Category Definitions ──
const BLOCK_CATS = {
    events:    { label: 'Events',     color: '#d4a017' },
    actions:   { label: 'Aktionen',   color: '#4a90d9' },
    logic:     { label: 'Logik',      color: '#e07030' },
    variables: { label: 'Variablen',  color: '#44aa44' },
    loops:     { label: 'Schleifen',  color: '#9b59b6' },
    functions: { label: 'Funktionen', color: '#e74c8b' },
};

// ── Block Definitions ──
const BLOCK_DEFS = {
    // Events (hat-shaped, gold)
    on_start:    { cat: 'events', label: 'Wenn Spiel startet', isHat: true, inputs: [] },
    on_touch:    { cat: 'events', label: 'Wenn Spieler {obj} beruehrt', isHat: true, inputs: [{ key: 'obj', type: 'object' }] },
    on_key:      { cat: 'events', label: 'Wenn Taste {key} gedrueckt', isHat: true, inputs: [{ key: 'key', type: 'dropdown', options: ['W','A','S','D','Space','E'] }] },
    on_timer:    { cat: 'events', label: 'Wenn {secs} Sekunden vergangen', isHat: true, inputs: [{ key: 'secs', type: 'number', default: 5 }] },
    on_var:      { cat: 'events', label: 'Wenn {var} sich aendert', isHat: true, inputs: [{ key: 'var', type: 'variable' }] },
    on_score:    { cat: 'events', label: 'Wenn Score {op} {val}', isHat: true, inputs: [{ key: 'op', type: 'dropdown', options: ['>=','<=','=='] }, { key: 'val', type: 'number', default: 100 }] },

    // Actions (blue, standard)
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

    // Logic (orange, C-shaped)
    if_cond:     { cat: 'logic', label: 'Wenn {var} {op} {val}', isC: true, inputs: [{ key: 'var', type: 'variable' }, { key: 'op', type: 'dropdown', options: ['>=','<=','==','!='] }, { key: 'val', type: 'number' }] },
    if_else:     { cat: 'logic', label: 'Wenn {var} {op} {val} sonst', isC: true, hasElse: true, inputs: [{ key: 'var', type: 'variable' }, { key: 'op', type: 'dropdown', options: ['>=','<=','==','!='] }, { key: 'val', type: 'number' }] },
    if_random:   { cat: 'logic', label: 'Wenn zufaellig {pct}% Chance', isC: true, inputs: [{ key: 'pct', type: 'number', default: 50 }] },

    // Variables (green)
    set_var:     { cat: 'variables', label: 'Setze {var} auf {val}', inputs: [{ key: 'var', type: 'variable' }, { key: 'val', type: 'number' }] },
    change_var:  { cat: 'variables', label: 'Aendere {var} um {val}', inputs: [{ key: 'var', type: 'variable' }, { key: 'val', type: 'number', default: 1 }] },

    // Loops (purple, C-shaped)
    repeat_n:    { cat: 'loops', label: 'Wiederhole {n} mal', isC: true, inputs: [{ key: 'n', type: 'number', default: 10 }] },
    repeat_while:{ cat: 'loops', label: 'Wiederhole solange {var} {op} {val}', isC: true, inputs: [{ key: 'var', type: 'variable' }, { key: 'op', type: 'dropdown', options: ['>=','<=','==','!='] }, { key: 'val', type: 'number' }] },

    // Functions (pink)
    def_func:    { cat: 'functions', label: 'Definiere {name}', isHat: true, inputs: [{ key: 'name', type: 'text', default: 'meineFunktion' }] },
    call_func:   { cat: 'functions', label: 'Rufe {name} auf', inputs: [{ key: 'name', type: 'text', default: 'meineFunktion' }] },
};

// ── Unique IDs ──
let _blockUid = 0;
function blockUid() { return 'blk_' + Date.now().toString(36) + '_' + (++_blockUid); }

let _chainUid = 0;
function chainUid() { return 'chain_' + Date.now().toString(36) + '_' + (++_chainUid); }


// ═══════════════════════════════════════════════════════════════════════
// ScriptEditor
// ═══════════════════════════════════════════════════════════════════════
export class ScriptEditor {
    constructor(containerEl, objectListRef) {
        this.container = containerEl;
        this.objectListRef = objectListRef;  // reference to objects2D array
        this.variables = [];                 // user-defined variable names
        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;

        // Drag state
        this.dragging = null;   // { el, offsetX, offsetY, fromPalette, sourceChainEl, sourceIndex }

        // DOM references (set in render)
        this.paletteEl = null;
        this.canvasEl = null;
        this.blocksEl = null;
        this.trashEl = null;
        this.objectsPanel = null;

        // Bound handlers (for cleanup)
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);

        // Panning state
        this._isPanning = false;
        this._panStartX = 0;
        this._panStartY = 0;
        this._panStartPanX = 0;
        this._panStartPanY = 0;
    }

    // ── Render full editor ──
    render() {
        this.container.innerHTML = '';

        // Palette (left sidebar)
        this.paletteEl = document.createElement('div');
        this.paletteEl.className = 'script-palette';
        this.container.appendChild(this.paletteEl);

        // Canvas (center workspace)
        this.canvasEl = document.createElement('div');
        this.canvasEl.className = 'script-canvas';
        this.container.appendChild(this.canvasEl);

        // Grid background
        const grid = document.createElement('div');
        grid.className = 'script-canvas-grid';
        this.canvasEl.appendChild(grid);

        // Blocks container (transformed for pan/zoom)
        this.blocksEl = document.createElement('div');
        this.blocksEl.className = 'script-blocks';
        this.canvasEl.appendChild(this.blocksEl);

        // Canvas hint
        const hint = document.createElement('div');
        hint.className = 'script-canvas-hint';
        hint.textContent = 'Ziehe Bloecke aus der Palette hierher\nRechtsklick + Ziehen: Verschieben';
        this.canvasEl.appendChild(hint);
        this._hintEl = hint;

        // Trash zone (visible during drag)
        this.trashEl = document.createElement('div');
        this.trashEl.className = 'script-trash';
        this.trashEl.textContent = 'Zum Loeschen hier ablegen';
        this.canvasEl.appendChild(this.trashEl);

        // Object list panel (bottom-right)
        this.objectsPanel = document.createElement('div');
        this.objectsPanel.className = 'script-objects';
        this.canvasEl.appendChild(this.objectsPanel);

        this.renderPalette();
        this.renderObjectsPanel();
        this._updateTransform();
        this.setupDragDrop();
    }

    // ── Render palette (left sidebar) ──
    renderPalette() {
        this.paletteEl.innerHTML = '';

        // Group block defs by category
        const grouped = {};
        for (const [type, def] of Object.entries(BLOCK_DEFS)) {
            if (!grouped[def.cat]) grouped[def.cat] = [];
            grouped[def.cat].push({ type, ...def });
        }

        for (const [catKey, catInfo] of Object.entries(BLOCK_CATS)) {
            const catEl = document.createElement('div');
            catEl.className = 'script-palette-cat';
            catEl.dataset.cat = catKey;

            // Header
            const header = document.createElement('div');
            header.className = 'script-palette-cat-header';
            header.innerHTML = `
                <span class="script-palette-cat-arrow">\u25BC</span>
                <span class="script-palette-cat-dot" style="background:${catInfo.color}"></span>
                <span>${catInfo.label}</span>
            `;
            header.addEventListener('click', () => {
                catEl.classList.toggle('collapsed');
            });
            catEl.appendChild(header);

            // Body
            const body = document.createElement('div');
            body.className = 'script-palette-cat-body';

            // "Neue Variable" button for variables category
            if (catKey === 'variables') {
                const btn = document.createElement('button');
                btn.className = 'script-new-var-btn';
                btn.textContent = '+ Neue Variable';
                btn.addEventListener('click', () => this._addVariable());
                body.appendChild(btn);
            }

            // Block prototypes
            const blocks = grouped[catKey] || [];
            for (const blockDef of blocks) {
                const proto = document.createElement('div');
                proto.className = 'script-block-proto';
                if (blockDef.isHat) proto.classList.add('hat');
                if (blockDef.isC) proto.classList.add('c-block');
                proto.style.background = catInfo.color;
                proto.dataset.blockType = blockDef.type;
                proto.textContent = this._stripPlaceholders(blockDef.label);
                proto.title = proto.textContent;
                body.appendChild(proto);
            }

            catEl.appendChild(body);
            this.paletteEl.appendChild(catEl);
        }
    }

    // ── Render objects panel (bottom-right) ──
    renderObjectsPanel() {
        if (!this.objectsPanel) return;
        this.objectsPanel.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'script-objects-title';
        title.textContent = 'Objekte im Spiel';
        this.objectsPanel.appendChild(title);

        if (!this.objectListRef || this.objectListRef.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'script-objects-item';
            empty.style.color = 'var(--text-secondary, #888)';
            empty.textContent = 'Keine Objekte platziert';
            this.objectsPanel.appendChild(empty);
            return;
        }

        for (const obj of this.objectListRef) {
            const item = document.createElement('div');
            item.className = 'script-objects-item';
            item.textContent = `${obj.type} (${obj.id})`;
            this.objectsPanel.appendChild(item);
        }
    }

    // ── Create a real block element for the canvas ──
    createBlockEl(blockType, values = {}) {
        const def = BLOCK_DEFS[blockType];
        if (!def) return null;

        const catInfo = BLOCK_CATS[def.cat];
        const el = document.createElement('div');
        el.className = 'script-block';
        el.dataset.type = blockType;
        el.dataset.blockId = blockUid();
        el.style.setProperty('--block-color', catInfo.color);
        el.style.background = catInfo.color;

        if (def.isHat) el.classList.add('hat');
        if (def.isC) el.classList.add('c-block');

        // Parse label and create inline inputs
        const labelParts = this._parseLabelWithInputs(def.label, def.inputs, values);

        if (def.isC) {
            // C-block: label row, then slot(s)
            const labelRow = document.createElement('div');
            labelRow.className = 'block-label';
            for (const part of labelParts) {
                labelRow.appendChild(part);
            }
            el.appendChild(labelRow);

            // Primary slot
            const slot1 = document.createElement('div');
            slot1.className = 'block-slot';
            slot1.dataset.slotIndex = '0';
            el.appendChild(slot1);

            if (def.hasElse) {
                const divider = document.createElement('div');
                divider.className = 'block-else-divider';
                divider.textContent = 'sonst';
                el.appendChild(divider);

                const slot2 = document.createElement('div');
                slot2.className = 'block-slot';
                slot2.dataset.slotIndex = '1';
                el.appendChild(slot2);
            }

            // Closing bar
            const endBar = document.createElement('div');
            endBar.className = 'block-end-bar';
            endBar.style.background = catInfo.color;
            el.appendChild(endBar);
        } else {
            // Standard block: inline label with inputs
            for (const part of labelParts) {
                el.appendChild(part);
            }
        }

        return el;
    }

    // ── Parse label template, replacing {key} with input elements ──
    _parseLabelWithInputs(labelTemplate, inputDefs, values) {
        const parts = [];
        const inputMap = {};
        for (const inp of inputDefs) {
            inputMap[inp.key] = inp;
        }

        // Split on {key} patterns
        const regex = /\{(\w+)\}/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(labelTemplate)) !== null) {
            // Text before the placeholder
            if (match.index > lastIndex) {
                const textNode = document.createElement('span');
                textNode.textContent = labelTemplate.slice(lastIndex, match.index);
                parts.push(textNode);
            }

            const key = match[1];
            const inputDef = inputMap[key];

            if (inputDef) {
                const inputEl = this._createInputEl(inputDef, values[key]);
                parts.push(inputEl);
            } else {
                // Unknown placeholder, just render as text
                const textNode = document.createElement('span');
                textNode.textContent = match[0];
                parts.push(textNode);
            }

            lastIndex = match.index + match[0].length;
        }

        // Remaining text
        if (lastIndex < labelTemplate.length) {
            const textNode = document.createElement('span');
            textNode.textContent = labelTemplate.slice(lastIndex);
            parts.push(textNode);
        }

        return parts;
    }

    // ── Create an input element for a block field ──
    _createInputEl(inputDef, currentValue) {
        let el;

        switch (inputDef.type) {
            case 'dropdown': {
                el = document.createElement('select');
                el.className = 'block-input';
                for (const opt of (inputDef.options || [])) {
                    const o = document.createElement('option');
                    o.value = opt;
                    o.textContent = opt;
                    el.appendChild(o);
                }
                el.value = currentValue !== undefined ? currentValue : (inputDef.options?.[0] || '');
                break;
            }
            case 'number': {
                el = document.createElement('input');
                el.type = 'number';
                el.className = 'block-input';
                el.value = currentValue !== undefined ? currentValue : (inputDef.default !== undefined ? inputDef.default : 0);
                break;
            }
            case 'text': {
                el = document.createElement('input');
                el.type = 'text';
                el.className = 'block-input';
                el.value = currentValue !== undefined ? currentValue : (inputDef.default || '');
                break;
            }
            case 'color': {
                el = document.createElement('input');
                el.type = 'color';
                el.className = 'block-input';
                el.value = currentValue || inputDef.default || '#ff0000';
                break;
            }
            case 'object': {
                el = document.createElement('select');
                el.className = 'block-input';
                this._populateObjectSelect(el, currentValue);
                break;
            }
            case 'variable': {
                el = document.createElement('select');
                el.className = 'block-input';
                this._populateVariableSelect(el, currentValue);
                break;
            }
            default: {
                el = document.createElement('input');
                el.type = 'text';
                el.className = 'block-input';
                el.value = currentValue || '';
            }
        }

        el.dataset.key = inputDef.key;
        // Stop event propagation so inputs don't trigger drag
        el.addEventListener('mousedown', e => e.stopPropagation());
        el.addEventListener('pointerdown', e => e.stopPropagation());

        return el;
    }

    // ── Populate an object <select> from the object list ──
    _populateObjectSelect(selectEl, currentValue) {
        selectEl.innerHTML = '';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '-- Objekt --';
        selectEl.appendChild(empty);

        if (this.objectListRef) {
            for (const obj of this.objectListRef) {
                const o = document.createElement('option');
                o.value = obj.id;
                o.textContent = `${obj.type} (${obj.id})`;
                selectEl.appendChild(o);
            }
        }
        if (currentValue) selectEl.value = currentValue;
    }

    // ── Populate a variable <select> from the variables list ──
    _populateVariableSelect(selectEl, currentValue) {
        selectEl.innerHTML = '';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '-- Variable --';
        selectEl.appendChild(empty);

        for (const v of this.variables) {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = v;
            selectEl.appendChild(o);
        }
        if (currentValue) selectEl.value = currentValue;
    }

    // ── Strip {placeholder} from a label for the palette display ──
    _stripPlaceholders(label) {
        return label.replace(/\{(\w+)\}/g, '___');
    }

    // ── Add a new variable ──
    _addVariable() {
        const name = prompt('Variablenname:');
        if (!name || !name.trim()) return;
        const trimmed = name.trim();
        if (this.variables.includes(trimmed)) {
            alert('Variable "' + trimmed + '" existiert bereits.');
            return;
        }
        this.variables.push(trimmed);
        this._refreshVariableSelects();
        this.renderPalette();
    }

    // ── Refresh all variable <select> elements on the canvas ──
    _refreshVariableSelects() {
        if (!this.blocksEl) return;
        this.blocksEl.querySelectorAll('select.block-input').forEach(sel => {
            // Check if this is a variable select by looking at whether it was a variable input
            const key = sel.dataset.key;
            // We need to check the block definition to know if this key is a variable type
            const blockEl = sel.closest('.script-block');
            if (!blockEl) return;
            const blockType = blockEl.dataset.type;
            const def = BLOCK_DEFS[blockType];
            if (!def) return;
            const inputDef = def.inputs.find(i => i.key === key);
            if (inputDef && inputDef.type === 'variable') {
                const cur = sel.value;
                this._populateVariableSelect(sel, cur);
            }
        });
    }

    // ── Refresh all object <select> elements ──
    refreshObjectSelects() {
        if (!this.blocksEl) return;
        this.blocksEl.querySelectorAll('select.block-input').forEach(sel => {
            const key = sel.dataset.key;
            const blockEl = sel.closest('.script-block');
            if (!blockEl) return;
            const blockType = blockEl.dataset.type;
            const def = BLOCK_DEFS[blockType];
            if (!def) return;
            const inputDef = def.inputs.find(i => i.key === key);
            if (inputDef && inputDef.type === 'object') {
                const cur = sel.value;
                this._populateObjectSelect(sel, cur);
            }
        });
        this.renderObjectsPanel();
    }

    // ══════════════════════════════════════════════════════════════════
    // Drag & Drop System
    // ══════════════════════════════════════════════════════════════════
    setupDragDrop() {
        // Palette: start drag from prototype
        this.paletteEl.addEventListener('mousedown', e => {
            const proto = e.target.closest('.script-block-proto');
            if (!proto) return;
            e.preventDefault();
            this._startDragFromPalette(proto, e);
        });

        // Canvas blocks: start drag of placed block
        this.blocksEl.addEventListener('mousedown', e => {
            const blockEl = e.target.closest('.script-block');
            if (!blockEl) return;
            // Don't drag if clicking an input
            if (e.target.closest('.block-input')) return;
            e.preventDefault();
            this._startDragFromCanvas(blockEl, e);
        });

        // Canvas: panning with right-click or middle-click
        this.canvasEl.addEventListener('mousedown', e => {
            if (e.button === 2 || e.button === 1) {
                e.preventDefault();
                this._isPanning = true;
                this._panStartX = e.clientX;
                this._panStartY = e.clientY;
                this._panStartPanX = this.panX;
                this._panStartPanY = this.panY;
                this.canvasEl.classList.add('panning');
            }
        });

        // Global listeners for move/up
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mouseup', this._onMouseUp);
        this.canvasEl.addEventListener('wheel', this._onWheel, { passive: false });
        this.canvasEl.addEventListener('contextmenu', this._onContextMenu);
    }

    _onContextMenu(e) {
        e.preventDefault();
    }

    _onWheel(e) {
        e.preventDefault();
        // Scroll to pan vertically/horizontally
        this.panX -= e.deltaX * 0.5;
        this.panY -= e.deltaY * 0.5;
        this._updateTransform();
    }

    _updateTransform() {
        if (this.blocksEl) {
            this.blocksEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        }
    }

    // ── Start dragging from palette ──
    _startDragFromPalette(protoEl, e) {
        const blockType = protoEl.dataset.blockType;
        const newBlock = this.createBlockEl(blockType);
        if (!newBlock) return;

        newBlock.classList.add('dragging');
        document.body.appendChild(newBlock);

        const rect = protoEl.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        newBlock.style.left = (e.clientX - offsetX) + 'px';
        newBlock.style.top = (e.clientY - offsetY) + 'px';

        this.dragging = {
            el: newBlock,
            offsetX,
            offsetY,
            fromPalette: true,
            sourceChainEl: null,
            sourceIndex: -1,
        };

        this.trashEl.classList.add('visible');
        this._hideHint();
    }

    // ── Start dragging an existing block from the canvas ──
    _startDragFromCanvas(blockEl, e) {
        const chainEl = blockEl.closest('.script-chain');
        if (!chainEl) return;

        // Find the index of this block in its parent
        const parentContainer = blockEl.parentElement;
        const siblings = Array.from(parentContainer.querySelectorAll(':scope > .script-block'));
        const index = siblings.indexOf(blockEl);

        // Detach this block and all blocks below it in the chain
        const detachedBlocks = [];
        for (let i = index; i < siblings.length; i++) {
            detachedBlocks.push(siblings[i]);
        }

        // Create a temporary wrapper for the detached group
        const dragWrapper = document.createElement('div');
        dragWrapper.className = 'script-chain dragging';
        dragWrapper.style.position = 'fixed';
        dragWrapper.style.zIndex = '1000';
        dragWrapper.style.pointerEvents = 'none';

        for (const b of detachedBlocks) {
            b.remove();
            dragWrapper.appendChild(b);
        }

        document.body.appendChild(dragWrapper);

        const rect = blockEl.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        dragWrapper.style.left = (e.clientX - offsetX) + 'px';
        dragWrapper.style.top = (e.clientY - offsetY) + 'px';

        // Clean up empty chain
        if (chainEl.querySelectorAll(':scope > .script-block').length === 0) {
            chainEl.remove();
        }

        this.dragging = {
            el: dragWrapper,
            offsetX,
            offsetY,
            fromPalette: false,
            sourceChainEl: chainEl.parentNode ? chainEl : null,
            sourceIndex: index,
        };

        this.trashEl.classList.add('visible');
    }

    // ── Mouse move handler ──
    _onMouseMove(e) {
        // Handle panning
        if (this._isPanning) {
            const dx = e.clientX - this._panStartX;
            const dy = e.clientY - this._panStartY;
            this.panX = this._panStartPanX + dx;
            this.panY = this._panStartPanY + dy;
            this._updateTransform();
            return;
        }

        // Handle block dragging
        if (!this.dragging) return;

        const { el, offsetX, offsetY } = this.dragging;
        el.style.left = (e.clientX - offsetX) + 'px';
        el.style.top = (e.clientY - offsetY) + 'px';

        // Highlight potential snap targets
        this._clearSnapHighlights();
        this._findSnapTarget(e.clientX, e.clientY);
    }

    // ── Mouse up handler ──
    _onMouseUp(e) {
        // End panning
        if (this._isPanning) {
            this._isPanning = false;
            this.canvasEl.classList.remove('panning');
            return;
        }

        // End block dragging
        if (!this.dragging) return;

        const { el, fromPalette } = this.dragging;
        this.trashEl.classList.remove('visible');
        this._clearSnapHighlights();

        // Check if dropped on trash
        const trashRect = this.trashEl.getBoundingClientRect();
        if (e.clientX >= trashRect.left && e.clientX <= trashRect.right &&
            e.clientY >= trashRect.top && e.clientY <= trashRect.bottom) {
            el.remove();
            this.dragging = null;
            this._updateHintVisibility();
            return;
        }

        // Check if dropped over canvas
        const canvasRect = this.canvasEl.getBoundingClientRect();
        const overCanvas = e.clientX >= canvasRect.left && e.clientX <= canvasRect.right &&
                           e.clientY >= canvasRect.top && e.clientY <= canvasRect.bottom;

        if (!overCanvas) {
            // Dropped outside canvas — remove
            el.remove();
            this.dragging = null;
            this._updateHintVisibility();
            return;
        }

        // Try to snap to an existing chain
        const snapResult = this._trySnap(e.clientX, e.clientY);

        if (snapResult) {
            this._executeSnap(snapResult);
            el.remove();
        } else {
            // No snap — place as new chain (or add to existing)
            this._placeAsNewChain(e.clientX, e.clientY);
            el.remove();
        }

        this.dragging = null;
        this._updateHintVisibility();
    }

    // ── Try to find a snap target ──
    _trySnap(mouseX, mouseY) {
        const SNAP_THRESHOLD = 25;
        let bestSnap = null;
        let bestDist = SNAP_THRESHOLD;

        // Hat blocks can only be at top of chains — skip 'after' and 'slot' snaps
        const draggedType = this._getDraggedBlockType();
        const draggedDef = draggedType ? BLOCK_DEFS[draggedType] : null;
        const draggedIsHat = draggedDef?.isHat || false;

        // Get all chains
        const chains = this.blocksEl.querySelectorAll('.script-chain');

        for (const chain of chains) {
            const blocks = chain.querySelectorAll(':scope > .script-block');

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const rect = block.getBoundingClientRect();

                // Snap to bottom of this block (append after) — hat blocks cannot snap after
                if (!draggedIsHat) {
                const bottomY = rect.bottom;
                const bottomX = rect.left + rect.width / 2;
                const distBottom = Math.sqrt(
                    Math.pow(mouseX - bottomX, 2) +
                    Math.pow(mouseY - bottomY, 2)
                );

                if (distBottom < bestDist) {
                    bestDist = distBottom;
                    bestSnap = { type: 'after', chain, blockIndex: i, block };
                }
                }

                // Snap to top of chain (only first block)
                if (i === 0) {
                    const topY = rect.top;
                    const topX = rect.left + rect.width / 2;
                    const distTop = Math.sqrt(
                        Math.pow(mouseX - topX, 2) +
                        Math.pow(mouseY - topY, 2)
                    );
                    if (distTop < bestDist) {
                        // Only allow snapping to top if dragged block is NOT a hat
                        // or if the first block of the chain is NOT a hat
                        const draggedType = this._getDraggedBlockType();
                        const topBlockDef = BLOCK_DEFS[block.dataset.type];
                        if (!topBlockDef?.isHat) {
                            bestDist = distTop;
                            bestSnap = { type: 'before', chain, blockIndex: 0, block };
                        }
                    }
                }

                // Snap into C-block slots — hat blocks cannot nest inside slots
                if (!draggedIsHat) {
                const slots = block.querySelectorAll(':scope > .block-slot');
                for (const slot of slots) {
                    const slotRect = slot.getBoundingClientRect();
                    const slotCX = slotRect.left + slotRect.width / 2;
                    const slotCY = slotRect.top + slotRect.height / 2;
                    const distSlot = Math.sqrt(
                        Math.pow(mouseX - slotCX, 2) +
                        Math.pow(mouseY - slotCY, 2)
                    );
                    if (distSlot < bestDist) {
                        bestDist = distSlot;
                        bestSnap = { type: 'slot', chain, block, slot };
                    }
                }
                }
            }
        }

        return bestSnap;
    }

    // ── Get the block type of the block being dragged ──
    _getDraggedBlockType() {
        if (!this.dragging) return null;
        const el = this.dragging.el;
        const firstBlock = el.classList.contains('script-block')
            ? el
            : el.querySelector('.script-block');
        return firstBlock?.dataset?.type || null;
    }

    // ── Find snap target during drag (for highlighting) ──
    _findSnapTarget(mouseX, mouseY) {
        const snap = this._trySnap(mouseX, mouseY);
        if (!snap) return;

        if (snap.type === 'after') {
            this._addSnapHighlight(snap.block, 'bottom');
        } else if (snap.type === 'before') {
            this._addSnapHighlight(snap.block, 'top');
        } else if (snap.type === 'slot') {
            snap.slot.classList.add('highlight');
        }
    }

    // ── Add a visual snap highlight indicator ──
    _addSnapHighlight(blockEl, position) {
        const indicator = document.createElement('div');
        indicator.className = 'snap-highlight';
        if (position === 'bottom') {
            indicator.style.bottom = '-3px';
        } else {
            indicator.style.top = '-3px';
        }
        blockEl.appendChild(indicator);
    }

    // ── Clear all snap highlights ──
    _clearSnapHighlights() {
        if (!this.blocksEl) return;
        this.blocksEl.querySelectorAll('.snap-highlight').forEach(el => el.remove());
        this.blocksEl.querySelectorAll('.block-slot.highlight').forEach(el => el.classList.remove('highlight'));
    }

    // ── Execute a snap operation ──
    _executeSnap(snap) {
        const draggedBlocks = this._extractDraggedBlocks();
        if (draggedBlocks.length === 0) return;

        if (snap.type === 'after') {
            // Insert after the target block
            const parent = snap.block.parentElement;
            const siblings = Array.from(parent.querySelectorAll(':scope > .script-block'));
            const targetIdx = siblings.indexOf(snap.block);
            const nextSibling = siblings[targetIdx + 1] || null;

            for (const b of draggedBlocks) {
                if (nextSibling) {
                    parent.insertBefore(b, nextSibling);
                } else {
                    // Insert before closing bar if c-block, or append
                    const endBar = parent.querySelector(':scope > .block-end-bar');
                    if (endBar && parent.classList.contains('script-block')) {
                        parent.insertBefore(b, endBar);
                    } else {
                        parent.appendChild(b);
                    }
                }
            }
        } else if (snap.type === 'before') {
            // Insert before the first block of the chain
            const parent = snap.block.parentElement;
            for (const b of draggedBlocks) {
                parent.insertBefore(b, snap.block);
            }
        } else if (snap.type === 'slot') {
            // Insert into C-block slot
            for (const b of draggedBlocks) {
                snap.slot.appendChild(b);
            }
        }
    }

    // ── Extract blocks from the drag element ──
    _extractDraggedBlocks() {
        if (!this.dragging) return [];
        const el = this.dragging.el;

        if (el.classList.contains('script-block')) {
            return [el.cloneNode(true)];
        }

        // It's a wrapper chain — extract all blocks
        const blocks = el.querySelectorAll(':scope > .script-block');
        return Array.from(blocks).map(b => {
            const clone = b.cloneNode(true);
            // Re-bind input stopPropagation
            this._rebindInputs(clone);
            return clone;
        });
    }

    // ── Re-bind mousedown stopPropagation on cloned inputs ──
    _rebindInputs(blockEl) {
        blockEl.querySelectorAll('.block-input').forEach(inp => {
            inp.addEventListener('mousedown', e => e.stopPropagation());
            inp.addEventListener('pointerdown', e => e.stopPropagation());
        });
    }

    // ── Place dragged blocks as a new chain ──
    _placeAsNewChain(mouseX, mouseY) {
        if (!this.dragging) return;

        // Calculate canvas-relative position
        const canvasRect = this.canvasEl.getBoundingClientRect();
        const x = (mouseX - canvasRect.left - this.panX) / this.zoom - this.dragging.offsetX;
        const y = (mouseY - canvasRect.top - this.panY) / this.zoom - this.dragging.offsetY;

        // Check if first block is a hat or if we allow free placement
        const draggedType = this._getDraggedBlockType();
        const def = draggedType ? BLOCK_DEFS[draggedType] : null;

        // Create a new chain
        const chain = document.createElement('div');
        chain.className = 'script-chain';
        chain.dataset.chainId = chainUid();
        chain.style.left = Math.max(0, Math.round(x)) + 'px';
        chain.style.top = Math.max(0, Math.round(y)) + 'px';

        if (this.dragging.fromPalette) {
            // Create from palette — single block
            const el = this.dragging.el;
            let newBlock;
            if (el.classList.contains('script-block')) {
                newBlock = el.cloneNode(true);
                newBlock.classList.remove('dragging');
                this._rebindInputs(newBlock);
                chain.appendChild(newBlock);
            } else {
                // Shouldn't happen for palette, but handle gracefully
                const blocks = el.querySelectorAll('.script-block');
                blocks.forEach(b => {
                    const clone = b.cloneNode(true);
                    clone.classList.remove('dragging');
                    this._rebindInputs(clone);
                    chain.appendChild(clone);
                });
            }
        } else {
            // Re-place detached blocks
            const el = this.dragging.el;
            const blocks = el.querySelectorAll(':scope > .script-block');
            blocks.forEach(b => {
                b.classList.remove('dragging');
                this._rebindInputs(b);
                chain.appendChild(b);
            });
        }

        this.blocksEl.appendChild(chain);
    }

    // ── Hide/show canvas hint based on whether chains exist ──
    _hideHint() {
        if (this._hintEl) this._hintEl.style.display = 'none';
    }

    _updateHintVisibility() {
        if (!this._hintEl) return;
        const chains = this.blocksEl.querySelectorAll('.script-chain');
        this._hintEl.style.display = chains.length === 0 ? '' : 'none';
    }

    // ══════════════════════════════════════════════════════════════════
    // Serialization
    // ══════════════════════════════════════════════════════════════════
    serialize() {
        const chains = [];
        this.blocksEl.querySelectorAll('.script-chain').forEach(chainEl => {
            const chain = {
                id: chainEl.dataset.chainId || chainUid(),
                x: parseInt(chainEl.style.left) || 0,
                y: parseInt(chainEl.style.top) || 0,
                blocks: this._serializeBlocksInContainer(chainEl),
            };
            if (chain.blocks.length > 0) {
                chains.push(chain);
            }
        });
        return { chains, variables: [...this.variables] };
    }

    _serializeBlocksInContainer(containerEl) {
        const blocks = [];
        containerEl.querySelectorAll(':scope > .script-block').forEach(blockEl => {
            const block = {
                type: blockEl.dataset.type,
                values: {},
            };

            // Read input values from the block's label area
            const inputEls = blockEl.querySelectorAll(':scope > .block-input, :scope > .block-label .block-input');
            inputEls.forEach(inp => {
                block.values[inp.dataset.key] = inp.value;
            });

            // Read children from slots
            const slots = blockEl.querySelectorAll(':scope > .block-slot');
            if (slots.length > 0) {
                block.children = this._serializeBlocksInContainer(slots[0]);
                if (slots.length > 1) {
                    block.elseChildren = this._serializeBlocksInContainer(slots[1]);
                }
            }

            blocks.push(block);
        });
        return blocks;
    }

    // ══════════════════════════════════════════════════════════════════
    // Load from JSON
    // ══════════════════════════════════════════════════════════════════
    load(data) {
        if (!data) return;
        this.variables = data.variables || [];
        const chains = data.chains || [];

        // Clear existing blocks
        if (this.blocksEl) {
            this.blocksEl.querySelectorAll('.script-chain').forEach(el => el.remove());
        }

        // Rebuild chains
        for (const chainData of chains) {
            const chain = document.createElement('div');
            chain.className = 'script-chain';
            chain.dataset.chainId = chainData.id || chainUid();
            chain.style.left = (chainData.x || 0) + 'px';
            chain.style.top = (chainData.y || 0) + 'px';

            this._buildBlocksFromData(chain, chainData.blocks || []);
            this.blocksEl.appendChild(chain);
        }

        // Re-render palette to update variable selects
        this.renderPalette();
        this._updateHintVisibility();
    }

    _buildBlocksFromData(containerEl, blocksData) {
        for (const blockData of blocksData) {
            const blockEl = this.createBlockEl(blockData.type, blockData.values || {});
            if (!blockEl) continue;

            // Restore children into slots
            if (blockData.children && blockData.children.length > 0) {
                const slot = blockEl.querySelector(':scope > .block-slot');
                if (slot) {
                    this._buildBlocksFromData(slot, blockData.children);
                }
            }
            if (blockData.elseChildren && blockData.elseChildren.length > 0) {
                const slots = blockEl.querySelectorAll(':scope > .block-slot');
                if (slots.length > 1) {
                    this._buildBlocksFromData(slots[1], blockData.elseChildren);
                }
            }

            containerEl.appendChild(blockEl);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // Cleanup
    // ══════════════════════════════════════════════════════════════════
    destroy() {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
        if (this.canvasEl) {
            this.canvasEl.removeEventListener('wheel', this._onWheel);
            this.canvasEl.removeEventListener('contextmenu', this._onContextMenu);
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.dragging = null;
    }
}
