// =====================================
// MORSE-LERNAPP
// komplette app.js
// =====================================

// -------------------------------------
// Morse-Zuordnung
// -------------------------------------
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

// -------------------------------------
// DOM
// -------------------------------------
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

// -------------------------------------
// Zustand
// -------------------------------------
let selectedLetters = ["E", "T", "I", "A", "N", "M"];

let mainMode = "letter"; // letter | word_morse | word_audio_text
let wordMorseDisplayMode = "immediate"; // immediate | hidden

let currentTarget = "E";

let currentInputSymbols = "";
let currentWordLetters = [];
let currentLetterIndex = 0;

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

// dynamisch erzeugte UI
let injectedUI = {
  modeBox: null,
  wordActionRow: null,
  finishWordBtn: null,
  clearWordBtn: null,
  textInputWrap: null,
  textAnswerInput: null,
  textCheckBtn: null,
  textRevealBtn: null
};

const toleranceSettings = [
  { name: "streng", dotMaxFactor: 1.8, letterPauseFactor: 2.6 },
  { name: "mittel", dotMaxFactor: 2.2, letterPauseFactor: 3.0 },
  { name: "grosszügig", dotMaxFactor: 2.8, letterPauseFactor: 3.6 }
];

// -------------------------------------
// Initialisierung
// -------------------------------------
function init() {
  buildLetterSelection();
  injectExtraUI();
  updateLabels();
  updateStats();
  updateModeUI();
  setupEventListeners();
}

function injectExtraUI() {
  injectModeSelector();
  injectWordButtons();
  injectTextInputArea();
}

function injectModeSelector() {
  const settingsCard = startBtn.closest(".card");
  if (!settingsCard) return;

  const box = document.createElement("div");
  box.className = "info-box";
  box.style.marginBottom = "18px";
  box.innerHTML = `
    <p><strong>Modus:</strong></p>

    <label style="display:block; margin:6px 0;">
      <input type="radio" name="mainMode" value="letter" checked>
      Buchstaben üben
    </label>

    <label style="display:block; margin:6px 0;">
      <input type="radio" name="mainMode" value="word_morse">
      Wort sehen und morsen
    </label>

    <label style="display:block; margin:6px 0;">
      <input type="radio" name="mainMode" value="word_audio_text">
      Morse hören und Wort schreiben
    </label>

    <hr style="margin:12px 0; border:none; border-top:1px solid #d7deea;">

    <p><strong>Anzeige bei Wort sehen und morsen:</strong></p>

    <label style="display:block; margin:6px 0;">
      <input type="radio" name="wordDisplayMode" value="immediate" checked>
      Buchstaben sofort anzeigen
    </label>

    <label style="display:block; margin:6px 0;">
      <input type="radio" name="wordDisplayMode" value="hidden">
      Buchstaben erst nach Überprüfung anzeigen
    </label>
  `;

  const firstInfoBox = settingsCard.querySelector(".info-box");
  if (firstInfoBox) {
    settingsCard.insertBefore(box, firstInfoBox);
  } else {
    settingsCard.insertBefore(box, startBtn);
  }

  box.querySelectorAll('input[name="mainMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        mainMode = radio.value;
        updateModeUI();
      }
    });
  });

  box.querySelectorAll('input[name="wordDisplayMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        wordMorseDisplayMode = radio.value;
        updateModeUI();
      }
    });
  });

  injectedUI.modeBox = box;
}

function injectWordButtons() {
  const inputCard = livePattern.closest(".card");
  if (!inputCard) return;

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";
  row.style.flexWrap = "wrap";
  row.style.marginTop = "14px";

  const finishBtn = document.createElement("button");
  finishBtn.type = "button";
  finishBtn.className = "secondary-btn";
  finishBtn.textContent = "Wort prüfen";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "ghost-btn";
  clearBtn.textContent = "Wort löschen";

  row.appendChild(finishBtn);
  row.appendChild(clearBtn);
  inputCard.appendChild(row);

  finishBtn.addEventListener("click", finishWordMorseAttempt);
  clearBtn.addEventListener("click", resetWordMorseAttempt);

  injectedUI.wordActionRow = row;
  injectedUI.finishWordBtn = finishBtn;
  injectedUI.clearWordBtn = clearBtn;
}

