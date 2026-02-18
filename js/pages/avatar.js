// js/pages/avatar.js
// Avatar Editor — Roblox-style character customization
// German (Deutsch) UI

import { Auth } from '../auth.js';
import { GoBux, GOBUX_ICON } from '../gobux.js';
import { create3DAvatar, registerPageAvatar } from '../components/avatar.js';

// ═══════════════════════════════════════════════════════════════════════
// DATA: Items, Catalog definitions
// ═══════════════════════════════════════════════════════════════════════

const AVATAR_STORAGE_KEY = (userId) => `goblox_avatar_${userId}`;
const AVATAR_OWNED_KEY = (userId) => `goblox_avatar_owned_${userId}`;

// Default avatar config
const DEFAULT_CONFIG = {
    bodyColors: {
        head: '#ffb347',
        torso: '#ffb347',
        leftArm: '#ffb347',
        rightArm: '#ffb347',
        leftLeg: '#ffb347',
        rightLeg: '#ffb347',
    },
    bodyType: 'normal',
    shirt: 'shirt_green',
    pants: 'pants_dark',
    shoes: 'shoes_default',
    hat: null,
    face: 'face_default',
    hair: 'hair_none',
    animation: 'anim_walk',
};

// Skin color presets
const SKIN_PRESETS = [
    '#ffb347', '#f5c89a', '#dba87e', '#c68642', '#8d5524',
    '#e0ac69', '#f1c27d', '#ffdbac', '#fde0c0', '#d4a574',
    '#a0522d', '#6b3a2a',
];

// Shirt color presets
const SHIRT_COLOR_PRESETS = [
    '#00b06f', '#e94560', '#4a90d9', '#ffd700', '#9b59b6',
    '#ff6b35', '#1abc9c', '#e74c3c', '#2980b9', '#f39c12',
    '#8e44ad', '#2ecc71', '#e67e22', '#3498db', '#c0392b',
];

// Pants color presets
const PANTS_COLOR_PRESETS = [
    '#333333', '#2c3e50', '#1a1a2e', '#4a4a4a', '#1e3a5f',
    '#5d4e37', '#2d2d44', '#8b4513',
];

// ── Shirts ──
const SHIRTS = [
    { id: 'shirt_green', name: 'Gruen Classic', color: '#00b06f', pattern: 'solid', price: 0, icon: null },
    { id: 'shirt_red', name: 'Rot Sport', color: '#e94560', pattern: 'solid', price: 0, icon: null },
    { id: 'shirt_blue', name: 'Blau Marine', color: '#4a90d9', pattern: 'solid', price: 0, icon: null },
    { id: 'shirt_gold', name: 'Gold Premium', color: '#ffd700', pattern: 'solid', price: 25, icon: null },
    { id: 'shirt_purple', name: 'Lila Royal', color: '#9b59b6', pattern: 'solid', price: 0, icon: null },
    { id: 'shirt_orange', name: 'Orange Fire', color: '#ff6b35', pattern: 'solid', price: 0, icon: null },
    { id: 'shirt_teal', name: 'Tuerkis Neon', color: '#1abc9c', pattern: 'solid', price: 15, icon: null },
    { id: 'shirt_white', name: 'Weiss Clean', color: '#ecf0f1', pattern: 'solid', price: 0, icon: null },
    { id: 'shirt_black', name: 'Schwarz Stealth', color: '#1a1a1a', pattern: 'solid', price: 10, icon: null },
    { id: 'shirt_stripe', name: 'Streifen', color: '#2ecc71', pattern: 'stripe', price: 30, icon: null },
];

// ── Pants ──
const PANTS = [
    { id: 'pants_dark', name: 'Dunkel Classic', color: '#333333', price: 0 },
    { id: 'pants_navy', name: 'Marine Blau', color: '#2c3e50', price: 0 },
    { id: 'pants_black', name: 'Schwarz', color: '#1a1a2e', price: 0 },
    { id: 'pants_grey', name: 'Grau', color: '#4a4a4a', price: 0 },
    { id: 'pants_brown', name: 'Braun Vintage', color: '#5d4e37', price: 15 },
    { id: 'pants_midnight', name: 'Mitternacht', color: '#2d2d44', price: 20 },
];

// ── Shoes ──
const SHOES = [
    { id: 'shoes_default', name: 'Standard', color: null, price: 0 },
    { id: 'shoes_red', name: 'Rot Sneaker', color: '#e94560', price: 20 },
    { id: 'shoes_gold', name: 'Gold Kicks', color: '#ffd700', price: 50 },
    { id: 'shoes_white', name: 'Weiss Sport', color: '#ecf0f1', price: 15 },
    { id: 'shoes_neon', name: 'Neon Gruen', color: '#00ff87', price: 35 },
    { id: 'shoes_blue', name: 'Blau Runner', color: '#3498db', price: 25 },
];

