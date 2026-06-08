// Smart EduBuddy Dashboard - Session-based quiz engine
// Supports Learning Mode (no name/leaderboard, manual category advance) and
// Test Mode (name + leaderboard + manual category advance).
// Question bank loaded from localStorage (custom) or questions.json (default).

// =====================================================================
// CONFIGURATION
// =====================================================================

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';

const MQTT_TOPICS = {
    answer:       'edubuddy/answer',
    status:       'edubuddy/status',
    sessionStart: 'edubuddy/session/start',
    sessionEnd:   'edubuddy/session/end',
    resetBoard:   'edubuddy/control/reset_leaderboard',
    nextCat:      'edubuddy/control/next_category'
};

// Default display info for built-in categories
const DEFAULT_CAT_DISPLAY = {
    color:    { label: 'Color',    emoji: '🎨' },
    alphabet: { label: 'Alphabet', emoji: '🔤' },
    shape:    { label: 'Shape',    emoji: '🔺' },
    number:   { label: 'Number',   emoji: '🔢' }
};

function getCategoryDisplay(cat) {
    if (DEFAULT_CAT_DISPLAY[cat]) return DEFAULT_CAT_DISPLAY[cat];
    return { label: cat.charAt(0).toUpperCase() + cat.slice(1), emoji: '📚' };
}

function getCategoryOrder() {
    if (!questionBank) return [];
    return Object.keys(questionBank).filter(k => !k.startsWith('_'));
}

// --- CARD MAPPING ---------------------------------------------------
const CARD_UIDS = {
    // Dedicated TF cards (not shared with hunt)
    'FDA2D406': { tf: 'A' },   // Yes / True card
    '26312680': { tf: 'B' },   // No / False card
    // Hunt cards
    'DE152580': { hunt: 'CARD1' },
    'E3CD2680': { hunt: 'CARD2' },
    'B6D12480': { hunt: 'CARD3' },
    'CAFD2580': { hunt: 'CARD4' }
};

const JSONBIN_ID  = '69e457a9aaba88219714735f';
const JSONBIN_KEY = '$2a$10$PYp3OZ18bCHM9rs7gHZHW.eah1Aj6Vw1c3IRiSYcNwp/P.Hx1t9KO';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

const TOP_N = 3;

const TIMING = {
    countdownStep:    1000,
    feedbackDuration: 1500,
    betweenCategories: 500
};

// =====================================================================
// SOUND EFFECTS (Web Audio API)
// =====================================================================

let _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
}

function playSound(name) {
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        if (name === 'correct')      _playCorrect(ctx);
        else if (name === 'wrong')   _playWrong(ctx);
        else if (name === 'tick')    _playCountdownTick(ctx);
        else if (name === 'go')      _playCountdownGo(ctx);
        else if (name === 'leaderboard') _playPodiumFanfare(ctx);
        else if (name === 'finalboard')  _playDrumrollFanfare(ctx);
    } catch (_) {}
}

function _playCorrect(ctx) {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
}

function _playCountdownGo(ctx) {
    const notes = [262, 330, 392, 523, 659, 784, 1047, 1319];
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square'; osc.frequency.value = freq;
        const s = t + i * 0.065;
        gain.gain.setValueAtTime(0.28, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.12);
        osc.start(s); osc.stop(s + 0.13);
    });
}

