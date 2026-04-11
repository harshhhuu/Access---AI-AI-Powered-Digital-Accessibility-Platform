// ── AccessAI Voice Launcher — Background Service Worker ──────────────────────

const ACCESSAI_URL = "http://localhost:5173"; // ← change to Vercel URL after deploy

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "OPEN_ACCESSAI") {
    openAccessAI();
  }
  if (msg.type === "GET_URL") {
    return true; // keep channel open for response
  }
});

async function openAccessAI() {
  // If tab already open, focus it. Otherwise open new tab.
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(t => t.url && t.url.startsWith(ACCESSAI_URL));

  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: ACCESSAI_URL });
  }
}
