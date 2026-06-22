// Teacher Control Panel JavaScript

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';

const JSONBIN_ID  = '69e457a9aaba88219714735f';
const JSONBIN_KEY = '$2a$10$PYp3OZ18bCHM9rs7gHZHW.eah1Aj6Vw1c3IRiSYcNwp/P.Hx1t9KO';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

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

async function downloadScoreboard() {
    let board;
    try {
        const res  = await fetch(JSONBIN_URL + '/latest', {
            headers: { 'X-Master-Key': JSONBIN_KEY }
        });
        const json = await res.json();
        board = json.record || {};
    } catch (e) {
        showAlert('Failed to fetch scoreboard from cloud!', 'error');
        return;
    }

    const categories = Object.keys(board).filter(k => k !== 'overall' && board[k] && board[k].length);
    const orderedCats = [...categories, 'overall'].filter(k => board[k] && board[k].length);

    if (orderedCats.length === 0) {
        showAlert('Scoreboard is empty — nothing to download.', 'error');
        return;
    }

    const rows = [['Category', 'Rank', 'Name', 'Score', 'Time (s)']];
    orderedCats.forEach(cat => {
        const label = cat === 'overall' ? 'Overall' : cat.charAt(0).toUpperCase() + cat.slice(1);
        board[cat].forEach((entry, i) => {
            const time = entry.time !== undefined ? (entry.time / 1000).toFixed(1) : '';
            rows.push([label, i + 1, entry.name, entry.score, time]);
        });
    });

    const csv = rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `edubuddy_scoreboard_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert('Scoreboard downloaded! Open it in Google Sheets 📥', 'success');
}

function downloadWrongReport(mode) {
    const all = JSON.parse(localStorage.getItem('edubuddy_session_log') || '[]');
    const log = all.filter(r => r.mode === mode);

    if (log.length === 0) {
        showAlert(`No ${mode === 'test' ? 'Test' : 'Learning'} Mode sessions recorded yet.`, 'error');
        return;
    }

    const isLearning = mode === 'learning';
    const wrongHeader = isLearning ? 'Attempts' : 'Wrong';
    const rows = [['Date', 'Student', 'Category', 'Correct', wrongHeader, 'Total Questions', 'Time (s)']];
    log.forEach(record => {
        const date = new Date(record.date).toLocaleString();
        record.categories.forEach(c => {
            const label = c.cat.charAt(0).toUpperCase() + c.cat.slice(1);
            rows.push([date, record.name, label, c.correct, c.wrong, c.total, (c.timeMs / 1000).toFixed(1)]);

            if (isLearning && c.attemptsByQ) {
                Object.entries(c.attemptsByQ)
                    .filter(([, count]) => count > 1)
                    .sort((a, b) => b[1] - a[1])
                    .forEach(([qText, count]) => {
                        rows.push(['', '', `  ↳ ${qText}`, '', count, '', '']);
                    });
            }
        });
        const totalQ = record.categories.reduce((s, c) => s + c.total, 0);
        rows.push([date, record.name, `All Categories (${record.name})`, record.totalCorrect, record.totalWrong, totalQ, (record.totalTimeMs / 1000).toFixed(1)]);
        rows.push([]);
    });

    const csv = rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `edubuddy_${mode}_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert(`${mode === 'test' ? 'Test' : 'Learning'} Mode report downloaded! 📊`, 'success');
}

function csvEscape(value) {
    const str = String(value);
    return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
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

    let cats = [];

    try {
        const stored = localStorage.getItem('edubuddy_custom_questions');
        if (stored) {
            const bank = JSON.parse(stored);
            cats = Object.keys(bank).filter(k => !k.startsWith('_'));
        }
    } catch (_) {}

    if (cats.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No categories — create questions first';
        opt.disabled = true;
        opt.selected = true;
        sel.appendChild(opt);
        return;
    }

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
