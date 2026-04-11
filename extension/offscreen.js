// ── AccessAI Voice Launcher — Offscreen Script ───────────────────────────────
// This runs in a hidden offscreen page which CAN use the microphone
// and the Web Speech API (service workers cannot do either).

let recognition = null;
let restartTimer = null;

function initRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error("AccessAI: SpeechRecognition not supported in this browser");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;       // keep listening, don't stop after one phrase
  recognition.interimResults = false;  // only fire on final results
  recognition.lang = "en-US";
  recognition.maxAlternatives = 3;     // check top 3 guesses for the trigger phrase

  recognition.onstart = () => {
    console.log("AccessAI: Listening for 'Open AccessAI'...");
    chrome.runtime.sendMessage({ type: "LISTENING_STATUS", active: true });
  };

  recognition.onresult = (event) => {
    // Check all alternatives for this result
    const result = event.results[event.results.length - 1];
    for (let i = 0; i < result.length; i++) {
      const transcript = result[i].transcript;
      const confidence = result[i].confidence;

      console.log(`AccessAI heard [${confidence.toFixed(2)}]: "${transcript}"`);

      // Send to background.js for command matching
      chrome.runtime.sendMessage({
        type: "VOICE_RESULT",
        transcript: transcript,
        confidence: confidence,
      });
    }
  };

  recognition.onerror = (event) => {
    console.warn("AccessAI speech error:", event.error);

    // "no-speech" is normal when room is quiet — restart immediately
    // "not-allowed" means mic permission denied — don't retry
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      console.error("AccessAI: Microphone permission denied. Please allow mic access.");
      chrome.runtime.sendMessage({ type: "LISTENING_STATUS", active: false });
      return;
    }

    // For all other errors, restart after short delay
    scheduleRestart(1000);
  };

  recognition.onend = () => {
    // SpeechRecognition stops automatically after silence — restart it
    console.log("AccessAI: Recognition ended, restarting...");
    scheduleRestart(500);
  };
}

function scheduleRestart(delayMs) {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    try {
      recognition.start();
    } catch (e) {
      // Already started — ignore
    }
  }, delayMs);
}

function startListening() {
  if (!recognition) {
    initRecognition();
  }
  try {
    recognition.start();
  } catch (e) {
    // Already running
  }
}

function stopListening() {
  clearTimeout(restartTimer);
  if (recognition) {
    recognition.stop();
  }
  chrome.runtime.sendMessage({ type: "LISTENING_STATUS", active: false });
}

// ── Handle messages from background.js ───────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "START_LISTENING") startListening();
  if (msg.type === "STOP_LISTENING")  stopListening();
});

// Auto-start when this offscreen page loads
startListening();
