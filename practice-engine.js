/* ===== Practice Mode · Engine =====
 *
 * Depends on:  practice-concepts.js (loaded before this file)
 * Exposes:     window.Practice (global object with all engine methods)
 *
 * Handles:
 *   - Session state (practice / test / endless)
 *   - Timer (counts up for practice/test, counts down for endless)
 *   - Problem generation via concept adapters
 *   - Step-by-step validation
 *   - Mastery tracking (0-100%)
 *   - Endless scoring + tier escalation
 *   - Error pattern detection
 *   - localStorage persistence
 */

(function () {
  'use strict';

  /* ============================================================
     STORAGE
     ============================================================ */
  const STORAGE_KEY = 'studytools_practice_v1';

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { concepts: {}, sessions: [] };
    } catch (e) {
      return { concepts: {}, sessions: [] };
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  /* ============================================================
     UTILS
     ============================================================ */
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  function fmtScore(n) {
    if (!isFinite(n)) return '0';
    return Math.round(n).toLocaleString();
  }

  /* ============================================================
     SESSION STATE
     ============================================================ */
  const state = {
    active: false,
    mode: null,           // 'practice' | 'test' | 'endless'
    conceptId: null,
    concept: null,        // reference to adapter
    problem: null,        // current problem
    problemCount: 0,      // how many problems total (practice/test)
    currentIndex: 0,      // which problem we're on
    answered: [],         // array of { problem, studentAnswer, correct, timeTaken, errorPattern }
    startedAt: 0,
    elapsed: 0,           // seconds elapsed (practice/test) or elapsed (endless)
    timeRemaining: 0,     // only for endless
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    longestStreak: 0,
    score: 0,             // only for endless
    tier: 1,              // 1-3
    tierStartStreak: 0,   // streak value when we entered current tier
    timerHandle: null,
    setupOptions: null    // student's choices from setup screen
  };

  const MASTERY_PER_CORRECT = 20; // each correct answer adds this much to mastery (until 100)
  const ENDLESS_TIME_BONUS = { 1: 10, 2: 15, 3: 20 };
  const ENDLESS_TIME_PENALTY = 10;
  const ENDLESS_POINTS = { 1: 100, 2: 200, 3: 300 };
  const ENDLESS_STREAK_BONUS = 50; // every 5 correct in a row
  const ENDLESS_TIER_UP_AT = 5;    // every 5 consecutive correct = tier up

  /* ============================================================
     CONCEPT LOOKUP
     ============================================================ */
  function getConcept(id) {
    if (typeof window === 'undefined' || !window.PRACTICE_CONCEPTS) return null;
    return window.PRACTICE_CONCEPTS[id] || null;
  }

  function listConcepts() {
    if (typeof window === 'undefined' || !window.PRACTICE_CONCEPTS) return [];
    return Object.values(window.PRACTICE_CONCEPTS);
  }

  /* ============================================================
     START SESSION
     ============================================================ */
  function start(options) {
    const concept = getConcept(options.conceptId);
    if (!concept) {
      console.warn('Concept not found:', options.conceptId);
      return false;
    }

    state.active = true;
    state.mode = options.mode;
    state.conceptId = options.conceptId;
    state.concept = concept;
    state.problemCount = options.problemCount || 10;
    state.currentIndex = 0;
    state.answered = [];
    state.correctCount = 0;
    state.wrongCount = 0;
    state.streak = 0;
    state.longestStreak = 0;
    state.score = 0;
    state.tier = 1;
    state.startedAt = Date.now();
    state.elapsed = 0;
    state.setupOptions = options;

    if (options.mode === 'endless') {
      state.timeRemaining = (options.startTime || 3) * 60;
    } else {
      state.timeRemaining = 0;
    }

    startTimer();
    nextProblem();
    return true;
  }

  /* ============================================================
     TIMER
     ============================================================ */
  function startTimer() {
    stopTimer();
    state.timerHandle = setInterval(() => {
      state.elapsed += 1;
      if (state.mode === 'endless') {
        state.timeRemaining -= 1;
        if (state.timeRemaining <= 0) {
          state.timeRemaining = 0;
          endSession('timeout');
        }
      }
      // Fire events for UI
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('practice:tick', {
          detail: {
            elapsed: state.elapsed,
            timeRemaining: state.timeRemaining,
            mode: state.mode
          }
        }));
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerHandle) {
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    }
  }

  /* ============================================================
     PROBLEM GENERATION
     ============================================================ */
  function nextProblem() {
    if (!state.concept) return null;

    // Practice and Test: fixed count
    if (state.mode === 'practice' || state.mode === 'test') {
      if (state.currentIndex >= state.problemCount) {
        endSession('complete');
        return null;
      }
    }

    // Endless: no count limit, generate forever
    state.problem = state.concept.generate(state.tier);
    return state.problem;
  }

  /* ============================================================
     ANSWER SUBMISSION
     ============================================================ */
  function submitAnswer(answer) {
    if (!state.active || !state.problem) return null;

    const timeTaken = Math.round((Date.now() - state.startedAt) / 1000);
    let result = null;

    if (state.concept.type === 'numeric') {
      // Numeric: answer is a number
      const solved = state.concept.solve(state.problem);
      const studentNum = parseFloat(String(answer).replace(/[^0-9.\-eE]/g, ''));
      const correctNum = solved.answer;
      const tolerance = 0.01;
      const diff = Math.abs(studentNum - correctNum);
      const relDiff = correctNum !== 0 ? diff / Math.abs(correctNum) : diff;
      const correct = !isNaN(studentNum) && relDiff < tolerance;

      let errorPattern = null;
      if (!correct && state.concept.detectError) {
        errorPattern = state.concept.detectError(state.problem, answer);
      }

      result = {
        correct: correct,
        correctAnswer: solved.answerFormatted,
        correctAnswerRaw: correctNum,
        studentAnswer: studentNum,
        steps: solved.steps,
        meta: solved.meta,
        errorPattern: errorPattern
      };
    } else if (state.concept.type === 'conceptual') {
      // Conceptual: answer is a string
      const check = state.concept.checkAnswer(state.problem, answer);
      let errorPattern = null;
      if (!check.correct && state.concept.detectError) {
        errorPattern = state.concept.detectError(state.problem, answer);
      }
      result = {
        correct: check.correct,
        correctAnswer: check.expected,
        studentAnswer: answer,
        errorPattern: errorPattern
      };
    }

    // Update state based on result
    state.answered.push({
      index: state.currentIndex,
      problem: state.problem,
      result: result,
      timeTaken: timeTaken,
      tier: state.tier
    });

    if (result.correct) {
      state.correctCount++;
      state.streak++;
      if (state.streak > state.longestStreak) state.longestStreak = state.streak;

      if (state.mode === 'endless') {
        // Add time
        const bonus = ENDLESS_TIME_BONUS[state.tier] || 10;
        state.timeRemaining += bonus;
        // Add points
        const points = ENDLESS_POINTS[state.tier] || 100;
        state.score += points;
        // Streak bonus
        if (state.streak > 0 && state.streak % 5 === 0) {
          state.score += ENDLESS_STREAK_BONUS;
        }
        // Tier up
        if (state.streak > 0 && state.streak % ENDLESS_TIER_UP_AT === 0 && state.tier < 3) {
          state.tier++;
        }
      }
    } else {
      state.wrongCount++;
      state.streak = 0;

      if (state.mode === 'endless') {
        // Remove time
        state.timeRemaining = Math.max(0, state.timeRemaining - ENDLESS_TIME_PENALTY);
        if (state.timeRemaining <= 0) {
          // Will end after the answer is recorded
          setTimeout(() => endSession('timeout'), 100);
        }
      }
    }

    state.currentIndex++;

    // Fire event for UI
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('practice:answer', {
        detail: { result: result, state: publicState() }
      }));
    }

    return result;
  }

  /* ============================================================
     ADVANCE TO NEXT PROBLEM
     ============================================================ */
  function advance() {
    if (!state.active) return null;
    return nextProblem();
  }

  /* ============================================================
     END SESSION
     ============================================================ */
  function endSession(reason) {
    if (!state.active) return null;
    state.active = false;
    stopTimer();

    const session = {
      id: 'sess-' + Date.now(),
      conceptId: state.conceptId,
      mode: state.mode,
      startedAt: state.startedAt,
      endedAt: Date.now(),
      duration: state.elapsed,
      correct: state.correctCount,
      wrong: state.wrongCount,
      total: state.answered.length,
      longestStreak: state.longestStreak,
      score: state.score,
      tier: state.tier,
      reason: reason,
      answered: state.answered
    };

    // Persist to store
    const store = loadStore();
    if (!store.concepts[state.conceptId]) {
      store.concepts[state.conceptId] = {
        mastery: 0,
        bestEndless: 0,
        bestTier: 1,
        totalAttempts: 0,
        correctTotal: 0,
        wrongTotal: 0
      };
    }
    const record = store.concepts[state.conceptId];
    record.totalAttempts += session.total;
    record.correctTotal += session.correct;
    record.wrongTotal += session.wrong;

    if (state.mode === 'practice') {
      const add = session.correct * MASTERY_PER_CORRECT;
      record.mastery = Math.min(100, record.mastery + add);
    } else if (state.mode === 'test') {
      const testScore = session.total > 0 ? (session.correct / session.total) * 100 : 0;
      record.mastery = Math.round(testScore);
    } else if (state.mode === 'endless') {
      if (session.score > record.bestEndless) record.bestEndless = session.score;
      if (session.tier > record.bestTier) record.bestTier = session.tier;
    }

    // Cap session log to 50 entries
    store.sessions.unshift(session);
    if (store.sessions.length > 50) store.sessions = store.sessions.slice(0, 50);

    saveStore(store);

    // Fire event for UI
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('practice:end', {
        detail: { session: session, reason: reason }
      }));
    }

    return session;
  }

  /* ============================================================
     PUBLIC STATE (read-only snapshot)
     ============================================================ */
  function publicState() {
    return {
      active: state.active,
      mode: state.mode,
      conceptId: state.conceptId,
      conceptTitle: state.concept ? state.concept.title : null,
      problem: state.problem,
      currentIndex: state.currentIndex,
      problemCount: state.problemCount,
      elapsed: state.elapsed,
      timeRemaining: state.timeRemaining,
      correct: state.correctCount,
      wrong: state.wrongCount,
      streak: state.streak,
      longestStreak: state.longestStreak,
      score: state.score,
      tier: state.tier
    };
  }

  /* ============================================================
     MASTERY / STATS LOOKUP
     ============================================================ */
  function getMastery(conceptId) {
    const store = loadStore();
    return store.concepts[conceptId] || {
      mastery: 0,
      bestEndless: 0,
      bestTier: 1,
      totalAttempts: 0,
      correctTotal: 0,
      wrongTotal: 0
    };
  }

  function getAllMastery() {
    const store = loadStore();
    const out = {};
    listConcepts().forEach(c => {
      out[c.id] = store.concepts[c.id] || {
        mastery: 0,
        bestEndless: 0,
        bestTier: 1,
        totalAttempts: 0,
        correctTotal: 0,
        wrongTotal: 0
      };
    });
    return out;
  }

  function getRecentSessions(limit) {
    const store = loadStore();
    return store.sessions.slice(0, limit || 20);
  }

  /* ============================================================
     RESET (for testing / cleanup)
     ============================================================ */
  function resetProgress() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function resetConcept(conceptId) {
    const store = loadStore();
    delete store.concepts[conceptId];
    saveStore(store);
  }

  /* ============================================================
     EXPORT / IMPORT
     ============================================================ */
  function exportProgress() {
    const store = loadStore();
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studytools-practice-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data && data.concepts) {
          saveStore(data);
          if (callback) callback(true);
        } else {
          if (callback) callback(false, 'Invalid file format');
        }
      } catch (err) {
        if (callback) callback(false, err.message);
      }
    };
    reader.readAsText(file);
  }

  /* ============================================================
     HELPERS FOR UI
     ============================================================ */
  function getConceptsBySubject() {
    const grouped = {};
    listConcepts().forEach(c => {
      const key = c.subject + ' · Gr ' + c.grade;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });
    return grouped;
  }

  function getGradeList() {
    const grades = new Set();
    listConcepts().forEach(c => grades.add(c.grade));
    return Array.from(grades).sort((a, b) => a - b);
  }

  function getSubjectListForGrade(grade) {
    const subjects = new Set();
    listConcepts().forEach(c => {
      if (c.grade === grade) subjects.add(c.subject);
    });
    return Array.from(subjects).sort();
  }

  function getConceptListForGradeSubject(grade, subject) {
    return listConcepts().filter(c => c.grade === grade && c.subject === subject);
  }

  /* ============================================================
     EXPOSE GLOBAL API
     ============================================================ */
  const api = {
    // session control
    start: start,
    submitAnswer: submitAnswer,
    advance: advance,
    endSession: endSession,
    getState: publicState,

    // lookups
    getConcept: getConcept,
    listConcepts: listConcepts,
    getConceptsBySubject: getConceptsBySubject,
    getGradeList: getGradeList,
    getSubjectListForGrade: getSubjectListForGrade,
    getConceptListForGradeSubject: getConceptListForGradeSubject,

    // progress
    getMastery: getMastery,
    getAllMastery: getAllMastery,
    getRecentSessions: getRecentSessions,
    resetProgress: resetProgress,
    resetConcept: resetConcept,

    // export / import
    exportProgress: exportProgress,
    importProgress: importProgress,

    // utils
    fmtTime: fmtTime,
    fmtScore: fmtScore
  };

  if (typeof window !== 'undefined') {
    window.Practice = api;
  }

  // Also expose for Node-style module loading if needed
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();