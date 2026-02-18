// js/components/chat.js
// Roblox-style Chat Widget — global component
// Exports: initChat(), destroyChat(), toggleChat()

import { Auth } from '../auth.js';
import { Friends } from '../friends.js';

/* ===========================
   SVG Icons
   =========================== */
const ICONS = {
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>`,
    chevronUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"/>
    </svg>`,
    back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
    </svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="8" r="3.5"/>
        <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>
        <circle cx="17.5" cy="8" r="2.5"/>
        <path d="M18 15h1.5a4 4 0 0 1 4 4v2"/>
    </svg>`,
};

/* ===========================
   Bot Response Pool (German)
   =========================== */
const BOT_RESPONSES = [
    'Cool! 😎',
    'Haha nice!',
    'Lass uns spielen! 🎮',
    'Bin gerade beschaeftigt 😅',
    'Was spielst du?',
    'Mega!',
    'Oh echt? 😮',
    'Auf jeden Fall!',
    'Ich bin gleich da!',
    'Klingt gut!',
    'Das macht Spass!',
    'Hast du das neue Spiel gesehen?',
    'GG! 🏆',
    'Niiice!',
    'Krass!',
    'Ich hab gerade ein neues Level geschafft!',
    'Wollen wir zusammen zocken?',
    'LOL 😂',
    'Bis spaeter!',
    'Jo klar!',
    'Wow, nicht schlecht!',
    'Hab ich auch gemacht! 👍',
    'Moment, bin kurz afk',
    'Was geht?',
];

/* Seed messages for first-time conversations */
const SEED_MESSAGES = [
    { text: 'Hey! 👋', fromFriend: true },
    { text: 'Hi! Was geht?', fromFriend: false },
    { text: 'Alles klar, wollen wir spielen?', fromFriend: true },
    { text: 'Ja klar!', fromFriend: false },
    { text: 'Welches Spiel?', fromFriend: true },
    { text: 'Lass uns was Neues ausprobieren!', fromFriend: false },
    { text: 'Cool, bin dabei! 🎮', fromFriend: true },
];

/* ===========================
   State
   =========================== */
let widgetEl = null;
let expanded = false;
let currentView = 'friends'; // 'friends' | 'convo'
let activeFriendId = null;
let typingTimeout = null;
let toastTimeout = null;
let toastEl = null;
let refreshInterval = null;

/* ===========================
   Helpers
   =========================== */

/** Generate a chat storage key (sorted IDs for consistency) */
function chatKey(userId, friendId) {
    const ids = [userId, friendId].sort();
    return `goblox_chat_${ids[0]}_${ids[1]}`;
}

/** Get messages for a conversation */
function getMessages(userId, friendId) {
    const key = chatKey(userId, friendId);
    return JSON.parse(localStorage.getItem(key) || '[]');
}

/** Save messages for a conversation */
function saveMessages(userId, friendId, messages) {
    const key = chatKey(userId, friendId);
    localStorage.setItem(key, JSON.stringify(messages));
}

/** Get unread counts storage */
function getUnreadKey(userId) {
    return `goblox_chat_unread_${userId}`;
}

function getUnreadCounts(userId) {
    return JSON.parse(localStorage.getItem(getUnreadKey(userId)) || '{}');
}

function saveUnreadCounts(userId, counts) {
    localStorage.setItem(getUnreadKey(userId), JSON.stringify(counts));
}

/** Get total unread count */
function getTotalUnread(userId) {
    const counts = getUnreadCounts(userId);
    return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/** Mark conversation as read */
function markRead(userId, friendId) {
    const counts = getUnreadCounts(userId);
    delete counts[friendId];
    saveUnreadCounts(userId, counts);
}

/** Increment unread for a friend */
function addUnread(userId, friendId) {
    const counts = getUnreadCounts(userId);
    counts[friendId] = (counts[friendId] || 0) + 1;
    saveUnreadCounts(userId, counts);
}

/** Get friend online status as a category: 'online' | 'idle' | 'offline' */
function getFriendStatus(friendId) {
    const online = Friends.isOnline(friendId);
    if (online) {
        // Deterministic idle vs online based on ID
        let hash = 0;
        const str = friendId + ':idle';
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return (Math.abs(hash) % 100) < 25 ? 'idle' : 'online';
    }
    return 'offline';
}

/** Get status text */
function getStatusText(status) {
    if (status === 'online') return 'Online';
    if (status === 'idle') return 'Abwesend';
    return 'Offline';
}

/** Get avatar color from user object */
function getAvatarColor(user) {
    return user?.avatar?.skin || '#00b06f';
}

/** Get initial letter */
function getInitial(user) {
    return user?.name ? user.name.charAt(0).toUpperCase() : '?';
}

/** Format timestamp to time string */
function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/** Format date for message separators */
function formatDateSep(ts) {
    const d = new Date(ts);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (today - msgDay) / (1000 * 60 * 60 * 24);

    if (diff < 1) return 'Heute';
    if (diff < 2) return 'Gestern';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Generate seed message history for a new conversation */
function generateSeedHistory(userId, friendId) {
    const key = chatKey(userId, friendId);
    if (localStorage.getItem(key)) return; // Already has history

    const now = Date.now();
    // Pick a random subset of seed messages (3-5)
    const count = 3 + Math.floor(Math.random() * 3);
    const msgs = [];

    for (let i = 0; i < count && i < SEED_MESSAGES.length; i++) {
        const seed = SEED_MESSAGES[i];
        msgs.push({
            id: crypto.randomUUID(),
            senderId: seed.fromFriend ? friendId : userId,
            text: seed.text,
            timestamp: now - (count - i) * 60000 * (5 + Math.floor(Math.random() * 10)),
        });
    }

    saveMessages(userId, friendId, msgs);
}

/** Random bot response */
function getRandomResponse() {
    return BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
}

/** Play notification sound placeholder */
function playNotificationSound() {
    // Placeholder for sound effect — no actual audio
}

/* ===========================
   Render: Chat Widget Shell
   =========================== */
function renderWidget() {
    const user = Auth.currentUser();
    if (!user) return;

    const totalUnread = getTotalUnread(user.id);

    const el = document.createElement('div');
    el.className = 'chat-widget';
    el.id = 'goblox-chat-widget';

    el.innerHTML = `
        <div class="chat-panel">
            <div class="chat-panel-inner" id="chat-panel-inner"></div>
        </div>
        <div class="chat-bar" id="chat-bar">
            <span class="chat-bar-icon">
                ${ICONS.chat}
                <span class="chat-bar-dot"></span>
            </span>
            <span class="chat-bar-label">Chat</span>
            <span class="chat-bar-badge ${totalUnread === 0 ? 'hidden' : ''}" id="chat-badge">${totalUnread}</span>
            <span class="chat-bar-chevron">${ICONS.chevronUp}</span>
        </div>
    `;

    return el;
}

/* ===========================
   Render: Friends List
   =========================== */
function renderFriendsList() {
    const user = Auth.currentUser();
    if (!user) return '';

    const friends = Friends.getFriends(user.id);
    const unreadCounts = getUnreadCounts(user.id);

    // Ensure seed history exists for each friend
    friends.forEach(f => generateSeedHistory(user.id, f.id));

    // Sort: online first, then by latest message timestamp
    const sorted = friends.map(f => {
        const msgs = getMessages(user.id, f.id);
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const status = getFriendStatus(f.id);
        return { friend: f, lastMsg, status, unread: unreadCounts[f.id] || 0 };
    }).sort((a, b) => {
        // Online friends first
        const statusOrder = { online: 0, idle: 1, offline: 2 };
        const sd = statusOrder[a.status] - statusOrder[b.status];
        if (sd !== 0) return sd;
        // Then by last message time
        const aTime = a.lastMsg?.timestamp || 0;
        const bTime = b.lastMsg?.timestamp || 0;
        return bTime - aTime;
    });

    if (sorted.length === 0) {
        return `
            <div class="chat-friends-view">
                <div class="chat-search-wrap">
                    <span class="chat-search-icon">${ICONS.search}</span>
                    <input type="text" class="chat-search" id="chat-search" placeholder="Freunde suchen..." autocomplete="off" />
                </div>
                <div class="chat-friends-empty">
                    ${ICONS.users}
                    <p>Noch keine Freunde.</p>
                    <p style="font-size:0.72rem;">Fuege Freunde unter "Freunde" hinzu!</p>
                </div>
            </div>
        `;
    }

    const listHTML = sorted.map(({ friend, lastMsg, status, unread }) => {
        const avatarColor = getAvatarColor(friend);
        const initial = getInitial(friend);
        const preview = lastMsg
            ? (lastMsg.senderId === user.id ? `Du: ${lastMsg.text}` : lastMsg.text)
            : '';
        const timeStr = lastMsg ? formatTime(lastMsg.timestamp) : '';

        return `
            <div class="chat-friend-item" data-friend-id="${friend.id}">
                <div class="chat-friend-avatar" style="background-color: ${avatarColor};">
                    ${initial}
                    <span class="chat-friend-status ${status}"></span>
                </div>
                <div class="chat-friend-info">
                    <div class="chat-friend-name">${friend.name}</div>
                    <div class="chat-friend-preview">${escapeHTML(truncate(preview, 30))}</div>
                </div>
                <div class="chat-friend-meta">
                    ${timeStr ? `<span class="chat-friend-time">${timeStr}</span>` : ''}
                    ${unread > 0 ? `<span class="chat-friend-unread">${unread}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="chat-friends-view">
            <div class="chat-search-wrap">
                <span class="chat-search-icon">${ICONS.search}</span>
                <input type="text" class="chat-search" id="chat-search" placeholder="Freunde suchen..." autocomplete="off" />
            </div>
            <div class="chat-friends-list" id="chat-friends-list">
                ${listHTML}
            </div>
        </div>
    `;
}

/* ===========================
   Render: Conversation View
   =========================== */
function renderConversation(friendId) {
    const user = Auth.currentUser();
    if (!user) return '';

    const users = Auth.getUsers();
    const friend = users.find(u => u.id === friendId);
    if (!friend) return '';

    const status = getFriendStatus(friendId);
    const statusText = getStatusText(status);
    const avatarColor = getAvatarColor(friend);
    const friendInitial = getInitial(friend);
    const userColor = getAvatarColor(user);
    const userInitial = getInitial(user);

    const messages = getMessages(user.id, friendId);

    // Build messages with date separators
    let msgsHTML = '';
    let lastDateStr = '';

    messages.forEach(msg => {
        const dateStr = formatDateSep(msg.timestamp);
        if (dateStr !== lastDateStr) {
            msgsHTML += `<div class="chat-date-sep"><span>${dateStr}</span></div>`;
            lastDateStr = dateStr;
        }

        const isOwn = msg.senderId === user.id;
        const msgAvatarColor = isOwn ? userColor : avatarColor;
        const msgInitial = isOwn ? userInitial : friendInitial;

        msgsHTML += `
            <div class="chat-msg ${isOwn ? 'own' : 'other'}">
                <div class="chat-msg-avatar" style="background-color: ${msgAvatarColor};">${msgInitial}</div>
                <div class="chat-msg-content">
                    <div class="chat-msg-bubble">${escapeHTML(msg.text)}</div>
                    <div class="chat-msg-time">${formatTime(msg.timestamp)}</div>
                </div>
            </div>
        `;
    });

    return `
        <div class="chat-convo-view">
            <div class="chat-convo-header">
                <button class="chat-back-btn" id="chat-back-btn" title="Zurueck">
                    ${ICONS.back}
                </button>
                <div class="chat-convo-user">
                    <div class="chat-convo-name">${friend.name}</div>
                    <div class="chat-convo-status ${status}">${statusText}</div>
                </div>
                <div class="chat-friend-avatar" style="background-color: ${avatarColor}; width: 30px; height: 30px; font-size: 0.75rem;">
                    ${friendInitial}
                    <span class="chat-friend-status ${status}"></span>
                </div>
            </div>
            <div class="chat-messages" id="chat-messages">
                ${msgsHTML}
            </div>
            <div class="chat-typing" id="chat-typing"></div>
            <div class="chat-input-area">
                <input type="text" class="chat-input" id="chat-input" placeholder="Nachricht schreiben..." autocomplete="off" />
                <button class="chat-send-btn" id="chat-send-btn" title="Senden">
                    ${ICONS.send}
                </button>
            </div>
        </div>
    `;
}

/* ===========================
   Utility
   =========================== */
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '...' : str;
}

