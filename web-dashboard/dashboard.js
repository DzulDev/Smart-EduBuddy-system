// Smart EduBuddy Dashboard JavaScript
// Handles MQTT communication and UI updates

// MQTT Configuration
const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt'; // WebSocket connection
const MQTT_TOPICS = {
    question: 'edubuddy/question',
    answer: 'edubuddy/answer',
    status: 'edubuddy/status'
};

// Game State
let currentQuestion = '';
let correctAnswerId = '';
let correctCount = 0;
let wrongCount = 0;
let totalCount = 0;
let deviceOnline = false;

// RFID Card Database (Map card IDs to names)
const cardDatabase = {
    // Colors
    '01RED': { type: 'color', name: 'Red', display: 'Color Red' },
    '02BLUE': { type: 'color', name: 'Blue', display: 'Color Blue' },
    '03GREEN': { type: 'color', name: 'Green', display: 'Color Green' },
    '04YELLOW': { type: 'color', name: 'Yellow', display: 'Color Yellow' },
    '05ORANGE': { type: 'color', name: 'Orange', display: 'Color Orange' },
    '06PURPLE': { type: 'color', name: 'Purple', display: 'Color Purple' },

    // Shapes
    '07CIRCLE': { type: 'shape', name: 'Circle', display: 'Circle Shape' },
    '08SQUARE': { type: 'shape', name: 'Square', display: 'Square Shape' },
    '09TRIANGLE': { type: 'shape', name: 'Triangle', display: 'Triangle Shape' },
    '10RECTANGLE': { type: 'shape', name: 'Rectangle', display: 'Rectangle Shape' },
    '11STAR': { type: 'shape', name: 'Star', display: 'Star Shape' },
    '12HEART': { type: 'shape', name: 'Heart', display: 'Heart Shape' }
};

// Initialize MQTT Client
let mqttClient;

function initializeMQTT() {
    console.log('Connecting to MQTT broker...');
    document.getElementById('mqtt-status').textContent = 'Connecting...';

    try {
        mqttClient = mqtt.connect(MQTT_BROKER, {
            clientId: 'EduBuddy_Dashboard_' + Math.random().toString(16).substr(2, 8),
            clean: true,
            reconnectPeriod: 5000
        });

        mqttClient.on('connect', onMQTTConnect);
        mqttClient.on('message', onMQTTMessage);
        mqttClient.on('error', onMQTTError);
        mqttClient.on('offline', onMQTTOffline);
        mqttClient.on('reconnect', onMQTTReconnect);

    } catch (error) {
        console.error('MQTT Connection Error:', error);
        document.getElementById('mqtt-status').textContent = 'Error: ' + error.message;
    }
}

function onMQTTConnect() {
    console.log('Connected to MQTT broker!');
    document.getElementById('mqtt-status').textContent = 'Connected';
    document.getElementById('mqtt-status').style.color = '#28a745';

    // Subscribe to topics
    mqttClient.subscribe(MQTT_TOPICS.question, (err) => {
        if (err) console.error('Subscribe error (question):', err);
    });

    mqttClient.subscribe(MQTT_TOPICS.answer, (err) => {
        if (err) console.error('Subscribe error (answer):', err);
    });

    mqttClient.subscribe(MQTT_TOPICS.status, (err) => {
        if (err) console.error('Subscribe error (status):', err);
    });

    updateStatusDisplay();
}

function onMQTTMessage(topic, message) {
    const messageStr = message.toString();
    console.log(`Message received on ${topic}:`, messageStr);

    if (topic === MQTT_TOPICS.question) {
        handleQuestionMessage(messageStr);
    } else if (topic === MQTT_TOPICS.answer) {
        handleAnswerMessage(messageStr);
    } else if (topic === MQTT_TOPICS.status) {
        handleStatusMessage(messageStr);
    }
}

function handleQuestionMessage(message) {
    // Parse: "QUESTION|correct_answer_id|question_text"
    const parts = message.split('|');
    if (parts.length === 3 && parts[0] === 'QUESTION') {
        correctAnswerId = parts[1].toUpperCase();
        currentQuestion = parts[2];

        console.log('New question:', currentQuestion);
        console.log('Correct answer ID:', correctAnswerId);

        // Display question
        const questionDisplay = document.getElementById('question-display');
        questionDisplay.className = 'question-text';
        questionDisplay.textContent = currentQuestion;
    }
}

