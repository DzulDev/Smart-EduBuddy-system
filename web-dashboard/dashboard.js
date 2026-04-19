// Smart EduBuddy Dashboard - Session-based quiz engine
// Loads questions.json, runs a state machine through 4 categories x 5 questions,
// scores answers, and stores a per-category + overall leaderboard in localStorage.

// =====================================================================
// CONFIGURATION
// =====================================================================

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';

const MQTT_TOPICS = {
    answer:       'edubuddy/answer',
    status:       'edubuddy/status',
    sessionStart: 'edubuddy/session/start',
    sessionEnd:   'edubuddy/session/end',
    resetBoard:   'edubuddy/control/reset_leaderboard'
};

// Fixed category rotation order. Teacher picks the starting one;
// the rest follow in this order, wrapping around.
const CATEGORY_ORDER = ['color', 'alphabet', 'shape', 'number'];

const CATEGORY_DISPLAY = {
    color:    { label: 'Color',    emoji: '🎨' },
    alphabet: { label: 'Alphabet', emoji: '🔤' },
    shape:    { label: 'Shape',    emoji: '🔺' },
    number:   { label: 'Number',   emoji: '🔢' }
};

// --- TWO-CARD MAPPING (TF questions) ---------------------------------
// The student uses 2 RFID cards for True/False questions. The MEANING
// of each card (which is "correct") is set per question in questions.json.
// You only need to do this once: scan each card with the firmware and
// copy the printed UID into one of the slots below. UIDs are uppercase
// hex with no spaces, exactly as the firmware prints them.
//
// Example:
//   'DEADBEEF': 'A',
//   'CAFE1234': 'B',
const TF_CARD_MAP = {
    // Replace these placeholders with the real UIDs of your 2 cards.
    'CARD_A_UID_HERE': 'A',
    'CARD_B_UID_HERE': 'B',
    // Simulator mode: virtual UIDs triggered by keyboard keys 1 / 2
    'SIM_CARD_A': 'A',
    'SIM_CARD_B': 'B'
};
// ---------------------------------------------------------------------

const LEADERBOARD_KEY = 'edubuddy_leaderboard_v1';
const TOP_N = 3;

const TIMING = {
    countdownStep:    1000,  // ms between countdown numbers
    feedbackDuration: 1500,  // how long the ✓/✗ overlay stays
    catScoreboard:    4500,  // how long the per-category scoreboard stays
    betweenCategories: 500   // brief pause before next countdown
};

// --- SOUND EFFECTS (Web Audio API — no files needed) -----------------
let _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
}

function playSound(name) {
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        if (name === 'correct') _playCorrect(ctx);
        else if (name === 'wrong') _playWrong(ctx);
        else if (name === 'tick') _playCountdownTick(ctx);
        else if (name === 'go') _playCountdownGo(ctx);
        else if (name === 'leaderboard') { _playPodiumFanfare(ctx); }
        else if (name === 'finalboard')  { _playDrumrollFanfare(ctx); }
    } catch (_) { /* audio not supported */ }
}

function _playCorrect(ctx) {
    // Triumphant 4-note ascending fanfare (sine + triangle for richness)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.connect(gain); osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.type = 'sine'; osc1.frequency.value = freq;
        osc2.type = 'triangle'; osc2.frequency.value = freq * 2;
        const s = t + i * 0.13;
        gain.gain.setValueAtTime(0, s);
        gain.gain.linearRampToValueAtTime(0.35, s + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.28);
        osc1.start(s); osc1.stop(s + 0.3);
        osc2.start(s); osc2.stop(s + 0.3);
    });
}

function _playCountdownTick(ctx) {
    // Short punchy beep — like a game show countdown clock
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
}

function _playCountdownGo(ctx) {
    // Arcade power-up: rapid ascending square-wave notes (classic 8-bit feel)
    const notes = [262, 330, 392, 523, 659, 784, 1047, 1319];
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        const s = t + i * 0.065;
        gain.gain.setValueAtTime(0.28, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.12);
        osc.start(s); osc.stop(s + 0.13);
    });
}