/* ===========================
   Update Badge
   =========================== */
function updateBadge() {
    const user = Auth.currentUser();
    if (!user || !widgetEl) return;

    const totalUnread = getTotalUnread(user.id);
    const badge = widgetEl.querySelector('#chat-badge');
    if (badge) {
        badge.textContent = totalUnread;
        badge.classList.toggle('hidden', totalUnread === 0);
    }
}

/* ===========================
   Show Toast Notification
   =========================== */
function showToast(friend, messageText) {
    // Don't show toast if chat is open to this friend
    if (expanded && currentView === 'convo' && activeFriendId === friend.id) return;

    // Remove existing toast
    dismissToast();

    const avatarColor = getAvatarColor(friend);
    const initial = getInitial(friend);

    const el = document.createElement('div');
    el.className = 'chat-toast';
    el.innerHTML = `
        <div class="chat-toast-avatar" style="background-color: ${avatarColor};">${initial}</div>
        <div class="chat-toast-body">
            <div class="chat-toast-name">${friend.name}</div>
            <div class="chat-toast-text">${escapeHTML(truncate(messageText, 40))}</div>
        </div>
    `;

    // Click toast to open that conversation
    el.addEventListener('click', () => {
        dismissToast();
        if (!expanded) toggleChatExpand();
        openConversation(friend.id);
    });

    document.body.appendChild(el);
    toastEl = el;

    playNotificationSound();

    // Auto-dismiss after 4 seconds
    toastTimeout = setTimeout(() => {
        dismissToast();
    }, 4000);
}