// ── Hats ──
const HATS = [
    { id: 'hat_none', name: 'Kein Hut', accessoryId: 0, price: 0, emoji: '---' },
    { id: 'hat_tophat', name: 'Zylinder', accessoryId: 1, price: 50, emoji: '\ud83c\udfa9' },
    { id: 'hat_crown', name: 'Krone', accessoryId: 4, price: 200, emoji: '\ud83d\udc51' },
    { id: 'hat_cap', name: 'Baseball Cap', accessoryId: 0, price: 25, emoji: '\ud83e\udde2' },
    { id: 'hat_headband', name: 'Stirnband', accessoryId: 3, price: 30, emoji: '\ud83c\udf80' },
    { id: 'hat_party', name: 'Partyhuetchen', accessoryId: 0, price: 15, emoji: '\ud83c\udf89' },
    { id: 'hat_cowboy', name: 'Cowboyhut', accessoryId: 0, price: 40, emoji: '\ud83e\udd20' },
    { id: 'hat_helmet', name: 'Ritterhelm', accessoryId: 0, price: 75, emoji: '\u2694\ufe0f' },
    { id: 'hat_wizard', name: 'Zauberhut', accessoryId: 0, price: 100, emoji: '\ud83e\uddd9' },
];

// ── Faces ──
const FACES = [
    { id: 'face_default', name: 'Standard', emoji: '\ud83d\ude42', price: 0 },
    { id: 'face_happy', name: 'Gluecklich', emoji: '\ud83d\ude04', price: 0 },
    { id: 'face_cool', name: 'Cool', emoji: '\ud83d\ude0e', price: 20 },
    { id: 'face_wink', name: 'Zwinkern', emoji: '\ud83d\ude09', price: 15 },
    { id: 'face_angry', name: 'Wuetend', emoji: '\ud83d\ude20', price: 10 },
    { id: 'face_robot', name: 'Roboter', emoji: '\ud83e\udd16', price: 40 },
];

// ── Hair ──
const HAIRS = [
    { id: 'hair_none', name: 'Keine Haare', hairId: 0, price: 0, emoji: '---' },
    { id: 'hair_short', name: 'Kurz', hairId: 1, price: 0, emoji: '\ud83d\udc71' },
    { id: 'hair_long', name: 'Lang', hairId: 2, price: 15, emoji: '\ud83d\udc69' },
    { id: 'hair_mohawk', name: 'Irokese', hairId: 3, price: 30, emoji: '\ud83e\uddd1\u200d\ud83c\udfa4' },
    { id: 'hair_curly', name: 'Lockig', hairId: 4, price: 20, emoji: '\ud83d\udc68\u200d\ud83e\uddb1' },
    { id: 'hair_cap', name: 'Cap + Haare', hairId: 5, price: 25, emoji: '\ud83e\udde2' },
    { id: 'hair_spiky', name: 'Stachelig', hairId: 1, price: 35, emoji: '\u26a1' },
    { id: 'hair_ponytail', name: 'Pferdeschwanz', hairId: 2, price: 20, emoji: '\ud83d\udc87' },
];

// ── Animations ──
const ANIMATIONS = [
    { id: 'anim_walk', name: 'Normaler Gang', desc: 'Standard Laufbewegung', emoji: '\ud83d\udeb6', price: 0 },
    { id: 'anim_dance', name: 'Tanzen', desc: 'Coole Tanzbewegungen', emoji: '\ud83d\udd7a', price: 30 },
    { id: 'anim_wave', name: 'Winken', desc: 'Freundliche Begruessungsgeste', emoji: '\ud83d\udc4b', price: 0 },
    { id: 'anim_jump', name: 'Huepfen', desc: 'Froehliches Springen', emoji: '\ud83e\uddd8', price: 20 },
    { id: 'anim_ninja', name: 'Ninja Pose', desc: 'Mysterioeser Kampfstil', emoji: '\ud83e\udd77', price: 50 },
    { id: 'anim_robot', name: 'Roboter Gang', desc: 'Mechanischer Laufstil', emoji: '\ud83e\udd16', price: 40 },
    { id: 'anim_sneak', name: 'Schleichen', desc: 'Leises heimliches Gehen', emoji: '\ud83e\uddd0', price: 25 },
    { id: 'anim_hero', name: 'Helden-Pose', desc: 'Superheldenhafte Haltung', emoji: '\ud83e\uddb8', price: 60 },
];

// ═══════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════

let activeAvatar3D = null;
let currentConfig = null;
let ownedItems = null;
let userId = null;

// ═══════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════

