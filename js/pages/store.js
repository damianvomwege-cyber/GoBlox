// js/pages/store.js
import { Auth } from '../auth.js';
import { GoBux, GOBUX_ICON } from '../gobux.js';
import { Marketplace, CATEGORIES, RARITY, GOBUX_PACKAGES } from '../marketplace.js';

let _state = {
    tab: 'shop',          // 'shop' | 'inventory' | 'gobux'
    category: 'all',
    search: '',
    sort: 'newest',
    featuredIndex: 0,
    featuredTimer: null,
};

export function renderStore(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    // Clean up previous timers
    if (_state.featuredTimer) clearInterval(_state.featuredTimer);

    const balance = GoBux.getBalance(user.id);

    container.innerHTML = `
        <div class="mp-page animate-fade-in">
            <!-- Top Bar -->
            <div class="mp-topbar">
                <div class="mp-topbar-left">
                    <h1 class="mp-title">Marketplace</h1>
                </div>
                <div class="mp-topbar-right">
                    <div class="mp-balance-pill" id="mp-balance-pill">
                        ${GOBUX_ICON}
                        <span id="mp-balance">${balance.toLocaleString('de-DE')}</span>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="mp-tabs">
                <button class="mp-tab ${_state.tab === 'shop' ? 'mp-tab-active' : ''}" data-tab="shop">
                    <span class="mp-tab-icon">🏪</span> Shop
                </button>
                <button class="mp-tab ${_state.tab === 'inventory' ? 'mp-tab-active' : ''}" data-tab="inventory">
                    <span class="mp-tab-icon">🎒</span> Mein Inventar
                </button>
                <button class="mp-tab ${_state.tab === 'gobux' ? 'mp-tab-active' : ''}" data-tab="gobux">
                    <span class="mp-tab-icon">💰</span> GoBux kaufen
                </button>
            </div>

            <!-- Content Area -->
            <div class="mp-content" id="mp-content"></div>

            <!-- Item Detail Modal -->
            <div class="mp-modal-overlay" id="mp-modal-overlay">
                <div class="mp-modal" id="mp-modal"></div>
            </div>

            <!-- Toast -->
        </div>
    `;

    // Render the current tab
    renderCurrentTab(container, user);

    // Tab handlers
    container.querySelectorAll('.mp-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            _state.tab = tab.dataset.tab;
            _state.search = '';
            container.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('mp-tab-active'));
            tab.classList.add('mp-tab-active');
            renderCurrentTab(container, user);
        });
    });

    // Modal overlay close
    const overlay = container.querySelector('#mp-modal-overlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(container);
    });

    // Re-render function for after purchases
    container._mpRerender = () => {
        const newBal = GoBux.getBalance(user.id);
        const balEl = container.querySelector('#mp-balance');
        if (balEl) balEl.textContent = newBal.toLocaleString('de-DE');
    };
}

function renderCurrentTab(container, user) {
    const content = container.querySelector('#mp-content');
    if (!content) return;

    if (_state.featuredTimer) {
        clearInterval(_state.featuredTimer);
        _state.featuredTimer = null;
    }

    switch (_state.tab) {
        case 'shop':
            renderShopTab(content, container, user);
            break;
        case 'inventory':
            renderInventoryTab(content, container, user);
            break;
        case 'gobux':
            renderGoBuxTab(content, container, user);
            break;
    }
}

// ════════════════════════════════════════════════════════════════════════
// SHOP TAB
// ════════════════════════════════════════════════════════════════════════