function dismissToast() {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }
    if (toastEl) {
        toastEl.classList.add('chat-toast-out');
        const ref = toastEl;
        setTimeout(() => ref.remove(), 250);
        toastEl = null;
    }
}

/* ===========================
   Open Conversation
   =========================== */
function openConversation(friendId) {
    const user = Auth.currentUser();
    if (!user) return;

    activeFriendId = friendId;
    currentView = 'convo';

    // Mark as read
    markRead(user.id, friendId);
    updateBadge();

    const inner = widgetEl?.querySelector('#chat-panel-inner');
    if (!inner) return;

    inner.innerHTML = renderConversation(friendId);
    bindConversationEvents(inner, friendId);

    // Scroll to bottom
    const msgsEl = inner.querySelector('#chat-messages');
    if (msgsEl) {
        msgsEl.scrollTop = msgsEl.scrollHeight;
    }
}

/* ===========================
   Bind Conversation Events
   =========================== */
function bindConversationEvents(container, friendId) {
    const user = Auth.currentUser();
    if (!user) return;

    const backBtn = container.querySelector('#chat-back-btn');
    const inputEl = container.querySelector('#chat-input');
    const sendBtn = container.querySelector('#chat-send-btn');

    // Back button
    backBtn?.addEventListener('click', () => {
        currentView = 'friends';
        activeFriendId = null;
        clearTyping();
        renderCurrentView();
    });

    // Send message
    function sendMessage() {
        const text = inputEl?.value.trim();
        if (!text) return;

        const messages = getMessages(user.id, friendId);
        const msg = {
            id: crypto.randomUUID(),
            senderId: user.id,
            text,
            timestamp: Date.now(),
        };
        messages.push(msg);
        saveMessages(user.id, friendId, messages);

        inputEl.value = '';

        // Append message to DOM
        appendMessageToDOM(msg, user, friendId);

        // Simulate bot typing & response
        simulateBotResponse(friendId);
    }

    sendBtn?.addEventListener('click', sendMessage);
    inputEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Focus input
    inputEl?.focus();
}

