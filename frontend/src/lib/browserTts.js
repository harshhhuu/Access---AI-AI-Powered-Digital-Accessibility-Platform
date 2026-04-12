/**
 * Web Speech API TTS with Safari/WebKit-friendly voice loading and Chrome resume.
 * Without this, speak() can be a no-op on Safari or stay silent when the queue is paused.
 */
export function speakBrowserTts(text, options = {}) {
  const { rate = 1 } = options;
  if (typeof window === "undefined" || !window.speechSynthesis || !text?.trim()) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.rate = rate;

  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    try {
      window.speechSynthesis.resume();
    } catch {
      /* ignore */
    }
    window.speechSynthesis.speak(utterance);
  };

  // Some engines (notably Safari) populate voices asynchronously.
  window.speechSynthesis.getVoices();
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    const onVoices = () => run();
    window.speechSynthesis.addEventListener("voiceschanged", onVoices, { once: true });
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      run();
    }, 400);
  } else {
    run();
  }
}
