// js/gobux.js
const GOBUX_KEY = 'goblox_gobux';
const PASSES_KEY = 'goblox_passes';
const TRANSACTIONS_KEY = 'goblox_transactions';

/**
 * Game Pass definitions.
 */
export const GAME_PASSES = [
    {
        id: 'speed_boost',
        name: 'Speed Boost',
        price: 100,
        description: '+20% Bewegungsgeschwindigkeit in allen Spielen',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00ff87" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    },
    {
        id: 'double_score',
        name: 'Double Score',
        price: 250,
        description: '2x Punkte-Multiplikator fuer 10 Spiele',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    },
    {
        id: 'extra_life',
        name: 'Extra Life',
        price: 150,
        description: '+1 Extra-Leben in allen Spielen',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e94560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    },
    {
        id: 'vip_badge',
        name: 'VIP Badge',
        price: 500,
        description: 'Goldener Name in der Rangliste',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffd700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
    },
    {
        id: 'neon_trail',
        name: 'Neon Trail',
        price: 200,
        description: 'Leuchtender Trail-Effekt hinter dem Spieler',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12l2 2 4-4"/></svg>`,
    },
    {
        id: 'lucky_start',
        name: 'Lucky Start',
        price: 75,
        description: 'Starte jedes Spiel mit +50 Bonuspunkten',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#55efc4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`,
    },
    {
        id: 'shield',
        name: 'Shield',
        price: 300,
        description: 'Starte Survival-Spiele mit einem Schild',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#74b9ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    },
    {
        id: 'time_freeze',
        name: 'Time Freeze',
        price: 400,
        description: '+10 Sekunden in Zeitspielen',
        icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#81ecec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    },
];

/**
 * GoBux SVG icon (golden hexagonal coin with G).
 */
export const GOBUX_ICON = `<svg class="gobux-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,1 22,6.5 22,17.5 12,23 2,17.5 2,6.5" fill="#ffd700" stroke="#b8860b" stroke-width="1.5"/>
    <text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="900" font-family="system-ui,sans-serif" fill="#5c4000">G</text>
</svg>`;

/**
 * Larger GoBux icon for the store header.
 */
export const GOBUX_ICON_LG = `<svg class="gobux-icon-lg" width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,1 22,6.5 22,17.5 12,23 2,17.5 2,6.5" fill="#ffd700" stroke="#b8860b" stroke-width="1.2"/>
    <text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="900" font-family="system-ui,sans-serif" fill="#5c4000">G</text>
</svg>`;

export const GoBux = {
    /**
     * Get user's current GoBux balance.
     */
    getBalance(userId) {
        const data = JSON.parse(localStorage.getItem(GOBUX_KEY) || '{}');
        return data[userId] || 0;
    },

    /**
     * Add GoBux (from gameplay rewards).
     */
    earn(userId, amount, reason) {
        const data = JSON.parse(localStorage.getItem(GOBUX_KEY) || '{}');
        data[userId] = (data[userId] || 0) + amount;
        localStorage.setItem(GOBUX_KEY, JSON.stringify(data));
        this.logTransaction(userId, amount, 'earn', reason);
        return data[userId];
    },

    /**
     * Spend GoBux (buying game passes).
     */
    spend(userId, amount, reason) {
        const data = JSON.parse(localStorage.getItem(GOBUX_KEY) || '{}');
        const balance = data[userId] || 0;
        if (balance < amount) return { error: 'Nicht genug GoBux!' };
        data[userId] = balance - amount;
        localStorage.setItem(GOBUX_KEY, JSON.stringify(data));
        this.logTransaction(userId, -amount, 'spend', reason);
        return { balance: data[userId] };
    },

    /**
     * Log a transaction for history tracking.
     */
    logTransaction(userId, amount, type, reason) {
        const all = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '{}');
        if (!all[userId]) all[userId] = [];
        all[userId].unshift({
            amount,
            type,
            reason,
            date: Date.now(),
        });
        // Keep last 100 transactions per user
        if (all[userId].length > 100) all[userId].length = 100;
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(all));
    },

    /**
     * Get transaction history for a user.
     */
    getTransactions(userId) {
        const all = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '{}');
        return all[userId] || [];
    },

    /**
     * Get all owned passes for a user.
     */
    getPasses(userId) {
        const data = JSON.parse(localStorage.getItem(PASSES_KEY) || '{}');
        return data[userId] || [];
    },

    /**
     * Buy a game pass.
     */
    buyPass(userId, passId) {
        const pass = GAME_PASSES.find(p => p.id === passId);
        if (!pass) return { error: 'Pass nicht gefunden!' };

        // Check if already owned
        const owned = this.getPasses(userId);
        if (owned.includes(passId)) return { error: 'Du besitzt diesen Pass bereits!' };

        // Try to spend
        const result = this.spend(userId, pass.price, `Pass gekauft: ${pass.name}`);
        if (result.error) return result;

        // Grant the pass
        const data = JSON.parse(localStorage.getItem(PASSES_KEY) || '{}');
        if (!data[userId]) data[userId] = [];
        data[userId].push(passId);
        localStorage.setItem(PASSES_KEY, JSON.stringify(data));

        return { balance: result.balance, passId };
    },

    /**
     * Check if user owns a specific pass.
     */
    hasPass(userId, passId) {
        return this.getPasses(userId).includes(passId);
    },

    /**
     * Calculate GoBux earned from a game based on category and score.
     */
    calculateReward(category, score) {
        let earned = 5; // Base reward for completing a game
        let reason = 'Spiel abgeschlossen';

        // High score bonus: +1 per 100 points
        const highScoreBonus = Math.floor(score / 100);
        earned += highScoreBonus;

        // Category-specific bonuses
        const cat = category.toLowerCase();
        if (cat === 'shooter') {
            // +2 per 10 enemies killed (score ~ enemies killed * 10)
            const enemyBonus = Math.floor(score / 10) * 2;
            earned += enemyBonus;
            reason = 'Shooter abgeschlossen';
        } else if (cat === 'survival') {
            // +3 per 60 seconds survived (score ~ seconds survived)
            const survivalBonus = Math.floor(score / 60) * 3;
            earned += survivalBonus;
            reason = 'Survival abgeschlossen';
        } else if (cat === 'platformer') {
            // +1 per 10 platforms reached
            const platformBonus = Math.floor(score / 10);
            earned += platformBonus;
            reason = 'Platformer abgeschlossen';
        } else if (cat === 'tower defense') {
            // +5 per wave completed (score ~ wave * 100)
            const waveBonus = Math.floor(score / 100) * 5;
            earned += waveBonus;
            reason = 'Tower Defense abgeschlossen';
        } else if (cat === 'maze') {
            // +10 for completing the maze
            earned += 10;
            reason = 'Labyrinth abgeschlossen';
        } else if (cat === 'racing') {
            // +3 for distance milestones (score ~ distance)
            const distanceBonus = Math.floor(score / 100) * 3;
            earned += distanceBonus;
            reason = 'Rennen abgeschlossen';
        } else if (cat === 'quiz' || cat === 'word') {
            // +2 per correct answer (score ~ correct * 100)
            const quizBonus = Math.floor(score / 100) * 2;
            earned += quizBonus;
            reason = 'Quiz abgeschlossen';
        }

        // Minimum 1 GoBux just for playing
        earned = Math.max(1, earned);

        return { earned, reason };
    },
};
