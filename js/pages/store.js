// js/pages/store.js
import { Auth } from '../auth.js';
import { GoBux, GAME_PASSES, GOBUX_ICON_LG, GOBUX_ICON } from '../gobux.js';

export function renderStore(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    const balance = GoBux.getBalance(user.id);
    const ownedPasses = GoBux.getPasses(user.id);

    container.innerHTML = `
        <div class="store-page animate-fade-in">
            <h1>Shop</h1>
            <p class="text-secondary mb-3">Kaufe Game Passes mit deinen verdienten GoBux.</p>

            <!-- Balance Display -->
            <div class="store-balance-card">
                <div class="store-balance-icon">${GOBUX_ICON_LG}</div>
                <div class="store-balance-info">
                    <div class="store-balance-amount" id="store-balance">${balance.toLocaleString('de-DE')}</div>
                    <div class="store-balance-label">GoBux</div>
                </div>
                <div class="store-balance-tip">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    Spiele Spiele, um GoBux zu verdienen!
                </div>
            </div>

            <!-- Passes Grid -->
            <div class="store-grid">
                ${GAME_PASSES.map(pass => {
                    const owned = ownedPasses.includes(pass.id);
                    const canAfford = balance >= pass.price;
                    return `
                        <div class="store-card ${owned ? 'store-card-owned' : ''}" data-pass-id="${pass.id}">
                            <div class="store-card-icon">${pass.icon}</div>
                            <h3 class="store-card-name">${pass.name}</h3>
                            <p class="store-card-desc">${pass.description}</p>
                            <div class="store-card-price">
                                ${GOBUX_ICON}
                                <span>${pass.price.toLocaleString('de-DE')}</span>
                            </div>
                            ${owned
                                ? `<button class="btn store-card-btn store-btn-owned" disabled>Gekauft &#10003;</button>`
                                : canAfford
                                    ? `<button class="btn store-card-btn store-btn-buy" data-pass-id="${pass.id}">Kaufen</button>`
                                    : `<button class="btn store-card-btn store-btn-disabled" disabled>Nicht genug GoBux</button>`
                            }
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Transaction History -->
            <div class="store-transactions mt-4">
                <h3 class="mb-2">Letzte Transaktionen</h3>
                <div class="store-transactions-list" id="store-transactions-list">
                    ${renderTransactions(user.id)}
                </div>
            </div>
        </div>
    `;

    // Buy button handlers
    container.querySelectorAll('.store-btn-buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const passId = btn.dataset.passId;
            const pass = GAME_PASSES.find(p => p.id === passId);
            if (!pass) return;

            const result = GoBux.buyPass(user.id, passId);
            if (result.error) {
                showStoreToast(container, result.error, 'error');
                return;
            }

            showStoreToast(container, `${pass.name} gekauft!`, 'success');

            // Re-render the store to update UI
            renderStore(container, router);
        });
    });
}

function renderTransactions(userId) {
    const transactions = GoBux.getTransactions(userId).slice(0, 15);

    if (transactions.length === 0) {
        return `<p class="text-secondary" style="padding:1rem;">Noch keine Transaktionen. Spiele Spiele, um GoBux zu verdienen!</p>`;
    }

    return transactions.map(tx => {
        const isEarn = tx.type === 'earn';
        const date = new Date(tx.date).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
        return `
            <div class="store-tx-item">
                <div class="store-tx-icon ${isEarn ? 'store-tx-earn' : 'store-tx-spend'}">
                    ${isEarn ? '+' : '-'}
                </div>
                <div class="store-tx-info">
                    <div class="store-tx-reason">${tx.reason}</div>
                    <div class="store-tx-date">${date}</div>
                </div>
                <div class="store-tx-amount ${isEarn ? 'store-tx-earn' : 'store-tx-spend'}">
                    ${isEarn ? '+' : ''}${tx.amount.toLocaleString('de-DE')}
                </div>
            </div>
        `;
    }).join('');
}

function showStoreToast(container, message, type) {
    // Remove any existing toast
    const existing = container.querySelector('.store-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `store-toast store-toast-${type}`;
    toast.textContent = message;
    container.querySelector('.store-page').appendChild(toast);

    setTimeout(() => toast.classList.add('store-toast-show'), 10);
    setTimeout(() => {
        toast.classList.remove('store-toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
