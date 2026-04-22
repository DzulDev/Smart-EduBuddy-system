// Teacher Control Panel JavaScript

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const MQTT_TOPICS = {
    sessionStart: 'edubuddy/session/start',
    sessionEnd:   'edubuddy/session/end',
    resetBoard:   'edubuddy/control/reset_leaderboard',
    nextCat:      'edubuddy/control/next_category',
    status:       'edubuddy/status'
};

let mqttClient;
let sessionActive = false;

// ----- MQTT setup -----

function initializeMQTT() {
    mqttClient = mqtt.connect(MQTT_BROKER, {
        clientId: 'EduBuddy_Teacher_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 5000
    });

    mqttClient.on('connect', onConnect);
    mqttClient.on('message', onMessage);
    mqttClient.on('error',   onError);
    mqttClient.on('offline', onOffline);
}

function onConnect() {
    updateMQTTStatus(true);
    mqttClient.subscribe(MQTT_TOPICS.status, (err) => {
        if (err) console.error('Subscribe error:', err);
    });
    showAlert('Connected to system!', 'success');
}

function onMessage(topic, message) {
    if (topic === MQTT_TOPICS.status) {
        updateDeviceStatus(message.toString() === 'online');
    }
}

function onError() { updateMQTTStatus(false); }
function onOffline() { updateMQTTStatus(false); }

// ----- Mode handling -----

function getSelectedMode() {
    return document.querySelector('input[name="mode"]:checked').value;
}

function onModeChange() {
    const isTest = getSelectedMode() === 'test';
    document.getElementById('name-section').style.display = isTest ? '' : 'none';
}

// ----- Session controls -----

function startSession() {
    const mode          = getSelectedMode();
    const startCategory = document.getElementById('start-category').value || 'color';

    let name = '';
    if (mode === 'test') {
        name = document.getElementById('student-name').value.trim();
        if (!name) {
            showAlert('Please enter the student\'s name first!', 'error');
            document.getElementById('student-name').focus();
            return;
        }
    }

    if (!mqttClient || !mqttClient.connected) {
        showAlert('Not connected to MQTT broker!', 'error');
        return;
    }

    const payload = JSON.stringify({ name, startCategory, mode });

    mqttClient.publish(MQTT_TOPICS.sessionStart, payload, (err) => {
        if (err) {
            showAlert('Failed to start session!', 'error');
        } else {
            const label = mode === 'learning'
                ? `Learning session started (${startCategory}) 📖`
                : `Test session started for ${name} 📝`;
            showAlert(label, 'success');
            if (mode === 'test') document.getElementById('student-name').value = '';
            setSessionActive(true);
        }
    });
}

function nextCategory() {
    if (!mqttClient || !mqttClient.connected) {
        showAlert('Not connected to MQTT broker!', 'error');
        return;
    }
    mqttClient.publish(MQTT_TOPICS.nextCat, '1');
    showAlert('Next category signal sent ▶', 'success');
}

function endSession() {
    if (!confirm('End the current session?')) return;

    if (!mqttClient || !mqttClient.connected) {
        showAlert('Not connected to MQTT broker!', 'error');
        return;
    }

    mqttClient.publish(MQTT_TOPICS.sessionEnd, '1');
    showAlert('Session ended.', 'success');
    setSessionActive(false);
}

function resetLeaderboard() {
    if (!confirm('Reset the leaderboard? This permanently deletes ALL scores.')) return;

    if (!mqttClient || !mqttClient.connected) {
        showAlert('Not connected to MQTT broker!', 'error');
        return;
    }

    mqttClient.publish(MQTT_TOPICS.resetBoard, '1');
    showAlert('Leaderboard reset.', 'success');
}

// ----- UI helpers -----

function setSessionActive(active) {
    sessionActive = active;
    document.getElementById('start-btn').textContent = active ? '▶️ Start Next Student' : '▶️ Start Session';
}

function updateMQTTStatus(connected) {
    const dot  = document.getElementById('mqtt-dot');
    const text = document.getElementById('mqtt-text');
    dot.classList.toggle('online', connected);
    text.textContent  = connected ? 'Connected'    : 'Disconnected';
    text.style.color  = connected ? '#28a745' : '#dc3545';
}

function updateDeviceStatus(online) {
    const dot  = document.getElementById('device-dot');
    const text = document.getElementById('device-text');
    dot.classList.toggle('online', online);
    text.textContent = online ? 'Online'  : 'Offline';
    text.style.color = online ? '#28a745' : '#dc3545';
}

function showAlert(message, type) {
    const alertEl = document.getElementById('alert');
    document.getElementById('alert-text').textContent = message;
    alertEl.className = 'alert show ' + type;
    setTimeout(() => alertEl.classList.remove('show'), 4000);
}

// ----- Load categories from localStorage -----

function loadCategoryOptions() {
    const sel = document.getElementById('start-category');
    sel.innerHTML = '';

    const defaults = ['color', 'alphabet', 'shape', 'number'];
    let cats = defaults;

    try {
        const stored = localStorage.getItem('edubuddy_custom_questions');
        if (stored) {
            const bank = JSON.parse(stored);
            const keys = Object.keys(bank).filter(k => !k.startsWith('_'));
            if (keys.length > 0) cats = keys;
        }
    } catch (_) {}

    cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        sel.appendChild(opt);
    });
}

// ----- Boot -----

window.addEventListener('DOMContentLoaded', () => {
    loadCategoryOptions();
    initializeMQTT();

    // Mode change listener
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', onModeChange);
    });

    // Allow Enter key in name field to start
    document.getElementById('student-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startSession();
    });

    // Set initial state
    onModeChange();
});