function renderShopTab(content, container, user) {
    const featured = Marketplace.getFeatured();

    content.innerHTML = `
        <!-- Featured Banner -->
        <div class="mp-featured" id="mp-featured">
            <div class="mp-featured-slide" id="mp-featured-slide"></div>
            <div class="mp-featured-dots" id="mp-featured-dots">
                ${featured.map((_, i) => `<button class="mp-featured-dot ${i === _state.featuredIndex ? 'active' : ''}" data-index="${i}"></button>`).join('')}
            </div>
            <button class="mp-featured-arrow mp-featured-prev" id="mp-featured-prev">&#8249;</button>
            <button class="mp-featured-arrow mp-featured-next" id="mp-featured-next">&#8250;</button>
        </div>

        <!-- Search & Sort -->
        <div class="mp-controls">
            <div class="mp-search-wrapper">
                <svg class="mp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" class="mp-search" id="mp-search" placeholder="Items durchsuchen..." value="${_state.search}">
            </div>
            <select class="mp-sort" id="mp-sort">
                <option value="newest" ${_state.sort === 'newest' ? 'selected' : ''}>Neueste</option>
                <option value="price_asc" ${_state.sort === 'price_asc' ? 'selected' : ''}>Preis: Niedrig</option>
                <option value="price_desc" ${_state.sort === 'price_desc' ? 'selected' : ''}>Preis: Hoch</option>
                <option value="rarity" ${_state.sort === 'rarity' ? 'selected' : ''}>Seltenheit</option>
                <option value="name" ${_state.sort === 'name' ? 'selected' : ''}>Name A-Z</option>
            </select>
        </div>

        <!-- Category Pills -->
        <div class="mp-categories" id="mp-categories">
            ${CATEGORIES.map(cat => `
                <button class="mp-cat-pill ${_state.category === cat.id ? 'mp-cat-active' : ''}" data-cat="${cat.id}">
                    <span class="mp-cat-emoji">${cat.icon}</span>
                    <span class="mp-cat-label">${cat.label}</span>
                </button>
            `).join('')}
        </div>

        <!-- Items Grid -->
        <div class="mp-grid" id="mp-grid"></div>
    `;

    // Render featured
    renderFeaturedSlide(content, featured, container, user);

    // Auto-rotate featured
    _state.featuredTimer = setInterval(() => {
        _state.featuredIndex = (_state.featuredIndex + 1) % featured.length;
        renderFeaturedSlide(content, featured, container, user);
        updateFeaturedDots(content);
    }, 5000);

    // Featured navigation
    content.querySelector('#mp-featured-prev')?.addEventListener('click', () => {
        _state.featuredIndex = (_state.featuredIndex - 1 + featured.length) % featured.length;
        renderFeaturedSlide(content, featured, container, user);
        updateFeaturedDots(content);
    });
    content.querySelector('#mp-featured-next')?.addEventListener('click', () => {
        _state.featuredIndex = (_state.featuredIndex + 1) % featured.length;
        renderFeaturedSlide(content, featured, container, user);
        updateFeaturedDots(content);
    });
    content.querySelectorAll('.mp-featured-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            _state.featuredIndex = parseInt(dot.dataset.index);
            renderFeaturedSlide(content, featured, container, user);
            updateFeaturedDots(content);
        });
    });

    // Render items grid
    renderItemGrid(content, container, user);

    // Search handler
    let searchTimeout;
    content.querySelector('#mp-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            _state.search = e.target.value;
            renderItemGrid(content, container, user);
        }, 200);
    });

    // Sort handler
    content.querySelector('#mp-sort')?.addEventListener('change', (e) => {
        _state.sort = e.target.value;
        renderItemGrid(content, container, user);
    });

    // Category handlers
    content.querySelectorAll('.mp-cat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            _state.category = pill.dataset.cat;
            content.querySelectorAll('.mp-cat-pill').forEach(p => p.classList.remove('mp-cat-active'));
            pill.classList.add('mp-cat-active');
            renderItemGrid(content, container, user);
        });
    });
}

