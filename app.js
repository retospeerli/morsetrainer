// ===============================
// Morse-Lernapp
// kompletter Neuaufbau app.js
// ===============================

// ---------------------------------
// Morse-Daten
// ---------------------------------
const MORSE_MAP = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--.."
};

const LETTERS = Object.keys(MORSE_MAP);

const WORDS = [
  "BERG", "TAL", "WALD", "WIESE", "FELD", "FLUSS", "BACH", "SEE", "INSEL", "UFER",
  "STRAND", "FELS", "WEG", "PFAD", "HANG", "EBENE", "WOLKE", "HIMMEL", "REGEN", "WIND",
  "HAUS", "HUTTE", "TURM", "KIRCHE", "SCHULE", "BAHNHOF", "HALLE", "GARAGE", "HAFEN", "BRUCKE",
  "TUNNEL", "MAUER", "ZAUN", "TOR", "FENSTER", "DACH", "KELLER", "HOF", "STALL", "WERK",
  "STRASSE", "GASSE", "KREUZUNG", "KURVE", "KREISEL", "AMPEL", "SCHILD", "GLEIS", "RAMPE", "PLATZ",
  "PARKPLATZ", "HALTESTELLE", "LINIE", "KARTE", "PLAN", "SPUR", "ROUTE", "ZIEL", "START", "UMWEG",
  "AUTO", "BUS", "TRAM", "ZUG", "TAXI", "VELO", "RAD", "LASTWAGEN", "ANHANGER", "WAGEN",
  "LOK", "WAGGON", "SCHIFF", "BOOT", "KAHN", "FAEHRE", "UBOOT", "KRAN", "CONTAINER", "PAKET",
  "RAKETE", "KAPSEL", "ROVER", "SATELLIT", "MOND", "STERN", "PLANET", "FUNK", "ANTENNE", "SENDER",
  "EMPFANGER", "SIGNAL", "TASTE", "KNOPF", "LAMPE", "SIRENE", "LAUTER", "AKKU", "MOTOR", "PROPELLER"
];

// ---------------------------------
// DOM
// ---------------------------------
const startScreen = document.getElementById("startScreen");
const trainingScreen = document.getElementById("trainingScreen");
const letterSelection = document.getElementById("letterSelection");
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");

const unitSlider = document.getElementById("unitSlider");
const freqSlider = document.getElementById("freqSlider");
const toleranceSlider = document.getElementById("toleranceSlider");
const unitLabel = document.getElementById("unitLabel");
const freqLabel = document.getElementById("freqLabel");
const toleranceLabel = document.getElementById("toleranceLabel");

const targetLetterEl = document.getElementById("targetLetter");
const selectedLettersInfo = document.getElementById("selectedLettersInfo");
const playBtn = document.getElementById("playBtn");
const nextBtn = document.getElementById("nextBtn");
const morseKey = document.getElementById("morseKey");
const livePattern = document.getElementById("livePattern");
const liveDecode = document.getElementById("liveDecode");
const feedback = document.getElementById("feedback");

const correctCountEl = document.getElementById("correctCount");
const attemptCountEl = document.getElementById("attemptCount");
const accuracyEl = document.getElementById("accuracy");

// ---------------------------------
// App-Zustand
// ---------------------------------
let selectedLetters = ["E", "T", "I", "A", "N", "M"];
let currentMode = "letter"; // "letter" | "word"
let currentTarget = "E";
let currentWordProgress = "";
let currentInputSymbols = "";

let stats = {
  correct: 0,
  attempts: 0
};

let audioCtx = null;
let oscillator = null;
let gainNode = null;

let isPressing = false;
let pressStartTime = 0;
let finalizeLetterTimer = null;
let finalizeWordTimer = null;

// ---------------------------------
// Toleranz-Profile
// ---------------------------------
const toleranceSettings = [
  {
    name: "streng",
    dotMaxFactor: 1.8,
    letterPauseFactor: 2.5,
    wordPauseFactor: 6.0
  },
  {
    name: "mittel",
    dotMaxFactor: 2.2,
    letterPauseFactor: 2.9,
    wordPauseFactor: 6.8
  },
  {
    name: "grosszügig",
    dotMaxFactor: 2.8,
    letterPauseFactor: 3.3,
    wordPauseFactor: 7.8
  }
];

// ---------------------------------
// Initialisierung
// ---------------------------------
function init() {
  buildLetterSelection();
  injectModeSelector();
  updateLabels();
  updateStats();
  updateModeUI();
  setupEventListeners();
}