function injectTextInputArea() {
  const inputCard = livePattern.closest(".card");
  if (!inputCard) return;

  const wrap = document.createElement("div");
  wrap.style.marginTop = "16px";

  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = "Wort in Klarschrift schreiben";
  input.style.width = "100%";
  input.style.padding = "14px";
  input.style.fontSize = "1.2rem";
  input.style.borderRadius = "14px";
  input.style.border = "2px solid #d7deea";
  input.style.marginBottom = "10px";
  input.style.textTransform = "uppercase";

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "10px";
  btnRow.style.flexWrap = "wrap";

  const checkBtn = document.createElement("button");
  checkBtn.type = "button";
  checkBtn.className = "secondary-btn";
  checkBtn.textContent = "Antwort prüfen";

  const revealBtn = document.createElement("button");
  revealBtn.type = "button";
  revealBtn.className = "ghost-btn";
  revealBtn.textContent = "Lösung zeigen";

  btnRow.appendChild(checkBtn);
  btnRow.appendChild(revealBtn);

  wrap.appendChild(input);
  wrap.appendChild(btnRow);
  inputCard.appendChild(wrap);

  checkBtn.addEventListener("click", checkTextAnswer);
  revealBtn.addEventListener("click", revealTextAnswer);

  injectedUI.textInputWrap = wrap;
  injectedUI.textAnswerInput = input;
  injectedUI.textCheckBtn = checkBtn;
  injectedUI.textRevealBtn = revealBtn;
}

// -------------------------------------
// UI-Helfer
// -------------------------------------
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
  const checked = [...letterSelection.querySelectorAll('input[type="checkbox"]:checked')]
    .map((cb) => cb.value);
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
  [...letterSelection.querySelectorAll('input[type="checkbox"]')].forEach((cb) => {
    cb.checked = selectedLetters.includes(cb.value);
  });
}