function _playDrumrollFanfare(ctx) {
    const t = ctx.currentTime;
    const rollDuration = 1.3;

    // Accelerating snare hits (individual noise bursts, spacing shrinks each hit)
    let hitTime = t;
    let interval = 0.12;
    while (hitTime < t + rollDuration) {
        const hitBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
        const d = hitBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = hitBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 1;
        const g = ctx.createGain();
        const progress = (hitTime - t) / rollDuration;
        g.gain.setValueAtTime(0.15 + progress * 0.4, hitTime);
        g.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.055);
        src.connect(bp); bp.connect(g); g.connect(ctx.destination);
        src.start(hitTime); src.stop(hitTime + 0.06);

        interval = Math.max(0.035, interval * 0.88);
        hitTime += interval;
    }

    // Grand fanfare after roll — bigger chord than category fanfare (extra bass)
    const f = t + rollDuration + 0.06;
    [330, 392, 523].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const s = f + i * 0.1;
        gain.gain.setValueAtTime(0.22, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.14);
        osc.start(s); osc.stop(s + 0.15);
    });
    [261, 523, 659, 784, 1047].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const s = f + 0.33;
        gain.gain.setValueAtTime(0.15, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 1.1);
        osc.start(s); osc.stop(s + 1.15);
    });
}

function _playCrowdCheer(ctx) {
    // Synthesized crowd cheer — filtered white noise with rising then falling envelope
    const t = ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate * 1.8);
    const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data    = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 0.7;

    const gain = ctx.createGain();
    source.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.45, t + 0.35);
    gain.gain.linearRampToValueAtTime(0.38, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    source.start(t); source.stop(t + 1.8);
}

function _playPodiumFanfare(ctx) {
    // Short ascending run then triumphant brass chord
    const t = ctx.currentTime;
    [392, 523, 659].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const s = t + i * 0.1;
        gain.gain.setValueAtTime(0.18, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.13);
        osc.start(s); osc.stop(s + 0.14);
    });
    // Big final chord: C5 E5 G5 C6
    [523, 659, 784, 1047].forEach(freq => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const s = t + 0.36;
        gain.gain.setValueAtTime(0.14, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.9);
        osc.start(s); osc.stop(s + 0.95);
    });
}

function _playWrong(ctx) {
    // Dramatic 3-pulse descending sawtooth buzzer (Price-is-Right losing horn)
    const t = ctx.currentTime;
    [300, 220, 160].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        const s = t + i * 0.22;
        osc.frequency.setValueAtTime(freq, s);
        osc.frequency.linearRampToValueAtTime(freq * 0.65, s + 0.2);
        gain.gain.setValueAtTime(0.45, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.21);
        osc.start(s); osc.stop(s + 0.22);
    });
}

// Browsers block audio until the page has seen a user gesture.
// Resume the AudioContext on first interaction.
function unlockAudioOnce() {
    try { getAudioCtx().resume(); } catch (_) {}
    window.removeEventListener('click',      unlockAudioOnce);
    window.removeEventListener('keydown',    unlockAudioOnce);
    window.removeEventListener('touchstart', unlockAudioOnce);
}
window.addEventListener('click',      unlockAudioOnce);
window.addEventListener('keydown',    unlockAudioOnce);
window.addEventListener('touchstart', unlockAudioOnce);

// --- KEYBOARD SIMULATOR (no hardware needed for testing) -------------
// MCQ:  Press A / B / C / D  → simulates button press
// TF:   Press 1              → simulates Card A tap
//       Press 2              → simulates Card B tap
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toUpperCase();
    if (state === STATES.QUESTION_MCQ && ['A','B','C','D'].includes(key)) {
        handleAnswerInput('BTN_' + key);
    } else if (state === STATES.QUESTION_TF) {
        if (key === '1') handleAnswerInput('SIM_CARD_A');
        if (key === '2') handleAnswerInput('SIM_CARD_B');
    }
});
// ---------------------------------------------------------------------

