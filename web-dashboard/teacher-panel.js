// Teacher Control Panel JavaScript

// MQTT Configuration
const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const MQTT_TOPICS = {
    question: 'edubuddy/question',
    answer: 'edubuddy/answer',
    status: 'edubuddy/status',
    control: 'edubuddy/control'
};

let mqttClient;
let deviceOnline = false;

// Initialize MQTT Connection
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
    
    // Subscribe to status messages
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

// Send question to students
function sendQuestion() {
    const answerId = document.getElementById('answer-id').value;
    const questionText = document.getElementById('question-text').value;
    
    if (!answerId) {
        showAlert('Please select the correct answer!', 'error');
        return;
    }
    
    if (!questionText.trim()) {
        showAlert('Please enter the question text!', 'error');
        return;
    }
    
    if (!mqttClient || !mqttClient.connected) {
        showAlert('Not connected to MQTT broker!', 'error');
        return;
    }
    
    // Format: "QUESTION|correct_answer_id|question_text"
    const message = `QUESTION|${answerId}|${questionText}`;
    
    mqttClient.publish(MQTT_TOPICS.question, message, (err) => {
        if (err) {
            showAlert('Failed to send question!', 'error');
            console.error('Publish error:', err);
        } else {
            showAlert('Question sent successfully! 🎉', 'success');
            console.log('Question sent:', message);
        }
    });
}

// Load preset question
function loadPreset(answerId, questionText) {
    document.getElementById('answer-id').value = answerId;
    document.getElementById('question-text').value = questionText;
    
    // Auto-send after loading preset
    sendQuestion();
}

// Clear current question
function clearQuestion() {
    if (confirm('Clear the current question?')) {
        const message = 'QUESTION||Waiting for teacher...';
        mqttClient.publish(MQTT_TOPICS.question, message);
        
        document.getElementById('answer-id').value = '';
        document.getElementById('question-text').value = '';
        
        showAlert('Question cleared!', 'success');
    }
}

// Reset scores (send control message)
function resetScores() {
    if (confirm('Reset all scores? This will clear the dashboard.')) {
        mqttClient.publish(MQTT_TOPICS.control, 'RESET_SCORES');
        showAlert('Reset command sent!', 'success');
    }
}

// Update UI status indicators
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
    }, 5000);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Teacher Control Panel Starting...');
    initializeMQTT();
});
