// js/pages/settings.js
import { Auth } from '../auth.js';

function getSettingsKey(userId) {
    return `goblox_settings_${userId}`;
}

function getSettings(userId) {
    return JSON.parse(localStorage.getItem(getSettingsKey(userId)) || '{}');
}

function saveSettings(userId, settings) {
    localStorage.setItem(getSettingsKey(userId), JSON.stringify(settings));
}

export function renderSettings(container, router) {
    const user = Auth.currentUser();
    if (!user) return;

    const settings = getSettings(user.id);
    const volume = settings.volume !== undefined ? settings.volume : 50;
    const theme = settings.theme || 'dark';

    // Apply current theme
    applyTheme(theme);

    container.innerHTML = `
        <div class="settings-page animate-fade-in">
            <h1>Einstellungen</h1>
            <p class="text-secondary mb-3">Passe GoBlox nach deinen Wuenschen an.</p>

            <!-- Sound -->
            <div class="settings-section">
                <h3 class="settings-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    Sound
                </h3>
                <div class="settings-row">
                    <label class="settings-label" for="settings-volume">Lautstaerke</label>
                    <div class="settings-slider-wrap">
                        <input type="range" min="0" max="100" value="${volume}" class="settings-slider" id="settings-volume" />
                        <span class="settings-slider-value" id="settings-volume-val">${volume}%</span>
                    </div>
                </div>
            </div>

            <!-- Theme -->
            <div class="settings-section">
                <h3 class="settings-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    Theme
                </h3>
                <div class="settings-row">
                    <label class="settings-label">Dark / Light Mode</label>
                    <div class="settings-toggle-wrap">
                        <span class="settings-toggle-label-text">Dark</span>
                        <label class="settings-toggle">
                            <input type="checkbox" id="settings-theme-toggle" ${theme === 'light' ? 'checked' : ''} />
                            <span class="settings-toggle-slider"></span>
                        </label>
                        <span class="settings-toggle-label-text">Light</span>
                    </div>
                </div>
            </div>

            <!-- Language -->
            <div class="settings-section">
                <h3 class="settings-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    Sprache
                </h3>
                <div class="settings-row">
                    <label class="settings-label" for="settings-lang">Sprache waehlen</label>
                    <select class="settings-select" id="settings-lang">
                        <option value="de" selected>Deutsch</option>
                        <option value="en" disabled>English (Coming soon)</option>
                    </select>
                </div>
            </div>

            <!-- Account -->
            <div class="settings-section">
                <h3 class="settings-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
                    Account
                </h3>

                <!-- Change Password -->
                <div class="settings-subsection">
                    <h4 class="settings-subsection-title">Passwort aendern</h4>
                    <div class="settings-form-row">
                        <input type="password" class="input settings-input" id="settings-old-pw" placeholder="Aktuelles Passwort" autocomplete="current-password" />
                    </div>
                    <div class="settings-form-row">
                        <input type="password" class="input settings-input" id="settings-new-pw" placeholder="Neues Passwort (mind. 4 Zeichen)" autocomplete="new-password" />
                    </div>
                    <button class="btn btn-sm" id="settings-pw-btn">Passwort speichern</button>
                    <span class="settings-pw-msg" id="settings-pw-msg"></span>
                </div>

                <!-- Delete Account -->
                <div class="settings-subsection settings-danger-zone">
                    <h4 class="settings-subsection-title">Gefahrenzone</h4>
                    <p class="text-secondary" style="font-size:0.85rem;margin-bottom:0.75rem;">
                        Das Loeschen deines Accounts kann nicht rueckgaengig gemacht werden.
                    </p>
                    <button class="btn settings-btn-danger" id="settings-delete-btn">Account loeschen</button>
                </div>
            </div>

            <!-- Delete Confirmation Modal -->
            <div class="settings-modal-overlay hidden" id="settings-delete-modal">
                <div class="settings-modal">
                    <h3>Account loeschen?</h3>
                    <p>Bist du sicher? Das kann nicht rueckgaengig gemacht werden!</p>
                    <div class="settings-modal-actions">
                        <button class="btn settings-btn-danger" id="settings-confirm-delete">Ja, loeschen</button>
                        <button class="btn btn-secondary" id="settings-cancel-delete">Abbrechen</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // ── Volume slider ──
    const volumeSlider = container.querySelector('#settings-volume');
    const volumeVal = container.querySelector('#settings-volume-val');
    volumeSlider.addEventListener('input', () => {
        const v = parseInt(volumeSlider.value);
        volumeVal.textContent = v + '%';
        const s = getSettings(user.id);
        s.volume = v;
        saveSettings(user.id, s);
    });

    // ── Theme toggle ──
    const themeToggle = container.querySelector('#settings-theme-toggle');
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'light' : 'dark';
        const s = getSettings(user.id);
        s.theme = newTheme;
        saveSettings(user.id, s);
        applyTheme(newTheme);
    });

    // ── Change Password ──
    container.querySelector('#settings-pw-btn').addEventListener('click', () => {
        const oldPw = container.querySelector('#settings-old-pw').value;
        const newPw = container.querySelector('#settings-new-pw').value;
        const msg = container.querySelector('#settings-pw-msg');

        if (oldPw !== user.password) {
            msg.textContent = 'Aktuelles Passwort ist falsch!';
            msg.className = 'settings-pw-msg error';
            return;
        }
        if (!newPw || newPw.length < 4) {
            msg.textContent = 'Neues Passwort muss mind. 4 Zeichen haben!';
            msg.className = 'settings-pw-msg error';
            return;
        }

        Auth.updateUser({ password: newPw });
        msg.textContent = 'Passwort geaendert!';
        msg.className = 'settings-pw-msg success';
        container.querySelector('#settings-old-pw').value = '';
        container.querySelector('#settings-new-pw').value = '';

        setTimeout(() => { msg.textContent = ''; msg.className = 'settings-pw-msg'; }, 3000);
    });

    // ── Delete Account ──
    const deleteModal = container.querySelector('#settings-delete-modal');
    container.querySelector('#settings-delete-btn').addEventListener('click', () => {
        deleteModal.classList.remove('hidden');
    });
    container.querySelector('#settings-cancel-delete').addEventListener('click', () => {
        deleteModal.classList.add('hidden');
    });
    container.querySelector('#settings-confirm-delete').addEventListener('click', () => {
        Auth.deleteAccount();
        router.navigate('#/login');
    });

    // Close modal on overlay click
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.classList.add('hidden');
        }
    });
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}