// =====================================================================
// STATE
// =====================================================================

const STATES = {
    IDLE:           'idle',
    COUNTDOWN:      'countdown',
    QUESTION_MCQ:   'mcq',
    QUESTION_TF:    'tf',
    FEEDBACK:       'feedback',
    CATEGORY_DONE:  'category_done',
    FINAL_DONE:     'final_done'
};

let state = STATES.IDLE;
let questionBank = null; // loaded from questions.json

let session = null;
// session = {
//   name: "Ali",
//   categories: ["color","alphabet","shape","number"],  // rotated order
//   catIdx: 0,
//   questions: [shuffled questions for current category],
//   qIdx: 0,
//   scoreByCat: { color: 0, alphabet: 0, shape: 0, number: 0 },
//   totalScore: 0
// }

let mqttClient;
let pendingTimers = []; // track setTimeouts so we can cancel on session reset

// =====================================================================
// MQTT
// =====================================================================

function initializeMQTT() {
    console.log('Connecting to MQTT broker...');

    mqttClient = mqtt.connect(MQTT_BROKER, {
        clientId: 'EduBuddy_Dashboard_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 5000
    });

    mqttClient.on('connect', () => {
        console.log('Connected to MQTT broker.');
        setMqttDot(true);

        mqttClient.subscribe([
            MQTT_TOPICS.answer,
            MQTT_TOPICS.status,
            MQTT_TOPICS.sessionStart,
            MQTT_TOPICS.sessionEnd,
            MQTT_TOPICS.resetBoard
        ], (err) => {
            if (err) console.error('Subscribe error:', err);
        });
    });

    mqttClient.on('message', (topic, message) => {
        const msg = message.toString().trim();
        console.log(`[MQTT] ${topic} -> ${msg}`);
        handleMqttMessage(topic, msg);
    });

    mqttClient.on('error',   (e) => { console.error('MQTT error', e); setMqttDot(false); });
    mqttClient.on('offline', ()   => { setMqttDot(false); });
    mqttClient.on('reconnect', () => { console.log('MQTT reconnecting...'); });
}

function handleMqttMessage(topic, msg) {
    switch (topic) {
        case MQTT_TOPICS.status:
            setDeviceDot(msg === 'online');
            break;

        case MQTT_TOPICS.sessionStart:
            try {
                const payload = JSON.parse(msg);
                startSession(payload.name, payload.startCategory);
            } catch (e) {
                console.error('Bad session start payload:', msg);
            }
            break;

        case MQTT_TOPICS.sessionEnd:
            endSessionAndReturnToIdle();
            break;

        case MQTT_TOPICS.resetBoard:
            resetLeaderboard();
            break;

        case MQTT_TOPICS.answer:
            handleAnswerInput(msg);
            break;
    }
}

// =====================================================================
// SESSION FLOW
// =====================================================================

function startSession(name, startCategory) {
    if (!questionBank) {
        console.warn('Question bank not loaded yet, ignoring session start.');
        return;
    }
    if (!CATEGORY_ORDER.includes(startCategory)) {
        console.warn('Unknown start category:', startCategory);
        return;
    }

    cancelAllTimers();
    hideFeedbackOverlay();

    // Build rotated category order: e.g. start at "shape" → [shape, number, color, alphabet]
    const startIdx = CATEGORY_ORDER.indexOf(startCategory);
    const rotated = [];
    for (let i = 0; i < CATEGORY_ORDER.length; i++) {
        rotated.push(CATEGORY_ORDER[(startIdx + i) % CATEGORY_ORDER.length]);
    }

    session = {
        name: name,
        categories: rotated,
        catIdx: 0,
        questions: shuffle(questionBank[rotated[0]].slice()),
        qIdx: 0,
        scoreByCat: { color: 0, alphabet: 0, shape: 0, number: 0 },
        totalScore: 0
    };

    console.log('Session started:', session);
    runCountdown(rotated[0]);
}

