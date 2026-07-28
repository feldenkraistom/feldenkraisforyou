// ==========================================
// 1. SUPABASE CONFIGURATION
// ==========================================
// Ersetze diese beiden Werte mit deinen eigenen Supabase-Projektdaten:
const SUPABASE_URL = "https://foddorljzzricsrkzxtf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0R_F74kWn_QhtSHIcVTZ4w_XDhTc-KK";

// Initialisiere den Supabase Client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Globaler Zustand für den aktuellen Nutzer & Einstellungen
let currentUser = null;
let isSignUpMode = false;

// Default-Einstellungen
let userSettings = {
    breath_speed: "meditative",
    rounds: 3,
    breath_count: 30,
    bg_music: true,
    audio_guide_thomas: true,
    breath_sounds: true,
    haptic_feedback: true,
    chime_gong: true
};

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const views = document.querySelectorAll('.view');
const logoutBtn = document.getElementById('logout-btn');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');

const settingsForm = document.getElementById('settings-form');
const roundsCount = document.getElementById('rounds-count');
const roundsVal = document.getElementById('rounds-val');
const breathCount = document.getElementById('breath-count');
const breathVal = document.getElementById('breath-val');
const settingsMsg = document.getElementById('settings-msg');

// ==========================================
// 3. NAVIGATION CONTROLLER
// ==========================================
function navigateTo(viewId) {
    views.forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
    }
}

// ==========================================
// 4. AUTHENTICATION LOGIC (SUPABASE)
// ==========================================

// Toggle zwischen Anmelden und Registrieren
authToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');

    if (isSignUpMode) {
        authTitle.innerText = "Konto erstellen";
        authSubmitBtn.innerText = "Registrieren";
        authToggleText.innerText = "Bereits registriert?";
        authToggleBtn.innerText = "Hier anmelden";
    } else {
        authTitle.innerText = "Willkommen zurück";
        authSubmitBtn.innerText = "Anmelden";
        authToggleText.innerText = "Noch kein Konto?";
        authToggleBtn.innerText = "Jetzt registrieren";
    }
});

// Auth Formular senden (Login / SignUp)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');

    if (!supabase) {
        // Fallback für Testzwecke ohne konfigurierte Supabase Keys
        console.warn("Supabase nicht konfiguriert. Simulationsmodus aktiv.");
        currentUser = { id: "test-user-id", email: email };
        logoutBtn.classList.remove('hidden');
        navigateTo('view-menu');
        return;
    }

    if (isSignUpMode) {
        // Registrierung
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            showAuthError(error.message);
        } else {
            showAuthSuccess("Registrierung erfolgreich! Bitte prüfe deine E-Mails zur Bestätigung.");
        }
    } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showAuthError("Login fehlgeschlagen: " + error.message);
        } else {
            currentUser = data.user;
            logoutBtn.classList.remove('hidden');
            await loadUserSettings();
            navigateTo('view-menu');
        }
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    if (supabase) await supabase.auth.signOut();
    currentUser = null;
    logoutBtn.classList.add('hidden');
    navigateTo('view-auth');
});

function showAuthError(msg) {
    authError.innerText = msg;
    authError.classList.remove('hidden');
}

function showAuthSuccess(msg) {
    authSuccess.innerText = msg;
    authSuccess.classList.remove('hidden');
}

// ==========================================
// 5. USER SETTINGS & DATABASE LOGIC
// ==========================================

// Dynamic range slider display updates
roundsCount.addEventListener('input', (e) => roundsVal.innerText = e.target.value);
breathCount.addEventListener('input', (e) => breathVal.innerText = e.target.value);

// Lade Einstellungen aus Supabase
async function loadUserSettings() {
    if (!supabase || !currentUser) return;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (data) {
        userSettings = data;
        applySettingsToUI();
    }
}

// UI mit aktuellen Einstellungen füllen
function applySettingsToUI() {
    document.getElementById('breath-speed').value = userSettings.breath_speed || "meditative";
    roundsCount.value = userSettings.rounds || 3;
    roundsVal.innerText = userSettings.rounds || 3;
    breathCount.value = userSettings.breath_count || 30;
    breathVal.innerText = userSettings.breath_count || 30;

    document.getElementById('bg-music').checked = userSettings.bg_music ?? true;
    document.getElementById('audio-guide').checked = userSettings.audio_guide_thomas ?? true;
    document.getElementById('breath-sounds').checked = userSettings.breath_sounds ?? true;
    document.getElementById('haptic-feedback').checked = userSettings.haptic_feedback ?? true;
    document.getElementById('chime-gong').checked = userSettings.chime_gong ?? true;
}

// Einstellungen in Supabase speichern
settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const updatedSettings = {
        id: currentUser ? currentUser.id : "test-user-id",
        breath_speed: document.getElementById('breath-speed').value,
        rounds: parseInt(roundsCount.value),
        breath_count: parseInt(breathCount.value),
        bg_music: document.getElementById('bg-music').checked,
        audio_guide_thomas: document.getElementById('audio-guide').checked,
        breath_sounds: document.getElementById('breath-sounds').checked,
        haptic_feedback: document.getElementById('haptic-feedback').checked,
        chime_gong: document.getElementById('chime-gong').checked,
        updated_at: new Date().toISOString()
    };

    if (supabase && currentUser) {
        const { error } = await supabase
            .from('profiles')
            .upsert(updatedSettings);

        if (error) {
            alert("Fehler beim Speichern: " + error.message);
            return;
        }
    }

    userSettings = updatedSettings;
    settingsMsg.classList.remove('hidden');
    setTimeout(() => settingsMsg.classList.add('hidden'), 3000);
});

// Start-Button für Meditation
document.getElementById('start-meditation-btn').addEventListener('click', () => {
    // Kurze Demonstration für haptisches Feedback auf dem iPhone
    if (userSettings.haptic_feedback && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    alert(`Starte Atemmeditation mit folgenden Profil-Einstellungen:\n` +
          `• Geschwindigkeit: ${userSettings.breath_speed}\n` +
          `• Runden: ${userSettings.rounds}\n` +
          `• Atemzüge: ${userSettings.breath_count}\n` +
          `• Anleitung Thomas: ${userSettings.audio_guide_thomas ? 'Ja' : 'Nein'}`);
});
