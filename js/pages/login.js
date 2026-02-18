import { Auth } from '../auth.js';
import { SoundFX } from '../components/sounds.js';

export function renderLogin(container, router) {
    container.innerHTML = `
        <div class="login-page">
            <!-- Animated gradient background -->
            <div class="login-bg-gradient"></div>

            <!-- Floating block shapes (CSS only) -->
            <div class="login-blocks">
                <div class="login-block login-block-1"></div>
                <div class="login-block login-block-2"></div>
                <div class="login-block login-block-3"></div>
                <div class="login-block login-block-4"></div>
                <div class="login-block login-block-5"></div>
                <div class="login-block login-block-6"></div>
                <div class="login-block login-block-7"></div>
                <div class="login-block login-block-8"></div>
            </div>

            <!-- Floating particles -->
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
                <!-- Logo -->
                <div class="login-logo">
                    <div class="login-logo-3d">
                        <div class="login-logo-cube">G</div>
                        <div class="login-logo-cube login-logo-cube-shadow">G</div>
                    </div>
                    <div class="login-logo-text">
                        <span class="login-logo-go">Go</span><span class="login-logo-blox">Blox</span>
                    </div>
                </div>
                <p class="login-subtitle">Baue. Spiele. Entdecke.<br><span>Deine Welt wartet!</span></p>

                <!-- Tabs -->
                <div class="login-tabs">
                    <button class="login-tab active" data-tab="login">Anmelden</button>
                    <button class="login-tab" data-tab="register">Registrieren</button>
                    <div class="login-tab-indicator"></div>
                </div>

                <div class="login-form-wrapper">
                    <!-- Login Form -->
                    <form id="login-form" class="login-form" autocomplete="off">
                        <div class="login-error hidden" id="login-error"></div>

                        <div class="login-input-group">
                            <label for="log-name">Spielername</label>
                            <div class="login-input-wrap">
                                <span class="login-input-icon">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    id="log-name"
                                    class="login-input"
                                    placeholder="Dein Spielername"
                                    required
                                    autocomplete="username"
                                >
                            </div>
                        </div>

                        <div class="login-input-group">
                            <label for="log-password">Passwort</label>
                            <div class="login-input-wrap">
                                <span class="login-input-icon">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    id="log-password"
                                    class="login-input"
                                    placeholder="Dein Passwort"
                                    required
                                    autocomplete="current-password"
                                >
                                <button type="button" class="login-pw-toggle" data-target="log-password" aria-label="Passwort anzeigen">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="pw-icon-show">
                                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                    </svg>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="pw-icon-hide" style="display:none">
                                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="login-submit">
                            <span class="login-submit-text">Anmelden</span>
                            <span class="login-submit-spinner hidden"></span>
                        </button>
                    </form>

                    <!-- Register Form -->
                    <form id="register-form" class="login-form hidden" autocomplete="off">
                        <div class="login-error hidden" id="register-error"></div>

                        <div class="login-input-group">
                            <label for="reg-name">Spielername</label>
                            <div class="login-input-wrap">
                                <span class="login-input-icon">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    id="reg-name"
                                    class="login-input"
                                    placeholder="Dein Spielername"
                                    minlength="3"
                                    maxlength="20"
                                    required
                                    autocomplete="username"
                                >
                            </div>
                        </div>

                        <div class="login-input-group">
                            <label for="reg-birthday">Geburtsdatum</label>
                            <div class="login-input-wrap">
                                <span class="login-input-icon">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.5"/>
                                        <line x1="5" y1="1.5" x2="5" y2="4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                        <line x1="11" y1="1.5" x2="11" y2="4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    </svg>
                                </span>
                                <input
                                    type="date"
                                    id="reg-birthday"
                                    class="login-input"
                                    required
                                >
                            </div>
                            <div class="login-age-badge hidden" id="age-badge"></div>
                        </div>

                        <div class="login-input-group">
                            <label for="reg-password">Passwort</label>
                            <div class="login-input-wrap">
                                <span class="login-input-icon">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    id="reg-password"
                                    class="login-input"
                                    placeholder="Mindestens 4 Zeichen"
                                    minlength="4"
                                    required
                                    autocomplete="new-password"
                                >
                                <button type="button" class="login-pw-toggle" data-target="reg-password" aria-label="Passwort anzeigen">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="pw-icon-show">
                                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                    </svg>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="pw-icon-hide" style="display:none">
                                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="login-pw-strength hidden" id="pw-strength">
                                <div class="pw-strength-bar"><div class="pw-strength-fill"></div></div>
                                <span class="pw-strength-label"></span>
                            </div>
                        </div>

                        <div class="login-input-group">
                            <label for="reg-password-confirm">Passwort best&auml;tigen</label>
                            <div class="login-input-wrap">
                                <span class="login-input-icon">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                                        <polyline points="6,11 7.5,12.5 10,9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    id="reg-password-confirm"
                                    class="login-input"
                                    placeholder="Passwort wiederholen"
                                    minlength="4"
                                    required
                                    autocomplete="new-password"
                                >
                                <button type="button" class="login-pw-toggle" data-target="reg-password-confirm" aria-label="Passwort anzeigen">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="pw-icon-show">
                                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                    </svg>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="pw-icon-hide" style="display:none">
                                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="login-submit login-submit-register">
                            <span class="login-submit-text">Konto erstellen</span>
                            <span class="login-submit-spinner hidden"></span>
                        </button>
                    </form>
                </div>

                <div class="login-footer">
                    <div class="login-footer-secure">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <polyline points="5.5,8.5 7,10 10.5,6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        </svg>
                        Sicher &amp; lokal gespeichert
                    </div>
                    Kein Server, kein Tracking. Erstellt mit <span class="login-heart">&hearts;</span> fuer junge Gamer.
                </div>
            </div>
        </div>
    `;

    // --- Tab Switching with animation ---
    const tabs = container.querySelectorAll('.login-tab');
    const indicator = container.querySelector('.login-tab-indicator');
    const registerForm = container.querySelector('#register-form');
    const loginForm = container.querySelector('#login-form');

    function moveIndicator(tab) {
        if (!indicator) return;
        indicator.style.width = tab.offsetWidth + 'px';
        indicator.style.left = tab.offsetLeft + 'px';
    }

    // Initialize indicator on first active tab
    requestAnimationFrame(() => {
        const activeTab = container.querySelector('.login-tab.active');
        if (activeTab) moveIndicator(activeTab);
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            SoundFX.play('buttonClick');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            moveIndicator(tab);

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
            const showIcon = btn.querySelector('.pw-icon-show');
            const hideIcon = btn.querySelector('.pw-icon-hide');
            if (showIcon) showIcon.style.display = isPassword ? 'none' : '';
            if (hideIcon) hideIcon.style.display = isPassword ? '' : 'none';
        });
    });

    // --- Password Strength Indicator ---
    const pwInput = container.querySelector('#reg-password');
    const pwStrength = container.querySelector('#pw-strength');
    if (pwInput && pwStrength) {
        pwInput.addEventListener('input', () => {
            const val = pwInput.value;
            if (!val) {
                pwStrength.classList.add('hidden');
                return;
            }
            pwStrength.classList.remove('hidden');
            const fill = pwStrength.querySelector('.pw-strength-fill');
            const label = pwStrength.querySelector('.pw-strength-label');

            let score = 0;
            if (val.length >= 4) score++;
            if (val.length >= 6) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^a-zA-Z0-9]/.test(val)) score++;

            const levels = [
                { pct: '20%', color: '#e94560', text: 'Sehr schwach' },
                { pct: '40%', color: '#f59e0b', text: 'Schwach' },
                { pct: '60%', color: '#f59e0b', text: 'Mittel' },
                { pct: '80%', color: '#00b06f', text: 'Stark' },
                { pct: '100%', color: '#00d684', text: 'Sehr stark' },
            ];

            const lvl = levels[Math.min(score, levels.length - 1)];
            fill.style.width = lvl.pct;
            fill.style.background = lvl.color;
            label.textContent = lvl.text;
            label.style.color = lvl.color;
        });
    }

    // --- Birthday / Age badge ---
    const birthdayInput = container.querySelector('#reg-birthday');
    const ageBadge = container.querySelector('#age-badge');
    if (birthdayInput && ageBadge) {
        birthdayInput.addEventListener('change', () => {
            const val = birthdayInput.value;
            if (!val) { ageBadge.classList.add('hidden'); return; }
            const birth = new Date(val);
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
            if (age < 0 || age > 120) { ageBadge.classList.add('hidden'); return; }
            ageBadge.classList.remove('hidden');
            ageBadge.textContent = age + ' Jahre alt';
            if (age < 13) {
                ageBadge.className = 'login-age-badge login-age-young';
            } else {
                ageBadge.className = 'login-age-badge login-age-ok';
            }
        });
    }

    // --- Show Error Helper ---
    function showError(elementId, message) {
        const el = container.querySelector('#' + elementId);
        el.textContent = message;
        el.classList.remove('hidden');
        SoundFX.play('error');

        // Trigger shake on card
        const card = container.querySelector('.login-card');
        card.classList.remove('login-shake');
        void card.offsetWidth;
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
        SoundFX.play('levelUp');
        const flash = document.createElement('div');
        flash.className = 'login-success-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 700);
    }

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

        // Show loading state
        const btn = loginForm.querySelector('.login-submit');
        btn.classList.add('login-submit-loading');
        btn.querySelector('.login-submit-text').textContent = '';
        btn.querySelector('.login-submit-spinner').classList.remove('hidden');

        // Simulate brief loading for polish
        setTimeout(() => {
            const result = Auth.login(name, password);

            if (result.error) {
                btn.classList.remove('login-submit-loading');
                btn.querySelector('.login-submit-text').textContent = 'Anmelden';
                btn.querySelector('.login-submit-spinner').classList.add('hidden');
                showError('login-error', result.error);
                return;
            }

            flashSuccess();
            setTimeout(() => router.navigate('#/home'), 350);
        }, 400);
    });

    // --- Register Submit ---
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError('register-error');

        const name = container.querySelector('#reg-name').value.trim();
        const birthday = container.querySelector('#reg-birthday').value;
        const password = container.querySelector('#reg-password').value;
        const passwordConfirm = container.querySelector('#reg-password-confirm').value;

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

        // Show loading state
        const btn = registerForm.querySelector('.login-submit');
        btn.classList.add('login-submit-loading');
        btn.querySelector('.login-submit-text').textContent = '';
        btn.querySelector('.login-submit-spinner').classList.remove('hidden');

        setTimeout(() => {
            const result = Auth.register(name, birthday, password);

            if (result.error) {
                btn.classList.remove('login-submit-loading');
                btn.querySelector('.login-submit-text').textContent = 'Konto erstellen';
                btn.querySelector('.login-submit-spinner').classList.add('hidden');
                showError('register-error', result.error);
                return;
            }

            flashSuccess();
            setTimeout(() => router.navigate('#/home'), 350);
        }, 500);
    });

    // --- Input focus effects ---
    container.querySelectorAll('.login-input').forEach(input => {
        input.addEventListener('focus', () => {
            input.closest('.login-input-wrap')?.classList.add('input-focused');
        });
        input.addEventListener('blur', () => {
            input.closest('.login-input-wrap')?.classList.remove('input-focused');
        });
    });
}
