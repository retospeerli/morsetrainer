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

let selectedLetters = ["E", "T", "I", "A", "N", "M"];
let currentTarget = "E";

let stats = {
  correct: 0,
  attempts: 0
};

let audioCtx = null;
let oscillator = null;
let gainNode = null;

let isPressing = false;
let pressStartTime = 0;
let releaseTime = 0;
let finalizeTimer = null;

let currentInputSymbols = "";

const toleranceSettings = [
  { name: "streng", dotMaxFactor: 1.8, dashMinFactor: 1.8, letterPauseFactor: 2.6 },
  { name: "mittel", dotMaxFactor: 2.2, dashMinFactor: 2.2, letterPauseFactor: 2.8 },
  { name: "grosszügig", dotMaxFactor: 2.8, dashMinFactor: 2.0, letterPauseFactor: 3.2 }
];

function buildLetterSelection() {
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

function getUnit() {
  return Number(unitSlider.value);
}

function getFrequency() {
  return Number(freqSlider.value);
}

function getTolerance() {
  return toleranceSettings[Number(toleranceSlider.value)];
}

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
    } catch (e) {
      // no-op
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

async function playTarget() {
  ensureAudio();

  const pattern = MORSE_MAP[currentTarget];
  if (!pattern) return;

  playBtn.disabled = true;
  nextBtn.disabled = true;
  morseKey.disabled = true;

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

  await sleep(unit * 3);

  playBtn.disabled = false;
  nextBtn.disabled = false;
  morseKey.disabled = false;
}

function pickNextTarget() {
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

  resetCurrentInput();
  setFeedback("Noch keine Eingabe.", "neutral");
}

function resetCurrentInput() {
  currentInputSymbols = "";
  livePattern.textContent = "–";
  liveDecode.textContent = "…";

  if (finalizeTimer) {
    clearTimeout(finalizeTimer);
    finalizeTimer = null;
  }
}

function setFeedback(text, type = "neutral") {
  feedback.textContent = text;
  feedback.className = `feedback ${type}`;
}

function patternToLetter(pattern) {
  for (const [letter, morse] of Object.entries(MORSE_MAP)) {
    if (morse === pattern) return letter;
  }
  return null;
}

function updateLiveDisplay() {
  livePattern.textContent = currentInputSymbols || "–";
  const letter = patternToLetter(currentInputSymbols);
  liveDecode.textContent = letter ? letter : "…";
}

function handlePressStart() {
  if (isPressing) return;

  ensureAudio();

  if (finalizeTimer) {
    clearTimeout(finalizeTimer);
    finalizeTimer = null;
  }

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

  releaseTime = performance.now();

  const finalizeAfter = unit * tolerance.letterPauseFactor;

  finalizeTimer = setTimeout(() => {
    finalizeCurrentLetter();
  }, finalizeAfter);
}

function finalizeCurrentLetter() {
  if (!currentInputSymbols) return;

  const decoded = patternToLetter(currentInputSymbols);
  stats.attempts += 1;

  if (!decoded) {
    setFeedback(
      `Die Folge ${currentInputSymbols} gehört zu keinem Buchstaben. Versuche es noch einmal.`,
      "warning"
    );
  } else if (decoded === currentTarget) {
    stats.correct += 1;
    setFeedback(
      `Richtig! ${currentTarget} = ${MORSE_MAP[currentTarget]}`,
      "success"
    );
  } else {
    setFeedback(
      `Nicht richtig. Du hast ${decoded} gemorst. Gesucht war ${currentTarget}.`,
      "error"
    );
  }

  updateStats();
  currentInputSymbols = "";
  updateLiveDisplay();
}

function updateStats() {
  correctCountEl.textContent = stats.correct;
  attemptCountEl.textContent = stats.attempts;

  const accuracy =
    stats.attempts === 0 ? 0 : Math.round((stats.correct / stats.attempts) * 100);

  accuracyEl.textContent = `${accuracy}%`;
}

function startTraining() {
  updateSelectedLettersFromUI();

  if (!selectedLetters.length) {
    alert("Bitte wähle mindestens einen Buchstaben aus.");
    return;
  }

  startScreen.classList.add("hidden");
  trainingScreen.classList.remove("hidden");

  selectedLettersInfo.textContent = `Ausgewählte Buchstaben: ${selectedLetters.join(", ")}`;

  stats = { correct: 0, attempts: 0 };
  updateStats();

  currentTarget = selectedLetters[Math.floor(Math.random() * selectedLetters.length)];
  targetLetterEl.textContent = currentTarget;
  resetCurrentInput();
  setFeedback("Noch keine Eingabe.", "neutral");

  ensureAudio();
}

function goBackToStart() {
  stopTone();
  resetCurrentInput();
  startScreen.classList.remove("hidden");
  trainingScreen.classList.add("hidden");
}

function setupEventListeners() {
  unitSlider.addEventListener("input", updateLabels);
  freqSlider.addEventListener("input", updateLabels);
  toleranceSlider.addEventListener("input", updateLabels);

  startBtn.addEventListener("click", startTraining);
  backBtn.addEventListener("click", goBackToStart);

  playBtn.addEventListener("click", playTarget);
  nextBtn.addEventListener("click", pickNextTarget);

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
      if (!trainingScreen.classList.contains("hidden")) {
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

function init() {
  buildLetterSelection();
  updateLabels();
  updateStats();
  setupEventListeners();
}

init();
