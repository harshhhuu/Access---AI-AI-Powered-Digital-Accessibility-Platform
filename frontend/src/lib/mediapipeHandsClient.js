/**
 * Single shared MediaPipe Hands instance for the app session.
 *
 * @mediapipe/hands loads Emscripten WASM via injected <script> tags and global
 * factories. Initializing twice in quick succession (e.g. React Strict Mode)
 * triggers: "Module.arguments has been replaced with plain arguments_".
 *
 * See: https://github.com/google-ai-edge/mediapipe/issues/3807
 */

let initPromise = null;
let handsSingleton = null;

export function getMediapipeHandsInstance() {
  return handsSingleton;
}

/**
 * Returns the one shared Hands instance, creating it on first call.
 * Do not call `.close()` on unmount; reuse for the SPA session.
 */
export function ensureMediapipeHands() {
  if (handsSingleton) {
    return Promise.resolve(handsSingleton);
  }
  if (!initPromise) {
    initPromise = (async () => {
      const { Hands, VERSION } = await import("@mediapipe/hands");
      const locateFile = (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${VERSION}/${file}`;

      const hands = new Hands({ locateFile });
      await hands.initialize();
      handsSingleton = hands;
      return hands;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