function loadAvatarConfig(uid) {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY(uid));
    if (raw) {
        try {
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        } catch { /* fallthrough */ }
    }
    return { ...DEFAULT_CONFIG, bodyColors: { ...DEFAULT_CONFIG.bodyColors } };
}

function saveAvatarConfig(uid, config) {
    localStorage.setItem(AVATAR_STORAGE_KEY(uid), JSON.stringify(config));
}

function loadOwnedItems(uid) {
    const raw = localStorage.getItem(AVATAR_OWNED_KEY(uid));
    if (raw) {
        try {
            return new Set(JSON.parse(raw));
        } catch { /* fallthrough */ }
    }
    // Default free items are always owned
    const defaults = new Set();
    [SHIRTS, PANTS, SHOES, HATS, FACES, HAIRS, ANIMATIONS].forEach(catalog => {
        catalog.filter(i => i.price === 0).forEach(i => defaults.add(i.id));
    });
    return defaults;
}

function saveOwnedItems(uid, owned) {
    localStorage.setItem(AVATAR_OWNED_KEY(uid), JSON.stringify([...owned]));
}

function isOwned(itemId) {
    return ownedItems.has(itemId);
}

// ═══════════════════════════════════════════════════════════════════════
// 3D AVATAR CONFIG BRIDGE
// Translate our rich config into the simpler format expected by
// the existing avatar component: { skin, shirt, pants, hair, accessory }
// ═══════════════════════════════════════════════════════════════════════

function configTo3D(config) {
    // Skin = head color (the 3D avatar uses a single skin)
    const skin = config.bodyColors?.head || '#ffb347';

    // Shirt color
    const shirtDef = SHIRTS.find(s => s.id === config.shirt);
    const shirt = shirtDef ? shirtDef.color : '#00b06f';

    // Pants color
    const pantsDef = PANTS.find(p => p.id === config.pants);
    const pants = pantsDef ? pantsDef.color : '#333333';

    // Hair style index
    const hairDef = HAIRS.find(h => h.id === config.hair);
    const hair = hairDef ? hairDef.hairId : 0;

    // Accessory — from hat or face (prioritize hat)
    let accessory = 0;
    if (config.hat && config.hat !== 'hat_none') {
        const hatDef = HATS.find(h => h.id === config.hat);
        if (hatDef && hatDef.accessoryId > 0) {
            accessory = hatDef.accessoryId;
        }
    }
    // Face: if face_cool => glasses (accessory 2)
    if (accessory === 0 && config.face === 'face_cool') {
        accessory = 2;
    }
    // Mask face
    if (accessory === 0 && config.face === 'face_robot') {
        accessory = 5;
    }

    return { skin, shirt, pants, hair, accessory };
}

function update3DPreview() {
    if (!activeAvatar3D || !currentConfig) return;
    activeAvatar3D.updateConfig(configTo3D(currentConfig));
}

