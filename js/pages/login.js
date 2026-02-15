import { Auth } from '../auth.js';

export function renderLogin(container, router) {
    container.innerHTML = `
        <div class="login-page">
            <div class="login-particles">
                <div class="login-particle"></div>
                <div class="login-particle"></div>
                <div class="login-particle"></div>
                <div class="login-particle"></div>
                <div class="login-particle"></div>
                <div class="login-particle"></div>
                <div class="login-particle"></div>
                <div class="login-particle"></div>
            </div>

            <div class="login-card">
                <div class="login-logo">
                    <div class="login-logo-icon">&#127922;</div>
                    <div class="login-logo-text">GoBlox</div>
                </div>
                <p class="login-subtitle"><span>5.000</span> Spiele warten auf dich!</p>

                <div class="login-tabs">
                    <button class="login-tab active" data-tab="register">Registrieren</button>
                    <button class="login-tab" data-tab="login">Anmelden</button>
                </div>

                <div class="login-form-wrapper">
                    <!-- Register Form -->
                    <form id="register-form" class="login-form" autocomplete="off">
                        <div class="login-error hidden" id="register-error"></div>

                        <div class="login-input-group">
                            <label for="reg-name">Spielername</label>
                            <input
                                type="text"
                                id="reg-name"
                                class="login-input"
                                placeholder="Dein Spielername"
                                minlength="3"
                                maxlength="20"
                                required
                            >
                            <span class="login-input-icon">&#128100;</span>
                        </div>

                        <div class="login-input-group">
                            <label for="reg-birthday">Geburtsdatum</label>
                            <input
                                type="date"
                                id="reg-birthday"
                                class="login-input"
                                required
                            >
                            <span class="login-input-icon">&#128197;</span>
                        </div>

                        <div class="login-input-group">
                            <label for="reg-password">Passwort</label>
                            <input
                                type="password"
                                id="reg-password"
                                class="login-input"
                                placeholder="Mindestens 4 Zeichen"
                                minlength="4"
                                required
                            >
                            <span class="login-input-icon">&#128274;</span>
                            <button type="button" class="login-pw-toggle" data-target="reg-password" aria-label="Passwort anzeigen">&#128065;</button>
                        </div>

                        <div class="login-input-group">
                            <label for="reg-password-confirm">Passwort best&auml;tigen</label>
                            <input
                                type="password"
                                id="reg-password-confirm"
                                class="login-input"
                                placeholder="Passwort wiederholen"
                                minlength="4"
                                required
                            >
                            <span class="login-input-icon">&#128274;</span>
                            <button type="button" class="login-pw-toggle" data-target="reg-password-confirm" aria-label="Passwort anzeigen">&#128065;</button>
                        </div>

                        <button type="submit" class="login-submit">Registrieren</button>
                    </form>

                    <!-- Login Form -->
                    <form id="login-form" class="login-form hidden" autocomplete="off">
                        <div class="login-error hidden" id="login-error"></div>

                        <div class="login-input-group">
                            <label for="log-name">Spielername</label>
                            <input
                                type="text"
                                id="log-name"
                                class="login-input"
                                placeholder="Dein Spielername"
                                required
                            >
                            <span class="login-input-icon">&#128100;</span>
                        </div>

                        <div class="login-input-group">
                            <label for="log-password">Passwort</label>
                            <input
                                type="password"
                                id="log-password"
                                class="login-input"
                                placeholder="Dein Passwort"
                                required
                            >
                            <span class="login-input-icon">&#128274;</span>
                            <button type="button" class="login-pw-toggle" data-target="log-password" aria-label="Passwort anzeigen">&#128065;</button>
                        </div>

                        <button type="submit" class="login-submit">Anmelden</button>
                    </form>
                </div>

                <div class="login-footer">
                    Sicher &amp; lokal gespeichert &mdash; kein Server, kein Tracking.<br>
                    Erstellt mit <span>&hearts;</span> f&uuml;r junge Gamer.
                </div>
            </div>
        </div>
    `;

    // --- Tab Switching ---
    const tabs = container.querySelectorAll('.login-tab');
    const registerForm = container.querySelector('#register-form');
    const loginForm = container.querySelector('#login-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (target === 'register') {
                registerForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            } else {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            }

            // Clear errors on tab switch
            container.querySelectorAll('.login-error').forEach(e => {
                e.classList.add('hidden');
                e.textContent = '';
            });
        });
    });

    // --- Password Toggle ---
    container.querySelectorAll('.login-pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = container.querySelector('#' + btn.dataset.target);
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.innerHTML = isPassword ? '&#128584;' : '&#128065;';
        });
    });

    // --- Show Error Helper ---
    function showError(elementId, message) {
        const el = container.querySelector('#' + elementId);
        el.textContent = message;
        el.classList.remove('hidden');

        // Trigger shake on card
        const card = container.querySelector('.login-card');
        card.classList.remove('login-shake');
        void card.offsetWidth; // Force reflow to restart animation
        card.classList.add('login-shake');
        setTimeout(() => card.classList.remove('login-shake'), 600);
    }

    function clearError(elementId) {
        const el = container.querySelector('#' + elementId);
        el.textContent = '';
        el.classList.add('hidden');
    }

    // --- Success Flash ---
    function flashSuccess() {
        const flash = document.createElement('div');
        flash.className = 'login-success-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 700);
    }

    // --- Register Submit ---
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError('register-error');

        const name = container.querySelector('#reg-name').value.trim();
        const birthday = container.querySelector('#reg-birthday').value;
        const password = container.querySelector('#reg-password').value;
        const passwordConfirm = container.querySelector('#reg-password-confirm').value;

        // Client-side validation
        if (!name) {
            showError('register-error', 'Bitte gib einen Spielernamen ein!');
            return;
        }
        if (name.length < 3) {
            showError('register-error', 'Name muss mindestens 3 Zeichen lang sein!');
            return;
        }
        if (!birthday) {
            showError('register-error', 'Bitte gib dein Geburtsdatum ein!');
            return;
        }
        if (!password) {
            showError('register-error', 'Bitte gib ein Passwort ein!');
            return;
        }
        if (password.length < 4) {
            showError('register-error', 'Passwort muss mindestens 4 Zeichen lang sein!');
            return;
        }
        if (password !== passwordConfirm) {
            showError('register-error', 'Die Passw\u00f6rter stimmen nicht \u00fcberein!');
            return;
        }

        const result = Auth.register(name, birthday, password);

        if (result.error) {
            showError('register-error', result.error);
            return;
        }

        // Success
        flashSuccess();
        setTimeout(() => router.navigate('#/home'), 300);
    });

    // --- Login Submit ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError('login-error');

        const name = container.querySelector('#log-name').value.trim();
        const password = container.querySelector('#log-password').value;

        if (!name) {
            showError('login-error', 'Bitte gib deinen Spielernamen ein!');
            return;
        }
        if (!password) {
            showError('login-error', 'Bitte gib dein Passwort ein!');
            return;
        }

        const result = Auth.login(name, password);

        if (result.error) {
            showError('login-error', result.error);
            return;
        }

        // Success
        flashSuccess();
        setTimeout(() => router.navigate('#/home'), 300);
    });
}