function runCountdown(category) {
    state = STATES.COUNTDOWN;
    showScreen('countdown-screen');
    document.getElementById('countdown-name').textContent = session.name;
    document.getElementById('countdown-category').textContent =
        CATEGORY_DISPLAY[category].label + ' ' + CATEGORY_DISPLAY[category].emoji;

    const numEl = document.getElementById('countdown-num');
    let n = 3;
    numEl.textContent = n;
    playSound('tick');

    const tick = () => {
        n--;
        if (n > 0) {
            numEl.textContent = n;
            playSound('tick');
            pendingTimers.push(setTimeout(tick, TIMING.countdownStep));
        } else {
            numEl.textContent = 'GO!';
            playSound('go');
            pendingTimers.push(setTimeout(showCurrentQuestion, TIMING.countdownStep));
        }
    };
    pendingTimers.push(setTimeout(tick, TIMING.countdownStep));
}

function showCurrentQuestion() {
    const q = session.questions[session.qIdx];
    const category = session.categories[session.catIdx];
    const catDisp = CATEGORY_DISPLAY[category];
    const progress = `Question ${session.qIdx + 1} / ${session.questions.length}`;

    if (q.type === 'mcq') {
        state = STATES.QUESTION_MCQ;

        // Shuffle options so correct answer lands in a random slot each time
        const correctText = q.options[['A','B','C','D'].indexOf(q.correct)];
        const shuffledOptions = shuffle(q.options.slice());
        session.currentCorrect = ['A','B','C','D'][shuffledOptions.indexOf(correctText)];

        document.getElementById('mcq-category').textContent = catDisp.emoji + ' ' + catDisp.label;
        document.getElementById('mcq-progress').textContent = progress;
        document.getElementById('mcq-student').textContent  = session.name;
        document.getElementById('mcq-question').textContent = q.q;
        document.getElementById('mcq-opt-a').textContent = shuffledOptions[0];
        document.getElementById('mcq-opt-b').textContent = shuffledOptions[1];
        document.getElementById('mcq-opt-c').textContent = shuffledOptions[2];
        document.getElementById('mcq-opt-d').textContent = shuffledOptions[3];
        showScreen('mcq-screen');
        showSimHint('⌨ Simulator: Press  A / B / C / D');

    } else if (q.type === 'tf') {
        state = STATES.QUESTION_TF;
        document.getElementById('tf-category').textContent = catDisp.emoji + ' ' + catDisp.label;
        document.getElementById('tf-progress').textContent = progress;
        document.getElementById('tf-student').textContent  = session.name;
        document.getElementById('tf-question').textContent = q.q;
        document.getElementById('tf-opt-a').textContent = q.optionA;
        document.getElementById('tf-opt-b').textContent = q.optionB;
        showScreen('tf-screen');
        showSimHint('⌨ Simulator: Press  1 = Card A  |  2 = Card B');
    }
}

function showSimHint(text) {
    const el = document.getElementById('sim-hint');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
}

function hideSimHint() {
    const el = document.getElementById('sim-hint');
    if (el) el.style.display = 'none';
}

function handleAnswerInput(msg) {
    const q = session ? session.questions[session.qIdx] : null;

    // MCQ: accept BTN_A..BTN_D only
    if (state === STATES.QUESTION_MCQ && q) {
        const m = msg.match(/^BTN_([A-D])$/);
        if (!m) return; // ignore card scans during MCQ
        const chosen = m[1];
        scoreAnswer(chosen === session.currentCorrect);
        return;
    }

    // TF: accept card UIDs that map to A or B
    if (state === STATES.QUESTION_TF && q) {
        const card = TF_CARD_MAP[msg];
        if (!card) return; // ignore button presses or unknown cards during TF
        scoreAnswer(card === q.correctCard);
        return;
    }
}