function autoSave() {
    if (!userId || !currentConfig) return;
    saveAvatarConfig(userId, currentConfig);
    saveOwnedItems(userId, ownedItems);
    // Flash save indicator
    const status = document.querySelector('.avatar-preview-status');
    if (status) {
        status.textContent = 'Gespeichert!';
        status.classList.add('visible');
        setTimeout(() => status.classList.remove('visible'), 1500);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// TOAST HELPER
// ═══════════════════════════════════════════════════════════════════════

function showToast(message, type = 'success') {
    // Remove existing
    document.querySelectorAll('.avatar-toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = `avatar-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

// ═══════════════════════════════════════════════════════════════════════
// BUY MODAL
// ═══════════════════════════════════════════════════════════════════════

function showBuyModal(item, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'avatar-modal-overlay';
    overlay.innerHTML = `
        <div class="avatar-modal">
            <div class="avatar-modal-icon">${item.emoji || '\ud83d\udce6'}</div>
            <div class="avatar-modal-title">${item.name} kaufen?</div>
            <div class="avatar-modal-desc">
                Moechtest du diesen Gegenstand fuer dein Aussehen kaufen?
            </div>
            <div class="avatar-modal-price">
                ${GOBUX_ICON}
                <span>${item.price}</span>
            </div>
            <div class="avatar-modal-buttons">
                <button class="avatar-modal-cancel">Abbrechen</button>
                <button class="avatar-modal-confirm">Kaufen</button>
            </div>
        </div>
    `;

    overlay.querySelector('.avatar-modal-cancel').onclick = () => overlay.remove();
    overlay.querySelector('.avatar-modal-confirm').onclick = () => {
        overlay.remove();
        onConfirm();
    };
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
}

function tryBuyItem(item) {
    const balance = GoBux.getBalance(userId);
    if (balance < item.price) {
        showToast('Nicht genug GoBux!', 'error');
        return false;
    }
    const result = GoBux.spend(userId, item.price, `Avatar: ${item.name}`);
    if (result.error) {
        showToast(result.error, 'error');
        return false;
    }
    ownedItems.add(item.id);
    saveOwnedItems(userId, ownedItems);
    // Update balance display
    updateBalanceDisplay();
    showToast(`${item.name} gekauft!`, 'success');
    return true;
}

function updateBalanceDisplay() {
    const el = document.querySelector('.avatar-balance-value');
    if (el) {
        el.textContent = GoBux.getBalance(userId).toLocaleString('de-DE');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER: MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════

export function renderAvatar(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    userId = user.id;
    currentConfig = loadAvatarConfig(userId);
    ownedItems = loadOwnedItems(userId);
    const balance = GoBux.getBalance(userId);

    // Cleanup previous 3D avatar
    if (activeAvatar3D) {
        try { activeAvatar3D.dispose(); } catch (e) { /* ignore */ }
        activeAvatar3D = null;
    }

    container.innerHTML = `
        <div class="avatar-page animate-fade-in">
            <!-- Top Bar -->
            <div class="avatar-topbar">
                <div>
                    <h1>Avatar Editor</h1>
                    <p class="text-secondary" style="font-size:0.85rem;margin-top:0.25rem;">
                        Passe deinen GoBlox-Charakter an.
                    </p>
                </div>
                <div class="avatar-topbar-balance">
                    ${GOBUX_ICON}
                    <span class="avatar-balance-value">${balance.toLocaleString('de-DE')}</span>
                    <span style="font-weight:500;color:var(--text-secondary);font-size:0.82rem;">GoBux</span>
                </div>
            </div>

            <!-- Main Layout -->
            <div class="avatar-editor-layout">
                <!-- Left: 3D Preview -->
                <div class="avatar-preview-panel">
                    <div class="avatar-preview-card">
                        <div class="avatar-preview-viewport" id="avatar-viewport">
                            <!-- Zoom controls -->
                            <div class="avatar-zoom-controls">
                                <button class="avatar-zoom-btn" id="avatar-zoom-in" title="Hineinzoomen">+</button>
                                <button class="avatar-zoom-btn" id="avatar-zoom-out" title="Herauszoomen">-</button>
                            </div>
                            <div class="avatar-rotate-hint" id="avatar-hint">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                                Ziehen zum Drehen
                            </div>
                        </div>
                        <div class="avatar-preview-footer">
                            <span class="avatar-preview-username">${user.name}</span>
                            <span class="avatar-preview-status" id="avatar-save-status"></span>
                        </div>
                    </div>
                </div>

                <!-- Right: Customization -->
                <div class="avatar-customize-panel">
                    <!-- Tabs -->
                    <div class="avatar-tabs">
                        <button class="avatar-tab active" data-tab="body">Koerper</button>
                        <button class="avatar-tab" data-tab="clothing">Kleidung</button>
                        <button class="avatar-tab" data-tab="accessories">Accessoires</button>
                        <button class="avatar-tab" data-tab="animations">Animationen</button>
                    </div>

                    <!-- Tab content -->
                    <div class="avatar-tab-content" id="avatar-tab-content">
                        <!-- Rendered dynamically -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // ── Init 3D Avatar ──
    const viewport = container.querySelector('#avatar-viewport');
    if (viewport) {
        const rect = viewport.getBoundingClientRect();
        const w = Math.max(rect.width || 500, 300);
        const h = Math.max(rect.height || 480, 300);

        activeAvatar3D = create3DAvatar(viewport, configTo3D(currentConfig), {
            width: w,
            height: h,
            autoRotate: false,
            enableControls: true,
            enableZoom: true,
        });
        registerPageAvatar(activeAvatar3D);

        // Style canvas to fill viewport
        const canvas = activeAvatar3D.getCanvas();
        if (canvas) {
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.borderRadius = '16px 16px 0 0';
        }

        // Hide hint after first interaction
        canvas?.addEventListener('pointerdown', () => {
            const hint = container.querySelector('#avatar-hint');
            if (hint) hint.classList.add('hidden');
        }, { once: true });
    }

    // ── Zoom Controls ──
    const zoomIn = container.querySelector('#avatar-zoom-in');
    const zoomOut = container.querySelector('#avatar-zoom-out');
    let currentZoom = 8;

    function applyZoom(newZoom) {
        currentZoom = Math.max(4, Math.min(14, newZoom));
        if (activeAvatar3D?.renderer) {
            // Access the camera through the renderer's internal state
            // The create3DAvatar does not expose camera directly, so we use
            // setRotation as a proxy, or re-create. For simplicity, we
            // note that OrbitControls is enabled, so zoom works via scroll.
        }
    }

    zoomIn?.addEventListener('click', () => {
        // Simulate zoom in by dispatching wheel event on canvas
        const canvas = activeAvatar3D?.getCanvas();
        if (canvas) {
            canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }));
        }
    });
    zoomOut?.addEventListener('click', () => {
        const canvas = activeAvatar3D?.getCanvas();
        if (canvas) {
            canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true }));
        }
    });

    // ── Tabs ──
    const tabs = container.querySelectorAll('.avatar-tab');
    const tabContent = container.querySelector('#avatar-tab-content');

    function switchTab(tabName) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        renderTabContent(tabContent, tabName);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Render initial tab
    switchTab('body');
}

// Cleanup function
renderAvatar._cleanup = function () {
    if (activeAvatar3D) {
        try { activeAvatar3D.dispose(); } catch (e) { /* ignore */ }
        activeAvatar3D = null;
    }
    currentConfig = null;
    ownedItems = null;
    userId = null;
};

// ═══════════════════════════════════════════════════════════════════════
// RENDER: TAB CONTENT
// ═══════════════════════════════════════════════════════════════════════

function renderTabContent(contentEl, tabName) {
    switch (tabName) {
        case 'body':
            renderBodyTab(contentEl);
            break;
        case 'clothing':
            renderClothingTab(contentEl);
            break;
        case 'accessories':
            renderAccessoriesTab(contentEl);
            break;
        case 'animations':
            renderAnimationsTab(contentEl);
            break;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: BODY (Koerper)
// ═══════════════════════════════════════════════════════════════════════

function renderBodyTab(el) {
    const bc = currentConfig.bodyColors;
    const parts = [
        { key: 'head', label: 'Kopf' },
        { key: 'torso', label: 'Torso' },
        { key: 'leftArm', label: 'Linker Arm' },
        { key: 'rightArm', label: 'Rechter Arm' },
        { key: 'leftLeg', label: 'Linkes Bein' },
        { key: 'rightLeg', label: 'Rechtes Bein' },
    ];

    el.innerHTML = `
        <div class="avatar-section-title">Hautfarbe</div>
        <div class="avatar-body-colors">
            ${parts.map(part => `
                <div class="avatar-color-group" data-part="${part.key}">
                    <span class="avatar-color-label">${part.label}</span>
                    <div class="avatar-color-input-wrap">
                        <div class="avatar-color-swatch" style="background:${bc[part.key]}">
                            <input type="color" value="${bc[part.key]}" data-color-part="${part.key}" />
                        </div>
                        <div class="avatar-color-presets">
                            ${SKIN_PRESETS.map(c => `
                                <div class="avatar-color-preset ${bc[part.key] === c ? 'selected' : ''}"
                                     style="background:${c}"
                                     data-preset-color="${c}"
                                     data-preset-part="${part.key}"
                                     title="${c}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Apply color to all -->
        <div style="margin-top:0.75rem;">
            <button class="btn btn-sm btn-secondary" id="avatar-apply-all-color" style="font-size:0.75rem;">
                Farbe auf alle anwenden
            </button>
        </div>

        <div class="avatar-section-title" style="margin-top:1.5rem;">Koerpertyp</div>
        <div class="avatar-body-type-row">
            ${['klein', 'normal', 'gross'].map(type => `
                <button class="avatar-body-type-btn ${currentConfig.bodyType === type ? 'active' : ''}"
                        data-body-type="${type}">
                    ${type === 'klein' ? 'Klein' : type === 'normal' ? 'Normal' : 'Gross'}
                </button>
            `).join('')}
        </div>

        <!-- Reset -->
        <div class="avatar-reset-row">
            <button class="avatar-reset-btn" id="avatar-reset-body">Koerper zuruecksetzen</button>
        </div>
    `;

    // ── Color input handlers ──
    el.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const part = e.target.dataset.colorPart;
            currentConfig.bodyColors[part] = e.target.value;
            // Update swatch
            e.target.closest('.avatar-color-swatch').style.background = e.target.value;
            // Update preset selections
            updatePresetSelections(el, part, e.target.value);
            update3DPreview();
            autoSave();
        });
    });

    // ── Preset click handlers ──
    el.querySelectorAll('.avatar-color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            const part = preset.dataset.presetPart;
            const color = preset.dataset.presetColor;
            currentConfig.bodyColors[part] = color;
            // Update swatch
            const group = el.querySelector(`.avatar-color-group[data-part="${part}"]`);
            const swatch = group.querySelector('.avatar-color-swatch');
            swatch.style.background = color;
            swatch.querySelector('input').value = color;
            updatePresetSelections(el, part, color);
            update3DPreview();
            autoSave();
        });
    });

    // ── Apply all ──
    el.querySelector('#avatar-apply-all-color')?.addEventListener('click', () => {
        const headColor = currentConfig.bodyColors.head;
        Object.keys(currentConfig.bodyColors).forEach(key => {
            currentConfig.bodyColors[key] = headColor;
        });
        renderBodyTab(el);
        update3DPreview();
        autoSave();
    });

    // ── Body type ──
    el.querySelectorAll('.avatar-body-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentConfig.bodyType = btn.dataset.bodyType;
            el.querySelectorAll('.avatar-body-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            update3DPreview();
            autoSave();
        });
    });

    // ── Reset ──
    el.querySelector('#avatar-reset-body')?.addEventListener('click', () => {
        currentConfig.bodyColors = { ...DEFAULT_CONFIG.bodyColors };
        currentConfig.bodyType = 'normal';
        renderBodyTab(el);
        update3DPreview();
        autoSave();
        showToast('Koerper zurueckgesetzt', 'success');
    });
}

function updatePresetSelections(el, part, selectedColor) {
    el.querySelectorAll(`.avatar-color-preset[data-preset-part="${part}"]`).forEach(p => {
        p.classList.toggle('selected', p.dataset.presetColor === selectedColor);
    });
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: CLOTHING (Kleidung)
// ═══════════════════════════════════════════════════════════════════════

function renderClothingTab(el) {
    let activeSub = 'shirts';

    function render() {
        el.innerHTML = `
            <div class="avatar-subcategory-bar">
                <button class="avatar-subcat-pill ${activeSub === 'shirts' ? 'active' : ''}" data-sub="shirts">T-Shirts</button>
                <button class="avatar-subcat-pill ${activeSub === 'pants' ? 'active' : ''}" data-sub="pants">Hosen</button>
                <button class="avatar-subcat-pill ${activeSub === 'shoes' ? 'active' : ''}" data-sub="shoes">Schuhe</button>
            </div>
            <div id="avatar-clothing-grid"></div>
        `;

        el.querySelectorAll('.avatar-subcat-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                activeSub = pill.dataset.sub;
                render();
            });
        });

        const gridEl = el.querySelector('#avatar-clothing-grid');
        switch (activeSub) {
            case 'shirts':
                renderItemGrid(gridEl, SHIRTS, 'shirt', currentConfig.shirt);
                break;
            case 'pants':
                renderItemGrid(gridEl, PANTS, 'pants', currentConfig.pants);
                break;
            case 'shoes':
                renderItemGrid(gridEl, SHOES, 'shoes', currentConfig.shoes);
                break;
        }
    }
    render();
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: ACCESSORIES (Accessoires)
// ═══════════════════════════════════════════════════════════════════════

function renderAccessoriesTab(el) {
    let activeSub = 'hats';

    function render() {
        el.innerHTML = `
            <div class="avatar-subcategory-bar">
                <button class="avatar-subcat-pill ${activeSub === 'hats' ? 'active' : ''}" data-sub="hats">Huete</button>
                <button class="avatar-subcat-pill ${activeSub === 'faces' ? 'active' : ''}" data-sub="faces">Gesichter</button>
                <button class="avatar-subcat-pill ${activeSub === 'hair' ? 'active' : ''}" data-sub="hair">Haare</button>
            </div>
            <div id="avatar-acc-grid"></div>
        `;

        el.querySelectorAll('.avatar-subcat-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                activeSub = pill.dataset.sub;
                render();
            });
        });

        const gridEl = el.querySelector('#avatar-acc-grid');
        switch (activeSub) {
            case 'hats':
                renderItemGrid(gridEl, HATS, 'hat', currentConfig.hat);
                break;
            case 'faces':
                renderItemGrid(gridEl, FACES, 'face', currentConfig.face);
                break;
            case 'hair':
                renderItemGrid(gridEl, HAIRS, 'hair', currentConfig.hair);
                break;
        }
    }
    render();
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: ANIMATIONS (Animationen)
// ═══════════════════════════════════════════════════════════════════════

function renderAnimationsTab(el) {
    el.innerHTML = `
        <div class="avatar-section-title">Animationen</div>
        <div class="avatar-anim-list">
            ${ANIMATIONS.map(anim => {
                const owned = isOwned(anim.id);
                const equipped = currentConfig.animation === anim.id;
                return `
                    <div class="avatar-anim-card ${equipped ? 'equipped' : ''}" data-anim-id="${anim.id}">
                        <div class="avatar-anim-icon">${anim.emoji}</div>
                        <div class="avatar-anim-info">
                            <div class="avatar-anim-name">${anim.name}</div>
                            <div class="avatar-anim-desc">${anim.desc}</div>
                        </div>
                        <div class="avatar-anim-actions">
                            ${anim.price > 0 && !owned ? `
                                <div class="avatar-anim-price avatar-item-price-cost">
                                    ${GOBUX_ICON} ${anim.price}
                                </div>
                            ` : ''}
                            <button class="avatar-anim-preview-btn" data-preview="${anim.id}" title="Vorschau">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </button>
                            ${owned ? `
                                <button class="avatar-anim-equip-btn ${equipped ? 'equipped' : 'equip'}"
                                        data-equip-anim="${anim.id}">
                                    ${equipped ? 'Ausziehen' : 'Anziehen'}
                                </button>
                            ` : `
                                <button class="avatar-anim-equip-btn buy" data-buy-anim="${anim.id}">
                                    Kaufen
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // ── Preview buttons ──
    el.querySelectorAll('.avatar-anim-preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            previewAnimation(btn.dataset.preview);
        });
    });

    // ── Equip buttons ──
    el.querySelectorAll('[data-equip-anim]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const animId = btn.dataset.equipAnim;
            if (currentConfig.animation === animId) {
                // Unequip: revert to default walk
                currentConfig.animation = 'anim_walk';
            } else {
                currentConfig.animation = animId;
            }
            autoSave();
            renderAnimationsTab(el);
        });
    });

    // ── Buy buttons ──
    el.querySelectorAll('[data-buy-anim]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const animId = btn.dataset.buyAnim;
            const anim = ANIMATIONS.find(a => a.id === animId);
            if (!anim) return;
            showBuyModal(anim, () => {
                if (tryBuyItem(anim)) {
                    currentConfig.animation = anim.id;
                    autoSave();
                    renderAnimationsTab(el);
                }
            });
        });
    });

    // ── Card click = equip/buy ──
    el.querySelectorAll('.avatar-anim-card').forEach(card => {
        card.addEventListener('click', () => {
            const animId = card.dataset.animId;
            const anim = ANIMATIONS.find(a => a.id === animId);
            if (!anim) return;
            if (isOwned(animId)) {
                if (currentConfig.animation === animId) {
                    currentConfig.animation = 'anim_walk';
                } else {
                    currentConfig.animation = animId;
                }
                autoSave();
                renderAnimationsTab(el);
            }
        });
    });
}

function previewAnimation(animId) {
    // Trigger a rotation animation on the 3D avatar as a visual preview
    if (!activeAvatar3D) return;
    let startTime = performance.now();
    const duration = 1200;
    const baseRotation = 0;

    function animatePreview(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Bounce rotation: spin once and bounce back
        const angle = Math.sin(t * Math.PI * 2) * 0.6;
        activeAvatar3D.setRotation(baseRotation + angle);
        if (t < 1) {
            requestAnimationFrame(animatePreview);
        }
    }
    requestAnimationFrame(animatePreview);
    showToast('Vorschau: ' + (ANIMATIONS.find(a => a.id === animId)?.name || animId), 'success');
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED: Item Grid Renderer
// ═══════════════════════════════════════════════════════════════════════

function renderItemGrid(container, items, configKey, equippedId) {
    container.innerHTML = `
        <div class="avatar-item-grid">
            ${items.map(item => {
                const owned = isOwned(item.id);
                const equipped = equippedId === item.id;
                const canEquip = owned;
                const isFree = item.price === 0;

                return `
                    <div class="avatar-item-card ${equipped ? 'equipped' : ''} ${!owned && !isFree ? 'locked' : ''}"
                         data-item-id="${item.id}"
                         data-config-key="${configKey}">
                        <div class="avatar-item-thumb">
                            ${renderItemThumb(item, configKey)}
                        </div>
                        <div class="avatar-item-info">
                            <div class="avatar-item-name" title="${item.name}">${item.name}</div>
                            ${isFree ? `
                                <div class="avatar-item-price avatar-item-price-free">Kostenlos</div>
                            ` : owned ? `
                                <div class="avatar-item-price avatar-item-price-owned">Besitzt</div>
                            ` : `
                                <div class="avatar-item-price avatar-item-price-cost">${GOBUX_ICON} ${item.price}</div>
                            `}
                        </div>
                        ${equipped ? `
                            <button class="avatar-item-action avatar-item-action-remove"
                                    data-action="remove" data-action-item="${item.id}" data-action-key="${configKey}">
                                Ausziehen
                            </button>
                        ` : canEquip || isFree ? `
                            <button class="avatar-item-action avatar-item-action-equip"
                                    data-action="equip" data-action-item="${item.id}" data-action-key="${configKey}">
                                Anziehen
                            </button>
                        ` : `
                            <button class="avatar-item-action avatar-item-action-buy"
                                    data-action="buy" data-action-item="${item.id}" data-action-key="${configKey}">
                                ${GOBUX_ICON} ${item.price} Kaufen
                            </button>
                        `}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // ── Item actions ──
    container.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const itemId = btn.dataset.actionItem;
            const key = btn.dataset.actionKey;
            handleItemAction(action, itemId, key, container, items, equippedId);
        });
    });

    // ── Card clicks ──
    container.querySelectorAll('.avatar-item-card').forEach(card => {
        card.addEventListener('click', () => {
            const itemId = card.dataset.itemId;
            const key = card.dataset.configKey;
            const item = items.find(i => i.id === itemId);
            if (!item) return;

            if (equippedId === itemId) {
                // Remove
                handleItemAction('remove', itemId, key, container, items, equippedId);
            } else if (isOwned(itemId) || item.price === 0) {
                // Equip
                handleItemAction('equip', itemId, key, container, items, equippedId);
            }
        });
    });
}

