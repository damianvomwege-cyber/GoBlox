// js/friends.js
// Friends module — LocalStorage-based friend management

import { Auth } from './auth.js';

function getKey(userId) {
    return `goblox_friends_${userId}`;
}

export const Friends = {
    /**
     * Get the friend ID list for a user.
     * @param {string} userId
     * @returns {string[]} array of friend user IDs
     */
    getFriendIds(userId) {
        return JSON.parse(localStorage.getItem(getKey(userId)) || '[]');
    },

    /**
     * Get friend user objects for a user.
     * @param {string} userId
     * @returns {Object[]} array of user objects
     */
    getFriends(userId) {
        const ids = this.getFriendIds(userId);
        const users = Auth.getUsers();
        return ids.map(id => users.find(u => u.id === id)).filter(Boolean);
    },

    /**
     * Add a friend by name.
     * @param {string} userId - current user's ID
     * @param {string} friendName - the name of the user to add
     * @returns {{ error?: string, friend?: Object }}
     */
    addFriend(userId, friendName) {
        const users = Auth.getUsers();
        const friend = users.find(u => u.name.toLowerCase() === friendName.toLowerCase());
        if (!friend) return { error: 'Benutzer nicht gefunden!' };
        if (friend.id === userId) return { error: 'Du kannst dich nicht selbst hinzufuegen!' };

        const ids = this.getFriendIds(userId);
        if (ids.includes(friend.id)) return { error: 'Ihr seid bereits Freunde!' };

        ids.push(friend.id);
        localStorage.setItem(getKey(userId), JSON.stringify(ids));

        return { friend };
    },

    /**
     * Remove a friend.
     * @param {string} userId
     * @param {string} friendId
     */
    removeFriend(userId, friendId) {
        const ids = this.getFriendIds(userId).filter(id => id !== friendId);
        localStorage.setItem(getKey(userId), JSON.stringify(ids));
    },

    /**
     * Deterministic simulated online status.
     * Based on the friend's user ID and the current hour, returns true/false.
     * Changes every hour but is consistent for the same user within the same hour.
     */
    isOnline(friendId) {
        const hour = new Date().getHours();
        let hash = 0;
        const str = friendId + ':' + hour;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        // ~40% chance of being "online"
        return (Math.abs(hash) % 100) < 40;
    }
};