function updateLabels() {
  unitLabel.textContent = `${unitSlider.value} ms`;
  freqLabel.textContent = `${freqSlider.value} Hz`;
  toleranceLabel.textContent = toleranceSettings[Number(toleranceSlider.value)].name;
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

function getUnit() {
  return Number(unitSlider.value);
}

function getFrequency() {
  return Number(freqSlider.value);
}

function getTolerance() {
  return toleranceSettings[Number(toleranceSlider.value)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function patternToLetter(pattern) {
  for (const [letter, morse] of Object.entries(MORSE_MAP)) {
    if (morse === pattern) return letter;
  }
  return null;
}

function clearLetterTimer() {
  if (finalizeLetterTimer) {
    clearTimeout(finalizeLetterTimer);
    finalizeLetterTimer = null;
  }
}

function updateModeUI() {
  const letterCard = letterSelection.closest(".card");

  const isLetterMode = mainMode === "letter";
  const isWordMorseMode = mainMode === "word_morse";
  const isWordAudioTextMode = mainMode === "word_audio_text";

  if (letterCard) {
    letterCard.style.opacity = isLetterMode ? "1" : "0.45";
    letterCard.style.pointerEvents = isLetterMode ? "auto" : "none";
  }

  if (injectedUI.wordActionRow) {
    injectedUI.wordActionRow.style.display = isWordMorseMode ? "flex" : "none";
  }

  if (injectedUI.textInputWrap) {
    injectedUI.textInputWrap.style.display = isWordAudioTextMode ? "block" : "none";
  }

  morseKey.style.display = isWordAudioTextMode ? "none" : "";
  livePattern.style.display = isWordAudioTextMode ? "none" : "";
  liveDecode.style.display = isWordAudioTextMode ? "none" : "";

  toleranceSlider.disabled = isWordAudioTextMode ? true : false;
  toleranceSlider.style.opacity = isWordAudioTextMode ? "0.5" : "1";

  if (isLetterMode) {
    selectedLettersInfo.textContent = `Ausgewählte Buchstaben: ${selectedLetters.join(", ")}`;
  } else if (isWordMorseMode) {
    selectedLettersInfo.textContent =
      wordMorseDisplayMode === "immediate"
        ? "Modus: Wort sehen und morsen – Buchstaben sofort sichtbar"
        : "Modus: Wort sehen und morsen – Anzeige erst nach Überprüfung";
  } else {
    selectedLettersInfo.textContent = "Modus: Morse hören und Wort in Klarschrift schreiben";
  }
}

function updateTargetDisplay() {
  if (mainMode === "letter") {
    targetLetterEl.textContent = currentTarget;
    return;
  }

  if (mainMode === "word_morse") {
    targetLetterEl.textContent = currentTarget;
    return;
  }

  if (mainMode === "word_audio_text") {
    targetLetterEl.textContent = "???";
  }
}

function resetLetterInput() {
  currentInputSymbols = "";
  livePattern.textContent = "–";
}

function resetWordMorseAttempt() {
  currentWordLetters = [];
  currentLetterIndex = 0;
  currentInputSymbols = "";
  livePattern.textContent = "–";

  if (wordMorseDisplayMode === "immediate") {
    liveDecode.textContent = "";
  } else {
    liveDecode.textContent = "••••";
  }

  setFeedback("Worteingabe gelöscht.", "neutral");
}

function setupWordMorseDisplay() {
  currentWordLetters = [];
  currentLetterIndex = 0;
  currentInputSymbols = "";
  livePattern.textContent = "–";

  if (wordMorseDisplayMode === "immediate") {
    liveDecode.textContent = "";
  } else {
    liveDecode.textContent = "••••";
  }
}

function updateImmediateWordDisplay() {
  liveDecode.textContent = currentWordLetters.join("");
}

// -------------------------------------
// Audio
// -------------------------------------
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

async function playMorsePattern(pattern) {
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
  if (mainMode !== "word_audio_text") {
    morseKey.disabled = true;
  }
  if (injectedUI.textCheckBtn) injectedUI.textCheckBtn.disabled = true;
  if (injectedUI.textRevealBtn) injectedUI.textRevealBtn.disabled = true;

  const unit = getUnit();

  if (mainMode === "letter") {
    await playMorsePattern(MORSE_MAP[currentTarget]);
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

  await sleep(unit * 2);

  playBtn.disabled = false;
  nextBtn.disabled = false;
  if (mainMode !== "word_audio_text") {
    morseKey.disabled = false;
  }
  if (injectedUI.textCheckBtn) injectedUI.textCheckBtn.disabled = false;
  if (injectedUI.textRevealBtn) injectedUI.textRevealBtn.disabled = false;
}

// -------------------------------------
// Zielauswahl
// -------------------------------------
function pickNextTarget() {
  if (mainMode === "letter") {
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

    resetLetterInput();
    liveDecode.textContent = "…";
  } else {
    let next = currentTarget;
    while (next === currentTarget) {
      next = WORDS[Math.floor(Math.random() * WORDS.length)];
    }
    currentTarget = next;

    if (mainMode === "word_morse") {
      setupWordMorseDisplay();
    }

    if (mainMode === "word_audio_text" && injectedUI.textAnswerInput) {
      injectedUI.textAnswerInput.value = "";
    }
  }

  updateTargetDisplay();
  updateModeUI();
  setFeedback("Noch keine Eingabe.", "neutral");

  if (mainMode === "word_audio_text") {
    setTimeout(() => {
      playTarget();
    }, 250);
  }
}

// -------------------------------------
// Buchstabenmodus
// -------------------------------------
function finalizeLetterModeInput() {
  if (!currentInputSymbols) return;

  const decoded = patternToLetter(currentInputSymbols);
  const typedPattern = currentInputSymbols;

  currentInputSymbols = "";
  livePattern.textContent = "–";

  stats.attempts += 1;

  if (!decoded) {
    setFeedback(
      `Die Folge ${typedPattern} gehört zu keinem Buchstaben. Versuche es noch einmal.`,
      "warning"
    );
    liveDecode.textContent = "…";
    updateStats();
    return;
  }

  liveDecode.textContent = decoded;

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
}

// -------------------------------------
// Wort sehen und morsen
// -------------------------------------
function finalizeWordMorseLetter() {
  if (!currentInputSymbols) return;

  const decoded = patternToLetter(currentInputSymbols);
  const typedPattern = currentInputSymbols;

  currentInputSymbols = "";
  livePattern.textContent = "–";

  if (!decoded) {
    currentWordLetters.push("?");
    if (wordMorseDisplayMode === "immediate") {
      updateImmediateWordDisplay();
    }
    setFeedback(
      `Die Folge ${typedPattern} wurde als unbekannt gespeichert.`,
      "warning"
    );
    currentLetterIndex += 1;
    return;
  }

  currentWordLetters.push(decoded);
  currentLetterIndex += 1;

  if (wordMorseDisplayMode === "immediate") {
    updateImmediateWordDisplay();
  } else {
    liveDecode.textContent = "••••";
  }

  setFeedback(`Buchstabe ${currentLetterIndex} gespeichert: ${decoded}`, "neutral");
}

function finishWordMorseAttempt() {
  if (mainMode !== "word_morse") return;

  clearLetterTimer();

  if (currentInputSymbols) {
    finalizeWordMorseLetter();
  }

  const typedWord = currentWordLetters.join("");
  stats.attempts += 1;

  const resultMarkup = buildWordComparisonMarkup(currentTarget, typedWord);

  if (typedWord === currentTarget) {
    stats.correct += 1;
    setFeedback(`Richtig! Du hast das Wort ${currentTarget} korrekt gemorst.`, "success");
  } else {
    setFeedback(`Nicht ganz richtig. Fehler sind markiert.`, "error");
  }

  liveDecode.innerHTML = resultMarkup;
  updateStats();
}

function buildWordComparisonMarkup(target, typed) {
  const maxLen = Math.max(target.length, typed.length);
  let html = "";

  for (let i = 0; i < maxLen; i++) {
    const expected = target[i] || "";
    const actual = typed[i] || "∅";
    const isCorrect = expected === actual;

    const displayChar = actual === "" ? "∅" : actual;
    const title = expected ? `Soll: ${expected}` : "Zu viel";

    html += `
      <span
        style="
          display:inline-block;
          min-width:1.1em;
          margin:0 2px;
          padding:2px 4px;
          border-radius:6px;
          font-weight:800;
          background:${isCorrect ? "#dcfce7" : "#fee2e2"};
          color:${isCorrect ? "#166534" : "#991b1b"};
          border:1px solid ${isCorrect ? "#86efac" : "#fca5a5"};
        "
        title="${title}"
      >${escapeHtml(displayChar)}</span>
    `;
  }

  return html || "∅";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// -------------------------------------
// Morse hören und Wort schreiben
// -------------------------------------
function normalizeTextInput(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function checkTextAnswer() {
  if (mainMode !== "word_audio_text" || !injectedUI.textAnswerInput) return;

  const typed = normalizeTextInput(injectedUI.textAnswerInput.value);
  stats.attempts += 1;

  if (typed === currentTarget) {
    stats.correct += 1;
    targetLetterEl.textContent = currentTarget;
    setFeedback(`Richtig! Das gehörte Wort war ${currentTarget}.`, "success");
  } else {
    targetLetterEl.textContent = currentTarget;
    setFeedback(`Nicht richtig. Deine Antwort: ${typed || "∅"}. Lösung: ${currentTarget}.`, "error");
  }

  updateStats();
}

function revealTextAnswer() {
  if (mainMode !== "word_audio_text") return;

  targetLetterEl.textContent = currentTarget;
  setFeedback(`Lösung: ${currentTarget}`, "warning");
}

// -------------------------------------
// Morsetaste
// -------------------------------------
function handlePressStart() {
  if (isPressing) return;
  if (mainMode === "word_audio_text") return;

  ensureAudio();
  clearLetterTimer();

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
  livePattern.textContent = currentInputSymbols;

  const decoded = patternToLetter(currentInputSymbols);

  if (mainMode === "letter") {
    liveDecode.textContent = decoded || "…";
  } else if (mainMode === "word_morse") {
    if (wordMorseDisplayMode === "immediate") {
      liveDecode.textContent = (currentWordLetters.join("") + (decoded || ""));
    } else {
      liveDecode.textContent = "••••";
    }
  }

  const waitMs = unit * tolerance.letterPauseFactor;

  clearLetterTimer();
  finalizeLetterTimer = setTimeout(() => {
    if (mainMode === "letter") {
      finalizeLetterModeInput();
    } else if (mainMode === "word_morse") {
      finalizeWordMorseLetter();
    }
  }, waitMs);
}

// -------------------------------------
// Start / Zurück
// -------------------------------------
function startTraining() {
  updateSelectedLettersFromUI();

  if (mainMode === "letter" && !selectedLetters.length) {
    alert("Bitte wähle mindestens einen Buchstaben aus.");
    return;
  }

  stats = { correct: 0, attempts: 0 };
  updateStats();

  startScreen.classList.add("hidden");
  trainingScreen.classList.remove("hidden");

  pickNextTarget();
  ensureAudio();

  if (mainMode === "word_audio_text" && injectedUI.textAnswerInput) {
    setTimeout(() => injectedUI.textAnswerInput.focus(), 50);
  }
}

function goBackToStart() {
  stopTone();
  clearLetterTimer();

  isPressing = false;
  currentInputSymbols = "";
  currentWordLetters = [];
  currentLetterIndex = 0;

  startScreen.classList.remove("hidden");
  trainingScreen.classList.add("hidden");
}

// -------------------------------------
// Events
// -------------------------------------
function setupEventListeners() {
  unitSlider.addEventListener("input", updateLabels);
  freqSlider.addEventListener("input", updateLabels);
  toleranceSlider.addEventListener("input", updateLabels);

  startBtn.addEventListener("click", startTraining);
  backBtn.addEventListener("click", goBackToStart);

  playBtn.addEventListener("click", playTarget);
  nextBtn.addEventListener("click", () => {
    clearLetterTimer();
    currentInputSymbols = "";
    currentWordLetters = [];
    currentLetterIndex = 0;
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

    if (mainMode === "word_audio_text" && e.key === "Enter" && injectedUI.textAnswerInput) {
      if (document.activeElement === injectedUI.textAnswerInput) {
        e.preventDefault();
        checkTextAnswer();
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