function handleItemAction(action, itemId, configKey, container, items, currentEquipped) {
    const allItems = items;
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    switch (action) {
        case 'equip': {
            if (!isOwned(item.id) && item.price > 0) return;
            // If free and not yet owned, mark as owned
            if (item.price === 0 && !isOwned(item.id)) {
                ownedItems.add(item.id);
            }
            currentConfig[configKey] = item.id;
            update3DPreview();
            autoSave();
            renderItemGrid(container, allItems, configKey, item.id);
            break;
        }
        case 'remove': {
            // Get default for this config key
            const defaultVal = getDefaultForKey(configKey);
            currentConfig[configKey] = defaultVal;
            update3DPreview();
            autoSave();
            renderItemGrid(container, allItems, configKey, defaultVal);
            break;
        }
        case 'buy': {
            showBuyModal(item, () => {
                if (tryBuyItem(item)) {
                    // Auto-equip after purchase
                    currentConfig[configKey] = item.id;
                    update3DPreview();
                    autoSave();
                    renderItemGrid(container, allItems, configKey, item.id);
                }
            });
            break;
        }
    }
}

function getDefaultForKey(key) {
    switch (key) {
        case 'shirt': return 'shirt_green';
        case 'pants': return 'pants_dark';
        case 'shoes': return 'shoes_default';
        case 'hat': return 'hat_none';
        case 'face': return 'face_default';
        case 'hair': return 'hair_none';
        case 'animation': return 'anim_walk';
        default: return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// ITEM THUMBNAIL RENDERER
// ═══════════════════════════════════════════════════════════════════════

function renderItemThumb(item, type) {
    // Items with emoji get rendered as emoji
    if (item.emoji) {
        return `<span class="avatar-item-emoji">${item.emoji}</span>`;
    }

    // Color-based items (shirts, pants, shoes) get rendered as colored squares
    if (item.color) {
        const pattern = item.pattern || 'solid';
        if (pattern === 'stripe') {
            return `
                <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <rect width="60" height="60" rx="8" fill="${item.color}" />
                    <rect x="0" y="10" width="60" height="6" fill="rgba(255,255,255,0.2)" rx="1"/>
                    <rect x="0" y="24" width="60" height="6" fill="rgba(255,255,255,0.2)" rx="1"/>
                    <rect x="0" y="38" width="60" height="6" fill="rgba(255,255,255,0.2)" rx="1"/>
                </svg>
            `;
        }

        // Shirts: t-shirt shape
        if (type === 'shirt') {
            return `
                <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 8 L25 4 L30 10 L35 4 L45 8 L50 22 L42 24 L42 52 L18 52 L18 24 L10 22 Z"
                          fill="${item.color}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
                    <path d="M25 4 L30 10 L35 4" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
                </svg>
            `;
        }

        // Pants: trouser shape
        if (type === 'pants') {
            return `
                <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 6 L46 6 L46 20 L42 54 L32 54 L30 28 L28 54 L18 54 L14 20 Z"
                          fill="${item.color}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
                    <line x1="14" y1="6" x2="46" y2="6" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
                </svg>
            `;
        }

        // Shoes: shoe shape
        if (type === 'shoes') {
            return `
                <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 30 L20 20 L24 20 L24 30 L50 30 L52 38 L50 44 L8 44 L8 38 Z"
                          fill="${item.color || '#333'}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
                    <rect x="8" y="40" width="44" height="4" rx="2" fill="rgba(0,0,0,0.2)"/>
                </svg>
            `;
        }

        // Generic colored square
        return `
            <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <rect width="60" height="60" rx="8" fill="${item.color}" />
            </svg>
        `;
    }

    // Fallback
    return `<span class="avatar-item-emoji">\ud83d\udce6</span>`;
}
