import { createContext, useContext, useEffect, useState } from "react";

const AccessibilityContext = createContext(null);

const SETTINGS_STORAGE_KEY = "accessai_settings_v2";
const PROFILES_STORAGE_KEY = "accessai_profiles_v1";

const DEFAULT_SETTINGS = {
  fontSize: 16,
  highContrast: false,
  priyaMode: false,
  signActive: false,
  ttsSpeed: 1,
  hoverMode: false,
  colourBlind: "none",
};

const BUILT_IN_PROFILES = [
  {
    id: "low-vision",
    name: "Low Vision",
    description: "Large text, strong contrast, and hover descriptions for visual support.",
    settings: {
      fontSize: 24,
      highContrast: true,
      priyaMode: false,
      signActive: false,
      ttsSpeed: 1,
      hoverMode: true,
      colourBlind: "none",
    },
  },
  {
    id: "dyslexia-support",
    name: "Dyslexia Support",
    description: "Moderately larger text with a calm color setup and slower read-aloud speed.",
    settings: {
      fontSize: 20,
      highContrast: false,
      priyaMode: false,
      signActive: false,
      ttsSpeed: 0.5,
      hoverMode: false,
      colourBlind: "none",
    },
  },
  {
    id: "calm-focus",
    name: "Calm Focus",
    description: "Balanced text size and quieter settings for concentration-heavy tasks.",
    settings: {
      fontSize: 18,
      highContrast: false,
      priyaMode: false,
      signActive: false,
      ttsSpeed: 1,
      hoverMode: false,
      colourBlind: "deuteranopia",
    },
  },
];

function clampFontSize(value) {
  return Math.max(14, Math.min(28, Number(value) || DEFAULT_SETTINGS.fontSize));
}

function normaliseTtsSpeed(value) {
  const parsed = Number(value);
  return [0.5, 1, 1.5].includes(parsed) ? parsed : DEFAULT_SETTINGS.ttsSpeed;
}

function normaliseColourBlind(value) {
  return ["none", "protanopia", "deuteranopia"].includes(value)
    ? value
    : DEFAULT_SETTINGS.colourBlind;
}

function sanitiseSettings(input = {}) {
  return {
    fontSize: clampFontSize(input.fontSize),
    highContrast: Boolean(input.highContrast),
    priyaMode: Boolean(input.priyaMode),
    signActive: Boolean(input.signActive),
    ttsSpeed: normaliseTtsSpeed(input.ttsSpeed),
    hoverMode: Boolean(input.hoverMode),
    colourBlind: normaliseColourBlind(input.colourBlind),
  };
}

function readStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function sanitiseProfiles(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((profile) => ({
      id: String(profile?.id || `${Date.now()}-${Math.random()}`),
      name: String(profile?.name || "Saved Profile").trim(),
      description: String(profile?.description || "Custom accessibility setup.").trim(),
      createdAt: String(profile?.createdAt || new Date().toISOString()),
      settings: sanitiseSettings(profile?.settings || {}),
    }))
    .filter((profile) => profile.name);
}

export function AccessibilityProvider({ children }) {
  const storedSettings = sanitiseSettings(readStorage(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));

  const [fontSize, setFontSize] = useState(storedSettings.fontSize);
  const [highContrast, setHighContrast] = useState(storedSettings.highContrast);
  const [priyaMode, setPriyaMode] = useState(storedSettings.priyaMode);
  const [signActive, setSignActive] = useState(storedSettings.signActive);
  const [ttsSpeed, setTtsSpeed] = useState(storedSettings.ttsSpeed);
  const [hoverMode, setHoverMode] = useState(storedSettings.hoverMode);
  const [colourBlind, setColourBlind] = useState(storedSettings.colourBlind);
  const [savedProfiles, setSavedProfiles] = useState(() =>
    sanitiseProfiles(readStorage(PROFILES_STORAGE_KEY, []))
  );

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--font-size-base", `${fontSize}px`);
    document.documentElement.style.fontSize = `${fontSize}px`;

    root.style.setProperty("--bg-primary", highContrast ? "#000000" : "#ffffff");
    root.style.setProperty("--text-primary", highContrast ? "#ffffff" : "#0f172a");
    root.style.setProperty("--text-secondary", highContrast ? "#facc15" : "#64748b");
    root.style.setProperty("--border-color", highContrast ? "#ffffff" : "#e2e8f0");
    root.style.setProperty("--card-bg", highContrast ? "#1a1a1a" : "#f8fafc");

    const filters = {
      none: "none",
      protanopia: "url(#protanopia)",
      deuteranopia: "url(#deuteranopia)",
    };

    document.body.style.filter = filters[colourBlind] || "none";
    document.body.classList.toggle("high-contrast", highContrast);

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        fontSize,
        highContrast,
        priyaMode,
        signActive,
        ttsSpeed,
        hoverMode,
        colourBlind,
      })
    );
  }, [fontSize, highContrast, priyaMode, signActive, ttsSpeed, hoverMode, colourBlind]);

  useEffect(() => {
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(savedProfiles));
  }, [savedProfiles]);

  const applyAccessibilityProfile = (profile) => {
    const next = sanitiseSettings(profile?.settings || profile);
    setFontSize(next.fontSize);
    setHighContrast(next.highContrast);
    setPriyaMode(next.priyaMode);
    setSignActive(next.signActive);
    setTtsSpeed(next.ttsSpeed);
    setHoverMode(next.hoverMode);
    setColourBlind(next.colourBlind);
  };

  const getCurrentSettings = () => ({
    fontSize,
    highContrast,
    priyaMode,
    signActive,
    ttsSpeed,
    hoverMode,
    colourBlind,
  });

  const saveCurrentProfile = (name, description = "Custom accessibility setup.") => {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      return { ok: false, message: "Please enter a profile name first." };
    }

    const profile = {
      id: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `${Date.now()}`,
      name: trimmed,
      description: String(description || "Custom accessibility setup.").trim(),
      createdAt: new Date().toISOString(),
      settings: sanitiseSettings(getCurrentSettings()),
    };

    setSavedProfiles((current) => {
      const withoutMatch = current.filter((item) => item.id !== profile.id && item.name !== profile.name);
      return [profile, ...withoutMatch];
    });

    return { ok: true, profile };
  };

  const deleteAccessibilityProfile = (profileId) => {
    setSavedProfiles((current) => current.filter((profile) => profile.id !== profileId));
  };

  const resetAccessibilitySettings = () => {
    applyAccessibilityProfile(DEFAULT_SETTINGS);
  };

  const togglePriyaMode = () => {
    if (!priyaMode) {
      applyAccessibilityProfile({
        fontSize: 20,
        highContrast: true,
        priyaMode: true,
        signActive: true,
        ttsSpeed: 1,
        hoverMode: true,
        colourBlind: "none",
      });
      return;
    }

    resetAccessibilitySettings();
  };

  const speak = (text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsSpeed;
    window.speechSynthesis.speak(utterance);
  };

  const value = {
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    priyaMode,
    setPriyaMode,
    togglePriyaMode,
    hoverMode,
    setHoverMode,
    signActive,
    setSignActive,
    colourBlind,
    setColourBlind,
    ttsSpeed,
    setTtsSpeed,
    savedProfiles,
    builtInProfiles: BUILT_IN_PROFILES,
    applyAccessibilityProfile,
    saveCurrentProfile,
    deleteAccessibilityProfile,
    resetAccessibilitySettings,
    speak,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="protanopia">
            <feColorMatrix
              type="matrix"
              values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="deuteranopia">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
      {children}
    </AccessibilityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used inside AccessibilityProvider");
  }
  return ctx;
}