function scoreAnswer(isCorrect) {
    hideSimHint();
    const cat = session.categories[session.catIdx];
    if (isCorrect) {
        session.scoreByCat[cat]++;
        session.totalScore++;
    }

    showFeedback(isCorrect);

    pendingTimers.push(setTimeout(() => {
        hideFeedbackOverlay();
        advanceAfterAnswer();
    }, TIMING.feedbackDuration));
}

function advanceAfterAnswer() {
    session.qIdx++;
    if (session.qIdx < session.questions.length) {
        showCurrentQuestion();
    } else {
        showCategoryScoreboard();
    }
}

function showCategoryScoreboard() {
    state = STATES.CATEGORY_DONE;
    const cat = session.categories[session.catIdx];
    const catDisp = CATEGORY_DISPLAY[cat];
    const score = session.scoreByCat[cat];
    const max   = session.questions.length;

    // Persist this category result to leaderboard
    pushToLeaderboard(cat, session.name, score);

    document.getElementById('cat-title').textContent =
        catDisp.label + ' ' + catDisp.emoji + ' Done!';
    document.getElementById('cat-score').textContent = `${score} / ${max}`;
    document.getElementById('cat-top-name').textContent = catDisp.label;
    renderTop3('cat-top-list', cat);

    // Decide next step
    const isLastCategory = session.catIdx >= session.categories.length - 1;
    if (isLastCategory) {
        document.getElementById('cat-next').textContent = 'Almost done — final score next!';
    } else {
        const nextCat = session.categories[session.catIdx + 1];
        const nextDisp = CATEGORY_DISPLAY[nextCat];
        document.getElementById('cat-next').textContent =
            'Next up: ' + nextDisp.label + ' ' + nextDisp.emoji;
    }

    showScreen('category-scoreboard');
    playSound('leaderboard');

    pendingTimers.push(setTimeout(() => {
        if (isLastCategory) {
            showFinalScoreboard();
        } else {
            // advance to next category
            session.catIdx++;
            session.qIdx = 0;
            const newCat = session.categories[session.catIdx];
            session.questions = shuffle(questionBank[newCat].slice());
            pendingTimers.push(setTimeout(() => runCountdown(newCat), TIMING.betweenCategories));
        }
    }, TIMING.catScoreboard));
}

function showFinalScoreboard() {
    state = STATES.FINAL_DONE;

    // Persist overall score
    const totalMax = totalQuestionsInSession();
    pushToLeaderboard('overall', session.name, session.totalScore);

    document.getElementById('final-name').textContent  = session.name + "'s final score";
    document.getElementById('final-score').textContent = session.totalScore;
    document.querySelector('#final-scoreboard .final-out-of').textContent = 'out of ' + totalMax;
    renderTop3('final-top-list', 'overall');

    showScreen('final-scoreboard');
    playSound('finalboard');
    // Stays here until teacher starts a new session or clicks End Session
}

function endSessionAndReturnToIdle() {
    cancelAllTimers();
    hideFeedbackOverlay();
    session = null;
    state = STATES.IDLE;
    showScreen('idle-screen');
}

function totalQuestionsInSession() {
    if (!questionBank || !session) return 0;
    return session.categories.reduce(
        (sum, c) => sum + questionBank[c].length, 0
    );
}

// =====================================================================
// LEADERBOARD (localStorage)
// =====================================================================

function loadLeaderboard() {
    try {
        const raw = localStorage.getItem(LEADERBOARD_KEY);
        if (!raw) return emptyLeaderboard();
        const parsed = JSON.parse(raw);
        // Make sure all keys exist
        const empty = emptyLeaderboard();
        for (const k of Object.keys(empty)) {
            if (!Array.isArray(parsed[k])) parsed[k] = [];
        }
        return parsed;
    } catch (e) {
        console.warn('Leaderboard load failed, starting fresh:', e);
        return emptyLeaderboard();
    }
}

