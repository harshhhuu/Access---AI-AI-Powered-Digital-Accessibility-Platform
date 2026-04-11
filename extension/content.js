// ── AccessAI Voice Launcher — Content Script ─────────────────────────────────
// Runs inside every webpage tab — this is where SpeechRecognition actually works.
// Listens continuously for "Open AccessAI" trigger phrase.

(function () {
  // Don't run multiple times in same tab
  if (window.__accessAIListening) return;
  window.__accessAIListening = true;

  const TRIGGERS = [
    "open accessai",
    "open access ai",
    "launch accessai",
    "launch access ai",
    "start accessai",
    "start access ai",
    "accessai",
    "access ai",
  ];

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("AccessAI: SpeechRecognition not supported");
    return;
  }

  let recognition;
  let restarting = false;

  function createRecognition() {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // interim helps catch phrase faster
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Check both interim and final results
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim();
          console.log("AccessAI heard:", transcript);

          const matched = TRIGGERS.some((t) => transcript.includes(t));
          if (matched) {
            console.log("✅ AccessAI trigger matched:", transcript);
            // Tell background to open the tab
            chrome.runtime.sendMessage({ type: "OPEN_ACCESSAI" });
            return;
          }
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        console.error("AccessAI: Mic permission denied");
        return;
      }
      // All other errors — restart
      scheduleRestart();
    };

    recognition.onend = () => {
      scheduleRestart();
    };
  }

  function scheduleRestart() {
    if (restarting) return;
    restarting = true;
    setTimeout(() => {
      restarting = false;
      try {
        recognition.start();
      } catch (e) {
        // already started
      }
    }, 300);
  }

  function start() {
    createRecognition();
    try {
      recognition.start();
      console.log("✅ AccessAI: Listening for voice command...");
    } catch (e) {
      scheduleRestart();
    }
  }

  // Start listening
  start();
})();