function injectModeSelector() {
  const settingsCard = startBtn.closest(".card");
  if (!settingsCard) return;

  const modeBox = document.createElement("div");
  modeBox.className = "info-box";
  modeBox.style.marginBottom = "18px";
  modeBox.innerHTML = `
    <p><strong>Modus:</strong></p>
    <label style="display:block; margin:6px 0;">
      <input type="radio" name="trainMode" value="letter" checked />
      Buchstaben üben
    </label>
    <label style="display:block; margin:6px 0;">
      <input type="radio" name="trainMode" value="word" />
      Ganze Wörter üben
    </label>
  `;

  settingsCard.insertBefore(modeBox, settingsCard.querySelector(".info-box"));

  const radios = modeBox.querySelectorAll('input[name="trainMode"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      currentMode = radio.value;
      updateModeUI();
    });
  });
}

// ---------------------------------
// UI-Helfer
// ---------------------------------
function buildLetterSelection() {
  if (!letterSelection) return;

  letterSelection.innerHTML = "";

  LETTERS.forEach((letter) => {
    const wrap = document.createElement("div");
    wrap.className = "letter-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `letter-${letter}`;
    input.value = letter;
    input.checked = selectedLetters.includes(letter);

    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.textContent = letter;

    input.addEventListener("change", updateSelectedLettersFromUI);

    wrap.appendChild(input);
    wrap.appendChild(label);
    letterSelection.appendChild(wrap);
  });
}

function updateSelectedLettersFromUI() {
  if (!letterSelection) return;

  const checked = [...letterSelection.querySelectorAll('input[type="checkbox"]:checked')].map(
    (cb) => cb.value
  );
  selectedLetters = checked;
}

function applyPreset(name) {
  let preset = [];

  if (name === "all") preset = [...LETTERS];
  if (name === "none") preset = [];
  if (name === "etianm") preset = ["E", "T", "I", "A", "N", "M"];
  if (name === "surwdkgo") preset = ["S", "U", "R", "W", "D", "K", "G", "O"];
  if (name === "hvflpjbxcyzq") preset = ["H", "V", "F", "L", "P", "J", "B", "X", "C", "Y", "Z", "Q"];

  selectedLetters = preset;
  syncLetterCheckboxes();
}

function syncLetterCheckboxes() {
  if (!letterSelection) return;

  const checkboxes = [...letterSelection.querySelectorAll('input[type="checkbox"]')];
  checkboxes.forEach((cb) => {
    cb.checked = selectedLetters.includes(cb.value);
  });
}

function updateLabels() {
  unitLabel.textContent = `${unitSlider.value} ms`;
  freqLabel.textContent = `${freqSlider.value} Hz`;
  toleranceLabel.textContent = toleranceSettings[Number(toleranceSlider.value)].name;
}

function updateModeUI() {
  const isWordMode = currentMode === "word";

  const letterCard = letterSelection ? letterSelection.closest(".card") : null;
  if (letterCard) {
    letterCard.style.opacity = isWordMode ? "0.45" : "1";
    letterCard.style.pointerEvents = isWordMode ? "none" : "auto";
  }

  if (selectedLettersInfo) {
    if (isWordMode) {
      selectedLettersInfo.textContent = "Modus: Ganze Wörter üben";
    } else {
      selectedLettersInfo.textContent = `Ausgewählte Buchstaben: ${selectedLetters.join(", ")}`;
    }
  }
}

function setFeedback(text, type = "neutral") {
  feedback.textContent = text;
  feedback.className = `feedback ${type}`;
}

function updateStats() {
  correctCountEl.textContent = String(stats.correct);
  attemptCountEl.textContent = String(stats.attempts);

  const accuracy =
    stats.attempts === 0 ? 0 : Math.round((stats.correct / stats.attempts) * 100);
  accuracyEl.textContent = `${accuracy}%`;
}

function resetCurrentInput() {
  currentInputSymbols = "";
  livePattern.textContent = "–";

  if (currentMode === "word") {
    liveDecode.textContent = currentWordProgress || "…";
  } else {
    liveDecode.textContent = "…";
  }

  clearLetterTimer();
}

function updateLiveDisplay() {
  livePattern.textContent = currentInputSymbols || "–";

  const decoded = patternToLetter(currentInputSymbols);

  if (currentMode === "letter") {
    liveDecode.textContent = decoded || "…";
  } else {
    const preview = decoded ? currentWordProgress + decoded : currentWordProgress || "…";
    liveDecode.textContent = preview || "…";
  }
}

// ---------------------------------
// Grundeinstellungen
// ---------------------------------
function getUnit() {
  return Number(unitSlider.value);
}

function getFrequency() {
  return Number(freqSlider.value);
}

function getTolerance() {
  return toleranceSettings[Number(toleranceSlider.value)];
}

// ---------------------------------
// Audio
// ---------------------------------
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function startTone() {
  ensureAudio();
  stopTone();

  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = getFrequency();
  gainNode.gain.value = 0.18;

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
}