function _playDrumrollFanfare(ctx) {
    const t = ctx.currentTime;

    // === PHASE 1: Long building drumroll (2.2s) ===
    const rollDuration = 2.2;
    let hitTime = t;
    let interval = 0.14;
    while (hitTime < t + rollDuration) {
        const hitBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.07), ctx.sampleRate);
        const d = hitBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = hitBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 280; bp.Q.value = 0.8;
        const g = ctx.createGain();
        const progress = (hitTime - t) / rollDuration;
        g.gain.setValueAtTime(0.1 + progress * 0.55, hitTime);
        g.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.065);
        src.connect(bp); bp.connect(g); g.connect(ctx.destination);
        src.start(hitTime); src.stop(hitTime + 0.07);
        interval = Math.max(0.022, interval * 0.91);
        hitTime += interval;
    }

    // === PHASE 2: Crowd cheer burst (starts at roll end) ===
    const cheerStart = t + rollDuration;
    const cheerBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2.5), ctx.sampleRate);
    const cd = cheerBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = Math.random() * 2 - 1;
    const cheerSrc = ctx.createBufferSource();
    cheerSrc.buffer = cheerBuf;
    const cheerBp = ctx.createBiquadFilter();
    cheerBp.type = 'bandpass'; cheerBp.frequency.value = 1200; cheerBp.Q.value = 0.6;
    const cheerGain = ctx.createGain();
    cheerSrc.connect(cheerBp); cheerBp.connect(cheerGain); cheerGain.connect(ctx.destination);
    cheerGain.gain.setValueAtTime(0, cheerStart);
    cheerGain.gain.linearRampToValueAtTime(0.5, cheerStart + 0.2);
    cheerGain.gain.linearRampToValueAtTime(0.4, cheerStart + 1.2);
    cheerGain.gain.exponentialRampToValueAtTime(0.001, cheerStart + 2.4);
    cheerSrc.start(cheerStart); cheerSrc.stop(cheerStart + 2.5);

    // === PHASE 3: Ascending brass run ===
    const f = cheerStart + 0.05;
    [261, 330, 392, 494, 523, 659].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const s = f + i * 0.09;
        gain.gain.setValueAtTime(0.28, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.13);
        osc.start(s); osc.stop(s + 0.14);
    });

    // === PHASE 4: Grand final chord (big and sustained) ===
    const chord = f + 0.6;
    [130, 196, 261, 330, 392, 523, 659, 784, 1047].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, chord);
        gain.gain.linearRampToValueAtTime(0.22, chord + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, chord + 2.2);
        osc.start(chord); osc.stop(chord + 2.25);
    });

    // === PHASE 5: Sparkle tones on top ===
    const sparkle = chord + 0.1;
    [1047, 1319, 1568, 2093].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        const s = sparkle + i * 0.12;
        gain.gain.setValueAtTime(0.12, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.5);
        osc.start(s); osc.stop(s + 0.55);
    });
}

