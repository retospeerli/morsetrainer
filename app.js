const MORSE_MAP = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".",
  F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---",
  P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--",
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

const morseInputArea = document.getElementById("morseInputArea");
const textInputArea = document.getElementById("textInputArea");
const textAnswerInput = document.getElementById("textAnswerInput");
const textCheckBtn = document.getElementById("textCheckBtn");
const textRevealBtn = document.getElementById("textRevealBtn");

const finishWordBtn = document.getElementById("finishWordBtn");
const clearWordBtn = document.getElementById("clearWordBtn");
const wordActionRow = document.getElementById("wordActionRow");

const chooseKeyBtn = document.getElementById("chooseKeyBtn");
const currentKeyLabel = document.getElementById("currentKeyLabel");
const currentKeyLabel2 = document.getElementById("currentKeyLabel2");

let selectedLetters = ["E", "T", "I", "A", "N", "M"];

let mainMode = "letter";
let wordMorseDisplayMode = "immediate";

let currentTarget = "E";

let currentInputSymbols = "";
let currentWordLetters = [];
let currentLetterIndex = 0;

let morseKeyCode = "Space";
let morseKeyLabel = "Leertaste";
let waitingForKeyChoice = false;

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

const toleranceSettings = [
  { name: "streng", dotMaxFactor: 1.8, letterPauseFactor: 2.6 },
  { name: "mittel", dotMaxFactor: 2.2, letterPauseFactor: 3.0 },
  { name: "grosszügig", dotMaxFactor: 2.8, letterPauseFactor: 3.6 }
];

function init() {
  buildLetterSelection();
  updateLabels();
  updateStats();
  updateMorseKeyLabels();
  updateModeUI();
  setupEventListeners();
}

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
  selectedLetters = [...letterSelection.querySelectorAll('input[type="checkbox"]:checked')]
    .map((cb) => cb.value);
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

function updateMorseKeyLabels(customText) {
  const text = customText || morseKeyLabel;
  currentKeyLabel.textContent = text;
  currentKeyLabel2.textContent = text;
}

function getReadableKeyName(e) {
  if (e.code === "Space") return "Leertaste";
  if (e.code.startsWith("Key")) return e.code.replace("Key", "");
  if (e.code.startsWith("Digit")) return e.code.replace("Digit", "");
  if (e.code.startsWith("Numpad")) return "Num " + e.code.replace("Numpad", "");
  if (e.key && e.key.length === 1) return e.key.toUpperCase();
  return e.key || e.code;
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

  letterCard.style.opacity = isLetterMode ? "1" : "0.45";
  letterCard.style.pointerEvents = isLetterMode ? "auto" : "none";

  wordActionRow.style.display = isWordMorseMode ? "flex" : "none";
  textInputArea.classList.toggle("hidden", !isWordAudioTextMode);
  morseInputArea.classList.toggle("hidden", isWordAudioTextMode);

  toleranceSlider.disabled = isWordAudioTextMode;
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
  } else if (mainMode === "word_morse") {
    targetLetterEl.textContent = currentTarget;
  } else {
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
  morseKey.disabled = true;
  textCheckBtn.disabled = true;
  textRevealBtn.disabled = true;

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
  morseKey.disabled = false;
  textCheckBtn.disabled = false;
  textRevealBtn.disabled = false;
}

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

    if (mainMode === "word_audio_text") {
      textAnswerInput.value = "";
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
    setFeedback(`Die Folge ${typedPattern} wurde als unbekannt gespeichert.`, "warning");
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
    setFeedback("Nicht ganz richtig. Fehler sind markiert.", "error");
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
      >${escapeHtml(actual)}</span>
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

function normalizeTextInput(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function checkTextAnswer() {
  if (mainMode !== "word_audio_text") return;

  const typed = normalizeTextInput(textAnswerInput.value);
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
  if (mainMode === "word_audio_text") return;

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
      liveDecode.textContent = currentWordLetters.join("") + (decoded || "");
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

  if (mainMode === "word_audio_text") {
    setTimeout(() => textAnswerInput.focus(), 50);
  }
}

function goBackToStart() {
  stopTone();
  clearLetterTimer();

  isPressing = false;
  waitingForKeyChoice = false;
  currentInputSymbols = "";
  currentWordLetters = [];
  currentLetterIndex = 0;

  updateMorseKeyLabels();

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
  nextBtn.addEventListener("click", () => {
    clearLetterTimer();
    currentInputSymbols = "";
    currentWordLetters = [];
    currentLetterIndex = 0;
    pickNextTarget();
  });

  finishWordBtn.addEventListener("click", finishWordMorseAttempt);
  clearWordBtn.addEventListener("click", resetWordMorseAttempt);

  textCheckBtn.addEventListener("click", checkTextAnswer);
  textRevealBtn.addEventListener("click", revealTextAnswer);

  textAnswerInput.addEventListener("keydown", (e) => {
    if (mainMode === "word_audio_text" && e.key === "Enter") {
      e.preventDefault();
      checkTextAnswer();
    }
  });

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  document.querySelectorAll('input[name="mainMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        mainMode = radio.value;
        updateModeUI();
      }
    });
  });

  document.querySelectorAll('input[name="wordDisplayMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        wordMorseDisplayMode = radio.value;
        updateModeUI();
      }
    });
  });

  chooseKeyBtn.addEventListener("click", () => {
    waitingForKeyChoice = true;
    updateMorseKeyLabels("nächste Taste drücken ...");
    setFeedback("Drücke jetzt die Taste, die als Morsetaste dienen soll.", "neutral");
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
    if (waitingForKeyChoice) {
      e.preventDefault();

      morseKeyCode = e.code;
      morseKeyLabel = getReadableKeyName(e);
      waitingForKeyChoice = false;

      updateMorseKeyLabels();
      setFeedback(`Morsetaste festgelegt: ${morseKeyLabel}`, "success");
      return;
    }

    if (mainMode === "word_audio_text") return;

    if (e.code === morseKeyCode) {
      e.preventDefault();

      if (!trainingScreen.classList.contains("hidden") && !e.repeat) {
        handlePressStart();
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    if (mainMode === "word_audio_text") return;

    if (e.code === morseKeyCode) {
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