function renderFeaturedSlide(content, featured, container, user) {
    const slide = content.querySelector('#mp-featured-slide');
    if (!slide || !featured.length) return;

    const item = featured[_state.featuredIndex];
    if (!item) return;

    const rarity = RARITY[item.rarity];
    const owned = Marketplace.isOwned(user.id, item.id);

    slide.innerHTML = `
        <div class="mp-featured-item" data-item-id="${item.id}">
            <div class="mp-featured-icon" style="background:${rarity.bg}; border-color:${rarity.color};">
                <span>${item.icon}</span>
            </div>
            <div class="mp-featured-info">
                <div class="mp-featured-badge" style="color:${rarity.color}; background:${rarity.bg};">${rarity.label}</div>
                <h2 class="mp-featured-name">${item.name}</h2>
                <p class="mp-featured-desc">${item.description}</p>
                <div class="mp-featured-bottom">
                    ${owned
                        ? '<span class="mp-owned-badge">&#10003; Im Besitz</span>'
                        : item.price === 0
                            ? '<span class="mp-free-badge">Gratis</span>'
                            : `<span class="mp-price-tag">${GOBUX_ICON} <span>${item.price.toLocaleString('de-DE')}</span></span>`
                    }
                    <button class="btn mp-featured-btn" data-item-id="${item.id}">${owned ? 'Details ansehen' : 'Jetzt ansehen'}</button>
                </div>
            </div>
        </div>
    `;

    slide.querySelector('.mp-featured-btn')?.addEventListener('click', () => {
        openItemModal(container, user, item.id);
    });
}

function updateFeaturedDots(content) {
    content.querySelectorAll('.mp-featured-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === _state.featuredIndex);
    });
}

function renderItemGrid(content, container, user) {
    const grid = content.querySelector('#mp-grid');
    if (!grid) return;

    // Get items
    let items = _state.search
        ? Marketplace.search(_state.search)
        : Marketplace.getByCategory(_state.category);

    // Sort
    items = Marketplace.sortItems(items, _state.sort);

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="mp-empty">
                <div class="mp-empty-icon">🔍</div>
                <p>Keine Items gefunden.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => renderItemCard(item, user)).join('');

    // Card click handlers
    grid.querySelectorAll('.mp-item-card').forEach(card => {
        card.addEventListener('click', () => {
            openItemModal(container, user, card.dataset.itemId);
        });
    });
}

function renderItemCard(item, user) {
    const rarity = RARITY[item.rarity];
    const owned = Marketplace.isOwned(user.id, item.id);
    const isBundle = item.category === 'bundles';

    return `
        <div class="mp-item-card ${owned ? 'mp-card-owned' : ''}" data-item-id="${item.id}" style="--rarity-color:${rarity.color};">
            <div class="mp-card-preview" style="background:${rarity.bg};">
                <span class="mp-card-icon">${item.icon}</span>
                ${owned ? '<div class="mp-card-owned-check">&#10003;</div>' : ''}
                <div class="mp-card-rarity" style="color:${rarity.color};">${rarity.label}</div>
            </div>
            <div class="mp-card-body">
                <div class="mp-card-name">${item.name}</div>
                <div class="mp-card-price-row">
                    ${owned
                        ? '<span class="mp-card-owned-label">Im Besitz</span>'
                        : item.price === 0
                            ? '<span class="mp-card-free">Gratis</span>'
                            : `<span class="mp-card-price">${GOBUX_ICON} ${item.price.toLocaleString('de-DE')}</span>`
                    }
                    ${isBundle && item.originalPrice ? `<span class="mp-card-original">${item.originalPrice.toLocaleString('de-DE')}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════════════════
// INVENTORY TAB
// ════════════════════════════════════════════════════════════════════════

function renderInventoryTab(content, container, user) {
    const ownedIds = Marketplace.getOwned(user.id);
    const equipped = Marketplace.getEquipped(user.id);

    content.innerHTML = `
        <div class="mp-inv-header">
            <h2>Mein Inventar</h2>
            <span class="mp-inv-count">${ownedIds.length} Items</span>
        </div>

        <!-- Category Filter for inventory -->
        <div class="mp-categories mp-inv-cats" id="mp-inv-cats">
            ${CATEGORIES.filter(c => c.id !== 'all' || true).map(cat => `
                <button class="mp-cat-pill ${_state.category === cat.id ? 'mp-cat-active' : ''}" data-cat="${cat.id}">
                    <span class="mp-cat-emoji">${cat.icon}</span>
                    <span class="mp-cat-label">${cat.label}</span>
                </button>
            `).join('')}
        </div>

        <!-- Equipped summary -->
        <div class="mp-equipped-bar" id="mp-equipped-bar">
            <span class="mp-equipped-title">Angezogen:</span>
            <div class="mp-equipped-items" id="mp-equipped-items">
                ${Object.entries(equipped).map(([cat, itemId]) => {
                    const item = Marketplace.getItem(itemId);
                    if (!item) return '';
                    return `<span class="mp-equipped-chip" title="${item.name}">${item.icon}</span>`;
                }).join('') || '<span class="mp-equipped-none">Nichts angezogen</span>'}
            </div>
        </div>

        <div class="mp-grid" id="mp-inv-grid"></div>
    `;

    renderInventoryGrid(content, container, user);

    // Category filter
    content.querySelectorAll('#mp-inv-cats .mp-cat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            _state.category = pill.dataset.cat;
            content.querySelectorAll('.mp-cat-pill').forEach(p => p.classList.remove('mp-cat-active'));
            pill.classList.add('mp-cat-active');
            renderInventoryGrid(content, container, user);
        });
    });
}

