/* ===========================
   GoBlox - Sound Effects Manager
   Web Audio API - no external files
   =========================== */

const STORAGE_KEY = 'goblox_sound_settings';

let audioCtx = null;
let masterGain = null;
let _muted = false;
let _volume = 0.3;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        loadSettings();
        applyVolume();
    }
    return audioCtx;
}

function loadSettings() {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (typeof s.volume === 'number') _volume = s.volume;
        if (typeof s.muted === 'boolean') _muted = s.muted;
    } catch { /* ignore */ }
}

function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: _volume, muted: _muted }));
    } catch { /* ignore */ }
}

function applyVolume() {
    if (masterGain) {
        masterGain.gain.setValueAtTime(_muted ? 0 : _volume, audioCtx.currentTime);
    }
}

function playTone(freq, duration, type = 'sine', gainVal = 0.3, rampDown = true) {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    if (rampDown) {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, gainVal = 0.1) {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const bufSize = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    // Bandpass for softer noise
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(ctx.currentTime);
    src.stop(ctx.currentTime + duration);
}

// --- Sound definitions ---

const sounds = {
    buttonClick() {
        // Short click: brief high-freq tick
        playTone(800, 0.06, 'square', 0.15);
        playTone(600, 0.04, 'sine', 0.08);
    },

    purchase() {
        // Cash register "ka-ching"
        const ctx = getCtx();
        const t = ctx.currentTime;
        // First ring
        playTone(1200, 0.12, 'sine', 0.25);
        // Second ring (higher)
        setTimeout(() => playTone(1600, 0.15, 'sine', 0.3), 80);
        // Shimmer
        setTimeout(() => playTone(2000, 0.2, 'sine', 0.15), 150);
        // Metallic noise
        setTimeout(() => playNoise(0.08, 0.05), 60);
    },

    notification() {
        // Gentle "ding"
        playTone(880, 0.25, 'sine', 0.2);
        setTimeout(() => playTone(1100, 0.3, 'sine', 0.15), 100);
    },

    error() {
        // Low "buzz"
        playTone(150, 0.25, 'sawtooth', 0.15);
        playTone(120, 0.3, 'square', 0.08);
    },

    levelUp() {
        // Ascending notes
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, 0.2, 'sine', 0.2), i * 100);
        });
        // Final shimmer
        setTimeout(() => playTone(1047, 0.4, 'sine', 0.15), 400);
    },

    chatMessage() {
        // Soft "pop"
        playTone(500, 0.08, 'sine', 0.2);
        setTimeout(() => playTone(700, 0.06, 'sine', 0.12), 30);
    },
};

// --- Public API ---

export const SoundFX = {
    /**
     * Play a named sound effect.
     * @param {'buttonClick'|'purchase'|'notification'|'error'|'levelUp'|'chatMessage'} name
     */
    play(name) {
        if (_muted) return;
        const fn = sounds[name];
        if (fn) {
            try { fn(); } catch { /* audio may not be ready */ }
        }
    },

    /**
     * Set master volume.
     * @param {number} vol - 0 to 1
     */
    setVolume(vol) {
        _volume = Math.max(0, Math.min(1, vol));
        applyVolume();
        saveSettings();
    },

    /**
     * Get current volume.
     * @returns {number}
     */
    getVolume() {
        return _volume;
    },

    /**
     * Toggle mute.
     * @param {boolean} [state] - Force mute state
     * @returns {boolean} new mute state
     */
    mute(state) {
        _muted = typeof state === 'boolean' ? state : !_muted;
        applyVolume();
        saveSettings();
        return _muted;
    },

    /**
     * Check if muted.
     * @returns {boolean}
     */
    isMuted() {
        return _muted;
    },
};