function emptyLeaderboard() {
    return { color: [], alphabet: [], shape: [], number: [], overall: [] };
}

function saveLeaderboard(board) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
    } catch (e) {
        console.warn('Leaderboard save failed:', e);
    }
}

function pushToLeaderboard(category, name, score) {
    const board = loadLeaderboard();
    board[category].push({ name: name, score: score, ts: Date.now() });
    // Sort high → low, keep only top N
    board[category].sort((a, b) => b.score - a.score || a.ts - b.ts);
    saveLeaderboard(board);
}

function resetLeaderboard() {
    saveLeaderboard(emptyLeaderboard());
    console.log('Leaderboard reset.');
}

function renderTop3(elementId, category) {
    const board = loadLeaderboard();
    const list = board[category] || [];
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    const medals = ['gold', 'silver', 'bronze'];
    const icons  = ['🥇', '🥈', '🥉'];

    if (list.length === 0) {
        for (let i = 0; i < TOP_N; i++) {
            const row = document.createElement('div');
            row.className = 'top3-row empty';
            row.textContent = `${icons[i]} —`;
            container.appendChild(row);
        }
        return;
    }

    list.forEach((entry, i) => {
        const row = document.createElement('div');
        if (i < TOP_N) {
            row.className = 'top3-row ' + medals[i];
            row.innerHTML = `
                <span class="rank">${icons[i]}</span>
                <span class="name">${escapeHtml(entry.name)}</span>
                <span class="score">${entry.score}</span>
            `;
        } else {
            row.className = 'top3-row others';
            row.innerHTML = `
                <span class="rank">${i + 1}</span>
                <span class="name">${escapeHtml(entry.name)}</span>
                <span class="score">${entry.score}</span>
            `;
        }
        container.appendChild(row);
    });
}

// =====================================================================
// UI HELPERS
// =====================================================================

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showFeedback(isCorrect) {
    state = STATES.FEEDBACK;
    const overlay = document.getElementById('feedback-overlay');
    const icon    = document.getElementById('feedback-icon');
    const text    = document.getElementById('feedback-text');

    overlay.classList.remove('correct', 'wrong');
    overlay.classList.add(isCorrect ? 'correct' : 'wrong');
    icon.textContent = isCorrect ? '✓' : '✗';
    text.textContent = isCorrect ? 'Correct!' : 'Try Again!';
    overlay.classList.add('show');

    playSound(isCorrect ? 'correct' : 'wrong');
}

function hideFeedbackOverlay() {
    document.getElementById('feedback-overlay').classList.remove('show');
}

function setMqttDot(online) {
    document.getElementById('mqtt-dot').classList.toggle('online', !!online);
}
function setDeviceDot(online) {
    document.getElementById('device-dot').classList.toggle('online', !!online);
}

function shuffle(arr) {
    // Fisher-Yates
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function cancelAllTimers() {
    pendingTimers.forEach(t => clearTimeout(t));
    pendingTimers = [];
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// =====================================================================
// BOOT
// =====================================================================

async function loadQuestionBank() {
    try {
        const res = await fetch('questions.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        questionBank = await res.json();
        // Validate the categories we expect are present
        for (const cat of CATEGORY_ORDER) {
            if (!Array.isArray(questionBank[cat]) || questionBank[cat].length === 0) {
                throw new Error('Missing or empty category: ' + cat);
            }
        }
        console.log('Question bank loaded.');
    } catch (e) {
        console.error('Failed to load questions.json:', e);
        alert('Failed to load questions.json — make sure you opened this page via Live Server (http://...) and not by double-clicking the file. Error: ' + e.message);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    console.log('Smart EduBuddy dashboard starting...');
    showScreen('idle-screen');
    await loadQuestionBank();
    initializeMQTT();
});
