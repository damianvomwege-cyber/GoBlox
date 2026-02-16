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
        if (!name || name.length < 3) return { error: 'Name muss mindestens 3 Zeichen lang sein!' };
        if (!password || password.length < 4) return { error: 'Passwort muss mindestens 4 Zeichen lang sein!' };
        if (!birthday) return { error: 'Geburtsdatum ist erforderlich!' };

        const user = {
            id: crypto.randomUUID(),
            name,
            birthday,
            password,
            avatar: { skin: '#ffb347', shirt: '#00b06f', pants: '#333', hair: 0, accessory: 0 },
            createdAt: Date.now(),
            gamesPlayed: 0,
            totalScore: 0,
            favorites: [],
            recentGames: []
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
