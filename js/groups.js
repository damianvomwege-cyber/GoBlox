// js/groups.js
// Groups module — LocalStorage-based group management

import { Auth } from './auth.js';

const GROUPS_KEY = 'goblox_groups';

function loadGroups() {
    return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]');
}

function saveGroups(groups) {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

/**
 * Seed 15 default groups if none exist yet.
 */
function ensureSeed() {
    const existing = loadGroups();
    if (existing.length > 0) return;

    const now = Date.now();
    const seed = [
        {
            id: 'g_001',
            name: 'Die Baumeister',
            description: 'Wir bauen die besten Obby-Welten und kreative Bauwerke! Jeder ist willkommen, der gerne baut und gestaltet.',
            icon: '\ud83c\udfd7\ufe0f',
            created: now - 86400000 * 120,
            members: [
                { userId: 'seed_owner_1', role: 'owner', joined: now - 86400000 * 120 },
                { userId: 'seed_m1', role: 'admin', joined: now - 86400000 * 100 },
                { userId: 'seed_m2', role: 'member', joined: now - 86400000 * 90 },
                { userId: 'seed_m3', role: 'member', joined: now - 86400000 * 80 },
                { userId: 'seed_m4', role: 'member', joined: now - 86400000 * 60 },
            ],
            posts: [
                { id: 'p001', userId: 'seed_owner_1', userName: 'BauMeisterMax', text: 'Willkommen in der Gruppe! Teilt eure besten Bauwerke hier.', timestamp: now - 86400000 * 118, likes: ['seed_m1', 'seed_m2'] },
                { id: 'p002', userId: 'seed_m1', userName: 'KreativKarl', text: 'Hat jemand Tipps fuer bessere Obby-Level?', timestamp: now - 86400000 * 95, likes: ['seed_m3'] },
            ],
        },
        {
            id: 'g_002',
            name: 'Speed Runner Elite',
            description: 'Nur die Schnellsten bestehen! Speedrun-Challenges, Rekorde und Tipps fuer alle Renn- und Platformerspiele.',
            icon: '\u26a1',
            created: now - 86400000 * 110,
            members: [
                { userId: 'seed_owner_2', role: 'owner', joined: now - 86400000 * 110 },
                { userId: 'seed_m5', role: 'admin', joined: now - 86400000 * 95 },
                { userId: 'seed_m6', role: 'member', joined: now - 86400000 * 85 },
                { userId: 'seed_m7', role: 'member', joined: now - 86400000 * 70 },
                { userId: 'seed_m8', role: 'member', joined: now - 86400000 * 50 },
                { userId: 'seed_m9', role: 'member', joined: now - 86400000 * 40 },
                { userId: 'seed_m10', role: 'member', joined: now - 86400000 * 30 },
            ],
            posts: [
                { id: 'p003', userId: 'seed_owner_2', userName: 'SpeedySara', text: 'Neuer Rekord im Lava Obby: 42.3 Sekunden!', timestamp: now - 86400000 * 100, likes: ['seed_m5', 'seed_m6', 'seed_m7'] },
            ],
        },
        {
            id: 'g_003',
            name: 'Kreativ Studio',
            description: 'Fuer alle kreativen Koepfe! Hier teilen wir Ideen, Designs und arbeiten zusammen an Projekten.',
            icon: '\ud83c\udfa8',
            created: now - 86400000 * 100,
            members: [
                { userId: 'seed_owner_3', role: 'owner', joined: now - 86400000 * 100 },
                { userId: 'seed_m11', role: 'member', joined: now - 86400000 * 80 },
                { userId: 'seed_m12', role: 'member', joined: now - 86400000 * 60 },
            ],
            posts: [
                { id: 'p004', userId: 'seed_owner_3', userName: 'DesignDani', text: 'Wer hat Lust auf ein gemeinsames Projekt?', timestamp: now - 86400000 * 90, likes: ['seed_m11'] },
            ],
        },
        {
            id: 'g_004',
            name: 'Pixel Krieger',
            description: 'Kampf, Strategie und Action! Die beste Community fuer Shooter- und Survival-Fans.',
            icon: '\u2694\ufe0f',
            created: now - 86400000 * 95,
            members: [
                { userId: 'seed_owner_4', role: 'owner', joined: now - 86400000 * 95 },
                { userId: 'seed_m13', role: 'admin', joined: now - 86400000 * 85 },
                { userId: 'seed_m14', role: 'member', joined: now - 86400000 * 75 },
                { userId: 'seed_m15', role: 'member', joined: now - 86400000 * 65 },
                { userId: 'seed_m16', role: 'member', joined: now - 86400000 * 55 },
                { userId: 'seed_m17', role: 'member', joined: now - 86400000 * 45 },
                { userId: 'seed_m18', role: 'member', joined: now - 86400000 * 35 },
                { userId: 'seed_m19', role: 'member', joined: now - 86400000 * 25 },
                { userId: 'seed_m20', role: 'member', joined: now - 86400000 * 15 },
            ],
            posts: [
                { id: 'p005', userId: 'seed_owner_4', userName: 'KriegerKlaus', text: 'Neues Turnier am Samstag! Wer ist dabei?', timestamp: now - 86400000 * 80, likes: ['seed_m13', 'seed_m14', 'seed_m15', 'seed_m16'] },
                { id: 'p006', userId: 'seed_m13', userName: 'ScharfSchuetze', text: 'Bester Shooter-Score diese Woche: 15.420 Punkte', timestamp: now - 86400000 * 70, likes: ['seed_owner_4', 'seed_m14'] },
            ],
        },
        {
            id: 'g_005',
            name: 'Raetsel Meister',
            description: 'Knifflige Raetsel, knackige Puzzle und Brain-Teaser. Fuer alle, die gerne nachdenken!',
            icon: '\ud83e\udde9',
            created: now - 86400000 * 88,
            members: [
                { userId: 'seed_owner_5', role: 'owner', joined: now - 86400000 * 88 },
                { userId: 'seed_m21', role: 'member', joined: now - 86400000 * 70 },
                { userId: 'seed_m22', role: 'member', joined: now - 86400000 * 50 },
                { userId: 'seed_m23', role: 'member', joined: now - 86400000 * 30 },
            ],
            posts: [
                { id: 'p007', userId: 'seed_owner_5', userName: 'PuzzlePaul', text: 'Memory-Challenge: Wer schafft unter 20 Zuege?', timestamp: now - 86400000 * 75, likes: ['seed_m21'] },
            ],
        },
        {
            id: 'g_006',
            name: 'Musik & Rhythmus',
            description: 'Beat fuer Beat! Diskutiere Rhythmus-Spiele, teile Highscores und finde Mitspieler.',
            icon: '\ud83c\udfb5',
            created: now - 86400000 * 80,
            members: [
                { userId: 'seed_owner_6', role: 'owner', joined: now - 86400000 * 80 },
                { userId: 'seed_m24', role: 'member', joined: now - 86400000 * 60 },
            ],
            posts: [],
        },
        {
            id: 'g_007',
            name: 'Turm Verteidiger',
            description: 'Tower Defense Experten gesucht! Strategien, Builds und gemeinsame Spiele.',
            icon: '\ud83c\udff0',
            created: now - 86400000 * 75,
            members: [
                { userId: 'seed_owner_7', role: 'owner', joined: now - 86400000 * 75 },
                { userId: 'seed_m25', role: 'admin', joined: now - 86400000 * 60 },
                { userId: 'seed_m26', role: 'member', joined: now - 86400000 * 50 },
                { userId: 'seed_m27', role: 'member', joined: now - 86400000 * 40 },
                { userId: 'seed_m28', role: 'member', joined: now - 86400000 * 30 },
                { userId: 'seed_m29', role: 'member', joined: now - 86400000 * 20 },
            ],
            posts: [
                { id: 'p008', userId: 'seed_owner_7', userName: 'TurmTina', text: 'Beste Verteidigung: 3 Bogenschuetzen + 2 Magier. Probiert es aus!', timestamp: now - 86400000 * 65, likes: ['seed_m25', 'seed_m26', 'seed_m27'] },
            ],
        },
        {
            id: 'g_008',
            name: 'Natur Freunde',
            description: 'Farming, Fishing, Cooking - alles rund um entspannte Simulationsspiele.',
            icon: '\ud83c\udf3f',
            created: now - 86400000 * 70,
            members: [
                { userId: 'seed_owner_8', role: 'owner', joined: now - 86400000 * 70 },
                { userId: 'seed_m30', role: 'member', joined: now - 86400000 * 50 },
                { userId: 'seed_m31', role: 'member', joined: now - 86400000 * 40 },
            ],
            posts: [
                { id: 'p009', userId: 'seed_owner_8', userName: 'FarmerFritz', text: 'Die Farm waechst! Schon 500 Punkte gesammelt.', timestamp: now - 86400000 * 55, likes: [] },
            ],
        },
        {
            id: 'g_009',
            name: 'Retro Gamer',
            description: 'Tetris, Breakout, Snake und mehr! Fuer Fans der klassischen Arcade-Spiele.',
            icon: '\ud83d\udc7e',
            created: now - 86400000 * 65,
            members: [
                { userId: 'seed_owner_9', role: 'owner', joined: now - 86400000 * 65 },
                { userId: 'seed_m32', role: 'admin', joined: now - 86400000 * 55 },
                { userId: 'seed_m33', role: 'member', joined: now - 86400000 * 45 },
                { userId: 'seed_m34', role: 'member', joined: now - 86400000 * 35 },
                { userId: 'seed_m35', role: 'member', joined: now - 86400000 * 25 },
                { userId: 'seed_m36', role: 'member', joined: now - 86400000 * 15 },
                { userId: 'seed_m37', role: 'member', joined: now - 86400000 * 5 },
            ],
            posts: [
                { id: 'p010', userId: 'seed_owner_9', userName: 'RetroRudi', text: 'Tetris-Marathon heute Abend! Wer traut sich?', timestamp: now - 86400000 * 50, likes: ['seed_m32', 'seed_m33'] },
                { id: 'p011', userId: 'seed_m32', userName: 'ArcadeAnna', text: 'Neuer Snake-Rekord: 2.300 Punkte ohne Fehler!', timestamp: now - 86400000 * 40, likes: ['seed_owner_9', 'seed_m34', 'seed_m35'] },
            ],
        },
        {
            id: 'g_010',
            name: 'Weltraum Forscher',
            description: 'Sterne, Asteroiden und unendliche Weiten. Alles rund um Space- und Asteroid-Games!',
            icon: '\ud83d\ude80',
            created: now - 86400000 * 55,
            members: [
                { userId: 'seed_owner_10', role: 'owner', joined: now - 86400000 * 55 },
                { userId: 'seed_m38', role: 'member', joined: now - 86400000 * 40 },
                { userId: 'seed_m39', role: 'member', joined: now - 86400000 * 30 },
            ],
            posts: [
                { id: 'p012', userId: 'seed_owner_10', userName: 'AstroAlex', text: 'Wer schafft den Asteroid-Endgegner? Teilt eure Strategien!', timestamp: now - 86400000 * 45, likes: ['seed_m38'] },
            ],
        },
        {
            id: 'g_011',
            name: 'Koch Profis',
            description: 'Von Anfaenger bis Profikoch! Tipps, Tricks und Highscores fuer alle Kochspiele.',
            icon: '\ud83c\udf73',
            created: now - 86400000 * 50,
            members: [
                { userId: 'seed_owner_11', role: 'owner', joined: now - 86400000 * 50 },
                { userId: 'seed_m40', role: 'member', joined: now - 86400000 * 35 },
            ],
            posts: [],
        },
        {
            id: 'g_012',
            name: 'Quiz Champions',
            description: 'Wissen ist Macht! Taegliche Quiz-Challenges und Wortraetsel fuer kluge Koepfe.',
            icon: '\ud83c\udfc6',
            created: now - 86400000 * 45,
            members: [
                { userId: 'seed_owner_12', role: 'owner', joined: now - 86400000 * 45 },
                { userId: 'seed_m41', role: 'admin', joined: now - 86400000 * 35 },
                { userId: 'seed_m42', role: 'member', joined: now - 86400000 * 25 },
                { userId: 'seed_m43', role: 'member', joined: now - 86400000 * 15 },
                { userId: 'seed_m44', role: 'member', joined: now - 86400000 * 10 },
            ],
            posts: [
                { id: 'p013', userId: 'seed_owner_12', userName: 'QuizQueen', text: 'Woechentliche Quiz-Challenge startet montags um 18 Uhr!', timestamp: now - 86400000 * 35, likes: ['seed_m41', 'seed_m42', 'seed_m43'] },
            ],
        },
        {
            id: 'g_013',
            name: 'Bubble Meister',
            description: 'Pop! Pop! Pop! Alles ueber Bubble Shooter Strategien und Highscores.',
            icon: '\ud83e\udee7',
            created: now - 86400000 * 35,
            members: [
                { userId: 'seed_owner_13', role: 'owner', joined: now - 86400000 * 35 },
                { userId: 'seed_m45', role: 'member', joined: now - 86400000 * 20 },
                { userId: 'seed_m46', role: 'member', joined: now - 86400000 * 10 },
            ],
            posts: [],
        },
        {
            id: 'g_014',
            name: 'Flugakrobaten',
            description: 'Fliege hoeher, weiter und geschickter! Fuer Flappy und Catch Game Enthusiasten.',
            icon: '\ud83e\ude82',
            created: now - 86400000 * 25,
            members: [
                { userId: 'seed_owner_14', role: 'owner', joined: now - 86400000 * 25 },
                { userId: 'seed_m47', role: 'admin', joined: now - 86400000 * 15 },
                { userId: 'seed_m48', role: 'member', joined: now - 86400000 * 10 },
                { userId: 'seed_m49', role: 'member', joined: now - 86400000 * 5 },
            ],
            posts: [
                { id: 'p014', userId: 'seed_owner_14', userName: 'FlapperFinn', text: 'Flappy Bird: 120 Pipes! Kann das jemand schlagen?', timestamp: now - 86400000 * 20, likes: ['seed_m47', 'seed_m48'] },
            ],
        },
        {
            id: 'g_015',
            name: 'GoBlox Anfaenger',
            description: 'Neu bei GoBlox? Hier findest du Hilfe, Tipps und nette Mitspieler fuer den Einstieg!',
            icon: '\ud83c\udf1f',
            created: now - 86400000 * 15,
            members: [
                { userId: 'seed_owner_15', role: 'owner', joined: now - 86400000 * 15 },
                { userId: 'seed_m50', role: 'admin', joined: now - 86400000 * 10 },
                { userId: 'seed_m51', role: 'member', joined: now - 86400000 * 8 },
                { userId: 'seed_m52', role: 'member', joined: now - 86400000 * 6 },
                { userId: 'seed_m53', role: 'member', joined: now - 86400000 * 4 },
                { userId: 'seed_m54', role: 'member', joined: now - 86400000 * 2 },
                { userId: 'seed_m55', role: 'member', joined: now - 86400000 * 1 },
                { userId: 'seed_m56', role: 'member', joined: now - 86400000 * 0.5 },
                { userId: 'seed_m57', role: 'member', joined: now - 86400000 * 0.2 },
                { userId: 'seed_m58', role: 'member', joined: now - 86400000 * 0.1 },
            ],
            posts: [
                { id: 'p015', userId: 'seed_owner_15', userName: 'HelferHans', text: 'Willkommen! Stellt hier eure Fragen, wir helfen gerne.', timestamp: now - 86400000 * 14, likes: ['seed_m50', 'seed_m51', 'seed_m52', 'seed_m53'] },
                { id: 'p016', userId: 'seed_m50', userName: 'GuideGreta', text: 'Tipp: Spielt zuerst die Platformer-Spiele, die sind am einfachsten!', timestamp: now - 86400000 * 8, likes: ['seed_owner_15', 'seed_m54', 'seed_m55'] },
            ],
        },
    ];

    saveGroups(seed);
}

// Run seed on import
ensureSeed();

export const Groups = {
    /**
     * Create a new group.
     * @param {string} userId - creator's user ID
     * @param {{ name: string, description: string, icon: string }} data
     * @returns {{ group?: Object, error?: string }}
     */
    create(userId, { name, description, icon }) {
        if (!name || name.trim().length < 2) return { error: 'Gruppenname muss mindestens 2 Zeichen lang sein!' };
        if (!description || description.trim().length < 5) return { error: 'Beschreibung muss mindestens 5 Zeichen lang sein!' };

        const groups = loadGroups();
        if (groups.find(g => g.name.toLowerCase() === name.trim().toLowerCase())) {
            return { error: 'Eine Gruppe mit diesem Namen existiert bereits!' };
        }

        const user = Auth.getUsers().find(u => u.id === userId);
        const group = {
            id: 'g_' + crypto.randomUUID().slice(0, 8),
            name: name.trim(),
            description: description.trim(),
            icon: icon || '\ud83c\udfae',
            created: Date.now(),
            members: [
                { userId, role: 'owner', joined: Date.now() },
            ],
            posts: [],
        };

        groups.push(group);
        saveGroups(groups);
        return { group };
    },

    /**
     * Get all groups.
     * @returns {Object[]}
     */
    getAll() {
        return loadGroups();
    },

    /**
     * Get a group by its ID.
     * @param {string} groupId
     * @returns {Object|null}
     */
    getById(groupId) {
        return loadGroups().find(g => g.id === groupId) || null;
    },

    /**
     * Join a group.
     * @param {string} userId
     * @param {string} groupId
     * @returns {{ error?: string }}
     */
    join(userId, groupId) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return { error: 'Gruppe nicht gefunden!' };
        if (group.members.find(m => m.userId === userId)) return { error: 'Du bist bereits Mitglied!' };

        group.members.push({ userId, role: 'member', joined: Date.now() });
        saveGroups(groups);
        return {};
    },

    /**
     * Leave a group.
     * @param {string} userId
     * @param {string} groupId
     * @returns {{ error?: string }}
     */
    leave(userId, groupId) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return { error: 'Gruppe nicht gefunden!' };

        const member = group.members.find(m => m.userId === userId);
        if (!member) return { error: 'Du bist kein Mitglied!' };
        if (member.role === 'owner') return { error: 'Der Eigentuemer kann die Gruppe nicht verlassen!' };

        group.members = group.members.filter(m => m.userId !== userId);
        saveGroups(groups);
        return {};
    },

    /**
     * Get all groups a user belongs to.
     * @param {string} userId
     * @returns {Object[]}
     */
    getUserGroups(userId) {
        return loadGroups().filter(g => g.members.some(m => m.userId === userId));
    },

    /**
     * Get member list for a group with roles.
     * @param {string} groupId
     * @returns {Object[]}
     */
    getMembers(groupId) {
        const group = this.getById(groupId);
        if (!group) return [];
        return group.members;
    },

    /**
     * Change a member's role.
     * @param {string} groupId
     * @param {string} userId - user whose role changes
     * @param {string} role - "admin" or "member"
     * @returns {{ error?: string }}
     */
    setRole(groupId, userId, role) {
        if (!['admin', 'member'].includes(role)) return { error: 'Ungueltige Rolle!' };

        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return { error: 'Gruppe nicht gefunden!' };

        const member = group.members.find(m => m.userId === userId);
        if (!member) return { error: 'Benutzer ist kein Mitglied!' };
        if (member.role === 'owner') return { error: 'Die Rolle des Eigentuemers kann nicht geaendert werden!' };

        member.role = role;
        saveGroups(groups);
        return {};
    },

    /**
     * Add a post to the group wall.
     * @param {string} groupId
     * @param {string} userId
     * @param {string} text
     * @returns {{ post?: Object, error?: string }}
     */
    addPost(groupId, userId, text) {
        if (!text || text.trim().length === 0) return { error: 'Beitrag darf nicht leer sein!' };

        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return { error: 'Gruppe nicht gefunden!' };
        if (!group.members.find(m => m.userId === userId)) return { error: 'Du musst Mitglied sein, um zu posten!' };

        const user = Auth.getUsers().find(u => u.id === userId);
        const post = {
            id: 'p_' + crypto.randomUUID().slice(0, 8),
            userId,
            userName: user ? user.name : 'Unbekannt',
            text: text.trim(),
            timestamp: Date.now(),
            likes: [],
        };

        group.posts.unshift(post);
        saveGroups(groups);
        return { post };
    },

    /**
     * Get wall posts for a group.
     * @param {string} groupId
     * @returns {Object[]}
     */
    getPosts(groupId) {
        const group = this.getById(groupId);
        if (!group) return [];
        return group.posts;
    },

    /**
     * Toggle like on a post.
     * @param {string} groupId
     * @param {string} postId
     * @param {string} userId
     * @returns {{ liked: boolean }}
     */
    toggleLike(groupId, postId, userId) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return { liked: false };

        const post = group.posts.find(p => p.id === postId);
        if (!post) return { liked: false };

        const idx = post.likes.indexOf(userId);
        if (idx >= 0) {
            post.likes.splice(idx, 1);
            saveGroups(groups);
            return { liked: false };
        } else {
            post.likes.push(userId);
            saveGroups(groups);
            return { liked: true };
        }
    },

    /**
     * Delete a post from the group wall.
     * @param {string} groupId
     * @param {string} postId
     * @param {string} requesterId - user requesting deletion (must be post author, admin, or owner)
     * @returns {{ error?: string }}
     */
    deletePost(groupId, postId, requesterId) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return { error: 'Gruppe nicht gefunden!' };

        const requester = group.members.find(m => m.userId === requesterId);
        const post = group.posts.find(p => p.id === postId);
        if (!post) return { error: 'Beitrag nicht gefunden!' };

        const isAuthor = post.userId === requesterId;
        const isStaff = requester && (requester.role === 'owner' || requester.role === 'admin');
        if (!isAuthor && !isStaff) return { error: 'Keine Berechtigung!' };

        group.posts = group.posts.filter(p => p.id !== postId);
        saveGroups(groups);
        return {};
    },

    /**
     * Update group info (owner only).
     * @param {string} groupId
     * @param {string} requesterId
     * @param {{ name?: string, description?: string, icon?: string }} updates
     * @returns {{ error?: string }}
     */
    updateGroup(groupId, requesterId, updates) {
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return { error: 'Gruppe nicht gefunden!' };

        const requester = group.members.find(m => m.userId === requesterId);
        if (!requester || requester.role !== 'owner') return { error: 'Nur der Eigentuemer kann die Gruppe bearbeiten!' };

        if (updates.name !== undefined) {
            if (updates.name.trim().length < 2) return { error: 'Gruppenname muss mindestens 2 Zeichen lang sein!' };
            const duplicate = groups.find(g => g.id !== groupId && g.name.toLowerCase() === updates.name.trim().toLowerCase());
            if (duplicate) return { error: 'Eine Gruppe mit diesem Namen existiert bereits!' };
            group.name = updates.name.trim();
        }
        if (updates.description !== undefined) {
            group.description = updates.description.trim();
        }
        if (updates.icon !== undefined) {
            group.icon = updates.icon;
        }

        saveGroups(groups);
        return {};
    },

    /**
     * Get member count for a group.
     * @param {string} groupId
     * @returns {number}
     */
    getMemberCount(groupId) {
        const group = this.getById(groupId);
        return group ? group.members.length : 0;
    },

    /**
     * Get the role of a user in a group.
     * @param {string} groupId
     * @param {string} userId
     * @returns {string|null}
     */
    getUserRole(groupId, userId) {
        const group = this.getById(groupId);
        if (!group) return null;
        const member = group.members.find(m => m.userId === userId);
        return member ? member.role : null;
    },
};
