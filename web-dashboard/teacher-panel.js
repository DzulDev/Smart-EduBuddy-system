// Teacher Control Panel JavaScript - Session Manager

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const MQTT_TOPICS = {
    sessionStart: 'edubuddy/session/start',
    sessionEnd:   'edubuddy/session/end',
    resetBoard:   'edubuddy/control/reset_leaderboard',
    status:       'edubuddy/status'
};

let mqttClient;
let deviceOnline = false;

// ----- MQTT setup -----
function initializeMQTT() {
    console.log('Connecting to MQTT broker...');

    mqttClient = mqtt.connect(MQTT_BROKER, {
        clientId: 'EduBuddy_Teacher_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 5000
    });

    mqttClient.on('connect', onConnect);
    mqttClient.on('message', onMessage);
    mqttClient.on('error', onError);
    mqttClient.on('offline', onOffline);
}

function onConnect() {
    console.log('Connected to MQTT broker!');
    updateMQTTStatus(true);

    mqttClient.subscribe(MQTT_TOPICS.status, (err) => {
        if (err) console.error('Subscribe error:', err);
    });

    showAlert('Connected to system successfully!', 'success');
}

function onMessage(topic, message) {
    const msg = message.toString();

    if (topic === MQTT_TOPICS.status) {
        deviceOnline = (msg === 'online');
        updateDeviceStatus(deviceOnline);
    }
}

function onError(error) {
    console.error('MQTT Error:', error);
    updateMQTTStatus(false);
}

function onOffline() {
    console.log('MQTT Offline');
    updateMQTTStatus(false);
}

// ----- Session controls -----
function startSession() {
    const name = document.getElementById('student-name').value.trim();
    const startCategory = document.getElementById('start-category').value;

    if (!name) {
        showAlert('Please enter the student\'s name first!', 'error');
        document.getElementById('student-name').focus();
        return;
    }

    if (!mqttClient || !mqttClient.connected) {
        showAlert('Not connected to MQTT broker!', 'error');
        return;
    }

    const payload = JSON.stringify({ name: name, startCategory: startCategory });

    mqttClient.publish(MQTT_TOPICS.sessionStart, payload, (err) => {
        if (err) {
            showAlert('Failed to start session!', 'error');
            console.error('Publish error:', err);
        } else {
            showAlert(`Session started for ${name} 🎉`, 'success');
            console.log('Session start sent:', payload);
            // Clear name field for the next student
            document.getElementById('student-name').value = '';
        }
    });
}

function endSession() {
    if (!confirm('End the current student\'s session?')) return;

    if (!mqttClient || !mqttClient.connected) {
        showAlert('Not connected to MQTT broker!', 'error');
        return;
    }

    mqttClient.publish(MQTT_TOPICS.sessionEnd, '1');
    showAlert('Session ended.', 'success');
}

function resetLeaderboard() {
    if (!confirm('Reset the leaderboard? This will permanently delete ALL Top 3 scores.')) return;

    if (!mqttClient || !mqttClient.connected) {
        showAlert('Not connected to MQTT broker!', 'error');
        return;
    }

    mqttClient.publish(MQTT_TOPICS.resetBoard, '1');
    showAlert('Leaderboard reset.', 'success');
}

// ----- UI helpers -----
function updateMQTTStatus(connected) {
    const dot = document.getElementById('mqtt-dot');
    const text = document.getElementById('mqtt-text');

    if (connected) {
        dot.classList.add('online');
        text.textContent = 'Connected';
        text.style.color = '#28a745';
    } else {
        dot.classList.remove('online');
        text.textContent = 'Disconnected';
        text.style.color = '#dc3545';
    }
}

function updateDeviceStatus(online) {
    const dot = document.getElementById('device-dot');
    const text = document.getElementById('device-text');

    if (online) {
        dot.classList.add('online');
        text.textContent = 'Online';
        text.style.color = '#28a745';
    } else {
        dot.classList.remove('online');
        text.textContent = 'Offline';
        text.style.color = '#dc3545';
    }
}

function showAlert(message, type) {
    const alert = document.getElementById('alert');
    const alertText = document.getElementById('alert-text');

    alert.className = 'alert show ' + type;
    alertText.textContent = message;

    setTimeout(() => {
        alert.classList.remove('show');
    }, 4000);
}

// ----- Boot -----
window.addEventListener('DOMContentLoaded', () => {
    console.log('Teacher Control Panel starting...');
    initializeMQTT();

    // Allow Enter key in name field to start session
    document.getElementById('student-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startSession();
    });
});