function _playPodiumFanfare(ctx) {
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

function unlockAudioOnce() {
    try { getAudioCtx().resume(); } catch (_) {}
    window.removeEventListener('click',      unlockAudioOnce);
    window.removeEventListener('keydown',    unlockAudioOnce);
    window.removeEventListener('touchstart', unlockAudioOnce);
}
window.addEventListener('click',      unlockAudioOnce);
window.addEventListener('keydown',    unlockAudioOnce);
window.addEventListener('touchstart', unlockAudioOnce);


// =====================================================================
// STATE
// =====================================================================

const STATES = {
    IDLE:           'idle',
    COUNTDOWN:      'countdown',
    QUESTION_MCQ:   'mcq',
    QUESTION_TF:    'tf',
    QUESTION_CARD:  'card',
    FEEDBACK:       'feedback',
    CATEGORY_DONE:  'category_done',
    FINAL_DONE:     'final_done'
};

let state = STATES.IDLE;
let questionBank = null;
let session = null;
let mqttClient;
let pendingTimers = [];
let leaderboardCache = null;
let timerInterval = null;

// =====================================================================
// MQTT
// =====================================================================

function initializeMQTT() {
    mqttClient = mqtt.connect(MQTT_BROKER, {
        clientId: 'EduBuddy_Dashboard_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 5000
    });

    mqttClient.on('connect', () => {
        setMqttDot(true);
        mqttClient.subscribe(Object.values(MQTT_TOPICS), (err) => {
            if (err) console.error('Subscribe error:', err);
        });
    });

    mqttClient.on('message', (topic, message) => {
        const msg = message.toString().trim();
        console.log(`[MQTT] ${topic} -> ${msg}`);
        handleMqttMessage(topic, msg);
    });

    mqttClient.on('error',   () => setMqttDot(false));
    mqttClient.on('offline', () => setMqttDot(false));
    mqttClient.on('reconnect', () => console.log('MQTT reconnecting...'));
}

function handleMqttMessage(topic, msg) {
    switch (topic) {
        case MQTT_TOPICS.status:
            setDeviceDot(msg === 'online');
            break;

        case MQTT_TOPICS.sessionStart:
            try {
                const p = JSON.parse(msg);
                loadQuestionBank().then(() => {
                    startSession(p.name || '', p.startCategory || '', p.mode || 'test');
                });
            } catch (e) { console.error('Bad session start payload:', msg); }
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

        case MQTT_TOPICS.nextCat:
            advanceToNextCategory();
            break;
    }
}

// =====================================================================
// SESSION FLOW
// =====================================================================

function startSession(name, startCategory, mode) {
    if (!questionBank) {
        console.warn('Question bank not loaded yet.');
        return;
    }

    const catOrder = getCategoryOrder();
    if (catOrder.length === 0) {
        console.warn('No categories in question bank.');
        return;
    }

    cancelAllTimers();
    hideFeedbackOverlay();

    if (startCategory && !catOrder.includes(startCategory)) {
        const fallback = getCategoryDisplay(catOrder[0]);
        console.warn(`startCategory "${startCategory}" not found in this device's question bank — falling back to "${catOrder[0]}". The Teacher Panel and this display may have different question banks in localStorage.`);
        showWarningToast(`⚠️ Category "${escapeHtml(startCategory)}" not found on this display — starting with ${fallback.emoji} ${escapeHtml(fallback.label)} instead.<br>Check that the Question Builder, Teacher Panel, and this display are all on the same device.`);
    }

    const startIdx = catOrder.includes(startCategory) ? catOrder.indexOf(startCategory) : 0;
    const rotated = catOrder.map((_, i) => catOrder[(startIdx + i) % catOrder.length]);

    const scoreByCat = {};
    rotated.forEach(c => scoreByCat[c] = 0);

    session = {
        name:       name,
        mode:       mode,           // 'learning' or 'test'
        categories: rotated,
        catIdx:     0,
        questions:  shuffle(questionBank[rotated[0]].slice()),
        qIdx:       0,
        scoreByCat,
        totalScore: 0,
        timeByCat:  {},
        totalTime:  0
    };

    console.log('Session started:', session);
    runCountdown(rotated[0]);
}

function runCountdown(category) {
    state = STATES.COUNTDOWN;
    showScreen('countdown-screen');

    const catDisp = getCategoryDisplay(category);

    // Show student name only in test mode
    const nameWrap = document.getElementById('countdown-name-wrap');
    if (session.mode === 'test' && session.name) {
        document.getElementById('countdown-name').textContent = session.name;
        nameWrap.style.display = '';
    } else {
        nameWrap.style.display = 'none';
    }

    document.getElementById('countdown-category').textContent = catDisp.label + ' ' + catDisp.emoji;

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
    const catDisp = getCategoryDisplay(category);
    const progress = `Q ${session.qIdx + 1} / ${session.questions.length}`;
    const studentTag = (session.mode === 'test') ? session.name : '';

    if (session.qIdx === 0) {
        session.catTimeSpent = 0;
    }
    startTimer();
    session.qStartTime = Date.now();

    if (q.type === 'mcq') {
        state = STATES.QUESTION_MCQ;

        const correctText = q.options[['A','B','C','D'].indexOf(q.correct)];
        const shuffledOptions = shuffle(q.options.slice());
        session.currentCorrect = ['A','B','C','D'][shuffledOptions.indexOf(correctText)];

        document.getElementById('mcq-category').textContent  = catDisp.emoji + ' ' + catDisp.label;
        document.getElementById('mcq-progress').textContent  = progress;
        document.getElementById('mcq-student').textContent   = studentTag;
        document.getElementById('mcq-question').textContent  = q.q;
        document.getElementById('mcq-opt-a').textContent     = shuffledOptions[0];
        document.getElementById('mcq-opt-b').textContent     = shuffledOptions[1];
        document.getElementById('mcq-opt-c').textContent     = shuffledOptions[2];
        document.getElementById('mcq-opt-d').textContent     = shuffledOptions[3];

        const imgEl = document.getElementById('mcq-image');
        if (q.image) { imgEl.src = q.image; imgEl.style.display = 'block'; }
        else { imgEl.style.display = 'none'; }

        showScreen('mcq-screen');

    } else if (q.type === 'tf') {
        state = STATES.QUESTION_TF;

        document.getElementById('tf-category').textContent  = catDisp.emoji + ' ' + catDisp.label;
        document.getElementById('tf-progress').textContent  = progress;
        document.getElementById('tf-student').textContent   = studentTag;
        document.getElementById('tf-question').textContent  = q.q;
        document.getElementById('tf-opt-a').textContent     = q.optionA;
        document.getElementById('tf-opt-b').textContent     = q.optionB;

        const imgEl = document.getElementById('tf-image');
        if (q.image) { imgEl.src = q.image; imgEl.style.display = 'block'; }
        else { imgEl.style.display = 'none'; }

        showScreen('tf-screen');

    } else if (q.type === 'card') {
        state = STATES.QUESTION_CARD;

        document.getElementById('card-category').textContent = catDisp.emoji + ' ' + catDisp.label;
        document.getElementById('card-progress').textContent  = progress;
        document.getElementById('card-student').textContent   = studentTag;
        document.getElementById('card-question').textContent  = q.q;

        const imgEl = document.getElementById('card-image');
        if (q.image) { imgEl.src = q.image; imgEl.style.display = 'block'; }
        else { imgEl.style.display = 'none'; }

        showScreen('card-screen');
    }
}

function handleAnswerInput(msg) {
    const q = session ? session.questions[session.qIdx] : null;

    if (state === STATES.QUESTION_MCQ && q) {
        const m = msg.match(/^BTN_([A-D])$/);
        if (!m) return;
        scoreAnswer(m[1] === session.currentCorrect);
        return;
    }

    const mapping = CARD_UIDS[msg];
    if (!mapping) return;

    if (state === STATES.QUESTION_TF && q) {
        const card = mapping.tf;
        if (!card || !['A','B'].includes(card)) return; // ignore hunt cards during TF
        scoreAnswer(card === q.correctCard);
        return;
    }

    if (state === STATES.QUESTION_CARD && q) {
        const card = mapping.hunt;
        if (!card || !card.startsWith('CARD')) return; // ignore TF cards and buttons during hunt
        scoreAnswer(card === q.correctCard);
        return;
    }
}

function scoreAnswer(isCorrect) {
    stopTimer();
    const elapsed = session.qStartTime ? (Date.now() - session.qStartTime) : 0;
    session.catTimeSpent = (session.catTimeSpent || 0) + elapsed;

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

    const cat     = session.categories[session.catIdx];
    const catDisp = getCategoryDisplay(cat);
    const score   = session.scoreByCat[cat];
    const max     = session.questions.length;
    const isLast  = session.catIdx >= session.categories.length - 1;

    const catTime = session.catTimeSpent || 0;
    session.timeByCat[cat] = catTime;
    session.totalTime = (session.totalTime || 0) + catTime;

    // Save to leaderboard only in test mode
    if (session.mode === 'test') {
        pushToLeaderboard(cat, session.name, score, catTime);
    }

    document.getElementById('cat-title').textContent = catDisp.label + ' ' + catDisp.emoji + ' Done!';
    document.getElementById('cat-score').textContent = `${score} / ${max}`;

    const catTimeEl = document.getElementById('cat-time');
    if (catTimeEl) {
        if (session.mode === 'test') {
            catTimeEl.textContent = `⏱️ Time taken: ${(catTime / 1000).toFixed(1)}s`;
            catTimeEl.style.display = 'inline-block';
        } else {
            catTimeEl.style.display = 'none';
        }
    }

    // Show top 3 only in test mode
    const top3Section = document.getElementById('cat-top3-section');
    if (session.mode === 'test') {
        top3Section.style.display = '';
        document.getElementById('cat-top-name').textContent = catDisp.label;
        renderTop3('cat-top-list', cat);
    } else {
        top3Section.style.display = 'none';
    }

    if (isLast) {
        document.getElementById('cat-next').textContent = '🎉 All categories done! Teacher: tap Next for final score.';
    } else {
        const nextCat  = session.categories[session.catIdx + 1];
        const nextDisp = getCategoryDisplay(nextCat);
        document.getElementById('cat-next').textContent =
            'Next: ' + nextDisp.label + ' ' + nextDisp.emoji + ' — Teacher: tap Next Category';
    }

    showScreen('category-scoreboard');
    playSound('leaderboard');
    // No auto-advance — teacher manually triggers next category via MQTT
}

function advanceToNextCategory() {
    if (state !== STATES.CATEGORY_DONE) return;
    cancelAllTimers();

    const isLast = session.catIdx >= session.categories.length - 1;
    if (isLast) {
        showFinalScoreboard();
    } else {
        session.catIdx++;
        session.qIdx = 0;
        const newCat = session.categories[session.catIdx];
        session.questions = shuffle(questionBank[newCat].slice());
        pendingTimers.push(setTimeout(() => runCountdown(newCat), TIMING.betweenCategories));
    }
}

function showFinalScoreboard() {
    state = STATES.FINAL_DONE;

    const totalMax = session.categories.reduce((sum, c) => sum + questionBank[c].length, 0);

    const finalTimeEl = document.getElementById('final-time');
    if (session.mode === 'test') {
        pushToLeaderboard('overall', session.name, session.totalScore, session.totalTime);
        document.getElementById('final-name').textContent = session.name + "'s Final Score";
        if (finalTimeEl) {
            finalTimeEl.textContent = `⏱️ Total time: ${(session.totalTime / 1000).toFixed(1)}s`;
            finalTimeEl.style.display = 'inline-block';
        }
    } else {
        document.getElementById('final-name').textContent = 'Final Score';
        if (finalTimeEl) finalTimeEl.style.display = 'none';
    }

    document.getElementById('final-score').textContent = session.totalScore;
    document.querySelector('#final-scoreboard .final-out-of').textContent = 'out of ' + totalMax;

    // Show top 3 only in test mode
    const top3Section = document.getElementById('final-top3-section');
    if (session.mode === 'test') {
        top3Section.style.display = '';
        renderTop3('final-top-list', 'overall');
    } else {
        top3Section.style.display = 'none';
    }

    showScreen('final-scoreboard');
    playSound('finalboard');
    spawnConfetti();
}

function endSessionAndReturnToIdle() {
    cancelAllTimers();
    hideFeedbackOverlay();
    session = null;
    state = STATES.IDLE;
    showScreen('idle-screen');
}

// =====================================================================
// LEADERBOARD
// =====================================================================

async function fetchLeaderboardFromCloud() {
    try {
        const res = await fetch(JSONBIN_URL + '/latest', {
            headers: { 'X-Master-Key': JSONBIN_KEY }
        });
        const json = await res.json();
        leaderboardCache = json.record || {};
        console.log('Leaderboard loaded from cloud.');
    } catch (e) {
        console.warn('Failed to load leaderboard from cloud, starting fresh:', e);
        leaderboardCache = {};
    }
}

function loadLeaderboard() {
    return leaderboardCache || {};
}

function saveLeaderboard(board) {
    leaderboardCache = board;
    fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
            'X-Master-Key': JSONBIN_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(board)
    }).catch(e => console.warn('Failed to save leaderboard to cloud:', e));
}