function renderInventoryGrid(content, container, user) {
    const grid = content.querySelector('#mp-inv-grid');
    if (!grid) return;

    const ownedIds = Marketplace.getOwned(user.id);
    let items = ownedIds.map(id => Marketplace.getItem(id)).filter(Boolean);

    // Filter by category
    if (_state.category && _state.category !== 'all') {
        items = items.filter(item => item.category === _state.category);
    }

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="mp-empty">
                <div class="mp-empty-icon">🎒</div>
                <p>${_state.category !== 'all' ? 'Keine Items in dieser Kategorie.' : 'Dein Inventar ist leer. Besuche den Shop!'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => {
        const rarity = RARITY[item.rarity];
        const isEquipped = Marketplace.isEquipped(user.id, item.id);

        return `
            <div class="mp-item-card mp-inv-card ${isEquipped ? 'mp-card-equipped' : ''}" data-item-id="${item.id}" style="--rarity-color:${rarity.color};">
                <div class="mp-card-preview" style="background:${rarity.bg};">
                    <span class="mp-card-icon">${item.icon}</span>
                    ${isEquipped ? '<div class="mp-card-equipped-badge">Angezogen</div>' : ''}
                    <div class="mp-card-rarity" style="color:${rarity.color};">${rarity.label}</div>
                </div>
                <div class="mp-card-body">
                    <div class="mp-card-name">${item.name}</div>
                    <button class="mp-inv-equip-btn ${isEquipped ? 'mp-inv-unequip' : ''}" data-item-id="${item.id}">
                        ${isEquipped ? 'Ausziehen' : 'Anziehen'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Equip/unequip handlers
    grid.querySelectorAll('.mp-inv-equip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.itemId;
            const item = Marketplace.getItem(itemId);
            if (!item) return;

            if (Marketplace.isEquipped(user.id, itemId)) {
                Marketplace.unequip(user.id, item.category);
                showToast(container, `${item.name} ausgezogen`, 'success');
            } else {
                Marketplace.equip(user.id, itemId);
                showToast(container, `${item.name} angezogen!`, 'success');
            }
            renderInventoryTab(content, container, user);
        });
    });

    // Card click -> modal
    grid.querySelectorAll('.mp-inv-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.mp-inv-equip-btn')) return;
            openItemModal(container, user, card.dataset.itemId);
        });
    });
}

// ════════════════════════════════════════════════════════════════════════
// GOBUX PURCHASE TAB
// ════════════════════════════════════════════════════════════════════════

function renderGoBuxTab(content, container, user) {
    const balance = GoBux.getBalance(user.id);

    content.innerHTML = `
        <div class="mp-gobux-section">
            <div class="mp-gobux-header">
                <div class="mp-gobux-icon-lg">
                    <svg width="56" height="56" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="12,1 22,6.5 22,17.5 12,23 2,17.5 2,6.5" fill="#ffd700" stroke="#b8860b" stroke-width="1.2"/>
                        <text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="900" font-family="system-ui,sans-serif" fill="#5c4000">G</text>
                    </svg>
                </div>
                <div>
                    <h2>GoBux kaufen</h2>
                    <p class="text-secondary">Aktuelles Guthaben: <strong style="color:#ffd700;">${balance.toLocaleString('de-DE')} GoBux</strong></p>
                </div>
            </div>
            <p class="mp-gobux-disclaimer">Dies ist eine Demo - alle GoBux sind kostenlos!</p>

            <div class="mp-gobux-grid">
                ${GOBUX_PACKAGES.map(pkg => `
                    <div class="mp-gobux-card" data-pkg-id="${pkg.id}">
                        <div class="mp-gobux-card-top">
                            ${pkg.bonus > 0 ? `<div class="mp-gobux-bonus">+${pkg.bonus}% Bonus</div>` : ''}
                            <div class="mp-gobux-amount">${GOBUX_ICON} ${pkg.label}</div>
                            ${pkg.bonus > 0 ? `<div class="mp-gobux-total">= ${Math.floor(pkg.amount * (1 + pkg.bonus / 100)).toLocaleString('de-DE')} GoBux</div>` : ''}
                        </div>
                        <button class="btn mp-gobux-buy-btn" data-pkg-id="${pkg.id}">${pkg.price}</button>
                    </div>
                `).join('')}
            </div>

            <!-- Transaction History -->
            <div class="mp-transactions">
                <h3>Letzte Transaktionen</h3>
                <div class="mp-tx-list" id="mp-tx-list">
                    ${renderTransactions(user.id)}
                </div>
            </div>
        </div>
    `;

    // Purchase handlers
    content.querySelectorAll('.mp-gobux-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pkg = GOBUX_PACKAGES.find(p => p.id === btn.dataset.pkgId);
            if (!pkg) return;

            const total = Math.floor(pkg.amount * (1 + pkg.bonus / 100));
            GoBux.earn(user.id, total, `GoBux Paket: ${pkg.label}`);

            showToast(container, `+${total.toLocaleString('de-DE')} GoBux erhalten!`, 'success');

            // Update balance display
            const newBal = GoBux.getBalance(user.id);
            const balEl = container.querySelector('#mp-balance');
            if (balEl) balEl.textContent = newBal.toLocaleString('de-DE');

            // Re-render transactions
            const txList = content.querySelector('#mp-tx-list');
            if (txList) txList.innerHTML = renderTransactions(user.id);

            // Animate the button
            btn.textContent = 'Erhalten!';
            btn.style.background = '#55efc4';
            btn.style.color = '#0a1500';
            setTimeout(() => {
                btn.textContent = pkg.price;
                btn.style.background = '';
                btn.style.color = '';
            }, 1500);
        });
    });
}

function renderTransactions(userId) {
    const transactions = GoBux.getTransactions(userId).slice(0, 20);

    if (transactions.length === 0) {
        return `<p class="text-secondary" style="padding:1rem;text-align:center;">Noch keine Transaktionen.</p>`;
    }

    return transactions.map(tx => {
        const isEarn = tx.type === 'earn';
        const date = new Date(tx.date).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
        return `
            <div class="mp-tx-item">
                <div class="mp-tx-icon ${isEarn ? 'mp-tx-earn' : 'mp-tx-spend'}">
                    ${isEarn ? '+' : '-'}
                </div>
                <div class="mp-tx-info">
                    <div class="mp-tx-reason">${tx.reason}</div>
                    <div class="mp-tx-date">${date}</div>
                </div>
                <div class="mp-tx-amount ${isEarn ? 'mp-tx-earn' : 'mp-tx-spend'}">
                    ${isEarn ? '+' : ''}${tx.amount.toLocaleString('de-DE')}
                </div>
            </div>
        `;
    }).join('');
}

// ════════════════════════════════════════════════════════════════════════
// ITEM DETAIL MODAL
// ════════════════════════════════════════════════════════════════════════

function openItemModal(container, user, itemId) {
    const item = Marketplace.getItem(itemId);
    if (!item) return;

    const rarity = RARITY[item.rarity];
    const owned = Marketplace.isOwned(user.id, item.id);
    const equipped = Marketplace.isEquipped(user.id, item.id);
    const balance = GoBux.getBalance(user.id);
    const canAfford = balance >= item.price || item.price === 0;
    const isBundle = item.category === 'bundles';
    const catLabel = CATEGORIES.find(c => c.id === item.category)?.label || item.category;

    const overlay = container.querySelector('#mp-modal-overlay');
    const modal = container.querySelector('#mp-modal');

    modal.innerHTML = `
        <button class="mp-modal-close" id="mp-modal-close">&times;</button>
        <div class="mp-modal-body">
            <div class="mp-modal-preview" style="background:${rarity.bg}; border-color:${rarity.color};">
                <span class="mp-modal-icon">${item.icon}</span>
                <div class="mp-modal-rarity" style="color:${rarity.color}; background:${rarity.bg};">${rarity.label}</div>
            </div>
            <div class="mp-modal-details">
                <h2 class="mp-modal-name">${item.name}</h2>
                <div class="mp-modal-meta">
                    <span class="mp-modal-cat">${catLabel}</span>
                    <span class="mp-modal-creator">von ${item.creator}</span>
                </div>
                <p class="mp-modal-desc">${item.description}</p>

                ${isBundle && item.bundleItems ? `
                    <div class="mp-modal-bundle">
                        <h4>Enthalten:</h4>
                        <div class="mp-bundle-items">
                            ${item.bundleItems.map(bi => {
                                const bundleItem = Marketplace.getItem(bi);
                                if (!bundleItem) return '';
                                const biOwned = Marketplace.isOwned(user.id, bi);
                                return `<span class="mp-bundle-chip ${biOwned ? 'mp-bundle-chip-owned' : ''}">${bundleItem.icon} ${bundleItem.name} ${biOwned ? '&#10003;' : ''}</span>`;
                            }).join('')}
                        </div>
                        ${item.originalPrice ? `<div class="mp-bundle-savings">Spare ${(item.originalPrice - item.price).toLocaleString('de-DE')} GoBux (${Math.round((1 - item.price / item.originalPrice) * 100)}% Rabatt)</div>` : ''}
                    </div>
                ` : ''}

                <div class="mp-modal-price-row">
                    ${owned
                        ? ''
                        : item.price === 0
                            ? '<span class="mp-free-badge mp-free-lg">Gratis</span>'
                            : `<span class="mp-modal-price">${GOBUX_ICON} <span>${item.price.toLocaleString('de-DE')}</span></span>`
                    }
                    ${isBundle && item.originalPrice && !owned ? `<span class="mp-modal-original">${item.originalPrice.toLocaleString('de-DE')}</span>` : ''}
                </div>

                <div class="mp-modal-actions">
                    ${owned
                        ? `
                            <div class="mp-modal-owned-msg">&#10003; Bereits im Besitz</div>
                            ${item.category !== 'bundles' && item.category !== 'gamepasses'
                                ? `<button class="btn ${equipped ? 'btn-secondary' : ''} mp-modal-equip-btn" data-item-id="${item.id}">
                                    ${equipped ? 'Ausziehen' : 'Anziehen'}
                                  </button>`
                                : ''
                            }
                        `
                        : canAfford
                            ? `<button class="btn mp-modal-buy-btn" data-item-id="${item.id}">Kaufen</button>`
                            : `<button class="btn mp-modal-disabled-btn" disabled>Nicht genug GoBux</button>
                               <span class="mp-modal-need">Du brauchst noch ${(item.price - balance).toLocaleString('de-DE')} GoBux</span>`
                    }
                </div>
            </div>
        </div>
    `;

    overlay.classList.add('mp-modal-open');

    // Close button
    modal.querySelector('#mp-modal-close')?.addEventListener('click', () => closeModal(container));

    // Buy button
    modal.querySelector('.mp-modal-buy-btn')?.addEventListener('click', () => {
        confirmPurchase(container, user, item);
    });

    // Equip button
    modal.querySelector('.mp-modal-equip-btn')?.addEventListener('click', () => {
        if (Marketplace.isEquipped(user.id, item.id)) {
            Marketplace.unequip(user.id, item.category);
            showToast(container, `${item.name} ausgezogen`, 'success');
        } else {
            Marketplace.equip(user.id, item.id);
            showToast(container, `${item.name} angezogen!`, 'success');
        }
        // Re-open modal with updated state
        openItemModal(container, user, item.id);
    });
}

function confirmPurchase(container, user, item) {
    const modal = container.querySelector('#mp-modal');
    const actionsDiv = modal.querySelector('.mp-modal-actions');
    if (!actionsDiv) return;

    actionsDiv.innerHTML = `
        <div class="mp-confirm-box">
            <p class="mp-confirm-text">Moechtest du <strong>${item.name}</strong> fuer ${item.price === 0 ? '<strong>Gratis</strong>' : `<strong>${item.price.toLocaleString('de-DE')} GoBux</strong>`} kaufen?</p>
            <div class="mp-confirm-btns">
                <button class="btn mp-confirm-yes">Ja, kaufen!</button>
                <button class="btn btn-secondary mp-confirm-no">Abbrechen</button>
            </div>
        </div>
    `;

    actionsDiv.querySelector('.mp-confirm-yes')?.addEventListener('click', () => {
        const result = Marketplace.purchase(user.id, item.id, GoBux);
        if (result.error) {
            showToast(container, result.error, 'error');
            openItemModal(container, user, item.id);
            return;
        }

        // Success!
        showPurchaseSuccess(container, user, item);
    });

    actionsDiv.querySelector('.mp-confirm-no')?.addEventListener('click', () => {
        openItemModal(container, user, item.id);
    });
}

function showPurchaseSuccess(container, user, item) {
    const modal = container.querySelector('#mp-modal');
    const rarity = RARITY[item.rarity];

    modal.innerHTML = `
        <div class="mp-success-content">
            <div class="mp-success-burst"></div>
            <div class="mp-success-icon" style="background:${rarity.bg};">
                <span>${item.icon}</span>
            </div>
            <h2 class="mp-success-title">Gekauft!</h2>
            <p class="mp-success-name">${item.name}</p>
            <p class="mp-success-rarity" style="color:${rarity.color};">${rarity.label}</p>
            <button class="btn mp-success-close">Weiter einkaufen</button>
        </div>
    `;

    // Update balance
    const newBal = GoBux.getBalance(user.id);
    const balEl = container.querySelector('#mp-balance');
    if (balEl) balEl.textContent = newBal.toLocaleString('de-DE');

    modal.querySelector('.mp-success-close')?.addEventListener('click', () => {
        closeModal(container);
        renderCurrentTab(container, user);
    });
}

function closeModal(container) {
    const overlay = container.querySelector('#mp-modal-overlay');
    if (overlay) overlay.classList.remove('mp-modal-open');
}

// ════════════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════════════

function showToast(container, message, type) {
    const existing = container.querySelector('.mp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `mp-toast mp-toast-${type}`;
    toast.textContent = message;
    container.querySelector('.mp-page').appendChild(toast);

    setTimeout(() => toast.classList.add('mp-toast-show'), 10);
    setTimeout(() => {
        toast.classList.remove('mp-toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