/* ===========================
   Append Message to DOM
   =========================== */
function appendMessageToDOM(msg, user, friendId) {
    const msgsEl = widgetEl?.querySelector('#chat-messages');
    if (!msgsEl) return;

    const users = Auth.getUsers();
    const friend = users.find(u => u.id === friendId);
    const isOwn = msg.senderId === user.id;
    const avatarColor = isOwn ? getAvatarColor(user) : getAvatarColor(friend);
    const initial = isOwn ? getInitial(user) : getInitial(friend);

    // Check if we need a date separator
    const existingMsgs = msgsEl.querySelectorAll('.chat-msg');
    const lastMsgEl = existingMsgs[existingMsgs.length - 1];
    let needDateSep = true;
    if (lastMsgEl) {
        // There's at least one message, check if same day
        const lastDateSeps = msgsEl.querySelectorAll('.chat-date-sep span');
        const lastDateSep = lastDateSeps[lastDateSeps.length - 1];
        if (lastDateSep && lastDateSep.textContent === formatDateSep(msg.timestamp)) {
            needDateSep = false;
        }
    }

    let html = '';
    if (needDateSep && existingMsgs.length === 0) {
        // First message, add date sep only if messages area was empty
    }

    html += `
        <div class="chat-msg ${isOwn ? 'own' : 'other'}">
            <div class="chat-msg-avatar" style="background-color: ${avatarColor};">${initial}</div>
            <div class="chat-msg-content">
                <div class="chat-msg-bubble">${escapeHTML(msg.text)}</div>
                <div class="chat-msg-time">${formatTime(msg.timestamp)}</div>
            </div>
        </div>
    `;

    msgsEl.insertAdjacentHTML('beforeend', html);
    msgsEl.scrollTop = msgsEl.scrollHeight;
}

/* ===========================
   Simulate Bot Response
   =========================== */