function pushToLeaderboard(category, name, score, time) {
    const board = loadLeaderboard();
    if (!board[category]) board[category] = [];
    board[category].push({ name, score, time, ts: Date.now() });
    board[category].sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        const aTime = a.time !== undefined ? a.time : 9999999;
        const bTime = b.time !== undefined ? b.time : 9999999;
        if (aTime !== bTime) {
            return aTime - bTime;
        }
        return a.ts - b.ts;
    });
    saveLeaderboard(board);
}

function resetLeaderboard() {
    saveLeaderboard({});
    console.log('Leaderboard reset.');
}

function renderTop3(elementId, category) {
    const board = loadLeaderboard();
    const list  = board[category] || [];
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

    // Show ALL students — top 3 highlighted with medals, rest numbered below
    list.forEach((entry, i) => {
        const row = document.createElement('div');
        const timeStr = entry.time !== undefined ? `${(entry.time / 1000).toFixed(1)}s` : '—';
        const rankStr = i < TOP_N ? icons[i] : `#${i + 1}`;
        row.className = i < TOP_N ? 'top3-row ' + medals[i] : 'top3-row others';
        row.innerHTML = `
            <span class="rank">${rankStr}</span>
            <span class="name">${escapeHtml(entry.name)}</span>
            <span class="score">${entry.score}</span>
            <span class="time">${timeStr}</span>
        `;
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

const CORRECT_MASCOTS = ['😄','🥳','🎉','⭐','🌟','😁','🏆','👏'];
const WRONG_MASCOTS   = ['😅','🙈','😬','💪','🤔','😮'];

function showFeedback(isCorrect) {
    state = STATES.FEEDBACK;
    const overlay = document.getElementById('feedback-overlay');
    const icon    = document.getElementById('feedback-icon');
    const text    = document.getElementById('feedback-text');
    const mascot  = document.getElementById('feedback-mascot');

    overlay.classList.remove('correct', 'wrong');
    overlay.classList.add(isCorrect ? 'correct' : 'wrong');
    icon.textContent   = isCorrect ? '✓' : '✗';
    text.textContent   = isCorrect ? 'Correct!' : 'Try Again!';

    // Pick a random mascot emoji
    const pool = isCorrect ? CORRECT_MASCOTS : WRONG_MASCOTS;
    mascot.textContent = pool[Math.floor(Math.random() * pool.length)];

    // Force re-trigger mascot animation
    mascot.style.animation = 'none';
    mascot.offsetHeight; // reflow
    mascot.style.animation = '';

    overlay.classList.add('show');

    // Spawn floating stars on correct answer
    if (isCorrect) spawnStars(overlay);

    playSound(isCorrect ? 'correct' : 'wrong');
}

function spawnConfetti() {
    const colors = ['#f7b731','#f5576c','#667eea','#11998e','#38ef7d','#f093fb','#ff6b6b','#ffd700'];
    // Clean up old confetti
    document.querySelectorAll('.confetti-piece').forEach(c => c.remove());
    for (let i = 0; i < 80; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left     = Math.random() * 100 + 'vw';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.width    = (8 + Math.random() * 10) + 'px';
        el.style.height   = (10 + Math.random() * 14) + 'px';
        el.style.animationDuration  = (2.5 + Math.random() * 3) + 's';
        el.style.animationDelay     = (Math.random() * 2) + 's';
        el.style.borderRadius       = Math.random() > 0.5 ? '50%' : '3px';
        document.body.appendChild(el);
        // Auto-remove after animation
        el.addEventListener('animationend', () => el.remove());
    }
}

function spawnStars(overlay) {
    const stars = ['⭐','🌟','✨','💫','🎊','🎈'];
    // Remove old particles
    overlay.querySelectorAll('.star-particle').forEach(s => s.remove());
    for (let i = 0; i < 8; i++) {
        const el = document.createElement('div');
        el.className = 'star-particle';
        el.textContent = stars[Math.floor(Math.random() * stars.length)];
        el.style.left   = (15 + Math.random() * 70) + '%';
        el.style.bottom = (10 + Math.random() * 30) + '%';
        el.style.animationDelay = (Math.random() * 0.4) + 's';
        el.style.fontSize = (1.5 + Math.random() * 2) + 'em';
        overlay.appendChild(el);
    }
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

let warningToastTimer = null;
function showWarningToast(message) {
    const toast = document.getElementById('warning-toast');
    if (!toast) return;
    toast.innerHTML = message;
    toast.classList.add('show');
    if (warningToastTimer) clearTimeout(warningToastTimer);
    warningToastTimer = setTimeout(() => toast.classList.remove('show'), 8000);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const start = Date.now();
    const baseTime = (session && session.catTimeSpent) || 0;

    const mcqTimer = document.getElementById('mcq-timer');
    const tfTimer = document.getElementById('tf-timer');
    const cardTimer = document.getElementById('card-timer');

    const displayStyle = session ? '' : 'none';
    if (mcqTimer) mcqTimer.style.display = displayStyle;
    if (tfTimer) tfTimer.style.display = displayStyle;
    if (cardTimer) cardTimer.style.display = displayStyle;

    timerInterval = setInterval(() => {
        if (!session) {
            clearInterval(timerInterval);
            return;
        }
        const elapsed = Date.now() - start;
        const totalSec = ((baseTime + elapsed) / 1000).toFixed(1);

        if (mcqTimer) mcqTimer.textContent = `⏱️ ${totalSec}s`;
        if (tfTimer) tfTimer.textContent = `⏱️ ${totalSec}s`;
        if (cardTimer) cardTimer.textContent = `⏱️ ${totalSec}s`;
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function cancelAllTimers() {
    stopTimer();
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
// QUESTION BANK LOADER
// =====================================================================

async function loadQuestionBank() {
    // Check localStorage for custom questions saved by the Question Builder
    const custom = localStorage.getItem('edubuddy_custom_questions');
    if (custom) {
        try {
            const parsed = JSON.parse(custom);
            const cats = Object.keys(parsed).filter(k => !k.startsWith('_'));
            if (cats.length > 0 && cats.every(c => Array.isArray(parsed[c]) && parsed[c].length > 0)) {
                questionBank = parsed;
                console.log('Custom question bank loaded from localStorage.');
                showBankIndicator('custom');
                return;
            }
        } catch (e) {
            console.warn('Invalid custom questions in localStorage, falling back to default.');
        }
    }

    try {
        const res = await fetch('questions.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const raw = await res.json();
        delete raw._comment;
        questionBank = raw;
        const cats = Object.keys(raw).filter(k => !k.startsWith('_'));
        if (cats.length === 0) {
            showBankIndicator('empty');
        } else {
            console.log('Default question bank loaded.');
            showBankIndicator('default');
        }
    } catch (e) {
        console.error('Failed to load questions.json:', e);
        questionBank = {};
        showBankIndicator('empty');
    }
}

function showBankIndicator(type) {
    const el = document.getElementById('bank-indicator');
    if (!el) return;
    if (type === 'custom')       el.textContent = '📝 Custom Questions';
    else if (type === 'empty')   el.textContent = '⚠️ No questions yet — use Question Builder';
    else                         el.textContent = '📚 Default Questions';
    el.style.display = 'inline';
}

// =====================================================================
// BOOT
// =====================================================================

window.addEventListener('DOMContentLoaded', async () => {
    console.log('Smart EduBuddy dashboard starting...');
    showScreen('idle-screen');
    await loadQuestionBank();
    await fetchLeaderboardFromCloud();
    initializeMQTT();
});

// Keyboard simulator for testing without hardware (as described in GUIDE_ME.md)
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(key)) {
        handleAnswerInput('BTN_' + key);
    } else if (key === 'Q') {
        handleAnswerInput('FDA2D406'); // Maps to TF Card A
    } else if (key === 'W') {
        handleAnswerInput('26312680'); // Maps to TF Card B
    } else if (key === '1') {
        handleAnswerInput('DE152580'); // Maps to Hunt Card 1
    } else if (key === '2') {
        handleAnswerInput('E3CD2680'); // Maps to Hunt Card 2
    } else if (key === '3') {
        handleAnswerInput('B6D12480'); // Maps to Hunt Card 3
    } else if (key === '4') {
        handleAnswerInput('CAFD2580'); // Maps to Hunt Card 4
    }
});