function handleAnswerMessage(cardId) {
    const cleanCardId = cardId.toUpperCase().trim();
    console.log('Student answered with card:', cleanCardId);

    totalCount++;
    updateScoreBoard();

    // Check if answer is correct
    if (cleanCardId === correctAnswerId) {
        correctCount++;
        showFeedback(true);
    } else {
        wrongCount++;
        showFeedback(false);
    }

    updateScoreBoard();
}

function handleStatusMessage(status) {
    deviceOnline = (status === 'online');
    document.getElementById('device-status').textContent = deviceOnline ? 'Online' : 'Offline';
    document.getElementById('device-status').style.color = deviceOnline ? '#28a745' : '#dc3545';
    updateStatusDisplay();
}

function showFeedback(isCorrect) {
    const overlay = document.getElementById('feedback-overlay');
    const icon = document.getElementById('feedback-icon');
    const text = document.getElementById('feedback-text');


    // Reset classes
    overlay.classList.remove('correct', 'wrong');

    // Audio Feedback with TTS Fallback
    const correctAudio = new Audio('assets/audio/correct.mp3');
    const wrongAudio = new Audio('assets/audio/wrong.mp3');
    const speech = new SpeechSynthesisUtterance();

    if (isCorrect) {
        overlay.classList.add('correct');
        icon.textContent = '✓';
        text.textContent = 'Correct! Great Job!';

        // Try audio first
        correctAudio.play().catch(() => {
            console.log('Audio file missing, using TTS');
            speech.text = "Correct! Great Job!";
            speech.rate = 1.1;
            speech.pitch = 1.2;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(speech);
        });

    } else {
        overlay.classList.add('wrong');
        icon.textContent = '✗';
        text.textContent = 'Oops! Try Again!';

        // Try audio first
        wrongAudio.play().catch(() => {
            console.log('Audio file missing, using TTS');
            speech.text = "Oops! Try Again!";
            speech.rate = 0.9;
            speech.pitch = 0.9;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(speech);
        });
    }

    // Show overlay
    overlay.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => {
        overlay.classList.remove('show');
    }, 3000);
}

function updateScoreBoard() {
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('wrong-count').textContent = wrongCount;
    document.getElementById('total-count').textContent = totalCount;
}

function updateStatusDisplay() {
    const statusDiv = document.getElementById('status');
    const statusText = document.getElementById('status-text');

    if (mqttClient && mqttClient.connected) {
        if (deviceOnline) {
            statusDiv.className = 'status online';
            statusText.textContent = '✓ System Online - Ready for Learning!';
        } else {
            statusDiv.className = 'status';
            statusText.textContent = '⚠ Dashboard Connected - Waiting for Device...';
        }
    } else {
        statusDiv.className = 'status offline';
        statusText.textContent = '✗ Connecting to system...';
    }
}

function onMQTTError(error) {
    console.error('MQTT Error:', error);
    document.getElementById('mqtt-status').textContent = 'Error';
    document.getElementById('mqtt-status').style.color = '#dc3545';
}

function onMQTTOffline() {
    console.log('MQTT Offline');
    document.getElementById('mqtt-status').textContent = 'Offline';
    document.getElementById('mqtt-status').style.color = '#dc3545';
    updateStatusDisplay();
}

function onMQTTReconnect() {
    console.log('MQTT Reconnecting...');
    document.getElementById('mqtt-status').textContent = 'Reconnecting...';
    document.getElementById('mqtt-status').style.color = '#ffc107';
}

// Helper function to get card info
function getCardInfo(cardId) {
    return cardDatabase[cardId.toUpperCase()] || {
        type: 'unknown',
        name: 'Unknown',
        display: 'Unknown Card'
    };
}

// Reset game (can be called from console or added as button)
function resetGame() {
    correctCount = 0;
    wrongCount = 0;
    totalCount = 0;
    currentQuestion = '';
    correctAnswerId = '';
    updateScoreBoard();
    document.getElementById('question-display').className = 'waiting-text';
    document.getElementById('question-display').textContent = 'Waiting for teacher to start...';
    console.log('Game reset!');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Smart EduBuddy Dashboard Starting...');
    initializeMQTT();
    updateScoreBoard();
});

// Expose functions to window for console access
window.resetGame = resetGame;
window.getCardInfo = getCardInfo;