function simulateBotResponse(friendId) {
    const user = Auth.currentUser();
    if (!user) return;

    clearTyping();

    // Show typing indicator after a short delay
    const typingDelay = 500 + Math.random() * 800;
    typingTimeout = setTimeout(() => {
        showTypingIndicator(friendId);

        // Send response after 1-3 seconds
        const responseDelay = 1000 + Math.random() * 2000;
        typingTimeout = setTimeout(() => {
            clearTyping();

            const messages = getMessages(user.id, friendId);
            const botMsg = {
                id: crypto.randomUUID(),
                senderId: friendId,
                text: getRandomResponse(),
                timestamp: Date.now(),
            };
            messages.push(botMsg);
            saveMessages(user.id, friendId, messages);

            // If currently viewing this conversation, append
            if (currentView === 'convo' && activeFriendId === friendId) {
                appendMessageToDOM(botMsg, user, friendId);
            } else {
                // Add unread and show toast
                addUnread(user.id, friendId);
                updateBadge();

                const users = Auth.getUsers();
                const friend = users.find(u => u.id === friendId);
                if (friend) {
                    showToast(friend, botMsg.text);
                }
            }
        }, responseDelay);
    }, typingDelay);
}

/* ===========================
   Typing Indicator
   =========================== */
function showTypingIndicator(friendId) {
    const typingEl = widgetEl?.querySelector('#chat-typing');
    if (!typingEl) return;

    const users = Auth.getUsers();
    const friend = users.find(u => u.id === friendId);
    if (!friend) return;

    typingEl.innerHTML = `
        <span class="chat-typing-text">${friend.name} schreibt...</span>
        <span class="chat-typing-dots">
            <span></span><span></span><span></span>
        </span>
    `;
}

function clearTyping() {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
    const typingEl = widgetEl?.querySelector('#chat-typing');
    if (typingEl) {
        typingEl.innerHTML = '';
    }
}

/* ===========================
   Render Current View
   =========================== */
function renderCurrentView() {
    const inner = widgetEl?.querySelector('#chat-panel-inner');
    if (!inner) return;

    if (currentView === 'convo' && activeFriendId) {
        openConversation(activeFriendId);
    } else {
        currentView = 'friends';
        inner.innerHTML = renderFriendsList();
        bindFriendsListEvents(inner);
    }
}

/* ===========================
   Bind Friends List Events
   =========================== */
function bindFriendsListEvents(container) {
    // Search
    const searchInput = container.querySelector('#chat-search');
    searchInput?.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        const items = container.querySelectorAll('.chat-friend-item');
        items.forEach(item => {
            const name = item.querySelector('.chat-friend-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(query) ? '' : 'none';
        });
    });

    // Click friend
    const friendItems = container.querySelectorAll('.chat-friend-item');
    friendItems.forEach(item => {
        item.addEventListener('click', () => {
            const friendId = item.dataset.friendId;
            if (friendId) {
                openConversation(friendId);
            }
        });
    });
}

/* ===========================
   Toggle Chat Expand/Collapse
   =========================== */
function toggleChatExpand() {
    if (!widgetEl) return;

    expanded = !expanded;
    widgetEl.classList.toggle('expanded', expanded);

    if (expanded) {
        renderCurrentView();
    }
}

/* ===========================
   Public: initChat()
   =========================== */
export function initChat() {
    const user = Auth.currentUser();
    if (!user) return;

    // Don't double-init
    if (widgetEl && document.body.contains(widgetEl)) return;

    // Reset state
    expanded = false;
    currentView = 'friends';
    activeFriendId = null;

    widgetEl = renderWidget();
    if (!widgetEl) return;

    document.body.appendChild(widgetEl);

    // Bind chat bar click
    const chatBar = widgetEl.querySelector('#chat-bar');
    chatBar?.addEventListener('click', toggleChatExpand);

    // Initial render of panel content
    renderCurrentView();

    // Periodic refresh (update online status, etc.) every 30s
    refreshInterval = setInterval(() => {
        if (expanded && currentView === 'friends') {
            renderCurrentView();
        }
        updateBadge();
    }, 30000);
}

/* ===========================
   Public: destroyChat()
   =========================== */
export function destroyChat() {
    clearTyping();
    dismissToast();

    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }

    if (widgetEl) {
        widgetEl.remove();
        widgetEl = null;
    }

    expanded = false;
    currentView = 'friends';
    activeFriendId = null;
}

/* ===========================
   Public: toggleChat()
   =========================== */
export function toggleChat() {
    if (!widgetEl) {
        initChat();
        if (widgetEl) toggleChatExpand();
    } else {
        toggleChatExpand();
    }
}