function stopTone() {
  if (oscillator) {
    try {
      oscillator.stop();
    } catch (err) {
      // ignore
    }
    oscillator.disconnect();
    oscillator = null;
  }

  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playMorsePattern(pattern) {
  ensureAudio();

  const unit = getUnit();

  for (let i = 0; i < pattern.length; i++) {
    const symbol = pattern[i];
    const duration = symbol === "." ? unit : unit * 3;

    startTone();
    await sleep(duration);
    stopTone();

    if (i < pattern.length - 1) {
      await sleep(unit);
    }
  }
}

async function playTarget() {
  ensureAudio();

  playBtn.disabled = true;
  nextBtn.disabled = true;
  morseKey.disabled = true;

  const unit = getUnit();

  if (currentMode === "letter") {
    const pattern = MORSE_MAP[currentTarget];
    await playMorsePattern(pattern);
  } else {
    for (let i = 0; i < currentTarget.length; i++) {
      const ch = currentTarget[i];
      const pattern = MORSE_MAP[ch];
      if (!pattern) continue;

      await playMorsePattern(pattern);

      if (i < currentTarget.length - 1) {
        await sleep(unit * 3);
      }
    }
  }

  await sleep(unit * 3);

  playBtn.disabled = false;
  nextBtn.disabled = false;
  morseKey.disabled = false;
}

// ---------------------------------
// Morse-Auswertung
// ---------------------------------
function patternToLetter(pattern) {
  for (const [letter, morse] of Object.entries(MORSE_MAP)) {
    if (morse === pattern) return letter;
  }
  return null;
}

function handlePressStart() {
  if (isPressing) return;

  ensureAudio();

  clearLetterTimer();
  clearWordTimer();

  isPressing = true;
  pressStartTime = performance.now();
  morseKey.classList.add("active");
  startTone();
}

function handlePressEnd() {
  if (!isPressing) return;

  isPressing = false;
  stopTone();
  morseKey.classList.remove("active");

  const duration = performance.now() - pressStartTime;
  const unit = getUnit();
  const tolerance = getTolerance();

  const symbol = duration < unit * tolerance.dotMaxFactor ? "." : "-";
  currentInputSymbols += symbol;
  updateLiveDisplay();

  scheduleLetterFinalize();
  scheduleWordFinalize();
}

function scheduleLetterFinalize() {
  clearLetterTimer();

  const unit = getUnit();
  const tolerance = getTolerance();
  const waitMs = unit * tolerance.letterPauseFactor;

  finalizeLetterTimer = setTimeout(() => {
    finalizeCurrentLetter();
  }, waitMs);
}

function scheduleWordFinalize() {
  if (currentMode !== "word") return;

  clearWordTimer();

  const unit = getUnit();
  const tolerance = getTolerance();
  const waitMs = unit * tolerance.wordPauseFactor;

  finalizeWordTimer = setTimeout(() => {
    finalizeCurrentWord();
  }, waitMs);
}

function clearLetterTimer() {
  if (finalizeLetterTimer) {
    clearTimeout(finalizeLetterTimer);
    finalizeLetterTimer = null;
  }
}

function clearWordTimer() {
  if (finalizeWordTimer) {
    clearTimeout(finalizeWordTimer);
    finalizeWordTimer = null;
  }
}

function finalizeCurrentLetter() {
  if (!currentInputSymbols) return;

  const decoded = patternToLetter(currentInputSymbols);

  if (!decoded) {
    if (currentMode === "word") {
      stats.attempts += 1;
      setFeedback(
        `Die Folge ${currentInputSymbols} gehört zu keinem Buchstaben. Wort neu versuchen.`,
        "warning"
      );
      currentWordProgress = "";
      updateStats();
      resetCurrentInput();
      liveDecode.textContent = "…";
      return;
    }

    stats.attempts += 1;
    setFeedback(
      `Die Folge ${currentInputSymbols} gehört zu keinem Buchstaben. Versuche es noch einmal.`,
      "warning"
    );
    updateStats();
    resetCurrentInput();
    return;
  }

  if (currentMode === "letter") {
    evaluateLetterMode(decoded);
  } else {
    evaluateWordLetter(decoded);
  }

  currentInputSymbols = "";
  livePattern.textContent = "–";
}

function evaluateLetterMode(decoded) {
  stats.attempts += 1;

  if (decoded === currentTarget) {
    stats.correct += 1;
    setFeedback(`Richtig! ${currentTarget} = ${MORSE_MAP[currentTarget]}`, "success");
  } else {
    setFeedback(
      `Nicht richtig. Du hast ${decoded} gemorst. Gesucht war ${currentTarget}.`,
      "error"
    );
  }

  updateStats();
  liveDecode.textContent = decoded;
}

function evaluateWordLetter(decoded) {
  currentWordProgress += decoded;
  liveDecode.textContent = currentWordProgress;

  if (!currentTarget.startsWith(currentWordProgress)) {
    stats.attempts += 1;
    setFeedback(
      `Falsch begonnen: ${currentWordProgress}. Gesucht ist ${currentTarget}. Wort neu versuchen.`,
      "error"
    );
    currentWordProgress = "";
    updateStats();
    liveDecode.textContent = "…";
    clearWordTimer();
    return;
  }

  if (currentWordProgress === currentTarget) {
    finalizeCurrentWord(true);
    return;
  }

  setFeedback(`Gut. Bisher: ${currentWordProgress}`, "neutral");
}

function finalizeCurrentWord(forceComplete = false) {
  if (currentMode !== "word") return;

  clearWordTimer();

  if (!currentWordProgress) return;

  stats.attempts += 1;

  if (currentWordProgress === currentTarget && forceComplete) {
    stats.correct += 1;
    setFeedback(`Richtig! Das Wort lautet ${currentTarget}.`, "success");
    updateStats();
    currentWordProgress = "";
    pickNextTarget();
    return;
  }

  if (currentWordProgress === currentTarget) {
    stats.correct += 1;
    setFeedback(`Richtig! Das Wort lautet ${currentTarget}.`, "success");
  } else {
    setFeedback(
      `Wortende erkannt. Du hast ${currentWordProgress} gemorst. Gesucht war ${currentTarget}.`,
      "error"
    );
  }

  updateStats();
  currentWordProgress = "";
  pickNextTarget();
}

// ---------------------------------
// Zielauswahl
// ---------------------------------
function pickNextTarget() {
  if (currentMode === "letter") {
    if (!selectedLetters.length) return;

    let next = currentTarget;

    if (selectedLetters.length === 1) {
      next = selectedLetters[0];
    } else {
      while (next === currentTarget) {
        next = selectedLetters[Math.floor(Math.random() * selectedLetters.length)];
      }
    }

    currentTarget = next;
    targetLetterEl.textContent = currentTarget;
    if (selectedLettersInfo) {
      selectedLettersInfo.textContent = `Ausgewählte Buchstaben: ${selectedLetters.join(", ")}`;
    }
  } else {
    let next = currentTarget;

    if (WORDS.length === 1) {
      next = WORDS[0];
    } else {
      while (next === currentTarget) {
        next = WORDS[Math.floor(Math.random() * WORDS.length)];
      }
    }

    currentTarget = next;
    targetLetterEl.textContent = currentTarget;
    if (selectedLettersInfo) {
      selectedLettersInfo.textContent = "Modus: Ganze Wörter üben";
    }
  }

  currentWordProgress = "";
  resetCurrentInput();
  setFeedback("Noch keine Eingabe.", "neutral");
}

// ---------------------------------
// Trainingsstart / Ende
// ---------------------------------
function startTraining() {
  updateSelectedLettersFromUI();

  if (currentMode === "letter" && !selectedLetters.length) {
    alert("Bitte wähle mindestens einen Buchstaben aus.");
    return;
  }

  startScreen.classList.add("hidden");
  trainingScreen.classList.remove("hidden");

  stats = { correct: 0, attempts: 0 };
  updateStats();

  pickNextTarget();
  ensureAudio();
}

function goBackToStart() {
  stopTone();
  clearLetterTimer();
  clearWordTimer();

  currentWordProgress = "";
  resetCurrentInput();

  startScreen.classList.remove("hidden");
  trainingScreen.classList.add("hidden");
}

// ---------------------------------
// Events
// ---------------------------------
function setupEventListeners() {
  unitSlider.addEventListener("input", updateLabels);
  freqSlider.addEventListener("input", updateLabels);
  toleranceSlider.addEventListener("input", updateLabels);

  startBtn.addEventListener("click", startTraining);
  backBtn.addEventListener("click", goBackToStart);

  playBtn.addEventListener("click", playTarget);
  nextBtn.addEventListener("click", () => {
    currentWordProgress = "";
    pickNextTarget();
  });

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  morseKey.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handlePressStart();
  });

  morseKey.addEventListener("pointerup", (e) => {
    e.preventDefault();
    handlePressEnd();
  });

  morseKey.addEventListener("pointerleave", () => {
    if (isPressing) handlePressEnd();
  });

  morseKey.addEventListener("pointercancel", () => {
    if (isPressing) handlePressEnd();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!trainingScreen.classList.contains("hidden") && !e.repeat) {
        handlePressStart();
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!trainingScreen.classList.contains("hidden")) {
        handlePressEnd();
      }
    }
  });

  window.addEventListener("blur", () => {
    if (isPressing) handlePressEnd();
  });
}

init();
